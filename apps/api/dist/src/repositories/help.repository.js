"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHelpDeskTelemetry = exports.getKbArticleBySlug = exports.listKbArticles = exports.updateTicketStatus = exports.addTicketMessage = exports.createTicket = exports.getTicketDetails = exports.listTickets = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listTickets = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 15;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.supportTickets.tenantId, tenantId),
        query.status && query.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.supportTickets.status, query.status) : undefined,
        query.priority && query.priority !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.supportTickets.priority, query.priority) : undefined,
        query.category && query.category !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.supportTickets.category, query.category) : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.supportTickets.ticketNumber, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.supportTickets.subject, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.supportTickets.description, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    const [countResult, tickets] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.supportTickets)
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            id: schema_1.supportTickets.id,
            tenantId: schema_1.supportTickets.tenantId,
            branchId: schema_1.supportTickets.branchId,
            branchName: schema_1.branches.name,
            branchCode: schema_1.branches.code,
            userId: schema_1.supportTickets.userId,
            creatorName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            creatorEmail: schema_1.users.email,
            ticketNumber: schema_1.supportTickets.ticketNumber,
            subject: schema_1.supportTickets.subject,
            category: schema_1.supportTickets.category,
            priority: schema_1.supportTickets.priority,
            status: schema_1.supportTickets.status,
            description: schema_1.supportTickets.description,
            assignedAgent: schema_1.supportTickets.assignedAgent,
            resolvedAt: schema_1.supportTickets.resolvedAt,
            createdAt: schema_1.supportTickets.createdAt,
            updatedAt: schema_1.supportTickets.updatedAt,
        })
            .from(schema_1.supportTickets)
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.supportTickets.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.supportTickets.userId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.supportTickets.createdAt))
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
exports.listTickets = listTickets;
const getTicketDetails = async (tenantId, ticketId) => {
    const [ticket] = await db_1.db
        .select({
        id: schema_1.supportTickets.id,
        tenantId: schema_1.supportTickets.tenantId,
        branchId: schema_1.supportTickets.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        userId: schema_1.supportTickets.userId,
        creatorName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        creatorEmail: schema_1.users.email,
        ticketNumber: schema_1.supportTickets.ticketNumber,
        subject: schema_1.supportTickets.subject,
        category: schema_1.supportTickets.category,
        priority: schema_1.supportTickets.priority,
        status: schema_1.supportTickets.status,
        description: schema_1.supportTickets.description,
        diagnosticsPayload: schema_1.supportTickets.diagnosticsPayload,
        assignedAgent: schema_1.supportTickets.assignedAgent,
        resolvedAt: schema_1.supportTickets.resolvedAt,
        createdAt: schema_1.supportTickets.createdAt,
        updatedAt: schema_1.supportTickets.updatedAt,
    })
        .from(schema_1.supportTickets)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.supportTickets.branchId, schema_1.branches.id))
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.supportTickets.userId, schema_1.users.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supportTickets.id, ticketId), (0, drizzle_orm_1.eq)(schema_1.supportTickets.tenantId, tenantId)))
        .limit(1);
    if (!ticket)
        return null;
    const messages = await db_1.db
        .select({
        id: schema_1.supportTicketMessages.id,
        userId: schema_1.supportTicketMessages.userId,
        isStaffReply: schema_1.supportTicketMessages.isStaffReply,
        senderName: schema_1.supportTicketMessages.senderName,
        message: schema_1.supportTicketMessages.message,
        attachments: schema_1.supportTicketMessages.attachments,
        createdAt: schema_1.supportTicketMessages.createdAt,
    })
        .from(schema_1.supportTicketMessages)
        .where((0, drizzle_orm_1.eq)(schema_1.supportTicketMessages.ticketId, ticketId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.supportTicketMessages.createdAt));
    return {
        ...ticket,
        messages,
    };
};
exports.getTicketDetails = getTicketDetails;
const createTicket = async (tenantId, userId, input) => {
    const ticketNumber = `TCK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const [created] = await db_1.db
        .insert(schema_1.supportTickets)
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
    const [user] = await db_1.db
        .select({ firstName: schema_1.users.firstName, lastName: schema_1.users.lastName })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
        .limit(1);
    const senderName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Operator';
    // Seed initial description as the first thread message
    await db_1.db.insert(schema_1.supportTicketMessages).values({
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
exports.createTicket = createTicket;
const addTicketMessage = async (tenantId, ticketId, userId, input) => {
    const [ticket] = await db_1.db
        .select({ id: schema_1.supportTickets.id })
        .from(schema_1.supportTickets)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supportTickets.id, ticketId), (0, drizzle_orm_1.eq)(schema_1.supportTickets.tenantId, tenantId)))
        .limit(1);
    if (!ticket) {
        throw new Error('Support ticket not found.');
    }
    const [user] = await db_1.db
        .select({ firstName: schema_1.users.firstName, lastName: schema_1.users.lastName })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
        .limit(1);
    const senderName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Staff Member';
    const [message] = await db_1.db
        .insert(schema_1.supportTicketMessages)
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
    await db_1.db
        .update(schema_1.supportTickets)
        .set({
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.supportTickets.id, ticketId));
    return message;
};
exports.addTicketMessage = addTicketMessage;
const updateTicketStatus = async (tenantId, ticketId, status) => {
    const [updated] = await db_1.db
        .update(schema_1.supportTickets)
        .set({
        status,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supportTickets.id, ticketId), (0, drizzle_orm_1.eq)(schema_1.supportTickets.tenantId, tenantId)))
        .returning();
    if (!updated) {
        throw new Error('Support ticket not found.');
    }
    return updated;
};
exports.updateTicketStatus = updateTicketStatus;
const listKbArticles = async (tenantId, query) => {
    const conditions = [
        (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.knowledgeBaseArticles.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.knowledgeBaseArticles.tenantId} IS NULL`),
        (0, drizzle_orm_1.eq)(schema_1.knowledgeBaseArticles.isPublished, true),
        query.category && query.category !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.knowledgeBaseArticles.category, query.category) : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.knowledgeBaseArticles.title, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.knowledgeBaseArticles.summary, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.knowledgeBaseArticles.content, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    const articles = await db_1.db
        .select({
        id: schema_1.knowledgeBaseArticles.id,
        slug: schema_1.knowledgeBaseArticles.slug,
        title: schema_1.knowledgeBaseArticles.title,
        category: schema_1.knowledgeBaseArticles.category,
        summary: schema_1.knowledgeBaseArticles.summary,
        readTimeMinutes: schema_1.knowledgeBaseArticles.readTimeMinutes,
        viewCount: schema_1.knowledgeBaseArticles.viewCount,
        updatedAt: schema_1.knowledgeBaseArticles.updatedAt,
    })
        .from(schema_1.knowledgeBaseArticles)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.knowledgeBaseArticles.viewCount), (0, drizzle_orm_1.asc)(schema_1.knowledgeBaseArticles.title));
    return articles;
};
exports.listKbArticles = listKbArticles;
const getKbArticleBySlug = async (slug) => {
    const [article] = await db_1.db
        .select()
        .from(schema_1.knowledgeBaseArticles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.knowledgeBaseArticles.slug, slug), (0, drizzle_orm_1.eq)(schema_1.knowledgeBaseArticles.isPublished, true)))
        .limit(1);
    if (article) {
        await db_1.db
            .update(schema_1.knowledgeBaseArticles)
            .set({ viewCount: article.viewCount + 1 })
            .where((0, drizzle_orm_1.eq)(schema_1.knowledgeBaseArticles.id, article.id));
    }
    return article || null;
};
exports.getKbArticleBySlug = getKbArticleBySlug;
const getHelpDeskTelemetry = async (tenantId) => {
    const [ticketMetrics, kbMetrics] = await Promise.all([
        db_1.db
            .select({
            total: (0, drizzle_orm_1.sql) `count(*)`,
            open: (0, drizzle_orm_1.sql) `count(case when ${schema_1.supportTickets.status} = 'OPEN' then 1 end)`,
            inProgress: (0, drizzle_orm_1.sql) `count(case when ${schema_1.supportTickets.status} = 'IN_PROGRESS' then 1 end)`,
            resolved: (0, drizzle_orm_1.sql) `count(case when ${schema_1.supportTickets.status} IN ('RESOLVED', 'CLOSED') then 1 end)`,
            critical: (0, drizzle_orm_1.sql) `count(case when ${schema_1.supportTickets.priority} = 'CRITICAL' and ${schema_1.supportTickets.status} NOT IN ('RESOLVED', 'CLOSED') then 1 end)`,
        })
            .from(schema_1.supportTickets)
            .where((0, drizzle_orm_1.eq)(schema_1.supportTickets.tenantId, tenantId)),
        db_1.db
            .select({
            articleCount: (0, drizzle_orm_1.sql) `count(*)`,
        })
            .from(schema_1.knowledgeBaseArticles)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.knowledgeBaseArticles.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.knowledgeBaseArticles.tenantId} IS NULL`)),
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
exports.getHelpDeskTelemetry = getHelpDeskTelemetry;
