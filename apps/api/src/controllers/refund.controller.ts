import { Response } from 'express';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '../config/db';
import { 
  refunds, 
  orders, 
  suppliers, 
  payments, 
  users, 
  branches 
} from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { createRefundSchema } from '../validators/refund.validator';

// 1. Get All Enterprise Refunds
const TREASURY_ACCOUNTS = [
  'M-Pesa B2B Corporate Paybill (55210)',
  'Equity Bank Operational Account (KES)',
  'KCB Bank Head Office Account',
  'Main Safe Petty Cash Drawer',
];

export const getRefunds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const records = await db
      .select({
        id: refunds.id,
        refundNumber: refunds.refundNumber,
        refundFlow: refunds.refundFlow,
        status: refunds.status,
        refundMethod: refunds.refundMethod,
        clearingAccount: refunds.clearingAccount,
        transactionReference: refunds.transactionReference,
        amount: refunds.amount,
        restockItems: refunds.restockItems,
        reasonCode: refunds.reasonCode,
        orderId: refunds.orderId,
        supplierId: refunds.supplierId,
        supplierName: suppliers.name,
        branchName: branches.name,
        processedByEmail: users.email,
        notes: refunds.notes,
        createdAt: refunds.createdAt,
      })
      .from(refunds)
      .leftJoin(suppliers, eq(refunds.supplierId, suppliers.id))
      .leftJoin(branches, eq(refunds.branchId, branches.id))
      .leftJoin(users, eq(refunds.processedById, users.id))
      .where(eq(refunds.tenantId, tenantId))
      .orderBy(desc(refunds.createdAt));

    let totalCustomerRefunds = 0;
    let totalVendorRefunds = 0;

    records.forEach((r) => {
      const amt = parseFloat(r.amount) || 0;
      if (r.refundFlow === 'AR_CUSTOMER_REFUND') {
        totalCustomerRefunds += amt;
      } else {
        totalVendorRefunds += amt;
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalRefundsCount: records.length,
          totalCustomerRefunds: Number(totalCustomerRefunds.toFixed(2)),
          totalVendorRefunds: Number(totalVendorRefunds.toFixed(2)),
          netRefundOutflow: Number((totalCustomerRefunds - totalVendorRefunds).toFixed(2)),
        },
        refunds: records,
      },
    });
  } catch (error: any) {
    console.error('[Get Refunds Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch refunds' });
  }
};

// 2. Post Enterprise Refund Document (Credit Memo / Payout)
export const createRefund = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const rawBranchId = req.user?.defaultBranchId;
    const branchId = rawBranchId ? Number(rawBranchId) : null;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createRefundSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const refNum = `REF-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      // 1. Post corresponding double-entry treasury payment record
      const pmtNum = `PMT-REF-${Date.now().toString().slice(-4)}`;
      const [pmtRecord] = await tx
        .insert(payments)
        .values({
          tenantId: Number(tenantId),
          branchId,
          paymentNumber: pmtNum,
          paymentFlow: payload.refundFlow === 'AR_CUSTOMER_REFUND' ? 'OUTBOUND_AP' : 'INBOUND_AR',
          status: 'RECONCILED',
          paymentMethod: payload.refundMethod,
          clearingAccount: payload.clearingAccount,
          transactionReference: payload.transactionReference || null,
          supplierId: payload.supplierId || null,
          orderId: payload.orderId || null,
          amount: payload.amount.toFixed(4),
          reconciledAt: new Date(),
          processedById: userId ? Number(userId) : null,
          notes: `Refund Payout (${payload.reasonCode}): ${payload.notes || 'Credit memo disbursement'}`,
        })
        .returning();

      // 2. Insert Refund Record
      const [refundRecord] = await tx
        .insert(refunds)
        .values({
          tenantId: Number(tenantId),
          branchId,
          refundNumber: refNum,
          refundFlow: payload.refundFlow,
          status: 'PROCESSED',
          orderId: payload.orderId || null,
          supplierId: payload.supplierId || null,
          paymentId: pmtRecord.id,
          refundMethod: payload.refundMethod,
          clearingAccount: payload.clearingAccount,
          transactionReference: payload.transactionReference || null,
          amount: payload.amount.toFixed(4),
          restockItems: payload.restockItems,
          reasonCode: payload.reasonCode,
          processedById: userId ? Number(userId) : null,
          notes: payload.notes || null,
        })
        .returning();

      return refundRecord;
    });

    res.status(201).json({ status: 'success', data: result, message: 'Refund credit memo posted successfully' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};