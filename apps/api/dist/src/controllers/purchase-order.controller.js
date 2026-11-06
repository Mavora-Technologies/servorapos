"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePurchaseOrderStatus = exports.createPurchaseOrder = exports.getPurchaseOrderDetails = exports.getPurchaseOrders = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const purchase_order_validator_1 = require("../validators/purchase-order.validator");
// 1. Get all Purchase Orders
const getPurchaseOrders = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const orders = await db_1.db
            .select({
            id: schema_1.purchaseOrders.id,
            poNumber: schema_1.purchaseOrders.poNumber,
            status: schema_1.purchaseOrders.status,
            supplierId: schema_1.purchaseOrders.supplierId,
            supplierName: schema_1.suppliers.name,
            branchId: schema_1.purchaseOrders.branchId,
            branchName: schema_1.branches.name,
            paymentTerms: schema_1.purchaseOrders.paymentTerms,
            subtotal: schema_1.purchaseOrders.subtotal,
            taxAmount: schema_1.purchaseOrders.taxAmount,
            totalAmount: schema_1.purchaseOrders.totalAmount,
            deliveryExpectedDate: schema_1.purchaseOrders.deliveryExpectedDate,
            issuedAt: schema_1.purchaseOrders.issuedAt,
            createdAt: schema_1.purchaseOrders.createdAt,
            creatorEmail: schema_1.users.email,
        })
            .from(schema_1.purchaseOrders)
            .innerJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.purchaseOrders.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.purchaseOrders.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.purchaseOrders.createdById, schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_1.purchaseOrders.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.purchaseOrders.createdAt));
        res.status(200).json({ status: 'success', data: orders });
    }
    catch (error) {
        console.error('[Get POs Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch purchase orders' });
    }
};
exports.getPurchaseOrders = getPurchaseOrders;
// 2. Get Single PO with Line Items
const getPurchaseOrderDetails = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const [order] = await db_1.db
            .select({
            id: schema_1.purchaseOrders.id,
            poNumber: schema_1.purchaseOrders.poNumber,
            status: schema_1.purchaseOrders.status,
            supplierId: schema_1.purchaseOrders.supplierId,
            supplierName: schema_1.suppliers.name,
            supplierEmail: schema_1.suppliers.email,
            supplierPhone: schema_1.suppliers.phone,
            supplierAddress: schema_1.suppliers.physicalAddress,
            branchId: schema_1.purchaseOrders.branchId,
            branchName: schema_1.branches.name,
            paymentTerms: schema_1.purchaseOrders.paymentTerms,
            subtotal: schema_1.purchaseOrders.subtotal,
            taxAmount: schema_1.purchaseOrders.taxAmount,
            totalAmount: schema_1.purchaseOrders.totalAmount,
            deliveryExpectedDate: schema_1.purchaseOrders.deliveryExpectedDate,
            issuedAt: schema_1.purchaseOrders.issuedAt,
            notes: schema_1.purchaseOrders.notes,
            createdAt: schema_1.purchaseOrders.createdAt,
            creatorEmail: schema_1.users.email,
        })
            .from(schema_1.purchaseOrders)
            .innerJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.purchaseOrders.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.purchaseOrders.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.purchaseOrders.createdById, schema_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.purchaseOrders.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.purchaseOrders.tenantId, tenantId)))
            .limit(1);
        if (!order) {
            res.status(404).json({ status: 'error', message: 'Purchase order not found' });
            return;
        }
        const items = await db_1.db
            .select({
            id: schema_1.purchaseOrderItems.id,
            inventoryItemId: schema_1.purchaseOrderItems.inventoryItemId,
            itemName: schema_1.inventoryItems.name,
            itemSku: schema_1.inventoryItems.sku,
            itemUnit: schema_1.inventoryItems.unit,
            quantityOrdered: schema_1.purchaseOrderItems.quantityOrdered,
            quantityReceived: schema_1.purchaseOrderItems.quantityReceived,
            unitCost: schema_1.purchaseOrderItems.unitCost,
            taxRate: schema_1.purchaseOrderItems.taxRate,
            subtotal: schema_1.purchaseOrderItems.subtotal,
            notes: schema_1.purchaseOrderItems.notes,
        })
            .from(schema_1.purchaseOrderItems)
            .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.purchaseOrderItems.inventoryItemId, schema_1.inventoryItems.id))
            .where((0, drizzle_orm_1.eq)(schema_1.purchaseOrderItems.purchaseOrderId, order.id));
        res.status(200).json({ status: 'success', data: { ...order, items } });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getPurchaseOrderDetails = getPurchaseOrderDetails;
// 3. Create Draft Purchase Order
const createPurchaseOrder = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const branchId = req.user?.defaultBranchId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = purchase_order_validator_1.createPurchaseOrderSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
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
                .insert(schema_1.purchaseOrders)
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
            await tx.insert(schema_1.purchaseOrderItems).values(itemRows);
            return po;
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
exports.createPurchaseOrder = createPurchaseOrder;
// 4. Update Status (Issue to Vendor or Cancel)
const updatePurchaseOrderStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = purchase_order_validator_1.updatePOStatusSchema.parse(req.body);
        const [existing] = await db_1.db
            .select()
            .from(schema_1.purchaseOrders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.purchaseOrders.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.purchaseOrders.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            res.status(404).json({ status: 'error', message: 'Purchase order not found' });
            return;
        }
        const updates = {
            status: payload.status,
            notes: payload.notes || existing.notes,
            updatedAt: new Date(),
        };
        if (payload.status === 'ISSUED' && !existing.issuedAt) {
            updates.issuedAt = new Date();
        }
        const [updated] = await db_1.db
            .update(schema_1.purchaseOrders)
            .set(updates)
            .where((0, drizzle_orm_1.eq)(schema_1.purchaseOrders.id, existing.id))
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
exports.updatePurchaseOrderStatus = updatePurchaseOrderStatus;
