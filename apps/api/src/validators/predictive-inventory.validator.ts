import { z } from 'zod';

export const urgencyLevelEnum = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'STABLE', 'ALL']);
export const replenishmentStatusEnum = z.enum(['PENDING_REVIEW', 'APPROVED_PO_CREATED', 'REJECTED_DISMISSED', 'AUTO_DISPATCHED', 'ALL']);

export const predictiveInventoryQuerySchema = z.object({
  branchId: z.coerce.number().positive().optional(),
  urgencyLevel: urgencyLevelEnum.default('ALL'),
  approvalStatus: replenishmentStatusEnum.default('PENDING_REVIEW'),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(['RUNOUT_DATE', 'TOTAL_COST', 'URGENCY', 'STOCK_LEVEL']).default('RUNOUT_DATE'),
  sortOrder: z.enum(['ASC', 'DESC']).default('ASC'),
});

export const convertToPurchaseOrderSchema = z.object({
  recommendationId: z.coerce.number().positive('Recommendation ID is required'),
  approvedOrderQty: z.coerce.number().positive('Order quantity must be greater than zero').optional(),
  supplierId: z.coerce.number().positive().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  procurementNotes: z.string().trim().optional(),
});

export const dismissRecommendationSchema = z.object({
  recommendationId: z.coerce.number().positive('Recommendation ID is required'),
  dismissalReason: z.string().trim().min(3, 'Reason for dismissal is required for audit logs'),
});

export type PredictiveInventoryQuery = z.infer<typeof predictiveInventoryQuerySchema>;
export type ConvertToPurchaseOrderInput = z.infer<typeof convertToPurchaseOrderSchema>;
export type DismissRecommendationInput = z.infer<typeof dismissRecommendationSchema>;