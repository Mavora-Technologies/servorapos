"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatusSchema = exports.listOrdersQuerySchema = void 0;
const zod_1 = require("zod");
exports.listOrdersQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    status: zod_1.z.string().trim().optional(),
    paymentStatus: zod_1.z.string().trim().optional(),
    orderType: zod_1.z.string().trim().optional(),
    paymentMethod: zod_1.z.string().trim().optional(),
    cashierId: zod_1.z.coerce.number().int().positive().optional(),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD').optional(),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD').optional(),
    minAmount: zod_1.z.coerce.number().min(0).optional(),
    maxAmount: zod_1.z.coerce.number().min(0).optional(),
    hasKraPin: zod_1.z.enum(['true', 'false']).optional(),
    search: zod_1.z.string().trim().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(200).default(50),
});
exports.updateOrderStatusSchema = zod_1.z.object({
    status: zod_1.z.enum([
        'Confirmed',
        'Sent-To-Kitchen',
        'Preparing',
        'Ready',
        'Served',
        'Completed',
        'Delivered',
        'Cancelled',
    ]),
});
