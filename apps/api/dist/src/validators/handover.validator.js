"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acknowledgeHandoverSchema = exports.updateHandoverSchema = exports.createHandoverSchema = void 0;
const zod_1 = require("zod");
exports.createHandoverSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive('Operating branch is required'),
    shiftType: zod_1.z.enum(['MORNING', 'MIDDAY', 'EVENING', 'NIGHT_CLOSING']),
    handoverDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid handover date required (YYYY-MM-DD)'),
    incomingManagerId: zod_1.z.coerce.number().positive().optional().nullable(),
    openingFloat: zod_1.z.coerce.number().min(0).default(0),
    closingCash: zod_1.z.coerce.number().min(0).default(0),
    cashVariance: zod_1.z.coerce.number().default(0),
    cashStatus: zod_1.z.enum(['BALANCED', 'DISCREPANCY_SHORT', 'DISCREPANCY_OVER']).default('BALANCED'),
    operationalIncidents: zod_1.z.string().optional().nullable(),
    inventoryKitchenNotes: zod_1.z.string().optional().nullable(),
    hardwareMaintenanceNotes: zod_1.z.string().optional().nullable(),
    guestExperienceNotes: zod_1.z.string().optional().nullable(),
    checklistItems: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string(),
        text: zod_1.z.string().min(1),
        completed: zod_1.z.boolean(),
    }))
        .default([]),
    status: zod_1.z.enum(['DRAFT', 'SUBMITTED']).default('SUBMITTED'),
});
exports.updateHandoverSchema = zod_1.z.object({
    incomingManagerId: zod_1.z.coerce.number().positive().optional().nullable(),
    openingFloat: zod_1.z.coerce.number().min(0).optional(),
    closingCash: zod_1.z.coerce.number().min(0).optional(),
    cashVariance: zod_1.z.coerce.number().optional(),
    cashStatus: zod_1.z.enum(['BALANCED', 'DISCREPANCY_SHORT', 'DISCREPANCY_OVER']).optional(),
    operationalIncidents: zod_1.z.string().optional().nullable(),
    inventoryKitchenNotes: zod_1.z.string().optional().nullable(),
    hardwareMaintenanceNotes: zod_1.z.string().optional().nullable(),
    guestExperienceNotes: zod_1.z.string().optional().nullable(),
    checklistItems: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string(),
        text: zod_1.z.string(),
        completed: zod_1.z.boolean(),
    }))
        .optional(),
    status: zod_1.z.enum(['DRAFT', 'SUBMITTED']).optional(),
});
exports.acknowledgeHandoverSchema = zod_1.z.object({
    notes: zod_1.z.string().optional(),
});
