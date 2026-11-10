import { eq, and, desc, asc, sql, or, ilike, gte, lte } from 'drizzle-orm';
import { db } from '../config/db';
import {
  supplierInvoices,
  suppliers,
  purchaseOrders,
  goodsReceivedNotes,
  payments,
  users,
  branches,
  notifications,
} from '../config/schema';
import {
  ListPayablesQuery,
  RecordPayableDisbursementInput,
  CreateSupplierInvoiceInput,
} from '../validators/payables.validator';

export const getPayablesAgingTelemetry = async (tenantId: number, branchId?: number) => {
  const branchCondition = branchId ? eq(supplierInvoices.branchId, branchId) : undefined;

  const [metrics] = await db
    .select({
      totalInvoicesCount: sql<number>`count(*)::int`,
      unpaidInvoicesCount: sql<number>`count(case when ${supplierInvoices.status} in ('UNPAID', 'PARTIALLY_PAID') then 1 end)::int`,
      totalOutstandingKes: sql<number>`coalesce(sum(case when ${supplierInvoices.status} in ('UNPAID', 'PARTIALLY_PAID') then (${supplierInvoices.totalAmount} - ${supplierInvoices.paidAmount}) else 0 end), 0)::numeric`,
      currentDueKes: sql<number>`coalesce(sum(case when ${supplierInvoices.status} in ('UNPAID', 'PARTIALLY_PAID') and ${supplierInvoices.dueDate} >= current_date then (${supplierInvoices.totalAmount} - ${supplierInvoices.paidAmount}) else 0 end), 0)::numeric`,
      overdue30Kes: sql<number>`coalesce(sum(case when ${supplierInvoices.status} in ('UNPAID', 'PARTIALLY_PAID') and ${supplierInvoices.dueDate} < current_date and ${supplierInvoices.dueDate} >= current_date - interval '30 days' then (${supplierInvoices.totalAmount} - ${supplierInvoices.paidAmount}) else 0 end), 0)::numeric`,
      overdue60Kes: sql<number>`coalesce(sum(case when ${supplierInvoices.status} in ('UNPAID', 'PARTIALLY_PAID') and ${supplierInvoices.dueDate} < current_date - interval '30 days' and ${supplierInvoices.dueDate} >= current_date - interval '60 days' then (${supplierInvoices.totalAmount} - ${supplierInvoices.paidAmount}) else 0 end), 0)::numeric`,
      overdue90PlusKes: sql<number>`coalesce(sum(case when ${supplierInvoices.status} in ('UNPAID', 'PARTIALLY_PAID') and ${supplierInvoices.dueDate} < current_date - interval '60 days' then (${supplierInvoices.totalAmount} - ${supplierInvoices.paidAmount}) else 0 end), 0)::numeric`,
      totalPaidDisbursedKes: sql<number>`coalesce(sum(${supplierInvoices.paidAmount}), 0)::numeric`,
    })
    .from(supplierInvoices)
    .where(and(eq(supplierInvoices.tenantId, tenantId), branchCondition));

  return {
    totalInvoicesCount: Number(metrics?.totalInvoicesCount || 0),
    unpaidInvoicesCount: Number(metrics?.unpaidInvoicesCount || 0),
    totalOutstandingKes: Number(metrics?.totalOutstandingKes || 0),
    totalPaidDisbursedKes: Number(metrics?.totalPaidDisbursedKes || 0),
    agingBrackets: {
      currentDueKes: Number(metrics?.currentDueKes || 0),
      overdue30Kes: Number(metrics?.overdue30Kes || 0),
      overdue60Kes: Number(metrics?.overdue60Kes || 0),
      overdue90PlusKes: Number(metrics?.overdue90PlusKes || 0),
    },
  };
};

