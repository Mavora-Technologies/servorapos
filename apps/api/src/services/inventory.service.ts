import * as inventoryRepo from '../repositories/inventory.repository';

export const fetchInventoryItems = async (tenantId: number) => {
  return await inventoryRepo.getItemsByTenant(tenantId);
};

export const addInventoryItem = async (tenantId: number, data: {
  name: string;
  sku?: string;
  category: string;
  unit: string;
  currentStock?: number;
  minThreshold?: number;
  costPrice: number;
}) => {
  return await inventoryRepo.createInventoryItemRecord(tenantId, {
    name: data.name,
    sku: data.sku,
    category: data.category,
    unit: data.unit,
    currentStock: (data.currentStock || 0).toString(),
    minThreshold: (data.minThreshold || 0).toString(),
    costPrice: data.costPrice.toString(),
  });
};

export const processStockAdjustment = async (tenantId: number, data: {
  itemId: number;
  adjustment: number;
  type: string;
  notes?: string;
}) => {
  return await inventoryRepo.adjustStockTransaction(tenantId, data);
};