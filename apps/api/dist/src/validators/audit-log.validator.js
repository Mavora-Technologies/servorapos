"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAuditLogSchema = exports.exportAuditLogsQuerySchema = exports.listAuditLogsQuerySchema = void 0;
// apps/api/src/validators/audit-log.validator.ts
const zod_1 = require("zod");
const dateOrIsoSchema = zod_1.z
    .string()
    .trim()
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val) || !Number.isNaN(Date.parse(val)), 'Date must be YYYY-MM-DD or a valid ISO 8601 timestamp');
exports.listAuditLogsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    search: zod_1.z.string().trim().max(200).optional(),
    module: zod_1.z.string().trim().max(50).optional(),
    action: zod_1.z.string().trim().max(100).optional(),
    userId: zod_1.z.coerce.number().int().positive().optional(),
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    entityType: zod_1.z.string().trim().max(100).optional(),
    entityId: zod_1.z.string().trim().max(100).optional(),
    startDate: dateOrIsoSchema.optional(),
    endDate: dateOrIsoSchema.optional(),
});
exports.exportAuditLogsQuerySchema = exports.listAuditLogsQuerySchema
    .omit({ page: true, limit: true })
    .extend({
    format: zod_1.z.enum(['csv', 'json']).default('csv'),
});
exports.recordAuditLogSchema = zod_1.z.object({
    branchId: zod_1.z.number().int().positive().optional().nullable(),
    userId: zod_1.z.number().int().positive().optional().nullable(),
    action: zod_1.z.string().trim().min(2).max(100),
    module: zod_1.z.string().trim().min(2).max(50),
    entityType: zod_1.z.string().trim().min(1).max(100),
    entityId: zod_1.z.string().trim().min(1).max(100),
    reason: zod_1.z.string().trim().max(1000).optional().nullable(),
    previousValues: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional().nullable(),
    newValues: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional().nullable(),
    ipAddress: zod_1.z.string().trim().max(64).optional().nullable(),
});
