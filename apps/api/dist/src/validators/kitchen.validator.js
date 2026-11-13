"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kitchenPerformanceQuerySchema = exports.kitchenHistoryQuerySchema = exports.updateKitchenGlobalSettingsSchema = exports.updateKitchenStationSchema = exports.createKitchenStationSchema = exports.bumpStationItemsSchema = exports.updateKitchenItemStatusSchema = exports.updateTicketStatusSchema = exports.kitchenTicketsQuerySchema = void 0;
const zod_1 = require("zod");
exports.kitchenTicketsQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    station: zod_1.z.string().trim().optional(),
    orderType: zod_1.z.string().trim().optional(),
});
exports.updateTicketStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['Confirmed', 'Preparing', 'Ready', 'Cancelled']),
});
exports.updateKitchenItemStatusSchema = zod_1.z.object({
    kitchenStatus: zod_1.z.enum(['New', 'Preparing', 'Ready']),
});
exports.bumpStationItemsSchema = zod_1.z.object({
    orderId: zod_1.z.coerce.number().int().positive('Order ID is required'),
    station: zod_1.z.string().trim().min(1, 'Station identifier is required'),
});
exports.createKitchenStationSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive('Branch outlet is required'),
    name: zod_1.z.string().trim().min(2, 'Station name is required').max(100),
    code: zod_1.z.string().trim().min(2, 'Station code is required').max(50).toUpperCase(),
    stationType: zod_1.z.enum(['PREP', 'EXPEDITER', 'PASS', 'BAR', 'PACKING']).default('PREP'),
    colorHex: zod_1.z.string().trim().max(20).default('#0554F4'),
    targetPrepTimeMinutes: zod_1.z.coerce.number().int().min(1).max(180).default(15),
    warningTimeMinutes: zod_1.z.coerce.number().int().min(1).max(180).default(10),
    criticalTimeMinutes: zod_1.z.coerce.number().int().min(1).max(240).default(18),
    assignedCategories: zod_1.z.array(zod_1.z.string().trim()).default([]),
    autoBumpOnPrint: zod_1.z.boolean().default(false),
    soundAlertOnNewTicket: zod_1.z.boolean().default(true),
    allowTicketRecall: zod_1.z.boolean().default(true),
    backupStationId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateKitchenStationSchema = exports.createKitchenStationSchema.partial();
exports.updateKitchenGlobalSettingsSchema = zod_1.z.object({
    defaultWarningMinutes: zod_1.z.coerce.number().int().min(1).max(180).default(10),
    defaultCriticalMinutes: zod_1.z.coerce.number().int().min(1).max(240).default(18),
    enableCoursePacing: zod_1.z.boolean().default(true),
    enableOrderConsolidation: zod_1.z.boolean().default(true),
    vipPriorityBoostMinutes: zod_1.z.coerce.number().int().min(0).max(60).default(5),
    deliveryPriorityBoostMinutes: zod_1.z.coerce.number().int().min(0).max(60).default(3),
    soundVolume: zod_1.z.coerce.number().int().min(0).max(100).default(80),
    autoArchiveCompletedMinutes: zod_1.z.coerce.number().int().min(5).max(1440).default(120),
});
exports.kitchenHistoryQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    status: zod_1.z.string().trim().optional(),
    orderType: zod_1.z.string().trim().optional(),
    station: zod_1.z.string().trim().optional(),
    slaStatus: zod_1.z.enum(['ALL', 'ON_TIME', 'DELAYED']).optional(),
    startDate: zod_1.z.string().trim().optional(),
    endDate: zod_1.z.string().trim().optional(),
    search: zod_1.z.string().trim().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(500).default(150),
});
exports.kitchenPerformanceQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    station: zod_1.z.string().trim().optional(),
    orderType: zod_1.z.string().trim().optional(),
    startDate: zod_1.z.string().trim().optional(),
    endDate: zod_1.z.string().trim().optional(),
});
