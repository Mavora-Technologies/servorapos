"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcilePayment = exports.reversePayment = exports.createPayment = exports.getPayments = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const payment_validator_1 = require("../validators/payment.validator");
// 1. Get All Payments with Treasury Summary
const getPayments = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const records = await db_1.db
            .select({
            id: schema_1.payments.id,
            paymentNumber: schema_1.payments.paymentNumber,
            paymentFlow: schema_1.payments.paymentFlow,
            status: schema_1.payments.status,
            paymentMethod: schema_1.payments.paymentMethod,
            clearingAccount: schema_1.payments.clearingAccount,
            transactionReference: schema_1.payments.transactionReference,
            currency: schema_1.payments.currency,
            amount: schema_1.payments.amount,
            supplierId: schema_1.payments.supplierId,
            supplierName: schema_1.suppliers.name,
            supplierInvoiceId: schema_1.payments.supplierInvoiceId,
            invoiceNumber: schema_1.supplierInvoices.invoiceNumber,
            orderId: schema_1.payments.orderId,
            branchId: schema_1.payments.branchId,
            branchName: schema_1.branches.name,
            processedByEmail: schema_1.users.email,
            isReversed: schema_1.payments.isReversed,
            reversedPaymentId: schema_1.payments.reversedPaymentId,
            reconciledAt: schema_1.payments.reconciledAt,
            notes: schema_1.payments.notes,
            createdAt: schema_1.payments.createdAt,
        })
            .from(schema_1.payments)
            .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.payments.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.supplierInvoices, (0, drizzle_orm_1.eq)(schema_1.payments.supplierInvoiceId, schema_1.supplierInvoices.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.payments.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.payments.processedById, schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.payments.createdAt));
        let totalOutboundAP = 0;
        let totalInboundAR = 0;
        let unreconciledCount = 0;
        records.forEach((p) => {
            if (!p.isReversed && p.status !== 'CANCELLED_REVERSED') {
                const amt = parseFloat(p.amount) || 0;
                if (p.paymentFlow === 'OUTBOUND_AP') {
                    totalOutboundAP += amt;
                }
                else {
                    totalInboundAR += amt;
                }
                if (p.status === 'POSTED') {
                    unreconciledCount++;
                }
            }
        });
        res.status(200).json({
            status: 'success',
            data: {
                summary: {
                    totalTransactions: records.length,
                    totalOutboundAP: Number(totalOutboundAP.toFixed(2)),
                    totalInboundAR: Number(totalInboundAR.toFixed(2)),
                    netTreasuryCashFlow: Number((totalInboundAR - totalOutboundAP).toFixed(2)),
                    unreconciledCount,
                },
                payments: records,
            },
        });
    }
    catch (error) {
        console.error('[Get Payments Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch payments' });
    }
};
exports.getPayments = getPayments;
// 2. Post Enterprise Payment Transaction
const createPayment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rawBranchId = req.user?.defaultBranchId;
        const branchId = rawBranchId ? Number(rawBranchId) : null;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = payment_validator_1.createPaymentSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const pmtNum = `PMT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            // If tied to a Supplier Invoice, update Accounts Payable allocations
            if (payload.supplierInvoiceId) {
                const [invoice] = await tx
                    .select()
                    .from(schema_1.supplierInvoices)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, payload.supplierInvoiceId), (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId)))
                    .limit(1);
                if (!invoice)
                    throw new Error('Target supplier invoice not found');
                const currentPaid = parseFloat(invoice.paidAmount) || 0;
                const totalInvoice = parseFloat(invoice.totalAmount) || 0;
                const newPaid = currentPaid + payload.amount;
                const updatedStatus = newPaid >= totalInvoice ? 'PAID' : 'PARTIALLY_PAID';
                await tx
                    .update(schema_1.supplierInvoices)
                    .set({
                    paidAmount: newPaid.toFixed(4),
                    status: updatedStatus,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, invoice.id));
            }
            const [payment] = await tx
                .insert(schema_1.payments)
                .values({
                tenantId: Number(tenantId),
                branchId,
                paymentNumber: pmtNum,
                paymentFlow: payload.paymentFlow,
                status: 'POSTED',
                paymentMethod: payload.paymentMethod,
                clearingAccount: payload.clearingAccount,
                transactionReference: payload.transactionReference || null,
                supplierId: payload.supplierId || null,
                supplierInvoiceId: payload.supplierInvoiceId || null,
                orderId: payload.orderId || null,
                amount: payload.amount.toFixed(4),
                processedById: userId ? Number(userId) : null,
                notes: payload.notes || null,
            })
                .returning();
            return payment;
        });
        res.status(201).json({ status: 'success', data: result, message: 'Payment document posted successfully' });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.createPayment = createPayment;
// 3. Compensating Storno Payment Reversal
const reversePayment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = payment_validator_1.reversePaymentSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const [origin] = await tx
                .select()
                .from(schema_1.payments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId)))
                .limit(1);
            if (!origin)
                throw new Error('Original payment record not found');
            if (origin.isReversed)
                throw new Error('This payment has already been reversed');
            const originAmt = parseFloat(origin.amount);
            // 1. If it was an AP bill payment, restore invoice payable balance
            if (origin.supplierInvoiceId) {
                const [invoice] = await tx
                    .select()
                    .from(schema_1.supplierInvoices)
                    .where((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, origin.supplierInvoiceId))
                    .limit(1);
                if (invoice) {
                    const currentPaid = parseFloat(invoice.paidAmount) || 0;
                    const restoredPaid = Math.max(0, currentPaid - originAmt);
                    const restoredStatus = restoredPaid <= 0 ? 'UNPAID' : 'PARTIALLY_PAID';
                    await tx
                        .update(schema_1.supplierInvoices)
                        .set({
                        paidAmount: restoredPaid.toFixed(4),
                        status: restoredStatus,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, invoice.id));
                }
            }
            // 2. Mark original payment as reversed
            await tx
                .update(schema_1.payments)
                .set({
                isReversed: true,
                status: 'CANCELLED_REVERSED',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.payments.id, origin.id));
            // 3. Post compensating Storno payment record
            const [reversalRecord] = await tx
                .insert(schema_1.payments)
                .values({
                tenantId: Number(tenantId),
                branchId: origin.branchId,
                paymentNumber: `REV-${origin.paymentNumber}`,
                paymentFlow: origin.paymentFlow === 'OUTBOUND_AP' ? 'INBOUND_AR' : 'OUTBOUND_AP',
                status: 'CANCELLED_REVERSED',
                paymentMethod: origin.paymentMethod,
                clearingAccount: origin.clearingAccount,
                transactionReference: `REV-${origin.transactionReference || origin.id}`,
                supplierId: origin.supplierId,
                supplierInvoiceId: origin.supplierInvoiceId,
                orderId: origin.orderId,
                amount: (-originAmt).toFixed(4),
                reversedPaymentId: origin.id,
                processedById: userId ? Number(userId) : null,
                notes: `Storno reversal of ${origin.paymentNumber}. Reason: ${payload.reason}`,
            })
                .returning();
            return reversalRecord;
        });
        res.status(200).json({ status: 'success', message: 'Payment successfully reversed via Storno transaction', data: result });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.reversePayment = reversePayment;
// 4. Mark Reconciled against Bank Statement
const reconcilePayment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = payment_validator_1.reconcilePaymentSchema.parse(req.body);
        const [updated] = await db_1.db
            .update(schema_1.payments)
            .set({
            status: 'RECONCILED',
            reconciledAt: new Date(),
            notes: (0, drizzle_orm_1.sql) `CONCAT(COALESCE(notes, ''), ' [Bank Reconciliation Ref: ', ${payload.bankStatementRef}, ']')`,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId)))
            .returning();
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Payment record not found' });
            return;
        }
        res.status(200).json({ status: 'success', message: 'Payment marked as reconciled', data: updated });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.reconcilePayment = reconcilePayment;
