"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomerRecord = exports.updateCustomerRecord = exports.createCustomerRecord = exports.listTenantCustomers = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listTenantCustomers = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.customers.tenantId, tenantId),
        query.customerType && query.customerType !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.customers.customerType, query.customerType) : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.customers.name, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.phone, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.email, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.companyName, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    let orderByClause = (0, drizzle_orm_1.desc)(schema_1.customers.createdAt);
    if (query.sortBy === 'NAME') {
        orderByClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(schema_1.customers.name) : (0, drizzle_orm_1.desc)(schema_1.customers.name);
    }
    else if (query.sortBy === 'TOTAL_SPENT') {
        orderByClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(schema_1.customers.totalSpent) : (0, drizzle_orm_1.desc)(schema_1.customers.totalSpent);
    }
    else if (query.sortBy === 'ORDERS_COUNT') {
        orderByClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(schema_1.customers.ordersCount) : (0, drizzle_orm_1.desc)(schema_1.customers.ordersCount);
    }
    const [countResult, customerRecords] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.customers)
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select()
            .from(schema_1.customers)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset),
    ]);
    const total = Number(countResult[0]?.count || 0);
    // Calculate CRM Summary Metrics
    const [summary] = await db_1.db
        .select({
        totalCustomers: (0, drizzle_orm_1.sql) `count(*)`,
        totalRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.customers.totalSpent}), 0)::numeric`,
        totalOrders: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.customers.ordersCount}), 0)::numeric`,
        vipCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.customers.customerType} in ('VIP', 'CORPORATE') then 1 end)`,
    })
        .from(schema_1.customers)
        .where((0, drizzle_orm_1.eq)(schema_1.customers.tenantId, tenantId));
    return {
        customers: customerRecords.map((c) => ({
            ...c,
            totalSpent: Number(c.totalSpent),
        })),
        summary: {
            totalCustomers: Number(summary?.totalCustomers || 0),
            totalRevenue: Number(summary?.totalRevenue || 0),
            totalOrders: Number(summary?.totalOrders || 0),
            vipCount: Number(summary?.vipCount || 0),
        },
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
    };
};
exports.listTenantCustomers = listTenantCustomers;
const createCustomerRecord = async (tenantId, input) => {
    const [created] = await db_1.db
        .insert(schema_1.customers)
        .values({
        tenantId,
        branchId: input.branchId || null,
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        kraPin: input.kraPin || null,
        companyName: input.companyName || null,
        customerType: input.customerType,
        address: input.address || null,
        notes: input.notes || null,
        loyaltyPoints: 0,
        totalSpent: '0.00',
        ordersCount: 0,
    })
        .returning();
    return created;
};
exports.createCustomerRecord = createCustomerRecord;
const updateCustomerRecord = async (tenantId, customerId, input) => {
    const [updated] = await db_1.db
        .update(schema_1.customers)
        .set({
        ...input,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.id, customerId), (0, drizzle_orm_1.eq)(schema_1.customers.tenantId, tenantId)))
        .returning();
    return updated;
};
exports.updateCustomerRecord = updateCustomerRecord;
const deleteCustomerRecord = async (tenantId, customerId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.customers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.id, customerId), (0, drizzle_orm_1.eq)(schema_1.customers.tenantId, tenantId)))
        .returning();
    return deleted;
};
exports.deleteCustomerRecord = deleteCustomerRecord;
