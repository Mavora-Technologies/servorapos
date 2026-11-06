"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearBankLineToInvoice = exports.clearBankLineAsExpense = exports.clearBankLineToInvoiceSchema = exports.clearDirectBankFeeSchema = exports.unreconcilePayment = exports.autoMatchConfidentPairs = exports.createBankStatement = exports.directReconcilePayment = exports.matchStatementLineToPayment = exports.getReconciliationWorkbench = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const payment_reconciliation_validator_1 = require("../validators/payment-reconciliation.validator");
const zod_1 = require("zod");
// 1. Get Enterprise Reconciliation Workbench State
const getReconciliationWorkbench = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const clearingAccount = req.query.clearingAccount;
        // A. Unreconciled ERP Book Payments
        let pmtConditions = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.payments.status, 'POSTED'), (0, drizzle_orm_1.eq)(schema_1.payments.isReversed, false));
        if (clearingAccount && clearingAccount !== 'ALL') {
            pmtConditions = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.payments.status, 'POSTED'), (0, drizzle_orm_1.eq)(schema_1.payments.isReversed, false), (0, drizzle_orm_1.eq)(schema_1.payments.clearingAccount, clearingAccount));
        }
        const openPayments = await db_1.db
            .select({
            id: schema_1.payments.id,
            paymentNumber: schema_1.payments.paymentNumber,
            paymentFlow: schema_1.payments.paymentFlow,
            paymentMethod: schema_1.payments.paymentMethod,
            clearingAccount: schema_1.payments.clearingAccount,
            transactionReference: schema_1.payments.transactionReference,
            amount: schema_1.payments.amount,
            supplierName: schema_1.suppliers.name,
            invoiceNumber: schema_1.supplierInvoices.invoiceNumber,
            createdAt: schema_1.payments.createdAt,
        })
            .from(schema_1.payments)
            .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.payments.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.supplierInvoices, (0, drizzle_orm_1.eq)(schema_1.payments.supplierInvoiceId, schema_1.supplierInvoices.id))
            .where(pmtConditions)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.payments.createdAt));
        // B. Unreconciled Imported Bank Statement Lines
        const openBankLines = await db_1.db
            .select({
            id: schema_1.bankStatementLines.id,
            bankStatementId: schema_1.bankStatementLines.bankStatementId,
            statementNumber: schema_1.bankStatements.statementNumber,
            clearingAccount: schema_1.bankStatements.clearingAccount,
            lineDate: schema_1.bankStatementLines.lineDate,
            transactionReference: schema_1.bankStatementLines.transactionReference,
            description: schema_1.bankStatementLines.description,
            amount: schema_1.bankStatementLines.amount,
        })
            .from(schema_1.bankStatementLines)
            .innerJoin(schema_1.bankStatements, (0, drizzle_orm_1.eq)(schema_1.bankStatementLines.bankStatementId, schema_1.bankStatements.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.bankStatements.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.bankStatementLines.isReconciled, false), clearingAccount && clearingAccount !== 'ALL'
            ? (0, drizzle_orm_1.eq)(schema_1.bankStatements.clearingAccount, clearingAccount)
            : undefined))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.bankStatementLines.lineDate));
        // C. Reconciled Pair History (Last 50)
        const reconciledHistory = await db_1.db
            .select({
            paymentId: schema_1.payments.id,
            paymentNumber: schema_1.payments.paymentNumber,
            paymentFlow: schema_1.payments.paymentFlow,
            amount: schema_1.payments.amount,
            clearingAccount: schema_1.payments.clearingAccount,
            transactionReference: schema_1.payments.transactionReference,
            reconciledAt: schema_1.payments.reconciledAt,
            notes: schema_1.payments.notes,
        })
            .from(schema_1.payments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.payments.status, 'RECONCILED')))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.payments.reconciledAt))
            .limit(50);
        // Calculate discrepancy balance
        const bookTotal = openPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
        const bankTotal = openBankLines.reduce((acc, l) => acc + (parseFloat(l.amount) || 0), 0);
        res.status(200).json({
            status: 'success',
            data: {
                summary: {
                    unreconciledBookPaymentsCount: openPayments.length,
                    unreconciledBookAmount: Number(bookTotal.toFixed(2)),
                    unreconciledBankLinesCount: openBankLines.length,
                    unreconciledBankAmount: Number(bankTotal.toFixed(2)),
                    netDiscrepancy: Number((bookTotal - Math.abs(bankTotal)).toFixed(2)),
                },
                openPayments,
                openBankLines,
                reconciledHistory,
            },
        });
    }
    catch (error) {
        console.error('[Get Reconciliation Workbench Error]:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getReconciliationWorkbench = getReconciliationWorkbench;
// 2. Perform Two-Sided Bank Line to Payment Matching
const matchStatementLineToPayment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = payment_reconciliation_validator_1.matchStatementLineSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            // 1. Validate payment existence and state
            const [pmt] = await tx
                .select()
                .from(schema_1.payments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.id, payload.paymentId), (0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId)))
                .limit(1);
            if (!pmt)
                throw new Error('Payment record not found');
            if (pmt.status === 'RECONCILED')
                throw new Error('Payment is already reconciled');
            // 2. Validate statement line existence and state
            const [lineData] = await tx
                .select({
                lineId: schema_1.bankStatementLines.id,
                isReconciled: schema_1.bankStatementLines.isReconciled,
                transactionReference: schema_1.bankStatementLines.transactionReference,
                statementNumber: schema_1.bankStatements.statementNumber,
            })
                .from(schema_1.bankStatementLines)
                .innerJoin(schema_1.bankStatements, (0, drizzle_orm_1.eq)(schema_1.bankStatementLines.bankStatementId, schema_1.bankStatements.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.bankStatementLines.id, payload.statementLineId), (0, drizzle_orm_1.eq)(schema_1.bankStatements.tenantId, tenantId)))
                .limit(1);
            if (!lineData)
                throw new Error('Bank statement line not found');
            if (lineData.isReconciled)
                throw new Error('Bank statement line is already reconciled');
            // 3. Mark bank statement line as reconciled
            await tx
                .update(schema_1.bankStatementLines)
                .set({
                isReconciled: true,
                matchedPaymentId: pmt.id,
                reconciledAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.bankStatementLines.id, payload.statementLineId));
            // 4. Safely construct audit notes string in JS
            const existingNotes = pmt.notes ? pmt.notes.trim() : '';
            const lineRef = lineData.transactionReference || `LINE-${payload.statementLineId}`;
            const matchStamp = `[Cleared against statement line #${payload.statementLineId} - ${lineRef}]`;
            const updatedNotes = existingNotes ? `${existingNotes} ${matchStamp}` : matchStamp;
            // 5. Mark payment as RECONCILED
            const [updatedPayment] = await tx
                .update(schema_1.payments)
                .set({
                status: 'RECONCILED',
                reconciledAt: new Date(),
                notes: updatedNotes,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.payments.id, pmt.id))
                .returning();
            return updatedPayment;
        });
        res.status(200).json({
            status: 'success',
            message: 'Transaction successfully reconciled and cleared',
            data: result
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
exports.matchStatementLineToPayment = matchStatementLineToPayment;
// 3. Direct Reconcile Payment
const directReconcilePayment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = payment_reconciliation_validator_1.directReconcilePaymentSchema.parse(req.body);
        // 1. Fetch current payment record
        const [pmt] = await db_1.db
            .select()
            .from(schema_1.payments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId)))
            .limit(1);
        if (!pmt) {
            res.status(404).json({ status: 'error', message: 'Payment record not found' });
            return;
        }
        // 2. Build updated notes in JS safely without raw SQL CONCAT templates
        const existingNotes = pmt.notes ? pmt.notes.trim() : '';
        const auditStamp = `[Bank Reconciliation Ref: ${payload.bankStatementRef}]`;
        const updatedNotes = existingNotes ? `${existingNotes} ${auditStamp}` : auditStamp;
        // 3. Execute update
        const [updated] = await db_1.db
            .update(schema_1.payments)
            .set({
            status: 'RECONCILED',
            reconciledAt: new Date(),
            notes: updatedNotes,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.id, pmt.id), (0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId)))
            .returning();
        res.status(200).json({
            status: 'success',
            message: 'Payment marked as bank reconciled',
            data: updated
        });
    }
    catch (error) {
        console.error('[Direct Reconcile Error]:', error);
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.directReconcilePayment = directReconcilePayment;
// 4. Import / Record Bank Statement Feed
const createBankStatement = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rawBranchId = req.user?.defaultBranchId;
        const branchId = rawBranchId ? Number(rawBranchId) : null;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = payment_reconciliation_validator_1.createBankStatementSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const [statement] = await tx
                .insert(schema_1.bankStatements)
                .values({
                tenantId: Number(tenantId),
                branchId,
                statementNumber: payload.statementNumber,
                clearingAccount: payload.clearingAccount,
                openingBalance: payload.openingBalance.toFixed(4),
                closingBalance: payload.closingBalance.toFixed(4),
                statementDate: new Date(payload.statementDate),
                status: 'OPEN',
                createdById: userId ? Number(userId) : null,
            })
                .returning();
            const lineValues = payload.lines.map((l) => ({
                bankStatementId: statement.id,
                lineDate: new Date(l.lineDate),
                transactionReference: l.transactionReference || null,
                description: l.description,
                amount: l.amount.toFixed(4),
                isReconciled: false,
            }));
            await tx.insert(schema_1.bankStatementLines).values(lineValues);
            return statement;
        });
        res.status(201).json({
            status: 'success',
            data: result,
            message: 'Bank statement imported successfully'
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
exports.createBankStatement = createBankStatement;
// 5. Batch Auto-Reconcile Confident Pairs
const autoMatchConfidentPairs = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const clearingAccount = req.body.clearingAccount;
        const result = await db_1.db.transaction(async (tx) => {
            // Fetch open book payments
            const openPayments = await tx
                .select()
                .from(schema_1.payments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.payments.status, 'POSTED'), (0, drizzle_orm_1.eq)(schema_1.payments.isReversed, false), clearingAccount && clearingAccount !== 'ALL'
                ? (0, drizzle_orm_1.eq)(schema_1.payments.clearingAccount, clearingAccount)
                : undefined));
            // Fetch open statement lines
            const openLines = await tx
                .select({
                line: schema_1.bankStatementLines,
                statement: schema_1.bankStatements,
            })
                .from(schema_1.bankStatementLines)
                .innerJoin(schema_1.bankStatements, (0, drizzle_orm_1.eq)(schema_1.bankStatementLines.bankStatementId, schema_1.bankStatements.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.bankStatements.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.bankStatementLines.isReconciled, false), clearingAccount && clearingAccount !== 'ALL'
                ? (0, drizzle_orm_1.eq)(schema_1.bankStatements.clearingAccount, clearingAccount)
                : undefined));
            let matchedCount = 0;
            const matchedLineIds = new Set();
            for (const pmt of openPayments) {
                const pmtAmt = parseFloat(pmt.amount);
                const pmtRef = pmt.transactionReference?.trim().toLowerCase();
                // Match by exact reference OR exact monetary amount
                const matchedEntry = openLines.find(({ line }) => {
                    if (matchedLineIds.has(line.id))
                        return false;
                    const lineAmt = Math.abs(parseFloat(line.amount));
                    const lineRef = line.transactionReference?.trim().toLowerCase();
                    // Rule 1: Exact reference match
                    if (pmtRef && lineRef && pmtRef === lineRef)
                        return true;
                    // Rule 2: Exact amount match
                    return Math.abs(pmtAmt - lineAmt) < 0.001;
                });
                if (matchedEntry) {
                    const { line } = matchedEntry;
                    matchedLineIds.add(line.id);
                    await tx
                        .update(schema_1.bankStatementLines)
                        .set({
                        isReconciled: true,
                        matchedPaymentId: pmt.id,
                        reconciledAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.bankStatementLines.id, line.id));
                    const existingNotes = pmt.notes ? pmt.notes.trim() : '';
                    const lineRefStr = line.transactionReference || 'REF';
                    const matchStamp = `[Auto-Cleared via Statement Line #${line.id} - ${lineRefStr}]`;
                    const updatedNotes = existingNotes ? `${existingNotes} ${matchStamp}` : matchStamp;
                    await tx
                        .update(schema_1.payments)
                        .set({
                        status: 'RECONCILED',
                        reconciledAt: new Date(),
                        notes: updatedNotes,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.payments.id, pmt.id));
                    matchedCount++;
                }
            }
            return { matchedCount };
        });
        res.status(200).json({
            status: 'success',
            message: `Successfully auto-reconciled ${result.matchedCount} transactions.`,
            data: result,
        });
    }
    catch (error) {
        console.error('[Auto Match Error]:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.autoMatchConfidentPairs = autoMatchConfidentPairs;
// 6. Unreconcile Cleared Payment (Rollback)
const unreconcilePayment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const result = await db_1.db.transaction(async (tx) => {
            const [pmt] = await tx
                .select()
                .from(schema_1.payments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId)))
                .limit(1);
            if (!pmt)
                throw new Error('Payment record not found');
            if (pmt.status !== 'RECONCILED')
                throw new Error('Payment is not currently reconciled');
            // 1. Unlink statement line if any
            await tx
                .update(schema_1.bankStatementLines)
                .set({
                isReconciled: false,
                matchedPaymentId: null,
                reconciledAt: null,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.bankStatementLines.matchedPaymentId, pmt.id));
            // 2. Build rollback notes safely in JS
            const existingNotes = pmt.notes ? pmt.notes.trim() : '';
            const rollbackStamp = `[Reconciliation Rolled Back: ${new Date().toISOString()}]`;
            const updatedNotes = existingNotes ? `${existingNotes} ${rollbackStamp}` : rollbackStamp;
            // 3. Revert payment status back to POSTED
            const [updated] = await tx
                .update(schema_1.payments)
                .set({
                status: 'POSTED',
                reconciledAt: null,
                notes: updatedNotes,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.payments.id, pmt.id))
                .returning();
            return updated;
        });
        res.status(200).json({
            status: 'success',
            message: 'Payment unlinked and marked as unreconciled',
            data: result,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.unreconcilePayment = unreconcilePayment;
exports.clearDirectBankFeeSchema = zod_1.z.object({
    statementLineId: zod_1.z.coerce.number().positive(),
    expenseCategory: zod_1.z.enum(['BANK_FEES_COMMISSIONS', 'INTEREST_EXPENSE', 'WITHHOLDING_TAX', 'GENERAL_EXPENSE']),
    notes: zod_1.z.string().optional().nullable(),
});
exports.clearBankLineToInvoiceSchema = zod_1.z.object({
    statementLineId: zod_1.z.coerce.number().positive(),
    supplierInvoiceId: zod_1.z.coerce.number().positive(),
    notes: zod_1.z.string().optional().nullable(),
});
// 7. Clear Unmatched Bank Line as a Direct Bank Fee / Expense
const clearBankLineAsExpense = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rawBranchId = req.user?.defaultBranchId;
        const branchId = rawBranchId ? Number(rawBranchId) : null;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = exports.clearDirectBankFeeSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            // 1. Fetch the bank statement line
            const [lineData] = await tx
                .select({
                line: schema_1.bankStatementLines,
                statement: schema_1.bankStatements,
            })
                .from(schema_1.bankStatementLines)
                .innerJoin(schema_1.bankStatements, (0, drizzle_orm_1.eq)(schema_1.bankStatementLines.bankStatementId, schema_1.bankStatements.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.bankStatementLines.id, payload.statementLineId), (0, drizzle_orm_1.eq)(schema_1.bankStatements.tenantId, tenantId)))
                .limit(1);
            if (!lineData)
                throw new Error('Bank statement line not found');
            if (lineData.line.isReconciled)
                throw new Error('Bank statement line is already reconciled');
            const lineAmt = Math.abs(parseFloat(lineData.line.amount));
            const pmtNum = `PMT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            // 2. Generate the missing ERP payment voucher automatically
            const [generatedPmt] = await tx
                .insert(schema_1.payments)
                .values({
                tenantId: Number(tenantId),
                branchId,
                paymentNumber: pmtNum,
                paymentFlow: parseFloat(lineData.line.amount) < 0 ? 'OUTBOUND_AP' : 'INBOUND_AR',
                status: 'RECONCILED',
                paymentMethod: 'BANK_TRANSFER',
                clearingAccount: lineData.statement.clearingAccount,
                transactionReference: lineData.line.transactionReference || `FEE-${lineData.line.id}`,
                amount: lineAmt.toFixed(4),
                reconciledAt: new Date(),
                processedById: userId ? Number(userId) : null,
                notes: `[Direct Bank Clearance - ${payload.expenseCategory}]: ${payload.notes || lineData.line.description}`,
            })
                .returning();
            // 3. Mark statement line as reconciled
            await tx
                .update(schema_1.bankStatementLines)
                .set({
                isReconciled: true,
                matchedPaymentId: generatedPmt.id,
                reconciledAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.bankStatementLines.id, lineData.line.id));
            return { payment: generatedPmt, statementLine: lineData.line };
        });
        res.status(200).json({
            status: 'success',
            message: 'Bank line posted to expense ledger and reconciled',
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
exports.clearBankLineAsExpense = clearBankLineAsExpense;
// 8. Match Unmatched Bank Line Directly to Open Supplier Invoice
const clearBankLineToInvoice = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rawBranchId = req.user?.defaultBranchId;
        const branchId = rawBranchId ? Number(rawBranchId) : null;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = exports.clearBankLineToInvoiceSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const [lineData] = await tx
                .select({
                line: schema_1.bankStatementLines,
                statement: schema_1.bankStatements,
            })
                .from(schema_1.bankStatementLines)
                .innerJoin(schema_1.bankStatements, (0, drizzle_orm_1.eq)(schema_1.bankStatementLines.bankStatementId, schema_1.bankStatements.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.bankStatementLines.id, payload.statementLineId), (0, drizzle_orm_1.eq)(schema_1.bankStatements.tenantId, tenantId)))
                .limit(1);
            if (!lineData)
                throw new Error('Bank statement line not found');
            if (lineData.line.isReconciled)
                throw new Error('Bank line is already reconciled');
            const [invoice] = await tx
                .select()
                .from(schema_1.supplierInvoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, payload.supplierInvoiceId), (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId)))
                .limit(1);
            if (!invoice)
                throw new Error('Supplier invoice not found');
            const lineAmt = Math.abs(parseFloat(lineData.line.amount));
            const currentPaid = parseFloat(invoice.paidAmount) || 0;
            const totalInvoice = parseFloat(invoice.totalAmount) || 0;
            const newPaid = currentPaid + lineAmt;
            // Update invoice state
            await tx
                .update(schema_1.supplierInvoices)
                .set({
                paidAmount: newPaid.toFixed(4),
                status: newPaid >= totalInvoice ? 'PAID' : 'PARTIALLY_PAID',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, invoice.id));
            // Generate payment voucher
            const pmtNum = `PMT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            const [generatedPmt] = await tx
                .insert(schema_1.payments)
                .values({
                tenantId: Number(tenantId),
                branchId,
                paymentNumber: pmtNum,
                paymentFlow: 'OUTBOUND_AP',
                status: 'RECONCILED',
                paymentMethod: 'BANK_TRANSFER',
                clearingAccount: lineData.statement.clearingAccount,
                transactionReference: lineData.line.transactionReference || `STMT-${lineData.line.id}`,
                supplierId: invoice.supplierId,
                supplierInvoiceId: invoice.id,
                amount: lineAmt.toFixed(4),
                reconciledAt: new Date(),
                processedById: userId ? Number(userId) : null,
                notes: `[Cleared via Statement Feed]: ${lineData.line.description}`,
            })
                .returning();
            // Clear bank line
            await tx
                .update(schema_1.bankStatementLines)
                .set({
                isReconciled: true,
                matchedPaymentId: generatedPmt.id,
                reconciledAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.bankStatementLines.id, lineData.line.id));
            return { payment: generatedPmt, invoice };
        });
        res.status(200).json({
            status: 'success',
            message: 'Bank line matched to supplier invoice and cleared',
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
exports.clearBankLineToInvoice = clearBankLineToInvoice;
