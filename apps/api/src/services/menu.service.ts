// apps/api/src/services/menu.service.ts
import * as menuRepo from '../repositories/menu.repository';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from '../validators/menu.validator';

export const addCategory = async (tenantId: number, data: CreateCategoryInput) => {
  return await menuRepo.createCategory(tenantId, data);
};

export const modifyCategory = async (
  tenantId: number,
  categoryId: number,
  data: UpdateCategoryInput
) => {
  return await menuRepo.updateCategoryRecord(tenantId, categoryId, data);
};

export const removeCategory = async (tenantId: number, categoryId: number) => {
  return await menuRepo.deleteCategoryRecord(tenantId, categoryId);
};

export const addMenuItem = async (tenantId: number, data: CreateMenuItemInput) => {
  return await menuRepo.createMenuItemTransaction(tenantId, data);
};

export const modifyMenuItem = async (
  tenantId: number,
  itemId: number,
  data: UpdateMenuItemInput
) => {
  return await menuRepo.updateMenuItemTransaction(tenantId, itemId, data);
};

export const removeMenuItem = async (tenantId: number, itemId: number) => {
  return await menuRepo.deleteMenuItemRecord(tenantId, itemId);
};

export const fetchMenuCatalog = async (tenantId: number, branchId?: number) => {
  return await menuRepo.getMenuCatalogWithLinks(tenantId, branchId);
};

// Preserved backward-compatible contract for POS terminals
export const fetchActiveMenu = async (tenantId: number, branchId?: number) => {
  const { categories, items } = await menuRepo.getActiveMenu(tenantId, branchId);

  return {
    categories: categories.map((c) => c.name),
    categoryRecords: categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
    })),
    items: items.map((i) => ({
      id: i.id.toString(),
      categoryId: i.categoryId,
      name: i.name,
      sku: i.sku || undefined,
      price: parseFloat(i.price as string),
      costEstimate: parseFloat(i.costEstimate as string),
      stockTrackingType: i.stockTrackingType,
      directInventoryItemId: i.directInventoryItemId,
      kitchenStation: i.kitchenStation,
      isAvailable: i.isAvailable,
      image: i.imageUrl,
      category: categories.find((c) => c.id === i.categoryId)?.name || 'Uncategorized',
    })),
  };
};

export const fetchCategories = async (
  tenantId: number,
  branchId?: number,
  includeInactive = false
) => {
  return await menuRepo.getCategories(tenantId, branchId, includeInactive);
};