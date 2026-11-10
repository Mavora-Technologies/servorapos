"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSavedReportSchema = exports.listSavedReportsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listSavedReportsQuerySchema = zod_1.z.object({
    category: zod_1.z.enum(['ALL', 'WORKFORCE_HCM', 'REVENUE_SALES', 'OPERATIONS_KDS', 'COMPLIANCE_AUDIT']).default('ALL'),
    search: zod_1.z.string().trim().optional(),
    isScheduled: zod_1.z.enum(['ALL', 'YES', 'NO']).default('ALL'),
    sortBy: zod_1.z.enum(['NAME', 'CREATED_AT', 'LAST_RUN', 'EXECUTION_COUNT']).default('CREATED_AT'),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).default('DESC'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
});
exports.updateSavedReportSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(3).max(150).optional(),
    description: zod_1.z.string().trim().max(500).optional(),
    category: zod_1.z.enum(['WORKFORCE_HCM', 'REVENUE_SALES', 'OPERATIONS_KDS', 'COMPLIANCE_AUDIT']).optional(),
    isActive: zod_1.z.boolean().optional(),
});
