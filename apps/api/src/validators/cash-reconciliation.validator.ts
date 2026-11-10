import { z } from 'zod';

export const reconciliationQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD').optional(),
  status: z.enum(['ALL', 'BALANCED', 'DISCREPANCY', 'PENDING_AUDIT']).default('ALL'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const performReconciliationAuditSchema = z.object({
  shiftId: z.coerce.number().int().positive('Shift ID is required'),
  actualDepositAmount: z.coerce.number().min(0, 'Deposit amount cannot be negative'),
  clearingAccountId: z.string().trim().min(2, 'Clearing account must be specified'), // e.g. "Main Safe KES", "KCB Operating Acc"
  auditResolution: z.enum(['VERIFIED_BALANCED', 'VARIANCE_ACCEPTED', 'DISPUTED_ESCALATED']),
  auditorNotes: z.string().trim().max(1000).optional().nullable(),
});

export type ReconciliationQuery = z.infer<typeof reconciliationQuerySchema>;
export type PerformReconciliationAuditInput = z.infer<typeof performReconciliationAuditSchema>;