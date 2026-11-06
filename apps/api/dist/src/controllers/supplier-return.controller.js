"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSupplierReturnStatus = exports.createSupplierReturn = exports.getSupplierReturnDetails = exports.getSupplierReturns = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const supplier_return_validator_1 = require("../validators/supplier-return.validator");
// 1. Get all Supplier Returns
const getSupplierReturns = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const returns = await db_1.db
            .select({
            id: schema_1.supplierReturns.id,
            returnNumber: schema_1.supplierReturns.returnNumber,
            debitNoteNumber: schema_1.supplierReturns.debitNoteNumber,
            status: schema_1.supplierReturns.status,
            subtotal: schema_1.supplierReturns.subtotal,
            taxAmount: schema_1.supplierReturns.taxAmount,
            totalAmount: schema_1.supplierReturns.totalAmount,
            dispatchedAt: schema_1.supplierReturns.dispatchedAt,
            supplierId: schema_1.supplierReturns.supplierId,
            supplierName: schema_1.suppliers.name,
            supplierKraPin: schema_1.suppliers.kraPin,
            goodsReceivedNoteId: schema_1.supplierReturns.goodsReceivedNoteId,
            grnNumber: schema_1.goodsReceivedNotes.grnNumber,
            supplierInvoiceId: schema_1.supplierReturns.supplierInvoiceId,
            invoiceNumber: schema_1.supplierInvoices.invoiceNumber,
            branchName: schema_1.branches.name,
            creatorEmail: schema_1.users.email,
            notes: schema_1.supplierReturns.notes,
            createdAt: schema_1.supplierReturns.createdAt,
        })
            .from(schema_1.supplierReturns)
            .innerJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.supplierReturns.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.goodsReceivedNotes, (0, drizzle_orm_1.eq)(schema_1.supplierReturns.goodsReceivedNoteId, schema_1.goodsReceivedNotes.id))
            .leftJoin(schema_1.supplierInvoices, (0, drizzle_orm_1.eq)(schema_1.supplierReturns.supplierInvoiceId, schema_1.supplierInvoices.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.supplierReturns.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.supplierReturns.createdById, schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_1.supplierReturns.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.supplierReturns.createdAt));
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
    }
    catch (error) {
        console.error('[Get Supplier Returns Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch returns' });
    }
};
exports.getSupplierReturns = getSupplierReturns;
// 2. Get Single Return Details
const getSupplierReturnDetails = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const [ret] = await db_1.db
            .select({
            id: schema_1.supplierReturns.id,
            returnNumber: schema_1.supplierReturns.returnNumber,
            debitNoteNumber: schema_1.supplierReturns.debitNoteNumber,
            status: schema_1.supplierReturns.status,
            subtotal: schema_1.supplierReturns.subtotal,
            taxAmount: schema_1.supplierReturns.taxAmount,
            totalAmount: schema_1.supplierReturns.totalAmount,
            dispatchedAt: schema_1.supplierReturns.dispatchedAt,
            supplierId: schema_1.supplierReturns.supplierId,
            supplierName: schema_1.suppliers.name,
            supplierKraPin: schema_1.suppliers.kraPin,
            supplierEmail: schema_1.suppliers.email,
            supplierPhone: schema_1.suppliers.phone,
            goodsReceivedNoteId: schema_1.supplierReturns.goodsReceivedNoteId,
            grnNumber: schema_1.goodsReceivedNotes.grnNumber,
            supplierInvoiceId: schema_1.supplierReturns.supplierInvoiceId,
            invoiceNumber: schema_1.supplierInvoices.invoiceNumber,
            branchName: schema_1.branches.name,
            creatorEmail: schema_1.users.email,
            notes: schema_1.supplierReturns.notes,
            createdAt: schema_1.supplierReturns.createdAt,
        })
            .from(schema_1.supplierReturns)
            .innerJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.supplierReturns.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.goodsReceivedNotes, (0, drizzle_orm_1.eq)(schema_1.supplierReturns.goodsReceivedNoteId, schema_1.goodsReceivedNotes.id))
            .leftJoin(schema_1.supplierInvoices, (0, drizzle_orm_1.eq)(schema_1.supplierReturns.supplierInvoiceId, schema_1.supplierInvoices.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.supplierReturns.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.supplierReturns.createdById, schema_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierReturns.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.supplierReturns.tenantId, tenantId)))
            .limit(1);
        if (!ret) {
            res.status(404).json({ status: 'error', message: 'Supplier return record not found' });
            return;
        }
        const items = await db_1.db
            .select({
            id: schema_1.supplierReturnItems.id,
            inventoryItemId: schema_1.supplierReturnItems.inventoryItemId,
            itemName: schema_1.inventoryItems.name,
            itemSku: schema_1.inventoryItems.sku,
            itemUnit: schema_1.inventoryItems.unit,
            quantity: schema_1.supplierReturnItems.quantity,
            unitCost: schema_1.supplierReturnItems.unitCost,
            subtotal: schema_1.supplierReturnItems.subtotal,
            reason: schema_1.supplierReturnItems.reason,
            notes: schema_1.supplierReturnItems.notes,
        })
            .from(schema_1.supplierReturnItems)
            .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.supplierReturnItems.inventoryItemId, schema_1.inventoryItems.id))
            .where((0, drizzle_orm_1.eq)(schema_1.supplierReturnItems.supplierReturnId, ret.id));
        res.status(200).json({ status: 'success', data: { ...ret, items } });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getSupplierReturnDetails = getSupplierReturnDetails;
// 3. Initiate Supplier Return (Deducts stock & writes movement)
const createSupplierReturn = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const branchId = req.user?.defaultBranchId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = supplier_return_validator_1.createSupplierReturnSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const returnNum = `PRT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            let subtotalSum = 0;
            const preparedLines = [];
            for (const item of payload.items) {
                const [inv] = await tx
                    .select()
                    .from(schema_1.inventoryItems)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, item.inventoryItemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
                    .limit(1);
                if (!inv)
                    throw new Error(`Inventory item ID ${item.inventoryItemId} not found`);
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
                await tx.insert(schema_1.stockMovements).values({
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
                    .update(schema_1.inventoryItems)
                    .set({
                    currentStock: newBalance.toFixed(4),
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, inv.id));
            }
            const taxAmount = subtotalSum * 0.16; // Standard 16% VAT
            const totalAmount = subtotalSum + taxAmount;
            const [retRecord] = await tx
                .insert(schema_1.supplierReturns)
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
            await tx.insert(schema_1.supplierReturnItems).values(itemRows);
            return retRecord;
        });
        res.status(201).json({ status: 'success', data: result, message: 'Supplier return recorded and stock deducted' });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.createSupplierReturn = createSupplierReturn;
// 4. Update Return Status (Dispatch or Confirm Credit Note)
const updateSupplierReturnStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = supplier_return_validator_1.updateSupplierReturnStatusSchema.parse(req.body);
        const [existing] = await db_1.db
            .select()
            .from(schema_1.supplierReturns)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierReturns.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.supplierReturns.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            res.status(404).json({ status: 'error', message: 'Return record not found' });
            return;
        }
        const updates = {
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
        const [updated] = await db_1.db
            .update(schema_1.supplierReturns)
            .set(updates)
            .where((0, drizzle_orm_1.eq)(schema_1.supplierReturns.id, existing.id))
            .returning();
        res.status(200).json({ status: 'success', data: updated, message: 'Return status updated' });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.updateSupplierReturnStatus = updateSupplierReturnStatus;
