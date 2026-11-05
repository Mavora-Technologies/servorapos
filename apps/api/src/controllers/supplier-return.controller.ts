import { Response } from 'express';
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { 
  supplierReturns, 
  supplierReturnItems, 
  suppliers, 
  goodsReceivedNotes, 
  supplierInvoices, 
  inventoryItems, 
  stockMovements, 
  users, 
  branches 
} from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { 
  createSupplierReturnSchema, 
  updateSupplierReturnStatusSchema 
} from '../validators/supplier-return.validator';

// 1. Get all Supplier Returns
export const getSupplierReturns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const returns = await db
      .select({
        id: supplierReturns.id,
        returnNumber: supplierReturns.returnNumber,
        debitNoteNumber: supplierReturns.debitNoteNumber,
        status: supplierReturns.status,
        subtotal: supplierReturns.subtotal,
        taxAmount: supplierReturns.taxAmount,
        totalAmount: supplierReturns.totalAmount,
        dispatchedAt: supplierReturns.dispatchedAt,
        supplierId: supplierReturns.supplierId,
        supplierName: suppliers.name,
        supplierKraPin: suppliers.kraPin,
        goodsReceivedNoteId: supplierReturns.goodsReceivedNoteId,
        grnNumber: goodsReceivedNotes.grnNumber,
        supplierInvoiceId: supplierReturns.supplierInvoiceId,
        invoiceNumber: supplierInvoices.invoiceNumber,
        branchName: branches.name,
        creatorEmail: users.email,
        notes: supplierReturns.notes,
        createdAt: supplierReturns.createdAt,
      })
      .from(supplierReturns)
      .innerJoin(suppliers, eq(supplierReturns.supplierId, suppliers.id))
      .leftJoin(goodsReceivedNotes, eq(supplierReturns.goodsReceivedNoteId, goodsReceivedNotes.id))
      .leftJoin(supplierInvoices, eq(supplierReturns.supplierInvoiceId, supplierInvoices.id))
      .leftJoin(branches, eq(supplierReturns.branchId, branches.id))
      .leftJoin(users, eq(supplierReturns.createdById, users.id))
      .where(eq(supplierReturns.tenantId, tenantId))
      .orderBy(desc(supplierReturns.createdAt));

    let totalCreditedAmount = 0;
    let pendingCount = 0;

    returns.forEach((r) => {
      const amt = parseFloat(r.totalAmount) || 0;
      if (r.status === 'CREDITED' || r.status === 'DISPATCHED') {
        totalCreditedAmount += amt;
      }
      if (r.status === 'PENDING_DISPATCH') {
        pendingCount++;
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalReturnsCount: returns.length,
          totalCreditedAmount: Number(totalCreditedAmount.toFixed(2)),
          pendingDispatchCount: pendingCount,
        },
        returns,
      },
    });
  } catch (error: any) {
    console.error('[Get Supplier Returns Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch returns' });
  }
};

