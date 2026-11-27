"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileOfflineBatchTransaction = exports.getSyncTelemetry = exports.listSyncBatches = exports.upsertOfflineSettingsTransaction = exports.findOfflineSettingsByTenant = void 0;
// apps/api/src/repositories/offline-settings.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const pos_terminal_repository_1 = require("./pos-terminal.repository");
const findOfflineSettingsByTenant = async (tenantId) => {
    const [settings] = await db_1.db
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
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.offlineSettings.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
        .where((0, drizzle_orm_1.eq)(schema_1.offlineSettings.tenantId, tenantId))
        .limit(1);
    return settings ?? null;
};
exports.findOfflineSettingsByTenant = findOfflineSettingsByTenant;
const upsertOfflineSettingsTransaction = async (tenantId, input) => {
    return await db_1.db.transaction(async (tx) => {
        if (input.branchId !== null && input.branchId !== undefined) {
            const [branch] = await tx
                .select({ id: schema_1.branches.id })
                .from(schema_1.branches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, input.branchId), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
                .limit(1);
            if (!branch) {
                throw new Error('Selected branch does not exist or does not belong to this tenant.');
            }
        }
        const [existing] = await tx
            .select({ id: schema_1.offlineSettings.id })
            .from(schema_1.offlineSettings)
            .where((0, drizzle_orm_1.eq)(schema_1.offlineSettings.tenantId, tenantId))
            .limit(1);
        const values = {
            branchId: input.branchId ?? null,
            allowOfflineSales: input.allowOfflineSales,
            maxOfflineHours: input.maxOfflineHours,
            maxOfflineTicketTotal: input.maxOfflineTicketTotal.toFixed(2),
            maxOfflineCumulativeBalance: input.maxOfflineCumulativeBalance.toFixed(2),
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
        };
        if (existing) {
            const [updated] = await tx
                .update(schema_1.offlineSettings)
                .set(values)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.offlineSettings.id, existing.id), (0, drizzle_orm_1.eq)(schema_1.offlineSettings.tenantId, tenantId)))
                .returning();
            return updated;
        }
        const [created] = await tx
            .insert(schema_1.offlineSettings)
            .values({
            tenantId,
            ...values,
        })
            .returning();
        return created;
    });
};
exports.upsertOfflineSettingsTransaction = upsertOfflineSettingsTransaction;
const listSyncBatches = async (tenantId, branchId, limit = 30) => {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.offlineSyncBatches.tenantId, tenantId)];
    if (branchId) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.offlineSyncBatches.branchId, branchId));
    }
    return await db_1.db
        .select({
        id: schema_1.offlineSyncBatches.id,
        branchId: schema_1.offlineSyncBatches.branchId,
        branchName: schema_1.branches.name,
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
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.offlineSyncBatches.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.offlineSyncBatches.completedAt), (0, drizzle_orm_1.desc)(schema_1.offlineSyncBatches.id))
        .limit(limit);
};
exports.listSyncBatches = listSyncBatches;
const getSyncTelemetry = async (tenantId) => {
    const [totalsResult] = await db_1.db
        .select({
        totalSyncs: (0, drizzle_orm_1.sql) `count(*)::int`,
        successfulSyncs: (0, drizzle_orm_1.sql) `count(case when ${schema_1.offlineSyncBatches.status} = 'PROCESSED' then 1 end)::int`,
        totalRecordsSynced: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.offlineSyncBatches.recordCount}), 0)::int`,
        conflictsDetected: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.offlineSyncBatches.conflictCount}), 0)::int`,
        avgLatencyMs: (0, drizzle_orm_1.sql) `coalesce(avg(${schema_1.offlineSyncBatches.syncDurationMs}), 0)::float`,
    })
        .from(schema_1.offlineSyncBatches)
        .where((0, drizzle_orm_1.eq)(schema_1.offlineSyncBatches.tenantId, tenantId));
    return {
        totalSyncs: Number(totalsResult?.totalSyncs ?? 0),
        successfulSyncs: Number(totalsResult?.successfulSyncs ?? 0),
        totalRecordsSynced: Number(totalsResult?.totalRecordsSynced ?? 0),
        conflictsDetected: Number(totalsResult?.conflictsDetected ?? 0),
        avgLatencyMs: Math.round(Number(totalsResult?.avgLatencyMs ?? 0)),
    };
};
exports.getSyncTelemetry = getSyncTelemetry;
/**
 * Real transactional reconciliation of queued offline POS orders.
 * Each order executes in a nested savepoint so a single conflict never aborts valid orders.
 */
