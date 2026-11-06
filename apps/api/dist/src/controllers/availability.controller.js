"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateItemAvailability = exports.getAvailabilityOverview = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const availability_validator_1 = require("../validators/availability.validator");
const getAvailabilityOverview = async (req, res) => {
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
            categoryId: schema_1.menuItems.categoryId,
            categoryName: schema_1.menuCategories.name,
            isAvailable: schema_1.menuItems.isAvailable,
        })
            .from(schema_1.menuItems)
            .leftJoin(schema_1.menuCategories, (0, drizzle_orm_1.eq)(schema_1.menuItems.categoryId, schema_1.menuCategories.id))
            .where((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.menuItems.id));
        const records = await db_1.db
            .select()
            .from(schema_1.menuItemAvailability)
            .where((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId));
        const recordMap = new Map(records.map((r) => [r.menuItemId, r]));
        let availableCount = 0;
        let outOfStockCount = 0;
        let lowStockCount = 0;
        const formattedItems = items.map((item) => {
            const avail = recordMap.get(item.id);
            const is86ed = avail ? avail.is86ed : !item.isAvailable;
            const remainingCount = avail?.remainingCount ?? null;
            if (is86ed) {
                outOfStockCount++;
            }
            else {
                availableCount++;
                if (remainingCount !== null && remainingCount <= 5) {
                    lowStockCount++;
                }
            }
            return {
                ...item,
                is86ed,
                reason: avail?.reason ?? null,
                remainingCount,
                autoResetAt: avail?.autoResetAt ?? null,
            };
        });
        res.status(200).json({
            status: 'success',
            data: {
                summary: {
                    total: items.length,
                    available: availableCount,
                    outOfStock: outOfStockCount,
                    lowStock: lowStockCount,
                },
                items: formattedItems,
            },
        });
    }
    catch (error) {
        console.error('[Availability Overview Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch availability' });
    }
};
exports.getAvailabilityOverview = getAvailabilityOverview;
const updateItemAvailability = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const branchId = req.user?.defaultBranchId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = availability_validator_1.updateAvailabilitySchema.parse(req.body);
        const autoResetDate = payload.autoResetTomorrow
            ? new Date(Date.now() + 24 * 60 * 60 * 1000)
            : null;
        // Sync menu_items table
        await db_1.db
            .update(schema_1.menuItems)
            .set({ isAvailable: !payload.is86ed, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.id, payload.menuItemId), (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)));
        // Upsert menuItemAvailability table
        const existing = await db_1.db
            .select()
            .from(schema_1.menuItemAvailability)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.menuItemId, payload.menuItemId), (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId)))
            .limit(1);
        if (existing.length > 0) {
            await db_1.db
                .update(schema_1.menuItemAvailability)
                .set({
                is86ed: payload.is86ed,
                reason: payload.reason,
                remainingCount: payload.remainingCount,
                autoResetAt: autoResetDate,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.id, existing[0].id));
        }
        else {
            await db_1.db.insert(schema_1.menuItemAvailability).values({
                tenantId,
                branchId: branchId || null,
                menuItemId: payload.menuItemId,
                is86ed: payload.is86ed,
                reason: payload.reason,
                remainingCount: payload.remainingCount,
                autoResetAt: autoResetDate,
            });
        }
        res.status(200).json({ status: 'success', message: 'Item stock availability updated' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.updateItemAvailability = updateItemAvailability;
