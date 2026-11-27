"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDisputeSchema = exports.disputeHandoverSchema = exports.acknowledgeHandoverSchema = exports.updateHandoverSchema = exports.createHandoverSchema = exports.handoverContextQuerySchema = exports.listHandoversQuerySchema = void 0;
// apps/api/src/validators/handover.validator.ts
const zod_1 = require("zod");
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const optionalPositiveInt = zod_1.z.preprocess((val) => {
    if (val === undefined || val === null || val === '' || val === 'ALL')
        return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? val : n;
}, zod_1.z.number().int().positive().optional());
const nullablePositiveInt = zod_1.z.preprocess((val) => {
    if (val === undefined || val === null || val === '')
        return null;
    const n = Number(val);
    return Number.isNaN(n) ? val : n;
}, zod_1.z.number().int().positive().nullable());
const optionalNullableText = zod_1.z
    .string()
    .trim()
    .max(2000)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();
const checklistItemSchema = zod_1.z.object({
    id: zod_1.z.string().trim().min(1).max(64),
    text: zod_1.z.string().trim().min(1).max(255),
    completed: zod_1.z.boolean(),
});
exports.listHandoversQuerySchema = zod_1.z.object({
    startDate: zod_1.z.string().regex(dateRegex, 'startDate must be YYYY-MM-DD').optional(),
    endDate: zod_1.z.string().regex(dateRegex, 'endDate must be YYYY-MM-DD').optional(),
    branchId: optionalPositiveInt,
    shiftType: zod_1.z
        .string()
        .trim()
        .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
        .optional(),
    status: zod_1.z
        .string()
        .trim()
        .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
        .optional(),
});
exports.handoverContextQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive('Operating branch is required'),
    date: zod_1.z.string().regex(dateRegex, 'date must be YYYY-MM-DD').optional(),
});
exports.createHandoverSchema = zod_1.z
    .object({
    branchId: zod_1.z.coerce.number().int().positive('Operating branch is required'),
    handoverScope: zod_1.z.enum(['BRANCH_WIDE', 'TILL_CUSTODY']).default('BRANCH_WIDE'),
    cashierShiftId: nullablePositiveInt.default(null),
    cashDrawerId: nullablePositiveInt.default(null),
    shiftType: zod_1.z.enum(['MORNING', 'MIDDAY', 'EVENING', 'NIGHT_CLOSING']),
    handoverDate: zod_1.z.string().regex(dateRegex, 'Valid handover date required (YYYY-MM-DD)'),
    incomingManagerId: nullablePositiveInt.default(null),
    openingFloat: zod_1.z.coerce.number().min(0, 'Opening float cannot be negative').default(0),
    closingCash: zod_1.z.coerce.number().min(0, 'Closing cash cannot be negative').default(0),
    cashVariance: zod_1.z.coerce.number().default(0),
    cashStatus: zod_1.z
        .enum(['BALANCED', 'DISCREPANCY_SHORT', 'DISCREPANCY_OVER'])
        .default('BALANCED'),
    operationalIncidents: optionalNullableText,
    inventoryKitchenNotes: optionalNullableText,
    hardwareMaintenanceNotes: optionalNullableText,
    guestExperienceNotes: optionalNullableText,
    checklistItems: zod_1.z.array(checklistItemSchema).max(50).default([]),
    status: zod_1.z.enum(['DRAFT', 'SUBMITTED']).default('SUBMITTED'),
})
    .refine((d) => d.handoverScope !== 'TILL_CUSTODY' || d.cashierShiftId !== null || d.cashDrawerId !== null, {
    message: 'Till custody handovers must specify a Cash Shift or Physical Cash Drawer.',
    path: ['cashierShiftId'],
});
exports.updateHandoverSchema = zod_1.z.object({
    incomingManagerId: nullablePositiveInt.optional(),
    cashierShiftId: nullablePositiveInt.optional(),
    cashDrawerId: nullablePositiveInt.optional(),
    openingFloat: zod_1.z.coerce.number().min(0).optional(),
    closingCash: zod_1.z.coerce.number().min(0).optional(),
    cashVariance: zod_1.z.coerce.number().optional(),
    cashStatus: zod_1.z.enum(['BALANCED', 'DISCREPANCY_SHORT', 'DISCREPANCY_OVER']).optional(),
    operationalIncidents: optionalNullableText,
    inventoryKitchenNotes: optionalNullableText,
    hardwareMaintenanceNotes: optionalNullableText,
    guestExperienceNotes: optionalNullableText,
    checklistItems: zod_1.z.array(checklistItemSchema).max(50).optional(),
    status: zod_1.z.enum(['DRAFT', 'SUBMITTED']).optional(),
});
exports.acknowledgeHandoverSchema = zod_1.z.object({
    notes: zod_1.z.string().trim().max(500).optional(),
});
exports.disputeHandoverSchema = zod_1.z.object({
    reason: zod_1.z.string().trim().min(5, 'Dispute justification (min 5 characters) is required').max(500),
});
exports.resolveDisputeSchema = zod_1.z.object({
    resolutionNotes: zod_1.z
        .string()
        .trim()
        .min(5, 'Audit resolution notes (min 5 characters) are required')
        .max(1000),
    postGlAdjustment: zod_1.z.boolean().default(true),
});
