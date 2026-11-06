"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMenuItems = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getMenuItems = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const items = await db_1.db
            .select()
            .from(schema_1.menuItems)
            .where((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.menuItems.id));
        res.status(200).json({
            status: 'success',
            data: items,
        });
    }
    catch (error) {
        console.error('[Get Menu Items Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch menu items' });
    }
};
exports.getMenuItems = getMenuItems;
