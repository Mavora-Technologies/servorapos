import { Response } from 'express';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '../config/db';
import { 
  purchaseOrders, 
  purchaseOrderItems, 
  suppliers, 
  inventoryItems, 
  users, 
  branches 
} from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { 
  createPurchaseOrderSchema, 
  updatePOStatusSchema 
} from '../validators/purchase-order.validator';

// 1. Get all Purchase Orders
export const getPurchaseOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const orders = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        status: purchaseOrders.status,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        branchId: purchaseOrders.branchId,
        branchName: branches.name,
        paymentTerms: purchaseOrders.paymentTerms,
        subtotal: purchaseOrders.subtotal,
        taxAmount: purchaseOrders.taxAmount,
        totalAmount: purchaseOrders.totalAmount,
        deliveryExpectedDate: purchaseOrders.deliveryExpectedDate,
        issuedAt: purchaseOrders.issuedAt,
        createdAt: purchaseOrders.createdAt,
        creatorEmail: users.email,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(branches, eq(purchaseOrders.branchId, branches.id))
      .leftJoin(users, eq(purchaseOrders.createdById, users.id))
      .where(eq(purchaseOrders.tenantId, tenantId))
      .orderBy(desc(purchaseOrders.createdAt));

    res.status(200).json({ status: 'success', data: orders });
  } catch (error: any) {
    console.error('[Get POs Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch purchase orders' });
  }
};

// 2. Get Single PO with Line Items
export const getPurchaseOrderDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const [order] = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        status: purchaseOrders.status,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        supplierEmail: suppliers.email,
        supplierPhone: suppliers.phone,
        supplierAddress: suppliers.physicalAddress,
        branchId: purchaseOrders.branchId,
        branchName: branches.name,
        paymentTerms: purchaseOrders.paymentTerms,
        subtotal: purchaseOrders.subtotal,
        taxAmount: purchaseOrders.taxAmount,
        totalAmount: purchaseOrders.totalAmount,
        deliveryExpectedDate: purchaseOrders.deliveryExpectedDate,
        issuedAt: purchaseOrders.issuedAt,
        notes: purchaseOrders.notes,
        createdAt: purchaseOrders.createdAt,
        creatorEmail: users.email,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(branches, eq(purchaseOrders.branchId, branches.id))
      .leftJoin(users, eq(purchaseOrders.createdById, users.id))
      .where(and(eq(purchaseOrders.id, Number(id)), eq(purchaseOrders.tenantId, tenantId)))
      .limit(1);

    if (!order) {
      res.status(404).json({ status: 'error', message: 'Purchase order not found' });
      return;
    }

    const items = await db
      .select({
        id: purchaseOrderItems.id,
        inventoryItemId: purchaseOrderItems.inventoryItemId,
        itemName: inventoryItems.name,
        itemSku: inventoryItems.sku,
        itemUnit: inventoryItems.unit,
        quantityOrdered: purchaseOrderItems.quantityOrdered,
        quantityReceived: purchaseOrderItems.quantityReceived,
        unitCost: purchaseOrderItems.unitCost,
        taxRate: purchaseOrderItems.taxRate,
        subtotal: purchaseOrderItems.subtotal,
        notes: purchaseOrderItems.notes,
      })
      .from(purchaseOrderItems)
      .innerJoin(inventoryItems, eq(purchaseOrderItems.inventoryItemId, inventoryItems.id))
      .where(eq(purchaseOrderItems.purchaseOrderId, order.id));

    res.status(200).json({ status: 'success', data: { ...order, items } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Create Draft Purchase Order
export const createPurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const branchId = req.user?.defaultBranchId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createPurchaseOrderSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const poNum = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      let subtotalSum = 0;
      let taxSum = 0;

      const preparedItems = payload.items.map((item) => {
        const lineSubtotal = item.quantityOrdered * item.unitCost;
        const lineTax = lineSubtotal * (item.taxRate / 100);
        subtotalSum += lineSubtotal;
        taxSum += lineTax;

        return {
          inventoryItemId: item.inventoryItemId,
          quantityOrdered: item.quantityOrdered.toFixed(4),
          quantityReceived: '0.0000',
          unitCost: item.unitCost.toFixed(4),
          taxRate: item.taxRate.toFixed(2),
          subtotal: lineSubtotal.toFixed(4),
          notes: item.notes || null,
        };
      });

      const totalAmount = subtotalSum + taxSum;

      const [po] = await tx
        .insert(purchaseOrders)
        .values({
          tenantId,
          branchId: payload.branchId || branchId || null,
          supplierId: payload.supplierId,
          poNumber: poNum,
          status: 'DRAFT',
          paymentTerms: payload.paymentTerms,
          subtotal: subtotalSum.toFixed(4),
          taxAmount: taxSum.toFixed(4),
          totalAmount: totalAmount.toFixed(4),
          deliveryExpectedDate: payload.deliveryExpectedDate ? new Date(payload.deliveryExpectedDate) : null,
          createdById: userId ? Number(userId) : null,
          notes: payload.notes || null,
        })
        .returning();

      const itemRows = preparedItems.map((p) => ({
        ...p,
        purchaseOrderId: po.id,
      }));

      await tx.insert(purchaseOrderItems).values(itemRows);

      return po;
    });

    res.status(201).json({ status: 'success', data: result });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 4. Update Status (Issue to Vendor or Cancel)
export const updatePurchaseOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = updatePOStatusSchema.parse(req.body);

    const [existing] = await db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, Number(id)), eq(purchaseOrders.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Purchase order not found' });
      return;
    }

    const updates: any = {
      status: payload.status,
      notes: payload.notes || existing.notes,
      updatedAt: new Date(),
    };

    if (payload.status === 'ISSUED' && !existing.issuedAt) {
      updates.issuedAt = new Date();
    }

    const [updated] = await db
      .update(purchaseOrders)
      .set(updates)
      .where(eq(purchaseOrders.id, existing.id))
      .returning();

    res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};