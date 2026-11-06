"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBranchSchema = exports.createBranchSchema = void 0;
// apps/api/src/validators/branch.validator.ts
const zod_1 = require("zod");
exports.createBranchSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Branch name must be at least 2 characters').trim(),
    code: zod_1.z
        .string()
        .min(2, 'Branch code must be at least 2 characters')
        .max(20, 'Branch code cannot exceed 20 characters')
        .trim()
        .toUpperCase(),
    address: zod_1.z.string().optional().nullable(),
    phone: zod_1.z.string().optional().nullable(),
    email: zod_1.z.string().email('Invalid email address').optional().nullable(),
    isMainBranch: zod_1.z.boolean().default(false),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateBranchSchema = exports.createBranchSchema.partial();
