import { eq, and, desc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import { marketingTemplates, marketingCampaigns } from '../config/schema';
import {
  CreateMarketingTemplateInput,
  ListTemplatesQuery,
  UpdateMarketingTemplateInput,
} from '../validators/marketing-template.validator';

export const listTenantTemplates = async (tenantId: number, query: ListTemplatesQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 50;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(marketingTemplates.tenantId, tenantId),
    query.channel && query.channel !== 'ALL' ? eq(marketingTemplates.channel, query.channel) : undefined,
    query.objective && query.objective !== 'ALL' ? eq(marketingTemplates.objective, query.objective) : undefined,
    query.isActive === 'TRUE'
      ? eq(marketingTemplates.isActive, true)
      : query.isActive === 'FALSE'
      ? eq(marketingTemplates.isActive, false)
      : undefined,
    query.search
      ? or(
          ilike(marketingTemplates.name, `%${query.search}%`),
          ilike(marketingTemplates.bodyTemplate, `%${query.search}%`),
          ilike(marketingTemplates.suggestedPromoPrefix, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  const [countResult, templateRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(marketingTemplates)
      .where(and(...conditions)),
    db
      .select()
      .from(marketingTemplates)
      .where(and(...conditions))
      .orderBy(desc(marketingTemplates.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  // If newly initialized tenant, seed enterprise baseline templates
  if (total === 0 && !query.search && (!query.channel || query.channel === 'ALL')) {
    const defaultTemplates: Array<typeof marketingTemplates.$inferInsert> = [
      {
        tenantId,
        name: 'VIP Member Tier Milestone',
        channel: 'SMS',
        objective: 'LOYALTY_ACCRUAL',
        bodyTemplate: 'Dear {{customer.firstName}}, thank you for being a valued VIP member with {{customer.loyaltyPoints}} points! Enjoy {{promo.discountPercent}}% off your next visit at {{branch.name}} with code {{promo.code}}.',
        suggestedPromoPrefix: 'VIPTIER',
        defaultDiscountPercentage: 20,
        isActive: true,
      },
      {
        tenantId,
        name: 'Weekend Guest Reactivation',
        channel: 'SMS',
        objective: 'CUSTOMER_RETENTION',
        bodyTemplate: 'Hi {{customer.firstName}}, we miss hosting you! Join us at {{branch.name}} this weekend and get {{promo.discountPercent}}% off your total check. Use code: {{promo.code}}.',
        suggestedPromoPrefix: 'RECOVER',
        defaultDiscountPercentage: 15,
        isActive: true,
      },
      {
        tenantId,
        name: 'Seasonal Menu Showcase Invitation',
        channel: 'EMAIL',
        objective: 'REVENUE_GROWTH',
        subjectLine: 'Exclusive Invitation: Discover Our New Seasonal Menu',
        bodyTemplate: 'Hello {{customer.firstName}},\n\nOur culinary team at {{branch.name}} has curated an exceptional seasonal tasting menu. Reserve your table today and receive an exclusive {{promo.discountPercent}}% voucher.\n\nRedemption Code: {{promo.code}}\n\nWe look forward to welcoming you!',
        suggestedPromoPrefix: 'SEASON',
        defaultDiscountPercentage: 10,
        isActive: true,
      },
      {
        tenantId,
        name: 'Executive Birthday Courtesy Comp',
        channel: 'SMS',
        objective: 'BRAND_AWARENESS',
        bodyTemplate: 'Happy Birthday {{customer.firstName}}! Celebrate your special occasion at {{branch.name}} with a complimentary dessert or {{promo.discountPercent}}% discount voucher. Code: {{promo.code}}.',
        suggestedPromoPrefix: 'BDAY',
        defaultDiscountPercentage: 25,
        isActive: true,
      },
    ];

    const seeded = await db.insert(marketingTemplates).values(defaultTemplates).returning();
    return {
      templates: seeded,
      pagination: { page: 1, limit, total: seeded.length, totalPages: 1 },
    };
  }

  return {
    templates: templateRows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const createTemplateRecord = async (tenantId: number, input: CreateMarketingTemplateInput) => {
  const [created] = await db
    .insert(marketingTemplates)
    .values({
      tenantId,
      name: input.name,
      channel: input.channel,
      objective: input.objective,
      subjectLine: input.subjectLine || null,
      bodyTemplate: input.bodyTemplate,
      suggestedPromoPrefix: input.suggestedPromoPrefix ? input.suggestedPromoPrefix.toUpperCase() : null,
      defaultDiscountPercentage: input.defaultDiscountPercentage || null,
      isActive: input.isActive,
    })
    .returning();

  return created;
};

export const updateTemplateRecord = async (
  tenantId: number,
  templateId: number,
  input: UpdateMarketingTemplateInput
) => {
  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.channel !== undefined) updateData.channel = input.channel;
  if (input.objective !== undefined) updateData.objective = input.objective;
  if (input.subjectLine !== undefined) updateData.subjectLine = input.subjectLine;
  if (input.bodyTemplate !== undefined) updateData.bodyTemplate = input.bodyTemplate;
  if (input.suggestedPromoPrefix !== undefined) {
    updateData.suggestedPromoPrefix = input.suggestedPromoPrefix ? input.suggestedPromoPrefix.toUpperCase() : null;
  }
  if (input.defaultDiscountPercentage !== undefined) updateData.defaultDiscountPercentage = input.defaultDiscountPercentage;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const [updated] = await db
    .update(marketingTemplates)
    .set(updateData)
    .where(and(eq(marketingTemplates.id, templateId), eq(marketingTemplates.tenantId, tenantId)))
    .returning();

  return updated || null;
};

export const deleteTemplateRecord = async (tenantId: number, templateId: number) => {
  const [deleted] = await db
    .delete(marketingTemplates)
    .where(and(eq(marketingTemplates.id, templateId), eq(marketingTemplates.tenantId, tenantId)))
    .returning();

  return deleted || null;
};