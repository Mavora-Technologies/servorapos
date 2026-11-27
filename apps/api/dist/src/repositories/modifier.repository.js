"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteModifierGroupRecord = exports.updateModifierGroupTransaction = exports.createModifierGroupTransaction = exports.findModifierGroupsByTenant = void 0;
// apps/api/src/repositories/modifier.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
async function validateAndResolveLinkedInventory(tx, tenantId, options) {
    const linkedIds = Array.from(new Set(options
        .map((o) => o.linkedInventoryItemId)
        .filter((id) => id !== null && id !== undefined)));
    const unitByInvId = new Map();
    if (linkedIds.length > 0) {
        const matched = await tx
            .select({ id: schema_1.inventoryItems.id, unit: schema_1.inventoryItems.unit })
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.inventoryItems.id, linkedIds)));
        if (matched.length !== linkedIds.length) {
            throw new Error('One or more linked raw materials do not exist or do not belong to this tenant.');
        }
        for (const row of matched) {
            unitByInvId.set(row.id, row.unit);
        }
    }
    return options.map((opt) => {
        if (opt.linkedInventoryItemId !== null && opt.linkedQuantity <= 0) {
            throw new Error(`Option "${opt.name}" is linked to a raw material and requires a quantity greater than zero.`);
        }
        return {
            name: opt.name,
            priceAdjustment: opt.priceAdjustment.toFixed(2),
            linkedInventoryItemId: opt.linkedInventoryItemId ?? null,
            linkedQuantity: opt.linkedInventoryItemId !== null ? opt.linkedQuantity.toFixed(4) : '0.0000',
            linkedUnit: opt.linkedInventoryItemId !== null
                ? opt.linkedUnit || unitByInvId.get(opt.linkedInventoryItemId) || null
                : null,
            isDefault: opt.isDefault,
            isAvailable: opt.isAvailable,
        };
    });
}
const findModifierGroupsByTenant = async (tenantId) => {
    const groups = await db_1.db
        .select()
        .from(schema_1.modifierGroups)
        .where((0, drizzle_orm_1.eq)(schema_1.modifierGroups.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.modifierGroups.createdAt));
    if (groups.length === 0) {
        return [];
    }
    const groupIds = groups.map((g) => g.id);
    const options = await db_1.db
        .select({
        id: schema_1.modifierOptions.id,
        modifierGroupId: schema_1.modifierOptions.modifierGroupId,
        name: schema_1.modifierOptions.name,
        priceAdjustment: schema_1.modifierOptions.priceAdjustment,
        linkedInventoryItemId: schema_1.modifierOptions.linkedInventoryItemId,
        linkedQuantity: schema_1.modifierOptions.linkedQuantity,
        linkedUnit: schema_1.modifierOptions.linkedUnit,
        linkedInventoryItemName: schema_1.inventoryItems.name,
        linkedInventoryItemSku: schema_1.inventoryItems.sku,
        linkedInventoryUnitCost: schema_1.inventoryItems.costPrice,
        isDefault: schema_1.modifierOptions.isDefault,
        isAvailable: schema_1.modifierOptions.isAvailable,
        createdAt: schema_1.modifierOptions.createdAt,
    })
        .from(schema_1.modifierOptions)
        .leftJoin(schema_1.inventoryItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.modifierOptions.linkedInventoryItemId, schema_1.inventoryItems.id), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
        .where((0, drizzle_orm_1.inArray)(schema_1.modifierOptions.modifierGroupId, groupIds))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.modifierOptions.id));
    return groups.map((group) => ({
        ...group,
        options: options.filter((opt) => opt.modifierGroupId === group.id),
    }));
};
exports.findModifierGroupsByTenant = findModifierGroupsByTenant;
const createModifierGroupTransaction = async (tenantId, payload) => {
    return await db_1.db.transaction(async (tx) => {
        const [duplicate] = await tx
            .select({ id: schema_1.modifierGroups.id })
            .from(schema_1.modifierGroups)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.modifierGroups.tenantId, tenantId), (0, drizzle_orm_1.ilike)(schema_1.modifierGroups.name, payload.name)))
            .limit(1);
        if (duplicate) {
            throw new Error(`Modifier group "${payload.name}" already exists for this tenant.`);
        }
        const preparedOptions = await validateAndResolveLinkedInventory(tx, tenantId, payload.options);
        const [group] = await tx
            .insert(schema_1.modifierGroups)
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
            .insert(schema_1.modifierOptions)
            .values(preparedOptions.map((opt) => ({ ...opt, modifierGroupId: group.id })))
            .returning();
        return { ...group, options: insertedOptions };
    });
};
exports.createModifierGroupTransaction = createModifierGroupTransaction;
const updateModifierGroupTransaction = async (tenantId, groupId, payload) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.modifierGroups)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.modifierGroups.id, groupId), (0, drizzle_orm_1.eq)(schema_1.modifierGroups.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            return null;
        }
        if (payload.name !== undefined) {
            const [duplicate] = await tx
                .select({ id: schema_1.modifierGroups.id })
                .from(schema_1.modifierGroups)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.modifierGroups.tenantId, tenantId), (0, drizzle_orm_1.ilike)(schema_1.modifierGroups.name, payload.name), (0, drizzle_orm_1.ne)(schema_1.modifierGroups.id, groupId)))
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
        const updateFields = {
            updatedAt: new Date(),
        };
        if (payload.name !== undefined)
            updateFields.name = payload.name;
        if (payload.description !== undefined)
            updateFields.description = payload.description;
        if (payload.minSelections !== undefined)
            updateFields.minSelections = payload.minSelections;
        if (payload.maxSelections !== undefined)
            updateFields.maxSelections = payload.maxSelections;
        if (payload.isRequired !== undefined)
            updateFields.isRequired = payload.isRequired;
        const [updatedGroup] = await tx
            .update(schema_1.modifierGroups)
            .set(updateFields)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.modifierGroups.id, groupId), (0, drizzle_orm_1.eq)(schema_1.modifierGroups.tenantId, tenantId)))
            .returning();
        let updatedOptions;
        if (payload.options !== undefined) {
            if (payload.options.length === 0) {
                throw new Error('Modifier group must contain at least one option.');
            }
            const preparedOptions = await validateAndResolveLinkedInventory(tx, tenantId, payload.options);
            await tx.delete(schema_1.modifierOptions).where((0, drizzle_orm_1.eq)(schema_1.modifierOptions.modifierGroupId, groupId));
            updatedOptions = await tx
                .insert(schema_1.modifierOptions)
                .values(preparedOptions.map((opt) => ({ ...opt, modifierGroupId: groupId })))
                .returning();
        }
        else {
            updatedOptions = await tx
                .select()
                .from(schema_1.modifierOptions)
                .where((0, drizzle_orm_1.eq)(schema_1.modifierOptions.modifierGroupId, groupId))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.modifierOptions.id));
        }
        return { ...updatedGroup, options: updatedOptions };
    });
};
exports.updateModifierGroupTransaction = updateModifierGroupTransaction;
const deleteModifierGroupRecord = async (tenantId, groupId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.modifierGroups)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.modifierGroups.id, groupId), (0, drizzle_orm_1.eq)(schema_1.modifierGroups.tenantId, tenantId)))
        .returning({ id: schema_1.modifierGroups.id });
    return deleted ?? null;
};
exports.deleteModifierGroupRecord = deleteModifierGroupRecord;
