"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoiceFromGRN = exports.getUninvoicedGRNs = exports.recordSupplierPayment = exports.createSupplierInvoice = exports.getSupplierInvoiceDetails = exports.getSupplierInvoices = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const supplier_invoice_validator_1 = require("../validators/supplier-invoice.validator");
// 1. Get all Supplier Invoices & Accounts Payable Metrics
const getSupplierInvoices = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const invoices = await db_1.db
            .select({
            id: schema_1.supplierInvoices.id,
            invoiceNumber: schema_1.supplierInvoices.invoiceNumber,
            internalRef: schema_1.supplierInvoices.internalRef,
            status: schema_1.supplierInvoices.status,
            subtotal: schema_1.supplierInvoices.subtotal,
            taxAmount: schema_1.supplierInvoices.taxAmount,
            totalAmount: schema_1.supplierInvoices.totalAmount,
            paidAmount: schema_1.supplierInvoices.paidAmount,
            invoiceDate: schema_1.supplierInvoices.invoiceDate,
            dueDate: schema_1.supplierInvoices.dueDate,
            supplierId: schema_1.supplierInvoices.supplierId,
            supplierName: schema_1.suppliers.name,
            supplierKraPin: schema_1.suppliers.kraPin,
            purchaseOrderId: schema_1.supplierInvoices.purchaseOrderId,
            poNumber: schema_1.purchaseOrders.poNumber,
            goodsReceivedNoteId: schema_1.supplierInvoices.goodsReceivedNoteId,
            grnNumber: schema_1.goodsReceivedNotes.grnNumber,
            branchName: schema_1.branches.name,
            createdAt: schema_1.supplierInvoices.createdAt,
        })
            .from(schema_1.supplierInvoices)
            .innerJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.purchaseOrders, (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.purchaseOrderId, schema_1.purchaseOrders.id))
            .leftJoin(schema_1.goodsReceivedNotes, (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.goodsReceivedNoteId, schema_1.goodsReceivedNotes.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.branchId, schema_1.branches.id))
            .where((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.supplierInvoices.dueDate));
        // Telemetry aggregations
        let totalOutstandingAP = 0;
        let totalPaidYTD = 0;
        let overdueCount = 0;
        const now = new Date();
        const evaluatedInvoices = invoices.map((inv) => {
            const total = parseFloat(inv.totalAmount) || 0;
            const paid = parseFloat(inv.paidAmount) || 0;
            const balance = Math.max(0, total - paid);
            const isOverdue = balance > 0 && new Date(inv.dueDate) < now;
            if (balance > 0)
                totalOutstandingAP += balance;
            totalPaidYTD += paid;
            if (isOverdue)
                overdueCount++;
            return {
                ...inv,
                balanceRemaining: balance,
                isOverdue,
            };
        });
        res.status(200).json({
            status: 'success',
            data: {
                summary: {
                    totalInvoicesCount: invoices.length,
                    totalOutstandingAP: Number(totalOutstandingAP.toFixed(2)),
                    totalPaidYTD: Number(totalPaidYTD.toFixed(2)),
                    overdueCount,
                },
                invoices: evaluatedInvoices,
            },
        });
    }
    catch (error) {
        console.error('[Get Supplier Invoices Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch supplier invoices' });
    }
};
exports.getSupplierInvoices = getSupplierInvoices;
// 2. Get Single Invoice Details with Line Items
const getSupplierInvoiceDetails = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const [inv] = await db_1.db
            .select({
            id: schema_1.supplierInvoices.id,
            invoiceNumber: schema_1.supplierInvoices.invoiceNumber,
            internalRef: schema_1.supplierInvoices.internalRef,
            status: schema_1.supplierInvoices.status,
            subtotal: schema_1.supplierInvoices.subtotal,
            taxAmount: schema_1.supplierInvoices.taxAmount,
            totalAmount: schema_1.supplierInvoices.totalAmount,
            paidAmount: schema_1.supplierInvoices.paidAmount,
            invoiceDate: schema_1.supplierInvoices.invoiceDate,
            dueDate: schema_1.supplierInvoices.dueDate,
            supplierId: schema_1.supplierInvoices.supplierId,
            supplierName: schema_1.suppliers.name,
            supplierKraPin: schema_1.suppliers.kraPin,
            supplierEmail: schema_1.suppliers.email,
            supplierPhone: schema_1.suppliers.phone,
            purchaseOrderId: schema_1.supplierInvoices.purchaseOrderId,
            poNumber: schema_1.purchaseOrders.poNumber,
            goodsReceivedNoteId: schema_1.supplierInvoices.goodsReceivedNoteId,
            grnNumber: schema_1.goodsReceivedNotes.grnNumber,
            branchName: schema_1.branches.name,
            notes: schema_1.supplierInvoices.notes,
            createdAt: schema_1.supplierInvoices.createdAt,
        })
            .from(schema_1.supplierInvoices)
            .innerJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.purchaseOrders, (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.purchaseOrderId, schema_1.purchaseOrders.id))
            .leftJoin(schema_1.goodsReceivedNotes, (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.goodsReceivedNoteId, schema_1.goodsReceivedNotes.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.branchId, schema_1.branches.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId)))
            .limit(1);
        if (!inv) {
            res.status(404).json({ status: 'error', message: 'Invoice not found' });
            return;
        }
        const items = await db_1.db
            .select({
            id: schema_1.supplierInvoiceItems.id,
            inventoryItemId: schema_1.supplierInvoiceItems.inventoryItemId,
            itemName: schema_1.inventoryItems.name,
            itemSku: schema_1.inventoryItems.sku,
            itemUnit: schema_1.inventoryItems.unit,
            quantity: schema_1.supplierInvoiceItems.quantity,
            unitPrice: schema_1.supplierInvoiceItems.unitPrice,
            taxRate: schema_1.supplierInvoiceItems.taxRate,
            subtotal: schema_1.supplierInvoiceItems.subtotal,
            notes: schema_1.supplierInvoiceItems.notes,
        })
            .from(schema_1.supplierInvoiceItems)
            .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.supplierInvoiceItems.inventoryItemId, schema_1.inventoryItems.id))
            .where((0, drizzle_orm_1.eq)(schema_1.supplierInvoiceItems.supplierInvoiceId, inv.id));
        // Calculate balance and overdue status for the detail view
        const total = parseFloat(inv.totalAmount) || 0;
        const paid = parseFloat(inv.paidAmount) || 0;
        const balanceRemaining = Math.max(0, total - paid);
        const isOverdue = balanceRemaining > 0 && new Date(inv.dueDate) < new Date();
        res.status(200).json({
            status: 'success',
            data: {
                ...inv,
                balanceRemaining,
                isOverdue,
                items,
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getSupplierInvoiceDetails = getSupplierInvoiceDetails;
// 3. Register Incoming Supplier Invoice
const createSupplierInvoice = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const branchId = req.user?.defaultBranchId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = supplier_invoice_validator_1.createSupplierInvoiceSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const internalNum = `PINV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            let subtotalSum = 0;
            let taxSum = 0;
            const preparedItems = payload.items.map((item) => {
                const lineSubtotal = item.quantity * item.unitPrice;
                const lineTax = lineSubtotal * (item.taxRate / 100);
                subtotalSum += lineSubtotal;
                taxSum += lineTax;
                return {
                    inventoryItemId: item.inventoryItemId,
                    quantity: item.quantity.toFixed(4),
                    unitPrice: item.unitPrice.toFixed(4),
                    taxRate: item.taxRate.toFixed(2),
                    subtotal: lineSubtotal.toFixed(4),
                    notes: item.notes || null,
                };
            });
            const totalVal = subtotalSum + taxSum;
            const [invoice] = await tx
                .insert(schema_1.supplierInvoices)
                .values({
                tenantId,
                branchId: branchId || null,
                supplierId: payload.supplierId,
                purchaseOrderId: payload.purchaseOrderId || null,
                goodsReceivedNoteId: payload.goodsReceivedNoteId || null,
                invoiceNumber: payload.invoiceNumber,
                internalRef: internalNum,
                status: 'UNPAID',
                subtotal: subtotalSum.toFixed(4),
                taxAmount: taxSum.toFixed(4),
                totalAmount: totalVal.toFixed(4),
                paidAmount: '0.0000',
                invoiceDate: payload.invoiceDate ? new Date(payload.invoiceDate) : new Date(),
                dueDate: new Date(payload.dueDate),
                createdById: userId ? Number(userId) : null,
                notes: payload.notes || null,
            })
                .returning();
            const itemRows = preparedItems.map((p) => ({
                ...p,
                supplierInvoiceId: invoice.id,
            }));
            await tx.insert(schema_1.supplierInvoiceItems).values(itemRows);
            return invoice;
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
exports.createSupplierInvoice = createSupplierInvoice;
// 4. Record AP Payment
const recordSupplierPayment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = supplier_invoice_validator_1.recordInvoicePaymentSchema.parse(req.body);
        const [inv] = await db_1.db
            .select()
            .from(schema_1.supplierInvoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId)))
            .limit(1);
        if (!inv) {
            res.status(404).json({ status: 'error', message: 'Supplier invoice not found' });
            return;
        }
        const currentPaid = parseFloat(inv.paidAmount) || 0;
        const totalAmount = parseFloat(inv.totalAmount) || 0;
        const newPaid = currentPaid + payload.amount;
        if (newPaid > totalAmount + 0.01) {
            res.status(400).json({
                status: 'error',
                message: `Payment amount (${payload.amount}) exceeds remaining balance (${totalAmount - currentPaid})`,
            });
            return;
        }
        const newStatus = newPaid >= totalAmount ? 'PAID' : 'PARTIALLY_PAID';
        const [updated] = await db_1.db
            .update(schema_1.supplierInvoices)
            .set({
            paidAmount: newPaid.toFixed(4),
            status: newStatus,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, inv.id))
            .returning();
        res.status(200).json({ status: 'success', data: updated, message: 'Payment recorded successfully' });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.recordSupplierPayment = recordSupplierPayment;
// 5. Get verified GRNs that have not yet been invoiced
const getUninvoicedGRNs = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        // Find all GRNs whose ID is NOT yet in supplier_invoices
        const uninvoiced = await db_1.db
            .select({
            id: schema_1.goodsReceivedNotes.id,
            grnNumber: schema_1.goodsReceivedNotes.grnNumber,
            supplierDeliveryNote: schema_1.goodsReceivedNotes.supplierDeliveryNote,
            receivedDate: schema_1.goodsReceivedNotes.receivedDate,
            supplierId: schema_1.goodsReceivedNotes.supplierId,
            supplierName: schema_1.suppliers.name,
            paymentTerms: schema_1.suppliers.paymentTerms,
            leadTimeDays: schema_1.suppliers.leadTimeDays,
            purchaseOrderId: schema_1.goodsReceivedNotes.purchaseOrderId,
            poNumber: schema_1.purchaseOrders.poNumber,
            branchId: schema_1.goodsReceivedNotes.branchId,
            branchName: schema_1.branches.name,
        })
            .from(schema_1.goodsReceivedNotes)
            .innerJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.supplierId, schema_1.suppliers.id))
            .innerJoin(schema_1.purchaseOrders, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.purchaseOrderId, schema_1.purchaseOrders.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.branchId, schema_1.branches.id))
            .leftJoin(schema_1.supplierInvoices, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.id, schema_1.supplierInvoices.goodsReceivedNoteId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.supplierInvoices.id} IS NULL`))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.goodsReceivedNotes.receivedDate));
        res.status(200).json({ status: 'success', data: uninvoiced });
    }
    catch (error) {
        console.error('[Get Uninvoiced GRNs Error]:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getUninvoicedGRNs = getUninvoicedGRNs;
// 6. Auto-generate invoice draft payload from GRN accepted lines
const generateInvoiceFromGRN = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { grnId } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const [grn] = await db_1.db
            .select({
            id: schema_1.goodsReceivedNotes.id,
            grnNumber: schema_1.goodsReceivedNotes.grnNumber,
            supplierDeliveryNote: schema_1.goodsReceivedNotes.supplierDeliveryNote,
            supplierId: schema_1.goodsReceivedNotes.supplierId,
            supplierName: schema_1.suppliers.name,
            paymentTerms: schema_1.suppliers.paymentTerms,
            purchaseOrderId: schema_1.goodsReceivedNotes.purchaseOrderId,
            branchId: schema_1.goodsReceivedNotes.branchId,
        })
            .from(schema_1.goodsReceivedNotes)
            .innerJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.supplierId, schema_1.suppliers.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.id, Number(grnId)), (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.tenantId, tenantId)))
            .limit(1);
        if (!grn) {
            res.status(404).json({ status: 'error', message: 'GRN record not found' });
            return;
        }
        // Pull accepted items from goods_received_items
        const lines = await db_1.db
            .select({
            inventoryItemId: schema_1.goodsReceivedItems.inventoryItemId,
            itemName: schema_1.inventoryItems.name,
            itemUnit: schema_1.inventoryItems.unit,
            quantityAccepted: schema_1.goodsReceivedItems.quantityAccepted,
            unitCost: schema_1.goodsReceivedItems.unitCost,
        })
            .from(schema_1.goodsReceivedItems)
            .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedItems.inventoryItemId, schema_1.inventoryItems.id))
            .where((0, drizzle_orm_1.eq)(schema_1.goodsReceivedItems.grnId, grn.id));
        // Calculate subtotal and 16% standard VAT
        let subtotal = 0;
        const items = lines.map((l) => {
            const qty = parseFloat(l.quantityAccepted) || 0;
            const price = parseFloat(l.unitCost) || 0;
            const lineSubtotal = qty * price;
            subtotal += lineSubtotal;
            return {
                inventoryItemId: l.inventoryItemId,
                itemName: l.itemName,
                itemUnit: l.itemUnit,
                quantity: qty,
                unitPrice: price,
                taxRate: 16.0,
                subtotal: lineSubtotal,
            };
        });
        const taxAmount = subtotal * 0.16;
        const totalAmount = subtotal + taxAmount;
        // Calculate due date based on payment terms
        let creditDays = 30;
        if (grn.paymentTerms === 'NET_7')
            creditDays = 7;
        else if (grn.paymentTerms === 'NET_14')
            creditDays = 14;
        else if (grn.paymentTerms === 'COD' || grn.paymentTerms === 'PREPAID')
            creditDays = 0;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + creditDays);
        res.status(200).json({
            status: 'success',
            data: {
                supplierId: grn.supplierId,
                supplierName: grn.supplierName,
                purchaseOrderId: grn.purchaseOrderId,
                goodsReceivedNoteId: grn.id,
                grnNumber: grn.grnNumber,
                invoiceNumber: grn.supplierDeliveryNote || `INV-${grn.grnNumber}`,
                dueDate: dueDate.toISOString().split('T')[0],
                subtotal,
                taxAmount,
                totalAmount,
                items,
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.generateInvoiceFromGRN = generateInvoiceFromGRN;
