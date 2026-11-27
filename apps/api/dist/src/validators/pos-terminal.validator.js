"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignStaffPosPinSchema = exports.posPinSwitchSchema = exports.posValidateStockSchema = exports.posValidatePromoSchema = exports.posCustomerSearchQuerySchema = exports.posBootstrapQuerySchema = void 0;
// apps/api/src/validators/pos-terminal.validator.ts
const zod_1 = require("zod");
exports.posBootstrapQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
});
exports.posCustomerSearchQuerySchema = zod_1.z.object({
    search: zod_1.z.string().trim().min(1, 'Search query is required'),
});
exports.posValidatePromoSchema = zod_1.z.object({
    code: zod_1.z.string().trim().min(2).max(50),
    subtotalKes: zod_1.z.coerce.number().min(0),
});
exports.posValidateStockSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    items: zod_1.z
        .array(zod_1.z.object({
        menuItemId: zod_1.z.coerce.number().int().positive('Valid menu item ID is required'),
        quantity: zod_1.z.coerce.number().positive('Quantity must be greater than zero'),
    }))
        .min(1, 'At least one order item is required for stock validation'),
});
exports.posPinSwitchSchema = zod_1.z.object({
    pin: zod_1.z
        .string()
        .trim()
        .regex(/^\d{4,6}$/, 'POS PIN must be 4 to 6 numeric digits'),
    branchId: zod_1.z.coerce.number().int().positive('Active branch ID is required'),
    userId: zod_1.z.coerce.number().int().positive().optional(), // Optional: speeds up lookup when avatar tile is tapped
});
exports.assignStaffPosPinSchema = zod_1.z.object({
    pin: zod_1.z
        .string()
        .trim()
        .regex(/^\d{4,6}$/, 'POS PIN must be 4 to 6 numeric digits'),
});
