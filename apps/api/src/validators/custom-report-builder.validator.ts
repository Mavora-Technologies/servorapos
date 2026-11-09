import { z } from 'zod';

export const subjectAreaEnum = z.enum([
  'ORDERS_REVENUE',
  'INVENTORY_STOCK',
  'PAYMENTS_SETTLEMENTS',
  'WORKFORCE_ATTENDANCE',
  'MENU_PRODUCT_SALES',
]);

export const aggregationFunctionEnum = z.enum(['NONE', 'SUM', 'AVG', 'COUNT', 'MIN', 'MAX']);

export const filterOperatorEnum = z.enum([
  'EQUALS',
  'NOT_EQUALS',
  'CONTAINS',
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'BETWEEN',
  'IN',
  'IS_NULL',
  'IS_NOT_NULL',
]);

export const reportFieldSelectionSchema = z.object({
  fieldKey: z.string().trim().min(1, 'Field key is required'),
  customLabel: z.string().trim().optional(),
  aggregation: aggregationFunctionEnum.default('NONE'),
  sortOrder: z.enum(['ASC', 'DESC', 'NONE']).default('NONE'),
  sortPriority: z.number().int().optional(),
});

export const reportFilterCriterionSchema = z.object({
  fieldKey: z.string().trim().min(1, 'Filter field key is required'),
  operator: filterOperatorEnum,
  value: z.any().optional(),
  valueTo: z.any().optional(), // For 'BETWEEN' conditions
});

export const customReportConfigSchema = z.object({
  subjectArea: subjectAreaEnum,
  selectedFields: z.array(reportFieldSelectionSchema).min(1, 'Select at least one column field'),
  filters: z.array(reportFilterCriterionSchema).default([]),
  groupByFields: z.array(z.string().trim()).default([]),
  dateRange: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

export const runCustomReportPreviewSchema = customReportConfigSchema;

export const saveCustomReportDefinitionSchema = z.object({
  name: z.string().trim().min(3, 'Report title must be at least 3 characters').max(150),
  description: z.string().trim().max(500).default('User-defined custom report'),
  category: z.enum(['WORKFORCE_HCM', 'REVENUE_SALES', 'OPERATIONS_KDS', 'COMPLIANCE_AUDIT']).default('REVENUE_SALES'),
  config: customReportConfigSchema,
});

export const exportCustomReportSchema = customReportConfigSchema.extend({
  format: z.enum(['CSV', 'JSON']).default('CSV'),
  reportName: z.string().trim().default('custom-report'),
});

export type SubjectArea = z.infer<typeof subjectAreaEnum>;
export type ReportFieldSelection = z.infer<typeof reportFieldSelectionSchema>;
export type ReportFilterCriterion = z.infer<typeof reportFilterCriterionSchema>;
export type CustomReportConfig = z.infer<typeof customReportConfigSchema>;
export type SaveCustomReportDefinitionInput = z.infer<typeof saveCustomReportDefinitionSchema>;
export type ExportCustomReportInput = z.infer<typeof exportCustomReportSchema>;