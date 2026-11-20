// apps/api/src/services/modifier.service.ts
import * as modifierRepo from '../repositories/modifier.repository';
import type {
  CreateModifierGroupInput,
  UpdateModifierGroupInput,
} from '../validators/modifier.validator';

export const listTenantModifierGroups = async (tenantId: number) => {
  return await modifierRepo.findModifierGroupsByTenant(tenantId);
};

export const registerModifierGroup = async (
  tenantId: number,
  payload: CreateModifierGroupInput
) => {
  return await modifierRepo.createModifierGroupTransaction(tenantId, payload);
};

export const modifyModifierGroup = async (
  tenantId: number,
  groupId: number,
  payload: UpdateModifierGroupInput
) => {
  if (!Number.isInteger(groupId) || groupId <= 0) {
    throw new Error('Invalid modifier group ID');
  }
  return await modifierRepo.updateModifierGroupTransaction(tenantId, groupId, payload);
};

export const removeModifierGroup = async (tenantId: number, groupId: number) => {
  if (!Number.isInteger(groupId) || groupId <= 0) {
    throw new Error('Invalid modifier group ID');
  }
  return await modifierRepo.deleteModifierGroupRecord(tenantId, groupId);
};