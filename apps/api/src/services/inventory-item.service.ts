// apps/api/src/services/inventory-item.service.ts
import * as inventoryItemRepo from '../repositories/inventory-item.repository';
import type {
  CreateInventoryItemMasterInput,
  UpdateInventoryItemMasterInput,
} from '../validators/inventory-item.validator';

export const fetchInventoryMasterCatalog = async (tenantId: number) => {
  const [items, summary] = await Promise.all([
    inventoryItemRepo.findAllMasterItemsByTenant(tenantId),
    inventoryItemRepo.getMasterCatalogSummaryByTenant(tenantId),
  ]);

  return { summary, items };
};

export const registerInventoryMasterItem = async (
  tenantId: number,
  branchId: number | null,
  userId: number | null,
  payload: CreateInventoryItemMasterInput
) => {
  return await inventoryItemRepo.createMasterItemTransaction(
    tenantId,
    branchId,
    userId,
    payload
  );
};

export const modifyInventoryMasterItem = async (
  tenantId: number,
  itemId: number,
  payload: UpdateInventoryItemMasterInput
) => {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    throw new Error('Invalid inventory item ID');
  }

  return await inventoryItemRepo.updateMasterItemRecord(tenantId, itemId, payload);
};

export const removeInventoryMasterItem = async (tenantId: number, itemId: number) => {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    throw new Error('Invalid inventory item ID');
  }

  return await inventoryItemRepo.deleteMasterItemRecord(tenantId, itemId);
};