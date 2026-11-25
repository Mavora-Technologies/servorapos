// apps/api/src/services/offline-settings.service.ts
import * as offlineRepo from '../repositories/offline-settings.repository';
import type {
  UpdateOfflineSettingsInput,
  SyncOfflineBatchInput,
} from '../validators/offline-settings.validator';

export const fetchOfflineOverview = async (tenantId: number, branchId?: number) => {
  const [settings, batches, telemetry] = await Promise.all([
    offlineRepo.findOfflineSettingsByTenant(tenantId),
    offlineRepo.listSyncBatches(tenantId, branchId),
    offlineRepo.getSyncTelemetry(tenantId),
  ]);

  return {
    settings,
    batches,
    telemetry,
  };
};

export const saveOfflineSettings = async (
  tenantId: number,
  input: UpdateOfflineSettingsInput
) => {
  return await offlineRepo.upsertOfflineSettingsTransaction(tenantId, input);
};

export const reconcileOfflineBatch = async (
  tenantId: number,
  userId: number | null,
  defaultBranchId: number | null,
  input: SyncOfflineBatchInput
) => {
  return await offlineRepo.reconcileOfflineBatchTransaction(
    tenantId,
    userId,
    defaultBranchId,
    input
  );
};