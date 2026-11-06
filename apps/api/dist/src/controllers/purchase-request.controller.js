"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertPRToPurchaseOrders = exports.reviewPurchaseRequest = exports.createPurchaseRequest = exports.getPurchaseRequestDetails = exports.getPurchaseRequests = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const purchase_request_validator_1 = require("../validators/purchase-request.validator");
// 1. Get all Purchase Requests
const getPurchaseRequests = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const requests = await db_1.db
            .select({
            id: schema_1.purchaseRequests.id,
            requestNumber: schema_1.purchaseRequests.requestNumber,
            status: schema_1.purchaseRequests.status,
            priority: schema_1.purchaseRequests.priority,
            department: schema_1.purchaseRequests.department,
            estimatedTotal: schema_1.purchaseRequests.estimatedTotal,
            branchId: schema_1.purchaseRequests.branchId,
            branchName: schema_1.branches.name,
            requestedById: schema_1.purchaseRequests.requestedById,
            requesterEmail: schema_1.users.email,
            notes: schema_1.purchaseRequests.notes,
            rejectionReason: schema_1.purchaseRequests.rejectionReason,
            reviewedAt: schema_1.purchaseRequests.reviewedAt,
            createdAt: schema_1.purchaseRequests.createdAt,
        })
            .from(schema_1.purchaseRequests)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.purchaseRequests.requestedById, schema_1.users.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.purchaseRequests.branchId, schema_1.branches.id))
            .where((0, drizzle_orm_1.eq)(schema_1.purchaseRequests.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.purchaseRequests.createdAt));
        res.status(200).json({ status: 'success', data: requests });
    }
    catch (error) {
        console.error('[Get Purchase Requests Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch purchase requests' });
    }
};
exports.getPurchaseRequests = getPurchaseRequests;
// 2. Get Single PR with Item Details
const getPurchaseRequestDetails = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const [pr] = await db_1.db
            .select({
            id: schema_1.purchaseRequests.id,
            requestNumber: schema_1.purchaseRequests.requestNumber,
            status: schema_1.purchaseRequests.status,
            priority: schema_1.purchaseRequests.priority,
            department: schema_1.purchaseRequests.department,
            estimatedTotal: schema_1.purchaseRequests.estimatedTotal,
            branchId: schema_1.purchaseRequests.branchId,
            branchName: schema_1.branches.name,
            requestedById: schema_1.purchaseRequests.requestedById,
            requesterEmail: schema_1.users.email,
            notes: schema_1.purchaseRequests.notes,
            rejectionReason: schema_1.purchaseRequests.rejectionReason,
            reviewedAt: schema_1.purchaseRequests.reviewedAt,
            createdAt: schema_1.purchaseRequests.createdAt,
        })
            .from(schema_1.purchaseRequests)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.purchaseRequests.requestedById, schema_1.users.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.purchaseRequests.branchId, schema_1.branches.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.purchaseRequests.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.purchaseRequests.tenantId, tenantId)))
            .limit(1);
        if (!pr) {
            res.status(404).json({ status: 'error', message: 'Purchase request not found' });
            return;
        }
        const items = await db_1.db
            .select({
            id: schema_1.purchaseRequestItems.id,
            inventoryItemId: schema_1.purchaseRequestItems.inventoryItemId,
            itemName: schema_1.inventoryItems.name,
            itemSku: schema_1.inventoryItems.sku,
            itemUnit: schema_1.inventoryItems.unit,
            itemCategory: schema_1.inventoryItems.category,
            currentStock: schema_1.inventoryItems.currentStock,
            minThreshold: schema_1.inventoryItems.minThreshold,
            requestedQuantity: schema_1.purchaseRequestItems.requestedQuantity,
            estimatedUnitCost: schema_1.purchaseRequestItems.estimatedUnitCost,
            subtotal: schema_1.purchaseRequestItems.subtotal,
            notes: schema_1.purchaseRequestItems.notes,
        })
            .from(schema_1.purchaseRequestItems)
            .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.purchaseRequestItems.inventoryItemId, schema_1.inventoryItems.id))
            .where((0, drizzle_orm_1.eq)(schema_1.purchaseRequestItems.purchaseRequestId, pr.id));
        res.status(200).json({ status: 'success', data: { ...pr, items } });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getPurchaseRequestDetails = getPurchaseRequestDetails;
