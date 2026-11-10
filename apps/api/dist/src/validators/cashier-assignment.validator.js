"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeAssignmentSchema = exports.updateCashierAssignmentSchema = exports.createCashierAssignmentSchema = void 0;
const zod_1 = require("zod");
exports.createCashierAssignmentSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive('Operating branch is required'),
    cashDrawerId: zod_1.z.coerce.number().positive('Target cash drawer register is required'),
    userId: zod_1.z.coerce.number().positive('Designated cashier/custodian is required'),
    assignmentDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid assignment date required (YYYY-MM-DD)'),
    shiftType: zod_1.z.enum(['MORNING', 'MIDDAY', 'EVENING', 'NIGHT_CLOSING']).default('MORNING'),
    allocatedFloat: zod_1.z.coerce.number().min(0, 'Opening float cannot be negative').default(5000),
    maxCashLimit: zod_1.z.coerce.number().min(1000, 'Threshold cash limit must be at least 1,000').default(50000),
    allowRefunds: zod_1.z.boolean().default(false),
    allowDrawerPop: zod_1.z.boolean().default(true),
    allowManualDiscount: zod_1.z.boolean().default(false),
    maxDiscountPercent: zod_1.z.coerce.number().min(0).max(100).default(0),
    handoverNotes: zod_1.z.string().optional().nullable(),
});
exports.updateCashierAssignmentSchema = zod_1.z.object({
    status: zod_1.z.enum(['ASSIGNED', 'ACTIVE', 'RELEASED', 'REVOKED']).optional(),
    allocatedFloat: zod_1.z.coerce.number().min(0).optional(),
    maxCashLimit: zod_1.z.coerce.number().min(1000).optional(),
    allowRefunds: zod_1.z.boolean().optional(),
    allowDrawerPop: zod_1.z.boolean().optional(),
    allowManualDiscount: zod_1.z.boolean().optional(),
    maxDiscountPercent: zod_1.z.coerce.number().min(0).max(100).optional(),
    handoverNotes: zod_1.z.string().optional().nullable(),
});
exports.revokeAssignmentSchema = zod_1.z.object({
    reason: zod_1.z.string().min(3, 'Mandatory revocation reason is required for compliance'),
});
