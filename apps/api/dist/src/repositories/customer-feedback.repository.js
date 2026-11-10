"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFeedbackStatus = exports.createFeedbackRecord = exports.listCustomerFeedbacks = exports.getFeedbackDashboardMetrics = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getFeedbackDashboardMetrics = async (tenantId, branchId) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.customerFeedback.tenantId, tenantId),
        branchId ? (0, drizzle_orm_1.eq)(schema_1.customerFeedback.branchId, branchId) : undefined,
    ].filter(Boolean);
    const [summary] = await db_1.db
        .select({
        totalSubmissions: (0, drizzle_orm_1.sql) `count(*)`,
        avgRating: (0, drizzle_orm_1.sql) `coalesce(avg(${schema_1.customerFeedback.rating}), 0)::numeric`,
        avgNpsScore: (0, drizzle_orm_1.sql) `coalesce(avg(${schema_1.customerFeedback.npsScore}), 0)::numeric`,
        pendingActions: (0, drizzle_orm_1.sql) `count(case when ${schema_1.customerFeedback.status} in ('NEW', 'UNDER_REVIEW') then 1 end)`,
        resolvedCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.customerFeedback.status} in ('ACTION_TAKEN', 'RESOLVED') then 1 end)`,
        positiveCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.customerFeedback.rating} >= 4 then 1 end)`,
        negativeCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.customerFeedback.rating} <= 2 then 1 end)`,
    })
        .from(schema_1.customerFeedback)
        .where((0, drizzle_orm_1.and)(...conditions));
    const total = Number(summary?.totalSubmissions || 0);
    const positive = Number(summary?.positiveCount || 0);
    const negative = Number(summary?.negativeCount || 0);
    // NPS formula: % Promoters (rating 4-5) - % Detractors (rating 1-2)
    const csatRate = total > 0 ? Math.round((positive / total) * 100) : 100;
    const npsIndex = total > 0 ? Math.round(((positive - negative) / total) * 100) : 0;
    // Category Distribution
    const categoryBreakdown = await db_1.db
        .select({
        category: schema_1.customerFeedback.feedbackCategory,
        count: (0, drizzle_orm_1.sql) `count(*)`,
        avgRating: (0, drizzle_orm_1.sql) `coalesce(avg(${schema_1.customerFeedback.rating}), 0)::numeric`,
    })
        .from(schema_1.customerFeedback)
        .where((0, drizzle_orm_1.and)(...conditions))
        .groupBy(schema_1.customerFeedback.feedbackCategory)
        .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `count(*)`));
    return {
        totalSubmissions: total,
        avgRating: Math.round(Number(summary?.avgRating || 0) * 10) / 10,
        csatRate,
        npsIndex,
        pendingActions: Number(summary?.pendingActions || 0),
        resolvedCount: Number(summary?.resolvedCount || 0),
        categoryBreakdown: categoryBreakdown.map((c) => ({
            category: c.category,
            count: Number(c.count),
            avgRating: Math.round(Number(c.avgRating) * 10) / 10,
        })),
    };
};
exports.getFeedbackDashboardMetrics = getFeedbackDashboardMetrics;
const listCustomerFeedbacks = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.customerFeedback.tenantId, tenantId),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.customerFeedback.branchId, query.branchId) : undefined,
        query.status && query.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.customerFeedback.status, query.status) : undefined,
        query.category && query.category !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.customerFeedback.feedbackCategory, query.category) : undefined,
        query.rating ? (0, drizzle_orm_1.eq)(schema_1.customerFeedback.rating, query.rating) : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.customerFeedback.title, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.customerFeedback.comments, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.name, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.phone, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    let orderByClause = (0, drizzle_orm_1.desc)(schema_1.customerFeedback.createdAt);
    if (query.sortBy === 'RATING') {
        orderByClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(schema_1.customerFeedback.rating) : (0, drizzle_orm_1.desc)(schema_1.customerFeedback.rating);
    }
    else if (query.sortBy === 'STATUS') {
        orderByClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(schema_1.customerFeedback.status) : (0, drizzle_orm_1.desc)(schema_1.customerFeedback.status);
    }
    const [countResult, feedbackRows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.customerFeedback)
            .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.customerFeedback.customerId, schema_1.customers.id))
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            id: schema_1.customerFeedback.id,
            title: schema_1.customerFeedback.title,
            comments: schema_1.customerFeedback.comments,
            rating: schema_1.customerFeedback.rating,
            npsScore: schema_1.customerFeedback.npsScore,
            sentiment: schema_1.customerFeedback.sentiment,
            feedbackCategory: schema_1.customerFeedback.feedbackCategory,
            channel: schema_1.customerFeedback.channel,
            status: schema_1.customerFeedback.status,
            actionTaken: schema_1.customerFeedback.actionTaken,
            resolvedAt: schema_1.customerFeedback.resolvedAt,
            createdAt: schema_1.customerFeedback.createdAt,
            customerId: schema_1.customers.id,
            customerName: schema_1.customers.name,
            customerPhone: schema_1.customers.phone,
            customerEmail: schema_1.customers.email,
            branchName: schema_1.branches.name,
            orderNumber: schema_1.orders.orderNumber,
            staffName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        })
            .from(schema_1.customerFeedback)
            .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.customerFeedback.customerId, schema_1.customers.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.customerFeedback.branchId, schema_1.branches.id))
            .leftJoin(schema_1.orders, (0, drizzle_orm_1.eq)(schema_1.customerFeedback.orderId, schema_1.orders.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.customerFeedback.staffId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset),
    ]);
    const total = Number(countResult[0]?.count || 0);
    return {
        feedback: feedbackRows.map((f) => ({
            ...f,
            staffName: f.staffName || 'General Staff',
            branchName: f.branchName || 'Main Location',
        })),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
    };
};
exports.listCustomerFeedbacks = listCustomerFeedbacks;
const createFeedbackRecord = async (tenantId, input) => {
    // Infer sentiment automatically
    let sentiment = 'NEUTRAL';
    if (input.rating >= 4)
        sentiment = 'POSITIVE';
    else if (input.rating <= 2)
        sentiment = 'NEGATIVE';
    const [record] = await db_1.db
        .insert(schema_1.customerFeedback)
        .values({
        tenantId,
        customerId: input.customerId,
        branchId: input.branchId || null,
        orderId: input.orderId || null,
        staffId: input.staffId || null,
        feedbackCategory: input.feedbackCategory,
        rating: input.rating,
        npsScore: input.npsScore ?? (input.rating * 2),
        sentiment,
        channel: input.channel,
        status: 'NEW',
        title: input.title,
        comments: input.comments,
    })
        .returning();
    return record;
};
exports.createFeedbackRecord = createFeedbackRecord;
const updateFeedbackStatus = async (tenantId, feedbackId, input) => {
    const isResolving = input.status === 'RESOLVED' || input.status === 'ACTION_TAKEN';
    const [updated] = await db_1.db
        .update(schema_1.customerFeedback)
        .set({
        status: input.status,
        actionTaken: input.actionTaken || undefined,
        assignedToUserId: input.assignedToUserId !== undefined ? input.assignedToUserId : undefined,
        resolvedAt: isResolving ? new Date() : undefined,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerFeedback.id, feedbackId), (0, drizzle_orm_1.eq)(schema_1.customerFeedback.tenantId, tenantId)))
        .returning();
    return updated || null;
};
exports.updateFeedbackStatus = updateFeedbackStatus;
