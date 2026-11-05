import { Response } from 'express';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '../config/db';
import { 
  goodsReceivedNotes, 
  goodsReceivedItems, 
  purchaseOrders, 
  purchaseOrderItems, 
  inventoryItems, 
  stockMovements, 
  suppliers, 
  branches, 
  users 
} from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { createGoodsReceivedSchema } from '../validators/goods-received.validator';

// 1. Get all Goods Received Notes (GRN History)
export const getGoodsReceivedNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const grns = await db
      .select({
        id: goodsReceivedNotes.id,
        grnNumber: goodsReceivedNotes.grnNumber,
        supplierDeliveryNote: goodsReceivedNotes.supplierDeliveryNote,
        receivedDate: goodsReceivedNotes.receivedDate,
        purchaseOrderId: goodsReceivedNotes.purchaseOrderId,
        poNumber: purchaseOrders.poNumber,
        supplierId: goodsReceivedNotes.supplierId,
        supplierName: suppliers.name,
        branchId: goodsReceivedNotes.branchId,
        branchName: branches.name,
        receiverEmail: users.email,
        notes: goodsReceivedNotes.notes,
        createdAt: goodsReceivedNotes.createdAt,
      })
      .from(goodsReceivedNotes)
      .innerJoin(purchaseOrders, eq(goodsReceivedNotes.purchaseOrderId, purchaseOrders.id))
      .innerJoin(suppliers, eq(goodsReceivedNotes.supplierId, suppliers.id))
      .leftJoin(branches, eq(goodsReceivedNotes.branchId, branches.id))
      .leftJoin(users, eq(goodsReceivedNotes.receivedById, users.id))
      .where(eq(goodsReceivedNotes.tenantId, tenantId))
      .orderBy(desc(goodsReceivedNotes.receivedDate));

    res.status(200).json({ status: 'success', data: grns });
  } catch (error: any) {
    console.error('[Get GRN Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch GRN logs' });
  }
};

