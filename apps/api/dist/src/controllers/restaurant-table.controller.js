"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRestaurantTables = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getRestaurantTables = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const tables = await db_1.db
            .select()
            .from(schema_1.restaurantTables)
            .where((0, drizzle_orm_1.eq)(schema_1.restaurantTables.tenantId, tenantId))
            .orderBy(schema_1.restaurantTables.tableLabel);
        res.status(200).json({ status: 'success', data: tables });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getRestaurantTables = getRestaurantTables;
