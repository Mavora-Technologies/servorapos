// apps/api/src/repositories/combo.repository.ts
import { eq, and, desc, inArray, ne, or, isNull, type SQL } from 'drizzle-orm';
import { db } from '../config/db';
import {
  comboBundles,
  comboBundleItems,
  menuItems,
  auditLogs,
} from '../config/schema';
import {
  assertPublicIdBelongsToTenant,
  buildOptimizedCloudinaryUrl,
} from '../utils/cloudinary';
import type {
  CreateComboBundleInput,
  UpdateComboBundleInput,
} from '../validators/combo.validator';

export interface ComboAuditActor {
  userId: number;
  ipAddress?: string | null;
}

export interface ComboBundleItemRecord {
  id: number;
  comboId: number;
  menuItemId: number;
  quantity: number;
  additionalPrice: string;
  itemName: string | null;
  itemPrice: string | null;
  itemIsAvailable: boolean | null;
  itemImageUrl: string | null;
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
  validFrom: Date | null;
  validUntil: Date | null;
  imageUrl: string | null;
  imageCardUrl: string | null;
  imageThumbUrl: string | null;
  imagePublicId: string | null;
  imageOriginalFilename: string | null;
  imageMimeType: string | null;
  imageFileSize: number | null;
  createdAt: Date;
  updatedAt: Date;
  standaloneTotal: number;
  savingsAmount: number;
  savingsPercent: number;
  pricingMode: 'DISCOUNTED' | 'EXACT' | 'PREMIUM';
  unavailableComponents: string[];
  isWithinSchedule: boolean;
  effectiveAvailable: boolean;
  items: ComboBundleItemRecord[];
}

function roundMoney(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export const isComboImagePublicIdReferenced = async (
  tenantId: number,
  publicId: string
): Promise<boolean> => {
  const [row] = await db
    .select({ id: comboBundles.id })
    .from(comboBundles)
    .where(and(eq(comboBundles.tenantId, tenantId), eq(comboBundles.imagePublicId, publicId)))
    .limit(1);
  return Boolean(row);
};

export const findCombosByTenant = async (
  tenantId: number,
  options?: { branchId?: number; activeOnly?: boolean }
): Promise<ComboBundleWithItems[]> => {
  const conditions: SQL[] = [eq(comboBundles.tenantId, tenantId)];

  if (options?.branchId) {
    const branchScope = or(
      eq(comboBundles.branchId, options.branchId),
      isNull(comboBundles.branchId)
    );
    if (branchScope) conditions.push(branchScope);
  }
  if (options?.activeOnly) {
    conditions.push(eq(comboBundles.isAvailable, true));
  }

  const combos = await db
    .select()
    .from(comboBundles)
    .where(and(...conditions))
    .orderBy(desc(comboBundles.updatedAt), desc(comboBundles.id));

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
      itemImageUrl: menuItems.imageUrl,
    })
    .from(comboBundleItems)
    .innerJoin(
      menuItems,
      and(eq(comboBundleItems.menuItemId, menuItems.id), eq(menuItems.tenantId, tenantId))
    )
    .where(inArray(comboBundleItems.comboId, comboIds));

  const now = new Date();

  const mapped = combos.map((combo) => {
    const comboItems = items.filter((item) => item.comboId === combo.id);
    const standaloneTotal = roundMoney(
      comboItems.reduce((sum, line) => {
        const unitPrice = parseFloat(line.itemPrice || '0') || 0;
        const addPrice = parseFloat(line.additionalPrice || '0') || 0;
        return sum + (unitPrice + addPrice) * line.quantity;
      }, 0)
    );

    const bundlePrice = roundMoney(parseFloat(combo.basePrice) || 0);
    const savingsAmount = roundMoney(standaloneTotal - bundlePrice);
    const savingsPercent =
      standaloneTotal > 0 ? roundMoney((savingsAmount / standaloneTotal) * 100) : 0;

    const pricingMode: 'DISCOUNTED' | 'EXACT' | 'PREMIUM' =
      savingsAmount > 0.005 ? 'DISCOUNTED' : savingsAmount < -0.005 ? 'PREMIUM' : 'EXACT';

    const unavailableComponents = comboItems
      .filter((i) => i.itemIsAvailable === false)
      .map((i) => i.itemName || `Item #${i.menuItemId}`);

    const afterStart = !combo.validFrom || new Date(combo.validFrom) <= now;
    const beforeEnd = !combo.validUntil || new Date(combo.validUntil) >= now;
    const isWithinSchedule = afterStart && beforeEnd;

    const effectiveAvailable =
      combo.isAvailable &&
      comboItems.length > 0 &&
      unavailableComponents.length === 0 &&
      isWithinSchedule;

    return {
      ...combo,
      imageCardUrl: buildOptimizedCloudinaryUrl(combo.imageUrl, 400, 300),
      imageThumbUrl: buildOptimizedCloudinaryUrl(combo.imageUrl, 96, 96),
      standaloneTotal,
      savingsAmount,
      savingsPercent,
      pricingMode,
      unavailableComponents,
      isWithinSchedule,
      effectiveAvailable,
      items: comboItems,
    };
  });

  return options?.activeOnly ? mapped.filter((c) => c.effectiveAvailable) : mapped;
};

