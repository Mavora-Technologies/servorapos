"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExportableLoyaltyTransactions = exports.getLoyaltyTransactionsMetrics = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const parseDateRange = (startDateStr, endDateStr) => {
    let start;
    if (startDateStr) {
        start = new Date(startDateStr);
        if (!startDateStr.includes('T')) {
            start.setHours(0, 0, 0, 0);
        }
    }
    else {
        start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        start.setHours(0, 0, 0, 0);
    }
    let end;
    if (endDateStr) {
        end = new Date(endDateStr);
        if (!endDateStr.includes('T')) {
            end.setHours(23, 59, 59, 999);
        }
    }
    else {
        end = new Date();
        end.setHours(23, 59, 59, 999);
    }
    return { start, end };
};
const getLoyaltyTransactionsMetrics = async (tenantId, query) => {
    const { start, end } = parseDateRange(query.startDate, query.endDate);
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.loyaltyTransactionsLedger.tenantId, tenantId),
        (0, drizzle_orm_1.gte)(schema_1.loyaltyTransactionsLedger.createdAt, start),
        (0, drizzle_orm_1.lte)(schema_1.loyaltyTransactionsLedger.createdAt, end),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.loyaltyTransactionsLedger.branchId, query.branchId) : undefined,
        query.customerId ? (0, drizzle_orm_1.eq)(schema_1.loyaltyTransactionsLedger.customerId, query.customerId) : undefined,
        query.entryType && query.entryType !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.loyaltyTransactionsLedger.entryType, query.entryType) : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.customers.name, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.phone, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.loyaltyTransactionsLedger.auditReference, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.loyaltyTransactionsLedger.notes, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    // 1. Executive Summary Telemetry
    const [summary] = await db_1.db
        .select({
        totalLedgerEntries: (0, drizzle_orm_1.sql) `count(*)`,
        totalPointsIssued: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.loyaltyTransactionsLedger.pointsDelta} > 0 then ${schema_1.loyaltyTransactionsLedger.pointsDelta} else 0 end), 0)::numeric`,
        totalPointsRedeemed: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.loyaltyTransactionsLedger.pointsDelta} < 0 then abs(${schema_1.loyaltyTransactionsLedger.pointsDelta}) else 0 end), 0)::numeric`,
        netPointsDelta: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.loyaltyTransactionsLedger.pointsDelta}), 0)::numeric`,
        totalMonetaryEquivalentKes: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.loyaltyTransactionsLedger.monetaryValueKes}), 0)::numeric`,
    })
        .from(schema_1.loyaltyTransactionsLedger)
        .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.loyaltyTransactionsLedger.customerId, schema_1.customers.id))
        .where((0, drizzle_orm_1.and)(...conditions));
    // 2. Paginated Ledger Items
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    let orderClause = (0, drizzle_orm_1.desc)(schema_1.loyaltyTransactionsLedger.createdAt);
    if (query.sortBy === 'POINTS') {
        orderClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(schema_1.loyaltyTransactionsLedger.pointsDelta) : (0, drizzle_orm_1.desc)(schema_1.loyaltyTransactionsLedger.pointsDelta);
    }
    else if (query.sortBy === 'VALUE') {
        orderClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(schema_1.loyaltyTransactionsLedger.monetaryValueKes) : (0, drizzle_orm_1.desc)(schema_1.loyaltyTransactionsLedger.monetaryValueKes);
    }
    const [countResult, ledgerRows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.loyaltyTransactionsLedger)
            .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.loyaltyTransactionsLedger.customerId, schema_1.customers.id))
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            id: schema_1.loyaltyTransactionsLedger.id,
            entryType: schema_1.loyaltyTransactionsLedger.entryType,
            pointsDelta: schema_1.loyaltyTransactionsLedger.pointsDelta,
            monetaryValueKes: schema_1.loyaltyTransactionsLedger.monetaryValueKes,
            balanceBefore: schema_1.loyaltyTransactionsLedger.balanceBefore,
            balanceAfter: schema_1.loyaltyTransactionsLedger.balanceAfter,
            channel: schema_1.loyaltyTransactionsLedger.channel,
            auditReference: schema_1.loyaltyTransactionsLedger.auditReference,
            notes: schema_1.loyaltyTransactionsLedger.notes,
            createdAt: schema_1.loyaltyTransactionsLedger.createdAt,
            customerId: schema_1.customers.id,
            customerName: schema_1.customers.name,
            customerPhone: schema_1.customers.phone,
            orderNumber: schema_1.orders.orderNumber,
            rewardName: schema_1.loyaltyRewardsCatalog.name,
            branchName: schema_1.branches.name,
            processedByName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        })
            .from(schema_1.loyaltyTransactionsLedger)
            .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.loyaltyTransactionsLedger.customerId, schema_1.customers.id))
            .leftJoin(schema_1.orders, (0, drizzle_orm_1.eq)(schema_1.loyaltyTransactionsLedger.orderId, schema_1.orders.id))
            .leftJoin(schema_1.loyaltyRewardsCatalog, (0, drizzle_orm_1.eq)(schema_1.loyaltyTransactionsLedger.rewardId, schema_1.loyaltyRewardsCatalog.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.loyaltyTransactionsLedger.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.loyaltyTransactionsLedger.processedById, schema_1.users.id))
            .where((0, drizzle_orm_1.and)(...conditions))
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
exports.getLoyaltyTransactionsMetrics = getLoyaltyTransactionsMetrics;
const getExportableLoyaltyTransactions = async (tenantId, query) => {
    return await (0, exports.getLoyaltyTransactionsMetrics)(tenantId, { ...query, limit: 2000, page: 1 });
};
exports.getExportableLoyaltyTransactions = getExportableLoyaltyTransactions;
