"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePricingRuleSchema = exports.createPricingRuleSchema = exports.bulkUpdatePricesSchema = exports.updateBasePriceSchema = exports.VALID_DAYS = exports.PRICING_RULE_TYPES = void 0;
// apps/api/src/validators/pricing.validator.ts
const zod_1 = require("zod");
exports.PRICING_RULE_TYPES = [
    'FIXED_PRICE',
    'PERCENTAGE_DISCOUNT',
    'SURGE_ADDITION',
];
exports.VALID_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const optionalTime = zod_1.z
    .string()
    .trim()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional()
    .refine((val) => !val || timeRegex.test(val), {
    message: 'Time must be in 24-hour HH:MM format (e.g. 17:00)',
});
const normalizedDaysOfWeek = zod_1.z
    .string()
    .trim()
    .transform((val) => (val === '' ? 'ALL' : val.toUpperCase()))
    .optional()
    .default('ALL')
    .refine((val) => {
    if (val === 'ALL')
        return true;
    const parts = val.split(',').map((d) => d.trim()).filter(Boolean);
    return (parts.length > 0 &&
        parts.every((d) => exports.VALID_DAYS.includes(d)));
}, { message: 'Days of week must be ALL or comma-separated codes (MON,TUE,WED,THU,FRI,SAT,SUN)' });
exports.updateBasePriceSchema = zod_1.z.object({
    menuItemId: zod_1.z.coerce.number().int().positive('Valid menu item ID is required'),
    price: zod_1.z.coerce.number().min(0, 'Price must be zero or greater'),
});
exports.bulkUpdatePricesSchema = zod_1.z.object({
    updates: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.coerce.number().int().positive('Valid menu item ID is required'),
        price: zod_1.z.coerce.number().min(0, 'Price must be zero or greater'),
    }))
        .min(1, 'At least one price update is required'),
});
const pricingRuleBaseSchema = zod_1.z.object({
    menuItemId: zod_1.z.coerce.number().int().positive('Target menu item is required'),
    branchId: zod_1.z.coerce.number().int().positive().nullable().optional(),
    ruleName: zod_1.z.string().trim().min(2, 'Rule name must be at least 2 characters').max(150),
    ruleType: zod_1.z.enum(exports.PRICING_RULE_TYPES),
    value: zod_1.z.coerce.number().min(0, 'Rule value must be zero or greater'),
    startTime: optionalTime,
    endTime: optionalTime,
    daysOfWeek: normalizedDaysOfWeek,
    isActive: zod_1.z.boolean().default(true),
});
exports.createPricingRuleSchema = pricingRuleBaseSchema.superRefine((data, ctx) => {
    if (data.ruleType === 'PERCENTAGE_DISCOUNT' && (data.value <= 0 || data.value > 100)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['value'],
            message: 'Percentage discount must be between 0.01% and 100%.',
        });
    }
    if ((data.startTime && !data.endTime) || (!data.startTime && data.endTime)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['endTime'],
            message: 'Provide both start time and end time, or leave both blank for all-day rules.',
        });
    }
});
// Zod v4 safe: .partial() applied on unrefined base schema
exports.updatePricingRuleSchema = pricingRuleBaseSchema.partial();
