import { eq, and, desc, asc, sql, or, ilike, gte, lte } from 'drizzle-orm';
import { db } from '../config/db';
import {
  tenantFinancialSettings,
  taxCodes,
  fiscalInvoices,
  orders,
  supplierInvoices,
  branches,
  users,
} from '../config/schema';
import {
  TaxReportQuery,
  UpdateTaxSettingsInput,
} from '../validators/taxes.validator';

export const getTenantTaxSettings = async (tenantId: number) => {
  let [settings] = await db
    .select()
    .from(tenantFinancialSettings)
    .where(eq(tenantFinancialSettings.tenantId, tenantId))
    .limit(1);

  // If no custom financial settings exist yet, create default configuration once
  if (!settings) {
    const [created] = await db
      .insert(tenantFinancialSettings)
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

export const updateTenantTaxSettings = async (
  tenantId: number,
  input: UpdateTaxSettingsInput
) => {
  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (input.taxPin !== undefined) updateData.taxPin = input.taxPin;
  if (input.vatRate !== undefined) updateData.vatRate = input.vatRate.toFixed(2);
  if (input.isVatInclusive !== undefined) updateData.isVatInclusive = input.isVatInclusive;
  if (input.isCateringLevyEnabled !== undefined) updateData.isCateringLevyEnabled = input.isCateringLevyEnabled;
  if (input.cateringLevyRate !== undefined) updateData.cateringLevyRate = input.cateringLevyRate.toFixed(2);
  if (input.isServiceChargeEnabled !== undefined) updateData.isServiceChargeEnabled = input.isServiceChargeEnabled;
  if (input.serviceChargeRate !== undefined) updateData.serviceChargeRate = input.serviceChargeRate.toFixed(2);
  if (input.etimsEnvironment !== undefined) updateData.etimsEnvironment = input.etimsEnvironment;
  if (input.autoFiscalizeOnPayment !== undefined) updateData.autoFiscalizeOnPayment = input.autoFiscalizeOnPayment;
  if (input.etimsMiddleServerUrl !== undefined) updateData.etimsMiddleServerUrl = input.etimsMiddleServerUrl;
  if (input.etimsDeviceSerial !== undefined) updateData.etimsDeviceSerial = input.etimsDeviceSerial;
  if (input.etimsBranchCode !== undefined) updateData.etimsBranchCode = input.etimsBranchCode;
  if (input.allowOfflineFiscalSign !== undefined) updateData.allowOfflineFiscalSign = input.allowOfflineFiscalSign;

  const [updated] = await db
    .update(tenantFinancialSettings)
    .set(updateData)
    .where(eq(tenantFinancialSettings.tenantId, tenantId))
    .returning();

  return updated;
};

export const getTaxLiabilityTelemetry = async (
  tenantId: number,
  branchId?: number,
  periodYear?: number,
  periodMonth?: number
) => {
  const year = periodYear || new Date().getFullYear();
  const month = periodMonth || new Date().getMonth() + 1;

  const branchCondition = branchId ? eq(orders.branchId, branchId) : undefined;
  const supplierBranchCondition = branchId ? eq(supplierInvoices.branchId, branchId) : undefined;
  const fiscalBranchCondition = branchId ? eq(fiscalInvoices.branchId, branchId) : undefined;

  const dateFilterOrders = sql`extract(year from ${orders.createdAt}) = ${year} and extract(month from ${orders.createdAt}) = ${month}`;
  const dateFilterPurchases = sql`extract(year from ${supplierInvoices.invoiceDate}) = ${year} and extract(month from ${supplierInvoices.invoiceDate}) = ${month}`;
  const dateFilterFiscal = sql`extract(year from ${fiscalInvoices.createdAt}) = ${year} and extract(month from ${fiscalInvoices.createdAt}) = ${month}`;

  // 1. Output Tax Liability from Point-of-Sale Orders (Completed/Paid)
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
        eq(orders.paymentStatus, 'Paid'),
        branchCondition,
        dateFilterOrders
      )
    );

  // 2. Input Tax Deductions from Verified Supplier Invoices (B2B Purchases)
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
        dateFilterPurchases
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
        dateFilterFiscal
      )
    );

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

export const listFiscalInvoices = async (
  tenantId: number,
  query: TaxReportQuery
) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(fiscalInvoices.tenantId, tenantId),
    query.branchId ? eq(fiscalInvoices.branchId, query.branchId) : undefined,
    query.status && query.status !== 'ALL' ? eq(fiscalInvoices.fiscalStatus, query.status) : undefined,
  ].filter(Boolean);

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(fiscalInvoices)
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
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const listTaxCodes = async (tenantId: number) => {
  let codes = await db
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

  if (codes.length === 0) {
    const defaultCodes = [
      { code: 'VAT-16', name: 'Standard Rate (16% VAT)', rate: '16.00', statutoryCode: 'B' },
      { code: 'LEVY-2', name: 'Tourism & Catering Training Levy (2%)', rate: '2.00', statutoryCode: 'LEVY' },
      { code: 'ZERO-0', name: 'Zero-Rated Supplies (0%)', rate: '0.00', statutoryCode: 'A' },
      { code: 'EXEMPT', name: 'Exempt Goods & Services', rate: '0.00', statutoryCode: 'E' },
    ];

    codes = await db
      .insert(taxCodes)
      .values(defaultCodes.map((c) => ({ ...c, tenantId, isActive: true })))
      .returning({
        id: taxCodes.id,
        code: taxCodes.code,
        name: taxCodes.name,
        rate: taxCodes.rate,
        statutoryCode: taxCodes.statutoryCode,
        isActive: taxCodes.isActive,
      });
  }

  return codes.map((c) => ({
    ...c,
    rate: Number(c.rate),
  }));
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

  // Increment retry attempt counter and reset to PENDING for queue pickup
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