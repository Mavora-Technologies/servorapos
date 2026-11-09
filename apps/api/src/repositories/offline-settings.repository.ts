import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { offlineSettings, offlineSyncBatches, branches } from '../config/schema';
import { UpdateOfflineSettingsInput, SimulateSyncBatchInput } from '../validators/offline-settings.validator';

export const getOrCreateOfflineSettings = async (tenantId: number, branchId?: number) => {
  const conditions = [
    eq(offlineSettings.tenantId, tenantId),
    branchId ? eq(offlineSettings.branchId, branchId) : undefined,
  ].filter(Boolean);

  let [settings] = await db
    .select({
      id: offlineSettings.id,
      tenantId: offlineSettings.tenantId,
      branchId: offlineSettings.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      allowOfflineSales: offlineSettings.allowOfflineSales,
      maxOfflineHours: offlineSettings.maxOfflineHours,
      maxOfflineTicketTotal: offlineSettings.maxOfflineTicketTotal,
      maxOfflineCumulativeBalance: offlineSettings.maxOfflineCumulativeBalance,
      requireManagerAuthForOffline: offlineSettings.requireManagerAuthForOffline,
      conflictResolutionStrategy: offlineSettings.conflictResolutionStrategy,
      autoSyncOnReconnect: offlineSettings.autoSyncOnReconnect,
      syncBatchSize: offlineSettings.syncBatchSize,
      syncIntervalSeconds: offlineSettings.syncIntervalSeconds,
      cacheCatalogItems: offlineSettings.cacheCatalogItems,
      cacheCustomerDirectory: offlineSettings.cacheCustomerDirectory,
      cacheTaxTables: offlineSettings.cacheTaxTables,
      cacheUserCredentials: offlineSettings.cacheUserCredentials,
      encryptLocalStorage: offlineSettings.encryptLocalStorage,
      allowOfflineCash: offlineSettings.allowOfflineCash,
      allowOfflineCard: offlineSettings.allowOfflineCard,
      allowOfflineMpesaReference: offlineSettings.allowOfflineMpesaReference,
      allowOfflineGiftCards: offlineSettings.allowOfflineGiftCards,
      allowOfflineCreditTabs: offlineSettings.allowOfflineCreditTabs,
      createdAt: offlineSettings.createdAt,
      updatedAt: offlineSettings.updatedAt,
    })
    .from(offlineSettings)
    .leftJoin(branches, eq(offlineSettings.branchId, branches.id))
    .where(and(...conditions))
    .limit(1);

  if (!settings) {
    const [created] = await db
      .insert(offlineSettings)
      .values({
        tenantId,
        branchId: branchId || null,
        allowOfflineSales: true,
        maxOfflineHours: 72,
        maxOfflineTicketTotal: '50000.00',
        maxOfflineCumulativeBalance: '500000.00',
        requireManagerAuthForOffline: false,
        conflictResolutionStrategy: 'SERVER_TIMESTAMP_WINS',
        autoSyncOnReconnect: true,
        syncBatchSize: 50,
        syncIntervalSeconds: 30,
        cacheCatalogItems: true,
        cacheCustomerDirectory: true,
        cacheTaxTables: true,
        cacheUserCredentials: true,
        encryptLocalStorage: true,
        allowOfflineCash: true,
        allowOfflineCard: true,
        allowOfflineMpesaReference: true,
        allowOfflineGiftCards: false,
        allowOfflineCreditTabs: false,
      })
      .returning();

    settings = {
      ...created,
      branchName: null,
      branchCode: null,
    };
  }

  return settings;
};

