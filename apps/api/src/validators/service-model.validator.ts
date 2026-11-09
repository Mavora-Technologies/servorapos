import { z } from 'zod';

export const createServiceModelSchema = z.object({
  branchId: z.coerce.number().positive().optional().nullable(),
  name: z.string().trim().min(2, 'Model name must be at least 2 characters'),
  type: z.enum(['DINE_IN', 'QUICK_SERVICE', 'BAR_TAB', 'TAKEAWAY', 'DELIVERY', 'DRIVE_THRU']),
  description: z.string().optional().nullable(),
  requiresTable: z.boolean().default(true),
  payBeforeOrder: z.boolean().default(false),
  promptGuestCount: z.boolean().default(true),
  allowSplitChecks: z.boolean().default(true),
  allowTableTransfers: z.boolean().default(true),
  autoSendToKitchen: z.boolean().default(false),
  enableCoursePacing: z.boolean().default(false),
  requireSeatNumbering: z.boolean().default(false),
  autoApplyServiceCharge: z.boolean().default(false),
  serviceChargePercent: z.coerce.number().min(0).max(100).default(0),
  packingChargeAmount: z.coerce.number().min(0).default(0),
  preAuthCardRequired: z.boolean().default(false),
  maxTabCreditLimit: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateServiceModelSchema = createServiceModelSchema.partial();

export const toggleServiceModelStatusSchema = z.object({
  isActive: z.boolean(),
});

export type CreateServiceModelInput = z.infer<typeof createServiceModelSchema>;
export type UpdateServiceModelInput = z.infer<typeof updateServiceModelSchema>;