export const createComboTransaction = async (
  tenantId: number,
  branchId: number | null,
  payload: CreateComboBundleInput,
  actor: ComboAuditActor
) => {
  return await db.transaction(async (tx) => {
    if (payload.sku) {
      const [dupSku] = await tx
        .select({ id: comboBundles.id })
        .from(comboBundles)
        .where(and(eq(comboBundles.tenantId, tenantId), eq(comboBundles.sku, payload.sku)));
      if (dupSku) {
        throw new Error(`SKU "${payload.sku}" is already assigned to another combo bundle.`);
      }
    }

    if (payload.imagePublicId) {
      assertPublicIdBelongsToTenant(tenantId, payload.imagePublicId);
    }

    const uniqueMenuItemIds = Array.from(new Set(payload.items.map((i) => i.menuItemId)));
    const matchedMenuItems = await tx
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(and(eq(menuItems.tenantId, tenantId), inArray(menuItems.id, uniqueMenuItemIds)));

    if (matchedMenuItems.length !== uniqueMenuItemIds.length) {
      throw new Error(
        'One or more selected menu items do not exist or do not belong to this tenant.'
      );
    }

    // Consolidate duplicate component entries safely
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

    const [newCombo] = await tx
      .insert(comboBundles)
      .values({
        tenantId,
        branchId: payload.branchId !== undefined ? payload.branchId : branchId,
        name: payload.name,
        description: payload.description ?? null,
        sku: payload.sku ?? null,
        basePrice: payload.basePrice.toFixed(2),
        isAvailable: payload.isAvailable,
        validFrom: payload.validFrom ? new Date(payload.validFrom) : null,
        validUntil: payload.validUntil ? new Date(payload.validUntil) : null,
        imageUrl: payload.imageUrl ?? null,
        imagePublicId: payload.imageUrl ? (payload.imagePublicId ?? null) : null,
        imageOriginalFilename: payload.imageUrl ? (payload.imageOriginalFilename ?? null) : null,
        imageMimeType: payload.imageUrl ? (payload.imageMimeType ?? null) : null,
        imageFileSize: payload.imageUrl ? (payload.imageFileSize ?? null) : null,
        imageUploadedAt: payload.imageUrl ? new Date() : null,
      })
      .returning();

    await tx.insert(comboBundleItems).values(
      Array.from(mergedByItem.entries()).map(([menuItemId, line]) => ({
        comboId: newCombo.id,
        menuItemId,
        quantity: line.quantity,
        additionalPrice: line.additionalPrice.toFixed(2),
      }))
    );

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: newCombo.branchId,
      userId: actor.userId,
      action: 'COMBO_BUNDLE_CREATED',
      module: 'MENU_CATALOG',
      entityType: 'combo_bundles',
      entityId: String(newCombo.id),
      newValues: {
        name: newCombo.name,
        basePrice: newCombo.basePrice,
        componentCount: mergedByItem.size,
      },
      ipAddress: actor.ipAddress ?? null,
    });

    return newCombo;
  });
};

