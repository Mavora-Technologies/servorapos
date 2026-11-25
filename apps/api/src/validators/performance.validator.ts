// apps/api/src/validators/performance.validator.ts
import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const optionalPositiveInt = z.preprocess((val) => {
  if (val === undefined || val === null || val === '' || val === 'ALL') return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? val : n;
}, z.number().int().positive().optional());

const optionalDateStr = z
  .string()
  .trim()
  .refine((v) => v === '' || dateRegex.test(v), 'Date must be in YYYY-MM-DD format')
  .transform((v) => (v === '' ? undefined : v))
  .optional();

const competencySchema = z.object({
  category: z.string().trim().min(1).max(120),
  rating: z.coerce.number().int().min(1).max(5),
  comments: z.string().trim().max(500).optional().default(''),
});

const goalSchema = z.object({
  id: z.string().trim().min(1).max(64),
  title: z.string().trim().min(2, 'Goal title is required').max(255),
  targetDate: z.string().regex(dateRegex, 'Target date must be YYYY-MM-DD'),
  completed: z.boolean().default(false),
});

export const listReviewsQuerySchema = z.object({
  cycle: z
    .string()
    .trim()
    .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
    .optional(),
  userId: optionalPositiveInt,
  branchId: optionalPositiveInt,
  status: z
    .string()
    .trim()
    .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
    .optional(),
  startDate: optionalDateStr,
  endDate: optionalDateStr,
});

export const telemetryQuerySchema = z.object({
  branchId: optionalPositiveInt,
  startDate: optionalDateStr,
  endDate: optionalDateStr,
});

export const createReviewSchema = z
  .object({
    userId: z.coerce.number().int().positive('Employee ID is required'),
    reviewCycle: z.enum(['MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL']).default('MONTHLY'),
    periodStart: z.string().regex(dateRegex, 'Valid period start date required (YYYY-MM-DD)'),
    periodEnd: z.string().regex(dateRegex, 'Valid period end date required (YYYY-MM-DD)'),
    overallRating: z.coerce.number().min(1).max(5),
    totalSalesGenerated: z.coerce.number().min(0).default(0),
    salesTarget: z.coerce.number().min(0).default(0),
    averageTicketValue: z.coerce.number().min(0).default(0),
    speedOfServiceMinutes: z.coerce.number().min(0).default(0),
    attendanceScorePercent: z.coerce.number().int().min(0).max(100).default(100),
    voidRefundCount: z.coerce.number().int().min(0).default(0),
    tipPoolAllocated: z.coerce.number().min(0).default(0),
    competencies: z.array(competencySchema).max(20).default([]),
    goals: z.array(goalSchema).max(20).default([]),
    managerFeedback: z
      .string()
      .trim()
      .max(2000)
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional(),
    status: z.enum(['DRAFT', 'SUBMITTED']).default('SUBMITTED'),
  })
  .refine((d) => d.periodEnd >= d.periodStart, {
    message: 'Period end date must be on or after period start date.',
    path: ['periodEnd'],
  });

export const updateReviewSchema = z.object({
  overallRating: z.coerce.number().min(1).max(5).optional(),
  totalSalesGenerated: z.coerce.number().min(0).optional(),
  salesTarget: z.coerce.number().min(0).optional(),
  averageTicketValue: z.coerce.number().min(0).optional(),
  speedOfServiceMinutes: z.coerce.number().min(0).optional(),
  attendanceScorePercent: z.coerce.number().int().min(0).max(100).optional(),
  voidRefundCount: z.coerce.number().int().min(0).optional(),
  tipPoolAllocated: z.coerce.number().min(0).optional(),
  competencies: z.array(competencySchema).max(20).optional(),
  goals: z.array(goalSchema).max(20).optional(),
  managerFeedback: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'FINALIZED']).optional(),
});

export const acknowledgeReviewSchema = z.object({
  employeeFeedback: z
    .string()
    .trim()
    .max(1500)
    .transform((v) => (v === '' ? undefined : v))
    .optional(),
});

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type TelemetryQuery = z.infer<typeof telemetryQuerySchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type AcknowledgeReviewInput = z.infer<typeof acknowledgeReviewSchema>;