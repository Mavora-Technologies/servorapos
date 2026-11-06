"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBusinessProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateBusinessProfileSchema = zod_1.z.object({
    businessName: zod_1.z.string().min(2, 'Business trading name must be at least 2 characters').trim(),
    slug: zod_1.z
        .string()
        .min(2, 'Slug must be at least 2 characters')
        .max(100)
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
        .optional()
        .nullable(),
    legalName: zod_1.z.string().max(255).optional().nullable(),
    kraPin: zod_1.z
        .string()
        .max(50)
        .regex(/^[A-Z][0-9]{9}[A-Z]$/, 'Invalid KRA PIN format (e.g. P051234567Z)')
        .optional()
        .nullable()
        .or(zod_1.z.literal('')),
    email: zod_1.z.string().email('Invalid business contact email').optional().nullable().or(zod_1.z.literal('')),
    phone: zod_1.z.string().max(50).optional().nullable(),
    currency: zod_1.z.string().min(1).max(10).default('KES'),
    timezone: zod_1.z.string().min(1).max(64).default('Africa/Nairobi'),
    logoUrl: zod_1.z.string().url('Invalid logo URL').optional().nullable().or(zod_1.z.literal('')),
});
