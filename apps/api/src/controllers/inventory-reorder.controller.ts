import { Response } from 'express';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../config/db';
import { 
  inventoryItems, 
  suppliers, 
  purchaseOrders, 
  purchaseOrderItems,
  purchaseRequests,
  purchaseRequestItems
} from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

export const assignSupplierSchema = z.object({
  inventoryItemId: z.coerce.number().positive(),
  supplierId: z.coerce.number().positive().nullable(),
});

export const executeReplenishmentSchema = z.object({
  destinationType: z.enum(['PURCHASE_ORDERS', 'PURCHASE_REQUEST']),
  department: z.string().default('KITCHEN'),
  items: z.array(
    z.object({
      inventoryItemId: z.number().positive(),
      orderQuantity: z.number().positive(),
      unitCost: z.number().min(0),
      supplierId: z.number().positive().nullable(),
    })
  ).min(1, 'At least one item must be ordered'),
});

// 1. Fetch Suggestions & Supplier Catalogs
export const getReorderSuggestions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    // A. Active inventory joined with preferred supplier
    const rawItems = await db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        sku: inventoryItems.sku,
        category: inventoryItems.category,
        unit: inventoryItems.unit,
        purchaseUnit: inventoryItems.purchaseUnit,
        conversionFactor: inventoryItems.conversionFactor,
        currentStock: inventoryItems.currentStock,
        minThreshold: inventoryItems.minThreshold,
        reorderQuantity: inventoryItems.reorderQuantity,
        costPrice: inventoryItems.costPrice,
        preferredSupplierId: inventoryItems.preferredSupplierId,
        preferredSupplierName: suppliers.name,
        supplierEmail: suppliers.email,
        supplierPhone: suppliers.phone,
        leadTimeDays: suppliers.leadTimeDays,
        paymentTerms: suppliers.paymentTerms,
      })
      .from(inventoryItems)
      .leftJoin(suppliers, eq(inventoryItems.preferredSupplierId, suppliers.id))
      .where(and(eq(inventoryItems.tenantId, tenantId), eq(inventoryItems.isActive, true)));

    // B. Fetch all active suppliers for the inline dropdown switcher
    const allSuppliers = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        paymentTerms: suppliers.paymentTerms,
        leadTimeDays: suppliers.leadTimeDays,
      })
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.isActive, true)));

    let totalCriticalCount = 0;
    let totalLowCount = 0;
    let totalEstCommitment = 0;

    const analyzedItems = rawItems
      .map((item) => {
        const stock = parseFloat(item.currentStock) || 0;
        const min = parseFloat(item.minThreshold) || 0;
        const defaultReorder = parseFloat(item.reorderQuantity) || 0;
        const unitCost = parseFloat(item.costPrice) || 0;
        const leadDays = item.leadTimeDays || 2;

        const isDepleted = stock <= 0;
        const isLow = stock > 0 && stock <= min;
        const isHealthy = stock > min;

        // Enterprise Replenishment Formula: Deficit buffer + Standard Lot / MOQ
        const deficit = Math.max(0, min - stock);
        const suggestedQty = defaultReorder > 0 ? Math.max(defaultReorder, deficit + defaultReorder) : (deficit > 0 ? deficit : 10);
        const estimatedCost = suggestedQty * unitCost;

        let urgency: 'CRITICAL' | 'LOW' | 'NORMAL' = 'NORMAL';
        if (isDepleted) {
          urgency = 'CRITICAL';
          totalCriticalCount++;
          totalEstCommitment += estimatedCost;
        } else if (isLow) {
          urgency = 'LOW';
          totalLowCount++;
          totalEstCommitment += estimatedCost;
        }

        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          unit: item.unit,
          purchaseUnit: item.purchaseUnit || item.unit,
          conversionFactor: parseFloat(item.conversionFactor || '1'),
          currentStock: stock,
          minThreshold: min,
          suggestedQuantity: suggestedQty,
          leadTimeDays: leadDays,
          unitCost,
          estimatedCost,
          urgency,
          isHealthy,
          supplier: {
            id: item.preferredSupplierId,
            name: item.preferredSupplierName || 'Unassigned Supplier',
            email: item.supplierEmail,
            phone: item.supplierPhone,
            paymentTerms: item.paymentTerms || 'NET_30',
          },
        };
      })
      .sort((a, b) => {
        const weight = { CRITICAL: 0, LOW: 1, NORMAL: 2 };
        return weight[a.urgency] - weight[b.urgency];
      });

    // C. Group actionable replenishment by supplier
    const supplierBuckets: Record<string, any> = {};
    analyzedItems
      .filter((i) => i.urgency !== 'NORMAL')
      .forEach((item) => {
        const supKey = item.supplier.id ? `sup_${item.supplier.id}` : 'unassigned';
        if (!supplierBuckets[supKey]) {
          supplierBuckets[supKey] = {
            supplierId: item.supplier.id,
            supplierName: item.supplier.name,
            paymentTerms: item.supplier.paymentTerms,
            itemCount: 0,
            estimatedTotal: 0,
            items: [],
          };
        }
        supplierBuckets[supKey].itemCount += 1;
        supplierBuckets[supKey].estimatedTotal += item.estimatedCost;
        supplierBuckets[supKey].items.push(item);
      });

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalCatalogItems: rawItems.length,
          criticalCount: totalCriticalCount,
          lowStockCount: totalLowCount,
          totalReplenishmentCommitment: Number(totalEstCommitment.toFixed(2)),
          suppliersAffected: Object.keys(supplierBuckets).length,
        },
        suppliersList: allSuppliers,
        supplierOrders: Object.values(supplierBuckets),
        items: analyzedItems,
      },
    });
  } catch (error: any) {
    console.error('[Reorder Suggestions Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch suggestions' });
  }
};

