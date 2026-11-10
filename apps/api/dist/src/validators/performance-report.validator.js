"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPerformanceReportSchema = exports.performanceReportQuerySchema = void 0;
const zod_1 = require("zod");
exports.performanceReportQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional(),
    role: zod_1.z.string().trim().optional(),
    department: zod_1.z.enum(['ALL', 'FOH_SERVICE', 'BOH_CULINARY', 'MANAGEMENT', 'CASHIER']).default('ALL'),
    performanceTier: zod_1.z.enum(['ALL', 'TOP_TIER', 'MEETING_TARGET', 'UNDERPERFORMING']).default('ALL'),
    startDate: zod_1.z
        .string()
        .datetime({ offset: true })
        .or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
        .optional(),
    endDate: zod_1.z
        .string()
        .datetime({ offset: true })
        .or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
        .optional(),
    sortBy: zod_1.z.enum(['SALES', 'TICKETS', 'HOURS_WORKED', 'RATING', 'VOIDS', 'NAME']).default('SALES'),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).default('DESC'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    search: zod_1.z.string().trim().optional(),
});
exports.exportPerformanceReportSchema = exports.performanceReportQuerySchema.extend({
    exportType: zod_1.z.enum(['STAFF_LEAGUE_TABLE', 'ROLE_BENCHMARKS', 'APPRAISAL_AUDIT']).default('STAFF_LEAGUE_TABLE'),
});
