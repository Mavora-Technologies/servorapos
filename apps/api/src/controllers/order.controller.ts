// apps/api/src/controllers/order.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as orderRepo from '../repositories/order.repository';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const cashierId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    const {
      branchId,
      cashDrawerId,
      cashierShiftId,
      customerId,
      orderType,
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
    } = req.body;

    const effectiveBranchId =
      branchId !== undefined && branchId !== null
        ? Number(branchId)
        : req.user?.defaultBranchId
        ? Number(req.user.defaultBranchId)
        : null;

    const order = await orderRepo.createOrderRecord(
      tenantId,
      {
        branchId: effectiveBranchId,
        cashierId: cashierId ? Number(cashierId) : null,
        cashDrawerId: cashDrawerId ? Number(cashDrawerId) : null,
        cashierShiftId: cashierShiftId ? Number(cashierShiftId) : null,
        customerId: customerId ? Number(customerId) : null,
        orderType,
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
      },
      items
    );

    res.status(201).json({ status: 'success', data: order });
  } catch (error: any) {
    console.error('[Order Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to process order' });
  }
};

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const allOrders = await orderRepo.fetchTenantOrders(tenantId);
    res.status(200).json({ status: 'success', data: allOrders });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch orders' });
  }
};

export const getOpenOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const openOrders = await orderRepo.fetchOpenOrders(tenantId);
    res.status(200).json({ status: 'success', data: openOrders });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch open orders' });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;
    const { status } = req.body;

    await orderRepo.updateOrderStatus(tenantId, parseInt(id, 10), status);
    res.status(200).json({ status: 'success', message: `Order updated to ${status}` });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: 'Failed to update order status' });
  }
};

export const getTakeawayOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const takeawayOrders = await orderRepo.fetchTakeawayOrders(tenantId);
    res.status(200).json({ status: 'success', data: takeawayOrders });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch takeaway orders' });
  }
};