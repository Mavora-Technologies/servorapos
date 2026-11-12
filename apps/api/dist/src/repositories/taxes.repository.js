"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryInvoiceFiscalization = exports.createTaxCodeRecord = exports.listTaxCodes = exports.listFiscalInvoices = exports.getTaxLiabilityTelemetry = exports.updateTenantTaxSettings = exports.getTenantTaxSettings = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
// Pure read-only retrieval (Zero auto-seeding on SELECT)
const getTenantTaxSettings = async (tenantId) => {
    const [settings] = await db_1.db
        .select()
        .from(schema_1.tenantFinancialSettings)
        .where((0, drizzle_orm_1.eq)(schema_1.tenantFinancialSettings.tenantId, tenantId))
        .limit(1);
    if (!settings)
        return null;
    return {
        ...settings,
        vatRate: Number(settings.vatRate),
        cateringLevyRate: Number(settings.cateringLevyRate),
        serviceChargeRate: Number(settings.serviceChargeRate),
    };
};
exports.getTenantTaxSettings = getTenantTaxSettings;
const updateTenantTaxSettings = async (tenantId, userId, input) => {
    const [existing] = await db_1.db
        .select({ id: schema_1.tenantFinancialSettings.id })
        .from(schema_1.tenantFinancialSettings)
        .where((0, drizzle_orm_1.eq)(schema_1.tenantFinancialSettings.tenantId, tenantId))
        .limit(1);
    const payload = {
        updatedAt: new Date(),
    };
    if (input.taxPin !== undefined)
        payload.taxPin = input.taxPin;
    if (input.vatRate !== undefined)
        payload.vatRate = input.vatRate.toFixed(2);
    if (input.isVatInclusive !== undefined)
        payload.isVatInclusive = input.isVatInclusive;
    if (input.isCateringLevyEnabled !== undefined)
        payload.isCateringLevyEnabled = input.isCateringLevyEnabled;
    if (input.cateringLevyRate !== undefined)
        payload.cateringLevyRate = input.cateringLevyRate.toFixed(2);
    if (input.isServiceChargeEnabled !== undefined)
        payload.isServiceChargeEnabled = input.isServiceChargeEnabled;
    if (input.serviceChargeRate !== undefined)
        payload.serviceChargeRate = input.serviceChargeRate.toFixed(2);
    if (input.etimsEnvironment !== undefined)
        payload.etimsEnvironment = input.etimsEnvironment;
    if (input.autoFiscalizeOnPayment !== undefined)
        payload.autoFiscalizeOnPayment = input.autoFiscalizeOnPayment;
    if (input.etimsMiddleServerUrl !== undefined)
        payload.etimsMiddleServerUrl = input.etimsMiddleServerUrl || null;
    if (input.etimsDeviceSerial !== undefined)
        payload.etimsDeviceSerial = input.etimsDeviceSerial;
    if (input.etimsBranchCode !== undefined)
        payload.etimsBranchCode = input.etimsBranchCode;
    if (input.allowOfflineFiscalSign !== undefined)
        payload.allowOfflineFiscalSign = input.allowOfflineFiscalSign;
    let saved;
    if (!existing) {
        const [created] = await db_1.db
            .insert(schema_1.tenantFinancialSettings)
            .values({
            tenantId,
            baseCurrency: 'KES',
            fiscalYearStartMonth: 1,
            ...payload,
        })
            .returning();
        saved = created;
    }
    else {
        const [updated] = await db_1.db
            .update(schema_1.tenantFinancialSettings)
            .set(payload)
            .where((0, drizzle_orm_1.eq)(schema_1.tenantFinancialSettings.tenantId, tenantId))
            .returning();
        saved = updated;
    }
    await db_1.db.insert(schema_1.auditLogs).values({
        tenantId,
        userId,
        action: 'TAX_CONFIGURATION_UPDATED',
        module: 'FINANCE',
        entityType: 'tenant_financial_settings',
        entityId: String(saved.id),
        reason: `Updated statutory tax parameters (${input.etimsEnvironment})`,
        newValues: payload,
    });
    return saved;
};
exports.updateTenantTaxSettings = updateTenantTaxSettings;
const getTaxLiabilityTelemetry = async (tenantId, params) => {
    const year = params.periodYear || new Date().getFullYear();
    const month = params.periodMonth || new Date().getMonth() + 1;
    const quarter = params.periodQuarter || Math.ceil(month / 3);
    const periodType = params.periodType || 'MONTH';
    const branchCondition = params.branchId
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.orders.branchId, params.branchId), (0, drizzle_orm_1.isNull)(schema_1.orders.branchId))
        : undefined;
    const supplierBranchCondition = params.branchId
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.branchId, params.branchId), (0, drizzle_orm_1.isNull)(schema_1.supplierInvoices.branchId))
        : undefined;
    const fiscalBranchCondition = params.branchId
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.branchId, params.branchId), (0, drizzle_orm_1.isNull)(schema_1.fiscalInvoices.branchId))
        : undefined;
    const buildPeriodSql = (col) => {
        if (periodType === 'YEAR') {
            return (0, drizzle_orm_1.sql) `extract(year from ${col}) = ${year}`;
        }
        if (periodType === 'QUARTER') {
            return (0, drizzle_orm_1.sql) `extract(year from ${col}) = ${year} and extract(quarter from ${col}) = ${quarter}`;
        }
        return (0, drizzle_orm_1.sql) `extract(year from ${col}) = ${year} and extract(month from ${col}) = ${month}`;
    };
    // 1. Output Tax Liability from Settled POS Orders
    const [outputTax] = await db_1.db
        .select({
        grossSalesKes: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.total}), 0)::numeric`,
        netTaxableSalesKes: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.subtotal}), 0)::numeric`,
        outputVatKes: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.tax}), 0)::numeric`,
        cateringLevyKes: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.cateringLevy}), 0)::numeric`,
        serviceChargeKes: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.serviceCharge}), 0)::numeric`,
        paidOrdersCount: (0, drizzle_orm_1.sql) `count(*)::int`,
    })
        .from(schema_1.orders)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.sql) `UPPER(${schema_1.orders.status}) != 'CANCELLED'`, (0, drizzle_orm_1.sql) `UPPER(${schema_1.orders.paymentStatus}) IN ('PAID', 'PARTIAL')`, branchCondition, buildPeriodSql(schema_1.orders.createdAt)));
    // 2. Input Tax Deductions from Verified Supplier Invoices
    const [inputTax] = await db_1.db
        .select({
        grossPurchasesKes: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.supplierInvoices.totalAmount}), 0)::numeric`,
        inputVatKes: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.supplierInvoices.taxAmount}), 0)::numeric`,
        invoicesCount: (0, drizzle_orm_1.sql) `count(*)::int`,
    })
        .from(schema_1.supplierInvoices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId), supplierBranchCondition, buildPeriodSql(schema_1.supplierInvoices.invoiceDate)));
    // 3. Fiscal Device (eTIMS) Real-Time Transmission Health
    const [fiscalStats] = await db_1.db
        .select({
        totalGenerated: (0, drizzle_orm_1.sql) `count(*)::int`,
        fiscalizedCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.fiscalInvoices.fiscalStatus} = 'FISCALIZED' then 1 end)::int`,
        pendingCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.fiscalInvoices.fiscalStatus} = 'PENDING' then 1 end)::int`,
        failedCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.fiscalInvoices.fiscalStatus} = 'FAILED' then 1 end)::int`,
    })
        .from(schema_1.fiscalInvoices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.tenantId, tenantId), fiscalBranchCondition, buildPeriodSql(schema_1.fiscalInvoices.createdAt)));
    const outputVat = Number(outputTax?.outputVatKes || 0);
    const inputVat = Number(inputTax?.inputVatKes || 0);
    const netPayableVat = Math.round((outputVat - inputVat) * 100) / 100;
    // Compute KRA Statutory Filing Deadline (20th of the following month for monthly VAT)
    const filingDeadlineDate = periodType === 'MONTH'
        ? new Date(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 20)
            .toISOString()
            .split('T')[0]
        : `${year}-12-31`;
    return {
        period: { year, month, quarter, periodType, filingDeadlineDate },
        salesOutputTax: {
            grossSalesKes: Number(outputTax?.grossSalesKes || 0),
            netTaxableSalesKes: Number(outputTax?.netTaxableSalesKes || 0),
            outputVatKes: outputVat,
            cateringLevyKes: Number(outputTax?.cateringLevyKes || 0),
            serviceChargeKes: Number(outputTax?.serviceChargeKes || 0),
            paidOrdersCount: Number(outputTax?.paidOrdersCount || 0),
        },
        purchasesInputTax: {
            grossPurchasesKes: Number(inputTax?.grossPurchasesKes || 0),
            inputVatKes: inputVat,
            invoicesCount: Number(inputTax?.invoicesCount || 0),
        },
        netVatObligation: {
            netPayableVatKes: netPayableVat,
            isCreditRefundable: netPayableVat < 0,
        },
        etimsTransmissionTelemetry: {
            totalReceipts: Number(fiscalStats?.totalGenerated || 0),
            fiscalized: Number(fiscalStats?.fiscalizedCount || 0),
            pending: Number(fiscalStats?.pendingCount || 0),
            failed: Number(fiscalStats?.failedCount || 0),
            successRatePct: Number(fiscalStats?.totalGenerated || 0) > 0
                ? Math.round((Number(fiscalStats?.fiscalizedCount || 0) /
                    Number(fiscalStats?.totalGenerated || 0)) *
                    1000) / 10
                : 100,
        },
    };
};
exports.getTaxLiabilityTelemetry = getTaxLiabilityTelemetry;
const listFiscalInvoices = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.tenantId, tenantId),
        query.branchId
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.branchId, query.branchId), (0, drizzle_orm_1.isNull)(schema_1.fiscalInvoices.branchId))
            : undefined,
        query.status && query.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.fiscalStatus, query.status) : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.orders.orderNumber, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.fiscalInvoices.cuInvoiceNumber, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.fiscalInvoices.buyerKraPin, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    const [countResult, rows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.fiscalInvoices)
            .leftJoin(schema_1.orders, (0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.orderId, schema_1.orders.id))
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            id: schema_1.fiscalInvoices.id,
            invoiceType: schema_1.fiscalInvoices.invoiceType,
            orderId: schema_1.fiscalInvoices.orderId,
            orderNumber: schema_1.orders.orderNumber,
            buyerKraPin: schema_1.fiscalInvoices.buyerKraPin,
            cuInvoiceNumber: schema_1.fiscalInvoices.cuInvoiceNumber,
            sdcId: schema_1.fiscalInvoices.sdcId,
            qrCodeUrl: schema_1.fiscalInvoices.qrCodeUrl,
            fiscalStatus: schema_1.fiscalInvoices.fiscalStatus,
            retryCount: schema_1.fiscalInvoices.retryCount,
            lastError: schema_1.fiscalInvoices.lastError,
            fiscalizedAt: schema_1.fiscalInvoices.fiscalizedAt,
            createdAt: schema_1.fiscalInvoices.createdAt,
            orderTotal: schema_1.orders.total,
            orderTax: schema_1.orders.tax,
            orderLevy: schema_1.orders.cateringLevy,
            branchName: schema_1.branches.name,
        })
            .from(schema_1.fiscalInvoices)
            .leftJoin(schema_1.orders, (0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.orderId, schema_1.orders.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.branchId, schema_1.branches.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.fiscalInvoices.createdAt))
            .limit(limit)
            .offset(offset),
    ]);
    const total = Number(countResult[0]?.count || 0);
    return {
        invoices: rows.map((r) => ({
            ...r,
            orderTotal: Number(r.orderTotal || 0),
            orderTax: Number(r.orderTax || 0),
            orderLevy: Number(r.orderLevy || 0),
        })),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
    };
};
exports.listFiscalInvoices = listFiscalInvoices;
// Pure read-only retrieval (Zero auto-seeding on SELECT)
const listTaxCodes = async (tenantId) => {
    const codes = await db_1.db
        .select({
        id: schema_1.taxCodes.id,
        code: schema_1.taxCodes.code,
        name: schema_1.taxCodes.name,
        rate: schema_1.taxCodes.rate,
        statutoryCode: schema_1.taxCodes.statutoryCode,
        isActive: schema_1.taxCodes.isActive,
    })
        .from(schema_1.taxCodes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxCodes.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.taxCodes.isActive, true)))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.taxCodes.code));
    return codes.map((c) => ({
        ...c,
        rate: Number(c.rate),
    }));
};
exports.listTaxCodes = listTaxCodes;
const createTaxCodeRecord = async (tenantId, input) => {
    const [created] = await db_1.db
        .insert(schema_1.taxCodes)
        .values({
        tenantId,
        code: input.code,
        name: input.name,
        rate: input.rate.toFixed(2),
        statutoryCode: input.statutoryCode || null,
        isActive: true,
    })
        .returning();
    return {
        ...created,
        rate: Number(created.rate),
    };
};
exports.createTaxCodeRecord = createTaxCodeRecord;
const retryInvoiceFiscalization = async (tenantId, fiscalInvoiceId) => {
    const [invoice] = await db_1.db
        .select()
        .from(schema_1.fiscalInvoices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.id, fiscalInvoiceId), (0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.tenantId, tenantId)))
        .limit(1);
    if (!invoice)
        throw new Error('Fiscal invoice record not found');
    const [updated] = await db_1.db
        .update(schema_1.fiscalInvoices)
        .set({
        fiscalStatus: 'PENDING',
        retryCount: invoice.retryCount + 1,
        lastError: null,
    })
        .where((0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.id, fiscalInvoiceId))
        .returning();
    return updated;
};
exports.retryInvoiceFiscalization = retryInvoiceFiscalization;
