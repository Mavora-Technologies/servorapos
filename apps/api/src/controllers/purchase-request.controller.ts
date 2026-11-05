import { Response } from 'express';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '../config/db';
import { 
  purchaseRequests, 
  purchaseRequestItems, 
  inventoryItems, 
  users, 
  branches, 
  suppliers,
  purchaseOrders,
  purchaseOrderItems
} from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { 
  createPurchaseRequestSchema, 
  reviewPurchaseRequestSchema 
} from '../validators/purchase-request.validator';

// 1. Get all Purchase Requests
export const getPurchaseRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const requests = await db
      .select({
        id: purchaseRequests.id,
        requestNumber: purchaseRequests.requestNumber,
        status: purchaseRequests.status,
        priority: purchaseRequests.priority,
        department: purchaseRequests.department,
        estimatedTotal: purchaseRequests.estimatedTotal,
        branchId: purchaseRequests.branchId,
        branchName: branches.name,
        requestedById: purchaseRequests.requestedById,
        requesterEmail: users.email,
        notes: purchaseRequests.notes,
        rejectionReason: purchaseRequests.rejectionReason,
        reviewedAt: purchaseRequests.reviewedAt,
        createdAt: purchaseRequests.createdAt,
      })
      .from(purchaseRequests)
      .leftJoin(users, eq(purchaseRequests.requestedById, users.id))
      .leftJoin(branches, eq(purchaseRequests.branchId, branches.id))
      .where(eq(purchaseRequests.tenantId, tenantId))
      .orderBy(desc(purchaseRequests.createdAt));

    res.status(200).json({ status: 'success', data: requests });
  } catch (error: any) {
    console.error('[Get Purchase Requests Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch purchase requests' });
  }
};

