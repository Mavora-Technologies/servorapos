import { eq, and, desc, sql, or } from 'drizzle-orm';
import { db } from '../config/db';
import { roles, users } from '../config/schema';
import { CreateRoleInput, UpdateRoleInput, ENTERPRISE_PERMISSIONS_CATALOG } from '../validators/role.validator';

export const listRolesWithMetrics = async (tenantId: number) => {
  // 1. Fetch accessible roles (tenant-specific or global system templates)
  const roleList = await db
    .select({
      id: roles.id,
      tenantId: roles.tenantId,
      name: roles.name,
      slug: roles.slug,
      description: roles.description,
      permissions: roles.permissions,
      isSystemRole: roles.isSystemRole,
      createdAt: roles.createdAt,
      updatedAt: roles.updatedAt,
    })
    .from(roles)
    .where(or(eq(roles.tenantId, tenantId), eq(roles.isSystemRole, true)))
    .orderBy(desc(roles.isSystemRole), roles.name);

  // 2. Count active employees assigned to each role slug for this tenant
  const userHeadcounts = await db
    .select({
      role: users.role,
      headcount: sql<number>`count(${users.id})::int`,
    })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
    .groupBy(users.role);

  const headcountMap = new Map<string, number>();
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
    availablePermissions: ENTERPRISE_PERMISSIONS_CATALOG,
  };
};

export const findRoleById = async (tenantId: number, roleId: number) => {
  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, roleId), or(eq(roles.tenantId, tenantId), eq(roles.isSystemRole, true))))
    .limit(1);

  return role || null;
};

export const createCustomRole = async (tenantId: number, input: CreateRoleInput) => {
  // Check for unique slug conflict within tenant scope
  const [existing] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.slug, input.slug)))
    .limit(1);

  if (existing) {
    throw new Error(`Role slug '${input.slug}' already exists for your organization.`);
  }

  const [newRole] = await db
    .insert(roles)
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

export const updateCustomRole = async (
  tenantId: number,
  roleId: number,
  input: UpdateRoleInput
) => {
  const [existing] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    throw new Error('Custom role not found or cannot be modified.');
  }

  if (existing.isSystemRole) {
    throw new Error('System-standard master templates cannot be altered.');
  }

  const [updated] = await db
    .update(roles)
    .set({
      name: input.name ?? existing.name,
      description: input.description !== undefined ? input.description : existing.description,
      permissions: input.permissions ?? existing.permissions,
      updatedAt: new Date(),
    })
    .where(eq(roles.id, roleId))
    .returning();

  return updated;
};

export const deleteCustomRole = async (tenantId: number, roleId: number) => {
  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)))
    .limit(1);

  if (!role) {
    throw new Error('Role not found.');
  }

  if (role.isSystemRole) {
    throw new Error('System-standard roles cannot be deleted.');
  }

  // Ensure no active users are currently assigned to this role slug
  const [assignedUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, role.slug as any)))
    .limit(1);

  if (assignedUser) {
    throw new Error(`Cannot delete role '${role.name}'. Active staff members are still assigned to it.`);
  }

  await db.delete(roles).where(eq(roles.id, roleId));
  return { success: true };
};