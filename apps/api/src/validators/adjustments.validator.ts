import { z } from 'zod';

export const listAdjustmentsQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  status: z.enum(['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'POSTED']).default('ALL'),
  adjustmentType: z.enum([
    'ALL',
    'TILL_VARIANCE_WRITE_OFF',
    'PAYROLL_LABOR_DEDUCTION',
    'TIP_POOL_CORRECTION',
    'BANK_RECON_VARIANCE',
    'VENDOR_AP_CREDIT',
    'GUEST_AR_WRITE_DOWN',
  ]).default('ALL'),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const createAdjustmentSchema = z.object({
  branchId: z.coerce.number().int().positive().optional().nullable(),
  adjustmentType: z.enum([
    'TILL_VARIANCE_WRITE_OFF',
    'PAYROLL_LABOR_DEDUCTION',
    'TIP_POOL_CORRECTION',
    'BANK_RECON_VARIANCE',
    'VENDOR_AP_CREDIT',
    'GUEST_AR_WRITE_DOWN',
  ]),
  shiftId: z.coerce.number().int().positive().optional().nullable(),
  attributedUserId: z.coerce.number().int().positive().optional().nullable(),
  amount: z.coerce.number().positive('Adjustment amount must be greater than zero'),
  adjustmentDirection: z.enum(['DEBIT', 'CREDIT']).default('DEBIT'),
  debitGlAccount: z.string().trim().min(3, 'Debit GL account is required').max(50),
  creditGlAccount: z.string().trim().min(3, 'Credit GL account is required').max(50),
  reasonCode: z.enum([
    'DRAWER_DISCREPANCY',
    'COUNTERFEIT_NOTE',
    'UNRESOLVED_DRIFT',
    'BANK_FEE_CORRECTION',
    'TRANSACTION_CORRECTION',
    'STAFF_SHORTAGE_RECOVERY',
    'TIP_CALCULATION_CORRECTION',
  ]),
  justificationNotes: z.string().trim().min(5, 'Detailed business justification is required').max(1000),
  supportingDocumentUrl: z.string().url().optional().nullable().or(z.literal('')),
});

export const reviewAdjustmentSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'POST']),
  rejectionReason: z.string().trim().max(500).optional().nullable(),
});

export type ListAdjustmentsQuery = z.infer<typeof listAdjustmentsQuerySchema>;
export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
export type ReviewAdjustmentInput = z.infer<typeof reviewAdjustmentSchema>;