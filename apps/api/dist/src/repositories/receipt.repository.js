"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAsDefaultTemplate = exports.deleteReceiptTemplate = exports.updateReceiptTemplate = exports.createReceiptTemplate = exports.getTemplateById = exports.listReceiptTemplates = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listReceiptTemplates = async (tenantId, branchId) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.receiptTemplates.tenantId, tenantId),
        branchId ? (0, drizzle_orm_1.eq)(schema_1.receiptTemplates.branchId, branchId) : undefined,
    ].filter(Boolean);
    const templates = await db_1.db
        .select({
        id: schema_1.receiptTemplates.id,
        branchId: schema_1.receiptTemplates.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        name: schema_1.receiptTemplates.name,
        isDefault: schema_1.receiptTemplates.isDefault,
        paperWidth: schema_1.receiptTemplates.paperWidth,
        fontScale: schema_1.receiptTemplates.fontScale,
        headerTitle: schema_1.receiptTemplates.headerTitle,
        headerSubtitle: schema_1.receiptTemplates.headerSubtitle,
        showLogo: schema_1.receiptTemplates.showLogo,
        showBranchAddress: schema_1.receiptTemplates.showBranchAddress,
        showTaxPin: schema_1.receiptTemplates.showTaxPin,
        showContactPhone: schema_1.receiptTemplates.showContactPhone,
        showContactEmail: schema_1.receiptTemplates.showContactEmail,
        showCashierName: schema_1.receiptTemplates.showCashierName,
        showServerName: schema_1.receiptTemplates.showServerName,
        showTableNumber: schema_1.receiptTemplates.showTableNumber,
        showCustomerDetails: schema_1.receiptTemplates.showCustomerDetails,
        showOrderType: schema_1.receiptTemplates.showOrderType,
        showItemSku: schema_1.receiptTemplates.showItemSku,
        showItemModifiers: schema_1.receiptTemplates.showItemModifiers,
        showKitchenNotes: schema_1.receiptTemplates.showKitchenNotes,
        showTaxSummary: schema_1.receiptTemplates.showTaxSummary,
        showEtimsQrCode: schema_1.receiptTemplates.showEtimsQrCode,
        showFiscalDeviceSerial: schema_1.receiptTemplates.showFiscalDeviceSerial,
        showPaymentBreakdown: schema_1.receiptTemplates.showPaymentBreakdown,
        showChangeDue: schema_1.receiptTemplates.showChangeDue,
        showTipPromptLine: schema_1.receiptTemplates.showTipPromptLine,
        showLoyaltyPoints: schema_1.receiptTemplates.showLoyaltyPoints,
        footerMessage: schema_1.receiptTemplates.footerMessage,
        returnPolicy: schema_1.receiptTemplates.returnPolicy,
        wifiDetails: schema_1.receiptTemplates.wifiDetails,
        createdAt: schema_1.receiptTemplates.createdAt,
    })
        .from(schema_1.receiptTemplates)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.receiptTemplates.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.receiptTemplates.isDefault), (0, drizzle_orm_1.asc)(schema_1.receiptTemplates.id));
    return templates;
};
exports.listReceiptTemplates = listReceiptTemplates;
const getTemplateById = async (tenantId, templateId) => {
    const [template] = await db_1.db
        .select()
        .from(schema_1.receiptTemplates)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.receiptTemplates.id, templateId), (0, drizzle_orm_1.eq)(schema_1.receiptTemplates.tenantId, tenantId)))
        .limit(1);
    return template || null;
};
exports.getTemplateById = getTemplateById;
const createReceiptTemplate = async (tenantId, input) => {
    if (input.isDefault) {
        // Unset existing default layouts for this scope
        await db_1.db
            .update(schema_1.receiptTemplates)
            .set({ isDefault: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.receiptTemplates.tenantId, tenantId), input.branchId ? (0, drizzle_orm_1.eq)(schema_1.receiptTemplates.branchId, input.branchId) : undefined));
    }
    const [created] = await db_1.db
        .insert(schema_1.receiptTemplates)
        .values({
        tenantId,
        branchId: input.branchId || null,
        name: input.name,
        isDefault: input.isDefault,
        paperWidth: input.paperWidth,
        fontScale: input.fontScale,
        headerTitle: input.headerTitle,
        headerSubtitle: input.headerSubtitle || null,
        showLogo: input.showLogo,
        showBranchAddress: input.showBranchAddress,
        showTaxPin: input.showTaxPin,
        showContactPhone: input.showContactPhone,
        showContactEmail: input.showContactEmail,
        showCashierName: input.showCashierName,
        showServerName: input.showServerName,
        showTableNumber: input.showTableNumber,
        showCustomerDetails: input.showCustomerDetails,
        showOrderType: input.showOrderType,
        showItemSku: input.showItemSku,
        showItemModifiers: input.showItemModifiers,
        showKitchenNotes: input.showKitchenNotes,
        showTaxSummary: input.showTaxSummary,
        showEtimsQrCode: input.showEtimsQrCode,
        showFiscalDeviceSerial: input.showFiscalDeviceSerial,
        showPaymentBreakdown: input.showPaymentBreakdown,
        showChangeDue: input.showChangeDue,
        showTipPromptLine: input.showTipPromptLine,
        showLoyaltyPoints: input.showLoyaltyPoints,
        footerMessage: input.footerMessage || null,
        returnPolicy: input.returnPolicy || null,
        wifiDetails: input.wifiDetails || null,
    })
        .returning();
    return created;
};
exports.createReceiptTemplate = createReceiptTemplate;
const updateReceiptTemplate = async (tenantId, templateId, input) => {
    const [existing] = await db_1.db
        .select({ id: schema_1.receiptTemplates.id, branchId: schema_1.receiptTemplates.branchId })
        .from(schema_1.receiptTemplates)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.receiptTemplates.id, templateId), (0, drizzle_orm_1.eq)(schema_1.receiptTemplates.tenantId, tenantId)))
        .limit(1);
    if (!existing) {
        throw new Error('Receipt template specification not found.');
    }
    if (input.isDefault) {
        await db_1.db
            .update(schema_1.receiptTemplates)
            .set({ isDefault: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.receiptTemplates.tenantId, tenantId), input.branchId ? (0, drizzle_orm_1.eq)(schema_1.receiptTemplates.branchId, input.branchId) : undefined));
    }
    const [updated] = await db_1.db
        .update(schema_1.receiptTemplates)
        .set({
        ...input,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.receiptTemplates.id, templateId))
        .returning();
    return updated;
};
exports.updateReceiptTemplate = updateReceiptTemplate;
const deleteReceiptTemplate = async (tenantId, templateId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.receiptTemplates)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.receiptTemplates.id, templateId), (0, drizzle_orm_1.eq)(schema_1.receiptTemplates.tenantId, tenantId)))
        .returning();
    if (!deleted) {
        throw new Error('Receipt template specification not found.');
    }
    return deleted;
};
exports.deleteReceiptTemplate = deleteReceiptTemplate;
const setAsDefaultTemplate = async (tenantId, templateId, branchId) => {
    await db_1.db
        .update(schema_1.receiptTemplates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.receiptTemplates.tenantId, tenantId), branchId ? (0, drizzle_orm_1.eq)(schema_1.receiptTemplates.branchId, branchId) : undefined));
    const [updated] = await db_1.db
        .update(schema_1.receiptTemplates)
        .set({ isDefault: true, updatedAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.receiptTemplates.id, templateId), (0, drizzle_orm_1.eq)(schema_1.receiptTemplates.tenantId, tenantId)))
        .returning();
    return updated;
};
exports.setAsDefaultTemplate = setAsDefaultTemplate;
