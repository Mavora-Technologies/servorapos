"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchDeliverySchema = exports.listDeliveriesQuerySchema = void 0;
const zod_1 = require("zod");
exports.listDeliveriesQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    provider: zod_1.z.string().trim().optional(),
    paymentStatus: zod_1.z.string().trim().optional(),
    search: zod_1.z.string().trim().optional(),
});
exports.dispatchDeliverySchema = zod_1.z.object({
    dispatchMode: zod_1.z.enum(['IN_HOUSE', '3PL']).default('3PL'),
    provider: zod_1.z.string().trim().min(2, 'Carrier or fleet name is required').max(100),
    driverName: zod_1.z.string().trim().max(120).optional().nullable(),
    driverPhone: zod_1.z.string().trim().max(40).optional().nullable(),
    vehicleRegistration: zod_1.z.string().trim().max(40).optional().nullable(),
    trackingUrl: zod_1.z.string().url('Tracking URL must be valid').optional().nullable().or(zod_1.z.literal('')),
    deliveryFee: zod_1.z.coerce.number().min(0).default(0),
    deliveryAddress: zod_1.z.string().trim().max(300).optional().nullable(),
    deliveryNotes: zod_1.z.string().trim().max(500).optional().nullable(),
});
