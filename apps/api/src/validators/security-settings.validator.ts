import { z } from 'zod';

export const updateSecuritySettingsSchema = z.object({
  minPasswordLength: z.coerce.number().int().min(8, 'Minimum password length is 8').max(64),
  requireUppercase: z.boolean().default(true),
  requireLowercase: z.boolean().default(true),
  requireNumbers: z.boolean().default(true),
  requireSymbols: z.boolean().default(true),
  passwordExpirationDays: z.coerce.number().int().min(0).max(365).default(90),
  preventPasswordReuseCount: z.coerce.number().int().min(0).max(24).default(5),
  mfaEnforcement: z.enum(['OPTIONAL', 'ENFORCED_FOR_ADMINS', 'ENFORCED_FOR_ALL']).default('OPTIONAL'),
  allowedMfaMethods: z.array(z.enum(['TOTP', 'SMS', 'EMAIL', 'SECURITY_KEY'])).min(1, 'Select at least one MFA method'),
  sessionTimeoutMinutes: z.coerce.number().int().min(5).max(720).default(30),
  maxConcurrentSessions: z.coerce.number().int().min(0).max(20).default(3),
  enforceIpBinding: z.boolean().default(false),
  notifyOnNewLogin: z.boolean().default(true),
  maxFailedAttempts: z.coerce.number().int().min(3).max(20).default(5),
  lockoutDurationMinutes: z.coerce.number().int().min(5).max(1440).default(30),
  enableIpAllowlist: z.boolean().default(false),
  allowedIpRanges: z.array(z.string().trim()).default([]),
  ssoEnabled: z.boolean().default(false),
  ssoProvider: z.string().trim().optional().nullable(),
});

export const revokeSessionSchema = z.object({
  sessionId: z.coerce.number().positive('Valid session identifier is required'),
});

export type UpdateSecuritySettingsInput = z.infer<typeof updateSecuritySettingsSchema>;
export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;