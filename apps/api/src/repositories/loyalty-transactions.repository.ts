import { eq, and, desc, asc, sql, gte, lte, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  loyaltyTransactionsLedger,
  customers,
  orders,
  loyaltyRewardsCatalog,
  users,
  branches,
} from '../config/schema';
import { LoyaltyTransactionsQuery } from '../validators/loyalty-transactions.validator';

const parseDateRange = (startDateStr?: string, endDateStr?: string) => {
  let start: Date;
  if (startDateStr) {
    start = new Date(startDateStr);
    if (!startDateStr.includes('T')) {
      start.setHours(0, 0, 0, 0);
    }
  } else {
    start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    start.setHours(0, 0, 0, 0);
  }

  let end: Date;
  if (endDateStr) {
    end = new Date(endDateStr);
    if (!endDateStr.includes('T')) {
      end.setHours(23, 59, 59, 999);
    }
  } else {
    end = new Date();
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

export const getLoyaltyTransactionsMetrics = async (tenantId: number, query: LoyaltyTransactionsQuery) => {
  const { start, end } = parseDateRange(query.startDate, query.endDate);

  const conditions = [
    eq(loyaltyTransactionsLedger.tenantId, tenantId),
    gte(loyaltyTransactionsLedger.createdAt, start),
    lte(loyaltyTransactionsLedger.createdAt, end),
    query.branchId ? eq(loyaltyTransactionsLedger.branchId, query.branchId) : undefined,
    query.customerId ? eq(loyaltyTransactionsLedger.customerId, query.customerId) : undefined,
    query.entryType && query.entryType !== 'ALL' ? eq(loyaltyTransactionsLedger.entryType, query.entryType) : undefined,
    query.search
      ? or(
          ilike(customers.name, `%${query.search}%`),
          ilike(customers.phone, `%${query.search}%`),
          ilike(loyaltyTransactionsLedger.auditReference, `%${query.search}%`),
          ilike(loyaltyTransactionsLedger.notes, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  // 1. Executive Summary Telemetry
  const [summary] = await db
    .select({
      totalLedgerEntries: sql<number>`count(*)`,
      totalPointsIssued: sql<number>`coalesce(sum(case when ${loyaltyTransactionsLedger.pointsDelta} > 0 then ${loyaltyTransactionsLedger.pointsDelta} else 0 end), 0)::numeric`,
      totalPointsRedeemed: sql<number>`coalesce(sum(case when ${loyaltyTransactionsLedger.pointsDelta} < 0 then abs(${loyaltyTransactionsLedger.pointsDelta}) else 0 end), 0)::numeric`,
      netPointsDelta: sql<number>`coalesce(sum(${loyaltyTransactionsLedger.pointsDelta}), 0)::numeric`,
      totalMonetaryEquivalentKes: sql<number>`coalesce(sum(${loyaltyTransactionsLedger.monetaryValueKes}), 0)::numeric`,
    })
    .from(loyaltyTransactionsLedger)
    .innerJoin(customers, eq(loyaltyTransactionsLedger.customerId, customers.id))
    .where(and(...conditions));

  // 2. Paginated Ledger Items
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  let orderClause = desc(loyaltyTransactionsLedger.createdAt);
  if (query.sortBy === 'POINTS') {
    orderClause = query.sortOrder === 'ASC' ? asc(loyaltyTransactionsLedger.pointsDelta) : desc(loyaltyTransactionsLedger.pointsDelta);
  } else if (query.sortBy === 'VALUE') {
    orderClause = query.sortOrder === 'ASC' ? asc(loyaltyTransactionsLedger.monetaryValueKes) : desc(loyaltyTransactionsLedger.monetaryValueKes);
  }

  const [countResult, ledgerRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(loyaltyTransactionsLedger)
      .innerJoin(customers, eq(loyaltyTransactionsLedger.customerId, customers.id))
      .where(and(...conditions)),
    db
      .select({
        id: loyaltyTransactionsLedger.id,
        entryType: loyaltyTransactionsLedger.entryType,
        pointsDelta: loyaltyTransactionsLedger.pointsDelta,
        monetaryValueKes: loyaltyTransactionsLedger.monetaryValueKes,
        balanceBefore: loyaltyTransactionsLedger.balanceBefore,
        balanceAfter: loyaltyTransactionsLedger.balanceAfter,
        channel: loyaltyTransactionsLedger.channel,
        auditReference: loyaltyTransactionsLedger.auditReference,
        notes: loyaltyTransactionsLedger.notes,
        createdAt: loyaltyTransactionsLedger.createdAt,
        customerId: customers.id,
        customerName: customers.name,
        customerPhone: customers.phone,
        orderNumber: orders.orderNumber,
        rewardName: loyaltyRewardsCatalog.name,
        branchName: branches.name,
        processedByName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      })
      .from(loyaltyTransactionsLedger)
      .innerJoin(customers, eq(loyaltyTransactionsLedger.customerId, customers.id))
      .leftJoin(orders, eq(loyaltyTransactionsLedger.orderId, orders.id))
      .leftJoin(loyaltyRewardsCatalog, eq(loyaltyTransactionsLedger.rewardId, loyaltyRewardsCatalog.id))
      .leftJoin(branches, eq(loyaltyTransactionsLedger.branchId, branches.id))
      .leftJoin(users, eq(loyaltyTransactionsLedger.processedById, users.id))
      .where(and(...conditions))
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return {
    summary: {
      totalLedgerEntries: Number(summary?.totalLedgerEntries || 0),
      totalPointsIssued: Number(summary?.totalPointsIssued || 0),
      totalPointsRedeemed: Number(summary?.totalPointsRedeemed || 0),
      netPointsDelta: Number(summary?.netPointsDelta || 0),
      totalMonetaryEquivalentKes: Number(summary?.totalMonetaryEquivalentKes || 0),
    },
    transactions: ledgerRows.map((row) => ({
      ...row,
      monetaryValueKes: Number(row.monetaryValueKes),
      processedByName: row.processedByName || 'System Automation',
      branchName: row.branchName || 'Primary Terminal',
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getExportableLoyaltyTransactions = async (tenantId: number, query: LoyaltyTransactionsQuery) => {
  return await getLoyaltyTransactionsMetrics(tenantId, { ...query, limit: 2000, page: 1 });
};