import { z } from 'zod';

export const kitchenTicketsQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  station: z.string().trim().optional(),
  orderType: z.string().trim().optional(),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(['Confirmed', 'Preparing', 'Ready', 'Cancelled']),
});

export const updateKitchenItemStatusSchema = z.object({
  kitchenStatus: z.enum(['New', 'Preparing', 'Ready']),
});

export const bumpStationItemsSchema = z.object({
  orderId: z.coerce.number().int().positive('Order ID is required'),
  station: z.string().trim().min(1, 'Station identifier is required'),
});

export const createKitchenStationSchema = z.object({
  branchId: z.coerce.number().int().positive('Branch outlet is required'),
  name: z.string().trim().min(2, 'Station name is required').max(100),
  code: z.string().trim().min(2, 'Station code is required').max(50).toUpperCase(),
  stationType: z.enum(['PREP', 'EXPEDITER', 'PASS', 'BAR', 'PACKING']).default('PREP'),
  colorHex: z.string().trim().max(20).default('#0554F4'),
  targetPrepTimeMinutes: z.coerce.number().int().min(1).max(180).default(15),
  warningTimeMinutes: z.coerce.number().int().min(1).max(180).default(10),
  criticalTimeMinutes: z.coerce.number().int().min(1).max(240).default(18),
  assignedCategories: z.array(z.string().trim()).default([]),
  autoBumpOnPrint: z.boolean().default(false),
  soundAlertOnNewTicket: z.boolean().default(true),
  allowTicketRecall: z.boolean().default(true),
  backupStationId: z.coerce.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateKitchenStationSchema = createKitchenStationSchema.partial();

export const updateKitchenGlobalSettingsSchema = z.object({
  defaultWarningMinutes: z.coerce.number().int().min(1).max(180).default(10),
  defaultCriticalMinutes: z.coerce.number().int().min(1).max(240).default(18),
  enableCoursePacing: z.boolean().default(true),
  enableOrderConsolidation: z.boolean().default(true),
  vipPriorityBoostMinutes: z.coerce.number().int().min(0).max(60).default(5),
  deliveryPriorityBoostMinutes: z.coerce.number().int().min(0).max(60).default(3),
  soundVolume: z.coerce.number().int().min(0).max(100).default(80),
  autoArchiveCompletedMinutes: z.coerce.number().int().min(5).max(1440).default(120),
});

export const kitchenHistoryQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  status: z.string().trim().optional(),
  orderType: z.string().trim().optional(),
  station: z.string().trim().optional(),
  slaStatus: z.enum(['ALL', 'ON_TIME', 'DELAYED']).optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(150),
});

export const kitchenPerformanceQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  station: z.string().trim().optional(),
  orderType: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

export type KitchenPerformanceQuery = z.infer<typeof kitchenPerformanceQuerySchema>;
export type KitchenHistoryQuery = z.infer<typeof kitchenHistoryQuerySchema>;
export type KitchenTicketsQuery = z.infer<typeof kitchenTicketsQuerySchema>;
export type BumpStationItemsInput = z.infer<typeof bumpStationItemsSchema>;
export type CreateKitchenStationInput = z.infer<typeof createKitchenStationSchema>;
export type UpdateKitchenStationInput = z.infer<typeof updateKitchenStationSchema>;
export type UpdateKitchenGlobalSettingsInput = z.infer<typeof updateKitchenGlobalSettingsSchema>;