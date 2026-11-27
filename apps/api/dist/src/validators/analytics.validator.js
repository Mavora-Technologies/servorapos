"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardAnalyticsQuerySchema = exports.COMPARE_MODES = exports.PRESET_TIMEFRAMES = exports.DASHBOARD_TIMEFRAMES = void 0;
// apps/api/src/validators/analytics.validator.ts
const zod_1 = require("zod");
exports.DASHBOARD_TIMEFRAMES = [
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
];
exports.PRESET_TIMEFRAMES = [
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
];
exports.COMPARE_MODES = [
    'NONE',
    'PREVIOUS_PERIOD',
    'PREVIOUS_YEAR',
    'PRESET',
    'CUSTOM',
];
const optionalDateSchema = zod_1.z
    .string()
    .trim()
    .refine((val) => val === '' || /^\d{4}-\d{2}-\d{2}$/.test(val) || !Number.isNaN(Date.parse(val)), 'Invalid date format (expected YYYY-MM-DD or ISO 8601)')
    .transform((val) => (val === '' ? undefined : val))
    .optional();
const optionalPositiveIdOrAll = zod_1.z.preprocess((val) => {
    if (val === undefined || val === null || val === '' || val === 'ALL')
        return null;
    const num = Number(val);
    return Number.isNaN(num) ? val : num;
}, zod_1.z.number().int().positive('Invalid numeric identifier').nullable());
const optionalFilterString = zod_1.z
    .string()
    .trim()
    .max(80)
    .transform((val) => (val === '' || val === 'ALL' ? undefined : val))
    .optional();
exports.dashboardAnalyticsQuerySchema = zod_1.z.object({
    timeframe: zod_1.z.enum(exports.DASHBOARD_TIMEFRAMES).default('today'),
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    compareMode: zod_1.z.enum(exports.COMPARE_MODES).default('PREVIOUS_PERIOD'),
    compareTimeframe: zod_1.z.enum(exports.PRESET_TIMEFRAMES).optional(),
    compareStartDate: optionalDateSchema,
    compareEndDate: optionalDateSchema,
    branchId: optionalPositiveIdOrAll.default(null),
    staffId: optionalPositiveIdOrAll.default(null),
    orderType: optionalFilterString,
    paymentMethod: optionalFilterString,
});
