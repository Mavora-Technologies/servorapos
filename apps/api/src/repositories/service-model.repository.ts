import { eq, and, asc } from 'drizzle-orm';
import { db } from '../config/db';
import { serviceModels, branches } from '../config/schema';
import {
  CreateServiceModelInput,
  UpdateServiceModelInput,
} from '../validators/service-model.validator';

export const listServiceModels = async (tenantId: number, branchId?: number) => {
  const conditions = [
    eq(serviceModels.tenantId, tenantId),
    branchId ? eq(serviceModels.branchId, branchId) : undefined,
  ].filter(Boolean);

  const models = await db
    .select({
      id: serviceModels.id,
      branchId: serviceModels.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      name: serviceModels.name,
      type: serviceModels.type,
      description: serviceModels.description,
      requiresTable: serviceModels.requiresTable,
      payBeforeOrder: serviceModels.payBeforeOrder,
      promptGuestCount: serviceModels.promptGuestCount,
      allowSplitChecks: serviceModels.allowSplitChecks,
      allowTableTransfers: serviceModels.allowTableTransfers,
      autoSendToKitchen: serviceModels.autoSendToKitchen,
      enableCoursePacing: serviceModels.enableCoursePacing,
      requireSeatNumbering: serviceModels.requireSeatNumbering,
      autoApplyServiceCharge: serviceModels.autoApplyServiceCharge,
      serviceChargePercent: serviceModels.serviceChargePercent,
      packingChargeAmount: serviceModels.packingChargeAmount,
      preAuthCardRequired: serviceModels.preAuthCardRequired,
      maxTabCreditLimit: serviceModels.maxTabCreditLimit,
      isActive: serviceModels.isActive,
      createdAt: serviceModels.createdAt,
    })
    .from(serviceModels)
    .leftJoin(branches, eq(serviceModels.branchId, branches.id))
    .where(and(...conditions))
    .orderBy(asc(serviceModels.id));

  return models;
};

export const createServiceModel = async (tenantId: number, input: CreateServiceModelInput) => {
  const [created] = await db
    .insert(serviceModels)
    .values({
      tenantId,
      branchId: input.branchId || null,
      name: input.name,
      type: input.type,
      description: input.description || null,
      requiresTable: input.requiresTable,
      payBeforeOrder: input.payBeforeOrder,
      promptGuestCount: input.promptGuestCount,
      allowSplitChecks: input.allowSplitChecks,
      allowTableTransfers: input.allowTableTransfers,
      autoSendToKitchen: input.autoSendToKitchen,
      enableCoursePacing: input.enableCoursePacing,
      requireSeatNumbering: input.requireSeatNumbering,
      autoApplyServiceCharge: input.autoApplyServiceCharge,
      serviceChargePercent: String(input.serviceChargePercent),
      packingChargeAmount: String(input.packingChargeAmount),
      preAuthCardRequired: input.preAuthCardRequired,
      maxTabCreditLimit: String(input.maxTabCreditLimit),
      isActive: input.isActive,
    })
    .returning();

  return created;
};

export const updateServiceModel = async (
  tenantId: number,
  modelId: number,
  input: UpdateServiceModelInput
) => {
  const [existing] = await db
    .select({ id: serviceModels.id })
    .from(serviceModels)
    .where(and(eq(serviceModels.id, modelId), eq(serviceModels.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    throw new Error('Service model profile not found.');
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.branchId !== undefined) updateData.branchId = input.branchId;
  if (input.requiresTable !== undefined) updateData.requiresTable = input.requiresTable;
  if (input.payBeforeOrder !== undefined) updateData.payBeforeOrder = input.payBeforeOrder;
  if (input.promptGuestCount !== undefined) updateData.promptGuestCount = input.promptGuestCount;
  if (input.allowSplitChecks !== undefined) updateData.allowSplitChecks = input.allowSplitChecks;
  if (input.allowTableTransfers !== undefined) updateData.allowTableTransfers = input.allowTableTransfers;
  if (input.autoSendToKitchen !== undefined) updateData.autoSendToKitchen = input.autoSendToKitchen;
  if (input.enableCoursePacing !== undefined) updateData.enableCoursePacing = input.enableCoursePacing;
  if (input.requireSeatNumbering !== undefined) updateData.requireSeatNumbering = input.requireSeatNumbering;
  if (input.autoApplyServiceCharge !== undefined) updateData.autoApplyServiceCharge = input.autoApplyServiceCharge;
  if (input.serviceChargePercent !== undefined) updateData.serviceChargePercent = String(input.serviceChargePercent);
  if (input.packingChargeAmount !== undefined) updateData.packingChargeAmount = String(input.packingChargeAmount);
  if (input.preAuthCardRequired !== undefined) updateData.preAuthCardRequired = input.preAuthCardRequired;
  if (input.maxTabCreditLimit !== undefined) updateData.maxTabCreditLimit = String(input.maxTabCreditLimit);
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const [updated] = await db
    .update(serviceModels)
    .set(updateData)
    .where(eq(serviceModels.id, modelId))
    .returning();

  return updated;
};

export const deleteServiceModel = async (tenantId: number, modelId: number) => {
  const [deleted] = await db
    .delete(serviceModels)
    .where(and(eq(serviceModels.id, modelId), eq(serviceModels.tenantId, tenantId)))
    .returning();

  if (!deleted) {
    throw new Error('Service model profile not found.');
  }

  return deleted;
};