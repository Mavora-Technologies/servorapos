// apps/api/src/validators/audit-log.validator.ts
import { z } from 'zod';

const dateOrIsoSchema = z
  .string()
  .trim()
  .refine(
    (val) => /^\d{4}-\d{2}-\d{2}$/.test(val) || !Number.isNaN(Date.parse(val)),
    'Date must be YYYY-MM-DD or a valid ISO 8601 timestamp'
  );

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  module: z.string().trim().max(50).optional(),
  action: z.string().trim().max(100).optional(),
  userId: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  entityType: z.string().trim().max(100).optional(),
  entityId: z.string().trim().max(100).optional(),
  startDate: dateOrIsoSchema.optional(),
  endDate: dateOrIsoSchema.optional(),
});

export const exportAuditLogsQuerySchema = listAuditLogsQuerySchema
  .omit({ page: true, limit: true })
  .extend({
    format: z.enum(['csv', 'json']).default('csv'),
  });

export const recordAuditLogSchema = z.object({
  branchId: z.number().int().positive().optional().nullable(),
  userId: z.number().int().positive().optional().nullable(),
  action: z.string().trim().min(2).max(100),
  module: z.string().trim().min(2).max(50),
  entityType: z.string().trim().min(1).max(100),
  entityId: z.string().trim().min(1).max(100),
  reason: z.string().trim().max(1000).optional().nullable(),
  previousValues: z.record(z.string(), z.unknown()).optional().nullable(),
  newValues: z.record(z.string(), z.unknown()).optional().nullable(),
  ipAddress: z.string().trim().max(64).optional().nullable(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
export type ExportAuditLogsQuery = z.infer<typeof exportAuditLogsQuerySchema>;
export type RecordAuditLogInput = z.infer<typeof recordAuditLogSchema>;