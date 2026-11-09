import { z } from 'zod';

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
  module: z.string().trim().optional(),
  action: z.string().trim().optional(),
  userId: z.coerce.number().positive().optional(),
  branchId: z.coerce.number().positive().optional(),
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

export const exportAuditLogsQuerySchema = listAuditLogsQuerySchema.omit({
  page: true,
  limit: true,
}).extend({
  format: z.enum(['csv', 'json']).default('csv'),
});

export const recordAuditLogSchema = z.object({
  branchId: z.number().int().positive().optional().nullable(),
  userId: z.number().int().positive().optional().nullable(),
  action: z.string().trim().min(2).max(100),
  module: z.string().trim().min(2).max(50),
  entityType: z.string().trim().min(1).max(100),
  entityId: z.string().trim().min(1).max(100),
  reason: z.string().trim().optional().nullable(),
  previousValues: z.record(z.string(), z.any()).optional().nullable(),
  newValues: z.record(z.string(), z.any()).optional().nullable(),
  ipAddress: z.string().trim().max(64).optional().nullable(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
export type ExportAuditLogsQuery = z.infer<typeof exportAuditLogsQuerySchema>;
export type RecordAuditLogInput = z.infer<typeof recordAuditLogSchema>;