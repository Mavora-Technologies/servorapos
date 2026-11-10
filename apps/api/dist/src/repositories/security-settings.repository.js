"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecurityTelemetry = exports.revokeAllOtherSessions = exports.revokeSession = exports.listActiveSessions = exports.updateSecuritySettings = exports.getOrCreateSecuritySettings = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getOrCreateSecuritySettings = async (tenantId) => {
    let [settings] = await db_1.db
        .select()
        .from(schema_1.securitySettings)
        .where((0, drizzle_orm_1.eq)(schema_1.securitySettings.tenantId, tenantId))
        .limit(1);
    if (!settings) {
        const [created] = await db_1.db
            .insert(schema_1.securitySettings)
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
exports.getOrCreateSecuritySettings = getOrCreateSecuritySettings;
const updateSecuritySettings = async (tenantId, input) => {
    await (0, exports.getOrCreateSecuritySettings)(tenantId);
    const [updated] = await db_1.db
        .update(schema_1.securitySettings)
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
        .where((0, drizzle_orm_1.eq)(schema_1.securitySettings.tenantId, tenantId))
        .returning();
    return updated;
};
exports.updateSecuritySettings = updateSecuritySettings;
const listActiveSessions = async (tenantId, limit = 50) => {
    const sessions = await db_1.db
        .select({
        id: schema_1.userSessions.id,
        userId: schema_1.userSessions.userId,
        userName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        userEmail: schema_1.users.email,
        userRole: schema_1.users.role,
        ipAddress: schema_1.userSessions.ipAddress,
        deviceType: schema_1.userSessions.deviceType,
        browser: schema_1.userSessions.browser,
        os: schema_1.userSessions.os,
        city: schema_1.userSessions.city,
        country: schema_1.userSessions.country,
        lastActiveAt: schema_1.userSessions.lastActiveAt,
        createdAt: schema_1.userSessions.createdAt,
    })
        .from(schema_1.userSessions)
        .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.userSessions.userId, schema_1.users.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userSessions.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userSessions.isRevoked, false)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.userSessions.lastActiveAt))
        .limit(limit);
    return sessions;
};
exports.listActiveSessions = listActiveSessions;
const revokeSession = async (tenantId, sessionId) => {
    const [revoked] = await db_1.db
        .update(schema_1.userSessions)
        .set({ isRevoked: true })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userSessions.id, sessionId), (0, drizzle_orm_1.eq)(schema_1.userSessions.tenantId, tenantId)))
        .returning();
    if (!revoked) {
        throw new Error('Active session not found or already terminated.');
    }
    return revoked;
};
exports.revokeSession = revokeSession;
const revokeAllOtherSessions = async (tenantId, userId, excludeSessionId) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.userSessions.tenantId, tenantId),
        (0, drizzle_orm_1.eq)(schema_1.userSessions.userId, userId),
        (0, drizzle_orm_1.eq)(schema_1.userSessions.isRevoked, false),
        excludeSessionId ? (0, drizzle_orm_1.sql) `${schema_1.userSessions.id} != ${excludeSessionId}` : undefined,
    ].filter(Boolean);
    const result = await db_1.db
        .update(schema_1.userSessions)
        .set({ isRevoked: true })
        .where((0, drizzle_orm_1.and)(...conditions))
        .returning();
    return result;
};
exports.revokeAllOtherSessions = revokeAllOtherSessions;
const getSecurityTelemetry = async (tenantId) => {
    const [sessionsCount, activeUsersCount] = await Promise.all([
        db_1.db
            .select({
            totalActive: (0, drizzle_orm_1.sql) `count(case when ${schema_1.userSessions.isRevoked} = false then 1 end)`,
            totalRevoked: (0, drizzle_orm_1.sql) `count(case when ${schema_1.userSessions.isRevoked} = true then 1 end)`,
        })
            .from(schema_1.userSessions)
            .where((0, drizzle_orm_1.eq)(schema_1.userSessions.tenantId, tenantId)),
        db_1.db
            .select({
            totalStaff: (0, drizzle_orm_1.sql) `count(*)`,
            activeStaff: (0, drizzle_orm_1.sql) `count(case when ${schema_1.users.isActive} = true then 1 end)`,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)),
    ]);
    return {
        activeSessions: Number(sessionsCount[0]?.totalActive || 0),
        revokedSessions: Number(sessionsCount[0]?.totalRevoked || 0),
        totalStaffAccounts: Number(activeUsersCount[0]?.totalStaff || 0),
        activeStaffAccounts: Number(activeUsersCount[0]?.activeStaff || 0),
    };
};
exports.getSecurityTelemetry = getSecurityTelemetry;
