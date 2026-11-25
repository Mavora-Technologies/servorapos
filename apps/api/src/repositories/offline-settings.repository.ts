// apps/api/src/repositories/offline-settings.repository.ts
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { db } from '../config/db';
import {
  offlineSettings,
  offlineSyncBatches,
  branches,
  orders,
  orderItems,
  payments,
  menuItems,
} from '../config/schema';
import { deductOrderInventoryInTx } from './pos-terminal.repository';
import type {
  UpdateOfflineSettingsInput,
  SyncOfflineBatchInput,
} from '../validators/offline-settings.validator';

export const findOfflineSettingsByTenant = async (tenantId: number) => {
  const [settings] = await db
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
    .leftJoin(
      branches,
      and(eq(offlineSettings.branchId, branches.id), eq(branches.tenantId, tenantId))
    )
    .where(eq(offlineSettings.tenantId, tenantId))
    .limit(1);

  return settings ?? null;
};

export const upsertOfflineSettingsTransaction = async (
  tenantId: number,
  input: UpdateOfflineSettingsInput
) => {
  return await db.transaction(async (tx) => {
    if (input.branchId !== null && input.branchId !== undefined) {
      const [branch] = await tx
        .select({ id: branches.id })
        .from(branches)
        .where(and(eq(branches.id, input.branchId), eq(branches.tenantId, tenantId)))
        .limit(1);

      if (!branch) {
        throw new Error('Selected branch does not exist or does not belong to this tenant.');
      }
    }

    const [existing] = await tx
      .select({ id: offlineSettings.id })
      .from(offlineSettings)
      .where(eq(offlineSettings.tenantId, tenantId))
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
        .update(offlineSettings)
        .set(values)
        .where(and(eq(offlineSettings.id, existing.id), eq(offlineSettings.tenantId, tenantId)))
        .returning();
      return updated;
    }

    const [created] = await tx
      .insert(offlineSettings)
      .values({
        tenantId,
        ...values,
      })
      .returning();
    return created;
  });
};

