// apps/api/src/repositories/modifier.repository.ts
import { eq, and, desc, asc, inArray, ilike, ne } from 'drizzle-orm';
import { db } from '../config/db';
import { modifierGroups, modifierOptions, inventoryItems } from '../config/schema';
import type {
  CreateModifierGroupInput,
  CreateModifierOptionInput,
  UpdateModifierGroupInput,
} from '../validators/modifier.validator';

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function validateAndResolveLinkedInventory(
  tx: DbTransaction,
  tenantId: number,
  options: CreateModifierOptionInput[]
) {
  const linkedIds = Array.from(
    new Set(
      options
        .map((o) => o.linkedInventoryItemId)
        .filter((id): id is number => id !== null && id !== undefined)
    )
  );

  const unitByInvId = new Map<number, string>();

  if (linkedIds.length > 0) {
    const matched = await tx
      .select({ id: inventoryItems.id, unit: inventoryItems.unit })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.tenantId, tenantId), inArray(inventoryItems.id, linkedIds)));

    if (matched.length !== linkedIds.length) {
      throw new Error(
        'One or more linked raw materials do not exist or do not belong to this tenant.'
      );
    }

    for (const row of matched) {
      unitByInvId.set(row.id, row.unit);
    }
  }

  return options.map((opt) => {
    if (opt.linkedInventoryItemId !== null && opt.linkedQuantity <= 0) {
      throw new Error(
        `Option "${opt.name}" is linked to a raw material and requires a quantity greater than zero.`
      );
    }

    return {
      name: opt.name,
      priceAdjustment: opt.priceAdjustment.toFixed(2),
      linkedInventoryItemId: opt.linkedInventoryItemId ?? null,
      linkedQuantity:
        opt.linkedInventoryItemId !== null ? opt.linkedQuantity.toFixed(4) : '0.0000',
      linkedUnit:
        opt.linkedInventoryItemId !== null
          ? opt.linkedUnit || unitByInvId.get(opt.linkedInventoryItemId) || null
          : null,
      isDefault: opt.isDefault,
      isAvailable: opt.isAvailable,
    };
  });
}

export const findModifierGroupsByTenant = async (tenantId: number) => {
  const groups = await db
    .select()
    .from(modifierGroups)
    .where(eq(modifierGroups.tenantId, tenantId))
    .orderBy(desc(modifierGroups.createdAt));

  if (groups.length === 0) {
    return [];
  }

  const groupIds = groups.map((g) => g.id);

  const options = await db
    .select({
      id: modifierOptions.id,
      modifierGroupId: modifierOptions.modifierGroupId,
      name: modifierOptions.name,
      priceAdjustment: modifierOptions.priceAdjustment,
      linkedInventoryItemId: modifierOptions.linkedInventoryItemId,
      linkedQuantity: modifierOptions.linkedQuantity,
      linkedUnit: modifierOptions.linkedUnit,
      linkedInventoryItemName: inventoryItems.name,
      linkedInventoryItemSku: inventoryItems.sku,
      linkedInventoryUnitCost: inventoryItems.costPrice,
      isDefault: modifierOptions.isDefault,
      isAvailable: modifierOptions.isAvailable,
      createdAt: modifierOptions.createdAt,
    })
    .from(modifierOptions)
    .leftJoin(
      inventoryItems,
      and(
        eq(modifierOptions.linkedInventoryItemId, inventoryItems.id),
        eq(inventoryItems.tenantId, tenantId)
      )
    )
    .where(inArray(modifierOptions.modifierGroupId, groupIds))
    .orderBy(asc(modifierOptions.id));

  return groups.map((group) => ({
    ...group,
    options: options.filter((opt) => opt.modifierGroupId === group.id),
  }));
};

