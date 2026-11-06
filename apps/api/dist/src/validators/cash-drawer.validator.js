"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cashDropSchema = exports.closeDrawerSessionSchema = exports.openDrawerSessionSchema = void 0;
const zod_1 = require("zod");
exports.openDrawerSessionSchema = zod_1.z.object({
    drawerId: zod_1.z.coerce.number().positive('Drawer ID is required'),
    openingFloat: zod_1.z.coerce.number().min(0, 'Opening float cannot be negative'),
    notes: zod_1.z.string().optional().nullable(),
});
exports.closeDrawerSessionSchema = zod_1.z.object({
    actualClosingBalance: zod_1.z.coerce.number().min(0, 'Actual closing count is required'),
    denominations: zod_1.z.record(zod_1.z.string(), zod_1.z.coerce.number()).optional(),
    notes: zod_1.z.string().optional().nullable(),
});
exports.cashDropSchema = zod_1.z.object({
    sessionId: zod_1.z.coerce.number().positive('Session ID is required'),
    amount: zod_1.z.coerce.number().positive('Cash drop amount must be greater than zero'),
    reason: zod_1.z.string().min(2, 'Cash drop reason is required').trim(),
});