export const listSyncBatches = async (tenantId: number, branchId?: number, limit = 30) => {
  const conditions = [eq(offlineSyncBatches.tenantId, tenantId)];
  if (branchId) {
    conditions.push(eq(offlineSyncBatches.branchId, branchId));
  }

  return await db
    .select({
      id: offlineSyncBatches.id,
      branchId: offlineSyncBatches.branchId,
      branchName: branches.name,
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
    .leftJoin(
      branches,
      and(eq(offlineSyncBatches.branchId, branches.id), eq(branches.tenantId, tenantId))
    )
    .where(and(...conditions))
    .orderBy(desc(offlineSyncBatches.completedAt), desc(offlineSyncBatches.id))
    .limit(limit);
};

export const getSyncTelemetry = async (tenantId: number) => {
  const [totalsResult] = await db
    .select({
      totalSyncs: sql<number>`count(*)::int`,
      successfulSyncs: sql<number>`count(case when ${offlineSyncBatches.status} = 'PROCESSED' then 1 end)::int`,
      totalRecordsSynced: sql<number>`coalesce(sum(${offlineSyncBatches.recordCount}), 0)::int`,
      conflictsDetected: sql<number>`coalesce(sum(${offlineSyncBatches.conflictCount}), 0)::int`,
      avgLatencyMs: sql<number>`coalesce(avg(${offlineSyncBatches.syncDurationMs}), 0)::float`,
    })
    .from(offlineSyncBatches)
    .where(eq(offlineSyncBatches.tenantId, tenantId));

  return {
    totalSyncs: Number(totalsResult?.totalSyncs ?? 0),
    successfulSyncs: Number(totalsResult?.successfulSyncs ?? 0),
    totalRecordsSynced: Number(totalsResult?.totalRecordsSynced ?? 0),
    conflictsDetected: Number(totalsResult?.conflictsDetected ?? 0),
    avgLatencyMs: Math.round(Number(totalsResult?.avgLatencyMs ?? 0)),
  };
};

/**
 * Real transactional reconciliation of queued offline POS orders.
 * Each order executes in a nested savepoint so a single conflict never aborts valid orders.
 */
export const reconcileOfflineBatchTransaction = async (
  tenantId: number,
  userId: number | null,
  defaultBranchId: number | null,
  input: SyncOfflineBatchInput
) => {
  const startedAt = Date.now();

  return await db.transaction(async (tx) => {
    // 1. Idempotency check on batchReference
    const [existingBatch] = await tx
      .select()
      .from(offlineSyncBatches)
      .where(
        and(
          eq(offlineSyncBatches.tenantId, tenantId),
          eq(offlineSyncBatches.batchReference, input.batchReference)
        )
      )
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
      .from(offlineSettings)
      .where(eq(offlineSettings.tenantId, tenantId))
      .limit(1);

    if (policy && !policy.allowOfflineSales) {
      throw new Error('Offline sales reconciliation is disabled by tenant survivability policy.');
    }

    const reconciledKeys: string[] = [];
    const reconciledOrderNumbers: string[] = [];
    const skippedDuplicates: string[] = [];
    const conflicts: Array<{ idempotencyKey: string; reason: string }> = [];

    // 3. Process each queued offline order inside its own savepoint
    for (const queuedOrder of input.orders) {
      try {
        await tx.transaction(async (subTx) => {
          // 3a. Order-level idempotency check
          const [dupOrder] = await subTx
            .select({ id: orders.id, orderNumber: orders.orderNumber })
            .from(orders)
            .where(
              and(
                eq(orders.tenantId, tenantId),
                eq(orders.idempotencyKey, queuedOrder.idempotencyKey)
              )
            )
            .limit(1);

          if (dupOrder) {
            skippedDuplicates.push(queuedOrder.idempotencyKey);
            reconciledKeys.push(queuedOrder.idempotencyKey);
            return;
          }

          // 3b. Validate all menu items belong to this tenant
          const uniqueMenuIds = Array.from(
            new Set(queuedOrder.items.map((item) => item.menuItemId))
          );
          const ownedMenuItems = await subTx
            .select({ id: menuItems.id, costEstimate: menuItems.costEstimate })
            .from(menuItems)
            .where(
              and(eq(menuItems.tenantId, tenantId), inArray(menuItems.id, uniqueMenuIds))
            );

          if (ownedMenuItems.length !== uniqueMenuIds.length) {
            throw new Error('One or more menu items in offline order no longer exist for this tenant.');
          }

          const costByMenuId = new Map(
            ownedMenuItems.map((m) => [m.id, parseFloat(m.costEstimate) || 0])
          );

          const effectiveBranchId =
            queuedOrder.branchId ?? input.branchId ?? defaultBranchId ?? null;
          const orderNumber = `OFF-${Date.now().toString().slice(-6)}-${Math.floor(
            100 + Math.random() * 900
          )}`;

          const createdAt =
            policy?.conflictResolutionStrategy === 'CLIENT_TIMESTAMP_WINS' &&
            queuedOrder.clientCreatedAt
              ? new Date(queuedOrder.clientCreatedAt)
              : new Date();

          const [createdOrder] = await subTx
            .insert(orders)
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
          await subTx.insert(orderItems).values(
            queuedOrder.items.map((line) => ({
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
            }))
          );

          // 3d. Post Inbound AR Payment Ledger entry
          const paymentNumber = `PMT-OFF-${Date.now().toString().slice(-6)}-${Math.floor(
            100 + Math.random() * 900
          )}`;
          const normalizedMethod = queuedOrder.paymentMethod.toUpperCase().includes('MPESA')
            ? 'MPESA_C2B_OFFLINE'
            : queuedOrder.paymentMethod.toUpperCase().includes('CARD')
              ? 'CREDIT_CARD'
              : 'CASH_DRAWER';

          await subTx.insert(payments).values({
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
            await deductOrderInventoryInTx(subTx, {
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
          } catch (stockErr) {
            if (policy?.conflictResolutionStrategy === 'MANUAL_REVIEW') {
              throw stockErr;
            }
            // In timestamp-wins modes, keep the completed sale and log a stock variance conflict
            conflicts.push({
              idempotencyKey: queuedOrder.idempotencyKey,
              reason:
                stockErr instanceof Error
                  ? `Order ${orderNumber} saved with stock variance: ${stockErr.message}`
                  : `Order ${orderNumber} saved with stock variance`,
            });
          }

          reconciledKeys.push(queuedOrder.idempotencyKey);
          reconciledOrderNumbers.push(createdOrder.orderNumber);
        });
      } catch (orderErr: unknown) {
        conflicts.push({
          idempotencyKey: queuedOrder.idempotencyKey,
          reason:
            orderErr instanceof Error ? orderErr.message : 'Failed to reconcile offline order.',
        });
      }
    }

    const syncDurationMs = Math.max(1, Date.now() - startedAt);
    const batchStatus =
      conflicts.length === 0
        ? 'PROCESSED'
        : reconciledOrderNumbers.length > 0 || skippedDuplicates.length > 0
          ? 'CONFLICT_DETECTED'
          : 'FAILED';

    const [batch] = await tx
      .insert(offlineSyncBatches)
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