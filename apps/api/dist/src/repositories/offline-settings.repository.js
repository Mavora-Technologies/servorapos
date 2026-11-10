"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSyncTelemetry = exports.triggerSyncSimulation = exports.listSyncBatches = exports.updateOfflineSettings = exports.getOrCreateOfflineSettings = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getOrCreateOfflineSettings = async (tenantId, branchId) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.offlineSettings.tenantId, tenantId),
        branchId ? (0, drizzle_orm_1.eq)(schema_1.offlineSettings.branchId, branchId) : undefined,
    ].filter(Boolean);
    let [settings] = await db_1.db
        .select({
        id: schema_1.offlineSettings.id,
        tenantId: schema_1.offlineSettings.tenantId,
        branchId: schema_1.offlineSettings.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        allowOfflineSales: schema_1.offlineSettings.allowOfflineSales,
        maxOfflineHours: schema_1.offlineSettings.maxOfflineHours,
        maxOfflineTicketTotal: schema_1.offlineSettings.maxOfflineTicketTotal,
        maxOfflineCumulativeBalance: schema_1.offlineSettings.maxOfflineCumulativeBalance,
        requireManagerAuthForOffline: schema_1.offlineSettings.requireManagerAuthForOffline,
        conflictResolutionStrategy: schema_1.offlineSettings.conflictResolutionStrategy,
        autoSyncOnReconnect: schema_1.offlineSettings.autoSyncOnReconnect,
        syncBatchSize: schema_1.offlineSettings.syncBatchSize,
        syncIntervalSeconds: schema_1.offlineSettings.syncIntervalSeconds,
        cacheCatalogItems: schema_1.offlineSettings.cacheCatalogItems,
        cacheCustomerDirectory: schema_1.offlineSettings.cacheCustomerDirectory,
        cacheTaxTables: schema_1.offlineSettings.cacheTaxTables,
        cacheUserCredentials: schema_1.offlineSettings.cacheUserCredentials,
        encryptLocalStorage: schema_1.offlineSettings.encryptLocalStorage,
        allowOfflineCash: schema_1.offlineSettings.allowOfflineCash,
        allowOfflineCard: schema_1.offlineSettings.allowOfflineCard,
        allowOfflineMpesaReference: schema_1.offlineSettings.allowOfflineMpesaReference,
        allowOfflineGiftCards: schema_1.offlineSettings.allowOfflineGiftCards,
        allowOfflineCreditTabs: schema_1.offlineSettings.allowOfflineCreditTabs,
        createdAt: schema_1.offlineSettings.createdAt,
        updatedAt: schema_1.offlineSettings.updatedAt,
    })
        .from(schema_1.offlineSettings)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.offlineSettings.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .limit(1);
    if (!settings) {
        const [created] = await db_1.db
            .insert(schema_1.offlineSettings)
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
exports.getOrCreateOfflineSettings = getOrCreateOfflineSettings;
const updateOfflineSettings = async (tenantId, input) => {
    await (0, exports.getOrCreateOfflineSettings)(tenantId, input.branchId || undefined);
    const [updated] = await db_1.db
        .update(schema_1.offlineSettings)
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
        .where((0, drizzle_orm_1.eq)(schema_1.offlineSettings.tenantId, tenantId))
        .returning();
    return updated;
};
exports.updateOfflineSettings = updateOfflineSettings;
const listSyncBatches = async (tenantId, limit = 20) => {
    const batches = await db_1.db
        .select({
        id: schema_1.offlineSyncBatches.id,
        terminalIdentifier: schema_1.offlineSyncBatches.terminalIdentifier,
        batchReference: schema_1.offlineSyncBatches.batchReference,
        recordCount: schema_1.offlineSyncBatches.recordCount,
        status: schema_1.offlineSyncBatches.status,
        conflictCount: schema_1.offlineSyncBatches.conflictCount,
        payloadSummary: schema_1.offlineSyncBatches.payloadSummary,
        syncDurationMs: schema_1.offlineSyncBatches.syncDurationMs,
        completedAt: schema_1.offlineSyncBatches.completedAt,
    })
        .from(schema_1.offlineSyncBatches)
        .where((0, drizzle_orm_1.eq)(schema_1.offlineSyncBatches.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.offlineSyncBatches.completedAt))
        .limit(limit);
    return batches;
};
exports.listSyncBatches = listSyncBatches;
const triggerSyncSimulation = async (tenantId, input) => {
    const batchReference = `SYNC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const syncDurationMs = Math.floor(Math.random() * 120) + 40;
    const [batch] = await db_1.db
        .insert(schema_1.offlineSyncBatches)
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
exports.triggerSyncSimulation = triggerSyncSimulation;
const getSyncTelemetry = async (tenantId) => {
    const [totalsResult] = await db_1.db
        .select({
        totalSyncs: (0, drizzle_orm_1.sql) `count(*)`,
        successfulSyncs: (0, drizzle_orm_1.sql) `count(case when ${schema_1.offlineSyncBatches.status} = 'PROCESSED' then 1 end)`,
        conflictsDetected: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.offlineSyncBatches.conflictCount}), 0)`,
        avgLatencyMs: (0, drizzle_orm_1.sql) `coalesce(avg(${schema_1.offlineSyncBatches.syncDurationMs}), 0)`,
    })
        .from(schema_1.offlineSyncBatches)
        .where((0, drizzle_orm_1.eq)(schema_1.offlineSyncBatches.tenantId, tenantId));
    return {
        totalSyncs: Number(totalsResult?.totalSyncs || 0),
        successfulSyncs: Number(totalsResult?.successfulSyncs || 0),
        conflictsDetected: Number(totalsResult?.conflictsDetected || 0),
        avgLatencyMs: Math.round(Number(totalsResult?.avgLatencyMs || 0)),
    };
};
exports.getSyncTelemetry = getSyncTelemetry;