const reconcileOfflineBatchTransaction = async (tenantId, userId, defaultBranchId, input) => {
    const startedAt = Date.now();
    return await db_1.db.transaction(async (tx) => {
        // 1. Idempotency check on batchReference
        const [existingBatch] = await tx
            .select()
            .from(schema_1.offlineSyncBatches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.offlineSyncBatches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.offlineSyncBatches.batchReference, input.batchReference)))
            .limit(1);
        if (existingBatch) {
            return {
                batch: existingBatch,
                reconciledKeys: input.orders.map((o) => o.idempotencyKey),
                conflicts: [],
                alreadyProcessed: true,
            };
        }
        // 2. Load tenant offline policy (if configured)
        const [policy] = await tx
            .select()
            .from(schema_1.offlineSettings)
            .where((0, drizzle_orm_1.eq)(schema_1.offlineSettings.tenantId, tenantId))
            .limit(1);
        if (policy && !policy.allowOfflineSales) {
            throw new Error('Offline sales reconciliation is disabled by tenant survivability policy.');
        }
        const reconciledKeys = [];
        const reconciledOrderNumbers = [];
        const skippedDuplicates = [];
        const conflicts = [];
        // 3. Process each queued offline order inside its own savepoint
        for (const queuedOrder of input.orders) {
            try {
                await tx.transaction(async (subTx) => {
                    // 3a. Order-level idempotency check
                    const [dupOrder] = await subTx
                        .select({ id: schema_1.orders.id, orderNumber: schema_1.orders.orderNumber })
                        .from(schema_1.orders)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.orders.idempotencyKey, queuedOrder.idempotencyKey)))
                        .limit(1);
                    if (dupOrder) {
                        skippedDuplicates.push(queuedOrder.idempotencyKey);
                        reconciledKeys.push(queuedOrder.idempotencyKey);
                        return;
                    }
                    // 3b. Validate all menu items belong to this tenant
                    const uniqueMenuIds = Array.from(new Set(queuedOrder.items.map((item) => item.menuItemId)));
                    const ownedMenuItems = await subTx
                        .select({ id: schema_1.menuItems.id, costEstimate: schema_1.menuItems.costEstimate })
                        .from(schema_1.menuItems)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.menuItems.id, uniqueMenuIds)));
                    if (ownedMenuItems.length !== uniqueMenuIds.length) {
                        throw new Error('One or more menu items in offline order no longer exist for this tenant.');
                    }
                    const costByMenuId = new Map(ownedMenuItems.map((m) => [m.id, parseFloat(m.costEstimate) || 0]));
                    const effectiveBranchId = queuedOrder.branchId ?? input.branchId ?? defaultBranchId ?? null;
                    const orderNumber = `OFF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
                    const createdAt = policy?.conflictResolutionStrategy === 'CLIENT_TIMESTAMP_WINS' &&
                        queuedOrder.clientCreatedAt
                        ? new Date(queuedOrder.clientCreatedAt)
                        : new Date();
                    const [createdOrder] = await subTx
                        .insert(schema_1.orders)
                        .values({
                        tenantId,
                        branchId: effectiveBranchId,
                        tableId: queuedOrder.tableId ?? null,
                        tableName: queuedOrder.tableName ?? queuedOrder.orderType,
                        customerId: queuedOrder.customerId ?? null,
                        cashierId: userId,
                        orderNumber,
                        orderType: queuedOrder.orderType,
                        status: 'Completed',
                        paymentStatus: 'Paid',
                        customerName: queuedOrder.customerName ?? null,
                        customerPhone: queuedOrder.customerPhone ?? null,
                        buyerKraPin: queuedOrder.buyerKraPin ?? null,
                        subtotal: queuedOrder.subtotal.toFixed(2),
                        discountTotal: queuedOrder.discountTotal.toFixed(2),
                        tax: queuedOrder.tax.toFixed(2),
                        cateringLevy: queuedOrder.cateringLevy.toFixed(2),
                        serviceCharge: queuedOrder.serviceCharge.toFixed(2),
                        total: queuedOrder.total.toFixed(2),
                        amountPaid: queuedOrder.total.toFixed(2),
                        notes: queuedOrder.notes
                            ? `[Offline Sync: ${input.terminalIdentifier}] ${queuedOrder.notes}`
                            : `[Offline Sync: ${input.terminalIdentifier}]`,
                        idempotencyKey: queuedOrder.idempotencyKey,
                        inventoryDeducted: false,
                        createdAt,
                    })
                        .returning();
                    // 3c. Insert order line items
                    await subTx.insert(schema_1.orderItems).values(queuedOrder.items.map((line) => ({
                        tenantId,
                        orderId: createdOrder.id,
                        menuItemId: line.menuItemId,
                        quantity: line.quantity.toFixed(2),
                        unitPrice: line.unitPrice.toFixed(2),
                        modifiersPrice: (line.modifiersPrice ?? 0).toFixed(2),
                        totalPrice: line.totalPrice.toFixed(2),
                        unitCostSnapshot: (costByMenuId.get(line.menuItemId) ?? 0).toFixed(2),
                        selectedModifiers: line.selectedModifiers ?? [],
                        kitchenStatus: 'Served',
                        notes: line.notes ?? null,
                    })));
                    // 3d. Post Inbound AR Payment Ledger entry
                    const paymentNumber = `PMT-OFF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
                    const normalizedMethod = queuedOrder.paymentMethod.toUpperCase().includes('MPESA')
                        ? 'MPESA_C2B_OFFLINE'
                        : queuedOrder.paymentMethod.toUpperCase().includes('CARD')
                            ? 'CREDIT_CARD'
                            : 'CASH_DRAWER';
                    await subTx.insert(schema_1.payments).values({
                        tenantId,
                        branchId: effectiveBranchId,
                        paymentNumber,
                        paymentFlow: 'INBOUND_AR',
                        status: 'POSTED',
                        paymentMethod: normalizedMethod,
                        clearingAccount: `Offline Terminal (${input.terminalIdentifier})`,
                        transactionReference: queuedOrder.mpesaReference ?? queuedOrder.idempotencyKey,
                        orderId: createdOrder.id,
                        currency: 'KES',
                        amount: queuedOrder.total.toFixed(4),
                        processedById: userId,
                        notes: `Reconciled from offline batch ${input.batchReference}`,
                    });
                    // 3e. Atomic inventory & availability depletion
                    try {
                        await (0, pos_terminal_repository_1.deductOrderInventoryInTx)(subTx, {
                            tenantId,
                            branchId: effectiveBranchId,
                            userId,
                            orderId: createdOrder.id,
                            orderNumber: createdOrder.orderNumber,
                            items: queuedOrder.items.map((i) => ({
                                menuItemId: i.menuItemId,
                                quantity: i.quantity,
                            })),
                        });
                    }
                    catch (stockErr) {
                        if (policy?.conflictResolutionStrategy === 'MANUAL_REVIEW') {
                            throw stockErr;
                        }
                        // In timestamp-wins modes, keep the completed sale and log a stock variance conflict
                        conflicts.push({
                            idempotencyKey: queuedOrder.idempotencyKey,
                            reason: stockErr instanceof Error
                                ? `Order ${orderNumber} saved with stock variance: ${stockErr.message}`
                                : `Order ${orderNumber} saved with stock variance`,
                        });
                    }
                    reconciledKeys.push(queuedOrder.idempotencyKey);
                    reconciledOrderNumbers.push(createdOrder.orderNumber);
                });
            }
            catch (orderErr) {
                conflicts.push({
                    idempotencyKey: queuedOrder.idempotencyKey,
                    reason: orderErr instanceof Error ? orderErr.message : 'Failed to reconcile offline order.',
                });
            }
        }
        const syncDurationMs = Math.max(1, Date.now() - startedAt);
        const batchStatus = conflicts.length === 0
            ? 'PROCESSED'
            : reconciledOrderNumbers.length > 0 || skippedDuplicates.length > 0
                ? 'CONFLICT_DETECTED'
                : 'FAILED';
        const [batch] = await tx
            .insert(schema_1.offlineSyncBatches)
            .values({
            tenantId,
            branchId: input.branchId ?? defaultBranchId ?? null,
            terminalIdentifier: input.terminalIdentifier,
            batchReference: input.batchReference,
            recordCount: reconciledOrderNumbers.length,
            status: batchStatus,
            conflictCount: conflicts.length,
            payloadSummary: {
                submittedOrders: input.orders.length,
                reconciledOrders: reconciledOrderNumbers.length,
                reconciledOrderNumbers,
                skippedDuplicates: skippedDuplicates.length,
                conflicts,
                strategy: policy?.conflictResolutionStrategy ?? 'SERVER_TIMESTAMP_WINS',
            },
            syncDurationMs,
            completedAt: new Date(),
        })
            .returning();
        return {
            batch,
            reconciledKeys,
            conflicts,
            alreadyProcessed: false,
        };
    });
};
exports.reconcileOfflineBatchTransaction = reconcileOfflineBatchTransaction;
