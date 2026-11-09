import { z } from 'zod';

export const createReviewSchema = z.object({
  userId: z.coerce.number().positive('Employee ID is required'),
  reviewCycle: z.enum(['MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL']).default('MONTHLY'),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid period start date required (YYYY-MM-DD)'),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid period end date required (YYYY-MM-DD)'),
  overallRating: z.coerce.number().min(1).max(5),
  totalSalesGenerated: z.coerce.number().min(0).default(0),
  salesTarget: z.coerce.number().min(0).default(0),
  averageTicketValue: z.coerce.number().min(0).default(0),
  speedOfServiceMinutes: z.coerce.number().min(0).default(0),
  attendanceScorePercent: z.coerce.number().min(0).max(100).default(100),
  voidRefundCount: z.coerce.number().min(0).default(0),
  tipPoolAllocated: z.coerce.number().min(0).default(0),
  competencies: z
    .array(
      z.object({
        category: z.string().min(1),
        rating: z.coerce.number().min(1).max(5),
        comments: z.string().optional().default(''),
      })
    )
    .default([]),
  goals: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(1),
        targetDate: z.string(),
        completed: z.boolean().default(false),
      })
    )
    .default([]),
  // Relaxed from min(5) to min(1) and optional
  managerFeedback: z.string().trim().min(1, 'Manager feedback is required').optional().nullable(),
  status: z.enum(['DRAFT', 'SUBMITTED']).default('SUBMITTED'),
});

export const updateReviewSchema = z.object({
  overallRating: z.coerce.number().min(1).max(5).optional(),
  totalSalesGenerated: z.coerce.number().min(0).optional(),
  salesTarget: z.coerce.number().min(0).optional(),
  averageTicketValue: z.coerce.number().min(0).optional(),
  speedOfServiceMinutes: z.coerce.number().min(0).optional(),
  attendanceScorePercent: z.coerce.number().min(0).max(100).optional(),
  voidRefundCount: z.coerce.number().min(0).optional(),
  tipPoolAllocated: z.coerce.number().min(0).optional(),
  competencies: z
    .array(
      z.object({
        category: z.string(),
        rating: z.coerce.number().min(1).max(5),
        comments: z.string().optional(),
      })
    )
    .optional(),
  goals: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        targetDate: z.string(),
        completed: z.boolean(),
      })
    )
    .optional(),
  managerFeedback: z.string().trim().optional().nullable(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'FINALIZED']).optional(),
});

export const acknowledgeReviewSchema = z.object({
  employeeFeedback: z.string().optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type AcknowledgeReviewInput = z.infer<typeof acknowledgeReviewSchema>;