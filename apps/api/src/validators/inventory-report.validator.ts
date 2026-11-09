import { z } from 'zod';

export const inventoryReportQuerySchema = z.object({
  branchId: z.coerce.number().positive().optional(),
  category: z.string().trim().optional(),
  materialType: z.enum(['RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED_GOOD', 'CONSUMABLE', 'ALL']).default('ALL'),
  stockStatus: z.enum(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'CRITICAL_EXPIRY']).default('ALL'),
  storageCondition: z.string().trim().optional(),
  startDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  endDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  sortBy: z.enum(['VALUATION', 'STOCK_LEVEL', 'TURNOVER', 'NAME', 'WASTAGE']).default('VALUATION'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
});

export const exportInventoryReportSchema = inventoryReportQuerySchema.extend({
  exportType: z.enum(['STOCK_ON_HAND', 'WASTE_SCRAP_LEDGER', 'BATCH_EXPIRY_SCHEDULE', 'MOVEMENT_AUDIT']).default('STOCK_ON_HAND'),
});

export type InventoryReportQuery = z.infer<typeof inventoryReportQuerySchema>;
export type ExportInventoryReportInput = z.infer<typeof exportInventoryReportSchema>;