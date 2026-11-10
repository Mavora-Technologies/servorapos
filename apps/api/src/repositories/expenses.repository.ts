import { eq, and, desc, asc, sql, or, ilike, gte, lte } from 'drizzle-orm';
import { db } from '../config/db';
import {
  expenses,
  expenseCategories,
  users,
  branches,
  notifications,
} from '../config/schema';
import {
  CreateExpenseInput,
  UpdateExpenseStatusInput,
  ListExpensesQuery,
} from '../validators/expenses.validator';

export const getExpenseCategories = async (tenantId: number) => {
  let categories = await db
    .select({
      id: expenseCategories.id,
      code: expenseCategories.code,
      name: expenseCategories.name,
      glAccountCode: expenseCategories.glAccountCode,
      requiresReceipt: expenseCategories.requiresReceipt,
      maxSingleLimit: expenseCategories.maxSingleLimit,
      taxDeductible: expenseCategories.taxDeductible,
      isActive: expenseCategories.isActive,
    })
    .from(expenseCategories)
    .where(and(eq(expenseCategories.tenantId, tenantId), eq(expenseCategories.isActive, true)))
    .orderBy(asc(expenseCategories.name));

  // If newly provisioned tenant has no categories, seed clean standard chart of accounts
  if (categories.length === 0) {
    const defaultCategories = [
      { code: 'MEALS_PER_DIEM', name: 'Staff Meal Allowances & Per Diem', glAccountCode: '6110', requiresReceipt: false, maxSingleLimit: '5000.00' },
      { code: 'LOCAL_TRANSPORT', name: 'Local Logistics & Rider Transport', glAccountCode: '6120', requiresReceipt: false, maxSingleLimit: '10000.00' },
      { code: 'UTILITIES_BILLS', name: 'Store Electricity, Gas & Water', glAccountCode: '6210', requiresReceipt: true, maxSingleLimit: '100000.00' },
      { code: 'KITCHEN_MAINTENANCE', name: 'Kitchen Hardware & Cold-Chain Repairs', glAccountCode: '6310', requiresReceipt: true, maxSingleLimit: '80000.00' },
      { code: 'CLEANING_SUPPLIES', name: 'Sanitation, Cleaning & Consumables', glAccountCode: '6410', requiresReceipt: true, maxSingleLimit: '25000.00' },
    ];

    categories = await db
      .insert(expenseCategories)
      .values(defaultCategories.map((c) => ({ ...c, tenantId, isActive: true })))
      .returning();
  }

  return categories;
};

export const getExpenseMetrics = async (tenantId: number, branchId?: number) => {
  const branchCondition = branchId ? eq(expenses.branchId, branchId) : undefined;

  const [metrics] = await db
    .select({
      totalExpensesCount: sql<number>`count(*)::int`,
      pendingApprovalCount: sql<number>`count(case when ${expenses.status} = 'SUBMITTED' then 1 end)::int`,
      pendingAmountKes: sql<number>`coalesce(sum(case when ${expenses.status} = 'SUBMITTED' then ${expenses.totalAmount} else 0 end), 0)::numeric`,
      approvedPendingDisbursementKes: sql<number>`coalesce(sum(case when ${expenses.status} = 'APPROVED' then ${expenses.totalAmount} else 0 end), 0)::numeric`,
      totalDisbursedPaidKes: sql<number>`coalesce(sum(case when ${expenses.status} = 'PAID_DISBURSED' then ${expenses.totalAmount} else 0 end), 0)::numeric`,
      rejectedCount: sql<number>`count(case when ${expenses.status} = 'REJECTED' then 1 end)::int`,
    })
    .from(expenses)
    .where(and(eq(expenses.tenantId, tenantId), branchCondition));

  return {
    totalExpensesCount: Number(metrics?.totalExpensesCount || 0),
    pendingApprovalCount: Number(metrics?.pendingApprovalCount || 0),
    pendingAmountKes: Number(metrics?.pendingAmountKes || 0),
    approvedPendingDisbursementKes: Number(metrics?.approvedPendingDisbursementKes || 0),
    totalDisbursedPaidKes: Number(metrics?.totalDisbursedPaidKes || 0),
    rejectedCount: Number(metrics?.rejectedCount || 0),
  };
};

