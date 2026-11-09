import { eq, and, asc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../config/db';
import { kitchenStations, kitchenGlobalSettings, branches, menuCategories } from '../config/schema';
import {
  CreateKitchenStationInput,
  UpdateKitchenStationInput,
  UpdateKitchenGlobalSettingsInput,
} from '../validators/kitchen-settings.validator';

export const getKitchenSettingsPayload = async (tenantId: number, branchId?: number) => {
  // 1. Fetch or create baseline SLA pacing settings if not present
  let [global] = await db
    .select()
    .from(kitchenGlobalSettings)
    .where(eq(kitchenGlobalSettings.tenantId, tenantId))
    .limit(1);

  if (!global) {
    const [createdGlobal] = await db
      .insert(kitchenGlobalSettings)
      .values({
        tenantId,
        defaultWarningMinutes: 10,
        defaultCriticalMinutes: 18,
        enableCoursePacing: true,
        enableOrderConsolidation: true,
        vipPriorityBoostMinutes: 5,
        deliveryPriorityBoostMinutes: 3,
        soundVolume: 80,
      })
      .returning();
    global = createdGlobal;
  }

  // 2. Query stations dynamically — zero synthetic/mock records inserted
  const backupStation = alias(kitchenStations, 'backup_station');

  const stationConditions = [
    eq(kitchenStations.tenantId, tenantId),
    branchId ? eq(kitchenStations.branchId, branchId) : undefined,
  ].filter(Boolean);

  const [stationsList, categoriesList] = await Promise.all([
    db
      .select({
        id: kitchenStations.id,
        branchId: kitchenStations.branchId,
        branchName: branches.name,
        branchCode: branches.code,
        name: kitchenStations.name,
        code: kitchenStations.code,
        stationType: kitchenStations.stationType,
        colorHex: kitchenStations.colorHex,
        targetPrepTimeMinutes: kitchenStations.targetPrepTimeMinutes,
        warningTimeMinutes: kitchenStations.warningTimeMinutes,
        criticalTimeMinutes: kitchenStations.criticalTimeMinutes,
        assignedCategories: kitchenStations.assignedCategories,
        autoBumpOnPrint: kitchenStations.autoBumpOnPrint,
        soundAlertOnNewTicket: kitchenStations.soundAlertOnNewTicket,
        allowTicketRecall: kitchenStations.allowTicketRecall,
        backupStationId: kitchenStations.backupStationId,
        backupStationName: backupStation.name,
        isActive: kitchenStations.isActive,
        createdAt: kitchenStations.createdAt,
      })
      .from(kitchenStations)
      .innerJoin(branches, eq(kitchenStations.branchId, branches.id))
      .leftJoin(backupStation, eq(kitchenStations.backupStationId, backupStation.id))
      .where(and(...stationConditions))
      .orderBy(asc(kitchenStations.id)),

    // Dynamically retrieve only real categories created by this tenant
    db
      .select({
        id: menuCategories.id,
        name: menuCategories.name,
      })
      .from(menuCategories)
      .where(eq(menuCategories.tenantId, tenantId))
      .orderBy(asc(menuCategories.name)),
  ]);

  return {
    globalSettings: global,
    stations: stationsList,
    availableCategories: categoriesList.map((c) => c.name),
  };
};

export const createKitchenStation = async (tenantId: number, input: CreateKitchenStationInput) => {
  const [created] = await db
    .insert(kitchenStations)
    .values({
      tenantId,
      branchId: input.branchId,
      name: input.name,
      code: input.code,
      stationType: input.stationType,
      colorHex: input.colorHex,
      targetPrepTimeMinutes: input.targetPrepTimeMinutes,
      warningTimeMinutes: input.warningTimeMinutes,
      criticalTimeMinutes: input.criticalTimeMinutes,
      assignedCategories: input.assignedCategories,
      autoBumpOnPrint: input.autoBumpOnPrint,
      soundAlertOnNewTicket: input.soundAlertOnNewTicket,
      allowTicketRecall: input.allowTicketRecall,
      backupStationId: input.backupStationId || null,
      isActive: input.isActive,
    })
    .returning();

  return created;
};

export const updateKitchenStation = async (
  tenantId: number,
  stationId: number,
  input: UpdateKitchenStationInput
) => {
  const [existing] = await db
    .select({ id: kitchenStations.id })
    .from(kitchenStations)
    .where(and(eq(kitchenStations.id, stationId), eq(kitchenStations.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    throw new Error('Kitchen station not found.');
  }

  const [updated] = await db
    .update(kitchenStations)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(kitchenStations.id, stationId))
    .returning();

  return updated;
};

export const deleteKitchenStation = async (tenantId: number, stationId: number) => {
  const [deleted] = await db
    .delete(kitchenStations)
    .where(and(eq(kitchenStations.id, stationId), eq(kitchenStations.tenantId, tenantId)))
    .returning();

  if (!deleted) {
    throw new Error('Kitchen station not found.');
  }

  return deleted;
};

export const updateKitchenGlobalSettings = async (
  tenantId: number,
  input: UpdateKitchenGlobalSettingsInput
) => {
  const [updated] = await db
    .update(kitchenGlobalSettings)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(kitchenGlobalSettings.tenantId, tenantId))
    .returning();

  return updated;
};