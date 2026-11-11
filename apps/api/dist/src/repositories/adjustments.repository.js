"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewAdjustmentVoucher = exports.createAdjustmentVoucher = exports.listTenantAdjustments = exports.getAdjustmentsMetrics = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getAdjustmentsMetrics = async (tenantId, branchId) => {
    const branchCondition = branchId ? (0, drizzle_orm_1.eq)(schema_1.financialAdjustments.branchId, branchId) : undefined;
    const [metrics] = await db_1.db
        .select({
        totalCount: (0, drizzle_orm_1.sql) `count(*)::int`,
        pendingCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.financialAdjustments.status} = 'PENDING_APPROVAL' then 1 end)::int`,
        pendingAmountKes: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.financialAdjustments.status} = 'PENDING_APPROVAL' then ${schema_1.financialAdjustments.amount} else 0 end), 0)::numeric`,
        approvedPostedKes: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.financialAdjustments.status} in ('APPROVED', 'POSTED') then ${schema_1.financialAdjustments.amount} else 0 end), 0)::numeric`,
        rejectedCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.financialAdjustments.status} = 'REJECTED' then 1 end)::int`,
        tillWriteOffsKes: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.financialAdjustments.adjustmentType} = 'TILL_VARIANCE_WRITE_OFF' and ${schema_1.financialAdjustments.status} in ('APPROVED', 'POSTED') then ${schema_1.financialAdjustments.amount} else 0 end), 0)::numeric`,
    })
        .from(schema_1.financialAdjustments)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.financialAdjustments.tenantId, tenantId), branchCondition));
    return {
        totalCount: Number(metrics?.totalCount || 0),
        pendingCount: Number(metrics?.pendingCount || 0),
        pendingAmountKes: Number(metrics?.pendingAmountKes || 0),
        approvedPostedKes: Number(metrics?.approvedPostedKes || 0),
        rejectedCount: Number(metrics?.rejectedCount || 0),
        tillWriteOffsKes: Number(metrics?.tillWriteOffsKes || 0),
    };
};
exports.getAdjustmentsMetrics = getAdjustmentsMetrics;
const listTenantAdjustments = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.financialAdjustments.tenantId, tenantId),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.financialAdjustments.branchId, query.branchId) : undefined,
        query.status && query.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.financialAdjustments.status, query.status) : undefined,
        query.adjustmentType && query.adjustmentType !== 'ALL'
            ? (0, drizzle_orm_1.eq)(schema_1.financialAdjustments.adjustmentType, query.adjustmentType)
            : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.financialAdjustments.adjustmentNumber, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.financialAdjustments.justificationNotes, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.financialAdjustments.reasonCode, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.financialAdjustments.debitGlAccount, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.financialAdjustments.creditGlAccount, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    // Define aliases for multiple joins to the users table
    const maker = (0, pg_core_1.alias)(schema_1.users, 'maker');
    const checker = (0, pg_core_1.alias)(schema_1.users, 'checker');
    const staff = (0, pg_core_1.alias)(schema_1.users, 'staff');
    const [countResult, rows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.financialAdjustments)
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            id: schema_1.financialAdjustments.id,
            adjustmentNumber: schema_1.financialAdjustments.adjustmentNumber,
            adjustmentType: schema_1.financialAdjustments.adjustmentType,
            amount: schema_1.financialAdjustments.amount,
            currency: schema_1.financialAdjustments.currency,
            adjustmentDirection: schema_1.financialAdjustments.adjustmentDirection,
            debitGlAccount: schema_1.financialAdjustments.debitGlAccount,
            creditGlAccount: schema_1.financialAdjustments.creditGlAccount,
            status: schema_1.financialAdjustments.status,
            reasonCode: schema_1.financialAdjustments.reasonCode,
            justificationNotes: schema_1.financialAdjustments.justificationNotes,
            supportingDocumentUrl: schema_1.financialAdjustments.supportingDocumentUrl,
            rejectionReason: schema_1.financialAdjustments.rejectionReason,
            shiftId: schema_1.financialAdjustments.shiftId,
            createdAt: schema_1.financialAdjustments.createdAt,
            approvedAt: schema_1.financialAdjustments.approvedAt,
            postedAt: schema_1.financialAdjustments.postedAt,
            branchName: schema_1.branches.name,
            createdByName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${maker.firstName}, ' ', ${maker.lastName}))`,
            createdByEmail: maker.email,
            approverName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${checker.firstName}, ' ', ${checker.lastName}))`,
            attributedStaffName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${staff.firstName}, ' ', ${staff.lastName}))`,
        })
            .from(schema_1.financialAdjustments)
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.financialAdjustments.branchId, schema_1.branches.id))
            .leftJoin(maker, (0, drizzle_orm_1.eq)(schema_1.financialAdjustments.createdById, maker.id))
            .leftJoin(checker, (0, drizzle_orm_1.eq)(schema_1.financialAdjustments.approvedByUserId, checker.id))
            .leftJoin(staff, (0, drizzle_orm_1.eq)(schema_1.financialAdjustments.attributedUserId, staff.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.financialAdjustments.createdAt))
            .limit(limit)
            .offset(offset),
    ]);
    const total = Number(countResult[0]?.count || 0);
    return {
        adjustments: rows.map((r) => ({
            ...r,
            amount: Number(r.amount),
        })),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
    };
};
exports.listTenantAdjustments = listTenantAdjustments;
const createAdjustmentVoucher = async (tenantId, userId, input) => {
    return await db_1.db.transaction(async (tx) => {
        // Generate sequential adjustment voucher number (ADJ-YYYY-XXXX)
        const currentYear = new Date().getFullYear();
        const [countResult] = await tx
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.financialAdjustments)
            .where((0, drizzle_orm_1.eq)(schema_1.financialAdjustments.tenantId, tenantId));
        const nextSeq = String((countResult?.count || 0) + 1).padStart(4, '0');
        const adjustmentNumber = `ADJ-${currentYear}-${nextSeq}`;
        const [created] = await tx
            .insert(schema_1.financialAdjustments)
            .values({
            tenantId,
            branchId: input.branchId || null,
            adjustmentNumber,
            adjustmentType: input.adjustmentType,
            shiftId: input.shiftId || null,
            attributedUserId: input.attributedUserId || null,
            createdById: userId,
            amount: input.amount.toFixed(2),
            currency: 'KES',
            adjustmentDirection: input.adjustmentDirection,
            debitGlAccount: input.debitGlAccount,
            creditGlAccount: input.creditGlAccount,
            reasonCode: input.reasonCode,
            justificationNotes: input.justificationNotes,
            supportingDocumentUrl: input.supportingDocumentUrl || null,
            status: 'PENDING_APPROVAL',
        })
            .returning();
        // Trigger Workday Maker-Checker actionable escalation notification
        await tx.insert(schema_1.notifications).values({
            tenantId,
            branchId: input.branchId || null,
            title: `Adjustment Approval Requested: ${adjustmentNumber}`,
            detail: `Operator proposed a ${input.adjustmentType.replace(/_/g, ' ')} of KES ${input.amount.toLocaleString()}. Two-person integrity sign-off required.`,
            severity: 'WARNING',
            module: 'FINANCE',
            category: 'ACTION_REQUIRED',
            entityType: 'financial_adjustments',
            entityId: String(created.id),
            actionUrl: '/finance/adjustments',
            actionPayload: {
                actionCode: 'APPROVE_FINANCIAL_ADJUSTMENT',
                buttonLabel: 'Review Adjustment',
            },
            isRead: false,
            isResolved: false,
        });
        return created;
    });
};
exports.createAdjustmentVoucher = createAdjustmentVoucher;
const reviewAdjustmentVoucher = async (tenantId, supervisorId, adjustmentId, input) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.financialAdjustments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.financialAdjustments.id, adjustmentId), (0, drizzle_orm_1.eq)(schema_1.financialAdjustments.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            throw new Error('Financial adjustment voucher not found');
        // Prevent maker from checking their own entry (Maker-Checker segregation of duties)
        if (existing.createdById === supervisorId) {
            throw new Error('Maker-Checker Violation: You cannot approve or post an adjustment you created.');
        }
        const updateData = {
            updatedAt: new Date(),
        };
        if (input.action === 'APPROVE') {
            updateData.status = 'APPROVED';
            updateData.approvedByUserId = supervisorId;
            updateData.approvedAt = new Date();
            updateData.rejectionReason = null;
        }
        else if (input.action === 'REJECT') {
            updateData.status = 'REJECTED';
            updateData.approvedByUserId = supervisorId;
            updateData.rejectionReason = input.rejectionReason || 'Declined by financial controller.';
        }
        else if (input.action === 'POST') {
            updateData.status = 'POSTED';
            updateData.postedAt = new Date();
        }
        const [updated] = await tx
            .update(schema_1.financialAdjustments)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.financialAdjustments.id, adjustmentId))
            .returning();
        return updated;
    });
};
exports.reviewAdjustmentVoucher = reviewAdjustmentVoucher;
