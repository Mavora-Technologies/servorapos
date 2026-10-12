import * as menuRepo from '../repositories/menu.repository';
import { CreateCategoryInput, CreateMenuItemInput } from '../validators/menu.validator';

export const addCategory = async (tenantId: number, data: CreateCategoryInput) => {
  return await menuRepo.createCategory(tenantId, data);
};

export const addMenuItem = async (tenantId: number, data: CreateMenuItemInput) => {
  return await menuRepo.createMenuItem(tenantId, data);
};

export const fetchActiveMenu = async (tenantId: number) => {
  const { categories, items } = await menuRepo.getActiveMenu(tenantId);
  
  // Format the payload perfectly for the POS frontend interface
  return {
    categories: categories.map(c => c.name),
    items: items.map(i => ({
      id: i.id.toString(),
      name: i.name,
      price: parseFloat(i.price as string), // Convert decimal string back to number for frontend calculation
      isAvailable: i.isAvailable,
      image: i.imageUrl,
      category: categories.find(c => c.id === i.categoryId)?.name || 'Uncategorized'
    }))
  };
};