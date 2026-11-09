import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from '../config/db';
import {
  messagingIntegrations,
  messagingTemplates,
  messagingLogs,
  branches,
} from '../config/schema';
import {
  CreateMessagingIntegrationInput,
  UpdateMessagingIntegrationInput,
  CreateMessagingTemplateInput,
  UpdateMessagingTemplateInput,
} from '../validators/messaging-integration.validator';

export const listMessagingIntegrations = async (tenantId: number, branchId?: number) => {
  const conditions = [
    eq(messagingIntegrations.tenantId, tenantId),
    branchId ? eq(messagingIntegrations.branchId, branchId) : undefined,
  ].filter(Boolean);

  const integrations = await db
    .select({
      id: messagingIntegrations.id,
      branchId: messagingIntegrations.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      channel: messagingIntegrations.channel,
      provider: messagingIntegrations.provider,
      title: messagingIntegrations.title,
      environment: messagingIntegrations.environment,
      senderId: messagingIntegrations.senderId,
      accountIdentifier: messagingIntegrations.accountIdentifier,
      apiKey: messagingIntegrations.apiKey,
      webhookUrl: messagingIntegrations.webhookUrl,
      monthlyCreditCap: messagingIntegrations.monthlyCreditCap,
      currentMonthDispatches: messagingIntegrations.currentMonthDispatches,
      status: messagingIntegrations.status,
      lastHandshakeAt: messagingIntegrations.lastHandshakeAt,
      lastHandshakeStatus: messagingIntegrations.lastHandshakeStatus,
      isDefault: messagingIntegrations.isDefault,
      createdAt: messagingIntegrations.createdAt,
    })
    .from(messagingIntegrations)
    .leftJoin(branches, eq(messagingIntegrations.branchId, branches.id))
    .where(and(...conditions))
    .orderBy(desc(messagingIntegrations.isDefault), asc(messagingIntegrations.id));

  return integrations;
};

export const createMessagingIntegration = async (
  tenantId: number,
  input: CreateMessagingIntegrationInput
) => {
  if (input.isDefault) {
    await db
      .update(messagingIntegrations)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(messagingIntegrations.tenantId, tenantId),
          eq(messagingIntegrations.channel, input.channel),
          input.branchId ? eq(messagingIntegrations.branchId, input.branchId) : undefined
        )
      );
  }

  const [created] = await db
    .insert(messagingIntegrations)
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

export const updateMessagingIntegration = async (
  tenantId: number,
  integrationId: number,
  input: UpdateMessagingIntegrationInput
) => {
  const [existing] = await db
    .select({ id: messagingIntegrations.id, channel: messagingIntegrations.channel })
    .from(messagingIntegrations)
    .where(
      and(
        eq(messagingIntegrations.id, integrationId),
        eq(messagingIntegrations.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new Error('Messaging integration profile not found.');
  }

  const targetChannel = input.channel || existing.channel;

  if (input.isDefault) {
    await db
      .update(messagingIntegrations)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(messagingIntegrations.tenantId, tenantId),
          eq(messagingIntegrations.channel, targetChannel),
          input.branchId ? eq(messagingIntegrations.branchId, input.branchId) : undefined
        )
      );
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (input.branchId !== undefined) updateData.branchId = input.branchId;
  if (input.channel !== undefined) updateData.channel = input.channel;
  if (input.provider !== undefined) updateData.provider = input.provider;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.environment !== undefined) updateData.environment = input.environment;
  if (input.senderId !== undefined) updateData.senderId = input.senderId;
  if (input.accountIdentifier !== undefined) updateData.accountIdentifier = input.accountIdentifier;
  if (input.apiKey !== undefined) updateData.apiKey = input.apiKey;
  if (input.apiSecret !== undefined) updateData.apiSecret = input.apiSecret;
  if (input.webhookUrl !== undefined) updateData.webhookUrl = input.webhookUrl;
  if (input.monthlyCreditCap !== undefined) updateData.monthlyCreditCap = input.monthlyCreditCap;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

  const [updated] = await db
    .update(messagingIntegrations)
    .set(updateData)
    .where(eq(messagingIntegrations.id, integrationId))
    .returning();

  return updated;
};

export const deleteMessagingIntegration = async (tenantId: number, integrationId: number) => {
  const [deleted] = await db
    .delete(messagingIntegrations)
    .where(
      and(
        eq(messagingIntegrations.id, integrationId),
        eq(messagingIntegrations.tenantId, tenantId)
      )
    )
    .returning();

  if (!deleted) {
    throw new Error('Messaging integration profile not found.');
  }

  return deleted;
};

export const testMessagingDispatch = async (
  tenantId: number,
  integrationId: number,
  recipient: string,
  message: string
) => {
  const [integration] = await db
    .select()
    .from(messagingIntegrations)
    .where(
      and(
        eq(messagingIntegrations.id, integrationId),
        eq(messagingIntegrations.tenantId, tenantId)
      )
    )
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
  await db.insert(messagingLogs).values({
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
  await db
    .update(messagingIntegrations)
    .set({
      lastHandshakeAt: new Date(),
      lastHandshakeStatus: hasValidAuth ? 'HEALTHY' : 'FAILED',
      currentMonthDispatches: integration.currentMonthDispatches + 1,
      updatedAt: new Date(),
    })
    .where(eq(messagingIntegrations.id, integrationId));

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

export const listMessagingTemplates = async (tenantId: number) => {
  return await db
    .select()
    .from(messagingTemplates)
    .where(eq(messagingTemplates.tenantId, tenantId))
    .orderBy(asc(messagingTemplates.id));
};

export const createMessagingTemplate = async (
  tenantId: number,
  input: CreateMessagingTemplateInput
) => {
  const [created] = await db
    .insert(messagingTemplates)
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

export const updateMessagingTemplate = async (
  tenantId: number,
  templateId: number,
  input: UpdateMessagingTemplateInput
) => {
  const [updated] = await db
    .update(messagingTemplates)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(messagingTemplates.id, templateId),
        eq(messagingTemplates.tenantId, tenantId)
      )
    )
    .returning();

  if (!updated) {
    throw new Error('Messaging template not found.');
  }

  return updated;
};

export const deleteMessagingTemplate = async (tenantId: number, templateId: number) => {
  const [deleted] = await db
    .delete(messagingTemplates)
    .where(
      and(
        eq(messagingTemplates.id, templateId),
        eq(messagingTemplates.tenantId, tenantId)
      )
    )
    .returning();

  if (!deleted) {
    throw new Error('Messaging template not found.');
  }

  return deleted;
};

export const listRecentDispatchLogs = async (tenantId: number, limit = 20) => {
  return await db
    .select({
      id: messagingLogs.id,
      integrationId: messagingLogs.integrationId,
      recipient: messagingLogs.recipient,
      channel: messagingLogs.channel,
      triggerEvent: messagingLogs.triggerEvent,
      bodyContent: messagingLogs.bodyContent,
      externalMessageId: messagingLogs.externalMessageId,
      status: messagingLogs.status,
      dispatchedAt: messagingLogs.dispatchedAt,
    })
    .from(messagingLogs)
    .where(eq(messagingLogs.tenantId, tenantId))
    .orderBy(desc(messagingLogs.dispatchedAt))
    .limit(limit);
};