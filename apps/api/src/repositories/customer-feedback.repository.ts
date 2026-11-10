import { eq, and, desc, asc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  customerFeedback,
  customers,
  branches,
  users,
  orders,
} from '../config/schema';
import {
  CreateFeedbackInput,
  ListFeedbackQuery,
  UpdateFeedbackStatusInput,
} from '../validators/customer-feedback.validator';

export const getFeedbackDashboardMetrics = async (tenantId: number, branchId?: number) => {
  const conditions = [
    eq(customerFeedback.tenantId, tenantId),
    branchId ? eq(customerFeedback.branchId, branchId) : undefined,
  ].filter(Boolean);

  const [summary] = await db
    .select({
      totalSubmissions: sql<number>`count(*)`,
      avgRating: sql<number>`coalesce(avg(${customerFeedback.rating}), 0)::numeric`,
      avgNpsScore: sql<number>`coalesce(avg(${customerFeedback.npsScore}), 0)::numeric`,
      pendingActions: sql<number>`count(case when ${customerFeedback.status} in ('NEW', 'UNDER_REVIEW') then 1 end)`,
      resolvedCount: sql<number>`count(case when ${customerFeedback.status} in ('ACTION_TAKEN', 'RESOLVED') then 1 end)`,
      positiveCount: sql<number>`count(case when ${customerFeedback.rating} >= 4 then 1 end)`,
      negativeCount: sql<number>`count(case when ${customerFeedback.rating} <= 2 then 1 end)`,
    })
    .from(customerFeedback)
    .where(and(...conditions));

  const total = Number(summary?.totalSubmissions || 0);
  const positive = Number(summary?.positiveCount || 0);
  const negative = Number(summary?.negativeCount || 0);

  // NPS formula: % Promoters (rating 4-5) - % Detractors (rating 1-2)
  const csatRate = total > 0 ? Math.round((positive / total) * 100) : 100;
  const npsIndex = total > 0 ? Math.round(((positive - negative) / total) * 100) : 0;

  // Category Distribution
  const categoryBreakdown = await db
    .select({
      category: customerFeedback.feedbackCategory,
      count: sql<number>`count(*)`,
      avgRating: sql<number>`coalesce(avg(${customerFeedback.rating}), 0)::numeric`,
    })
    .from(customerFeedback)
    .where(and(...conditions))
    .groupBy(customerFeedback.feedbackCategory)
    .orderBy(desc(sql`count(*)`));

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

export const listCustomerFeedbacks = async (tenantId: number, query: ListFeedbackQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(customerFeedback.tenantId, tenantId),
    query.branchId ? eq(customerFeedback.branchId, query.branchId) : undefined,
    query.status && query.status !== 'ALL' ? eq(customerFeedback.status, query.status) : undefined,
    query.category && query.category !== 'ALL' ? eq(customerFeedback.feedbackCategory, query.category) : undefined,
    query.rating ? eq(customerFeedback.rating, query.rating) : undefined,
    query.search
      ? or(
          ilike(customerFeedback.title, `%${query.search}%`),
          ilike(customerFeedback.comments, `%${query.search}%`),
          ilike(customers.name, `%${query.search}%`),
          ilike(customers.phone, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  let orderByClause = desc(customerFeedback.createdAt);
  if (query.sortBy === 'RATING') {
    orderByClause = query.sortOrder === 'ASC' ? asc(customerFeedback.rating) : desc(customerFeedback.rating);
  } else if (query.sortBy === 'STATUS') {
    orderByClause = query.sortOrder === 'ASC' ? asc(customerFeedback.status) : desc(customerFeedback.status);
  }

  const [countResult, feedbackRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(customerFeedback)
      .innerJoin(customers, eq(customerFeedback.customerId, customers.id))
      .where(and(...conditions)),
    db
      .select({
        id: customerFeedback.id,
        title: customerFeedback.title,
        comments: customerFeedback.comments,
        rating: customerFeedback.rating,
        npsScore: customerFeedback.npsScore,
        sentiment: customerFeedback.sentiment,
        feedbackCategory: customerFeedback.feedbackCategory,
        channel: customerFeedback.channel,
        status: customerFeedback.status,
        actionTaken: customerFeedback.actionTaken,
        resolvedAt: customerFeedback.resolvedAt,
        createdAt: customerFeedback.createdAt,
        customerId: customers.id,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerEmail: customers.email,
        branchName: branches.name,
        orderNumber: orders.orderNumber,
        staffName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      })
      .from(customerFeedback)
      .innerJoin(customers, eq(customerFeedback.customerId, customers.id))
      .leftJoin(branches, eq(customerFeedback.branchId, branches.id))
      .leftJoin(orders, eq(customerFeedback.orderId, orders.id))
      .leftJoin(users, eq(customerFeedback.staffId, users.id))
      .where(and(...conditions))
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

export const createFeedbackRecord = async (tenantId: number, input: CreateFeedbackInput) => {
  // Infer sentiment automatically
  let sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = 'NEUTRAL';
  if (input.rating >= 4) sentiment = 'POSITIVE';
  else if (input.rating <= 2) sentiment = 'NEGATIVE';

  const [record] = await db
    .insert(customerFeedback)
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

export const updateFeedbackStatus = async (
  tenantId: number,
  feedbackId: number,
  input: UpdateFeedbackStatusInput
) => {
  const isResolving = input.status === 'RESOLVED' || input.status === 'ACTION_TAKEN';

  const [updated] = await db
    .update(customerFeedback)
    .set({
      status: input.status,
      actionTaken: input.actionTaken || undefined,
      assignedToUserId: input.assignedToUserId !== undefined ? input.assignedToUserId : undefined,
      resolvedAt: isResolving ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(customerFeedback.id, feedbackId), eq(customerFeedback.tenantId, tenantId)))
    .returning();

  return updated || null;
};