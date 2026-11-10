"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAuditLogSchema = exports.exportAuditLogsQuerySchema = exports.listAuditLogsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listAuditLogsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    search: zod_1.z.string().trim().optional(),
    module: zod_1.z.string().trim().optional(),
    action: zod_1.z.string().trim().optional(),
    userId: zod_1.z.coerce.number().positive().optional(),
    branchId: zod_1.z.coerce.number().positive().optional(),
    entityType: zod_1.z.string().trim().optional(),
    entityId: zod_1.z.string().trim().optional(),
    startDate: zod_1.z.string().datetime({ offset: true }).or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    endDate: zod_1.z.string().datetime({ offset: true }).or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});
exports.exportAuditLogsQuerySchema = exports.listAuditLogsQuerySchema.omit({
    page: true,
    limit: true,
}).extend({
    format: zod_1.z.enum(['csv', 'json']).default('csv'),
});
exports.recordAuditLogSchema = zod_1.z.object({
    branchId: zod_1.z.number().int().positive().optional().nullable(),
    userId: zod_1.z.number().int().positive().optional().nullable(),
    action: zod_1.z.string().trim().min(2).max(100),
    module: zod_1.z.string().trim().min(2).max(50),
    entityType: zod_1.z.string().trim().min(1).max(100),
    entityId: zod_1.z.string().trim().min(1).max(100),
    reason: zod_1.z.string().trim().optional().nullable(),
    previousValues: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional().nullable(),
    newValues: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional().nullable(),
    ipAddress: zod_1.z.string().trim().max(64).optional().nullable(),
});
