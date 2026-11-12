"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = exports.getActiveMenu = exports.createMenuItem = exports.createCategory = void 0;
// apps/api/src/repositories/menu.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const createCategory = async (tenantId, data) => {
    const [category] = await db_1.db
        .insert(schema_1.menuCategories)
        .values({
        tenantId,
        branchId: data.branchId ?? null,
        name: data.name,
        description: data.description,
    })
        .returning();
    return category;
};
exports.createCategory = createCategory;
const createMenuItem = async (tenantId, data) => {
    const [item] = await db_1.db
        .insert(schema_1.menuItems)
        .values({
        tenantId,
        branchId: data.branchId ?? null,
        categoryId: data.categoryId,
        name: data.name,
        sku: data.sku,
        description: data.description,
        price: data.price.toString(), // PostgreSQL decimal requires string input
        isAvailable: data.isAvailable ?? true,
        imageUrl: data.imageUrl,
    })
        .returning();
    return item;
};
exports.createMenuItem = createMenuItem;
const getActiveMenu = async (tenantId, branchId) => {
    const categoryFilter = branchId
        ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuCategories.isActive, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.menuCategories.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.menuCategories.branchId)))
        : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuCategories.isActive, true));
    const itemFilter = branchId
        ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItems.isAvailable, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.menuItems.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.menuItems.branchId)))
        : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItems.isAvailable, true));
    const [categories, items] = await Promise.all([
        db_1.db
            .select()
            .from(schema_1.menuCategories)
            .where(categoryFilter)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.menuCategories.sortOrder), (0, drizzle_orm_1.asc)(schema_1.menuCategories.name)),
        db_1.db
            .select()
            .from(schema_1.menuItems)
            .where(itemFilter)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.menuItems.name)),
    ]);
    return { categories, items };
};
exports.getActiveMenu = getActiveMenu;
const getCategories = async (tenantId, branchId) => {
    const filter = branchId
        ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuCategories.isActive, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.menuCategories.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.menuCategories.branchId)))
        : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuCategories.isActive, true));
    return await db_1.db
        .select()
        .from(schema_1.menuCategories)
        .where(filter)
        .orderBy((0, drizzle_orm_1.asc)(schema_1.menuCategories.sortOrder), (0, drizzle_orm_1.asc)(schema_1.menuCategories.name));
};
exports.getCategories = getCategories;
