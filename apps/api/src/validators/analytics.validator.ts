// apps/api/src/validators/analytics.validator.ts
import { z } from 'zod';

export const DASHBOARD_TIMEFRAMES = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  '7days',
  'this_month',
  'last_month',
  '30days',
  'this_quarter',
  'this_year',
  'last_year',
  'custom',
] as const;

export const PRESET_TIMEFRAMES = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  '7days',
  'this_month',
  'last_month',
  '30days',
  'this_quarter',
  'this_year',
  'last_year',
] as const;

export const COMPARE_MODES = [
  'NONE',
  'PREVIOUS_PERIOD',
  'PREVIOUS_YEAR',
  'PRESET',
  'CUSTOM',
] as const;

const optionalDateSchema = z
  .string()
  .trim()
  .refine(
    (val) => val === '' || /^\d{4}-\d{2}-\d{2}$/.test(val) || !Number.isNaN(Date.parse(val)),
    'Invalid date format (expected YYYY-MM-DD or ISO 8601)'
  )
  .transform((val) => (val === '' ? undefined : val))
  .optional();

const optionalPositiveIdOrAll = z.preprocess((val) => {
  if (val === undefined || val === null || val === '' || val === 'ALL') return null;
  const num = Number(val);
  return Number.isNaN(num) ? val : num;
}, z.number().int().positive('Invalid numeric identifier').nullable());

const optionalFilterString = z
  .string()
  .trim()
  .max(80)
  .transform((val) => (val === '' || val === 'ALL' ? undefined : val))
  .optional();

export const dashboardAnalyticsQuerySchema = z.object({
  timeframe: z.enum(DASHBOARD_TIMEFRAMES).default('today'),
  startDate: optionalDateSchema,
  endDate: optionalDateSchema,
  compareMode: z.enum(COMPARE_MODES).default('PREVIOUS_PERIOD'),
  compareTimeframe: z.enum(PRESET_TIMEFRAMES).optional(),
  compareStartDate: optionalDateSchema,
  compareEndDate: optionalDateSchema,
  branchId: optionalPositiveIdOrAll.default(null),
  staffId: optionalPositiveIdOrAll.default(null),
  orderType: optionalFilterString,
  paymentMethod: optionalFilterString,
});

export type DashboardAnalyticsQuery = z.infer<typeof dashboardAnalyticsQuerySchema>;