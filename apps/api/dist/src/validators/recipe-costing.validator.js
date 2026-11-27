"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recipeCostingQuerySchema = void 0;
// apps/api/src/validators/recipe-costing.validator.ts
const zod_1 = require("zod");
exports.recipeCostingQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    categoryId: zod_1.z.coerce.number().int().positive().optional(),
    targetMarginPercent: zod_1.z.coerce.number().min(10).max(95).default(70),
    alertThresholdPercent: zod_1.z.coerce.number().min(5).max(95).default(65),
    periodDays: zod_1.z.coerce.number().int().min(1).max(365).default(30),
    taxBasis: zod_1.z.enum(['NET', 'GROSS']).default('NET'),
});
