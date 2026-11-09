import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from '../config/db';
import { receiptTemplates, branches } from '../config/schema';
import {
  CreateReceiptTemplateInput,
  UpdateReceiptTemplateInput,
} from '../validators/receipt.validator';

export const listReceiptTemplates = async (tenantId: number, branchId?: number) => {
  const conditions = [
    eq(receiptTemplates.tenantId, tenantId),
    branchId ? eq(receiptTemplates.branchId, branchId) : undefined,
  ].filter(Boolean);

  const templates = await db
    .select({
      id: receiptTemplates.id,
      branchId: receiptTemplates.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      name: receiptTemplates.name,
      isDefault: receiptTemplates.isDefault,
      paperWidth: receiptTemplates.paperWidth,
      fontScale: receiptTemplates.fontScale,
      headerTitle: receiptTemplates.headerTitle,
      headerSubtitle: receiptTemplates.headerSubtitle,
      showLogo: receiptTemplates.showLogo,
      showBranchAddress: receiptTemplates.showBranchAddress,
      showTaxPin: receiptTemplates.showTaxPin,
      showContactPhone: receiptTemplates.showContactPhone,
      showContactEmail: receiptTemplates.showContactEmail,
      showCashierName: receiptTemplates.showCashierName,
      showServerName: receiptTemplates.showServerName,
      showTableNumber: receiptTemplates.showTableNumber,
      showCustomerDetails: receiptTemplates.showCustomerDetails,
      showOrderType: receiptTemplates.showOrderType,
      showItemSku: receiptTemplates.showItemSku,
      showItemModifiers: receiptTemplates.showItemModifiers,
      showKitchenNotes: receiptTemplates.showKitchenNotes,
      showTaxSummary: receiptTemplates.showTaxSummary,
      showEtimsQrCode: receiptTemplates.showEtimsQrCode,
      showFiscalDeviceSerial: receiptTemplates.showFiscalDeviceSerial,
      showPaymentBreakdown: receiptTemplates.showPaymentBreakdown,
      showChangeDue: receiptTemplates.showChangeDue,
      showTipPromptLine: receiptTemplates.showTipPromptLine,
      showLoyaltyPoints: receiptTemplates.showLoyaltyPoints,
      footerMessage: receiptTemplates.footerMessage,
      returnPolicy: receiptTemplates.returnPolicy,
      wifiDetails: receiptTemplates.wifiDetails,
      createdAt: receiptTemplates.createdAt,
    })
    .from(receiptTemplates)
    .leftJoin(branches, eq(receiptTemplates.branchId, branches.id))
    .where(and(...conditions))
    .orderBy(desc(receiptTemplates.isDefault), asc(receiptTemplates.id));

  return templates;
};

export const getTemplateById = async (tenantId: number, templateId: number) => {
  const [template] = await db
    .select()
    .from(receiptTemplates)
    .where(and(eq(receiptTemplates.id, templateId), eq(receiptTemplates.tenantId, tenantId)))
    .limit(1);

  return template || null;
};

export const createReceiptTemplate = async (
  tenantId: number,
  input: CreateReceiptTemplateInput
) => {
  if (input.isDefault) {
    // Unset existing default layouts for this scope
    await db
      .update(receiptTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(receiptTemplates.tenantId, tenantId),
          input.branchId ? eq(receiptTemplates.branchId, input.branchId) : undefined
        )
      );
  }

  const [created] = await db
    .insert(receiptTemplates)
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

export const updateReceiptTemplate = async (
  tenantId: number,
  templateId: number,
  input: UpdateReceiptTemplateInput
) => {
  const [existing] = await db
    .select({ id: receiptTemplates.id, branchId: receiptTemplates.branchId })
    .from(receiptTemplates)
    .where(and(eq(receiptTemplates.id, templateId), eq(receiptTemplates.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    throw new Error('Receipt template specification not found.');
  }

  if (input.isDefault) {
    await db
      .update(receiptTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(receiptTemplates.tenantId, tenantId),
          input.branchId ? eq(receiptTemplates.branchId, input.branchId) : undefined
        )
      );
  }

  const [updated] = await db
    .update(receiptTemplates)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(receiptTemplates.id, templateId))
    .returning();

  return updated;
};

export const deleteReceiptTemplate = async (tenantId: number, templateId: number) => {
  const [deleted] = await db
    .delete(receiptTemplates)
    .where(and(eq(receiptTemplates.id, templateId), eq(receiptTemplates.tenantId, tenantId)))
    .returning();

  if (!deleted) {
    throw new Error('Receipt template specification not found.');
  }

  return deleted;
};

export const setAsDefaultTemplate = async (
  tenantId: number,
  templateId: number,
  branchId?: number | null
) => {
  await db
    .update(receiptTemplates)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(
      and(
        eq(receiptTemplates.tenantId, tenantId),
        branchId ? eq(receiptTemplates.branchId, branchId) : undefined
      )
    );

  const [updated] = await db
    .update(receiptTemplates)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(and(eq(receiptTemplates.id, templateId), eq(receiptTemplates.tenantId, tenantId)))
    .returning();

  return updated;
};