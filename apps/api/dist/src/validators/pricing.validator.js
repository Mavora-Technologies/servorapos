"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPricingRuleSchema = exports.bulkUpdatePricesSchema = exports.updateBasePriceSchema = void 0;
// apps/api/src/validators/pricing.validator.ts
const zod_1 = require("zod");
exports.updateBasePriceSchema = zod_1.z.object({
    menuItemId: zod_1.z.coerce.number().positive(),
    price: zod_1.z.coerce.number().min(0, 'Price must be non-negative'),
});
exports.bulkUpdatePricesSchema = zod_1.z.object({
    updates: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.coerce.number().positive(),
        price: zod_1.z.coerce.number().min(0),
    })).min(1, 'At least one price update required'),
});
exports.createPricingRuleSchema = zod_1.z.object({
    menuItemId: zod_1.z.coerce.number().positive('Menu item is required'),
    ruleName: zod_1.z.string().min(2, 'Rule name is required'),
    ruleType: zod_1.z.enum(['FIXED_PRICE', 'PERCENTAGE_DISCOUNT', 'SURGE_ADDITION']),
    value: zod_1.z.coerce.number().min(0, 'Value must be non-negative'),
    startTime: zod_1.z.string().optional(),
    endTime: zod_1.z.string().optional(),
    daysOfWeek: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional().default(true),
});
