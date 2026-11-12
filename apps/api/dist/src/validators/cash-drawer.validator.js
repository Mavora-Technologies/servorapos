"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCashDrawerSchema = exports.cashDropSchema = exports.closeDrawerSessionSchema = exports.openDrawerSessionSchema = void 0;
const zod_1 = require("zod");
exports.openDrawerSessionSchema = zod_1.z.object({
    drawerId: zod_1.z.coerce.number().int().positive('Drawer ID is required'),
    cashierId: zod_1.z.coerce.number().int().positive().optional(), // Supports supervisor proxy opening for a specific cashier
    openingFloat: zod_1.z.coerce.number().min(0, 'Opening float cannot be negative'),
    notes: zod_1.z.string().max(500).optional().nullable(),
});
exports.closeDrawerSessionSchema = zod_1.z.object({
    actualClosingBalance: zod_1.z.coerce.number().min(0, 'Actual closing count is required'),
    denominations: zod_1.z.record(zod_1.z.string(), zod_1.z.coerce.number().min(0)).optional(),
    notes: zod_1.z.string().max(500).optional().nullable(),
});
exports.cashDropSchema = zod_1.z.object({
    sessionId: zod_1.z.coerce.number().int().positive('Session ID is required'),
    amount: zod_1.z.coerce.number().positive('Cash drop amount must be greater than zero'),
    reason: zod_1.z.string().min(2, 'Cash drop reason is required').max(300).trim(),
});
exports.createCashDrawerSchema = zod_1.z.object({
    drawerCode: zod_1.z.string().min(2, 'Drawer code/number is required').max(50).trim(),
    name: zod_1.z.string().min(2, 'Terminal name is required').max(100).trim(),
    branchId: zod_1.z.coerce.number().int().positive().optional().nullable(),
});
