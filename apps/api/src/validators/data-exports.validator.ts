import { z } from 'zod';

export const exportDomainEnum = z.enum([
  'SALES_REVENUE',
  'INVENTORY_VALUATION',
  'PAYMENTS_TREASURY',
  'WORKFORCE_HCM',
  'FOOD_COSTING',
  'AUDIT_LOGS',
]);

export const exportFormatEnum = z.enum(['CSV', 'XLSX', 'JSON']);

export const requestDataExportSchema = z.object({
  domain: exportDomainEnum,
  format: exportFormatEnum.default('CSV'),
  branchId: z.coerce.number().positive().optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  includeMetadata: z.boolean().default(true),
});

export const listDataExportsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  domain: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

export type RequestDataExportInput = z.infer<typeof requestDataExportSchema>;
export type ListDataExportsQuery = z.infer<typeof listDataExportsQuerySchema>;