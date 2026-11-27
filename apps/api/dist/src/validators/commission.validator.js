"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settlePayoutRunSchema = exports.generatePayoutRunSchema = exports.previewCommissionQuerySchema = exports.updateCommissionPlanSchema = exports.createCommissionPlanSchema = void 0;
// apps/api/src/validators/commission.validator.ts
const zod_1 = require("zod");
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const optionalPositiveInt = zod_1.z.preprocess((val) => {
    if (val === undefined || val === null || val === '' || val === 'ALL')
        return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? val : n;
}, zod_1.z.number().int().positive().optional());
const nullablePositiveInt = zod_1.z.preprocess((val) => {
    if (val === undefined || val === null || val === '' || val === 'ALL')
        return null;
    const n = Number(val);
    return Number.isNaN(n) ? val : n;
}, zod_1.z.number().int().positive().nullable());
const tierSchema = zod_1.z.object({
    minAmount: zod_1.z.coerce.number().min(0),
    maxAmount: zod_1.z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), zod_1.z.number().positive().nullable()),
    ratePercent: zod_1.z.coerce.number().min(0).max(100),
});
const commissionPlanBaseSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Plan name is required').max(150),
    description: zod_1.z.string().trim().max(500).nullable().optional(),
    branchId: nullablePositiveInt.default(null),
    targetRole: zod_1.z
        .string()
        .trim()
        .transform((v) => (v === '' || v === 'ALL' ? null : v))
        .nullable()
        .optional(),
    targetUserId: nullablePositiveInt.default(null),
    attributionMode: zod_1.z
        .enum(['WAITER_ONLY', 'CASHIER_ONLY', 'COALESCE_WAITER_CASHIER'])
        .default('COALESCE_WAITER_CASHIER'),
    productScope: zod_1.z.enum(['ALL_ITEMS', 'CATEGORY', 'MENU_ITEM']).default('ALL_ITEMS'),
    menuCategoryId: nullablePositiveInt.default(null),
    menuItemId: nullablePositiveInt.default(null),
    basisType: zod_1.z
        .enum(['NET_SALES', 'GROSS_SALES', 'GROSS_MARGIN', 'ITEM_QUANTITY'])
        .default('NET_SALES'),
    rateType: zod_1.z
        .enum(['FLAT_PERCENTAGE', 'FLAT_PER_UNIT', 'TIERED_ACCELERATOR'])
        .default('FLAT_PERCENTAGE'),
    flatRate: zod_1.z.coerce.number().min(0).default(0),
    tiers: zod_1.z.array(tierSchema).max(10).default([]),
    minQualifyingSales: zod_1.z.coerce.number().min(0).default(0),
    maxPayoutCap: zod_1.z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), zod_1.z.number().positive().nullable()),
    clawbackOnRefund: zod_1.z.boolean().default(true),
    effectiveFrom: zod_1.z.string().regex(dateRegex, 'effectiveFrom must be YYYY-MM-DD'),
    effectiveTo: zod_1.z
        .string()
        .trim()
        .transform((v) => (v === '' ? null : v))
        .nullable()
        .optional(),
    isActive: zod_1.z.boolean().default(true),
});
exports.createCommissionPlanSchema = commissionPlanBaseSchema
    .refine((d) => d.productScope !== 'CATEGORY' || d.menuCategoryId !== null, {
    message: 'Select a menu category when Product Scope is CATEGORY.',
    path: ['menuCategoryId'],
})
    .refine((d) => d.productScope !== 'MENU_ITEM' || d.menuItemId !== null, {
    message: 'Select a menu item when Product Scope is MENU_ITEM.',
    path: ['menuItemId'],
})
    .refine((d) => d.rateType !== 'TIERED_ACCELERATOR' || d.tiers.length > 0, {
    message: 'Tiered Accelerator plans require at least one tier threshold.',
    path: ['tiers'],
});
exports.updateCommissionPlanSchema = commissionPlanBaseSchema.partial();
exports.previewCommissionQuerySchema = zod_1.z
    .object({
    periodStart: zod_1.z.string().regex(dateRegex, 'periodStart must be YYYY-MM-DD'),
    periodEnd: zod_1.z.string().regex(dateRegex, 'periodEnd must be YYYY-MM-DD'),
    branchId: optionalPositiveInt,
})
    .refine((d) => d.periodEnd >= d.periodStart, {
    message: 'periodEnd must be on or after periodStart.',
    path: ['periodEnd'],
});
exports.generatePayoutRunSchema = zod_1.z
    .object({
    periodStart: zod_1.z.string().regex(dateRegex, 'periodStart must be YYYY-MM-DD'),
    periodEnd: zod_1.z.string().regex(dateRegex, 'periodEnd must be YYYY-MM-DD'),
    branchId: nullablePositiveInt.default(null),
    notes: zod_1.z.string().trim().max(500).nullable().optional(),
})
    .refine((d) => d.periodEnd >= d.periodStart, {
    message: 'periodEnd must be on or after periodStart.',
    path: ['periodEnd'],
});
exports.settlePayoutRunSchema = zod_1.z.object({
    paymentMethod: zod_1.z.enum([
        'MPESA_B2C',
        'BANK_TRANSFER',
        'PAYROLL_CONSOLIDATION',
        'CASH_DRAWER',
    ]),
    paymentReference: zod_1.z.string().trim().min(2, 'Settlement reference is required').max(120),
    notes: zod_1.z.string().trim().max(500).optional(),
});
