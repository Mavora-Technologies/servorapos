"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePricingRuleRecord = exports.updatePricingRuleTransaction = exports.createPricingRuleTransaction = exports.bulkUpdateBasePricesTransaction = exports.findPricingDataByTenant = void 0;
// apps/api/src/repositories/pricing.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const findPricingDataByTenant = async (tenantId) => {
    const [items, rules] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.menuItems.id,
            categoryId: schema_1.menuItems.categoryId,
            categoryName: schema_1.menuCategories.name,
            name: schema_1.menuItems.name,
            sku: schema_1.menuItems.sku,
            price: schema_1.menuItems.price,
            costEstimate: schema_1.menuItems.costEstimate,
            isAvailable: schema_1.menuItems.isAvailable,
        })
            .from(schema_1.menuItems)
            .leftJoin(schema_1.menuCategories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.categoryId, schema_1.menuCategories.id), (0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId)))
            .where((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.menuCategories.name), (0, drizzle_orm_1.asc)(schema_1.menuItems.name)),
        db_1.db
            .select({
            id: schema_1.itemPricingRules.id,
            branchId: schema_1.itemPricingRules.branchId,
            menuItemId: schema_1.itemPricingRules.menuItemId,
            ruleName: schema_1.itemPricingRules.ruleName,
            ruleType: schema_1.itemPricingRules.ruleType,
            value: schema_1.itemPricingRules.value,
            startTime: schema_1.itemPricingRules.startTime,
            endTime: schema_1.itemPricingRules.endTime,
            daysOfWeek: schema_1.itemPricingRules.daysOfWeek,
            isActive: schema_1.itemPricingRules.isActive,
            createdAt: schema_1.itemPricingRules.createdAt,
        })
            .from(schema_1.itemPricingRules)
            .where((0, drizzle_orm_1.eq)(schema_1.itemPricingRules.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.itemPricingRules.createdAt)),
    ]);
    return { items, rules };
};
exports.findPricingDataByTenant = findPricingDataByTenant;
const bulkUpdateBasePricesTransaction = async (tenantId, updates) => {
    return await db_1.db.transaction(async (tx) => {
        const uniqueIds = Array.from(new Set(updates.map((u) => u.id)));
        const ownedItems = await tx
            .select({ id: schema_1.menuItems.id })
            .from(schema_1.menuItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.menuItems.id, uniqueIds)));
        if (ownedItems.length !== uniqueIds.length) {
            throw new Error('One or more menu items do not exist or do not belong to this tenant.');
        }
        for (const update of updates) {
            await tx
                .update(schema_1.menuItems)
                .set({
                price: update.price.toFixed(2),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.id, update.id), (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)));
        }
        return { updatedCount: updates.length };
    });
};
exports.bulkUpdateBasePricesTransaction = bulkUpdateBasePricesTransaction;
const createPricingRuleTransaction = async (tenantId, defaultBranchId, payload) => {
    return await db_1.db.transaction(async (tx) => {
        const [item] = await tx
            .select({ id: schema_1.menuItems.id })
            .from(schema_1.menuItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.id, payload.menuItemId), (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)))
            .limit(1);
        if (!item) {
            throw new Error('Target menu item does not exist or does not belong to this tenant.');
        }
        const [created] = await tx
            .insert(schema_1.itemPricingRules)
            .values({
            tenantId,
            branchId: payload.branchId !== undefined ? payload.branchId : defaultBranchId,
            menuItemId: payload.menuItemId,
            ruleName: payload.ruleName,
            ruleType: payload.ruleType,
            value: payload.value.toFixed(2),
            startTime: payload.startTime ?? null,
            endTime: payload.endTime ?? null,
            daysOfWeek: payload.daysOfWeek || 'ALL',
            isActive: payload.isActive,
        })
            .returning();
        return created;
    });
};
exports.createPricingRuleTransaction = createPricingRuleTransaction;
const updatePricingRuleTransaction = async (tenantId, ruleId, payload) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.itemPricingRules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.itemPricingRules.id, ruleId), (0, drizzle_orm_1.eq)(schema_1.itemPricingRules.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            return null;
        }
        if (payload.menuItemId !== undefined) {
            const [item] = await tx
                .select({ id: schema_1.menuItems.id })
                .from(schema_1.menuItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.id, payload.menuItemId), (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)))
                .limit(1);
            if (!item) {
                throw new Error('Target menu item does not exist or does not belong to this tenant.');
            }
        }
        const nextRuleType = payload.ruleType ?? existing.ruleType;
        const nextValue = payload.value ?? parseFloat(existing.value);
        const nextStart = payload.startTime !== undefined ? payload.startTime : existing.startTime;
        const nextEnd = payload.endTime !== undefined ? payload.endTime : existing.endTime;
        if (nextRuleType === 'PERCENTAGE_DISCOUNT' && (nextValue <= 0 || nextValue > 100)) {
            throw new Error('Percentage discount must be between 0.01% and 100%.');
        }
        if ((nextStart && !nextEnd) || (!nextStart && nextEnd)) {
            throw new Error('Provide both start time and end time, or leave both blank.');
        }
        const updateFields = {
            updatedAt: new Date(),
        };
        if (payload.menuItemId !== undefined)
            updateFields.menuItemId = payload.menuItemId;
        if (payload.branchId !== undefined)
            updateFields.branchId = payload.branchId;
        if (payload.ruleName !== undefined)
            updateFields.ruleName = payload.ruleName;
        if (payload.ruleType !== undefined)
            updateFields.ruleType = payload.ruleType;
        if (payload.value !== undefined)
            updateFields.value = payload.value.toFixed(2);
        if (payload.startTime !== undefined)
            updateFields.startTime = payload.startTime;
        if (payload.endTime !== undefined)
            updateFields.endTime = payload.endTime;
        if (payload.daysOfWeek !== undefined)
            updateFields.daysOfWeek = payload.daysOfWeek;
        if (payload.isActive !== undefined)
            updateFields.isActive = payload.isActive;
        const [updated] = await tx
            .update(schema_1.itemPricingRules)
            .set(updateFields)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.itemPricingRules.id, ruleId), (0, drizzle_orm_1.eq)(schema_1.itemPricingRules.tenantId, tenantId)))
            .returning();
        return updated ?? null;
    });
};
exports.updatePricingRuleTransaction = updatePricingRuleTransaction;
const deletePricingRuleRecord = async (tenantId, ruleId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.itemPricingRules)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.itemPricingRules.id, ruleId), (0, drizzle_orm_1.eq)(schema_1.itemPricingRules.tenantId, tenantId)))
        .returning({ id: schema_1.itemPricingRules.id });
    return deleted ?? null;
};
exports.deletePricingRuleRecord = deletePricingRuleRecord;