// 2. Get Single PR with Item Details
export const getPurchaseRequestDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const [pr] = await db
      .select({
        id: purchaseRequests.id,
        requestNumber: purchaseRequests.requestNumber,
        status: purchaseRequests.status,
        priority: purchaseRequests.priority,
        department: purchaseRequests.department,
        estimatedTotal: purchaseRequests.estimatedTotal,
        branchId: purchaseRequests.branchId,
        branchName: branches.name,
        requestedById: purchaseRequests.requestedById,
        requesterEmail: users.email,
        notes: purchaseRequests.notes,
        rejectionReason: purchaseRequests.rejectionReason,
        reviewedAt: purchaseRequests.reviewedAt,
        createdAt: purchaseRequests.createdAt,
      })
      .from(purchaseRequests)
      .leftJoin(users, eq(purchaseRequests.requestedById, users.id))
      .leftJoin(branches, eq(purchaseRequests.branchId, branches.id))
      .where(and(eq(purchaseRequests.id, Number(id)), eq(purchaseRequests.tenantId, tenantId)))
      .limit(1);

    if (!pr) {
      res.status(404).json({ status: 'error', message: 'Purchase request not found' });
      return;
    }

    const items = await db
      .select({
        id: purchaseRequestItems.id,
        inventoryItemId: purchaseRequestItems.inventoryItemId,
        itemName: inventoryItems.name,
        itemSku: inventoryItems.sku,
        itemUnit: inventoryItems.unit,
        itemCategory: inventoryItems.category,
        currentStock: inventoryItems.currentStock,
        minThreshold: inventoryItems.minThreshold,
        requestedQuantity: purchaseRequestItems.requestedQuantity,
        estimatedUnitCost: purchaseRequestItems.estimatedUnitCost,
        subtotal: purchaseRequestItems.subtotal,
        notes: purchaseRequestItems.notes,
      })
      .from(purchaseRequestItems)
      .innerJoin(inventoryItems, eq(purchaseRequestItems.inventoryItemId, inventoryItems.id))
      .where(eq(purchaseRequestItems.purchaseRequestId, pr.id));

    res.status(200).json({ status: 'success', data: { ...pr, items } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Create Internal Requisition Request
export const createPurchaseRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const branchId = req.user?.defaultBranchId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createPurchaseRequestSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const prNumber = `PR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      // Calculate line subtotals & retrieve item cost prices
      let totalSum = 0;
      const preparedLines: any[] = [];

      for (const item of payload.items) {
        const [invItem] = await tx
          .select({ costPrice: inventoryItems.costPrice })
          .from(inventoryItems)
          .where(and(eq(inventoryItems.id, item.inventoryItemId), eq(inventoryItems.tenantId, tenantId)))
          .limit(1);

        const unitCostNum = parseFloat(invItem?.costPrice || '0');
        const subtotalNum = item.requestedQuantity * unitCostNum;
        totalSum += subtotalNum;

        preparedLines.push({
          inventoryItemId: item.inventoryItemId,
          requestedQuantity: item.requestedQuantity.toFixed(4),
          estimatedUnitCost: unitCostNum.toFixed(4),
          subtotal: subtotalNum.toFixed(4),
          notes: item.notes || null,
        });
      }

      const [pr] = await tx
        .insert(purchaseRequests)
        .values({
          tenantId,
          branchId: payload.branchId || branchId || null,
          requestNumber: prNumber,
          status: 'PENDING',
          priority: payload.priority,
          department: payload.department,
          requestedById: userId ? Number(userId) : null,
          estimatedTotal: totalSum.toFixed(4),
          notes: payload.notes || null,
        })
        .returning();

      const lineValues = preparedLines.map((line) => ({
        ...line,
        purchaseRequestId: pr.id,
      }));

      await tx.insert(purchaseRequestItems).values(lineValues);

      return pr;
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

// 4. Review / Approve / Reject Request
export const reviewPurchaseRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = reviewPurchaseRequestSchema.parse(req.body);

    const [existing] = await db
      .select()
      .from(purchaseRequests)
      .where(and(eq(purchaseRequests.id, Number(id)), eq(purchaseRequests.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Purchase request not found' });
      return;
    }

    const [updated] = await db
      .update(purchaseRequests)
      .set({
        status: payload.status,
        reviewedById: userId ? Number(userId) : null,
        rejectionReason: payload.status === 'REJECTED' ? payload.rejectionReason || 'Declined during review' : null,
        notes: payload.notes || existing.notes,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(purchaseRequests.id, existing.id))
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
export const convertPRToPurchaseOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const result = await db.transaction(async (tx) => {
      // 1. Verify PR
      const [pr] = await tx
        .select()
        .from(purchaseRequests)
        .where(and(eq(purchaseRequests.id, Number(id)), eq(purchaseRequests.tenantId, tenantId)))
        .limit(1);

      if (!pr) throw new Error('Purchase request not found');
      if (pr.status !== 'APPROVED') {
        throw new Error('Only approved requisitions can be converted into Purchase Orders');
      }

      // 2. Fetch requested items joined with inventory details & preferred suppliers
      const items = await tx
        .select({
          inventoryItemId: purchaseRequestItems.inventoryItemId,
          requestedQuantity: purchaseRequestItems.requestedQuantity,
          estimatedUnitCost: purchaseRequestItems.estimatedUnitCost,
          preferredSupplierId: inventoryItems.preferredSupplierId,
          supplierPaymentTerms: suppliers.paymentTerms,
        })
        .from(purchaseRequestItems)
        .innerJoin(inventoryItems, eq(purchaseRequestItems.inventoryItemId, inventoryItems.id))
        .leftJoin(suppliers, eq(inventoryItems.preferredSupplierId, suppliers.id))
        .where(eq(purchaseRequestItems.purchaseRequestId, pr.id));

      if (items.length === 0) throw new Error('No items found in this requisition');

      // 3. Group line items by preferred supplier
      const supplierBuckets: Record<number, typeof items> = {};
      const fallbackSupplierId = (await tx.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.tenantId, tenantId)).limit(1))[0]?.id;

      for (const item of items) {
        const supId = item.preferredSupplierId || fallbackSupplierId;
        if (!supId) {
          throw new Error('Please ensure inventory items have an assigned preferred supplier or create an active supplier first');
        }
        if (!supplierBuckets[supId]) {
          supplierBuckets[supId] = [];
        }
        supplierBuckets[supId].push(item);
      }

      const createdPOs: string[] = [];

      // 4. Generate one PO per supplier group
      for (const [supIdStr, supItems] of Object.entries(supplierBuckets)) {
        const supplierId = Number(supIdStr);
        const poNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;

        let subtotal = 0;
        const poItemRows = supItems.map((line) => {
          const qty = parseFloat(line.requestedQuantity) || 0;
          const cost = parseFloat(line.estimatedUnitCost) || 0;
          const lineSubtotal = qty * cost;
          subtotal += lineSubtotal;

          return {
            inventoryItemId: line.inventoryItemId,
            quantityOrdered: qty.toFixed(4),
            quantityReceived: '0.0000',
            unitCost: cost.toFixed(4),
            taxRate: '16.00',
            subtotal: lineSubtotal.toFixed(4),
            notes: `Converted from Requisition ${pr.requestNumber}`,
          };
        });

        const taxAmount = subtotal * 0.16;
        const totalAmount = subtotal + taxAmount;
        const paymentTerms = supItems[0].supplierPaymentTerms || 'NET_30';

        const [createdPo] = await tx
          .insert(purchaseOrders)
          .values({
            tenantId,
            branchId: pr.branchId,
            supplierId,
            poNumber,
            status: 'DRAFT',
            paymentTerms,
            subtotal: subtotal.toFixed(4),
            taxAmount: taxAmount.toFixed(4),
            totalAmount: totalAmount.toFixed(4),
            createdById: userId ? Number(userId) : null,
            notes: `Auto-generated from internal requisition ${pr.requestNumber} (${pr.department})`,
          })
          .returning();

        await tx.insert(purchaseOrderItems).values(
          poItemRows.map((r) => ({
            ...r,
            purchaseOrderId: createdPo.id,
          }))
        );

        createdPOs.push(poNumber);
      }

      // 5. Update PR status to CONVERTED_TO_PO
      await tx
        .update(purchaseRequests)
        .set({
          status: 'CONVERTED_TO_PO',
          updatedAt: new Date(),
        })
        .where(eq(purchaseRequests.id, pr.id));

      return createdPOs;
    });

    res.status(200).json({
      status: 'success',
      message: `Requisition converted into ${result.length} Purchase Order(s): ${result.join(', ')}`,
      data: { poNumbers: result },
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};