export const updateComboTransaction = async (
  tenantId: number,
  comboId: number,
  payload: UpdateComboBundleInput,
  actor: ComboAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(comboBundles)
      .where(and(eq(comboBundles.id, comboId), eq(comboBundles.tenantId, tenantId)))
      .limit(1);

    if (!existing) return null;

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

    if (payload.imagePublicId) {
      assertPublicIdBelongsToTenant(tenantId, payload.imagePublicId);
    }

    const updateFields: Partial<typeof comboBundles.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) updateFields.name = payload.name;
    if (payload.description !== undefined) updateFields.description = payload.description;
    if (payload.sku !== undefined) updateFields.sku = payload.sku;
    if (payload.branchId !== undefined) updateFields.branchId = payload.branchId;
    if (payload.basePrice !== undefined) updateFields.basePrice = payload.basePrice.toFixed(2);
    if (payload.isAvailable !== undefined) updateFields.isAvailable = payload.isAvailable;
    if (payload.validFrom !== undefined) {
      updateFields.validFrom = payload.validFrom ? new Date(payload.validFrom) : null;
    }
    if (payload.validUntil !== undefined) {
      updateFields.validUntil = payload.validUntil ? new Date(payload.validUntil) : null;
    }

    if (payload.imageUrl !== undefined) {
      updateFields.imageUrl = payload.imageUrl;
      if (payload.imageUrl === null) {
        updateFields.imagePublicId = null;
        updateFields.imageOriginalFilename = null;
        updateFields.imageMimeType = null;
        updateFields.imageFileSize = null;
        updateFields.imageUploadedAt = null;
      } else {
        if (payload.imagePublicId !== undefined) {
          updateFields.imagePublicId = payload.imagePublicId;
        }
        if (payload.imageOriginalFilename !== undefined) {
          updateFields.imageOriginalFilename = payload.imageOriginalFilename;
        }
        if (payload.imageMimeType !== undefined) {
          updateFields.imageMimeType = payload.imageMimeType;
        }
        if (payload.imageFileSize !== undefined) {
          updateFields.imageFileSize = payload.imageFileSize;
        }
        if (payload.imageUrl !== existing.imageUrl) {
          updateFields.imageUploadedAt = new Date();
        }
      }
    }

    if (payload.items !== undefined) {
      if (payload.items.length === 0) {
        throw new Error('A combo bundle must include at least one menu item.');
      }

      const uniqueMenuItemIds = Array.from(new Set(payload.items.map((i) => i.menuItemId)));
      const matchedMenuItems = await tx
        .select({ id: menuItems.id })
        .from(menuItems)
        .where(and(eq(menuItems.tenantId, tenantId), inArray(menuItems.id, uniqueMenuItemIds)));

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

    if (!updated) return null;

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: updated.branchId,
      userId: actor.userId,
      action: 'COMBO_BUNDLE_UPDATED',
      module: 'MENU_CATALOG',
      entityType: 'combo_bundles',
      entityId: String(updated.id),
      previousValues: { basePrice: existing.basePrice, isAvailable: existing.isAvailable },
      newValues: { basePrice: updated.basePrice, isAvailable: updated.isAvailable },
      ipAddress: actor.ipAddress ?? null,
    });

    return {
      combo: updated,
      previousImagePublicId: existing.imagePublicId,
    };
  });
};

export const deleteComboRecord = async (
  tenantId: number,
  comboId: number,
  actor: ComboAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(comboBundles)
      .where(and(eq(comboBundles.id, comboId), eq(comboBundles.tenantId, tenantId)))
      .returning({
        id: comboBundles.id,
        name: comboBundles.name,
        branchId: comboBundles.branchId,
        imagePublicId: comboBundles.imagePublicId,
      });

    if (!deleted) return null;

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: deleted.branchId,
      userId: actor.userId,
      action: 'COMBO_BUNDLE_DELETED',
      module: 'MENU_CATALOG',
      entityType: 'combo_bundles',
      entityId: String(deleted.id),
      previousValues: { name: deleted.name },
      ipAddress: actor.ipAddress ?? null,
    });

    return deleted;
  });
};