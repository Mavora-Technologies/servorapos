"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeReplenishment = exports.assignPreferredSupplier = exports.getReorderSuggestions = exports.executeReplenishmentSchema = exports.assignSupplierSchema = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const zod_1 = require("zod");
exports.assignSupplierSchema = zod_1.z.object({
    inventoryItemId: zod_1.z.coerce.number().positive(),
    supplierId: zod_1.z.coerce.number().positive().nullable(),
});
exports.executeReplenishmentSchema = zod_1.z.object({
    destinationType: zod_1.z.enum(['PURCHASE_ORDERS', 'PURCHASE_REQUEST']),
    department: zod_1.z.string().default('KITCHEN'),
    items: zod_1.z.array(zod_1.z.object({
        inventoryItemId: zod_1.z.number().positive(),
        orderQuantity: zod_1.z.number().positive(),
        unitCost: zod_1.z.number().min(0),
        supplierId: zod_1.z.number().positive().nullable(),
    })).min(1, 'At least one item must be ordered'),
});
// 1. Fetch Suggestions & Supplier Catalogs
const getReorderSuggestions = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        // A. Active inventory joined with preferred supplier
        const rawItems = await db_1.db
            .select({
            id: schema_1.inventoryItems.id,
            name: schema_1.inventoryItems.name,
            sku: schema_1.inventoryItems.sku,
            category: schema_1.inventoryItems.category,
            unit: schema_1.inventoryItems.unit,
            purchaseUnit: schema_1.inventoryItems.purchaseUnit,
            conversionFactor: schema_1.inventoryItems.conversionFactor,
            currentStock: schema_1.inventoryItems.currentStock,
            minThreshold: schema_1.inventoryItems.minThreshold,
            reorderQuantity: schema_1.inventoryItems.reorderQuantity,
            costPrice: schema_1.inventoryItems.costPrice,
            preferredSupplierId: schema_1.inventoryItems.preferredSupplierId,
            preferredSupplierName: schema_1.suppliers.name,
            supplierEmail: schema_1.suppliers.email,
            supplierPhone: schema_1.suppliers.phone,
            leadTimeDays: schema_1.suppliers.leadTimeDays,
            paymentTerms: schema_1.suppliers.paymentTerms,
        })
            .from(schema_1.inventoryItems)
            .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.inventoryItems.preferredSupplierId, schema_1.suppliers.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.isActive, true)));
        // B. Fetch all active suppliers for the inline dropdown switcher
        const allSuppliers = await db_1.db
            .select({
            id: schema_1.suppliers.id,
            name: schema_1.suppliers.name,
            paymentTerms: schema_1.suppliers.paymentTerms,
            leadTimeDays: schema_1.suppliers.leadTimeDays,
        })
            .from(schema_1.suppliers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.suppliers.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.suppliers.isActive, true)));
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
            let urgency = 'NORMAL';
            if (isDepleted) {
                urgency = 'CRITICAL';
                totalCriticalCount++;
                totalEstCommitment += estimatedCost;
            }
            else if (isLow) {
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
        const supplierBuckets = {};
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
    }
    catch (error) {
        console.error('[Reorder Suggestions Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch suggestions' });
    }
};
exports.getReorderSuggestions = getReorderSuggestions;
// 2. Inline Assignment of Preferred Purveyor
const assignPreferredSupplier = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = exports.assignSupplierSchema.parse(req.body);
        const [updated] = await db_1.db
            .update(schema_1.inventoryItems)
            .set({
            preferredSupplierId: payload.supplierId,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, payload.inventoryItemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
            .returning();
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Inventory item not found' });
            return;
        }
        res.status(200).json({ status: 'success', message: 'Preferred supplier updated', data: updated });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.assignPreferredSupplier = assignPreferredSupplier;
// 3. One-Click Batch Generation (Direct Commercial POs or Internal PR)
const executeReplenishment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const branchId = req.user?.defaultBranchId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = exports.executeReplenishmentSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
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
                    .insert(schema_1.purchaseRequests)
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
                await tx.insert(schema_1.purchaseRequestItems).values(prItemLines.map((l) => ({
                    ...l,
                    purchaseRequestId: pr.id,
                })));
                return { type: 'PR', reference: prNumber, id: pr.id };
            }
            // Branch B: Direct PO Generation (Commercial Vendor Contracts Grouped by Purveyor)
            const supplierBuckets = {};
            const fallbackSupplier = (await tx.select({ id: schema_1.suppliers.id }).from(schema_1.suppliers).where((0, drizzle_orm_1.eq)(schema_1.suppliers.tenantId, tenantId)).limit(1))[0]?.id;
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
            const generatedPOs = [];
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
                    .insert(schema_1.purchaseOrders)
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
                await tx.insert(schema_1.purchaseOrderItems).values(itemRows.map((r) => ({
                    ...r,
                    purchaseOrderId: po.id,
                })));
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
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.executeReplenishment = executeReplenishment;
