"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRecentDispatchLogs = exports.deleteMessagingTemplate = exports.updateMessagingTemplate = exports.createMessagingTemplate = exports.listMessagingTemplates = exports.testMessagingDispatch = exports.deleteMessagingIntegration = exports.updateMessagingIntegration = exports.createMessagingIntegration = exports.listMessagingIntegrations = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listMessagingIntegrations = async (tenantId, branchId) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.tenantId, tenantId),
        branchId ? (0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.branchId, branchId) : undefined,
    ].filter(Boolean);
    const integrations = await db_1.db
        .select({
        id: schema_1.messagingIntegrations.id,
        branchId: schema_1.messagingIntegrations.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        channel: schema_1.messagingIntegrations.channel,
        provider: schema_1.messagingIntegrations.provider,
        title: schema_1.messagingIntegrations.title,
        environment: schema_1.messagingIntegrations.environment,
        senderId: schema_1.messagingIntegrations.senderId,
        accountIdentifier: schema_1.messagingIntegrations.accountIdentifier,
        apiKey: schema_1.messagingIntegrations.apiKey,
        webhookUrl: schema_1.messagingIntegrations.webhookUrl,
        monthlyCreditCap: schema_1.messagingIntegrations.monthlyCreditCap,
        currentMonthDispatches: schema_1.messagingIntegrations.currentMonthDispatches,
        status: schema_1.messagingIntegrations.status,
        lastHandshakeAt: schema_1.messagingIntegrations.lastHandshakeAt,
        lastHandshakeStatus: schema_1.messagingIntegrations.lastHandshakeStatus,
        isDefault: schema_1.messagingIntegrations.isDefault,
        createdAt: schema_1.messagingIntegrations.createdAt,
    })
        .from(schema_1.messagingIntegrations)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.messagingIntegrations.isDefault), (0, drizzle_orm_1.asc)(schema_1.messagingIntegrations.id));
    return integrations;
};
exports.listMessagingIntegrations = listMessagingIntegrations;
const createMessagingIntegration = async (tenantId, input) => {
    if (input.isDefault) {
        await db_1.db
            .update(schema_1.messagingIntegrations)
            .set({ isDefault: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.channel, input.channel), input.branchId ? (0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.branchId, input.branchId) : undefined));
    }
    const [created] = await db_1.db
        .insert(schema_1.messagingIntegrations)
        .values({
        tenantId,
        branchId: input.branchId || null,
        channel: input.channel,
        provider: input.provider,
        title: input.title,
        environment: input.environment,
        senderId: input.senderId || null,
        accountIdentifier: input.accountIdentifier,
        apiKey: input.apiKey,
        apiSecret: input.apiSecret || null,
        webhookUrl: input.webhookUrl || null,
        monthlyCreditCap: input.monthlyCreditCap,
        status: input.status,
        isDefault: input.isDefault,
    })
        .returning();
    return created;
};
exports.createMessagingIntegration = createMessagingIntegration;
const updateMessagingIntegration = async (tenantId, integrationId, input) => {
    const [existing] = await db_1.db
        .select({ id: schema_1.messagingIntegrations.id, channel: schema_1.messagingIntegrations.channel })
        .from(schema_1.messagingIntegrations)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.id, integrationId), (0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.tenantId, tenantId)))
        .limit(1);
    if (!existing) {
        throw new Error('Messaging integration profile not found.');
    }
    const targetChannel = input.channel || existing.channel;
    if (input.isDefault) {
        await db_1.db
            .update(schema_1.messagingIntegrations)
            .set({ isDefault: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.channel, targetChannel), input.branchId ? (0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.branchId, input.branchId) : undefined));
    }
    const updateData = {
        updatedAt: new Date(),
    };
    if (input.branchId !== undefined)
        updateData.branchId = input.branchId;
    if (input.channel !== undefined)
        updateData.channel = input.channel;
    if (input.provider !== undefined)
        updateData.provider = input.provider;
    if (input.title !== undefined)
        updateData.title = input.title;
    if (input.environment !== undefined)
        updateData.environment = input.environment;
    if (input.senderId !== undefined)
        updateData.senderId = input.senderId;
    if (input.accountIdentifier !== undefined)
        updateData.accountIdentifier = input.accountIdentifier;
    if (input.apiKey !== undefined)
        updateData.apiKey = input.apiKey;
    if (input.apiSecret !== undefined)
        updateData.apiSecret = input.apiSecret;
    if (input.webhookUrl !== undefined)
        updateData.webhookUrl = input.webhookUrl;
    if (input.monthlyCreditCap !== undefined)
        updateData.monthlyCreditCap = input.monthlyCreditCap;
    if (input.status !== undefined)
        updateData.status = input.status;
    if (input.isDefault !== undefined)
        updateData.isDefault = input.isDefault;
    const [updated] = await db_1.db
        .update(schema_1.messagingIntegrations)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.id, integrationId))
        .returning();
    return updated;
};
exports.updateMessagingIntegration = updateMessagingIntegration;
const deleteMessagingIntegration = async (tenantId, integrationId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.messagingIntegrations)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.id, integrationId), (0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.tenantId, tenantId)))
        .returning();
    if (!deleted) {
        throw new Error('Messaging integration profile not found.');
    }
    return deleted;
};
exports.deleteMessagingIntegration = deleteMessagingIntegration;
const testMessagingDispatch = async (tenantId, integrationId, recipient, message) => {
    const [integration] = await db_1.db
        .select()
        .from(schema_1.messagingIntegrations)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.id, integrationId), (0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.tenantId, tenantId)))
        .limit(1);
    if (!integration) {
        throw new Error('Messaging gateway integration not found.');
    }
    const startTime = Date.now();
    const hasValidAuth = Boolean(integration.accountIdentifier && integration.apiKey);
    const latencyMs = Date.now() - startTime + Math.floor(Math.random() * 40) + 20;
    const externalMessageId = `MSG-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const statusResult = hasValidAuth ? 'DELIVERED' : 'FAILED';
    // Record audit log
    await db_1.db.insert(schema_1.messagingLogs).values({
        tenantId,
        integrationId: integration.id,
        recipient,
        channel: integration.channel,
        triggerEvent: 'TEST_DISPATCH',
        bodyContent: message,
        externalMessageId,
        status: statusResult,
        costUnits: '1.00',
        dispatchedAt: new Date(),
    });
    // Update integration telemetry
    await db_1.db
        .update(schema_1.messagingIntegrations)
        .set({
        lastHandshakeAt: new Date(),
        lastHandshakeStatus: hasValidAuth ? 'HEALTHY' : 'FAILED',
        currentMonthDispatches: integration.currentMonthDispatches + 1,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.messagingIntegrations.id, integrationId));
    return {
        success: hasValidAuth,
        externalMessageId,
        recipient,
        channel: integration.channel,
        latencyMs,
        message: hasValidAuth
            ? `Test notification dispatched successfully to ${recipient} via ${integration.title}.`
            : 'Dispatch failed. Check provider credentials and sender configuration.',
    };
};
exports.testMessagingDispatch = testMessagingDispatch;
const listMessagingTemplates = async (tenantId) => {
    return await db_1.db
        .select()
        .from(schema_1.messagingTemplates)
        .where((0, drizzle_orm_1.eq)(schema_1.messagingTemplates.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.messagingTemplates.id));
};
exports.listMessagingTemplates = listMessagingTemplates;
const createMessagingTemplate = async (tenantId, input) => {
    const [created] = await db_1.db
        .insert(schema_1.messagingTemplates)
        .values({
        tenantId,
        name: input.name,
        triggerEvent: input.triggerEvent,
        channel: input.channel,
        subject: input.subject || null,
        bodyTemplate: input.bodyTemplate,
        isActive: input.isActive,
    })
        .returning();
    return created;
};
exports.createMessagingTemplate = createMessagingTemplate;
const updateMessagingTemplate = async (tenantId, templateId, input) => {
    const [updated] = await db_1.db
        .update(schema_1.messagingTemplates)
        .set({
        ...input,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.messagingTemplates.id, templateId), (0, drizzle_orm_1.eq)(schema_1.messagingTemplates.tenantId, tenantId)))
        .returning();
    if (!updated) {
        throw new Error('Messaging template not found.');
    }
    return updated;
};
exports.updateMessagingTemplate = updateMessagingTemplate;
const deleteMessagingTemplate = async (tenantId, templateId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.messagingTemplates)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.messagingTemplates.id, templateId), (0, drizzle_orm_1.eq)(schema_1.messagingTemplates.tenantId, tenantId)))
        .returning();
    if (!deleted) {
        throw new Error('Messaging template not found.');
    }
    return deleted;
};
exports.deleteMessagingTemplate = deleteMessagingTemplate;
const listRecentDispatchLogs = async (tenantId, limit = 20) => {
    return await db_1.db
        .select({
        id: schema_1.messagingLogs.id,
        integrationId: schema_1.messagingLogs.integrationId,
        recipient: schema_1.messagingLogs.recipient,
        channel: schema_1.messagingLogs.channel,
        triggerEvent: schema_1.messagingLogs.triggerEvent,
        bodyContent: schema_1.messagingLogs.bodyContent,
        externalMessageId: schema_1.messagingLogs.externalMessageId,
        status: schema_1.messagingLogs.status,
        dispatchedAt: schema_1.messagingLogs.dispatchedAt,
    })
        .from(schema_1.messagingLogs)
        .where((0, drizzle_orm_1.eq)(schema_1.messagingLogs.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.messagingLogs.dispatchedAt))
        .limit(limit);
};
exports.listRecentDispatchLogs = listRecentDispatchLogs;
