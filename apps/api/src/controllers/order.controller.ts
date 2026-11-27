// apps/api/src/controllers/order.controller.ts
import { Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.middleware';
import { db } from '../config/db';
import { users } from '../config/schema';
import * as orderRepo from '../repositories/order.repository';
import { RegisterClosedError } from '../repositories/order.repository';
import * as posRepo from '../repositories/pos-terminal.repository';
import { listOrdersQuerySchema } from '../validators/order.validator';

const resolveAuthenticatedUserId = async (req: AuthRequest): Promise<number | null> => {
  const rawId =
    (req.user as { userId?: number; id?: number; sub?: number } | undefined)?.userId ??
    (req.user as { userId?: number; id?: number; sub?: number } | undefined)?.id ??
    (req.user as { userId?: number; id?: number; sub?: number } | undefined)?.sub ??
    null;

  if (rawId && !Number.isNaN(Number(rawId))) {
    return Number(rawId);
  }

  if (req.user?.email && req.user?.tenantId) {
    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, req.user.tenantId), eq(users.email, req.user.email)))
      .limit(1);
    return u?.id ?? null;
  }

  return null;
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const authenticatedUserId = await resolveAuthenticatedUserId(req);

    const {
      idempotencyKey,
      branchId,
      cashDrawerId,
      cashierShiftId,
      waiterId,
      customerId,
      orderType,
      targetStation,
      subtotal,
      discountTotal,
      tax,
      cateringLevy,
      serviceCharge,
      packingCharge,
      total,
      cashTendered,
      items,
      tableId,
      tableName,
      customerName,
      customerPhone,
      buyerKraPin,
      paymentMethod,
      notes,
      isExternalStorefront,
    } = req.body;

    const effectiveBranchId =
      branchId !== undefined && branchId !== null
        ? Number(branchId)
        : req.user?.defaultBranchId
          ? Number(req.user.defaultBranchId)
          : null;

    const effectiveWaiterId =
      waiterId !== undefined && waiterId !== null
        ? Number(waiterId)
        : authenticatedUserId;

    const normalizedItems: Array<{ menuItemId: number; quantity: number }> = Array.isArray(items)
      ? items
          .map((i: { menuItemId?: number | string; quantity?: number | string }) => ({
            menuItemId: Number(i.menuItemId),
            quantity: Number(i.quantity),
          }))
          .filter((i) => Number.isInteger(i.menuItemId) && i.menuItemId > 0 && i.quantity > 0)
      : [];

    // 1. Enforce live stock & manual availability limits before creating the order
    if (normalizedItems.length > 0) {
      const stockCheck = await posRepo.validateOrderStockAvailability(
        tenantId,
        normalizedItems,
        effectiveBranchId ?? undefined
      );

      if (!stockCheck.valid) {
        res.status(409).json({
          status: 'error',
          code: 'INSUFFICIENT_STOCK',
          message: stockCheck.shortages.map((s) => s.reason).join(' '),
          shortages: stockCheck.shortages,
        });
        return;
      }
    }

    // 2. Create the order record (enforces transactional 409 closed-register custody & idempotency)
    const order = await orderRepo.createOrderRecord(
      tenantId,
      {
        idempotencyKey: idempotencyKey ? String(idempotencyKey) : null,
        branchId: effectiveBranchId,
        waiterId: effectiveWaiterId,
        cashierId: authenticatedUserId,
        cashDrawerId: cashDrawerId ? Number(cashDrawerId) : null,
        cashierShiftId: cashierShiftId ? Number(cashierShiftId) : null,
        customerId: customerId ? Number(customerId) : null,
        orderType,
        targetStation,
        subtotal,
        discountTotal,
        tax,
        cateringLevy,
        serviceCharge,
        packingCharge,
        total,
        cashTendered,
        tableId,
        tableName,
        customerName,
        customerPhone,
        buyerKraPin,
        paymentMethod,
        notes,
        isExternalStorefront: Boolean(isExternalStorefront),
      },
      items
    );

    const isReplay =
      'isIdempotentReplay' in order && Boolean((order as { isIdempotentReplay?: boolean }).isIdempotentReplay);

    // 3. Synchronize menu_item_availability remainingCount / is86ed (skipped on idempotent replay)
    if (!isReplay && order?.id && normalizedItems.length > 0) {
      await posRepo.syncPostOrderStockAndAvailability({
        tenantId,
        branchId: effectiveBranchId,
        userId: authenticatedUserId,
        orderId: Number(order.id),
        orderNumber: String(order.orderNumber || `ORD-${order.id}`),
        items: normalizedItems,
      });
    }

    res.status(isReplay ? 200 : 201).json({ status: 'success', data: order });
  } catch (error: unknown) {
    if (error instanceof RegisterClosedError) {
      res.status(409).json({
        status: 'error',
        code: error.code,
        message: error.message,
      });
      return;
    }

    console.error('[Order Error]:', error);
    const message = error instanceof Error ? error.message : 'Failed to process order';
    res.status(500).json({ status: 'error', message });
  }
};

export const getOpenOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const openOrders = await orderRepo.fetchOpenOrders(tenantId, branchId);
    res.status(200).json({ status: 'success', data: openOrders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch open orders';
    res.status(500).json({ status: 'error', message });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = await resolveAuthenticatedUserId(req);
    const id = req.params.id as string;
    const { status } = req.body;

    await orderRepo.updateOrderStatus(tenantId, parseInt(id, 10), status, userId);
    res.status(200).json({ status: 'success', message: `Order updated to ${status}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update order status';
    res.status(400).json({ status: 'error', message });
  }
};

export const getTakeawayOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const takeawayOrders = await orderRepo.fetchTakeawayOrders(tenantId, branchId);
    res.status(200).json({ status: 'success', data: takeawayOrders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch takeaway orders';
    res.status(500).json({ status: 'error', message });
  }
};

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const parsed = listOrdersQuerySchema.safeParse(req.query);
    const allOrders = await orderRepo.fetchTenantOrders(
      tenantId,
      parsed.success ? parsed.data : undefined
    );
    res.status(200).json({ status: 'success', data: allOrders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orders';
    res.status(500).json({ status: 'error', message });
  }
};

export const getOrderDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const orderId = parseInt(String(req.params.id), 10);
    if (Number.isNaN(orderId)) {
      res.status(400).json({ status: 'error', message: 'Invalid order ID' });
      return;
    }

    const detail = await orderRepo.fetchOrderDetailById(tenantId, orderId);
    if (!detail) {
      res.status(404).json({ status: 'error', message: 'Order record not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: detail });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load order details';
    res.status(500).json({ status: 'error', message });
  }
};

export const getOnlineOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const onlineOrders = await orderRepo.fetchOnlineStorefrontOrders(tenantId, branchId);
    res.status(200).json({ status: 'success', data: onlineOrders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch online orders';
    res.status(500).json({ status: 'error', message });
  }
};