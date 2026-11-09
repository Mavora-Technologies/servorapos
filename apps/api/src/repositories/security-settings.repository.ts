import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { securitySettings, userSessions, users } from '../config/schema';
import { UpdateSecuritySettingsInput } from '../validators/security-settings.validator';

export const getOrCreateSecuritySettings = async (tenantId: number) => {
  let [settings] = await db
    .select()
    .from(securitySettings)
    .where(eq(securitySettings.tenantId, tenantId))
    .limit(1);

  if (!settings) {
    const [created] = await db
      .insert(securitySettings)
      .values({
        tenantId,
        minPasswordLength: 10,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
        passwordExpirationDays: 90,
        preventPasswordReuseCount: 5,
        mfaEnforcement: 'OPTIONAL',
        allowedMfaMethods: ['TOTP', 'EMAIL'],
        sessionTimeoutMinutes: 30,
        maxConcurrentSessions: 3,
        enforceIpBinding: false,
        notifyOnNewLogin: true,
        maxFailedAttempts: 5,
        lockoutDurationMinutes: 30,
        enableIpAllowlist: false,
        allowedIpRanges: [],
        ssoEnabled: false,
      })
      .returning();

    settings = created;
  }

  return settings;
};

export const updateSecuritySettings = async (
  tenantId: number,
  input: UpdateSecuritySettingsInput
) => {
  await getOrCreateSecuritySettings(tenantId);

  const [updated] = await db
    .update(securitySettings)
    .set({
      minPasswordLength: input.minPasswordLength,
      requireUppercase: input.requireUppercase,
      requireLowercase: input.requireLowercase,
      requireNumbers: input.requireNumbers,
      requireSymbols: input.requireSymbols,
      passwordExpirationDays: input.passwordExpirationDays,
      preventPasswordReuseCount: input.preventPasswordReuseCount,
      mfaEnforcement: input.mfaEnforcement,
      allowedMfaMethods: input.allowedMfaMethods,
      sessionTimeoutMinutes: input.sessionTimeoutMinutes,
      maxConcurrentSessions: input.maxConcurrentSessions,
      enforceIpBinding: input.enforceIpBinding,
      notifyOnNewLogin: input.notifyOnNewLogin,
      maxFailedAttempts: input.maxFailedAttempts,
      lockoutDurationMinutes: input.lockoutDurationMinutes,
      enableIpAllowlist: input.enableIpAllowlist,
      allowedIpRanges: input.allowedIpRanges,
      ssoEnabled: input.ssoEnabled,
      ssoProvider: input.ssoProvider || null,
      updatedAt: new Date(),
    })
    .where(eq(securitySettings.tenantId, tenantId))
    .returning();

  return updated;
};

export const listActiveSessions = async (tenantId: number, limit = 50) => {
  const sessions = await db
    .select({
      id: userSessions.id,
      userId: userSessions.userId,
      userName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      userEmail: users.email,
      userRole: users.role,
      ipAddress: userSessions.ipAddress,
      deviceType: userSessions.deviceType,
      browser: userSessions.browser,
      os: userSessions.os,
      city: userSessions.city,
      country: userSessions.country,
      lastActiveAt: userSessions.lastActiveAt,
      createdAt: userSessions.createdAt,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(
      and(
        eq(userSessions.tenantId, tenantId),
        eq(userSessions.isRevoked, false)
      )
    )
    .orderBy(desc(userSessions.lastActiveAt))
    .limit(limit);

  return sessions;
};

export const revokeSession = async (tenantId: number, sessionId: number) => {
  const [revoked] = await db
    .update(userSessions)
    .set({ isRevoked: true })
    .where(
      and(
        eq(userSessions.id, sessionId),
        eq(userSessions.tenantId, tenantId)
      )
    )
    .returning();

  if (!revoked) {
    throw new Error('Active session not found or already terminated.');
  }

  return revoked;
};

export const revokeAllOtherSessions = async (
  tenantId: number,
  userId: number,
  excludeSessionId?: number
) => {
  const conditions = [
    eq(userSessions.tenantId, tenantId),
    eq(userSessions.userId, userId),
    eq(userSessions.isRevoked, false),
    excludeSessionId ? sql`${userSessions.id} != ${excludeSessionId}` : undefined,
  ].filter(Boolean);

  const result = await db
    .update(userSessions)
    .set({ isRevoked: true })
    .where(and(...conditions))
    .returning();

  return result;
};

export const getSecurityTelemetry = async (tenantId: number) => {
  const [sessionsCount, activeUsersCount] = await Promise.all([
    db
      .select({
        totalActive: sql<number>`count(case when ${userSessions.isRevoked} = false then 1 end)`,
        totalRevoked: sql<number>`count(case when ${userSessions.isRevoked} = true then 1 end)`,
      })
      .from(userSessions)
      .where(eq(userSessions.tenantId, tenantId)),
    db
      .select({
        totalStaff: sql<number>`count(*)`,
        activeStaff: sql<number>`count(case when ${users.isActive} = true then 1 end)`,
      })
      .from(users)
      .where(eq(users.tenantId, tenantId)),
  ]);

  return {
    activeSessions: Number(sessionsCount[0]?.totalActive || 0),
    revokedSessions: Number(sessionsCount[0]?.totalRevoked || 0),
    totalStaffAccounts: Number(activeUsersCount[0]?.totalStaff || 0),
    activeStaffAccounts: Number(activeUsersCount[0]?.activeStaff || 0),
  };
};