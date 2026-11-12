"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateKitchenItemStatusSchema = exports.updateTicketStatusSchema = exports.kitchenTicketsQuerySchema = void 0;
const zod_1 = require("zod");
exports.kitchenTicketsQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    station: zod_1.z.string().trim().optional(),
    orderType: zod_1.z.string().trim().optional(),
});
exports.updateTicketStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['Confirmed', 'Preparing', 'Ready', 'Cancelled']),
});
exports.updateKitchenItemStatusSchema = zod_1.z.object({
    kitchenStatus: zod_1.z.enum(['New', 'Preparing', 'Ready']),
});
