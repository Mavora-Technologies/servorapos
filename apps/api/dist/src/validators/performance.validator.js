"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acknowledgeReviewSchema = exports.updateReviewSchema = exports.createReviewSchema = void 0;
const zod_1 = require("zod");
exports.createReviewSchema = zod_1.z.object({
    userId: zod_1.z.coerce.number().positive('Employee ID is required'),
    reviewCycle: zod_1.z.enum(['MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL']).default('MONTHLY'),
    periodStart: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid period start date required (YYYY-MM-DD)'),
    periodEnd: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid period end date required (YYYY-MM-DD)'),
    overallRating: zod_1.z.coerce.number().min(1).max(5),
    totalSalesGenerated: zod_1.z.coerce.number().min(0).default(0),
    salesTarget: zod_1.z.coerce.number().min(0).default(0),
    averageTicketValue: zod_1.z.coerce.number().min(0).default(0),
    speedOfServiceMinutes: zod_1.z.coerce.number().min(0).default(0),
    attendanceScorePercent: zod_1.z.coerce.number().min(0).max(100).default(100),
    voidRefundCount: zod_1.z.coerce.number().min(0).default(0),
    tipPoolAllocated: zod_1.z.coerce.number().min(0).default(0),
    competencies: zod_1.z
        .array(zod_1.z.object({
        category: zod_1.z.string().min(1),
        rating: zod_1.z.coerce.number().min(1).max(5),
        comments: zod_1.z.string().optional().default(''),
    }))
        .default([]),
    goals: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string(),
        title: zod_1.z.string().min(1),
        targetDate: zod_1.z.string(),
        completed: zod_1.z.boolean().default(false),
    }))
        .default([]),
    // Relaxed from min(5) to min(1) and optional
    managerFeedback: zod_1.z.string().trim().min(1, 'Manager feedback is required').optional().nullable(),
    status: zod_1.z.enum(['DRAFT', 'SUBMITTED']).default('SUBMITTED'),
});
exports.updateReviewSchema = zod_1.z.object({
    overallRating: zod_1.z.coerce.number().min(1).max(5).optional(),
    totalSalesGenerated: zod_1.z.coerce.number().min(0).optional(),
    salesTarget: zod_1.z.coerce.number().min(0).optional(),
    averageTicketValue: zod_1.z.coerce.number().min(0).optional(),
    speedOfServiceMinutes: zod_1.z.coerce.number().min(0).optional(),
    attendanceScorePercent: zod_1.z.coerce.number().min(0).max(100).optional(),
    voidRefundCount: zod_1.z.coerce.number().min(0).optional(),
    tipPoolAllocated: zod_1.z.coerce.number().min(0).optional(),
    competencies: zod_1.z
        .array(zod_1.z.object({
        category: zod_1.z.string(),
        rating: zod_1.z.coerce.number().min(1).max(5),
        comments: zod_1.z.string().optional(),
    }))
        .optional(),
    goals: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string(),
        title: zod_1.z.string(),
        targetDate: zod_1.z.string(),
        completed: zod_1.z.boolean(),
    }))
        .optional(),
    managerFeedback: zod_1.z.string().trim().optional().nullable(),
    status: zod_1.z.enum(['DRAFT', 'SUBMITTED', 'FINALIZED']).optional(),
});
exports.acknowledgeReviewSchema = zod_1.z.object({
    employeeFeedback: zod_1.z.string().optional(),
});
