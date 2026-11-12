// apps/api/src/repositories/menu.repository.ts
import { eq, and, or, isNull, asc } from 'drizzle-orm';
import { db } from '../config/db';
import { menuCategories, menuItems } from '../config/schema';

export const createCategory = async (
  tenantId: number,
  data: { name: string; description?: string; branchId?: number | null }
) => {
  const [category] = await db
    .insert(menuCategories)
    .values({
      tenantId,
      branchId: data.branchId ?? null,
      name: data.name,
      description: data.description,
    })
    .returning();
  return category;
};

export const createMenuItem = async (tenantId: number, data: any) => {
  const [item] = await db
    .insert(menuItems)
    .values({
      tenantId,
      branchId: data.branchId ?? null,
      categoryId: data.categoryId,
      name: data.name,
      sku: data.sku,
      description: data.description,
      price: data.price.toString(), // PostgreSQL decimal requires string input
      isAvailable: data.isAvailable ?? true,
      imageUrl: data.imageUrl,
    })
    .returning();
  return item;
};

export const getActiveMenu = async (tenantId: number, branchId?: number) => {
  const categoryFilter = branchId
    ? and(
        eq(menuCategories.tenantId, tenantId),
        eq(menuCategories.isActive, true),
        or(eq(menuCategories.branchId, branchId), isNull(menuCategories.branchId))
      )
    : and(eq(menuCategories.tenantId, tenantId), eq(menuCategories.isActive, true));

  const itemFilter = branchId
    ? and(
        eq(menuItems.tenantId, tenantId),
        eq(menuItems.isAvailable, true),
        or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId))
      )
    : and(eq(menuItems.tenantId, tenantId), eq(menuItems.isAvailable, true));

  const [categories, items] = await Promise.all([
    db
      .select()
      .from(menuCategories)
      .where(categoryFilter)
      .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name)),
    db
      .select()
      .from(menuItems)
      .where(itemFilter)
      .orderBy(asc(menuItems.name)),
  ]);

  return { categories, items };
};

export const getCategories = async (tenantId: number, branchId?: number) => {
  const filter = branchId
    ? and(
        eq(menuCategories.tenantId, tenantId),
        eq(menuCategories.isActive, true),
        or(eq(menuCategories.branchId, branchId), isNull(menuCategories.branchId))
      )
    : and(eq(menuCategories.tenantId, tenantId), eq(menuCategories.isActive, true));

  return await db
    .select()
    .from(menuCategories)
    .where(filter)
    .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name));
};