// 2. Inline Assignment of Preferred Purveyor
export const assignPreferredSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = assignSupplierSchema.parse(req.body);

    const [updated] = await db
      .update(inventoryItems)
      .set({
        preferredSupplierId: payload.supplierId,
        updatedAt: new Date(),
      })
      .where(and(eq(inventoryItems.id, payload.inventoryItemId), eq(inventoryItems.tenantId, tenantId)))
      .returning();

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Inventory item not found' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Preferred supplier updated', data: updated });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. One-Click Batch Generation (Direct Commercial POs or Internal PR)
export const executeReplenishment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const branchId = req.user?.defaultBranchId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = executeReplenishmentSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      // Branch A: Route to Internal Purchase Request (Budget Approval Workflow)
      if (payload.destinationType === 'PURCHASE_REQUEST') {
        const prNumber = `PR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
        let grandTotal = 0;

        const prItemLines = payload.items.map((it) => {
          const subtotal = it.orderQuantity * it.unitCost;
          grandTotal += subtotal;
          return {
            inventoryItemId: it.inventoryItemId,
            requestedQuantity: it.orderQuantity.toFixed(4),
            estimatedUnitCost: it.unitCost.toFixed(4),
            subtotal: subtotal.toFixed(4),
            notes: 'Generated via Smart Reorder Engine',
          };
        });

        const [pr] = await tx
          .insert(purchaseRequests)
          .values({
            tenantId,
            branchId: branchId || null,
            requestNumber: prNumber,
            status: 'PENDING',
            priority: 'URGENT',
            department: payload.department,
            requestedById: userId ? Number(userId) : null,
            estimatedTotal: grandTotal.toFixed(4),
            notes: `Automated replenishment requisition for ${payload.items.length} SKUs`,
          })
          .returning();

        await tx.insert(purchaseRequestItems).values(
          prItemLines.map((l) => ({
            ...l,
            purchaseRequestId: pr.id,
          }))
        );

        return { type: 'PR', reference: prNumber, id: pr.id };
      }

      // Branch B: Direct PO Generation (Commercial Vendor Contracts Grouped by Purveyor)
      const supplierBuckets: Record<number, typeof payload.items> = {};
      const fallbackSupplier = (
        await tx.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.tenantId, tenantId)).limit(1)
      )[0]?.id;

      for (const it of payload.items) {
        const supId = it.supplierId || fallbackSupplier;
        if (!supId) {
          throw new Error('Please assign an approved vendor before generating commercial Purchase Orders');
        }
        if (!supplierBuckets[supId]) {
          supplierBuckets[supId] = [];
        }
        supplierBuckets[supId].push(it);
      }

      const generatedPOs: string[] = [];

      for (const [supIdStr, items] of Object.entries(supplierBuckets)) {
        const supplierId = Number(supIdStr);
        const poNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;

        let subtotal = 0;
        const itemRows = items.map((line) => {
          const lineSubtotal = line.orderQuantity * line.unitCost;
          subtotal += lineSubtotal;
          return {
            inventoryItemId: line.inventoryItemId,
            quantityOrdered: line.orderQuantity.toFixed(4),
            quantityReceived: '0.0000',
            unitCost: line.unitCost.toFixed(4),
            taxRate: '16.00',
            subtotal: lineSubtotal.toFixed(4),
            notes: 'Smart Reorder Batch Entry',
          };
        });

        const taxAmount = subtotal * 0.16;
        const totalAmount = subtotal + taxAmount;

        const [po] = await tx
          .insert(purchaseOrders)
          .values({
            tenantId,
            branchId: branchId || null,
            supplierId,
            poNumber,
            status: 'DRAFT',
            paymentTerms: 'NET_30',
            subtotal: subtotal.toFixed(4),
            taxAmount: taxAmount.toFixed(4),
            totalAmount: totalAmount.toFixed(4),
            deliveryExpectedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            createdById: userId ? Number(userId) : null,
            notes: 'Automated restock order batch from Smart Reorder Engine',
          })
          .returning();

        await tx.insert(purchaseOrderItems).values(
          itemRows.map((r) => ({
            ...r,
            purchaseOrderId: po.id,
          }))
        );

        generatedPOs.push(poNumber);
      }

      return { type: 'PO', references: generatedPOs };
    });

    res.status(200).json({
      status: 'success',
      message: result.type === 'PR' 
        ? `Requisition ${result.reference} created successfully` 
        : `Generated ${result.references?.length} vendor Purchase Order(s): ${result.references?.join(', ')}`,
      data: result,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};