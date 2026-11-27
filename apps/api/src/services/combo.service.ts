// apps/api/src/services/combo.service.ts
import * as comboRepo from '../repositories/combo.repository';
import * as menuRepo from '../repositories/menu.repository';
import { destroyTenantCloudinaryImage } from '../utils/cloudinary';
import type {
  CreateComboBundleInput,
  UpdateComboBundleInput,
} from '../validators/combo.validator';

export interface ComboActorContext {
  userId: number;
  ipAddress?: string | null;
}

async function cleanupImageIfUnused(tenantId: number, publicId: string | null) {
  if (!publicId) return;
  const [usedInMenu, usedInCombos] = await Promise.all([
    menuRepo.isImagePublicIdReferenced(tenantId, publicId),
    comboRepo.isComboImagePublicIdReferenced(tenantId, publicId),
  ]);
  if (!usedInMenu && !usedInCombos) {
    void destroyTenantCloudinaryImage(tenantId, publicId);
  }
}

export const listTenantCombos = async (
  tenantId: number,
  options?: { branchId?: number; activeOnly?: boolean }
) => {
  return await comboRepo.findCombosByTenant(tenantId, options);
};

export const registerComboBundle = async (
  tenantId: number,
  branchId: number | null,
  payload: CreateComboBundleInput,
  actor: ComboActorContext
) => {
  return await comboRepo.createComboTransaction(tenantId, branchId, payload, actor);
};

export const modifyComboBundle = async (
  tenantId: number,
  comboId: number,
  payload: UpdateComboBundleInput,
  actor: ComboActorContext
) => {
  if (!Number.isInteger(comboId) || comboId <= 0) {
    throw new Error('Invalid combo bundle ID');
  }
  const result = await comboRepo.updateComboTransaction(tenantId, comboId, payload, actor);
  if (!result) return null;

  if (
    result.previousImagePublicId &&
    result.previousImagePublicId !== result.combo.imagePublicId
  ) {
    void cleanupImageIfUnused(tenantId, result.previousImagePublicId);
  }

  return result.combo;
};

export const removeComboBundle = async (
  tenantId: number,
  comboId: number,
  actor: ComboActorContext
) => {
  if (!Number.isInteger(comboId) || comboId <= 0) {
    throw new Error('Invalid combo bundle ID');
  }
  const deleted = await comboRepo.deleteComboRecord(tenantId, comboId, actor);
  if (deleted?.imagePublicId) {
    void cleanupImageIfUnused(tenantId, deleted.imagePublicId);
  }
  return deleted;
};