export const listTenantExpenses = async (tenantId: number, query: ListExpensesQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(expenses.tenantId, tenantId),
    query.branchId ? eq(expenses.branchId, query.branchId) : undefined,
    query.categoryId ? eq(expenses.categoryId, query.categoryId) : undefined,
    query.claimantId ? eq(expenses.claimantId, query.claimantId) : undefined,
    query.status && query.status !== 'ALL' ? eq(expenses.status, query.status) : undefined,
    query.startDate ? gte(expenses.expenseDate, query.startDate) : undefined,
    query.endDate ? lte(expenses.expenseDate, query.endDate) : undefined,
    query.search
      ? or(
          ilike(expenses.voucherNumber, `%${query.search}%`),
          ilike(expenses.description, `%${query.search}%`),
          ilike(expenses.payeeName, `%${query.search}%`),
          ilike(expenses.receiptNumber, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(expenses)
      .where(and(...conditions)),
    db
      .select({
        id: expenses.id,
        voucherNumber: expenses.voucherNumber,
        expenseType: expenses.expenseType,
        expenseDate: expenses.expenseDate,
        amount: expenses.amount,
        taxAmount: expenses.taxAmount,
        totalAmount: expenses.totalAmount,
        currency: expenses.currency,
        paymentMethod: expenses.paymentMethod,
        merchantTaxPin: expenses.merchantTaxPin,
        receiptNumber: expenses.receiptNumber,
        receiptAttachmentUrl: expenses.receiptAttachmentUrl,
        description: expenses.description,
        status: expenses.status,
        rejectionReason: expenses.rejectionReason,
        paymentReference: expenses.paymentReference,
        paidAt: expenses.paidAt,
        approvedAt: expenses.approvedAt,
        createdAt: expenses.createdAt,
        categoryName: expenseCategories.name,
        categoryCode: expenseCategories.code,
        glAccountCode: expenseCategories.glAccountCode,
        claimantName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        claimantEmail: users.email,
        branchName: branches.name,
        approverName: sql<string | null>`(SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name)) FROM users u WHERE u.id = ${expenses.approvedByUserId})`,
      })
      .from(expenses)
      .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .leftJoin(users, eq(expenses.claimantId, users.id))
      .leftJoin(branches, eq(expenses.branchId, branches.id))
      .where(and(...conditions))
      .orderBy(desc(expenses.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return {
    expenses: rows.map((r) => ({
      ...r,
      amount: Number(r.amount),
      taxAmount: Number(r.taxAmount),
      totalAmount: Number(r.totalAmount),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const createExpenseRecord = async (
  tenantId: number,
  userId: number,
  input: CreateExpenseInput
) => {
  return await db.transaction(async (tx) => {
    // 1. Generate unique sequential voucher number (EXP-YYYY-XXXX)
    const currentYear = new Date().getFullYear();
    const [countResult] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(eq(expenses.tenantId, tenantId));

    const nextSeq = String((countResult?.count || 0) + 1).padStart(4, '0');
    const voucherNumber = `EXP-${currentYear}-${nextSeq}`;

    const totalAmount = (input.amount + (input.taxAmount || 0)).toFixed(2);

    const [created] = await tx
      .insert(expenses)
      .values({
        tenantId,
        branchId: input.branchId || null,
        categoryId: input.categoryId,
        voucherNumber,
        expenseType: input.expenseType,
        claimantId: userId,
        payeeName: input.payeeName || null,
        expenseDate: input.expenseDate,
        currency: 'KES',
        amount: input.amount.toFixed(2),
        taxAmount: (input.taxAmount || 0).toFixed(2),
        totalAmount,
        paymentMethod: input.paymentMethod,
        merchantTaxPin: input.merchantTaxPin || null,
        receiptNumber: input.receiptNumber || null,
        receiptAttachmentUrl: input.receiptAttachmentUrl || null,
        description: input.description,
        status: 'SUBMITTED',
      })
      .returning();

    // 2. Dispatch actionable notification for supervisor/manager review
    await tx.insert(notifications).values({
      tenantId,
      branchId: input.branchId || null,
      title: `Expense Approval Required: ${voucherNumber}`,
      detail: `Staff member submitted a claim for KES ${parseFloat(totalAmount).toLocaleString()} (${input.description.slice(0, 60)}...). Review required for payout.`,
      severity: 'WARNING',
      module: 'FINANCE',
      category: 'ACTION_REQUIRED',
      entityType: 'expenses',
      entityId: String(created.id),
      actionUrl: '/finance/expenses',
      actionPayload: {
        actionCode: 'APPROVE_EXPENSE_CLAIM',
        buttonLabel: 'Audit Expense',
      },
      isRead: false,
      isResolved: false,
    });

    return created;
  });
};

export const updateExpenseApprovalStatus = async (
  tenantId: number,
  supervisorId: number,
  expenseId: number,
  input: UpdateExpenseStatusInput
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, expenseId), eq(expenses.tenantId, tenantId)))
      .limit(1);

    if (!existing) throw new Error('Expense claim not found');

    const updateData: Record<string, any> = {
      status: input.status,
      updatedAt: new Date(),
    };

    if (input.status === 'APPROVED') {
      updateData.approvedByUserId = supervisorId;
      updateData.approvedAt = new Date();
      updateData.rejectionReason = null;
    } else if (input.status === 'REJECTED') {
      updateData.approvedByUserId = supervisorId;
      updateData.rejectionReason = input.rejectionReason || 'Claim declined by auditor.';
    } else if (input.status === 'PAID_DISBURSED') {
      updateData.paidAt = new Date();
      updateData.paymentReference = input.paymentReference || 'Disbursed via Treasury Clearing';
    }

    const [updated] = await tx
      .update(expenses)
      .set(updateData)
      .where(eq(expenses.id, expenseId))
      .returning();

    return updated;
  });
};