// 2. Get Single GRN Details with Line Inspection Breakdown
export const getGoodsReceivedDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const [grn] = await db
      .select({
        id: goodsReceivedNotes.id,
        grnNumber: goodsReceivedNotes.grnNumber,
        supplierDeliveryNote: goodsReceivedNotes.supplierDeliveryNote,
        receivedDate: goodsReceivedNotes.receivedDate,
        purchaseOrderId: goodsReceivedNotes.purchaseOrderId,
        poNumber: purchaseOrders.poNumber,
        supplierId: goodsReceivedNotes.supplierId,
        supplierName: suppliers.name,
        branchId: goodsReceivedNotes.branchId,
        branchName: branches.name,
        receiverEmail: users.email,
        notes: goodsReceivedNotes.notes,
        createdAt: goodsReceivedNotes.createdAt,
      })
      .from(goodsReceivedNotes)
      .innerJoin(purchaseOrders, eq(goodsReceivedNotes.purchaseOrderId, purchaseOrders.id))
      .innerJoin(suppliers, eq(goodsReceivedNotes.supplierId, suppliers.id))
      .leftJoin(branches, eq(goodsReceivedNotes.branchId, branches.id))
      .leftJoin(users, eq(goodsReceivedNotes.receivedById, users.id))
      .where(and(eq(goodsReceivedNotes.id, Number(id)), eq(goodsReceivedNotes.tenantId, tenantId)))
      .limit(1);

    if (!grn) {
      res.status(404).json({ status: 'error', message: 'GRN record not found' });
      return;
    }

    const items = await db
      .select({
        id: goodsReceivedItems.id,
        inventoryItemId: goodsReceivedItems.inventoryItemId,
        itemName: inventoryItems.name,
        itemSku: inventoryItems.sku,
        itemUnit: inventoryItems.unit,
        quantityAccepted: goodsReceivedItems.quantityAccepted,
        quantityRejected: goodsReceivedItems.quantityRejected,
        unitCost: goodsReceivedItems.unitCost,
        rejectionReason: goodsReceivedItems.rejectionReason,
        notes: goodsReceivedItems.notes,
      })
      .from(goodsReceivedItems)
      .innerJoin(inventoryItems, eq(goodsReceivedItems.inventoryItemId, inventoryItems.id))
      .where(eq(goodsReceivedItems.grnId, grn.id));

    res.status(200).json({ status: 'success', data: { ...grn, items } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Receive Goods Delivery (Transactionally updates live stock, PO fulfillment, and ledger)
export const processGoodsReceiving = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const rawBranchId = req.user?.defaultBranchId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createGoodsReceivedSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      // 1. Verify PO existence and state
      const [po] = await tx
        .select()
        .from(purchaseOrders)
        .where(and(eq(purchaseOrders.id, payload.purchaseOrderId), eq(purchaseOrders.tenantId, tenantId)))
        .limit(1);

      if (!po) throw new Error('Purchase order not found');
      if (po.status === 'COMPLETED') throw new Error('Purchase order has already been fully received');
      if (po.status === 'CANCELLED') throw new Error('Cannot receive against a cancelled purchase order');

      // Sanitize branch ID to clean integer or null
      const effectiveBranchId = po.branchId 
        ? Number(po.branchId) 
        : rawBranchId 
        ? Number(rawBranchId) 
        : null;

      const grnNum = `GRN-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      // 2. Create Goods Received Note record
      const [grn] = await tx
        .insert(goodsReceivedNotes)
        .values({
          tenantId: Number(tenantId),
          branchId: effectiveBranchId,
          purchaseOrderId: po.id,
          supplierId: po.supplierId,
          grnNumber: grnNum,
          supplierDeliveryNote: payload.supplierDeliveryNote || null,
          receivedById: userId ? Number(userId) : null,
          notes: payload.notes || null,
        })
        .returning();

      // 3. Process each line item
      const poItems = await tx
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, po.id));

      let allLinesFullyReceived = true;

      for (const line of payload.items) {
        const qtyAccepted = Number(line.quantityAccepted) || 0;
        const qtyRejected = Number(line.quantityRejected) || 0;
        const unitCostNum = Number(line.unitCost) || 0;

        // Save GRN line
        await tx.insert(goodsReceivedItems).values({
          grnId: grn.id,
          inventoryItemId: line.inventoryItemId,
          quantityAccepted: qtyAccepted.toFixed(4),
          quantityRejected: qtyRejected.toFixed(4),
          unitCost: unitCostNum.toFixed(4),
          rejectionReason: line.rejectionReason || null,
          notes: line.notes || null,
        });

        // Update corresponding PO item cumulative received quantity
        const matchingPoItem = poItems.find((p) => p.inventoryItemId === line.inventoryItemId);
        if (matchingPoItem) {
          const currentRcvd = parseFloat(matchingPoItem.quantityReceived) || 0;
          const newRcvd = currentRcvd + qtyAccepted;
          const ordered = parseFloat(matchingPoItem.quantityOrdered) || 0;

          await tx
            .update(purchaseOrderItems)
            .set({ quantityReceived: newRcvd.toFixed(4) })
            .where(eq(purchaseOrderItems.id, matchingPoItem.id));

          if (newRcvd < ordered) {
            allLinesFullyReceived = false;
          }
        }

        // Increment actual inventory balance & log stock movement
        if (qtyAccepted > 0) {
          const [inv] = await tx
            .select()
            .from(inventoryItems)
            .where(eq(inventoryItems.id, line.inventoryItemId))
            .limit(1);

          if (inv) {
            const currentStockNum = parseFloat(inv.currentStock) || 0;
            const newBalance = currentStockNum + qtyAccepted;
            const totalValuation = qtyAccepted * unitCostNum;

            // Audit ledger entry (with totalValuation and documentReference populated)
            await tx.insert(stockMovements).values({
              tenantId: Number(tenantId),
              branchId: effectiveBranchId,
              inventoryItemId: line.inventoryItemId,
              userId: userId ? Number(userId) : null,
              type: 'GOODS_RECEIPT_PO', // or 'PURCHASE'
              quantity: qtyAccepted.toFixed(4),
              unitCost: unitCostNum.toFixed(4),
              totalValuation: totalValuation.toFixed(4),
              balanceAfter: newBalance.toFixed(4),
              documentReference: grn.grnNumber,
              locationBin: 'Main Receiving Dock',
              notes: `Goods Inward via ${grn.grnNumber} (PO #${po.poNumber})`,
            });

            // Master inventory stock update
            await tx
              .update(inventoryItems)
              .set({
                currentStock: newBalance.toFixed(4),
                costPrice: unitCostNum.toFixed(4), // Update latest purchase cost
                updatedAt: new Date(),
              })
              .where(eq(inventoryItems.id, inv.id));
          }
        }
      }

      // 4. Update PO fulfillment status
      const updatedPoStatus = allLinesFullyReceived ? 'COMPLETED' : 'PARTIALLY_RECEIVED';
      await tx
        .update(purchaseOrders)
        .set({ status: updatedPoStatus, updatedAt: new Date() })
        .where(eq(purchaseOrders.id, po.id));

      return grn;
    });

    res.status(201).json({ status: 'success', data: result, message: 'Goods received and inventory credited' });
  } catch (error: any) {
    console.error('[Process Goods Receiving Error]:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};