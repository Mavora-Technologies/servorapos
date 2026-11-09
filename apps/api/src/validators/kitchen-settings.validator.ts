import { z } from 'zod';

export const createKitchenStationSchema = z.object({
  branchId: z.coerce.number().positive('Operating branch is required'),
  name: z.string().trim().min(2, 'Station name must be at least 2 characters'),
  code: z.string().trim().min(2, 'Station identifier code is required').toUpperCase(),
  stationType: z.enum(['PREP', 'EXPEDITER', 'PASS', 'BAR', 'PACKING']).default('PREP'),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid 6-character hex code').default('#0554F4'),
  targetPrepTimeMinutes: z.coerce.number().min(1).max(120).default(15),
  warningTimeMinutes: z.coerce.number().min(1).max(120).default(10),
  criticalTimeMinutes: z.coerce.number().min(1).max(120).default(18),
  assignedCategories: z.array(z.string()).default([]),
  autoBumpOnPrint: z.boolean().default(false),
  soundAlertOnNewTicket: z.boolean().default(true),
  allowTicketRecall: z.boolean().default(true),
  backupStationId: z.coerce.number().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateKitchenStationSchema = createKitchenStationSchema.partial();

export const updateKitchenGlobalSettingsSchema = z.object({
  defaultWarningMinutes: z.coerce.number().min(1).max(60).default(10),
  defaultCriticalMinutes: z.coerce.number().min(1).max(120).default(18),
  enableCoursePacing: z.boolean().default(true),
  enableOrderConsolidation: z.boolean().default(true),
  vipPriorityBoostMinutes: z.coerce.number().min(0).max(30).default(5),
  deliveryPriorityBoostMinutes: z.coerce.number().min(0).max(30).default(3),
  soundVolume: z.coerce.number().min(0).max(100).default(80),
  autoArchiveCompletedMinutes: z.coerce.number().min(10).max(1440).default(120),
});

export type CreateKitchenStationInput = z.infer<typeof createKitchenStationSchema>;
export type UpdateKitchenStationInput = z.infer<typeof updateKitchenStationSchema>;
export type UpdateKitchenGlobalSettingsInput = z.infer<typeof updateKitchenGlobalSettingsSchema>;