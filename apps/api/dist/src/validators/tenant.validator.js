"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenantSchema = void 0;
// apps/api/src/validators/tenant.validator.ts
const zod_1 = require("zod");
exports.createTenantSchema = zod_1.z.object({
    businessName: zod_1.z.string().min(2, "Business name is required"),
    firstName: zod_1.z.string().min(2, "First name is required"),
    lastName: zod_1.z.string().min(2, "Last name is required"),
    email: zod_1.z.string().email("Valid email is required"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
});
