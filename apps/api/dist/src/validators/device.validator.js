"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimEnrollmentTokenSchema = exports.generateEnrollmentTokenSchema = exports.updateDeviceSchema = exports.registerDeviceSchema = exports.deviceStatusEnum = exports.operatingSystemEnum = exports.deviceTypeEnum = void 0;
const zod_1 = require("zod");
exports.deviceTypeEnum = zod_1.z.enum([
    'POS_TERMINAL',
    'KDS_DISPLAY',
    'WAITER_TABLET',
    'SELF_ORDER_KIOSK',
    'BARCODE_SCANNER',
    'MANAGER_STATION',
]);
exports.operatingSystemEnum = zod_1.z.enum([
    'ANDROID',
    'IOS',
    'WINDOWS',
    'LINUX',
    'WEB_BROWSER',
]);
exports.deviceStatusEnum = zod_1.z.enum([
    'PENDING_APPROVAL',
    'ACTIVE',
    'SUSPENDED',
    'DECOMMISSIONED',
]);
exports.registerDeviceSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive('Operating branch is required'),
    name: zod_1.z.string().trim().min(2, 'Device name must be at least 2 characters'),
    deviceCode: zod_1.z.string().trim().min(2, 'Device code identifier is required').toUpperCase(),
    deviceType: exports.deviceTypeEnum.default('POS_TERMINAL'),
    operatingSystem: exports.operatingSystemEnum.default('WEB_BROWSER'),
    hardwareFingerprint: zod_1.z.string().trim().optional().nullable(),
    ipAddress: zod_1.z.string().trim().optional().nullable(),
    macAddress: zod_1.z.string().trim().optional().nullable(),
    appVersion: zod_1.z.string().trim().optional().nullable(),
    assignedDrawerId: zod_1.z.coerce.number().positive().optional().nullable(),
    assignedKitchenStationId: zod_1.z.coerce.number().positive().optional().nullable(),
    assignedReceiptPrinterId: zod_1.z.coerce.number().positive().optional().nullable(),
    allowOfflineSales: zod_1.z.boolean().default(true),
    status: exports.deviceStatusEnum.default('ACTIVE'),
});
exports.updateDeviceSchema = exports.registerDeviceSchema.partial().extend({
    isLocked: zod_1.z.boolean().optional(),
});
exports.generateEnrollmentTokenSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive('Operating branch is required'),
    deviceType: exports.deviceTypeEnum.default('POS_TERMINAL'),
    assignedDrawerId: zod_1.z.coerce.number().positive().optional().nullable(),
    assignedKitchenStationId: zod_1.z.coerce.number().positive().optional().nullable(),
    expiryHours: zod_1.z.coerce.number().min(1).max(72).default(24),
});
exports.claimEnrollmentTokenSchema = zod_1.z.object({
    pairingCode: zod_1.z.string().trim().min(4, 'Pairing code is required'),
    deviceName: zod_1.z.string().trim().min(2, 'Device name is required'),
    hardwareFingerprint: zod_1.z.string().trim().min(4, 'Hardware fingerprint is required'),
    operatingSystem: exports.operatingSystemEnum.default('WEB_BROWSER'),
    appVersion: zod_1.z.string().trim().optional().nullable(),
});