// 3. Create Internal Requisition Request
const createPurchaseRequest = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const branchId = req.user?.defaultBranchId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = purchase_request_validator_1.createPurchaseRequestSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const prNumber = `PR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            // Calculate line subtotals & retrieve item cost prices
            let totalSum = 0;
            const preparedLines = [];
            for (const item of payload.items) {
                const [invItem] = await tx
                    .select({ costPrice: schema_1.inventoryItems.costPrice })
                    .from(schema_1.inventoryItems)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, item.inventoryItemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
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
                .insert(schema_1.purchaseRequests)
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
            await tx.insert(schema_1.purchaseRequestItems).values(lineValues);
            return pr;
        });
        res.status(201).json({ status: 'success', data: result });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.createPurchaseRequest = createPurchaseRequest;
// 4. Review / Approve / Reject Request
const reviewPurchaseRequest = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = purchase_request_validator_1.reviewPurchaseRequestSchema.parse(req.body);
        const [existing] = await db_1.db
            .select()
            .from(schema_1.purchaseRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.purchaseRequests.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.purchaseRequests.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            res.status(404).json({ status: 'error', message: 'Purchase request not found' });
            return;
        }
        const [updated] = await db_1.db
            .update(schema_1.purchaseRequests)
            .set({
            status: payload.status,
            reviewedById: userId ? Number(userId) : null,
            rejectionReason: payload.status === 'REJECTED' ? payload.rejectionReason || 'Declined during review' : null,
            notes: payload.notes || existing.notes,
            reviewedAt: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.purchaseRequests.id, existing.id))
            .returning();
        res.status(200).json({ status: 'success', data: updated });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.reviewPurchaseRequest = reviewPurchaseRequest;
const convertPRToPurchaseOrders = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const result = await db_1.db.transaction(async (tx) => {
            // 1. Verify PR
            const [pr] = await tx
                .select()
                .from(schema_1.purchaseRequests)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.purchaseRequests.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.purchaseRequests.tenantId, tenantId)))
                .limit(1);
            if (!pr)
                throw new Error('Purchase request not found');
            if (pr.status !== 'APPROVED') {
                throw new Error('Only approved requisitions can be converted into Purchase Orders');
            }
            // 2. Fetch requested items joined with inventory details & preferred suppliers
            const items = await tx
                .select({
                inventoryItemId: schema_1.purchaseRequestItems.inventoryItemId,
                requestedQuantity: schema_1.purchaseRequestItems.requestedQuantity,
                estimatedUnitCost: schema_1.purchaseRequestItems.estimatedUnitCost,
                preferredSupplierId: schema_1.inventoryItems.preferredSupplierId,
                supplierPaymentTerms: schema_1.suppliers.paymentTerms,
            })
                .from(schema_1.purchaseRequestItems)
                .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.purchaseRequestItems.inventoryItemId, schema_1.inventoryItems.id))
                .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.inventoryItems.preferredSupplierId, schema_1.suppliers.id))
                .where((0, drizzle_orm_1.eq)(schema_1.purchaseRequestItems.purchaseRequestId, pr.id));
            if (items.length === 0)
                throw new Error('No items found in this requisition');
            // 3. Group line items by preferred supplier
            const supplierBuckets = {};
            const fallbackSupplierId = (await tx.select({ id: schema_1.suppliers.id }).from(schema_1.suppliers).where((0, drizzle_orm_1.eq)(schema_1.suppliers.tenantId, tenantId)).limit(1))[0]?.id;
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
            const createdPOs = [];
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
                    .insert(schema_1.purchaseOrders)
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
                await tx.insert(schema_1.purchaseOrderItems).values(poItemRows.map((r) => ({
                    ...r,
                    purchaseOrderId: createdPo.id,
                })));
                createdPOs.push(poNumber);
            }
            // 5. Update PR status to CONVERTED_TO_PO
            await tx
                .update(schema_1.purchaseRequests)
                .set({
                status: 'CONVERTED_TO_PO',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.purchaseRequests.id, pr.id));
            return createdPOs;
        });
        res.status(200).json({
            status: 'success',
            message: `Requisition converted into ${result.length} Purchase Order(s): ${result.join(', ')}`,
            data: { poNumbers: result },
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.convertPRToPurchaseOrders = convertPRToPurchaseOrders;
