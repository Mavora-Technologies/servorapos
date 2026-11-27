"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomRoleTransaction = exports.updateCustomRoleTransaction = exports.createCustomRoleTransaction = exports.findUserAuthorizedBranchIds = exports.resolveEffectivePermissions = exports.listRolesWithMetrics = void 0;
// apps/api/src/repositories/role.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const role_validator_1 = require("../validators/role.validator");
const listRolesWithMetrics = async (tenantId) => {
    const [roleList, userHeadcounts] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.roles.id,
            tenantId: schema_1.roles.tenantId,
            name: schema_1.roles.name,
            slug: schema_1.roles.slug,
            description: schema_1.roles.description,
            permissions: schema_1.roles.permissions,
            isSystemRole: schema_1.roles.isSystemRole,
            createdAt: schema_1.roles.createdAt,
            updatedAt: schema_1.roles.updatedAt,
        })
            .from(schema_1.roles)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.isSystemRole, true), (0, drizzle_orm_1.isNull)(schema_1.roles.tenantId))))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.roles.isSystemRole), schema_1.roles.name),
        db_1.db
            .select({
            role: schema_1.users.role,
            headcount: (0, drizzle_orm_1.sql) `count(${schema_1.users.id})::int`,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)))
            .groupBy(schema_1.users.role),
    ]);
    const headcountMap = new Map();
    userHeadcounts.forEach((row) => headcountMap.set(row.role, row.headcount));
    const enrichedRoles = roleList.map((r) => ({
        ...r,
        assignedHeadcount: headcountMap.get(r.slug) ?? 0,
        permissionCount: r.permissions?.length ?? 0,
    }));
    return {
        roles: enrichedRoles,
        availablePermissions: role_validator_1.ENTERPRISE_PERMISSIONS_CATALOG,
    };
};
exports.listRolesWithMetrics = listRolesWithMetrics;
const resolveEffectivePermissions = async (tenantId, userId, roleSlug, branchId) => {
    if (roleSlug === 'SUPER_ADMIN' || roleSlug === 'ADMIN') {
        return ['*'];
    }
    // 1. Check branch-specific role override if user has a membership for the active branch
    if (branchId) {
        const [membership] = await db_1.db
            .select({
            rolePermissions: schema_1.roles.permissions,
        })
            .from(schema_1.userBranchMemberships)
            .innerJoin(schema_1.roles, (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.roleId, schema_1.roles.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.branchId, branchId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true)))
            .limit(1);
        if (membership?.rolePermissions) {
            return membership.rolePermissions;
        }
    }
    // 2. Fall back to the user's primary tenant role slug (preferring tenant-scoped over system template)
    const matchedRoles = await db_1.db
        .select({
        tenantId: schema_1.roles.tenantId,
        permissions: schema_1.roles.permissions,
    })
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.slug, roleSlug), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId), (0, drizzle_orm_1.isNull)(schema_1.roles.tenantId))));
    const tenantRole = matchedRoles.find((r) => r.tenantId === tenantId) ?? matchedRoles[0];
    return tenantRole?.permissions ?? [];
};
exports.resolveEffectivePermissions = resolveEffectivePermissions;
const findUserAuthorizedBranchIds = async (tenantId, userId, roleSlug) => {
    if (roleSlug === 'SUPER_ADMIN' || roleSlug === 'ADMIN') {
        return 'ALL';
    }
    const memberships = await db_1.db
        .select({ branchId: schema_1.userBranchMemberships.branchId })
        .from(schema_1.userBranchMemberships)
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true)));
    if (memberships.length > 0) {
        return memberships.map((m) => m.branchId);
    }
    // Fallback to user's defaultBranchId if no explicit membership rows exist yet
    const [userRow] = await db_1.db
        .select({ defaultBranchId: schema_1.users.defaultBranchId })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, userId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
        .limit(1);
    return userRow?.defaultBranchId ? [userRow.defaultBranchId] : [];
};
exports.findUserAuthorizedBranchIds = findUserAuthorizedBranchIds;
const createCustomRoleTransaction = async (tenantId, input) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select({ id: schema_1.roles.id })
            .from(schema_1.roles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.roles.slug, input.slug)))
            .limit(1);
        if (existing) {
            throw new Error(`Role slug '${input.slug}' already exists for your organization.`);
        }
        const [newRole] = await tx
            .insert(schema_1.roles)
            .values({
            tenantId,
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            permissions: input.permissions,
            isSystemRole: false,
        })
            .returning();
        return newRole;
    });
};
exports.createCustomRoleTransaction = createCustomRoleTransaction;
const updateCustomRoleTransaction = async (tenantId, roleId, input) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.roles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.id, roleId), (0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            return null;
        }
        if (existing.isSystemRole) {
            throw new Error('System-standard master templates cannot be altered.');
        }
        const [updated] = await tx
            .update(schema_1.roles)
            .set({
            name: input.name ?? existing.name,
            description: input.description !== undefined ? input.description : existing.description,
            permissions: input.permissions ?? existing.permissions,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.id, roleId), (0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId)))
            .returning();
        return updated ?? null;
    });
};
exports.updateCustomRoleTransaction = updateCustomRoleTransaction;
const deleteCustomRoleTransaction = async (tenantId, roleId) => {
    return await db_1.db.transaction(async (tx) => {
        const [role] = await tx
            .select()
            .from(schema_1.roles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.id, roleId), (0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId)))
            .limit(1);
        if (!role) {
            return null;
        }
        if (role.isSystemRole) {
            throw new Error('System-standard roles cannot be deleted.');
        }
        const [assignedUser] = await tx
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.role, role.slug), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)))
            .limit(1);
        if (assignedUser) {
            throw new Error(`Cannot delete role '${role.name}': active staff members are still assigned to it.`);
        }
        await tx
            .delete(schema_1.roles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.id, roleId), (0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId)));
        return { id: role.id };
    });
};
exports.deleteCustomRoleTransaction = deleteCustomRoleTransaction;
