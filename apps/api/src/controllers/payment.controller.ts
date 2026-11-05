import { Response } from 'express';
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { 
  payments, 
  suppliers, 
  supplierInvoices, 
  orders, 
  users, 
  branches 
} from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { 
  createPaymentSchema, 
  reversePaymentSchema,
  reconcilePaymentSchema 
} from '../validators/payment.validator';

// 1. Get All Payments with Treasury Summary
export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const records = await db
      .select({
        id: payments.id,
        paymentNumber: payments.paymentNumber,
        paymentFlow: payments.paymentFlow,
        status: payments.status,
        paymentMethod: payments.paymentMethod,
        clearingAccount: payments.clearingAccount,
        transactionReference: payments.transactionReference,
        currency: payments.currency,
        amount: payments.amount,
        supplierId: payments.supplierId,
        supplierName: suppliers.name,
        supplierInvoiceId: payments.supplierInvoiceId,
        invoiceNumber: supplierInvoices.invoiceNumber,
        orderId: payments.orderId,
        branchId: payments.branchId,
        branchName: branches.name,
        processedByEmail: users.email,
        isReversed: payments.isReversed,
        reversedPaymentId: payments.reversedPaymentId,
        reconciledAt: payments.reconciledAt,
        notes: payments.notes,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .leftJoin(suppliers, eq(payments.supplierId, suppliers.id))
      .leftJoin(supplierInvoices, eq(payments.supplierInvoiceId, supplierInvoices.id))
      .leftJoin(branches, eq(payments.branchId, branches.id))
      .leftJoin(users, eq(payments.processedById, users.id))
      .where(eq(payments.tenantId, tenantId))
      .orderBy(desc(payments.createdAt));

    let totalOutboundAP = 0;
    let totalInboundAR = 0;
    let unreconciledCount = 0;

    records.forEach((p) => {
      if (!p.isReversed && p.status !== 'CANCELLED_REVERSED') {
        const amt = parseFloat(p.amount) || 0;
        if (p.paymentFlow === 'OUTBOUND_AP') {
          totalOutboundAP += amt;
        } else {
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
  } catch (error: any) {
    console.error('[Get Payments Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch payments' });
  }
};

// 2. Post Enterprise Payment Transaction
export const createPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const rawBranchId = req.user?.defaultBranchId;
    const branchId = rawBranchId ? Number(rawBranchId) : null;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createPaymentSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const pmtNum = `PMT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      // If tied to a Supplier Invoice, update Accounts Payable allocations
      if (payload.supplierInvoiceId) {
        const [invoice] = await tx
          .select()
          .from(supplierInvoices)
          .where(and(eq(supplierInvoices.id, payload.supplierInvoiceId), eq(supplierInvoices.tenantId, tenantId)))
          .limit(1);

        if (!invoice) throw new Error('Target supplier invoice not found');

        const currentPaid = parseFloat(invoice.paidAmount) || 0;
        const totalInvoice = parseFloat(invoice.totalAmount) || 0;
        const newPaid = currentPaid + payload.amount;

        const updatedStatus = newPaid >= totalInvoice ? 'PAID' : 'PARTIALLY_PAID';

        await tx
          .update(supplierInvoices)
          .set({
            paidAmount: newPaid.toFixed(4),
            status: updatedStatus,
            updatedAt: new Date(),
          })
          .where(eq(supplierInvoices.id, invoice.id));
      }

      const [payment] = await tx
        .insert(payments)
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
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 3. Compensating Storno Payment Reversal
export const reversePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = reversePaymentSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const [origin] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.id, Number(id)), eq(payments.tenantId, tenantId)))
        .limit(1);

      if (!origin) throw new Error('Original payment record not found');
      if (origin.isReversed) throw new Error('This payment has already been reversed');

      const originAmt = parseFloat(origin.amount);

      // 1. If it was an AP bill payment, restore invoice payable balance
      if (origin.supplierInvoiceId) {
        const [invoice] = await tx
          .select()
          .from(supplierInvoices)
          .where(eq(supplierInvoices.id, origin.supplierInvoiceId))
          .limit(1);

        if (invoice) {
          const currentPaid = parseFloat(invoice.paidAmount) || 0;
          const restoredPaid = Math.max(0, currentPaid - originAmt);
          const restoredStatus = restoredPaid <= 0 ? 'UNPAID' : 'PARTIALLY_PAID';

          await tx
            .update(supplierInvoices)
            .set({
              paidAmount: restoredPaid.toFixed(4),
              status: restoredStatus,
              updatedAt: new Date(),
            })
            .where(eq(supplierInvoices.id, invoice.id));
        }
      }

      // 2. Mark original payment as reversed
      await tx
        .update(payments)
        .set({
          isReversed: true,
          status: 'CANCELLED_REVERSED',
          updatedAt: new Date(),
        })
        .where(eq(payments.id, origin.id));

      // 3. Post compensating Storno payment record
      const [reversalRecord] = await tx
        .insert(payments)
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
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 4. Mark Reconciled against Bank Statement
export const reconcilePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = reconcilePaymentSchema.parse(req.body);

    const [updated] = await db
      .update(payments)
      .set({
        status: 'RECONCILED',
        reconciledAt: new Date(),
        notes: sql`CONCAT(COALESCE(notes, ''), ' [Bank Reconciliation Ref: ', ${payload.bankStatementRef}, ']')`,
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, Number(id)), eq(payments.tenantId, tenantId)))
      .returning();

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Payment record not found' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Payment marked as reconciled', data: updated });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};