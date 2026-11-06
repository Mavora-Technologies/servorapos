"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStatus = exports.createTable = exports.createArea = exports.getFloorPlan = void 0;
// apps/api/src/repositories/table.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getFloorPlan = async (tenantId) => {
    const areas = await db_1.db.select().from(schema_1.diningAreas).where((0, drizzle_orm_1.eq)(schema_1.diningAreas.tenantId, tenantId));
    const tables = await db_1.db.select().from(schema_1.restaurantTables).where((0, drizzle_orm_1.eq)(schema_1.restaurantTables.tenantId, tenantId));
    return { areas, tables };
};
exports.getFloorPlan = getFloorPlan;
const createArea = async (tenantId, name) => {
    const [area] = await db_1.db.insert(schema_1.diningAreas).values({ tenantId, name }).returning();
    return area;
};
exports.createArea = createArea;
const createTable = async (tenantId, data) => {
    const [table] = await db_1.db.insert(schema_1.restaurantTables).values({
        tenantId,
        areaId: data.areaId,
        tableLabel: data.tableLabel,
        capacity: data.capacity,
    }).returning();
    return table;
};
exports.createTable = createTable;
const updateStatus = async (tenantId, tableId, status) => {
    const [table] = await db_1.db.update(schema_1.restaurantTables)
        .set({ status, updatedAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.restaurantTables.id, tableId), (0, drizzle_orm_1.eq)(schema_1.restaurantTables.tenantId, tenantId)))
        .returning();
    return table;
};
exports.updateStatus = updateStatus;
