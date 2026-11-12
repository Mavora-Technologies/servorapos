// apps/api/src/services/menu.service.ts
import * as menuRepo from '../repositories/menu.repository';
import { CreateCategoryInput, CreateMenuItemInput } from '../validators/menu.validator';

export const addCategory = async (tenantId: number, data: CreateCategoryInput) => {
  return await menuRepo.createCategory(tenantId, data);
};

export const addMenuItem = async (tenantId: number, data: CreateMenuItemInput) => {
  return await menuRepo.createMenuItem(tenantId, data);
};

export const fetchActiveMenu = async (tenantId: number, branchId?: number) => {
  const { categories, items } = await menuRepo.getActiveMenu(tenantId, branchId);

  return {
    categories: categories.map((c) => c.name),
    items: items.map((i) => ({
      id: i.id.toString(),
      name: i.name,
      sku: i.sku || undefined,
      price: parseFloat(i.price as string),
      isAvailable: i.isAvailable,
      image: i.imageUrl,
      category: categories.find((c) => c.id === i.categoryId)?.name || 'Uncategorized',
    })),
  };
};

export const fetchCategories = async (tenantId: number, branchId?: number) => {
  return await menuRepo.getCategories(tenantId, branchId);
};