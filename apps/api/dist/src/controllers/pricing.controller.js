"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePricingRule = exports.createPricingRule = exports.bulkUpdatePrices = exports.getPricingOverview = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const pricing_validator_1 = require("../validators/pricing.validator");
// 1. Get all menu items with their base prices and active pricing rules
const getPricingOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const items = await db_1.db
            .select({
            id: schema_1.menuItems.id,
            name: schema_1.menuItems.name,
            price: schema_1.menuItems.price,
            isAvailable: schema_1.menuItems.isAvailable,
        })
            .from(schema_1.menuItems)
            .where((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.menuItems.id));
        const rules = await db_1.db
            .select({
            id: schema_1.itemPricingRules.id,
            menuItemId: schema_1.itemPricingRules.menuItemId,
            ruleName: schema_1.itemPricingRules.ruleName,
            ruleType: schema_1.itemPricingRules.ruleType,
            value: schema_1.itemPricingRules.value,
            startTime: schema_1.itemPricingRules.startTime,
            endTime: schema_1.itemPricingRules.endTime,
            daysOfWeek: schema_1.itemPricingRules.daysOfWeek,
            isActive: schema_1.itemPricingRules.isActive,
        })
            .from(schema_1.itemPricingRules)
            .where((0, drizzle_orm_1.eq)(schema_1.itemPricingRules.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.itemPricingRules.createdAt));
        const data = items.map((item) => ({
            ...item,
            rules: rules.filter((r) => r.menuItemId === item.id),
        }));
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        console.error('[Pricing Overview Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch pricing data' });
    }
};
exports.getPricingOverview = getPricingOverview;
// 2. Bulk update base item prices (instant inline edits)
const bulkUpdatePrices = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const { updates } = pricing_validator_1.bulkUpdatePricesSchema.parse(req.body);
        await db_1.db.transaction(async (tx) => {
            for (const update of updates) {
                await tx
                    .update(schema_1.menuItems)
                    .set({ price: update.price.toFixed(2), updatedAt: new Date() })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.id, update.id), (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)));
            }
        });
        res.status(200).json({ status: 'success', message: 'Prices updated successfully' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.bulkUpdatePrices = bulkUpdatePrices;
// 3. Create a dynamic price rule (Happy hour, surge, etc.)
const createPricingRule = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const branchId = req.user?.defaultBranchId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = pricing_validator_1.createPricingRuleSchema.parse(req.body);
        const [rule] = await db_1.db
            .insert(schema_1.itemPricingRules)
            .values({
            tenantId,
            branchId: branchId || null,
            menuItemId: payload.menuItemId,
            ruleName: payload.ruleName,
            ruleType: payload.ruleType,
            value: payload.value.toFixed(2),
            startTime: payload.startTime || null,
            endTime: payload.endTime || null,
            daysOfWeek: payload.daysOfWeek || 'ALL',
            isActive: payload.isActive ?? true,
        })
            .returning();
        res.status(201).json({ status: 'success', data: rule });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.createPricingRule = createPricingRule;
// 4. Delete a pricing rule
const deletePricingRule = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        await db_1.db
            .delete(schema_1.itemPricingRules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.itemPricingRules.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.itemPricingRules.tenantId, tenantId)));
        res.status(200).json({ status: 'success', message: 'Rule removed successfully' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.deletePricingRule = deletePricingRule;
