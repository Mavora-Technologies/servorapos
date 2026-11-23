// apps/api/src/services/menu.service.ts
import * as menuRepo from '../repositories/menu.repository';
import {
  isRuleCurrentlyActive,
  computeRuleAdjustedPrice,
} from './pricing.service';
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

// Evaluates live scheduled tariff rules for POS terminals (branch-specific rules take priority)
export const fetchActiveMenu = async (tenantId: number, branchId?: number) => {
  const { categories, items, pricingRules } = await menuRepo.getActiveMenu(tenantId, branchId);
  const now = new Date();

  return {
    categories: categories.map((c) => c.name),
    categoryRecords: categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
    })),
    items: items.map((i) => {
      const basePrice = parseFloat(i.price as string) || 0;
      const itemRules = pricingRules.filter((r) => r.menuItemId === i.id);

      // Prefer an active branch-specific rule; fall back to an active tenant-wide rule
      const activeRule =
        (branchId
          ? itemRules.find((r) => r.branchId === branchId && isRuleCurrentlyActive(r, now))
          : undefined) ??
        itemRules.find((r) => isRuleCurrentlyActive(r, now)) ??
        null;

      const effectivePrice = activeRule
        ? computeRuleAdjustedPrice(basePrice, activeRule.ruleType, parseFloat(activeRule.value) || 0)
        : basePrice;

      return {
        id: i.id.toString(),
        categoryId: i.categoryId,
        name: i.name,
        sku: i.sku || undefined,
        price: effectivePrice,
        originalPrice: basePrice,
        activePricingRule: activeRule
          ? {
              id: activeRule.id,
              ruleName: activeRule.ruleName,
              ruleType: activeRule.ruleType,
            }
          : null,
        costEstimate: parseFloat(i.costEstimate as string),
        stockTrackingType: i.stockTrackingType,
        directInventoryItemId: i.directInventoryItemId,
        kitchenStation: i.kitchenStation,
        isAvailable: i.isAvailable,
        image: i.imageUrl,
        category: categories.find((c) => c.id === i.categoryId)?.name || 'Uncategorized',
      };
    }),
  };
};

export const fetchCategories = async (
  tenantId: number,
  branchId?: number,
  includeInactive = false
) => {
  return await menuRepo.getCategories(tenantId, branchId, includeInactive);
};