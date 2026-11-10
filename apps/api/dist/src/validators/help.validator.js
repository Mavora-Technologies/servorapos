"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listKbQuerySchema = exports.listTicketsQuerySchema = exports.updateTicketStatusSchema = exports.addTicketMessageSchema = exports.createTicketSchema = exports.ticketStatusEnum = exports.ticketPriorityEnum = exports.ticketCategoryEnum = void 0;
const zod_1 = require("zod");
exports.ticketCategoryEnum = zod_1.z.enum([
    'HARDWARE',
    'BILLING',
    'POS_KDS',
    'INVENTORY',
    'AUTH_SECURITY',
    'GENERAL',
]);
exports.ticketPriorityEnum = zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
exports.ticketStatusEnum = zod_1.z.enum([
    'OPEN',
    'IN_PROGRESS',
    'WAITING_FOR_USER',
    'RESOLVED',
    'CLOSED',
]);
exports.createTicketSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    subject: zod_1.z.string().trim().min(2, 'Subject must be at least 2 characters').max(255),
    category: exports.ticketCategoryEnum,
    priority: exports.ticketPriorityEnum.default('MEDIUM'),
    description: zod_1.z.string().trim().min(2, 'Description must be at least 2 characters'),
    diagnosticsPayload: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional().nullable(),
});
exports.addTicketMessageSchema = zod_1.z.object({
    message: zod_1.z.string().trim().min(1, 'Message cannot be empty'),
    attachments: zod_1.z.array(zod_1.z.string().url()).default([]),
});
exports.updateTicketStatusSchema = zod_1.z.object({
    status: exports.ticketStatusEnum,
});
exports.listTicketsQuerySchema = zod_1.z.object({
    status: zod_1.z.string().trim().optional(),
    priority: zod_1.z.string().trim().optional(),
    category: zod_1.z.string().trim().optional(),
    search: zod_1.z.string().trim().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(15),
});
exports.listKbQuerySchema = zod_1.z.object({
    category: zod_1.z.string().trim().optional(),
    search: zod_1.z.string().trim().optional(),
});
