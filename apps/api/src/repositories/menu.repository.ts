import { eq, and } from 'drizzle-orm';
import { db } from '../config/db';
import { menuCategories, menuItems } from '../config/schema';

export const createCategory = async (tenantId: number, data: { name: string; description?: string }) => {
  const [category] = await db.insert(menuCategories).values({
    tenantId,
    name: data.name,
    description: data.description,
  }).returning();
  return category;
};

export const createMenuItem = async (tenantId: number, data: any) => {
  const [item] = await db.insert(menuItems).values({
    tenantId,
    categoryId: data.categoryId,
    name: data.name,
    sku: data.sku,
    description: data.description,
    price: data.price.toString(), // PostgreSQL decimal requires string input
    isAvailable: data.isAvailable,
    imageUrl: data.imageUrl,
  }).returning();
  return item;
};

export const getActiveMenu = async (tenantId: number) => {
  const categories = await db.select().from(menuCategories).where(eq(menuCategories.tenantId, tenantId));
  const items = await db.select().from(menuItems).where(
    and(
      eq(menuItems.tenantId, tenantId),
      eq(menuItems.isAvailable, true)
    )
  );
  return { categories, items };
};