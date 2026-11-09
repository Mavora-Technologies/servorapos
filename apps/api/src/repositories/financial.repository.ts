import { eq, and, asc } from 'drizzle-orm';
import { db } from '../config/db';
import { tenantFinancialSettings, taxCodes, tenants, branches } from '../config/schema';
import {
  UpdateFinancialSettingsInput,
  CreateTaxCodeInput,
} from '../validators/financial.validator';

export const getOrCreateFinancialSettings = async (tenantId: number) => {
  let [settings] = await db
    .select()
    .from(tenantFinancialSettings)
    .where(eq(tenantFinancialSettings.tenantId, tenantId))
    .limit(1);

  if (!settings) {
    // Proactively load tenant metadata to pre-populate corporate tax PIN & currency
    const [tenant] = await db
      .select({ kraPin: tenants.kraPin, currency: tenants.currency })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const [created] = await db
      .insert(tenantFinancialSettings)
      .values({
        tenantId,
        baseCurrency: tenant?.currency || 'KES',
        taxPin: tenant?.kraPin || '',
        vatRate: '16.00',
        cateringLevyRate: '2.00',
        serviceChargeRate: '5.00',
        isVatInclusive: true,
        isCateringLevyEnabled: true,
        isServiceChargeEnabled: false,
        etimsEnvironment: 'SANDBOX',
        autoFiscalizeOnPayment: true,
        etimsBranchCode: '00',
        tipDistributionModel: 'HOURS_WEIGHTED',
        defaultOvertimeMultiplier: '1.50',
        holidayOvertimeMultiplier: '2.00',
        maxDrawerCashThreshold: '50000.00',
      })
      .returning();

    settings = created;

    // Seed default statutory tax schedules
    await db.insert(taxCodes).values([
      { tenantId, code: 'VAT-16', name: 'Standard Rate Value Added Tax', rate: '16.00', statutoryCode: 'A' },
      { tenantId, code: 'ZERO-RATED', name: 'Zero-Rated Supplies (0%)', rate: '0.00', statutoryCode: 'B' },
      { tenantId, code: 'EXEMPT', name: 'Exempt Goods & Services', rate: '0.00', statutoryCode: 'C' },
    ]);
  }

  const tenantTaxCodes = await db
    .select()
    .from(taxCodes)
    .where(eq(taxCodes.tenantId, tenantId))
    .orderBy(asc(taxCodes.id));

  return {
    settings,
    taxCodes: tenantTaxCodes,
  };
};

export const updateFinancialSettings = async (
  tenantId: number,
  input: UpdateFinancialSettingsInput
) => {
  // Ensure record exists
  await getOrCreateFinancialSettings(tenantId);

  const [updated] = await db
    .update(tenantFinancialSettings)
    .set({
      baseCurrency: input.baseCurrency,
      fiscalYearStartMonth: input.fiscalYearStartMonth,
      taxPin: input.taxPin || null,
      isVatInclusive: input.isVatInclusive,
      vatRate: String(input.vatRate),
      isCateringLevyEnabled: input.isCateringLevyEnabled,
      cateringLevyRate: String(input.cateringLevyRate),
      isServiceChargeEnabled: input.isServiceChargeEnabled,
      serviceChargeRate: String(input.serviceChargeRate),
      etimsEnvironment: input.etimsEnvironment,
      autoFiscalizeOnPayment: input.autoFiscalizeOnPayment,
      etimsMiddleServerUrl: input.etimsMiddleServerUrl || null,
      etimsDeviceSerial: input.etimsDeviceSerial || null,
      etimsBranchCode: input.etimsBranchCode,
      allowOfflineFiscalSign: input.allowOfflineFiscalSign,
      tipDistributionModel: input.tipDistributionModel,
      defaultOvertimeMultiplier: String(input.defaultOvertimeMultiplier),
      holidayOvertimeMultiplier: String(input.holidayOvertimeMultiplier),
      standardWorkWeekHours: input.standardWorkWeekHours,
      maxDrawerCashThreshold: String(input.maxDrawerCashThreshold),
      enableSafeDropAlerts: input.enableSafeDropAlerts,
      updatedAt: new Date(),
    })
    .where(eq(tenantFinancialSettings.tenantId, tenantId))
    .returning();

  // If taxPin or currency updated, sync with tenant entity master
  await db
    .update(tenants)
    .set({
      kraPin: input.taxPin || null,
      currency: input.baseCurrency,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));

  return updated;
};

export const addCustomTaxCode = async (tenantId: number, input: CreateTaxCodeInput) => {
  const [created] = await db
    .insert(taxCodes)
    .values({
      tenantId,
      code: input.code,
      name: input.name,
      rate: String(input.rate),
      statutoryCode: input.statutoryCode || null,
      isActive: true,
    })
    .returning();

  return created;
};

export const deleteCustomTaxCode = async (tenantId: number, taxCodeId: number) => {
  const [deleted] = await db
    .delete(taxCodes)
    .where(and(eq(taxCodes.id, taxCodeId), eq(taxCodes.tenantId, tenantId)))
    .returning();

  return deleted;
};