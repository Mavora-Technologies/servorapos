"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = exports.getActiveMenu = exports.createMenuItem = exports.createCategory = void 0;
// apps/api/src/repositories/menu.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const createCategory = async (tenantId, data) => {
    const [category] = await db_1.db.insert(schema_1.menuCategories).values({
        tenantId,
        name: data.name,
        description: data.description,
    }).returning();
    return category;
};
exports.createCategory = createCategory;
const createMenuItem = async (tenantId, data) => {
    const [item] = await db_1.db.insert(schema_1.menuItems).values({
        tenantId,
        categoryId: data.categoryId,
        name: data.name,
        sku: data.sku,
        description: data.description,
        price: data.price.toString(), // PostgreSQL decimal requires string input
        isAvailable: data.isAvailable,
        imageUrl: data.imageUrl,
    }).returning();
    return item;
};
exports.createMenuItem = createMenuItem;
const getActiveMenu = async (tenantId) => {
    const categories = await db_1.db.select().from(schema_1.menuCategories).where((0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId));
    const items = await db_1.db.select().from(schema_1.menuItems).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItems.isAvailable, true)));
    return { categories, items };
};
exports.getActiveMenu = getActiveMenu;
const getCategories = async (tenantId) => {
    return await db_1.db.select().from(schema_1.menuCategories).where((0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId));
};
exports.getCategories = getCategories;
