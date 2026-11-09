import { eq, and, desc, asc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import { customers, customerInteractions, users } from '../config/schema';
import { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from '../validators/customer.validator';

export const listTenantCustomers = async (tenantId: number, query: ListCustomersQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(customers.tenantId, tenantId),
    query.customerType && query.customerType !== 'ALL' ? eq(customers.customerType, query.customerType) : undefined,
    query.search
      ? or(
          ilike(customers.name, `%${query.search}%`),
          ilike(customers.phone, `%${query.search}%`),
          ilike(customers.email, `%${query.search}%`),
          ilike(customers.companyName, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  let orderByClause = desc(customers.createdAt);
  if (query.sortBy === 'NAME') {
    orderByClause = query.sortOrder === 'ASC' ? asc(customers.name) : desc(customers.name);
  } else if (query.sortBy === 'TOTAL_SPENT') {
    orderByClause = query.sortOrder === 'ASC' ? asc(customers.totalSpent) : desc(customers.totalSpent);
  } else if (query.sortBy === 'ORDERS_COUNT') {
    orderByClause = query.sortOrder === 'ASC' ? asc(customers.ordersCount) : desc(customers.ordersCount);
  }

  const [countResult, customerRecords] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(and(...conditions)),
    db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  // Calculate CRM Summary Metrics
  const [summary] = await db
    .select({
      totalCustomers: sql<number>`count(*)`,
      totalRevenue: sql<number>`coalesce(sum(${customers.totalSpent}), 0)::numeric`,
      totalOrders: sql<number>`coalesce(sum(${customers.ordersCount}), 0)::numeric`,
      vipCount: sql<number>`count(case when ${customers.customerType} in ('VIP', 'CORPORATE') then 1 end)`,
    })
    .from(customers)
    .where(eq(customers.tenantId, tenantId));

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

export const createCustomerRecord = async (tenantId: number, input: CreateCustomerInput) => {
  const [created] = await db
    .insert(customers)
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

export const updateCustomerRecord = async (tenantId: number, customerId: number, input: UpdateCustomerInput) => {
  const [updated] = await db
    .update(customers)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
    .returning();

  return updated;
};

export const deleteCustomerRecord = async (tenantId: number, customerId: number) => {
  const [deleted] = await db
    .delete(customers)
    .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
    .returning();

  return deleted;
};