export const createModifierGroupTransaction = async (
  tenantId: number,
  payload: CreateModifierGroupInput
) => {
  return await db.transaction(async (tx) => {
    const [duplicate] = await tx
      .select({ id: modifierGroups.id })
      .from(modifierGroups)
      .where(
        and(eq(modifierGroups.tenantId, tenantId), ilike(modifierGroups.name, payload.name))
      )
      .limit(1);

    if (duplicate) {
      throw new Error(`Modifier group "${payload.name}" already exists for this tenant.`);
    }

    const preparedOptions = await validateAndResolveLinkedInventory(
      tx,
      tenantId,
      payload.options
    );

    const [group] = await tx
      .insert(modifierGroups)
      .values({
        tenantId,
        name: payload.name,
        description: payload.description ?? null,
        minSelections: payload.minSelections,
        maxSelections: payload.maxSelections,
        isRequired: payload.isRequired,
      })
      .returning();

    const insertedOptions = await tx
      .insert(modifierOptions)
      .values(preparedOptions.map((opt) => ({ ...opt, modifierGroupId: group.id })))
      .returning();

    return { ...group, options: insertedOptions };
  });
};

export const updateModifierGroupTransaction = async (
  tenantId: number,
  groupId: number,
  payload: UpdateModifierGroupInput
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(modifierGroups)
      .where(and(eq(modifierGroups.id, groupId), eq(modifierGroups.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return null;
    }

    if (payload.name !== undefined) {
      const [duplicate] = await tx
        .select({ id: modifierGroups.id })
        .from(modifierGroups)
        .where(
          and(
            eq(modifierGroups.tenantId, tenantId),
            ilike(modifierGroups.name, payload.name),
            ne(modifierGroups.id, groupId)
          )
        )
        .limit(1);

      if (duplicate) {
        throw new Error(`Another modifier group named "${payload.name}" already exists.`);
      }
    }

    const nextMin = payload.minSelections ?? existing.minSelections;
    const nextMax = payload.maxSelections ?? existing.maxSelections;
    const nextRequired = payload.isRequired ?? existing.isRequired;

    if (nextMin > nextMax) {
      throw new Error('Minimum selections cannot exceed maximum selections.');
    }
    if (nextRequired && nextMin < 1) {
      throw new Error('Required modifier groups must have at least 1 minimum selection.');
    }

    const updateFields: Partial<typeof modifierGroups.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) updateFields.name = payload.name;
    if (payload.description !== undefined) updateFields.description = payload.description;
    if (payload.minSelections !== undefined) updateFields.minSelections = payload.minSelections;
    if (payload.maxSelections !== undefined) updateFields.maxSelections = payload.maxSelections;
    if (payload.isRequired !== undefined) updateFields.isRequired = payload.isRequired;

    const [updatedGroup] = await tx
      .update(modifierGroups)
      .set(updateFields)
      .where(and(eq(modifierGroups.id, groupId), eq(modifierGroups.tenantId, tenantId)))
      .returning();

    let updatedOptions;
    if (payload.options !== undefined) {
      if (payload.options.length === 0) {
        throw new Error('Modifier group must contain at least one option.');
      }

      const preparedOptions = await validateAndResolveLinkedInventory(
        tx,
        tenantId,
        payload.options
      );

      await tx.delete(modifierOptions).where(eq(modifierOptions.modifierGroupId, groupId));

      updatedOptions = await tx
        .insert(modifierOptions)
        .values(preparedOptions.map((opt) => ({ ...opt, modifierGroupId: groupId })))
        .returning();
    } else {
      updatedOptions = await tx
        .select()
        .from(modifierOptions)
        .where(eq(modifierOptions.modifierGroupId, groupId))
        .orderBy(asc(modifierOptions.id));
    }

    return { ...updatedGroup, options: updatedOptions };
  });
};

export const deleteModifierGroupRecord = async (tenantId: number, groupId: number) => {
  const [deleted] = await db
    .delete(modifierGroups)
    .where(and(eq(modifierGroups.id, groupId), eq(modifierGroups.tenantId, tenantId)))
    .returning({ id: modifierGroups.id });

  return deleted ?? null;
};