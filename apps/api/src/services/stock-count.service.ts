// apps/api/src/services/stock-count.service.ts
import * as stockCountRepo from '../repositories/stock-count.repository';
import type {
  InitiateStockCountInput,
  UpdateCountLineInput,
  ReconcileStockCountInput,
} from '../validators/stock-count.validator';

export const listTenantStockCounts = async (tenantId: number) => {
  return await stockCountRepo.findStockCountsByTenant(tenantId);
};

export const fetchStockCountSheet = async (tenantId: number, countId: number) => {
  if (!Number.isInteger(countId) || countId <= 0) {
    throw new Error('Invalid stock count ID');
  }
  return await stockCountRepo.findStockCountDetailsById(tenantId, countId);
};

export const startStockCountSession = async (
  tenantId: number,
  branchId: number | null,
  userId: number | null,
  payload: InitiateStockCountInput
) => {
  return await stockCountRepo.createStockCountSessionTransaction(
    tenantId,
    branchId,
    userId,
    payload
  );
};

export const recordPhysicalCountLine = async (
  tenantId: number,
  lineId: number,
  payload: UpdateCountLineInput
) => {
  if (!Number.isInteger(lineId) || lineId <= 0) {
    throw new Error('Invalid stock count line ID');
  }
  return await stockCountRepo.updateStockCountLineTransaction(tenantId, lineId, payload);
};

export const finalizeStockCountReconciliation = async (
  tenantId: number,
  branchId: number | null,
  userId: number | null,
  countId: number,
  payload: ReconcileStockCountInput
) => {
  if (!Number.isInteger(countId) || countId <= 0) {
    throw new Error('Invalid stock count ID');
  }
  return await stockCountRepo.reconcileStockCountTransaction(
    tenantId,
    branchId,
    userId,
    countId,
    payload
  );
};