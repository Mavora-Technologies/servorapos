"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomTaxCode = exports.addCustomTaxCode = exports.updateFinancialSettings = exports.getOrCreateFinancialSettings = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getOrCreateFinancialSettings = async (tenantId) => {
    let [settings] = await db_1.db
        .select()
        .from(schema_1.tenantFinancialSettings)
        .where((0, drizzle_orm_1.eq)(schema_1.tenantFinancialSettings.tenantId, tenantId))
        .limit(1);
    if (!settings) {
        // Proactively load tenant metadata to pre-populate corporate tax PIN & currency
        const [tenant] = await db_1.db
            .select({ kraPin: schema_1.tenants.kraPin, currency: schema_1.tenants.currency })
            .from(schema_1.tenants)
            .where((0, drizzle_orm_1.eq)(schema_1.tenants.id, tenantId))
            .limit(1);
        const [created] = await db_1.db
            .insert(schema_1.tenantFinancialSettings)
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
        await db_1.db.insert(schema_1.taxCodes).values([
            { tenantId, code: 'VAT-16', name: 'Standard Rate Value Added Tax', rate: '16.00', statutoryCode: 'A' },
            { tenantId, code: 'ZERO-RATED', name: 'Zero-Rated Supplies (0%)', rate: '0.00', statutoryCode: 'B' },
            { tenantId, code: 'EXEMPT', name: 'Exempt Goods & Services', rate: '0.00', statutoryCode: 'C' },
        ]);
    }
    const tenantTaxCodes = await db_1.db
        .select()
        .from(schema_1.taxCodes)
        .where((0, drizzle_orm_1.eq)(schema_1.taxCodes.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.taxCodes.id));
    return {
        settings,
        taxCodes: tenantTaxCodes,
    };
};
exports.getOrCreateFinancialSettings = getOrCreateFinancialSettings;
const updateFinancialSettings = async (tenantId, input) => {
    // Ensure record exists
    await (0, exports.getOrCreateFinancialSettings)(tenantId);
    const [updated] = await db_1.db
        .update(schema_1.tenantFinancialSettings)
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
        .where((0, drizzle_orm_1.eq)(schema_1.tenantFinancialSettings.tenantId, tenantId))
        .returning();
    // If taxPin or currency updated, sync with tenant entity master
    await db_1.db
        .update(schema_1.tenants)
        .set({
        kraPin: input.taxPin || null,
        currency: input.baseCurrency,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.tenants.id, tenantId));
    return updated;
};
exports.updateFinancialSettings = updateFinancialSettings;
const addCustomTaxCode = async (tenantId, input) => {
    const [created] = await db_1.db
        .insert(schema_1.taxCodes)
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
exports.addCustomTaxCode = addCustomTaxCode;
const deleteCustomTaxCode = async (tenantId, taxCodeId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.taxCodes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxCodes.id, taxCodeId), (0, drizzle_orm_1.eq)(schema_1.taxCodes.tenantId, tenantId)))
        .returning();
    return deleted;
};
exports.deleteCustomTaxCode = deleteCustomTaxCode;
