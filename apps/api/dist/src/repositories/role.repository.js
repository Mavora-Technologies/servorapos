"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomRole = exports.updateCustomRole = exports.createCustomRole = exports.findRoleById = exports.listRolesWithMetrics = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const role_validator_1 = require("../validators/role.validator");
const listRolesWithMetrics = async (tenantId) => {
    // 1. Fetch accessible roles (tenant-specific or global system templates)
    const roleList = await db_1.db
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
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.roles.isSystemRole, true)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.roles.isSystemRole), schema_1.roles.name);
    // 2. Count active employees assigned to each role slug for this tenant
    const userHeadcounts = await db_1.db
        .select({
        role: schema_1.users.role,
        headcount: (0, drizzle_orm_1.sql) `count(${schema_1.users.id})::int`,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)))
        .groupBy(schema_1.users.role);
    const headcountMap = new Map();
    userHeadcounts.forEach((row) => {
        headcountMap.set(row.role, row.headcount);
    });
    const enrichedRoles = roleList.map((r) => ({
        ...r,
        assignedHeadcount: headcountMap.get(r.slug) || 0,
        permissionCount: r.permissions?.length || 0,
    }));
    return {
        roles: enrichedRoles,
        availablePermissions: role_validator_1.ENTERPRISE_PERMISSIONS_CATALOG,
    };
};
exports.listRolesWithMetrics = listRolesWithMetrics;
const findRoleById = async (tenantId, roleId) => {
    const [role] = await db_1.db
        .select()
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.id, roleId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.roles.isSystemRole, true))))
        .limit(1);
    return role || null;
};
exports.findRoleById = findRoleById;
const createCustomRole = async (tenantId, input) => {
    // Check for unique slug conflict within tenant scope
    const [existing] = await db_1.db
        .select({ id: schema_1.roles.id })
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.roles.slug, input.slug)))
        .limit(1);
    if (existing) {
        throw new Error(`Role slug '${input.slug}' already exists for your organization.`);
    }
    const [newRole] = await db_1.db
        .insert(schema_1.roles)
        .values({
        tenantId,
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        permissions: input.permissions,
        isSystemRole: false,
    })
        .returning();
    return newRole;
};
exports.createCustomRole = createCustomRole;
const updateCustomRole = async (tenantId, roleId, input) => {
    const [existing] = await db_1.db
        .select()
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.id, roleId), (0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId)))
        .limit(1);
    if (!existing) {
        throw new Error('Custom role not found or cannot be modified.');
    }
    if (existing.isSystemRole) {
        throw new Error('System-standard master templates cannot be altered.');
    }
    const [updated] = await db_1.db
        .update(schema_1.roles)
        .set({
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description : existing.description,
        permissions: input.permissions ?? existing.permissions,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.roles.id, roleId))
        .returning();
    return updated;
};
exports.updateCustomRole = updateCustomRole;
const deleteCustomRole = async (tenantId, roleId) => {
    const [role] = await db_1.db
        .select()
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.id, roleId), (0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId)))
        .limit(1);
    if (!role) {
        throw new Error('Role not found.');
    }
    if (role.isSystemRole) {
        throw new Error('System-standard roles cannot be deleted.');
    }
    // Ensure no active users are currently assigned to this role slug
    const [assignedUser] = await db_1.db
        .select({ id: schema_1.users.id })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.role, role.slug)))
        .limit(1);
    if (assignedUser) {
        throw new Error(`Cannot delete role '${role.name}'. Active staff members are still assigned to it.`);
    }
    await db_1.db.delete(schema_1.roles).where((0, drizzle_orm_1.eq)(schema_1.roles.id, roleId));
    return { success: true };
};
exports.deleteCustomRole = deleteCustomRole;
