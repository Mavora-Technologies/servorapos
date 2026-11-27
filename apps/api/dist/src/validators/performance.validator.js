"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acknowledgeReviewSchema = exports.updateReviewSchema = exports.createReviewSchema = exports.telemetryQuerySchema = exports.listReviewsQuerySchema = void 0;
// apps/api/src/validators/performance.validator.ts
const zod_1 = require("zod");
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const optionalPositiveInt = zod_1.z.preprocess((val) => {
    if (val === undefined || val === null || val === '' || val === 'ALL')
        return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? val : n;
}, zod_1.z.number().int().positive().optional());
const optionalRatingNumber = zod_1.z.preprocess((val) => {
    if (val === undefined || val === null || val === '' || val === 'ALL')
        return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? val : n;
}, zod_1.z.number().min(1).max(5).optional());
const optionalFilterString = zod_1.z
    .string()
    .trim()
    .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
    .optional();
const optionalDateStr = zod_1.z
    .string()
    .trim()
    .refine((v) => v === '' || dateRegex.test(v), 'Date must be in YYYY-MM-DD format')
    .transform((v) => (v === '' ? undefined : v))
    .optional();
const competencySchema = zod_1.z.object({
    category: zod_1.z.string().trim().min(1).max(120),
    rating: zod_1.z.coerce.number().int().min(1).max(5),
    comments: zod_1.z.string().trim().max(500).optional().default(''),
});
const goalSchema = zod_1.z.object({
    id: zod_1.z.string().trim().min(1).max(64),
    title: zod_1.z.string().trim().min(2, 'Goal title is required').max(255),
    targetDate: zod_1.z.string().regex(dateRegex, 'Target date must be YYYY-MM-DD'),
    completed: zod_1.z.boolean().default(false),
});
exports.listReviewsQuerySchema = zod_1.z.object({
    cycle: optionalFilterString,
    role: optionalFilterString,
    userId: optionalPositiveInt,
    branchId: optionalPositiveInt,
    status: optionalFilterString,
    minRating: optionalRatingNumber,
    startDate: optionalDateStr,
    endDate: optionalDateStr,
});
exports.telemetryQuerySchema = zod_1.z.object({
    branchId: optionalPositiveInt,
    role: optionalFilterString,
    startDate: optionalDateStr,
    endDate: optionalDateStr,
});
exports.createReviewSchema = zod_1.z
    .object({
    userId: zod_1.z.coerce.number().int().positive('Employee ID is required'),
    reviewCycle: zod_1.z.enum(['MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL']).default('MONTHLY'),
    periodStart: zod_1.z.string().regex(dateRegex, 'Valid period start date required (YYYY-MM-DD)'),
    periodEnd: zod_1.z.string().regex(dateRegex, 'Valid period end date required (YYYY-MM-DD)'),
    overallRating: zod_1.z.coerce.number().min(1).max(5),
    totalSalesGenerated: zod_1.z.coerce.number().min(0).default(0),
    salesTarget: zod_1.z.coerce.number().min(0).default(0),
    averageTicketValue: zod_1.z.coerce.number().min(0).default(0),
    speedOfServiceMinutes: zod_1.z.coerce.number().min(0).default(0),
    attendanceScorePercent: zod_1.z.coerce.number().int().min(0).max(100).default(100),
    voidRefundCount: zod_1.z.coerce.number().int().min(0).default(0),
    tipPoolAllocated: zod_1.z.coerce.number().min(0).default(0),
    competencies: zod_1.z.array(competencySchema).max(20).default([]),
    goals: zod_1.z.array(goalSchema).max(20).default([]),
    managerFeedback: zod_1.z
        .string()
        .trim()
        .max(2000)
        .transform((v) => (v === '' ? null : v))
        .nullable()
        .optional(),
    status: zod_1.z.enum(['DRAFT', 'SUBMITTED']).default('SUBMITTED'),
})
    .refine((d) => d.periodEnd >= d.periodStart, {
    message: 'Period end date must be on or after period start date.',
    path: ['periodEnd'],
});
exports.updateReviewSchema = zod_1.z.object({
    reviewCycle: zod_1.z.enum(['MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL']).optional(),
    periodStart: zod_1.z.string().regex(dateRegex).optional(),
    periodEnd: zod_1.z.string().regex(dateRegex).optional(),
    overallRating: zod_1.z.coerce.number().min(1).max(5).optional(),
    totalSalesGenerated: zod_1.z.coerce.number().min(0).optional(),
    salesTarget: zod_1.z.coerce.number().min(0).optional(),
    averageTicketValue: zod_1.z.coerce.number().min(0).optional(),
    speedOfServiceMinutes: zod_1.z.coerce.number().min(0).optional(),
    attendanceScorePercent: zod_1.z.coerce.number().int().min(0).max(100).optional(),
    voidRefundCount: zod_1.z.coerce.number().int().min(0).optional(),
    tipPoolAllocated: zod_1.z.coerce.number().min(0).optional(),
    competencies: zod_1.z.array(competencySchema).max(20).optional(),
    goals: zod_1.z.array(goalSchema).max(20).optional(),
    managerFeedback: zod_1.z
        .string()
        .trim()
        .max(2000)
        .transform((v) => (v === '' ? null : v))
        .nullable()
        .optional(),
    status: zod_1.z.enum(['DRAFT', 'SUBMITTED', 'FINALIZED']).optional(),
});
exports.acknowledgeReviewSchema = zod_1.z.object({
    employeeFeedback: zod_1.z
        .string()
        .trim()
        .max(1500)
        .transform((v) => (v === '' ? undefined : v))
        .optional(),
});
