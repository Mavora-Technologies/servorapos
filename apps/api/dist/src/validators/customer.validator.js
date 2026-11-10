"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCustomersQuerySchema = exports.updateCustomerSchema = exports.createCustomerSchema = exports.customerTypeEnum = void 0;
const zod_1 = require("zod");
exports.customerTypeEnum = zod_1.z.enum(['RETAIL', 'CORPORATE', 'VIP', 'WHOLESALE']);
exports.createCustomerSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Customer name is required'),
    phone: zod_1.z.string().trim().min(5, 'Valid phone number required'),
    email: zod_1.z.string().email('Invalid email address').optional().or(zod_1.z.literal('')),
    kraPin: zod_1.z.string().trim().optional(),
    companyName: zod_1.z.string().trim().optional(),
    customerType: exports.customerTypeEnum.default('RETAIL'),
    address: zod_1.z.string().trim().optional(),
    notes: zod_1.z.string().trim().optional(),
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
});
exports.updateCustomerSchema = exports.createCustomerSchema.partial();
exports.listCustomersQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    customerType: zod_1.z.string().trim().optional(),
    search: zod_1.z.string().trim().optional(),
    sortBy: zod_1.z.enum(['NAME', 'TOTAL_SPENT', 'ORDERS_COUNT', 'CREATED_AT']).default('CREATED_AT'),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).default('DESC'),
});
