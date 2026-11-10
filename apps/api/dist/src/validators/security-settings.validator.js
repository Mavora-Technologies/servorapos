"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeSessionSchema = exports.updateSecuritySettingsSchema = void 0;
const zod_1 = require("zod");
exports.updateSecuritySettingsSchema = zod_1.z.object({
    minPasswordLength: zod_1.z.coerce.number().int().min(8, 'Minimum password length is 8').max(64),
    requireUppercase: zod_1.z.boolean().default(true),
    requireLowercase: zod_1.z.boolean().default(true),
    requireNumbers: zod_1.z.boolean().default(true),
    requireSymbols: zod_1.z.boolean().default(true),
    passwordExpirationDays: zod_1.z.coerce.number().int().min(0).max(365).default(90),
    preventPasswordReuseCount: zod_1.z.coerce.number().int().min(0).max(24).default(5),
    mfaEnforcement: zod_1.z.enum(['OPTIONAL', 'ENFORCED_FOR_ADMINS', 'ENFORCED_FOR_ALL']).default('OPTIONAL'),
    allowedMfaMethods: zod_1.z.array(zod_1.z.enum(['TOTP', 'SMS', 'EMAIL', 'SECURITY_KEY'])).min(1, 'Select at least one MFA method'),
    sessionTimeoutMinutes: zod_1.z.coerce.number().int().min(5).max(720).default(30),
    maxConcurrentSessions: zod_1.z.coerce.number().int().min(0).max(20).default(3),
    enforceIpBinding: zod_1.z.boolean().default(false),
    notifyOnNewLogin: zod_1.z.boolean().default(true),
    maxFailedAttempts: zod_1.z.coerce.number().int().min(3).max(20).default(5),
    lockoutDurationMinutes: zod_1.z.coerce.number().int().min(5).max(1440).default(30),
    enableIpAllowlist: zod_1.z.boolean().default(false),
    allowedIpRanges: zod_1.z.array(zod_1.z.string().trim()).default([]),
    ssoEnabled: zod_1.z.boolean().default(false),
    ssoProvider: zod_1.z.string().trim().optional().nullable(),
});
exports.revokeSessionSchema = zod_1.z.object({
    sessionId: zod_1.z.coerce.number().positive('Valid session identifier is required'),
});
