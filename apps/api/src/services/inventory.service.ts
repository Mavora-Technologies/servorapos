// apps/api/src/services/inventory.service.ts
import * as inventoryRepo from '../repositories/inventory.repository';
import type {
  MaterialType,
  ValuationMethod,
  TaxClassification,
  MovementType,
} from '../repositories/inventory.repository';

const VALID_MATERIAL_TYPES: MaterialType[] = [
  'RAW_MATERIAL',
  'SEMI_FINISHED',
  'FINISHED_GOOD',
  'CONSUMABLE',
];

const VALID_VALUATION_METHODS: ValuationMethod[] = ['FIFO', 'AVCO', 'STANDARD'];
const VALID_TAX_CLASSIFICATIONS: TaxClassification[] = ['A_16', 'B_ZERO', 'E_EXEMPT'];
const VALID_MOVEMENT_TYPES: MovementType[] = [
  'GOODS_RECEIPT_PO',
  'POS_RECIPE_DEPLETION',
  'PHYSICAL_INVENTORY_ADJ',
  'WASTE_SCRAP',
  'SUPPLIER_RETURN',
  'STORNO_REVERSAL',
  'TRANSFER',
];

export const fetchInventoryItems = async (tenantId: number) => {
  return await inventoryRepo.getItemsByTenant(tenantId);
};

export const fetchInventorySummary = async (tenantId: number) => {
  return await inventoryRepo.getInventorySummaryByTenant(tenantId);
};

export const fetchStorageLocations = async (tenantId: number) => {
  return await inventoryRepo.getStorageLocationsByTenant(tenantId);
};

export const fetchActiveSuppliers = async (tenantId: number) => {
  return await inventoryRepo.getSuppliersByTenant(tenantId);
};

export const addInventoryItem = async (
  tenantId: number,
  userId: number | null,
  branchId: number | null,
  data: {
    name?: string;
    sku?: string;
    barcode?: string;
    materialType?: string;
    category?: string;
    unit?: string;
    purchaseUnit?: string;
    conversionFactor?: number | string;
    preferredSupplierId?: number | null;
    currentStock?: number | string;
    minThreshold?: number | string;
    reorderQuantity?: number | string;
    costPrice?: number | string;
    valuationMethod?: string;
    storageCondition?: string;
    taxClassification?: string;
    allowNegativeStock?: boolean;
    isActive?: boolean;
  }
) => {
  const trimmedName = data.name?.trim();
  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Article description must be at least 2 characters');
  }
  if (!data.category?.trim()) {
    throw new Error('Category is required');
  }
  if (!data.unit?.trim()) {
    throw new Error('Base tracking unit is required');
  }

  const parsedCost = Number(data.costPrice ?? 0);
  if (Number.isNaN(parsedCost) || parsedCost < 0) {
    throw new Error('Standard cost must be zero or greater');
  }

  const parsedConversion = Number(data.conversionFactor ?? 1);
  if (Number.isNaN(parsedConversion) || parsedConversion <= 0) {
    throw new Error('Unit conversion factor must be greater than zero');
  }

  const parsedOpeningStock = Number(data.currentStock ?? 0);
  if (Number.isNaN(parsedOpeningStock) || parsedOpeningStock < 0) {
    throw new Error('Opening stock cannot be negative');
  }

  const parsedMinThreshold = Number(data.minThreshold ?? 0);
  const parsedReorderQty = Number(data.reorderQuantity ?? 0);

  const materialType: MaterialType = VALID_MATERIAL_TYPES.includes(
    data.materialType as MaterialType
  )
    ? (data.materialType as MaterialType)
    : 'RAW_MATERIAL';

  const valuationMethod: ValuationMethod = VALID_VALUATION_METHODS.includes(
    data.valuationMethod as ValuationMethod
  )
    ? (data.valuationMethod as ValuationMethod)
    : 'FIFO';

  const taxClassification: TaxClassification = VALID_TAX_CLASSIFICATIONS.includes(
    data.taxClassification as TaxClassification
  )
    ? (data.taxClassification as TaxClassification)
    : 'A_16';

  return await inventoryRepo.createInventoryItemRecord(tenantId, {
    branchId,
    userId,
    name: trimmedName,
    sku: data.sku?.trim() || null,
    barcode: data.barcode?.trim() || null,
    materialType,
    category: data.category.trim(),
    unit: data.unit.trim(),
    purchaseUnit: data.purchaseUnit?.trim() || null,
    conversionFactor: parsedConversion.toFixed(4),
    preferredSupplierId:
      data.preferredSupplierId && !Number.isNaN(Number(data.preferredSupplierId))
        ? Number(data.preferredSupplierId)
        : null,
    openingStock: parsedOpeningStock,
    minThreshold: (!Number.isNaN(parsedMinThreshold) && parsedMinThreshold >= 0
      ? parsedMinThreshold
      : 0
    ).toFixed(4),
    reorderQuantity: (!Number.isNaN(parsedReorderQty) && parsedReorderQty >= 0
      ? parsedReorderQty
      : 0
    ).toFixed(4),
    costPrice: parsedCost.toFixed(4),
    valuationMethod,
    storageCondition: data.storageCondition?.trim() || 'DRY_AMBIENT',
    taxClassification,
    allowNegativeStock: Boolean(data.allowNegativeStock),
    isActive: data.isActive ?? true,
  });
};

export const processStockAdjustment = async (
  tenantId: number,
  data: {
    itemId: number;
    branchId: number | null;
    userId: number | null;
    adjustment: number;
    type: string;
    locationId?: number | null;
    locationBin?: string | null;
    batchNumber?: string | null;
    documentReference?: string | null;
    notes?: string | null;
  }
) => {
  if (!data.itemId || Number.isNaN(Number(data.itemId))) {
    throw new Error('Valid inventory item ID is required');
  }
  if (typeof data.adjustment !== 'number' || Number.isNaN(data.adjustment) || data.adjustment === 0) {
    throw new Error('Quantity delta must be a non-zero number');
  }
  if (!VALID_MOVEMENT_TYPES.includes(data.type as MovementType)) {
    throw new Error(`Unsupported movement type: ${data.type}`);
  }
  if (data.type === 'GOODS_RECEIPT_PO' && data.adjustment <= 0) {
    throw new Error('Goods receipt quantity must be greater than zero');
  }
  if (data.type === 'WASTE_SCRAP' && data.adjustment >= 0) {
    throw new Error('Waste/scrap quantity delta must be negative');
  }

  return await inventoryRepo.adjustStockTransaction(tenantId, {
    itemId: Number(data.itemId),
    branchId: data.branchId,
    userId: data.userId,
    adjustment: data.adjustment,
    type: data.type as MovementType,
    locationId: data.locationId ?? null,
    locationBin: data.locationBin?.trim() || null,
    batchNumber: data.batchNumber?.trim() || null,
    documentReference: data.documentReference?.trim() || null,
    notes: data.notes?.trim() || null,
  });
};