export const listTenantPayables = async (tenantId: number, query: ListPayablesQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const branchCondition = query.branchId ? eq(supplierInvoices.branchId, query.branchId) : undefined;
  const supplierCondition = query.supplierId ? eq(supplierInvoices.supplierId, query.supplierId) : undefined;
  const statusCondition = query.status && query.status !== 'ALL' ? eq(supplierInvoices.status, query.status) : undefined;

  let agingCondition = undefined;
  if (query.agingBucket === 'CURRENT') {
    agingCondition = gte(supplierInvoices.dueDate, sql`current_date`);
  } else if (query.agingBucket === 'PAST_DUE_30') {
    agingCondition = and(
      sql`${supplierInvoices.dueDate} < current_date`,
      sql`${supplierInvoices.dueDate} >= current_date - interval '30 days'`
    );
  } else if (query.agingBucket === 'PAST_DUE_60') {
    agingCondition = and(
      sql`${supplierInvoices.dueDate} < current_date - interval '30 days'`,
      sql`${supplierInvoices.dueDate} >= current_date - interval '60 days'`
    );
  } else if (query.agingBucket === 'PAST_DUE_90_PLUS') {
    agingCondition = sql`${supplierInvoices.dueDate} < current_date - interval '60 days'`;
  }

  const searchCondition = query.search
    ? or(
        ilike(supplierInvoices.invoiceNumber, `%${query.search}%`),
        ilike(supplierInvoices.internalRef, `%${query.search}%`),
        ilike(suppliers.name, `%${query.search}%`),
        ilike(suppliers.kraPin, `%${query.search}%`)
      )
    : undefined;

  const conditions = [
    eq(supplierInvoices.tenantId, tenantId),
    branchCondition,
    supplierCondition,
    statusCondition,
    agingCondition,
    searchCondition,
  ].filter(Boolean);

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(supplierInvoices)
      .leftJoin(suppliers, eq(supplierInvoices.supplierId, suppliers.id))
      .where(and(...conditions)),
    db
      .select({
        id: supplierInvoices.id,
        invoiceNumber: supplierInvoices.invoiceNumber,
        internalRef: supplierInvoices.internalRef,
        status: supplierInvoices.status,
        subtotal: supplierInvoices.subtotal,
        taxAmount: supplierInvoices.taxAmount,
        totalAmount: supplierInvoices.totalAmount,
        paidAmount: supplierInvoices.paidAmount,
        remainingAmount: sql<number>`(${supplierInvoices.totalAmount} - ${supplierInvoices.paidAmount})::numeric`,
        invoiceDate: supplierInvoices.invoiceDate,
        dueDate: supplierInvoices.dueDate,
        notes: supplierInvoices.notes,
        createdAt: supplierInvoices.createdAt,
        supplierId: suppliers.id,
        supplierName: suppliers.name,
        supplierKraPin: suppliers.kraPin,
        supplierPhone: suppliers.phone,
        supplierPaymentTerms: suppliers.paymentTerms,
        purchaseOrderId: supplierInvoices.purchaseOrderId,
        poNumber: purchaseOrders.poNumber,
        grnId: supplierInvoices.goodsReceivedNoteId,
        grnNumber: goodsReceivedNotes.grnNumber,
        branchName: branches.name,
        createdByName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      })
      .from(supplierInvoices)
      .leftJoin(suppliers, eq(supplierInvoices.supplierId, suppliers.id))
      .leftJoin(purchaseOrders, eq(supplierInvoices.purchaseOrderId, purchaseOrders.id))
      .leftJoin(goodsReceivedNotes, eq(supplierInvoices.goodsReceivedNoteId, goodsReceivedNotes.id))
      .leftJoin(branches, eq(supplierInvoices.branchId, branches.id))
      .leftJoin(users, eq(supplierInvoices.createdById, users.id))
      .where(and(...conditions))
      .orderBy(desc(supplierInvoices.dueDate))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return {
    invoices: rows.map((r) => ({
      ...r,
      subtotal: Number(r.subtotal),
      taxAmount: Number(r.taxAmount),
      totalAmount: Number(r.totalAmount),
      paidAmount: Number(r.paidAmount),
      remainingAmount: Math.max(0, Number(r.remainingAmount)),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const createSupplierInvoiceRecord = async (
  tenantId: number,
  userId: number,
  input: CreateSupplierInvoiceInput
) => {
  return await db.transaction(async (tx) => {
    const currentYear = new Date().getFullYear();
    const [countResult] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(supplierInvoices)
      .where(eq(supplierInvoices.tenantId, tenantId));

    const nextSeq = String((countResult?.count || 0) + 1).padStart(4, '0');
    const internalRef = `PINV-${currentYear}-${nextSeq}`;

    const totalAmount = (input.subtotal + (input.taxAmount || 0)).toFixed(4);

    const [created] = await tx
      .insert(supplierInvoices)
      .values({
        tenantId,
        branchId: input.branchId || null,
        supplierId: input.supplierId,
        purchaseOrderId: input.purchaseOrderId || null,
        goodsReceivedNoteId: input.goodsReceivedNoteId || null,
        invoiceNumber: input.invoiceNumber,
        internalRef,
        status: 'UNPAID',
        subtotal: input.subtotal.toFixed(4),
        taxAmount: (input.taxAmount || 0).toFixed(4),
        totalAmount,
        paidAmount: '0.0000',
        invoiceDate: new Date(input.invoiceDate),
        dueDate: new Date(input.dueDate),
        createdById: userId,
        notes: input.notes || null,
      })
      .returning();

    return created;
  });
};

export const recordPayableDisbursement = async (
  tenantId: number,
  userId: number,
  input: RecordPayableDisbursementInput
) => {
  return await db.transaction(async (tx) => {
    // 1. Fetch current invoice state
    const [invoice] = await tx
      .select()
      .from(supplierInvoices)
      .where(and(eq(supplierInvoices.id, input.invoiceId), eq(supplierInvoices.tenantId, tenantId)))
      .limit(1);

    if (!invoice) throw new Error('Supplier invoice not found');
    if (invoice.status === 'PAID') throw new Error('Supplier invoice is already settled in full');

    const remainingDue = Number(invoice.totalAmount) - Number(invoice.paidAmount);
    if (input.paymentAmount > remainingDue + 0.05) {
      throw new Error(`Payment amount (KES ${input.paymentAmount}) exceeds remaining balance of KES ${remainingDue.toFixed(2)}`);
    }

    const newPaidTotal = Number(invoice.paidAmount) + input.paymentAmount;
    const isFullSettlement = newPaidTotal >= Number(invoice.totalAmount) - 0.05;
    const newStatus = isFullSettlement ? 'PAID' : 'PARTIALLY_PAID';

    // 2. Generate Payment Number & Record Treasury Payment
    const currentYear = new Date().getFullYear();
    const [pmtCount] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(payments)
      .where(eq(payments.tenantId, tenantId));

    const pmtSeq = String((pmtCount?.count || 0) + 1).padStart(4, '0');
    const paymentNumber = `PMT-${currentYear}-${pmtSeq}`;

    const [pmt] = await tx
      .insert(payments)
      .values({
        tenantId,
        branchId: invoice.branchId,
        supplierId: invoice.supplierId,
        supplierInvoiceId: invoice.id,
        paymentNumber,
        paymentFlow: 'OUTBOUND_AP',
        status: 'POSTED',
        paymentMethod: input.paymentMethod,
        clearingAccount: input.clearingAccount,
        transactionReference: input.transactionReference,
        currency: 'KES',
        amount: input.paymentAmount.toFixed(4),
        processedById: userId,
        notes: input.notes || `Disbursement against Bill #${invoice.invoiceNumber}`,
      })
      .returning();

    // 3. Update Invoice Settlement Ledger
    const [updatedInvoice] = await tx
      .update(supplierInvoices)
      .set({
        paidAmount: newPaidTotal.toFixed(4),
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(supplierInvoices.id, invoice.id))
      .returning();

    return { payment: pmt, invoice: updatedInvoice };
  });
};