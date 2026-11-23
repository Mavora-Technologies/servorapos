// apps/api/src/services/unit-conversion.service.ts
import * as unitConversionRepo from '../repositories/unit-conversion.repository';
import type {
  CreateUnitConversionInput,
  UpdateUnitConversionInput,
} from '../validators/unit-conversion.validator';

export const listTenantUnitConversions = async (tenantId: number) => {
  return await unitConversionRepo.findUnitConversionsByTenant(tenantId);
};

export const registerUnitConversion = async (
  tenantId: number,
  payload: CreateUnitConversionInput
) => {
  return await unitConversionRepo.createUnitConversionTransaction(tenantId, payload);
};

export const modifyUnitConversion = async (
  tenantId: number,
  conversionId: number,
  payload: UpdateUnitConversionInput
) => {
  if (!Number.isInteger(conversionId) || conversionId <= 0) {
    throw new Error('Invalid unit conversion ID');
  }
  return await unitConversionRepo.updateUnitConversionTransaction(
    tenantId,
    conversionId,
    payload
  );
};

export const removeUnitConversion = async (tenantId: number, conversionId: number) => {
  if (!Number.isInteger(conversionId) || conversionId <= 0) {
    throw new Error('Invalid unit conversion ID');
  }
  return await unitConversionRepo.deleteUnitConversionRecord(tenantId, conversionId);
};