"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExpenseApprovalStatus = exports.createExpenseRecord = exports.listTenantExpenses = exports.getExpenseMetrics = exports.getExpenseCategories = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getExpenseCategories = async (tenantId) => {
    let categories = await db_1.db
        .select({
        id: schema_1.expenseCategories.id,
        code: schema_1.expenseCategories.code,
        name: schema_1.expenseCategories.name,
        glAccountCode: schema_1.expenseCategories.glAccountCode,
        requiresReceipt: schema_1.expenseCategories.requiresReceipt,
        maxSingleLimit: schema_1.expenseCategories.maxSingleLimit,
        taxDeductible: schema_1.expenseCategories.taxDeductible,
        isActive: schema_1.expenseCategories.isActive,
    })
        .from(schema_1.expenseCategories)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.expenseCategories.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.expenseCategories.isActive, true)))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.expenseCategories.name));
    // If newly provisioned tenant has no categories, seed clean standard chart of accounts
    if (categories.length === 0) {
        const defaultCategories = [
            { code: 'MEALS_PER_DIEM', name: 'Staff Meal Allowances & Per Diem', glAccountCode: '6110', requiresReceipt: false, maxSingleLimit: '5000.00' },
            { code: 'LOCAL_TRANSPORT', name: 'Local Logistics & Rider Transport', glAccountCode: '6120', requiresReceipt: false, maxSingleLimit: '10000.00' },
            { code: 'UTILITIES_BILLS', name: 'Store Electricity, Gas & Water', glAccountCode: '6210', requiresReceipt: true, maxSingleLimit: '100000.00' },
            { code: 'KITCHEN_MAINTENANCE', name: 'Kitchen Hardware & Cold-Chain Repairs', glAccountCode: '6310', requiresReceipt: true, maxSingleLimit: '80000.00' },
            { code: 'CLEANING_SUPPLIES', name: 'Sanitation, Cleaning & Consumables', glAccountCode: '6410', requiresReceipt: true, maxSingleLimit: '25000.00' },
        ];
        categories = await db_1.db
            .insert(schema_1.expenseCategories)
            .values(defaultCategories.map((c) => ({ ...c, tenantId, isActive: true })))
            .returning();
    }
    return categories;
};
exports.getExpenseCategories = getExpenseCategories;
const getExpenseMetrics = async (tenantId, branchId) => {
    const branchCondition = branchId ? (0, drizzle_orm_1.eq)(schema_1.expenses.branchId, branchId) : undefined;
    const [metrics] = await db_1.db
        .select({
        totalExpensesCount: (0, drizzle_orm_1.sql) `count(*)::int`,
        pendingApprovalCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.expenses.status} = 'SUBMITTED' then 1 end)::int`,
        pendingAmountKes: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.expenses.status} = 'SUBMITTED' then ${schema_1.expenses.totalAmount} else 0 end), 0)::numeric`,
        approvedPendingDisbursementKes: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.expenses.status} = 'APPROVED' then ${schema_1.expenses.totalAmount} else 0 end), 0)::numeric`,
        totalDisbursedPaidKes: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.expenses.status} = 'PAID_DISBURSED' then ${schema_1.expenses.totalAmount} else 0 end), 0)::numeric`,
        rejectedCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.expenses.status} = 'REJECTED' then 1 end)::int`,
    })
        .from(schema_1.expenses)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.expenses.tenantId, tenantId), branchCondition));
    return {
        totalExpensesCount: Number(metrics?.totalExpensesCount || 0),
        pendingApprovalCount: Number(metrics?.pendingApprovalCount || 0),
        pendingAmountKes: Number(metrics?.pendingAmountKes || 0),
        approvedPendingDisbursementKes: Number(metrics?.approvedPendingDisbursementKes || 0),
        totalDisbursedPaidKes: Number(metrics?.totalDisbursedPaidKes || 0),
        rejectedCount: Number(metrics?.rejectedCount || 0),
    };
};
exports.getExpenseMetrics = getExpenseMetrics;
const listTenantExpenses = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.expenses.tenantId, tenantId),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.expenses.branchId, query.branchId) : undefined,
        query.categoryId ? (0, drizzle_orm_1.eq)(schema_1.expenses.categoryId, query.categoryId) : undefined,
        query.claimantId ? (0, drizzle_orm_1.eq)(schema_1.expenses.claimantId, query.claimantId) : undefined,
        query.status && query.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.expenses.status, query.status) : undefined,
        query.startDate ? (0, drizzle_orm_1.gte)(schema_1.expenses.expenseDate, query.startDate) : undefined,
        query.endDate ? (0, drizzle_orm_1.lte)(schema_1.expenses.expenseDate, query.endDate) : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.expenses.voucherNumber, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.expenses.description, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.expenses.payeeName, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.expenses.receiptNumber, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    const [countResult, rows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.expenses)
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            id: schema_1.expenses.id,
            voucherNumber: schema_1.expenses.voucherNumber,
            expenseType: schema_1.expenses.expenseType,
            expenseDate: schema_1.expenses.expenseDate,
            amount: schema_1.expenses.amount,
            taxAmount: schema_1.expenses.taxAmount,
            totalAmount: schema_1.expenses.totalAmount,
            currency: schema_1.expenses.currency,
            paymentMethod: schema_1.expenses.paymentMethod,
            merchantTaxPin: schema_1.expenses.merchantTaxPin,
            receiptNumber: schema_1.expenses.receiptNumber,
            receiptAttachmentUrl: schema_1.expenses.receiptAttachmentUrl,
            description: schema_1.expenses.description,
            status: schema_1.expenses.status,
            rejectionReason: schema_1.expenses.rejectionReason,
            paymentReference: schema_1.expenses.paymentReference,
            paidAt: schema_1.expenses.paidAt,
            approvedAt: schema_1.expenses.approvedAt,
            createdAt: schema_1.expenses.createdAt,
            categoryName: schema_1.expenseCategories.name,
            categoryCode: schema_1.expenseCategories.code,
            glAccountCode: schema_1.expenseCategories.glAccountCode,
            claimantName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            claimantEmail: schema_1.users.email,
            branchName: schema_1.branches.name,
            approverName: (0, drizzle_orm_1.sql) `(SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name)) FROM users u WHERE u.id = ${schema_1.expenses.approvedByUserId})`,
        })
            .from(schema_1.expenses)
            .leftJoin(schema_1.expenseCategories, (0, drizzle_orm_1.eq)(schema_1.expenses.categoryId, schema_1.expenseCategories.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.expenses.claimantId, schema_1.users.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.expenses.branchId, schema_1.branches.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.expenses.createdAt))
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
exports.listTenantExpenses = listTenantExpenses;
const createExpenseRecord = async (tenantId, userId, input) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Generate unique sequential voucher number (EXP-YYYY-XXXX)
        const currentYear = new Date().getFullYear();
        const [countResult] = await tx
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.expenses)
            .where((0, drizzle_orm_1.eq)(schema_1.expenses.tenantId, tenantId));
        const nextSeq = String((countResult?.count || 0) + 1).padStart(4, '0');
        const voucherNumber = `EXP-${currentYear}-${nextSeq}`;
        const totalAmount = (input.amount + (input.taxAmount || 0)).toFixed(2);
        const [created] = await tx
            .insert(schema_1.expenses)
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
        await tx.insert(schema_1.notifications).values({
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
exports.createExpenseRecord = createExpenseRecord;
const updateExpenseApprovalStatus = async (tenantId, supervisorId, expenseId, input) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.expenses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.expenses.id, expenseId), (0, drizzle_orm_1.eq)(schema_1.expenses.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            throw new Error('Expense claim not found');
        const updateData = {
            status: input.status,
            updatedAt: new Date(),
        };
        if (input.status === 'APPROVED') {
            updateData.approvedByUserId = supervisorId;
            updateData.approvedAt = new Date();
            updateData.rejectionReason = null;
        }
        else if (input.status === 'REJECTED') {
            updateData.approvedByUserId = supervisorId;
            updateData.rejectionReason = input.rejectionReason || 'Claim declined by auditor.';
        }
        else if (input.status === 'PAID_DISBURSED') {
            updateData.paidAt = new Date();
            updateData.paymentReference = input.paymentReference || 'Disbursed via Treasury Clearing';
        }
        const [updated] = await tx
            .update(schema_1.expenses)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.expenses.id, expenseId))
            .returning();
        return updated;
    });
};
exports.updateExpenseApprovalStatus = updateExpenseApprovalStatus;
