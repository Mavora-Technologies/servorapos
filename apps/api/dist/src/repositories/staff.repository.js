"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStaffPinTransaction = exports.updateStaffTransaction = exports.createStaffTransaction = exports.verifyTenantRoleSlugExists = exports.verifyTenantBranchesExist = exports.findStaffById = exports.listStaffByTenant = void 0;
// apps/api/src/repositories/staff.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listStaffByTenant = async (tenantId, filters, authorizedBranchIds // null = all tenant branches
) => {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)];
    if (filters.role) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.users.role, filters.role));
    }
    if (filters.isActive !== undefined) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.users.isActive, filters.isActive));
    }
    if (filters.search) {
        const pattern = `%${filters.search}%`;
        const searchClause = (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.users.firstName, pattern), (0, drizzle_orm_1.ilike)(schema_1.users.lastName, pattern), (0, drizzle_orm_1.ilike)(schema_1.users.email, pattern), (0, drizzle_orm_1.ilike)(schema_1.users.phone, pattern));
        if (searchClause)
            conditions.push(searchClause);
    }
    // Enforce branch scope: match either defaultBranchId OR an active user_branch_memberships row
    const effectiveBranchFilter = filters.branchId
        ? [filters.branchId]
        : authorizedBranchIds;
    if (effectiveBranchFilter !== null) {
        if (effectiveBranchFilter.length === 0) {
            conditions.push((0, drizzle_orm_1.sql) `FALSE`);
        }
        else {
            const membershipSubquery = db_1.db
                .select({ userId: schema_1.userBranchMemberships.userId })
                .from(schema_1.userBranchMemberships)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true), (0, drizzle_orm_1.inArray)(schema_1.userBranchMemberships.branchId, effectiveBranchFilter)));
            const branchClause = (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.users.defaultBranchId, effectiveBranchFilter), (0, drizzle_orm_1.inArray)(schema_1.users.id, membershipSubquery));
            if (branchClause)
                conditions.push(branchClause);
        }
    }
    const [staffRows, membershipsRows, onDutyRows, tenantRoles, branchList] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.users.id,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            email: schema_1.users.email,
            phone: schema_1.users.phone,
            role: schema_1.users.role,
            isActive: schema_1.users.isActive,
            lastLoginAt: schema_1.users.lastLoginAt,
            createdAt: schema_1.users.createdAt,
            updatedAt: schema_1.users.updatedAt,
            hasPin: (0, drizzle_orm_1.sql) `CASE WHEN ${schema_1.users.pinHash} IS NOT NULL THEN true ELSE false END`,
            defaultBranchId: schema_1.users.defaultBranchId,
            branchName: schema_1.branches.name,
            branchCode: schema_1.branches.code,
        })
            .from(schema_1.users)
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.defaultBranchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt)),
        db_1.db
            .select({
            userId: schema_1.userBranchMemberships.userId,
            branchId: schema_1.userBranchMemberships.branchId,
            branchName: schema_1.branches.name,
            branchCode: schema_1.branches.code,
            roleId: schema_1.userBranchMemberships.roleId,
            roleName: schema_1.roles.name,
            roleSlug: schema_1.roles.slug,
        })
            .from(schema_1.userBranchMemberships)
            .innerJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)))
            .leftJoin(schema_1.roles, (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.roleId, schema_1.roles.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true))),
        db_1.db
            .select({
            userId: schema_1.attendanceRecords.userId,
            branchId: schema_1.attendanceRecords.branchId,
            clockInAt: schema_1.attendanceRecords.clockInAt,
        })
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.status, 'ON_DUTY'))),
        db_1.db
            .select({
            id: schema_1.roles.id,
            name: schema_1.roles.name,
            slug: schema_1.roles.slug,
            permissions: schema_1.roles.permissions,
            isSystemRole: schema_1.roles.isSystemRole,
        })
            .from(schema_1.roles)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.isSystemRole, true), (0, drizzle_orm_1.isNull)(schema_1.roles.tenantId))))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.roles.isSystemRole), (0, drizzle_orm_1.asc)(schema_1.roles.name)),
        db_1.db
            .select({
            id: schema_1.branches.id,
            name: schema_1.branches.name,
            code: schema_1.branches.code,
            isMainBranch: schema_1.branches.isMainBranch,
        })
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true), authorizedBranchIds !== null
            ? authorizedBranchIds.length > 0
                ? (0, drizzle_orm_1.inArray)(schema_1.branches.id, authorizedBranchIds)
                : (0, drizzle_orm_1.sql) `FALSE`
            : undefined))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.branches.isMainBranch), (0, drizzle_orm_1.asc)(schema_1.branches.name)),
    ]);
    const membershipMap = new Map();
    for (const m of membershipsRows) {
        const existing = membershipMap.get(m.userId) ?? [];
        existing.push({
            branchId: m.branchId,
            branchName: m.branchName,
            branchCode: m.branchCode,
            roleId: m.roleId,
            roleName: m.roleName,
            roleSlug: m.roleSlug,
        });
        membershipMap.set(m.userId, existing);
    }
    const onDutyMap = new Map();
    for (const att of onDutyRows) {
        onDutyMap.set(att.userId, { branchId: att.branchId, clockInAt: att.clockInAt });
    }
    const enrichedStaff = staffRows.map((s) => {
        const activeDuty = onDutyMap.get(s.id);
        return {
            ...s,
            isOnDuty: Boolean(activeDuty),
            clockedInAt: activeDuty?.clockInAt ?? null,
            branchMemberships: membershipMap.get(s.id) ?? [],
        };
    });
    return {
        staff: enrichedStaff,
        roles: tenantRoles,
        branches: branchList,
    };
};
exports.listStaffByTenant = listStaffByTenant;
const findStaffById = async (tenantId, staffId) => {
    const [staff] = await db_1.db
        .select({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        role: schema_1.users.role,
        isActive: schema_1.users.isActive,
        defaultBranchId: schema_1.users.defaultBranchId,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, staffId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
        .limit(1);
    return staff ?? null;
};
exports.findStaffById = findStaffById;
const verifyTenantBranchesExist = async (tenantId, branchIds) => {
    const uniqueIds = Array.from(new Set(branchIds));
    if (uniqueIds.length === 0)
        return true;
    const found = await db_1.db
        .select({ id: schema_1.branches.id })
        .from(schema_1.branches)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true), (0, drizzle_orm_1.inArray)(schema_1.branches.id, uniqueIds)));
    return found.length === uniqueIds.length;
};
exports.verifyTenantBranchesExist = verifyTenantBranchesExist;
const verifyTenantRoleSlugExists = async (tenantId, roleSlug) => {
    const [found] = await db_1.db
        .select({ id: schema_1.roles.id })
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.slug, roleSlug), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.isSystemRole, true), (0, drizzle_orm_1.isNull)(schema_1.roles.tenantId)))))
        .limit(1);
    return Boolean(found);
};
exports.verifyTenantRoleSlugExists = verifyTenantRoleSlugExists;
const createStaffTransaction = async (tenantId, data, actor) => {
    return await db_1.db.transaction(async (tx) => {
        // Tenant-scoped email uniqueness check (matches users_tenant_email_idx)
        const [existing] = await tx
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.email, data.email)))
            .limit(1);
        if (existing) {
            throw new Error(`An employee account with email '${data.email}' already exists.`);
        }
        const [newUser] = await tx
            .insert(schema_1.users)
            .values({
            tenantId,
            defaultBranchId: data.defaultBranchId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            passwordHash: data.passwordHash,
            pinHash: data.pinHash,
            role: data.role,
            isActive: true,
        })
            .returning({
            id: schema_1.users.id,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            email: schema_1.users.email,
            phone: schema_1.users.phone,
            role: schema_1.users.role,
            isActive: schema_1.users.isActive,
            defaultBranchId: schema_1.users.defaultBranchId,
            createdAt: schema_1.users.createdAt,
        });
        // Always ensure the employee has an active membership for their defaultBranchId
        const membershipMap = new Map();
        membershipMap.set(data.defaultBranchId, null);
        for (const m of data.branchMemberships) {
            membershipMap.set(m.branchId, m.roleId ?? null);
        }
        const membershipRows = Array.from(membershipMap.entries()).map(([branchId, roleId]) => ({
            tenantId,
            userId: newUser.id,
            branchId,
            roleId,
            isActive: true,
        }));
        if (membershipRows.length > 0) {
            await tx.insert(schema_1.userBranchMemberships).values(membershipRows);
        }
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: data.defaultBranchId,
            userId: actor.userId,
            action: 'STAFF_PROVISIONED',
            module: 'STAFF',
            entityType: 'users',
            entityId: String(newUser.id),
            newValues: {
                email: newUser.email,
                role: newUser.role,
                defaultBranchId: newUser.defaultBranchId,
                assignedBranchIds: Array.from(membershipMap.keys()),
            },
            ipAddress: actor.ipAddress ?? null,
        });
        return newUser;
    });
};
exports.createStaffTransaction = createStaffTransaction;
const updateStaffTransaction = async (tenantId, staffId, data, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select({
            id: schema_1.users.id,
            email: schema_1.users.email,
            role: schema_1.users.role,
            isActive: schema_1.users.isActive,
            defaultBranchId: schema_1.users.defaultBranchId,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, staffId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            return null;
        }
        if (data.email && data.email !== existing.email) {
            const [collision] = await tx
                .select({ id: schema_1.users.id })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.email, data.email)))
                .limit(1);
            if (collision) {
                throw new Error(`Email address '${data.email}' is already assigned to another employee.`);
            }
        }
        const updateSet = {
            updatedAt: new Date(),
        };
        if (data.firstName !== undefined)
            updateSet.firstName = data.firstName;
        if (data.lastName !== undefined)
            updateSet.lastName = data.lastName;
        if (data.email !== undefined)
            updateSet.email = data.email;
        if (data.phone !== undefined)
            updateSet.phone = data.phone;
        if (data.role !== undefined)
            updateSet.role = data.role;
        if (data.defaultBranchId !== undefined)
            updateSet.defaultBranchId = data.defaultBranchId;
        if (data.isActive !== undefined)
            updateSet.isActive = data.isActive;
        if (data.passwordHash !== undefined)
            updateSet.passwordHash = data.passwordHash;
        if (data.pinHash !== undefined)
            updateSet.pinHash = data.pinHash;
        const [updated] = await tx
            .update(schema_1.users)
            .set(updateSet)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, staffId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
            .returning({
            id: schema_1.users.id,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            email: schema_1.users.email,
            phone: schema_1.users.phone,
            role: schema_1.users.role,
            isActive: schema_1.users.isActive,
            defaultBranchId: schema_1.users.defaultBranchId,
            updatedAt: schema_1.users.updatedAt,
        });
        // Replace branch memberships atomically when provided
        if (data.branchMemberships !== undefined) {
            const nextDefaultBranchId = data.defaultBranchId !== undefined ? data.defaultBranchId : existing.defaultBranchId;
            const membershipMap = new Map();
            if (nextDefaultBranchId) {
                membershipMap.set(nextDefaultBranchId, null);
            }
            for (const m of data.branchMemberships) {
                membershipMap.set(m.branchId, m.roleId ?? null);
            }
            await tx
                .delete(schema_1.userBranchMemberships)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.userId, staffId)));
            const rows = Array.from(membershipMap.entries()).map(([branchId, roleId]) => ({
                tenantId,
                userId: staffId,
                branchId,
                roleId,
                isActive: true,
            }));
            if (rows.length > 0) {
                await tx.insert(schema_1.userBranchMemberships).values(rows);
            }
        }
        const action = data.isActive !== undefined && data.isActive !== existing.isActive
            ? data.isActive
                ? 'STAFF_REACTIVATED'
                : 'STAFF_SUSPENDED'
            : 'STAFF_UPDATED';
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: updated.defaultBranchId ?? null,
            userId: actor.userId,
            action,
            module: 'STAFF',
            entityType: 'users',
            entityId: String(staffId),
            reason: data.reason ?? null,
            previousValues: {
                role: existing.role,
                isActive: existing.isActive,
                defaultBranchId: existing.defaultBranchId,
            },
            newValues: {
                role: updated.role,
                isActive: updated.isActive,
                defaultBranchId: updated.defaultBranchId,
                branchMembershipsUpdated: data.branchMemberships !== undefined,
            },
            ipAddress: actor.ipAddress ?? null,
        });
        return updated;
    });
};
exports.updateStaffTransaction = updateStaffTransaction;
const updateStaffPinTransaction = async (tenantId, staffId, pinHash, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [updated] = await tx
            .update(schema_1.users)
            .set({ pinHash, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, staffId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
            .returning({ id: schema_1.users.id, defaultBranchId: schema_1.users.defaultBranchId });
        if (!updated)
            return null;
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: updated.defaultBranchId ?? null,
            userId: actor.userId,
            action: 'STAFF_PIN_RESET',
            module: 'STAFF',
            entityType: 'users',
            entityId: String(staffId),
            ipAddress: actor.ipAddress ?? null,
        });
        return { id: updated.id };
    });
};
exports.updateStaffPinTransaction = updateStaffPinTransaction;
