"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTemplateRecord = exports.updateTemplateRecord = exports.createTemplateRecord = exports.listTenantTemplates = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listTenantTemplates = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.marketingTemplates.tenantId, tenantId),
        query.channel && query.channel !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.marketingTemplates.channel, query.channel) : undefined,
        query.objective && query.objective !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.marketingTemplates.objective, query.objective) : undefined,
        query.isActive === 'TRUE'
            ? (0, drizzle_orm_1.eq)(schema_1.marketingTemplates.isActive, true)
            : query.isActive === 'FALSE'
                ? (0, drizzle_orm_1.eq)(schema_1.marketingTemplates.isActive, false)
                : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.marketingTemplates.name, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.marketingTemplates.bodyTemplate, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.marketingTemplates.suggestedPromoPrefix, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    const [countResult, templateRows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.marketingTemplates)
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select()
            .from(schema_1.marketingTemplates)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.marketingTemplates.createdAt))
            .limit(limit)
            .offset(offset),
    ]);
    const total = Number(countResult[0]?.count || 0);
    // If newly initialized tenant, seed enterprise baseline templates
    if (total === 0 && !query.search && (!query.channel || query.channel === 'ALL')) {
        const defaultTemplates = [
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
        const seeded = await db_1.db.insert(schema_1.marketingTemplates).values(defaultTemplates).returning();
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
exports.listTenantTemplates = listTenantTemplates;
const createTemplateRecord = async (tenantId, input) => {
    const [created] = await db_1.db
        .insert(schema_1.marketingTemplates)
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
exports.createTemplateRecord = createTemplateRecord;
const updateTemplateRecord = async (tenantId, templateId, input) => {
    const updateData = {
        updatedAt: new Date(),
    };
    if (input.name !== undefined)
        updateData.name = input.name;
    if (input.channel !== undefined)
        updateData.channel = input.channel;
    if (input.objective !== undefined)
        updateData.objective = input.objective;
    if (input.subjectLine !== undefined)
        updateData.subjectLine = input.subjectLine;
    if (input.bodyTemplate !== undefined)
        updateData.bodyTemplate = input.bodyTemplate;
    if (input.suggestedPromoPrefix !== undefined) {
        updateData.suggestedPromoPrefix = input.suggestedPromoPrefix ? input.suggestedPromoPrefix.toUpperCase() : null;
    }
    if (input.defaultDiscountPercentage !== undefined)
        updateData.defaultDiscountPercentage = input.defaultDiscountPercentage;
    if (input.isActive !== undefined)
        updateData.isActive = input.isActive;
    const [updated] = await db_1.db
        .update(schema_1.marketingTemplates)
        .set(updateData)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.marketingTemplates.id, templateId), (0, drizzle_orm_1.eq)(schema_1.marketingTemplates.tenantId, tenantId)))
        .returning();
    return updated || null;
};
exports.updateTemplateRecord = updateTemplateRecord;
const deleteTemplateRecord = async (tenantId, templateId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.marketingTemplates)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.marketingTemplates.id, templateId), (0, drizzle_orm_1.eq)(schema_1.marketingTemplates.tenantId, tenantId)))
        .returning();
    return deleted || null;
};
exports.deleteTemplateRecord = deleteTemplateRecord;
