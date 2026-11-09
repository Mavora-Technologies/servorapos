import { eq, and, desc, asc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  supportTickets,
  supportTicketMessages,
  knowledgeBaseArticles,
  users,
  branches,
} from '../config/schema';
import {
  CreateTicketInput,
  AddTicketMessageInput,
  ListTicketsQuery,
  ListKbQuery,
} from '../validators/help.validator';

export const listTickets = async (tenantId: number, query: ListTicketsQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 15;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(supportTickets.tenantId, tenantId),
    query.status && query.status !== 'ALL' ? eq(supportTickets.status, query.status) : undefined,
    query.priority && query.priority !== 'ALL' ? eq(supportTickets.priority, query.priority) : undefined,
    query.category && query.category !== 'ALL' ? eq(supportTickets.category, query.category) : undefined,
    query.search
      ? or(
          ilike(supportTickets.ticketNumber, `%${query.search}%`),
          ilike(supportTickets.subject, `%${query.search}%`),
          ilike(supportTickets.description, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  const [countResult, tickets] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(supportTickets)
      .where(and(...conditions)),
    db
      .select({
        id: supportTickets.id,
        tenantId: supportTickets.tenantId,
        branchId: supportTickets.branchId,
        branchName: branches.name,
        branchCode: branches.code,
        userId: supportTickets.userId,
        creatorName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        creatorEmail: users.email,
        ticketNumber: supportTickets.ticketNumber,
        subject: supportTickets.subject,
        category: supportTickets.category,
        priority: supportTickets.priority,
        status: supportTickets.status,
        description: supportTickets.description,
        assignedAgent: supportTickets.assignedAgent,
        resolvedAt: supportTickets.resolvedAt,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
      })
      .from(supportTickets)
      .leftJoin(branches, eq(supportTickets.branchId, branches.id))
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(supportTickets.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return {
    tickets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getTicketDetails = async (tenantId: number, ticketId: number) => {
  const [ticket] = await db
    .select({
      id: supportTickets.id,
      tenantId: supportTickets.tenantId,
      branchId: supportTickets.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      userId: supportTickets.userId,
      creatorName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      creatorEmail: users.email,
      ticketNumber: supportTickets.ticketNumber,
      subject: supportTickets.subject,
      category: supportTickets.category,
      priority: supportTickets.priority,
      status: supportTickets.status,
      description: supportTickets.description,
      diagnosticsPayload: supportTickets.diagnosticsPayload,
      assignedAgent: supportTickets.assignedAgent,
      resolvedAt: supportTickets.resolvedAt,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
    })
    .from(supportTickets)
    .leftJoin(branches, eq(supportTickets.branchId, branches.id))
    .leftJoin(users, eq(supportTickets.userId, users.id))
    .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.tenantId, tenantId)))
    .limit(1);

  if (!ticket) return null;

  const messages = await db
    .select({
      id: supportTicketMessages.id,
      userId: supportTicketMessages.userId,
      isStaffReply: supportTicketMessages.isStaffReply,
      senderName: supportTicketMessages.senderName,
      message: supportTicketMessages.message,
      attachments: supportTicketMessages.attachments,
      createdAt: supportTicketMessages.createdAt,
    })
    .from(supportTicketMessages)
    .where(eq(supportTicketMessages.ticketId, ticketId))
    .orderBy(asc(supportTicketMessages.createdAt));

  return {
    ...ticket,
    messages,
  };
};

export const createTicket = async (tenantId: number, userId: number, input: CreateTicketInput) => {
  const ticketNumber = `TCK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const [created] = await db
    .insert(supportTickets)
    .values({
      tenantId,
      branchId: input.branchId || null,
      userId,
      ticketNumber,
      subject: input.subject,
      category: input.category,
      priority: input.priority,
      status: 'OPEN',
      description: input.description,
      diagnosticsPayload: input.diagnosticsPayload || null,
    })
    .returning();

  const [user] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const senderName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Operator';

  // Seed initial description as the first thread message
  await db.insert(supportTicketMessages).values({
    tenantId,
    ticketId: created.id,
    userId,
    isStaffReply: false,
    senderName,
    message: input.description,
    attachments: [],
  });

  return created;
};

export const addTicketMessage = async (
  tenantId: number,
  ticketId: number,
  userId: number,
  input: AddTicketMessageInput
) => {
  const [ticket] = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.tenantId, tenantId)))
    .limit(1);

  if (!ticket) {
    throw new Error('Support ticket not found.');
  }

  const [user] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const senderName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Staff Member';

  const [message] = await db
    .insert(supportTicketMessages)
    .values({
      tenantId,
      ticketId,
      userId,
      isStaffReply: false,
      senderName,
      message: input.message,
      attachments: input.attachments,
    })
    .returning();

  await db
    .update(supportTickets)
    .set({
      status: 'IN_PROGRESS',
      updatedAt: new Date(),
    })
    .where(eq(supportTickets.id, ticketId));

  return message;
};

export const updateTicketStatus = async (
  tenantId: number,
  ticketId: number,
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED'
) => {
  const [updated] = await db
    .update(supportTickets)
    .set({
      status,
      resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.tenantId, tenantId)))
    .returning();

  if (!updated) {
    throw new Error('Support ticket not found.');
  }

  return updated;
};

export const listKbArticles = async (tenantId: number, query: ListKbQuery) => {
  const conditions = [
    or(eq(knowledgeBaseArticles.tenantId, tenantId), sql`${knowledgeBaseArticles.tenantId} IS NULL`),
    eq(knowledgeBaseArticles.isPublished, true),
    query.category && query.category !== 'ALL' ? eq(knowledgeBaseArticles.category, query.category) : undefined,
    query.search
      ? or(
          ilike(knowledgeBaseArticles.title, `%${query.search}%`),
          ilike(knowledgeBaseArticles.summary, `%${query.search}%`),
          ilike(knowledgeBaseArticles.content, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  const articles = await db
    .select({
      id: knowledgeBaseArticles.id,
      slug: knowledgeBaseArticles.slug,
      title: knowledgeBaseArticles.title,
      category: knowledgeBaseArticles.category,
      summary: knowledgeBaseArticles.summary,
      readTimeMinutes: knowledgeBaseArticles.readTimeMinutes,
      viewCount: knowledgeBaseArticles.viewCount,
      updatedAt: knowledgeBaseArticles.updatedAt,
    })
    .from(knowledgeBaseArticles)
    .where(and(...conditions))
    .orderBy(desc(knowledgeBaseArticles.viewCount), asc(knowledgeBaseArticles.title));

  return articles;
};

export const getKbArticleBySlug = async (slug: string) => {
  const [article] = await db
    .select()
    .from(knowledgeBaseArticles)
    .where(and(eq(knowledgeBaseArticles.slug, slug), eq(knowledgeBaseArticles.isPublished, true)))
    .limit(1);

  if (article) {
    await db
      .update(knowledgeBaseArticles)
      .set({ viewCount: article.viewCount + 1 })
      .where(eq(knowledgeBaseArticles.id, article.id));
  }

  return article || null;
};

export const getHelpDeskTelemetry = async (tenantId: number) => {
  const [ticketMetrics, kbMetrics] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`,
        open: sql<number>`count(case when ${supportTickets.status} = 'OPEN' then 1 end)`,
        inProgress: sql<number>`count(case when ${supportTickets.status} = 'IN_PROGRESS' then 1 end)`,
        resolved: sql<number>`count(case when ${supportTickets.status} IN ('RESOLVED', 'CLOSED') then 1 end)`,
        critical: sql<number>`count(case when ${supportTickets.priority} = 'CRITICAL' and ${supportTickets.status} NOT IN ('RESOLVED', 'CLOSED') then 1 end)`,
      })
      .from(supportTickets)
      .where(eq(supportTickets.tenantId, tenantId)),
    db
      .select({
        articleCount: sql<number>`count(*)`,
      })
      .from(knowledgeBaseArticles)
      .where(or(eq(knowledgeBaseArticles.tenantId, tenantId), sql`${knowledgeBaseArticles.tenantId} IS NULL`)),
  ]);

  const total = Number(ticketMetrics[0]?.total || 0);
  const resolved = Number(ticketMetrics[0]?.resolved || 0);
  const resolutionRatePercent = total > 0 ? Math.round((resolved / total) * 100) : 100;

  return {
    totalTickets: total,
    openTickets: Number(ticketMetrics[0]?.open || 0),
    inProgressTickets: Number(ticketMetrics[0]?.inProgress || 0),
    resolvedTickets: resolved,
    criticalIncidents: Number(ticketMetrics[0]?.critical || 0),
    resolutionRatePercent,
    knowledgeArticlesCount: Number(kbMetrics[0]?.articleCount || 0),
  };
};