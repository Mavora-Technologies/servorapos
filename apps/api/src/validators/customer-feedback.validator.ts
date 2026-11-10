import { z } from 'zod';

export const feedbackCategoryEnum = z.enum([
  'FOOD_QUALITY',
  'SERVICE_SPEED',
  'CLEANLINESS',
  'ORDER_ACCURACY',
  'STAFF_COURTESY',
  'VALUE_PRICE',
]);

export const feedbackStatusEnum = z.enum([
  'NEW',
  'UNDER_REVIEW',
  'ACTION_TAKEN',
  'RESOLVED',
  'CLOSED_DISMISSED',
]);

export const feedbackChannelEnum = z.enum([
  'TABLE_QR',
  'POS_TERMINAL',
  'ONLINE_RECEIPT',
  'DIRECT_INQUIRY',
  'MANAGER_INTERVIEW',
]);

export const createFeedbackSchema = z.object({
  customerId: z.coerce.number().positive('Valid customer identifier is required'),
  branchId: z.coerce.number().positive().optional().nullable(),
  orderId: z.coerce.number().positive().optional().nullable(),
  staffId: z.coerce.number().positive().optional().nullable(),
  feedbackCategory: feedbackCategoryEnum.default('FOOD_QUALITY'),
  rating: z.coerce.number().int().min(1).max(5),
  npsScore: z.coerce.number().int().min(0).max(10).optional().nullable(),
  channel: feedbackChannelEnum.default('TABLE_QR'),
  title: z.string().trim().min(2, 'Title is required').max(200),
  comments: z.string().trim().min(3, 'Comments are required'),
});

export const updateFeedbackStatusSchema = z.object({
  status: feedbackStatusEnum,
  actionTaken: z.string().trim().optional(),
  assignedToUserId: z.coerce.number().positive().optional().nullable(),
});

export const listFeedbackQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  branchId: z.coerce.number().positive().optional(),
  status: z.string().trim().optional(),
  category: z.string().trim().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['CREATED_AT', 'RATING', 'STATUS']).default('CREATED_AT'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackStatusInput = z.infer<typeof updateFeedbackStatusSchema>;
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>;