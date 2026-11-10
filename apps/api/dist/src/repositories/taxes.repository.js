"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryInvoiceFiscalization = exports.listTaxCodes = exports.listFiscalInvoices = exports.getTaxLiabilityTelemetry = exports.updateTenantTaxSettings = exports.getTenantTaxSettings = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getTenantTaxSettings = async (tenantId) => {
    let [settings] = await db_1.db
        .select()
        .from(schema_1.tenantFinancialSettings)
        .where((0, drizzle_orm_1.eq)(schema_1.tenantFinancialSettings.tenantId, tenantId))
        .limit(1);
    // If no custom financial settings exist yet, create default configuration once
    if (!settings) {
        const [created] = await db_1.db
            .insert(schema_1.tenantFinancialSettings)
            .values({
            tenantId,
            baseCurrency: 'KES',
            fiscalYearStartMonth: 1,
            isVatInclusive: true,
            vatRate: '16.00',
            isCateringLevyEnabled: true,
            cateringLevyRate: '2.00',
            isServiceChargeEnabled: false,
            serviceChargeRate: '5.00',
            etimsEnvironment: 'SANDBOX',
            autoFiscalizeOnPayment: true,
            etimsBranchCode: '00',
            allowOfflineFiscalSign: true,
        })
            .returning();
        settings = created;
    }
    return {
        ...settings,
        vatRate: Number(settings.vatRate),
        cateringLevyRate: Number(settings.cateringLevyRate),
        serviceChargeRate: Number(settings.serviceChargeRate),
    };
};
exports.getTenantTaxSettings = getTenantTaxSettings;
const updateTenantTaxSettings = async (tenantId, input) => {
    const updateData = {
        updatedAt: new Date(),
    };
    if (input.taxPin !== undefined)
        updateData.taxPin = input.taxPin;
    if (input.vatRate !== undefined)
        updateData.vatRate = input.vatRate.toFixed(2);
    if (input.isVatInclusive !== undefined)
        updateData.isVatInclusive = input.isVatInclusive;
    if (input.isCateringLevyEnabled !== undefined)
        updateData.isCateringLevyEnabled = input.isCateringLevyEnabled;
    if (input.cateringLevyRate !== undefined)
        updateData.cateringLevyRate = input.cateringLevyRate.toFixed(2);
    if (input.isServiceChargeEnabled !== undefined)
        updateData.isServiceChargeEnabled = input.isServiceChargeEnabled;
    if (input.serviceChargeRate !== undefined)
        updateData.serviceChargeRate = input.serviceChargeRate.toFixed(2);
    if (input.etimsEnvironment !== undefined)
        updateData.etimsEnvironment = input.etimsEnvironment;
    if (input.autoFiscalizeOnPayment !== undefined)
        updateData.autoFiscalizeOnPayment = input.autoFiscalizeOnPayment;
    if (input.etimsMiddleServerUrl !== undefined)
        updateData.etimsMiddleServerUrl = input.etimsMiddleServerUrl;
    if (input.etimsDeviceSerial !== undefined)
        updateData.etimsDeviceSerial = input.etimsDeviceSerial;
    if (input.etimsBranchCode !== undefined)
        updateData.etimsBranchCode = input.etimsBranchCode;
    if (input.allowOfflineFiscalSign !== undefined)
        updateData.allowOfflineFiscalSign = input.allowOfflineFiscalSign;
    const [updated] = await db_1.db
        .update(schema_1.tenantFinancialSettings)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.tenantFinancialSettings.tenantId, tenantId))
        .returning();
    return updated;
};
exports.updateTenantTaxSettings = updateTenantTaxSettings;
const getTaxLiabilityTelemetry = async (tenantId, branchId, periodYear, periodMonth) => {
    const year = periodYear || new Date().getFullYear();
    const month = periodMonth || new Date().getMonth() + 1;
    const branchCondition = branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, branchId) : undefined;
    const supplierBranchCondition = branchId ? (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.branchId, branchId) : undefined;
    const fiscalBranchCondition = branchId ? (0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.branchId, branchId) : undefined;
    const dateFilterOrders = (0, drizzle_orm_1.sql) `extract(year from ${schema_1.orders.createdAt}) = ${year} and extract(month from ${schema_1.orders.createdAt}) = ${month}`;
    const dateFilterPurchases = (0, drizzle_orm_1.sql) `extract(year from ${schema_1.supplierInvoices.invoiceDate}) = ${year} and extract(month from ${schema_1.supplierInvoices.invoiceDate}) = ${month}`;
    const dateFilterFiscal = (0, drizzle_orm_1.sql) `extract(year from ${schema_1.fiscalInvoices.createdAt}) = ${year} and extract(month from ${schema_1.fiscalInvoices.createdAt}) = ${month}`;
    // 1. Output Tax Liability from Point-of-Sale Orders (Completed/Paid)
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
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.orders.paymentStatus, 'Paid'), branchCondition, dateFilterOrders));
    // 2. Input Tax Deductions from Verified Supplier Invoices (B2B Purchases)
    const [inputTax] = await db_1.db
        .select({
        grossPurchasesKes: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.supplierInvoices.totalAmount}), 0)::numeric`,
        inputVatKes: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.supplierInvoices.taxAmount}), 0)::numeric`,
        invoicesCount: (0, drizzle_orm_1.sql) `count(*)::int`,
    })
        .from(schema_1.supplierInvoices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId), supplierBranchCondition, dateFilterPurchases));
    // 3. Fiscal Device (eTIMS) Real-Time Transmission Health
    const [fiscalStats] = await db_1.db
        .select({
        totalGenerated: (0, drizzle_orm_1.sql) `count(*)::int`,
        fiscalizedCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.fiscalInvoices.fiscalStatus} = 'FISCALIZED' then 1 end)::int`,
        pendingCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.fiscalInvoices.fiscalStatus} = 'PENDING' then 1 end)::int`,
        failedCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.fiscalInvoices.fiscalStatus} = 'FAILED' then 1 end)::int`,
    })
        .from(schema_1.fiscalInvoices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.tenantId, tenantId), fiscalBranchCondition, dateFilterFiscal));
    const outputVat = Number(outputTax?.outputVatKes || 0);
    const inputVat = Number(inputTax?.inputVatKes || 0);
    const netPayableVat = Math.round((outputVat - inputVat) * 100) / 100;
    return {
        period: { year, month },
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
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.branchId, query.branchId) : undefined,
        query.status && query.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.fiscalStatus, query.status) : undefined,
    ].filter(Boolean);
    const [countResult, rows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.fiscalInvoices)
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
const listTaxCodes = async (tenantId) => {
    let codes = await db_1.db
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
    if (codes.length === 0) {
        const defaultCodes = [
            { code: 'VAT-16', name: 'Standard Rate (16% VAT)', rate: '16.00', statutoryCode: 'B' },
            { code: 'LEVY-2', name: 'Tourism & Catering Training Levy (2%)', rate: '2.00', statutoryCode: 'LEVY' },
            { code: 'ZERO-0', name: 'Zero-Rated Supplies (0%)', rate: '0.00', statutoryCode: 'A' },
            { code: 'EXEMPT', name: 'Exempt Goods & Services', rate: '0.00', statutoryCode: 'E' },
        ];
        codes = await db_1.db
            .insert(schema_1.taxCodes)
            .values(defaultCodes.map((c) => ({ ...c, tenantId, isActive: true })))
            .returning({
            id: schema_1.taxCodes.id,
            code: schema_1.taxCodes.code,
            name: schema_1.taxCodes.name,
            rate: schema_1.taxCodes.rate,
            statutoryCode: schema_1.taxCodes.statutoryCode,
            isActive: schema_1.taxCodes.isActive,
        });
    }
    return codes.map((c) => ({
        ...c,
        rate: Number(c.rate),
    }));
};
exports.listTaxCodes = listTaxCodes;
const retryInvoiceFiscalization = async (tenantId, fiscalInvoiceId) => {
    const [invoice] = await db_1.db
        .select()
        .from(schema_1.fiscalInvoices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.id, fiscalInvoiceId), (0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.tenantId, tenantId)))
        .limit(1);
    if (!invoice)
        throw new Error('Fiscal invoice record not found');
    // Increment retry attempt counter and reset to PENDING for queue pickup
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
