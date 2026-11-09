import { z } from 'zod';

export const deviceTypeEnum = z.enum([
  'POS_TERMINAL',
  'KDS_DISPLAY',
  'WAITER_TABLET',
  'SELF_ORDER_KIOSK',
  'BARCODE_SCANNER',
  'MANAGER_STATION',
]);

export const operatingSystemEnum = z.enum([
  'ANDROID',
  'IOS',
  'WINDOWS',
  'LINUX',
  'WEB_BROWSER',
]);

export const deviceStatusEnum = z.enum([
  'PENDING_APPROVAL',
  'ACTIVE',
  'SUSPENDED',
  'DECOMMISSIONED',
]);

export const registerDeviceSchema = z.object({
  branchId: z.coerce.number().positive('Operating branch is required'),
  name: z.string().trim().min(2, 'Device name must be at least 2 characters'),
  deviceCode: z.string().trim().min(2, 'Device code identifier is required').toUpperCase(),
  deviceType: deviceTypeEnum.default('POS_TERMINAL'),
  operatingSystem: operatingSystemEnum.default('WEB_BROWSER'),
  hardwareFingerprint: z.string().trim().optional().nullable(),
  ipAddress: z.string().trim().optional().nullable(),
  macAddress: z.string().trim().optional().nullable(),
  appVersion: z.string().trim().optional().nullable(),
  assignedDrawerId: z.coerce.number().positive().optional().nullable(),
  assignedKitchenStationId: z.coerce.number().positive().optional().nullable(),
  assignedReceiptPrinterId: z.coerce.number().positive().optional().nullable(),
  allowOfflineSales: z.boolean().default(true),
  status: deviceStatusEnum.default('ACTIVE'),
});

export const updateDeviceSchema = registerDeviceSchema.partial().extend({
  isLocked: z.boolean().optional(),
});

export const generateEnrollmentTokenSchema = z.object({
  branchId: z.coerce.number().positive('Operating branch is required'),
  deviceType: deviceTypeEnum.default('POS_TERMINAL'),
  assignedDrawerId: z.coerce.number().positive().optional().nullable(),
  assignedKitchenStationId: z.coerce.number().positive().optional().nullable(),
  expiryHours: z.coerce.number().min(1).max(72).default(24),
});

export const claimEnrollmentTokenSchema = z.object({
  pairingCode: z.string().trim().min(4, 'Pairing code is required'),
  deviceName: z.string().trim().min(2, 'Device name is required'),
  hardwareFingerprint: z.string().trim().min(4, 'Hardware fingerprint is required'),
  operatingSystem: operatingSystemEnum.default('WEB_BROWSER'),
  appVersion: z.string().trim().optional().nullable(),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type GenerateEnrollmentTokenInput = z.infer<typeof generateEnrollmentTokenSchema>;
export type ClaimEnrollmentTokenInput = z.infer<typeof claimEnrollmentTokenSchema>;