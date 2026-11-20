// apps/api/src/services/combo.service.ts
import * as comboRepo from '../repositories/combo.repository';
import type {
  CreateComboBundleInput,
  UpdateComboBundleInput,
} from '../validators/combo.validator';

export const listTenantCombos = async (tenantId: number) => {
  return await comboRepo.findCombosByTenant(tenantId);
};

export const registerComboBundle = async (
  tenantId: number,
  branchId: number | null,
  payload: CreateComboBundleInput
) => {
  return await comboRepo.createComboTransaction(tenantId, branchId, payload);
};

export const modifyComboBundle = async (
  tenantId: number,
  comboId: number,
  payload: UpdateComboBundleInput
) => {
  if (!Number.isInteger(comboId) || comboId <= 0) {
    throw new Error('Invalid combo bundle ID');
  }
  return await comboRepo.updateComboTransaction(tenantId, comboId, payload);
};

export const removeComboBundle = async (tenantId: number, comboId: number) => {
  if (!Number.isInteger(comboId) || comboId <= 0) {
    throw new Error('Invalid combo bundle ID');
  }
  return await comboRepo.deleteComboRecord(tenantId, comboId);
};