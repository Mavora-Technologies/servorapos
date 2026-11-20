// apps/api/src/repositories/combo.repository.ts
import { eq, and, desc, inArray, ne } from 'drizzle-orm';
import { db } from '../config/db';
import { comboBundles, comboBundleItems, menuItems } from '../config/schema';
import type {
  CreateComboBundleInput,
  UpdateComboBundleInput,
} from '../validators/combo.validator';

export interface ComboBundleItemRecord {
  id: number;
  comboId: number;
  menuItemId: number;
  quantity: number;
  additionalPrice: string;
  itemName: string | null;
  itemPrice: string | null;
  itemIsAvailable: boolean | null;
}

export interface ComboBundleWithItems {
  id: number;
  tenantId: number;
  branchId: number | null;
  name: string;
  description: string | null;
  sku: string | null;
  basePrice: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  standaloneTotal: number;
  items: ComboBundleItemRecord[];
}

export const findCombosByTenant = async (
  tenantId: number
): Promise<ComboBundleWithItems[]> => {
  const combos = await db
    .select()
    .from(comboBundles)
    .where(eq(comboBundles.tenantId, tenantId))
    .orderBy(desc(comboBundles.createdAt));

  if (combos.length === 0) {
    return [];
  }

  const comboIds = combos.map((c) => c.id);

  const items = await db
    .select({
      id: comboBundleItems.id,
      comboId: comboBundleItems.comboId,
      menuItemId: comboBundleItems.menuItemId,
      quantity: comboBundleItems.quantity,
      additionalPrice: comboBundleItems.additionalPrice,
      itemName: menuItems.name,
      itemPrice: menuItems.price,
      itemIsAvailable: menuItems.isAvailable,
    })
    .from(comboBundleItems)
    .innerJoin(
      menuItems,
      and(eq(comboBundleItems.menuItemId, menuItems.id), eq(menuItems.tenantId, tenantId))
    )
    .where(inArray(comboBundleItems.comboId, comboIds));

  return combos.map((combo) => {
    const comboItems = items.filter((item) => item.comboId === combo.id);
    const standaloneTotal = comboItems.reduce((sum, line) => {
      const unitPrice = parseFloat(line.itemPrice || '0') || 0;
      const addPrice = parseFloat(line.additionalPrice || '0') || 0;
      return sum + (unitPrice + addPrice) * line.quantity;
    }, 0);

    return {
      ...combo,
      standaloneTotal: Number(standaloneTotal.toFixed(2)),
      items: comboItems,
    };
  });
};

export const createComboTransaction = async (
  tenantId: number,
  branchId: number | null,
  payload: CreateComboBundleInput
) => {
  return await db.transaction(async (tx) => {
    // 1. Validate tenant-scoped SKU uniqueness if provided
    if (payload.sku) {
      const [dupSku] = await tx
        .select({ id: comboBundles.id })
        .from(comboBundles)
        .where(and(eq(comboBundles.tenantId, tenantId), eq(comboBundles.sku, payload.sku)));
      if (dupSku) {
        throw new Error(`SKU "${payload.sku}" is already assigned to another combo bundle.`);
      }
    }

    // 2. Validate all referenced menu items belong to this tenant
    const uniqueMenuItemIds = Array.from(new Set(payload.items.map((i) => i.menuItemId)));
    const matchedMenuItems = await tx
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(
        and(eq(menuItems.tenantId, tenantId), inArray(menuItems.id, uniqueMenuItemIds))
      );

    if (matchedMenuItems.length !== uniqueMenuItemIds.length) {
      throw new Error(
        'One or more selected menu items do not exist or do not belong to this tenant.'
      );
    }

    // 3. Merge duplicate menuItemId lines cleanly
    const mergedByItem = new Map<number, { quantity: number; additionalPrice: number }>();
    for (const item of payload.items) {
      const prev = mergedByItem.get(item.menuItemId);
      if (prev) {
        prev.quantity += item.quantity;
        prev.additionalPrice = Math.max(prev.additionalPrice, item.additionalPrice);
      } else {
        mergedByItem.set(item.menuItemId, {
          quantity: item.quantity,
          additionalPrice: item.additionalPrice,
        });
      }
    }

    // 4. Insert bundle header and lines atomically
    const [newCombo] = await tx
      .insert(comboBundles)
      .values({
        tenantId,
        branchId,
        name: payload.name,
        description: payload.description ?? null,
        sku: payload.sku ?? null,
        basePrice: payload.basePrice.toFixed(2),
        isAvailable: payload.isAvailable,
      })
      .returning();

    const lineInserts = Array.from(mergedByItem.entries()).map(([menuItemId, line]) => ({
      comboId: newCombo.id,
      menuItemId,
      quantity: line.quantity,
      additionalPrice: line.additionalPrice.toFixed(2),
    }));

    await tx.insert(comboBundleItems).values(lineInserts);

    return newCombo;
  });
};

