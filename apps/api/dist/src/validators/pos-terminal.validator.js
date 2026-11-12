"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.posValidatePromoSchema = exports.posCustomerSearchQuerySchema = exports.posBootstrapQuerySchema = void 0;
const zod_1 = require("zod");
exports.posBootstrapQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
});
exports.posCustomerSearchQuerySchema = zod_1.z.object({
    search: zod_1.z.string().trim().min(1, 'Search query is required'),
});
exports.posValidatePromoSchema = zod_1.z.object({
    code: zod_1.z.string().trim().min(2).max(50),
    subtotalKes: zod_1.z.coerce.number().min(0),
});