// 2. Get Single Return Details
export const getSupplierReturnDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const [ret] = await db
      .select({
        id: supplierReturns.id,
        returnNumber: supplierReturns.returnNumber,
        debitNoteNumber: supplierReturns.debitNoteNumber,
        status: supplierReturns.status,
        subtotal: supplierReturns.subtotal,
        taxAmount: supplierReturns.taxAmount,
        totalAmount: supplierReturns.totalAmount,
        dispatchedAt: supplierReturns.dispatchedAt,
        supplierId: supplierReturns.supplierId,
        supplierName: suppliers.name,
        supplierKraPin: suppliers.kraPin,
        supplierEmail: suppliers.email,
        supplierPhone: suppliers.phone,
        goodsReceivedNoteId: supplierReturns.goodsReceivedNoteId,
        grnNumber: goodsReceivedNotes.grnNumber,
        supplierInvoiceId: supplierReturns.supplierInvoiceId,
        invoiceNumber: supplierInvoices.invoiceNumber,
        branchName: branches.name,
        creatorEmail: users.email,
        notes: supplierReturns.notes,
        createdAt: supplierReturns.createdAt,
      })
      .from(supplierReturns)
      .innerJoin(suppliers, eq(supplierReturns.supplierId, suppliers.id))
      .leftJoin(goodsReceivedNotes, eq(supplierReturns.goodsReceivedNoteId, goodsReceivedNotes.id))
      .leftJoin(supplierInvoices, eq(supplierReturns.supplierInvoiceId, supplierInvoices.id))
      .leftJoin(branches, eq(supplierReturns.branchId, branches.id))
      .leftJoin(users, eq(supplierReturns.createdById, users.id))
      .where(and(eq(supplierReturns.id, Number(id)), eq(supplierReturns.tenantId, tenantId)))
      .limit(1);

    if (!ret) {
      res.status(404).json({ status: 'error', message: 'Supplier return record not found' });
      return;
    }

    const items = await db
      .select({
        id: supplierReturnItems.id,
        inventoryItemId: supplierReturnItems.inventoryItemId,
        itemName: inventoryItems.name,
        itemSku: inventoryItems.sku,
        itemUnit: inventoryItems.unit,
        quantity: supplierReturnItems.quantity,
        unitCost: supplierReturnItems.unitCost,
        subtotal: supplierReturnItems.subtotal,
        reason: supplierReturnItems.reason,
        notes: supplierReturnItems.notes,
      })
      .from(supplierReturnItems)
      .innerJoin(inventoryItems, eq(supplierReturnItems.inventoryItemId, inventoryItems.id))
      .where(eq(supplierReturnItems.supplierReturnId, ret.id));

    res.status(200).json({ status: 'success', data: { ...ret, items } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Initiate Supplier Return (Deducts stock & writes movement)
export const createSupplierReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const branchId = req.user?.defaultBranchId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createSupplierReturnSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const returnNum = `PRT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      let subtotalSum = 0;
      const preparedLines: any[] = [];

      for (const item of payload.items) {
        const [inv] = await tx
          .select()
          .from(inventoryItems)
          .where(and(eq(inventoryItems.id, item.inventoryItemId), eq(inventoryItems.tenantId, tenantId)))
          .limit(1);

        if (!inv) throw new Error(`Inventory item ID ${item.inventoryItemId} not found`);

        const returnQty = item.quantity;
        const currentStockNum = parseFloat(inv.currentStock) || 0;
        const newBalance = currentStockNum - returnQty;

        if (!inv.allowNegativeStock && newBalance < 0) {
          throw new Error(`Insufficient stock for ${inv.name}. On hand: ${currentStockNum}, attempting return: ${returnQty}`);
        }

        const lineSubtotal = returnQty * item.unitCost;
        subtotalSum += lineSubtotal;

        preparedLines.push({
          inventoryItemId: item.inventoryItemId,
          quantity: returnQty.toFixed(4),
          unitCost: item.unitCost.toFixed(4),
          subtotal: lineSubtotal.toFixed(4),
          reason: item.reason,
          notes: item.notes || null,
        });

        const qtyNum = -returnQty;
        const unitCostNum = Number(item.unitCost) || 0;
        const totalValuationNum = Number((Math.abs(qtyNum) * unitCostNum).toFixed(4));

        // 1. Post OUTWARD RETURN stock movement
        await tx.insert(stockMovements).values({
          tenantId,
          inventoryItemId: item.inventoryItemId,
          userId: userId ? Number(userId) : null,
          type: 'RETURN_TO_SUPPLIER',
          quantity: qtyNum.toFixed(4),
          unitCost: unitCostNum.toFixed(4),
          totalValuation: totalValuationNum.toFixed(4), // REQUIRED by stockMovements schema
          balanceAfter: newBalance.toFixed(4),
          notes: `Supplier Return ${returnNum}: ${item.reason}`,
        });

        // 2. Deduct inventory item currentStock
        await tx
          .update(inventoryItems)
          .set({
            currentStock: newBalance.toFixed(4),
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.id, inv.id));
      }

      const taxAmount = subtotalSum * 0.16; // Standard 16% VAT
      const totalAmount = subtotalSum + taxAmount;

      const [retRecord] = await tx
        .insert(supplierReturns)
        .values({
          tenantId,
          branchId: branchId || null,
          supplierId: payload.supplierId,
          goodsReceivedNoteId: payload.goodsReceivedNoteId || null,
          supplierInvoiceId: payload.supplierInvoiceId || null,
          returnNumber: returnNum,
          debitNoteNumber: payload.debitNoteNumber || null,
          status: 'PENDING_DISPATCH',
          subtotal: subtotalSum.toFixed(4),
          taxAmount: taxAmount.toFixed(4),
          totalAmount: totalAmount.toFixed(4),
          createdById: userId ? Number(userId) : null,
          notes: payload.notes || null,
        })
        .returning();

      const itemRows = preparedLines.map((p) => ({
        ...p,
        supplierReturnId: retRecord.id,
      }));

      await tx.insert(supplierReturnItems).values(itemRows);

      return retRecord;
    });

    res.status(201).json({ status: 'success', data: result, message: 'Supplier return recorded and stock deducted' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 4. Update Return Status (Dispatch or Confirm Credit Note)
export const updateSupplierReturnStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = updateSupplierReturnStatusSchema.parse(req.body);

    const [existing] = await db
      .select()
      .from(supplierReturns)
      .where(and(eq(supplierReturns.id, Number(id)), eq(supplierReturns.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Return record not found' });
      return;
    }

    const updates: any = {
      status: payload.status,
      notes: payload.notes || existing.notes,
      updatedAt: new Date(),
    };

    if (payload.debitNoteNumber) {
      updates.debitNoteNumber = payload.debitNoteNumber;
    }

    if (payload.status === 'DISPATCHED' && !existing.dispatchedAt) {
      updates.dispatchedAt = new Date();
    }

    const [updated] = await db
      .update(supplierReturns)
      .set(updates)
      .where(eq(supplierReturns.id, existing.id))
      .returning();

    res.status(200).json({ status: 'success', data: updated, message: 'Return status updated' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};