export const updateComboTransaction = async (
  tenantId: number,
  comboId: number,
  payload: UpdateComboBundleInput
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: comboBundles.id })
      .from(comboBundles)
      .where(and(eq(comboBundles.id, comboId), eq(comboBundles.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return null;
    }

    if (payload.sku) {
      const [dupSku] = await tx
        .select({ id: comboBundles.id })
        .from(comboBundles)
        .where(
          and(
            eq(comboBundles.tenantId, tenantId),
            eq(comboBundles.sku, payload.sku),
            ne(comboBundles.id, comboId)
          )
        );
      if (dupSku) {
        throw new Error(`SKU "${payload.sku}" is already assigned to another combo bundle.`);
      }
    }

    const updateFields: Partial<typeof comboBundles.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) updateFields.name = payload.name;
    if (payload.description !== undefined) updateFields.description = payload.description;
    if (payload.sku !== undefined) updateFields.sku = payload.sku;
    if (payload.basePrice !== undefined) updateFields.basePrice = payload.basePrice.toFixed(2);
    if (payload.isAvailable !== undefined) updateFields.isAvailable = payload.isAvailable;

    if (payload.items !== undefined) {
      if (payload.items.length === 0) {
        throw new Error('A combo bundle must include at least one menu item.');
      }

      const uniqueMenuItemIds = Array.from(new Set(payload.items.map((i) => i.menuItemId)));
      const matchedMenuItems = await tx
        .select({ id: menuItems.id })
        .from(menuItems)
        .where(
          and(eq(menuItems.tenantId, tenantId), inArray(menuItems.id, uniqueMenuItemIds))
        );

      if (matchedMenuItems.length !== uniqueMenuItemIds.length) {
        throw new Error(
          'One or more selected menu items do not exist or do not belong to this tenant.'
        );
      }

      const mergedByItem = new Map<number, { quantity: number; additionalPrice: number }>();
      for (const item of payload.items) {
        const prev = mergedByItem.get(item.menuItemId);
        if (prev) {
          prev.quantity += item.quantity;
          prev.additionalPrice = Math.max(prev.additionalPrice, item.additionalPrice);
        } else {
          mergedByItem.set(item.menuItemId, {
            quantity: item.quantity,
            additionalPrice: item.additionalPrice,
          });
        }
      }

      await tx.delete(comboBundleItems).where(eq(comboBundleItems.comboId, comboId));

      await tx.insert(comboBundleItems).values(
        Array.from(mergedByItem.entries()).map(([menuItemId, line]) => ({
          comboId,
          menuItemId,
          quantity: line.quantity,
          additionalPrice: line.additionalPrice.toFixed(2),
        }))
      );
    }

    const [updated] = await tx
      .update(comboBundles)
      .set(updateFields)
      .where(and(eq(comboBundles.id, comboId), eq(comboBundles.tenantId, tenantId)))
      .returning();

    return updated ?? null;
  });
};

export const deleteComboRecord = async (tenantId: number, comboId: number) => {
  const [deleted] = await db
    .delete(comboBundles)
    .where(and(eq(comboBundles.id, comboId), eq(comboBundles.tenantId, tenantId)))
    .returning({ id: comboBundles.id });

  return deleted ?? null;
};