export const updateOfflineSettings = async (
  tenantId: number,
  input: UpdateOfflineSettingsInput
) => {
  await getOrCreateOfflineSettings(tenantId, input.branchId || undefined);

  const [updated] = await db
    .update(offlineSettings)
    .set({
      branchId: input.branchId || null,
      allowOfflineSales: input.allowOfflineSales,
      maxOfflineHours: input.maxOfflineHours,
      maxOfflineTicketTotal: String(input.maxOfflineTicketTotal),
      maxOfflineCumulativeBalance: String(input.maxOfflineCumulativeBalance),
      requireManagerAuthForOffline: input.requireManagerAuthForOffline,
      conflictResolutionStrategy: input.conflictResolutionStrategy,
      autoSyncOnReconnect: input.autoSyncOnReconnect,
      syncBatchSize: input.syncBatchSize,
      syncIntervalSeconds: input.syncIntervalSeconds,
      cacheCatalogItems: input.cacheCatalogItems,
      cacheCustomerDirectory: input.cacheCustomerDirectory,
      cacheTaxTables: input.cacheTaxTables,
      cacheUserCredentials: input.cacheUserCredentials,
      encryptLocalStorage: input.encryptLocalStorage,
      allowOfflineCash: input.allowOfflineCash,
      allowOfflineCard: input.allowOfflineCard,
      allowOfflineMpesaReference: input.allowOfflineMpesaReference,
      allowOfflineGiftCards: input.allowOfflineGiftCards,
      allowOfflineCreditTabs: input.allowOfflineCreditTabs,
      updatedAt: new Date(),
    })
    .where(eq(offlineSettings.tenantId, tenantId))
    .returning();

  return updated;
};

export const listSyncBatches = async (tenantId: number, limit = 20) => {
  const batches = await db
    .select({
      id: offlineSyncBatches.id,
      terminalIdentifier: offlineSyncBatches.terminalIdentifier,
      batchReference: offlineSyncBatches.batchReference,
      recordCount: offlineSyncBatches.recordCount,
      status: offlineSyncBatches.status,
      conflictCount: offlineSyncBatches.conflictCount,
      payloadSummary: offlineSyncBatches.payloadSummary,
      syncDurationMs: offlineSyncBatches.syncDurationMs,
      completedAt: offlineSyncBatches.completedAt,
    })
    .from(offlineSyncBatches)
    .where(eq(offlineSyncBatches.tenantId, tenantId))
    .orderBy(desc(offlineSyncBatches.completedAt))
    .limit(limit);

  return batches;
};

export const triggerSyncSimulation = async (
  tenantId: number,
  input: SimulateSyncBatchInput
) => {
  const batchReference = `SYNC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  const syncDurationMs = Math.floor(Math.random() * 120) + 40;

  const [batch] = await db
    .insert(offlineSyncBatches)
    .values({
      tenantId,
      terminalIdentifier: input.terminalIdentifier,
      batchReference,
      recordCount: input.recordCount,
      status: 'PROCESSED',
      conflictCount: 0,
      payloadSummary: {
        reconciledOrders: input.recordCount,
        discrepancies: 0,
        syncMode: 'AUTOMATIC_INCREMENTAL',
      },
      syncDurationMs,
      completedAt: new Date(),
    })
    .returning();

  return batch;
};

export const getSyncTelemetry = async (tenantId: number) => {
  const [totalsResult] = await db
    .select({
      totalSyncs: sql<number>`count(*)`,
      successfulSyncs: sql<number>`count(case when ${offlineSyncBatches.status} = 'PROCESSED' then 1 end)`,
      conflictsDetected: sql<number>`coalesce(sum(${offlineSyncBatches.conflictCount}), 0)`,
      avgLatencyMs: sql<number>`coalesce(avg(${offlineSyncBatches.syncDurationMs}), 0)`,
    })
    .from(offlineSyncBatches)
    .where(eq(offlineSyncBatches.tenantId, tenantId));

  return {
    totalSyncs: Number(totalsResult?.totalSyncs || 0),
    successfulSyncs: Number(totalsResult?.successfulSyncs || 0),
    conflictsDetected: Number(totalsResult?.conflictsDetected || 0),
    avgLatencyMs: Math.round(Number(totalsResult?.avgLatencyMs || 0)),
  };
};