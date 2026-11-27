"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUnitConversionRecord = exports.updateUnitConversionTransaction = exports.createUnitConversionTransaction = exports.findUnitConversionsByTenant = void 0;
// apps/api/src/repositories/unit-conversion.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const findUnitConversionsByTenant = async (tenantId) => {
    return await db_1.db
        .select({
        id: schema_1.unitConversions.id,
        fromUnit: schema_1.unitConversions.fromUnit,
        toUnit: schema_1.unitConversions.toUnit,
        conversionFactor: schema_1.unitConversions.conversionFactor,
        inventoryItemId: schema_1.unitConversions.inventoryItemId,
        inventoryItemName: schema_1.inventoryItems.name,
        inventoryItemSku: schema_1.inventoryItems.sku,
        inventoryBaseUnit: schema_1.inventoryItems.unit,
        unitCategory: schema_1.unitConversions.unitCategory,
        description: schema_1.unitConversions.description,
        isDefault: schema_1.unitConversions.isDefault,
        createdAt: schema_1.unitConversions.createdAt,
        updatedAt: schema_1.unitConversions.updatedAt,
    })
        .from(schema_1.unitConversions)
        .leftJoin(schema_1.inventoryItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.unitConversions.inventoryItemId, schema_1.inventoryItems.id), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
        .where((0, drizzle_orm_1.eq)(schema_1.unitConversions.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.unitConversions.unitCategory), (0, drizzle_orm_1.asc)(schema_1.unitConversions.fromUnit));
};
exports.findUnitConversionsByTenant = findUnitConversionsByTenant;
const createUnitConversionTransaction = async (tenantId, payload) => {
    return await db_1.db.transaction(async (tx) => {
        let resolvedToUnit = payload.toUnit;
        // 1. Validate tenant ownership of linked inventory item if provided
        if (payload.inventoryItemId !== null && payload.inventoryItemId !== undefined) {
            const [inv] = await tx
                .select({ id: schema_1.inventoryItems.id, unit: schema_1.inventoryItems.unit })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, payload.inventoryItemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
                .limit(1);
            if (!inv) {
                throw new Error('Selected inventory item does not exist or does not belong to this tenant.');
            }
            resolvedToUnit = payload.toUnit || inv.unit;
        }
        // 2. Prevent duplicate rule for same (fromUnit, toUnit, inventoryItemId) within tenant
        const itemScopeCondition = payload.inventoryItemId !== null && payload.inventoryItemId !== undefined
            ? (0, drizzle_orm_1.eq)(schema_1.unitConversions.inventoryItemId, payload.inventoryItemId)
            : (0, drizzle_orm_1.isNull)(schema_1.unitConversions.inventoryItemId);
        const [duplicate] = await tx
            .select({ id: schema_1.unitConversions.id })
            .from(schema_1.unitConversions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.unitConversions.tenantId, tenantId), (0, drizzle_orm_1.ilike)(schema_1.unitConversions.fromUnit, payload.fromUnit), (0, drizzle_orm_1.ilike)(schema_1.unitConversions.toUnit, resolvedToUnit), itemScopeCondition))
            .limit(1);
        if (duplicate) {
            throw new Error(`A conversion rule from "${payload.fromUnit}" to "${resolvedToUnit}" already exists for this scope.`);
        }
        const [created] = await tx
            .insert(schema_1.unitConversions)
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
exports.createUnitConversionTransaction = createUnitConversionTransaction;
const updateUnitConversionTransaction = async (tenantId, conversionId, payload) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.unitConversions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.unitConversions.id, conversionId), (0, drizzle_orm_1.eq)(schema_1.unitConversions.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            return null;
        }
        const nextFromUnit = payload.fromUnit ?? existing.fromUnit;
        const nextToUnit = payload.toUnit ?? existing.toUnit;
        const nextInvId = payload.inventoryItemId !== undefined
            ? payload.inventoryItemId
            : existing.inventoryItemId;
        if (nextFromUnit.toLowerCase() === nextToUnit.toLowerCase()) {
            throw new Error('Source unit and base ledger unit cannot be identical.');
        }
        if (nextInvId !== null && nextInvId !== undefined) {
            const [inv] = await tx
                .select({ id: schema_1.inventoryItems.id })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, nextInvId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
                .limit(1);
            if (!inv) {
                throw new Error('Selected inventory item does not exist or does not belong to this tenant.');
            }
        }
        const itemScopeCondition = nextInvId !== null && nextInvId !== undefined
            ? (0, drizzle_orm_1.eq)(schema_1.unitConversions.inventoryItemId, nextInvId)
            : (0, drizzle_orm_1.isNull)(schema_1.unitConversions.inventoryItemId);
        const [duplicate] = await tx
            .select({ id: schema_1.unitConversions.id })
            .from(schema_1.unitConversions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.unitConversions.tenantId, tenantId), (0, drizzle_orm_1.ilike)(schema_1.unitConversions.fromUnit, nextFromUnit), (0, drizzle_orm_1.ilike)(schema_1.unitConversions.toUnit, nextToUnit), itemScopeCondition, (0, drizzle_orm_1.ne)(schema_1.unitConversions.id, conversionId)))
            .limit(1);
        if (duplicate) {
            throw new Error(`Another conversion rule from "${nextFromUnit}" to "${nextToUnit}" already exists.`);
        }
        const updateFields = {
            updatedAt: new Date(),
        };
        if (payload.fromUnit !== undefined)
            updateFields.fromUnit = payload.fromUnit;
        if (payload.toUnit !== undefined)
            updateFields.toUnit = payload.toUnit;
        if (payload.conversionFactor !== undefined) {
            updateFields.conversionFactor = payload.conversionFactor.toFixed(4);
        }
        if (payload.inventoryItemId !== undefined) {
            updateFields.inventoryItemId = payload.inventoryItemId;
        }
        if (payload.unitCategory !== undefined)
            updateFields.unitCategory = payload.unitCategory;
        if (payload.description !== undefined)
            updateFields.description = payload.description;
        if (payload.isDefault !== undefined)
            updateFields.isDefault = payload.isDefault;
        const [updated] = await tx
            .update(schema_1.unitConversions)
            .set(updateFields)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.unitConversions.id, conversionId), (0, drizzle_orm_1.eq)(schema_1.unitConversions.tenantId, tenantId)))
            .returning();
        return updated ?? null;
    });
};
exports.updateUnitConversionTransaction = updateUnitConversionTransaction;
const deleteUnitConversionRecord = async (tenantId, conversionId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.unitConversions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.unitConversions.id, conversionId), (0, drizzle_orm_1.eq)(schema_1.unitConversions.tenantId, tenantId)))
        .returning({ id: schema_1.unitConversions.id });
    return deleted ?? null;
};
exports.deleteUnitConversionRecord = deleteUnitConversionRecord;
