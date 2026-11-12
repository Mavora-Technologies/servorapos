import { eq, and, desc, asc, sql, or, isNull, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  tenantFinancialSettings,
  taxCodes,
  fiscalInvoices,
  orders,
  supplierInvoices,
  branches,
  auditLogs,
} from '../config/schema';
import {
  TaxReportQuery,
  UpdateTaxSettingsInput,
  CreateTaxCodeInput,
} from '../validators/taxes.validator';

// Pure read-only retrieval (Zero auto-seeding on SELECT)
export const getTenantTaxSettings = async (tenantId: number) => {
  const [settings] = await db
    .select()
    .from(tenantFinancialSettings)
    .where(eq(tenantFinancialSettings.tenantId, tenantId))
    .limit(1);

  if (!settings) return null;

  return {
    ...settings,
    vatRate: Number(settings.vatRate),
    cateringLevyRate: Number(settings.cateringLevyRate),
    serviceChargeRate: Number(settings.serviceChargeRate),
  };
};

export const updateTenantTaxSettings = async (
  tenantId: number,
  userId: number,
  input: UpdateTaxSettingsInput
) => {
  const [existing] = await db
    .select({ id: tenantFinancialSettings.id })
    .from(tenantFinancialSettings)
    .where(eq(tenantFinancialSettings.tenantId, tenantId))
    .limit(1);

  const payload: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (input.taxPin !== undefined) payload.taxPin = input.taxPin;
  if (input.vatRate !== undefined) payload.vatRate = input.vatRate.toFixed(2);
  if (input.isVatInclusive !== undefined) payload.isVatInclusive = input.isVatInclusive;
  if (input.isCateringLevyEnabled !== undefined) payload.isCateringLevyEnabled = input.isCateringLevyEnabled;
  if (input.cateringLevyRate !== undefined) payload.cateringLevyRate = input.cateringLevyRate.toFixed(2);
  if (input.isServiceChargeEnabled !== undefined) payload.isServiceChargeEnabled = input.isServiceChargeEnabled;
  if (input.serviceChargeRate !== undefined) payload.serviceChargeRate = input.serviceChargeRate.toFixed(2);
  if (input.etimsEnvironment !== undefined) payload.etimsEnvironment = input.etimsEnvironment;
  if (input.autoFiscalizeOnPayment !== undefined) payload.autoFiscalizeOnPayment = input.autoFiscalizeOnPayment;
  if (input.etimsMiddleServerUrl !== undefined) payload.etimsMiddleServerUrl = input.etimsMiddleServerUrl || null;
  if (input.etimsDeviceSerial !== undefined) payload.etimsDeviceSerial = input.etimsDeviceSerial;
  if (input.etimsBranchCode !== undefined) payload.etimsBranchCode = input.etimsBranchCode;
  if (input.allowOfflineFiscalSign !== undefined) payload.allowOfflineFiscalSign = input.allowOfflineFiscalSign;

  let saved;
  if (!existing) {
    const [created] = await db
      .insert(tenantFinancialSettings)
      .values({
        tenantId,
        baseCurrency: 'KES',
        fiscalYearStartMonth: 1,
        ...payload,
      })
      .returning();
    saved = created;
  } else {
    const [updated] = await db
      .update(tenantFinancialSettings)
      .set(payload)
      .where(eq(tenantFinancialSettings.tenantId, tenantId))
      .returning();
    saved = updated;
  }

  await db.insert(auditLogs).values({
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

export const getTaxLiabilityTelemetry = async (
  tenantId: number,
  params: {
    branchId?: number;
    periodType?: 'MONTH' | 'QUARTER' | 'YEAR';
    periodYear?: number;
    periodMonth?: number;
    periodQuarter?: number;
  }
) => {
  const year = params.periodYear || new Date().getFullYear();
  const month = params.periodMonth || new Date().getMonth() + 1;
  const quarter = params.periodQuarter || Math.ceil(month / 3);
  const periodType = params.periodType || 'MONTH';

  const branchCondition = params.branchId
    ? or(eq(orders.branchId, params.branchId), isNull(orders.branchId))
    : undefined;
  const supplierBranchCondition = params.branchId
    ? or(eq(supplierInvoices.branchId, params.branchId), isNull(supplierInvoices.branchId))
    : undefined;
  const fiscalBranchCondition = params.branchId
    ? or(eq(fiscalInvoices.branchId, params.branchId), isNull(fiscalInvoices.branchId))
    : undefined;

  const buildPeriodSql = (col: any) => {
    if (periodType === 'YEAR') {
      return sql`extract(year from ${col}) = ${year}`;
    }
    if (periodType === 'QUARTER') {
      return sql`extract(year from ${col}) = ${year} and extract(quarter from ${col}) = ${quarter}`;
    }
    return sql`extract(year from ${col}) = ${year} and extract(month from ${col}) = ${month}`;
  };

  // 1. Output Tax Liability from Settled POS Orders
  const [outputTax] = await db
    .select({
      grossSalesKes: sql<number>`coalesce(sum(${orders.total}), 0)::numeric`,
      netTaxableSalesKes: sql<number>`coalesce(sum(${orders.subtotal}), 0)::numeric`,
      outputVatKes: sql<number>`coalesce(sum(${orders.tax}), 0)::numeric`,
      cateringLevyKes: sql<number>`coalesce(sum(${orders.cateringLevy}), 0)::numeric`,
      serviceChargeKes: sql<number>`coalesce(sum(${orders.serviceCharge}), 0)::numeric`,
      paidOrdersCount: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        sql`UPPER(${orders.status}) != 'CANCELLED'`,
        sql`UPPER(${orders.paymentStatus}) IN ('PAID', 'PARTIAL')`,
        branchCondition,
        buildPeriodSql(orders.createdAt)
      )
    );

  // 2. Input Tax Deductions from Verified Supplier Invoices
  const [inputTax] = await db
    .select({
      grossPurchasesKes: sql<number>`coalesce(sum(${supplierInvoices.totalAmount}), 0)::numeric`,
      inputVatKes: sql<number>`coalesce(sum(${supplierInvoices.taxAmount}), 0)::numeric`,
      invoicesCount: sql<number>`count(*)::int`,
    })
    .from(supplierInvoices)
    .where(
      and(
        eq(supplierInvoices.tenantId, tenantId),
        supplierBranchCondition,
        buildPeriodSql(supplierInvoices.invoiceDate)
      )
    );

  // 3. Fiscal Device (eTIMS) Real-Time Transmission Health
  const [fiscalStats] = await db
    .select({
      totalGenerated: sql<number>`count(*)::int`,
      fiscalizedCount: sql<number>`count(case when ${fiscalInvoices.fiscalStatus} = 'FISCALIZED' then 1 end)::int`,
      pendingCount: sql<number>`count(case when ${fiscalInvoices.fiscalStatus} = 'PENDING' then 1 end)::int`,
      failedCount: sql<number>`count(case when ${fiscalInvoices.fiscalStatus} = 'FAILED' then 1 end)::int`,
    })
    .from(fiscalInvoices)
    .where(
      and(
        eq(fiscalInvoices.tenantId, tenantId),
        fiscalBranchCondition,
        buildPeriodSql(fiscalInvoices.createdAt)
      )
    );

  const outputVat = Number(outputTax?.outputVatKes || 0);
  const inputVat = Number(inputTax?.inputVatKes || 0);
  const netPayableVat = Math.round((outputVat - inputVat) * 100) / 100;

  // Compute KRA Statutory Filing Deadline (20th of the following month for monthly VAT)
  const filingDeadlineDate =
    periodType === 'MONTH'
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
      successRatePct:
        Number(fiscalStats?.totalGenerated || 0) > 0
          ? Math.round(
              (Number(fiscalStats?.fiscalizedCount || 0) /
                Number(fiscalStats?.totalGenerated || 0)) *
                1000
            ) / 10
          : 100,
    },
  };
};

export const listFiscalInvoices = async (tenantId: number, query: TaxReportQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(fiscalInvoices.tenantId, tenantId),
    query.branchId
      ? or(eq(fiscalInvoices.branchId, query.branchId), isNull(fiscalInvoices.branchId))
      : undefined,
    query.status && query.status !== 'ALL' ? eq(fiscalInvoices.fiscalStatus, query.status) : undefined,
    query.search
      ? or(
          ilike(orders.orderNumber, `%${query.search}%`),
          ilike(fiscalInvoices.cuInvoiceNumber, `%${query.search}%`),
          ilike(fiscalInvoices.buyerKraPin, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(fiscalInvoices)
      .leftJoin(orders, eq(fiscalInvoices.orderId, orders.id))
      .where(and(...conditions)),
    db
      .select({
        id: fiscalInvoices.id,
        invoiceType: fiscalInvoices.invoiceType,
        orderId: fiscalInvoices.orderId,
        orderNumber: orders.orderNumber,
        buyerKraPin: fiscalInvoices.buyerKraPin,
        cuInvoiceNumber: fiscalInvoices.cuInvoiceNumber,
        sdcId: fiscalInvoices.sdcId,
        qrCodeUrl: fiscalInvoices.qrCodeUrl,
        fiscalStatus: fiscalInvoices.fiscalStatus,
        retryCount: fiscalInvoices.retryCount,
        lastError: fiscalInvoices.lastError,
        fiscalizedAt: fiscalInvoices.fiscalizedAt,
        createdAt: fiscalInvoices.createdAt,
        orderTotal: orders.total,
        orderTax: orders.tax,
        orderLevy: orders.cateringLevy,
        branchName: branches.name,
      })
      .from(fiscalInvoices)
      .leftJoin(orders, eq(fiscalInvoices.orderId, orders.id))
      .leftJoin(branches, eq(fiscalInvoices.branchId, branches.id))
      .where(and(...conditions))
      .orderBy(desc(fiscalInvoices.createdAt))
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

// Pure read-only retrieval (Zero auto-seeding on SELECT)
export const listTaxCodes = async (tenantId: number) => {
  const codes = await db
    .select({
      id: taxCodes.id,
      code: taxCodes.code,
      name: taxCodes.name,
      rate: taxCodes.rate,
      statutoryCode: taxCodes.statutoryCode,
      isActive: taxCodes.isActive,
    })
    .from(taxCodes)
    .where(and(eq(taxCodes.tenantId, tenantId), eq(taxCodes.isActive, true)))
    .orderBy(asc(taxCodes.code));

  return codes.map((c) => ({
    ...c,
    rate: Number(c.rate),
  }));
};

export const createTaxCodeRecord = async (tenantId: number, input: CreateTaxCodeInput) => {
  const [created] = await db
    .insert(taxCodes)
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

export const retryInvoiceFiscalization = async (
  tenantId: number,
  fiscalInvoiceId: number
) => {
  const [invoice] = await db
    .select()
    .from(fiscalInvoices)
    .where(and(eq(fiscalInvoices.id, fiscalInvoiceId), eq(fiscalInvoices.tenantId, tenantId)))
    .limit(1);

  if (!invoice) throw new Error('Fiscal invoice record not found');

  const [updated] = await db
    .update(fiscalInvoices)
    .set({
      fiscalStatus: 'PENDING',
      retryCount: invoice.retryCount + 1,
      lastError: null,
    })
    .where(eq(fiscalInvoices.id, fiscalInvoiceId))
    .returning();

  return updated;
};