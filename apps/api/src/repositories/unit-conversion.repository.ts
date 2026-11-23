// apps/api/src/repositories/unit-conversion.repository.ts
import { eq, and, asc, isNull, ilike, ne } from 'drizzle-orm';
import { db } from '../config/db';
import { unitConversions, inventoryItems } from '../config/schema';
import type {
  CreateUnitConversionInput,
  UpdateUnitConversionInput,
} from '../validators/unit-conversion.validator';

export const findUnitConversionsByTenant = async (tenantId: number) => {
  return await db
    .select({
      id: unitConversions.id,
      fromUnit: unitConversions.fromUnit,
      toUnit: unitConversions.toUnit,
      conversionFactor: unitConversions.conversionFactor,
      inventoryItemId: unitConversions.inventoryItemId,
      inventoryItemName: inventoryItems.name,
      inventoryItemSku: inventoryItems.sku,
      inventoryBaseUnit: inventoryItems.unit,
      unitCategory: unitConversions.unitCategory,
      description: unitConversions.description,
      isDefault: unitConversions.isDefault,
      createdAt: unitConversions.createdAt,
      updatedAt: unitConversions.updatedAt,
    })
    .from(unitConversions)
    .leftJoin(
      inventoryItems,
      and(
        eq(unitConversions.inventoryItemId, inventoryItems.id),
        eq(inventoryItems.tenantId, tenantId)
      )
    )
    .where(eq(unitConversions.tenantId, tenantId))
    .orderBy(asc(unitConversions.unitCategory), asc(unitConversions.fromUnit));
};

export const createUnitConversionTransaction = async (
  tenantId: number,
  payload: CreateUnitConversionInput
) => {
  return await db.transaction(async (tx) => {
    let resolvedToUnit = payload.toUnit;

    // 1. Validate tenant ownership of linked inventory item if provided
    if (payload.inventoryItemId !== null && payload.inventoryItemId !== undefined) {
      const [inv] = await tx
        .select({ id: inventoryItems.id, unit: inventoryItems.unit })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.id, payload.inventoryItemId),
            eq(inventoryItems.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!inv) {
        throw new Error(
          'Selected inventory item does not exist or does not belong to this tenant.'
        );
      }
      resolvedToUnit = payload.toUnit || inv.unit;
    }

    // 2. Prevent duplicate rule for same (fromUnit, toUnit, inventoryItemId) within tenant
    const itemScopeCondition =
      payload.inventoryItemId !== null && payload.inventoryItemId !== undefined
        ? eq(unitConversions.inventoryItemId, payload.inventoryItemId)
        : isNull(unitConversions.inventoryItemId);

    const [duplicate] = await tx
      .select({ id: unitConversions.id })
      .from(unitConversions)
      .where(
        and(
          eq(unitConversions.tenantId, tenantId),
          ilike(unitConversions.fromUnit, payload.fromUnit),
          ilike(unitConversions.toUnit, resolvedToUnit),
          itemScopeCondition
        )
      )
      .limit(1);

    if (duplicate) {
      throw new Error(
        `A conversion rule from "${payload.fromUnit}" to "${resolvedToUnit}" already exists for this scope.`
      );
    }

    const [created] = await tx
      .insert(unitConversions)
      .values({
        tenantId,
        fromUnit: payload.fromUnit,
        toUnit: resolvedToUnit,
        conversionFactor: payload.conversionFactor.toFixed(4),
        inventoryItemId: payload.inventoryItemId ?? null,
        unitCategory: payload.unitCategory,
        description: payload.description ?? null,
        isDefault: payload.isDefault,
      })
      .returning();

    return created;
  });
};

export const updateUnitConversionTransaction = async (
  tenantId: number,
  conversionId: number,
  payload: UpdateUnitConversionInput
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(unitConversions)
      .where(
        and(eq(unitConversions.id, conversionId), eq(unitConversions.tenantId, tenantId))
      )
      .limit(1);

    if (!existing) {
      return null;
    }

    const nextFromUnit = payload.fromUnit ?? existing.fromUnit;
    const nextToUnit = payload.toUnit ?? existing.toUnit;
    const nextInvId =
      payload.inventoryItemId !== undefined
        ? payload.inventoryItemId
        : existing.inventoryItemId;

    if (nextFromUnit.toLowerCase() === nextToUnit.toLowerCase()) {
      throw new Error('Source unit and base ledger unit cannot be identical.');
    }

    if (nextInvId !== null && nextInvId !== undefined) {
      const [inv] = await tx
        .select({ id: inventoryItems.id })
        .from(inventoryItems)
        .where(and(eq(inventoryItems.id, nextInvId), eq(inventoryItems.tenantId, tenantId)))
        .limit(1);

      if (!inv) {
        throw new Error(
          'Selected inventory item does not exist or does not belong to this tenant.'
        );
      }
    }

    const itemScopeCondition =
      nextInvId !== null && nextInvId !== undefined
        ? eq(unitConversions.inventoryItemId, nextInvId)
        : isNull(unitConversions.inventoryItemId);

    const [duplicate] = await tx
      .select({ id: unitConversions.id })
      .from(unitConversions)
      .where(
        and(
          eq(unitConversions.tenantId, tenantId),
          ilike(unitConversions.fromUnit, nextFromUnit),
          ilike(unitConversions.toUnit, nextToUnit),
          itemScopeCondition,
          ne(unitConversions.id, conversionId)
        )
      )
      .limit(1);

    if (duplicate) {
      throw new Error(
        `Another conversion rule from "${nextFromUnit}" to "${nextToUnit}" already exists.`
      );
    }

    const updateFields: Partial<typeof unitConversions.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (payload.fromUnit !== undefined) updateFields.fromUnit = payload.fromUnit;
    if (payload.toUnit !== undefined) updateFields.toUnit = payload.toUnit;
    if (payload.conversionFactor !== undefined) {
      updateFields.conversionFactor = payload.conversionFactor.toFixed(4);
    }
    if (payload.inventoryItemId !== undefined) {
      updateFields.inventoryItemId = payload.inventoryItemId;
    }
    if (payload.unitCategory !== undefined) updateFields.unitCategory = payload.unitCategory;
    if (payload.description !== undefined) updateFields.description = payload.description;
    if (payload.isDefault !== undefined) updateFields.isDefault = payload.isDefault;

    const [updated] = await tx
      .update(unitConversions)
      .set(updateFields)
      .where(
        and(eq(unitConversions.id, conversionId), eq(unitConversions.tenantId, tenantId))
      )
      .returning();

    return updated ?? null;
  });
};

export const deleteUnitConversionRecord = async (tenantId: number, conversionId: number) => {
  const [deleted] = await db
    .delete(unitConversions)
    .where(and(eq(unitConversions.id, conversionId), eq(unitConversions.tenantId, tenantId)))
    .returning({ id: unitConversions.id });

  return deleted ?? null;
};