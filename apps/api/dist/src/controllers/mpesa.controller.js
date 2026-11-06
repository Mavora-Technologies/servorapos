"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveOrdersForMpesa = exports.cancelPendingMpesa = exports.queryMpesaStatus = exports.reverseMpesaTransaction = exports.initiateB2BPayment = exports.initiateStkPush = exports.getMpesaTransactions = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const mpesa_validator_1 = require("../validators/mpesa.validator");
// 1. Get All M-Pesa Gateway Transactions with Telemetry
const getMpesaTransactions = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const txs = await db_1.db
            .select({
            id: schema_1.mpesaTransactions.id,
            transactionType: schema_1.mpesaTransactions.transactionType,
            mpesaReceiptNumber: schema_1.mpesaTransactions.mpesaReceiptNumber,
            checkoutRequestId: schema_1.mpesaTransactions.checkoutRequestId,
            conversationId: schema_1.mpesaTransactions.conversationId,
            phoneNumber: schema_1.mpesaTransactions.phoneNumber,
            accountReference: schema_1.mpesaTransactions.accountReference,
            businessShortCode: schema_1.mpesaTransactions.businessShortCode,
            amount: schema_1.mpesaTransactions.amount,
            transactionDate: schema_1.mpesaTransactions.transactionDate,
            status: schema_1.mpesaTransactions.status,
            resultCode: schema_1.mpesaTransactions.resultCode,
            resultDesc: schema_1.mpesaTransactions.resultDesc,
            supplierName: schema_1.suppliers.name,
            invoiceNumber: schema_1.supplierInvoices.invoiceNumber,
            orderId: schema_1.mpesaTransactions.orderId,
            paymentId: schema_1.mpesaTransactions.paymentId,
            initiatedByEmail: schema_1.users.email,
            notes: schema_1.mpesaTransactions.notes,
            createdAt: schema_1.mpesaTransactions.createdAt,
        })
            .from(schema_1.mpesaTransactions)
            .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.supplierInvoices, (0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.supplierInvoiceId, schema_1.supplierInvoices.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.initiatedById, schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.mpesaTransactions.transactionDate));
        let totalC2BInflow = 0;
        let totalB2BOutflow = 0;
        let pendingCount = 0;
        let failedCount = 0;
        txs.forEach((tx) => {
            const amt = parseFloat(tx.amount) || 0;
            if (tx.status === 'COMPLETED') {
                if (tx.transactionType.startsWith('C2B') || tx.transactionType === 'STK_PUSH') {
                    totalC2BInflow += amt;
                }
                else {
                    totalB2BOutflow += amt;
                }
            }
            else if (tx.status === 'PENDING') {
                pendingCount++;
            }
            else if (tx.status === 'FAILED') {
                failedCount++;
            }
        });
        res.status(200).json({
            status: 'success',
            data: {
                summary: {
                    totalTransactions: txs.length,
                    totalC2BInflow: Number(totalC2BInflow.toFixed(2)),
                    totalB2BOutflow: Number(totalB2BOutflow.toFixed(2)),
                    netPosition: Number((totalC2BInflow - totalB2BOutflow).toFixed(2)),
                    pendingCount,
                    failedCount,
                },
                transactions: txs,
            },
        });
    }
    catch (error) {
        console.error('[Get M-Pesa Transactions Error]:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getMpesaTransactions = getMpesaTransactions;
// 2. Initiate STK Push (C2B Customer Payment Collection)
const initiateStkPush = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rawBranchId = req.user?.defaultBranchId;
        const branchId = rawBranchId ? Number(rawBranchId) : null;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = mpesa_validator_1.initiateStkPushSchema.parse(req.body);
        // Format phone to 254XXXXXXXXX
        let cleanPhone = payload.phoneNumber.replace(/\D/g, '');
        if (cleanPhone.startsWith('0'))
            cleanPhone = '254' + cleanPhone.slice(1);
        if (cleanPhone.startsWith('7') || cleanPhone.startsWith('1'))
            cleanPhone = '254' + cleanPhone;
        const checkoutReqId = `ws_CO_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        const [txRecord] = await db_1.db
            .insert(schema_1.mpesaTransactions)
            .values({
            tenantId: Number(tenantId),
            branchId,
            transactionType: 'STK_PUSH',
            checkoutRequestId: checkoutReqId,
            phoneNumber: cleanPhone,
            accountReference: payload.accountReference,
            businessShortCode: '55210',
            amount: payload.amount.toFixed(4),
            status: 'PENDING',
            orderId: payload.orderId || null,
            initiatedById: userId ? Number(userId) : null,
            notes: payload.notes || 'STK Push Collection initiated',
        })
            .returning();
        res.status(200).json({
            status: 'success',
            message: `STK Push prompt sent to ${cleanPhone} for KES ${payload.amount.toLocaleString()}`,
            data: txRecord,
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
exports.initiateStkPush = initiateStkPush;
// 3. Initiate B2B Working Capital Payout (Supplier Bill Payment)
const initiateB2BPayment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rawBranchId = req.user?.defaultBranchId;
        const branchId = rawBranchId ? Number(rawBranchId) : null;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = mpesa_validator_1.initiateB2BPaymentSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const convId = `AG_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
            const receiptNo = `QK${Date.now().toString().slice(-6)}`;
            // 1. If linked to a supplier bill, update invoice paid amount
            if (payload.supplierInvoiceId) {
                const [invoice] = await tx
                    .select()
                    .from(schema_1.supplierInvoices)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, payload.supplierInvoiceId), (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId)))
                    .limit(1);
                if (invoice) {
                    const currentPaid = parseFloat(invoice.paidAmount) || 0;
                    const totalInv = parseFloat(invoice.totalAmount) || 0;
                    const newPaid = currentPaid + payload.amount;
                    await tx
                        .update(schema_1.supplierInvoices)
                        .set({
                        paidAmount: newPaid.toFixed(4),
                        status: newPaid >= totalInv ? 'PAID' : 'PARTIALLY_PAID',
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, invoice.id));
                }
            }
            // 2. Post corresponding double-entry payment voucher
            const pmtNum = `PMT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            const [pmtRecord] = await tx
                .insert(schema_1.payments)
                .values({
                tenantId: Number(tenantId),
                branchId,
                paymentNumber: pmtNum,
                paymentFlow: 'OUTBOUND_AP',
                status: 'RECONCILED',
                paymentMethod: 'MPESA_B2B',
                clearingAccount: 'M-Pesa B2B Corporate Paybill (55210)',
                transactionReference: receiptNo,
                supplierId: payload.supplierId || null,
                supplierInvoiceId: payload.supplierInvoiceId || null,
                amount: payload.amount.toFixed(4),
                reconciledAt: new Date(),
                processedById: userId ? Number(userId) : null,
                notes: `B2B Payout to Paybill/Till ${payload.businessShortCode} (Acc: ${payload.accountReference})`,
            })
                .returning();
            // 3. Insert M-Pesa transaction log
            const [txRecord] = await tx
                .insert(schema_1.mpesaTransactions)
                .values({
                tenantId: Number(tenantId),
                branchId,
                transactionType: payload.receiverType === 'PAYBILL' ? 'B2B_PAYBILL' : 'B2B_BUY_GOODS',
                mpesaReceiptNumber: receiptNo,
                conversationId: convId,
                accountReference: payload.accountReference,
                businessShortCode: payload.businessShortCode,
                amount: payload.amount.toFixed(4),
                status: 'COMPLETED',
                resultCode: '0',
                resultDesc: 'The service request is processed successfully.',
                supplierId: payload.supplierId || null,
                supplierInvoiceId: payload.supplierInvoiceId || null,
                paymentId: pmtRecord.id,
                initiatedById: userId ? Number(userId) : null,
                notes: payload.notes || 'B2B Supplier Disbursement',
            })
                .returning();
            return txRecord;
        });
        res.status(200).json({
            status: 'success',
            message: `B2B disbursement of KES ${payload.amount.toLocaleString()} to ${payload.businessShortCode} completed.`,
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
exports.initiateB2BPayment = initiateB2BPayment;
// 4. Reverse M-Pesa Transaction (Compensating Storno Entry)
const reverseMpesaTransaction = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = mpesa_validator_1.reverseMpesaTxSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const [txRecord] = await tx
                .select()
                .from(schema_1.mpesaTransactions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.tenantId, tenantId)))
                .limit(1);
            if (!txRecord)
                throw new Error('M-Pesa transaction record not found');
            if (txRecord.status === 'REVERSED')
                throw new Error('Transaction has already been reversed');
            // 1. If a linked payment voucher exists, mark it as reversed
            if (txRecord.paymentId) {
                const [existingPayment] = await tx
                    .select({ notes: schema_1.payments.notes })
                    .from(schema_1.payments)
                    .where((0, drizzle_orm_1.eq)(schema_1.payments.id, txRecord.paymentId))
                    .limit(1);
                const currentNotes = existingPayment?.notes ? existingPayment.notes.trim() : '';
                const reversalStamp = `[M-Pesa Gateway Reversal: ${payload.reason}]`;
                const updatedNotes = currentNotes ? `${currentNotes} ${reversalStamp}` : reversalStamp;
                await tx
                    .update(schema_1.payments)
                    .set({
                    status: 'CANCELLED_REVERSED',
                    isReversed: true,
                    notes: updatedNotes,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.payments.id, txRecord.paymentId));
            }
            // 2. If tied to an invoice, restore payable balance
            if (txRecord.supplierInvoiceId) {
                const [invoice] = await tx
                    .select()
                    .from(schema_1.supplierInvoices)
                    .where((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, txRecord.supplierInvoiceId))
                    .limit(1);
                if (invoice) {
                    const currentPaid = parseFloat(invoice.paidAmount) || 0;
                    const amt = parseFloat(txRecord.amount) || 0;
                    const restoredPaid = Math.max(0, currentPaid - amt);
                    await tx
                        .update(schema_1.supplierInvoices)
                        .set({
                        paidAmount: restoredPaid.toFixed(4),
                        status: restoredPaid <= 0 ? 'UNPAID' : 'PARTIALLY_PAID',
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, invoice.id));
                }
            }
            // 3. Mark M-Pesa transaction as REVERSED
            const txNotes = txRecord.notes ? txRecord.notes.trim() : '';
            const updatedTxNotes = txNotes ? `${txNotes} [Reversal: ${payload.reason}]` : `[Reversal: ${payload.reason}]`;
            const [updatedTx] = await tx
                .update(schema_1.mpesaTransactions)
                .set({
                status: 'REVERSED',
                notes: updatedTxNotes,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.id, txRecord.id))
                .returning();
            return updatedTx;
        });
        res.status(200).json({
            status: 'success',
            message: 'M-Pesa transaction marked as reversed and ledger updated.',
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
exports.reverseMpesaTransaction = reverseMpesaTransaction;
// 5. Query Real-Time Status / Resolve Awaiting PIN
const queryMpesaStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const [txRecord] = await db_1.db
            .select()
            .from(schema_1.mpesaTransactions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.tenantId, tenantId)))
            .limit(1);
        if (!txRecord) {
            res.status(404).json({ status: 'error', message: 'Transaction record not found' });
            return;
        }
        if (txRecord.status !== 'PENDING') {
            res.status(200).json({ status: 'success', message: `Transaction already finalized: ${txRecord.status}`, data: txRecord });
            return;
        }
        // Evaluate time elapsed since initiation (Safaricom STK prompts expire after 120 seconds)
        const initiatedTime = new Date(txRecord.transactionDate).getTime();
        const elapsedSeconds = Math.floor((Date.now() - initiatedTime) / 1000);
        if (elapsedSeconds > 120) {
            // Auto-expire timed-out requests
            const [expiredTx] = await db_1.db
                .update(schema_1.mpesaTransactions)
                .set({
                status: 'FAILED',
                resultCode: '1037',
                resultDesc: 'DS timeout user cannot be reached or prompt expired',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.id, txRecord.id))
                .returning();
            res.status(200).json({
                status: 'success',
                message: 'Prompt timed out and marked as FAILED.',
                data: expiredTx,
            });
            return;
        }
        const remaining = Math.max(0, 120 - elapsedSeconds);
        res.status(200).json({
            status: 'success',
            message: `Prompt still pending user PIN entry (${remaining}s remaining).`,
            data: txRecord,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.queryMpesaStatus = queryMpesaStatus;
// 6. Manual Void / Cancel Pending STK Prompt
const cancelPendingMpesa = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const [txRecord] = await db_1.db
            .select()
            .from(schema_1.mpesaTransactions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.tenantId, tenantId)))
            .limit(1);
        if (!txRecord) {
            res.status(404).json({ status: 'error', message: 'Transaction not found' });
            return;
        }
        if (txRecord.status !== 'PENDING') {
            res.status(400).json({ status: 'error', message: 'Only PENDING transactions can be cancelled' });
            return;
        }
        const [cancelledTx] = await db_1.db
            .update(schema_1.mpesaTransactions)
            .set({
            status: 'FAILED',
            resultCode: '1032',
            resultDesc: 'Cancelled by cashier / customer payment method changed',
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.id, txRecord.id))
            .returning();
        res.status(200).json({
            status: 'success',
            message: 'Pending STK prompt cancelled successfully',
            data: cancelledTx,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.cancelPendingMpesa = cancelPendingMpesa;
// 7. Get Active / Open POS Orders for STK Reference Matching (Resilient Schema Mapping)
// apps/api/src/controllers/mpesa.controller.ts
const getActiveOrdersForMpesa = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const activeList = await db_1.db
            .select({
            id: schema_1.orders.id,
            orderNumber: schema_1.orders.orderNumber,
            tableName: (0, drizzle_orm_1.sql) `COALESCE(${schema_1.orders.tableName}, ${schema_1.orders.orderType}, 'Counter POS')`,
            totalAmount: schema_1.orders.total, // maps physical column 'total' to 'totalAmount' for frontend
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.orders.status} NOT IN ('Completed', 'Cancelled', 'Voided')`, (0, drizzle_orm_1.sql) `${schema_1.orders.paymentStatus} NOT IN ('Paid', 'Refunded')`))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt))
            .limit(30);
        res.status(200).json({ status: 'success', data: activeList });
    }
    catch (error) {
        console.error('[Get Active Orders Error]:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getActiveOrdersForMpesa = getActiveOrdersForMpesa;
