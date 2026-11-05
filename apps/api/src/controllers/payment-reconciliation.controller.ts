import { Response } from 'express';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { db } from '../config/db';
import { 
  payments, 
  bankStatements, 
  bankStatementLines, 
  suppliers, 
  supplierInvoices, 
  branches, 
  users 
} from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { 
  directReconcilePaymentSchema, 
  matchStatementLineSchema, 
  createBankStatementSchema 
} from '../validators/payment-reconciliation.validator';
import { z } from 'zod';

// 1. Get Enterprise Reconciliation Workbench State
export const getReconciliationWorkbench = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const clearingAccount = req.query.clearingAccount as string;

    // A. Unreconciled ERP Book Payments
    let pmtConditions = and(
      eq(payments.tenantId, tenantId),
      eq(payments.status, 'POSTED'),
      eq(payments.isReversed, false)
    );

    if (clearingAccount && clearingAccount !== 'ALL') {
      pmtConditions = and(
        eq(payments.tenantId, tenantId),
        eq(payments.status, 'POSTED'),
        eq(payments.isReversed, false),
        eq(payments.clearingAccount, clearingAccount)
      );
    }

    const openPayments = await db
      .select({
        id: payments.id,
        paymentNumber: payments.paymentNumber,
        paymentFlow: payments.paymentFlow,
        paymentMethod: payments.paymentMethod,
        clearingAccount: payments.clearingAccount,
        transactionReference: payments.transactionReference,
        amount: payments.amount,
        supplierName: suppliers.name,
        invoiceNumber: supplierInvoices.invoiceNumber,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .leftJoin(suppliers, eq(payments.supplierId, suppliers.id))
      .leftJoin(supplierInvoices, eq(payments.supplierInvoiceId, supplierInvoices.id))
      .where(pmtConditions)
      .orderBy(desc(payments.createdAt));

    // B. Unreconciled Imported Bank Statement Lines
    const openBankLines = await db
      .select({
        id: bankStatementLines.id,
        bankStatementId: bankStatementLines.bankStatementId,
        statementNumber: bankStatements.statementNumber,
        clearingAccount: bankStatements.clearingAccount,
        lineDate: bankStatementLines.lineDate,
        transactionReference: bankStatementLines.transactionReference,
        description: bankStatementLines.description,
        amount: bankStatementLines.amount,
      })
      .from(bankStatementLines)
      .innerJoin(bankStatements, eq(bankStatementLines.bankStatementId, bankStatements.id))
      .where(
        and(
          eq(bankStatements.tenantId, tenantId),
          eq(bankStatementLines.isReconciled, false),
          clearingAccount && clearingAccount !== 'ALL' 
            ? eq(bankStatements.clearingAccount, clearingAccount) 
            : undefined
        )
      )
      .orderBy(desc(bankStatementLines.lineDate));

    // C. Reconciled Pair History (Last 50)
    const reconciledHistory = await db
      .select({
        paymentId: payments.id,
        paymentNumber: payments.paymentNumber,
        paymentFlow: payments.paymentFlow,
        amount: payments.amount,
        clearingAccount: payments.clearingAccount,
        transactionReference: payments.transactionReference,
        reconciledAt: payments.reconciledAt,
        notes: payments.notes,
      })
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), eq(payments.status, 'RECONCILED')))
      .orderBy(desc(payments.reconciledAt))
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
  } catch (error: any) {
    console.error('[Get Reconciliation Workbench Error]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Perform Two-Sided Bank Line to Payment Matching
export const matchStatementLineToPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = matchStatementLineSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      // 1. Validate payment existence and state
      const [pmt] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.id, payload.paymentId), eq(payments.tenantId, tenantId)))
        .limit(1);

      if (!pmt) throw new Error('Payment record not found');
      if (pmt.status === 'RECONCILED') throw new Error('Payment is already reconciled');

      // 2. Validate statement line existence and state
      const [lineData] = await tx
        .select({
          lineId: bankStatementLines.id,
          isReconciled: bankStatementLines.isReconciled,
          transactionReference: bankStatementLines.transactionReference,
          statementNumber: bankStatements.statementNumber,
        })
        .from(bankStatementLines)
        .innerJoin(bankStatements, eq(bankStatementLines.bankStatementId, bankStatements.id))
        .where(
          and(
            eq(bankStatementLines.id, payload.statementLineId),
            eq(bankStatements.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!lineData) throw new Error('Bank statement line not found');
      if (lineData.isReconciled) throw new Error('Bank statement line is already reconciled');

      // 3. Mark bank statement line as reconciled
      await tx
        .update(bankStatementLines)
        .set({
          isReconciled: true,
          matchedPaymentId: pmt.id,
          reconciledAt: new Date(),
        })
        .where(eq(bankStatementLines.id, payload.statementLineId));

      // 4. Safely construct audit notes string in JS
      const existingNotes = pmt.notes ? pmt.notes.trim() : '';
      const lineRef = lineData.transactionReference || `LINE-${payload.statementLineId}`;
      const matchStamp = `[Cleared against statement line #${payload.statementLineId} - ${lineRef}]`;
      const updatedNotes = existingNotes ? `${existingNotes} ${matchStamp}` : matchStamp;

      // 5. Mark payment as RECONCILED
      const [updatedPayment] = await tx
        .update(payments)
        .set({
          status: 'RECONCILED',
          reconciledAt: new Date(),
          notes: updatedNotes,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, pmt.id))
        .returning();

      return updatedPayment;
    });

    res.status(200).json({ 
      status: 'success', 
      message: 'Transaction successfully reconciled and cleared', 
      data: result 
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 3. Direct Reconcile Payment
export const directReconcilePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = directReconcilePaymentSchema.parse(req.body);

    // 1. Fetch current payment record
    const [pmt] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, Number(id)), eq(payments.tenantId, tenantId)))
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
    const [updated] = await db
      .update(payments)
      .set({
        status: 'RECONCILED',
        reconciledAt: new Date(),
        notes: updatedNotes,
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, pmt.id), eq(payments.tenantId, tenantId)))
      .returning();

    res.status(200).json({ 
      status: 'success', 
      message: 'Payment marked as bank reconciled', 
      data: updated 
    });
  } catch (error: any) {
    console.error('[Direct Reconcile Error]:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 4. Import / Record Bank Statement Feed
export const createBankStatement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const rawBranchId = req.user?.defaultBranchId;
    const branchId = rawBranchId ? Number(rawBranchId) : null;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createBankStatementSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const [statement] = await tx
        .insert(bankStatements)
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

      await tx.insert(bankStatementLines).values(lineValues);

      return statement;
    });

    res.status(201).json({ 
      status: 'success', 
      data: result, 
      message: 'Bank statement imported successfully' 
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 5. Batch Auto-Reconcile Confident Pairs
export const autoMatchConfidentPairs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const clearingAccount = req.body.clearingAccount as string;

    const result = await db.transaction(async (tx) => {
      // Fetch open book payments
      const openPayments = await tx
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.tenantId, tenantId),
            eq(payments.status, 'POSTED'),
            eq(payments.isReversed, false),
            clearingAccount && clearingAccount !== 'ALL'
              ? eq(payments.clearingAccount, clearingAccount)
              : undefined
          )
        );

      // Fetch open statement lines
      const openLines = await tx
        .select({
          line: bankStatementLines,
          statement: bankStatements,
        })
        .from(bankStatementLines)
        .innerJoin(bankStatements, eq(bankStatementLines.bankStatementId, bankStatements.id))
        .where(
          and(
            eq(bankStatements.tenantId, tenantId),
            eq(bankStatementLines.isReconciled, false),
            clearingAccount && clearingAccount !== 'ALL'
              ? eq(bankStatements.clearingAccount, clearingAccount)
              : undefined
          )
        );

      let matchedCount = 0;
      const matchedLineIds = new Set<number>();

      for (const pmt of openPayments) {
        const pmtAmt = parseFloat(pmt.amount);
        const pmtRef = pmt.transactionReference?.trim().toLowerCase();

        // Match by exact reference OR exact monetary amount
        const matchedEntry = openLines.find(({ line }) => {
          if (matchedLineIds.has(line.id)) return false;
          const lineAmt = Math.abs(parseFloat(line.amount));
          const lineRef = line.transactionReference?.trim().toLowerCase();

          // Rule 1: Exact reference match
          if (pmtRef && lineRef && pmtRef === lineRef) return true;
          // Rule 2: Exact amount match
          return Math.abs(pmtAmt - lineAmt) < 0.001;
        });

        if (matchedEntry) {
          const { line } = matchedEntry;
          matchedLineIds.add(line.id);

          await tx
            .update(bankStatementLines)
            .set({
              isReconciled: true,
              matchedPaymentId: pmt.id,
              reconciledAt: new Date(),
            })
            .where(eq(bankStatementLines.id, line.id));

          const existingNotes = pmt.notes ? pmt.notes.trim() : '';
          const lineRefStr = line.transactionReference || 'REF';
          const matchStamp = `[Auto-Cleared via Statement Line #${line.id} - ${lineRefStr}]`;
          const updatedNotes = existingNotes ? `${existingNotes} ${matchStamp}` : matchStamp;

          await tx
            .update(payments)
            .set({
              status: 'RECONCILED',
              reconciledAt: new Date(),
              notes: updatedNotes,
              updatedAt: new Date(),
            })
            .where(eq(payments.id, pmt.id));

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
  } catch (error: any) {
    console.error('[Auto Match Error]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 6. Unreconcile Cleared Payment (Rollback)
export const unreconcilePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [pmt] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.id, Number(id)), eq(payments.tenantId, tenantId)))
        .limit(1);

      if (!pmt) throw new Error('Payment record not found');
      if (pmt.status !== 'RECONCILED') throw new Error('Payment is not currently reconciled');

      // 1. Unlink statement line if any
      await tx
        .update(bankStatementLines)
        .set({
          isReconciled: false,
          matchedPaymentId: null,
          reconciledAt: null,
        })
        .where(eq(bankStatementLines.matchedPaymentId, pmt.id));

      // 2. Build rollback notes safely in JS
      const existingNotes = pmt.notes ? pmt.notes.trim() : '';
      const rollbackStamp = `[Reconciliation Rolled Back: ${new Date().toISOString()}]`;
      const updatedNotes = existingNotes ? `${existingNotes} ${rollbackStamp}` : rollbackStamp;

      // 3. Revert payment status back to POSTED
      const [updated] = await tx
        .update(payments)
        .set({
          status: 'POSTED',
          reconciledAt: null,
          notes: updatedNotes,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, pmt.id))
        .returning();

      return updated;
    });

    res.status(200).json({
      status: 'success',
      message: 'Payment unlinked and marked as unreconciled',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const clearDirectBankFeeSchema = z.object({
  statementLineId: z.coerce.number().positive(),
  expenseCategory: z.enum(['BANK_FEES_COMMISSIONS', 'INTEREST_EXPENSE', 'WITHHOLDING_TAX', 'GENERAL_EXPENSE']),
  notes: z.string().optional().nullable(),
});

export const clearBankLineToInvoiceSchema = z.object({
  statementLineId: z.coerce.number().positive(),
  supplierInvoiceId: z.coerce.number().positive(),
  notes: z.string().optional().nullable(),
});

// 7. Clear Unmatched Bank Line as a Direct Bank Fee / Expense
export const clearBankLineAsExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const rawBranchId = req.user?.defaultBranchId;
    const branchId = rawBranchId ? Number(rawBranchId) : null;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = clearDirectBankFeeSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      // 1. Fetch the bank statement line
      const [lineData] = await tx
        .select({
          line: bankStatementLines,
          statement: bankStatements,
        })
        .from(bankStatementLines)
        .innerJoin(bankStatements, eq(bankStatementLines.bankStatementId, bankStatements.id))
        .where(
          and(
            eq(bankStatementLines.id, payload.statementLineId),
            eq(bankStatements.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!lineData) throw new Error('Bank statement line not found');
      if (lineData.line.isReconciled) throw new Error('Bank statement line is already reconciled');

      const lineAmt = Math.abs(parseFloat(lineData.line.amount));
      const pmtNum = `PMT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      // 2. Generate the missing ERP payment voucher automatically
      const [generatedPmt] = await tx
        .insert(payments)
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
        .update(bankStatementLines)
        .set({
          isReconciled: true,
          matchedPaymentId: generatedPmt.id,
          reconciledAt: new Date(),
        })
        .where(eq(bankStatementLines.id, lineData.line.id));

      return { payment: generatedPmt, statementLine: lineData.line };
    });

    res.status(200).json({
      status: 'success',
      message: 'Bank line posted to expense ledger and reconciled',
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

// 8. Match Unmatched Bank Line Directly to Open Supplier Invoice
export const clearBankLineToInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const rawBranchId = req.user?.defaultBranchId;
    const branchId = rawBranchId ? Number(rawBranchId) : null;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = clearBankLineToInvoiceSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const [lineData] = await tx
        .select({
          line: bankStatementLines,
          statement: bankStatements,
        })
        .from(bankStatementLines)
        .innerJoin(bankStatements, eq(bankStatementLines.bankStatementId, bankStatements.id))
        .where(
          and(
            eq(bankStatementLines.id, payload.statementLineId),
            eq(bankStatements.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!lineData) throw new Error('Bank statement line not found');
      if (lineData.line.isReconciled) throw new Error('Bank line is already reconciled');

      const [invoice] = await tx
        .select()
        .from(supplierInvoices)
        .where(and(eq(supplierInvoices.id, payload.supplierInvoiceId), eq(supplierInvoices.tenantId, tenantId)))
        .limit(1);

      if (!invoice) throw new Error('Supplier invoice not found');

      const lineAmt = Math.abs(parseFloat(lineData.line.amount));
      const currentPaid = parseFloat(invoice.paidAmount) || 0;
      const totalInvoice = parseFloat(invoice.totalAmount) || 0;
      const newPaid = currentPaid + lineAmt;

      // Update invoice state
      await tx
        .update(supplierInvoices)
        .set({
          paidAmount: newPaid.toFixed(4),
          status: newPaid >= totalInvoice ? 'PAID' : 'PARTIALLY_PAID',
          updatedAt: new Date(),
        })
        .where(eq(supplierInvoices.id, invoice.id));

      // Generate payment voucher
      const pmtNum = `PMT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      const [generatedPmt] = await tx
        .insert(payments)
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
        .update(bankStatementLines)
        .set({
          isReconciled: true,
          matchedPaymentId: generatedPmt.id,
          reconciledAt: new Date(),
        })
        .where(eq(bankStatementLines.id, lineData.line.id));

      return { payment: generatedPmt, invoice };
    });

    res.status(200).json({
      status: 'success',
      message: 'Bank line matched to supplier invoice and cleared',
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