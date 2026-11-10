"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateKitchenGlobalSettingsSchema = exports.updateKitchenStationSchema = exports.createKitchenStationSchema = void 0;
const zod_1 = require("zod");
exports.createKitchenStationSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive('Operating branch is required'),
    name: zod_1.z.string().trim().min(2, 'Station name must be at least 2 characters'),
    code: zod_1.z.string().trim().min(2, 'Station identifier code is required').toUpperCase(),
    stationType: zod_1.z.enum(['PREP', 'EXPEDITER', 'PASS', 'BAR', 'PACKING']).default('PREP'),
    colorHex: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid 6-character hex code').default('#0554F4'),
    targetPrepTimeMinutes: zod_1.z.coerce.number().min(1).max(120).default(15),
    warningTimeMinutes: zod_1.z.coerce.number().min(1).max(120).default(10),
    criticalTimeMinutes: zod_1.z.coerce.number().min(1).max(120).default(18),
    assignedCategories: zod_1.z.array(zod_1.z.string()).default([]),
    autoBumpOnPrint: zod_1.z.boolean().default(false),
    soundAlertOnNewTicket: zod_1.z.boolean().default(true),
    allowTicketRecall: zod_1.z.boolean().default(true),
    backupStationId: zod_1.z.coerce.number().positive().optional().nullable(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateKitchenStationSchema = exports.createKitchenStationSchema.partial();
exports.updateKitchenGlobalSettingsSchema = zod_1.z.object({
    defaultWarningMinutes: zod_1.z.coerce.number().min(1).max(60).default(10),
    defaultCriticalMinutes: zod_1.z.coerce.number().min(1).max(120).default(18),
    enableCoursePacing: zod_1.z.boolean().default(true),
    enableOrderConsolidation: zod_1.z.boolean().default(true),
    vipPriorityBoostMinutes: zod_1.z.coerce.number().min(0).max(30).default(5),
    deliveryPriorityBoostMinutes: zod_1.z.coerce.number().min(0).max(30).default(3),
    soundVolume: zod_1.z.coerce.number().min(0).max(100).default(80),
    autoArchiveCompletedMinutes: zod_1.z.coerce.number().min(10).max(1440).default(120),
});
