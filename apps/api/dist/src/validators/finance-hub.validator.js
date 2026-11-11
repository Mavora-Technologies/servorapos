"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financeHubQuerySchema = void 0;
const zod_1 = require("zod");
exports.financeHubQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    period: zod_1.z.enum(['TODAY', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR']).default('THIS_MONTH'),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
