"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStaffSchema = void 0;
// apps/api/src/validators/user.validator.ts
const zod_1 = require("zod");
exports.createStaffSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(2, 'First name is required'),
    lastName: zod_1.z.string().min(2, 'Last name is required'),
    email: zod_1.z.string().email('Valid email is required'),
    password: zod_1.z.string().min(6, 'Temporary password required'),
    role: zod_1.z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER']), // Admin chooses this
    branchId: zod_1.z.number().optional(),
});
