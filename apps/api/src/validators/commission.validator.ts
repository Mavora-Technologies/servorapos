// apps/api/src/validators/commission.validator.ts
import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const optionalPositiveInt = z.preprocess((val) => {
  if (val === undefined || val === null || val === '' || val === 'ALL') return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? val : n;
}, z.number().int().positive().optional());

const nullablePositiveInt = z.preprocess((val) => {
  if (val === undefined || val === null || val === '' || val === 'ALL') return null;
  const n = Number(val);
  return Number.isNaN(n) ? val : n;
}, z.number().int().positive().nullable());

const tierSchema = z.object({
  minAmount: z.coerce.number().min(0),
  maxAmount: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().positive().nullable()
  ),
  ratePercent: z.coerce.number().min(0).max(100),
});

export const createCommissionPlanSchema = z
  .object({
    name: z.string().trim().min(2, 'Plan name is required').max(150),
    description: z.string().trim().max(500).nullable().optional(),
    branchId: nullablePositiveInt.default(null),
    targetRole: z
      .string()
      .trim()
      .transform((v) => (v === '' || v === 'ALL' ? null : v))
      .nullable()
      .optional(),
    targetUserId: nullablePositiveInt.default(null),
    attributionMode: z
      .enum(['WAITER_ONLY', 'CASHIER_ONLY', 'COALESCE_WAITER_CASHIER'])
      .default('COALESCE_WAITER_CASHIER'),
    productScope: z.enum(['ALL_ITEMS', 'CATEGORY', 'MENU_ITEM']).default('ALL_ITEMS'),
    menuCategoryId: nullablePositiveInt.default(null),
    menuItemId: nullablePositiveInt.default(null),
    basisType: z
      .enum(['NET_SALES', 'GROSS_SALES', 'GROSS_MARGIN', 'ITEM_QUANTITY'])
      .default('NET_SALES'),
    rateType: z
      .enum(['FLAT_PERCENTAGE', 'FLAT_PER_UNIT', 'TIERED_ACCELERATOR'])
      .default('FLAT_PERCENTAGE'),
    flatRate: z.coerce.number().min(0).default(0),
    tiers: z.array(tierSchema).max(10).default([]),
    minQualifyingSales: z.coerce.number().min(0).default(0),
    maxPayoutCap: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
      z.number().positive().nullable()
    ),
    clawbackOnRefund: z.boolean().default(true),
    effectiveFrom: z.string().regex(dateRegex, 'effectiveFrom must be YYYY-MM-DD'),
    effectiveTo: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional(),
    isActive: z.boolean().default(true),
  })
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

export const updateCommissionPlanSchema = createCommissionPlanSchema.partial();

export const previewCommissionQuerySchema = z
  .object({
    periodStart: z.string().regex(dateRegex, 'periodStart must be YYYY-MM-DD'),
    periodEnd: z.string().regex(dateRegex, 'periodEnd must be YYYY-MM-DD'),
    branchId: optionalPositiveInt,
  })
  .refine((d) => d.periodEnd >= d.periodStart, {
    message: 'periodEnd must be on or after periodStart.',
    path: ['periodEnd'],
  });

export const generatePayoutRunSchema = z
  .object({
    periodStart: z.string().regex(dateRegex, 'periodStart must be YYYY-MM-DD'),
    periodEnd: z.string().regex(dateRegex, 'periodEnd must be YYYY-MM-DD'),
    branchId: nullablePositiveInt.default(null),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((d) => d.periodEnd >= d.periodStart, {
    message: 'periodEnd must be on or after periodStart.',
    path: ['periodEnd'],
  });

export const settlePayoutRunSchema = z.object({
  paymentMethod: z.enum([
    'MPESA_B2C',
    'BANK_TRANSFER',
    'PAYROLL_CONSOLIDATION',
    'CASH_DRAWER',
  ]),
  paymentReference: z.string().trim().min(2, 'Settlement reference is required').max(120),
  notes: z.string().trim().max(500).optional(),
});

export type CreateCommissionPlanInput = z.infer<typeof createCommissionPlanSchema>;
export type UpdateCommissionPlanInput = z.infer<typeof updateCommissionPlanSchema>;
export type PreviewCommissionQuery = z.infer<typeof previewCommissionQuerySchema>;
export type GeneratePayoutRunInput = z.infer<typeof generatePayoutRunSchema>;
export type SettlePayoutRunInput = z.infer<typeof settlePayoutRunSchema>;