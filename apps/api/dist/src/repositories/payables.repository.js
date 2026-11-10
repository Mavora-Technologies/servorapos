"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordPayableDisbursement = exports.createSupplierInvoiceRecord = exports.listTenantPayables = exports.getPayablesAgingTelemetry = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getPayablesAgingTelemetry = async (tenantId, branchId) => {
    const branchCondition = branchId ? (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.branchId, branchId) : undefined;
    const [metrics] = await db_1.db
        .select({
        totalInvoicesCount: (0, drizzle_orm_1.sql) `count(*)::int`,
        unpaidInvoicesCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.supplierInvoices.status} in ('UNPAID', 'PARTIALLY_PAID') then 1 end)::int`,
        totalOutstandingKes: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.supplierInvoices.status} in ('UNPAID', 'PARTIALLY_PAID') then (${schema_1.supplierInvoices.totalAmount} - ${schema_1.supplierInvoices.paidAmount}) else 0 end), 0)::numeric`,
        currentDueKes: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.supplierInvoices.status} in ('UNPAID', 'PARTIALLY_PAID') and ${schema_1.supplierInvoices.dueDate} >= current_date then (${schema_1.supplierInvoices.totalAmount} - ${schema_1.supplierInvoices.paidAmount}) else 0 end), 0)::numeric`,
        overdue30Kes: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.supplierInvoices.status} in ('UNPAID', 'PARTIALLY_PAID') and ${schema_1.supplierInvoices.dueDate} < current_date and ${schema_1.supplierInvoices.dueDate} >= current_date - interval '30 days' then (${schema_1.supplierInvoices.totalAmount} - ${schema_1.supplierInvoices.paidAmount}) else 0 end), 0)::numeric`,
        overdue60Kes: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.supplierInvoices.status} in ('UNPAID', 'PARTIALLY_PAID') and ${schema_1.supplierInvoices.dueDate} < current_date - interval '30 days' and ${schema_1.supplierInvoices.dueDate} >= current_date - interval '60 days' then (${schema_1.supplierInvoices.totalAmount} - ${schema_1.supplierInvoices.paidAmount}) else 0 end), 0)::numeric`,
        overdue90PlusKes: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.supplierInvoices.status} in ('UNPAID', 'PARTIALLY_PAID') and ${schema_1.supplierInvoices.dueDate} < current_date - interval '60 days' then (${schema_1.supplierInvoices.totalAmount} - ${schema_1.supplierInvoices.paidAmount}) else 0 end), 0)::numeric`,
        totalPaidDisbursedKes: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.supplierInvoices.paidAmount}), 0)::numeric`,
    })
        .from(schema_1.supplierInvoices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId), branchCondition));
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
exports.getPayablesAgingTelemetry = getPayablesAgingTelemetry;
const listTenantPayables = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const branchCondition = query.branchId ? (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.branchId, query.branchId) : undefined;
    const supplierCondition = query.supplierId ? (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.supplierId, query.supplierId) : undefined;
    const statusCondition = query.status && query.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.status, query.status) : undefined;
    let agingCondition = undefined;
    if (query.agingBucket === 'CURRENT') {
        agingCondition = (0, drizzle_orm_1.gte)(schema_1.supplierInvoices.dueDate, (0, drizzle_orm_1.sql) `current_date`);
    }
    else if (query.agingBucket === 'PAST_DUE_30') {
        agingCondition = (0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${schema_1.supplierInvoices.dueDate} < current_date`, (0, drizzle_orm_1.sql) `${schema_1.supplierInvoices.dueDate} >= current_date - interval '30 days'`);
    }
    else if (query.agingBucket === 'PAST_DUE_60') {
        agingCondition = (0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${schema_1.supplierInvoices.dueDate} < current_date - interval '30 days'`, (0, drizzle_orm_1.sql) `${schema_1.supplierInvoices.dueDate} >= current_date - interval '60 days'`);
    }
    else if (query.agingBucket === 'PAST_DUE_90_PLUS') {
        agingCondition = (0, drizzle_orm_1.sql) `${schema_1.supplierInvoices.dueDate} < current_date - interval '60 days'`;
    }
    const searchCondition = query.search
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.supplierInvoices.invoiceNumber, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.supplierInvoices.internalRef, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.suppliers.name, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.suppliers.kraPin, `%${query.search}%`))
        : undefined;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId),
        branchCondition,
        supplierCondition,
        statusCondition,
        agingCondition,
        searchCondition,
    ].filter(Boolean);
    const [countResult, rows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.supplierInvoices)
            .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.supplierId, schema_1.suppliers.id))
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            id: schema_1.supplierInvoices.id,
            invoiceNumber: schema_1.supplierInvoices.invoiceNumber,
            internalRef: schema_1.supplierInvoices.internalRef,
            status: schema_1.supplierInvoices.status,
            subtotal: schema_1.supplierInvoices.subtotal,
            taxAmount: schema_1.supplierInvoices.taxAmount,
            totalAmount: schema_1.supplierInvoices.totalAmount,
            paidAmount: schema_1.supplierInvoices.paidAmount,
            remainingAmount: (0, drizzle_orm_1.sql) `(${schema_1.supplierInvoices.totalAmount} - ${schema_1.supplierInvoices.paidAmount})::numeric`,
            invoiceDate: schema_1.supplierInvoices.invoiceDate,
            dueDate: schema_1.supplierInvoices.dueDate,
            notes: schema_1.supplierInvoices.notes,
            createdAt: schema_1.supplierInvoices.createdAt,
            supplierId: schema_1.suppliers.id,
            supplierName: schema_1.suppliers.name,
            supplierKraPin: schema_1.suppliers.kraPin,
            supplierPhone: schema_1.suppliers.phone,
            supplierPaymentTerms: schema_1.suppliers.paymentTerms,
            purchaseOrderId: schema_1.supplierInvoices.purchaseOrderId,
            poNumber: schema_1.purchaseOrders.poNumber,
            grnId: schema_1.supplierInvoices.goodsReceivedNoteId,
            grnNumber: schema_1.goodsReceivedNotes.grnNumber,
            branchName: schema_1.branches.name,
            createdByName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        })
            .from(schema_1.supplierInvoices)
            .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.purchaseOrders, (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.purchaseOrderId, schema_1.purchaseOrders.id))
            .leftJoin(schema_1.goodsReceivedNotes, (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.goodsReceivedNoteId, schema_1.goodsReceivedNotes.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.createdById, schema_1.users.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.supplierInvoices.dueDate))
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
exports.listTenantPayables = listTenantPayables;
const createSupplierInvoiceRecord = async (tenantId, userId, input) => {
    return await db_1.db.transaction(async (tx) => {
        const currentYear = new Date().getFullYear();
        const [countResult] = await tx
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.supplierInvoices)
            .where((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId));
        const nextSeq = String((countResult?.count || 0) + 1).padStart(4, '0');
        const internalRef = `PINV-${currentYear}-${nextSeq}`;
        const totalAmount = (input.subtotal + (input.taxAmount || 0)).toFixed(4);
        const [created] = await tx
            .insert(schema_1.supplierInvoices)
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
exports.createSupplierInvoiceRecord = createSupplierInvoiceRecord;
const recordPayableDisbursement = async (tenantId, userId, input) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Fetch current invoice state
        const [invoice] = await tx
            .select()
            .from(schema_1.supplierInvoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, input.invoiceId), (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId)))
            .limit(1);
        if (!invoice)
            throw new Error('Supplier invoice not found');
        if (invoice.status === 'PAID')
            throw new Error('Supplier invoice is already settled in full');
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
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.payments)
            .where((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId));
        const pmtSeq = String((pmtCount?.count || 0) + 1).padStart(4, '0');
        const paymentNumber = `PMT-${currentYear}-${pmtSeq}`;
        const [pmt] = await tx
            .insert(schema_1.payments)
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
            .update(schema_1.supplierInvoices)
            .set({
            paidAmount: newPaidTotal.toFixed(4),
            status: newStatus,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.id, invoice.id))
            .returning();
        return { payment: pmt, invoice: updatedInvoice };
    });
};
exports.recordPayableDisbursement = recordPayableDisbursement;
