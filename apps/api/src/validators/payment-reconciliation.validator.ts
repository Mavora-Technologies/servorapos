import { z } from 'zod';

export const directReconcilePaymentSchema = z.object({
  bankStatementRef: z.string().trim().min(1, 'Statement reference is required'),
});

export const matchStatementLineSchema = z.object({
  statementLineId: z.coerce.number().positive('Bank statement line ID is required'),
  paymentId: z.coerce.number().positive('ERP Payment ID is required'),
});

export const createBankStatementSchema = z.object({
  clearingAccount: z.string().min(2, 'Clearing account is required'),
  statementNumber: z.string().min(2, 'Statement number is required'),
  openingBalance: z.coerce.number(),
  closingBalance: z.coerce.number(),
  statementDate: z.string(),
  lines: z.array(
    z.object({
      lineDate: z.string(),
      transactionReference: z.string().optional().nullable(),
      description: z.string().min(1),
      amount: z.coerce.number(),
    })
  ).min(1, 'At least one bank statement transaction line is required'),
});