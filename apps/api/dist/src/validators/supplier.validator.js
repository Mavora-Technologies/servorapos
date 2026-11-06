"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSupplierSchema = exports.createSupplierSchema = void 0;
const zod_1 = require("zod");
exports.createSupplierSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Supplier name must be at least 2 characters').trim(),
    contactPerson: zod_1.z.string().optional().nullable(),
    phone: zod_1.z.string().optional().nullable(),
    email: zod_1.z.string().email('Invalid email address').optional().nullable().or(zod_1.z.literal('')),
    kraPin: zod_1.z
        .string()
        .max(50)
        .regex(/^[A-Z][0-9]{9}[A-Z]$/, 'Invalid KRA PIN (e.g. P051234567Z)')
        .optional()
        .nullable()
        .or(zod_1.z.literal('')),
    physicalAddress: zod_1.z.string().optional().nullable(),
    city: zod_1.z.string().default('Nairobi'),
    paymentTerms: zod_1.z
        .enum(['COD', 'NET_7', 'NET_14', 'NET_30', 'PREPAID'])
        .default('NET_30'),
    leadTimeDays: zod_1.z.coerce.number().min(0).default(2),
    bankName: zod_1.z.string().optional().nullable(),
    bankAccountNumber: zod_1.z.string().optional().nullable(),
    mpesaPaybillNumber: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateSupplierSchema = exports.createSupplierSchema.partial();
