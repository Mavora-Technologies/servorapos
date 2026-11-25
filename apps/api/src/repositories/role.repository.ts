// apps/api/src/repositories/role.repository.ts
import { eq, and, desc, sql, or, isNull } from 'drizzle-orm';
import { db } from '../config/db';
import { roles, users, userBranchMemberships, branches } from '../config/schema';
import {
  CreateRoleInput,
  UpdateRoleInput,
  ENTERPRISE_PERMISSIONS_CATALOG,
} from '../validators/role.validator';

export const listRolesWithMetrics = async (tenantId: number) => {
  const [roleList, userHeadcounts] = await Promise.all([
    db
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
      .where(or(eq(roles.tenantId, tenantId), and(eq(roles.isSystemRole, true), isNull(roles.tenantId))))
      .orderBy(desc(roles.isSystemRole), roles.name),

    db
      .select({
        role: users.role,
        headcount: sql<number>`count(${users.id})::int`,
      })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
      .groupBy(users.role),
  ]);

  const headcountMap = new Map<string, number>();
  userHeadcounts.forEach((row) => headcountMap.set(row.role, row.headcount));

  const enrichedRoles = roleList.map((r) => ({
    ...r,
    assignedHeadcount: headcountMap.get(r.slug) ?? 0,
    permissionCount: r.permissions?.length ?? 0,
  }));

  return {
    roles: enrichedRoles,
    availablePermissions: ENTERPRISE_PERMISSIONS_CATALOG,
  };
};

export const resolveEffectivePermissions = async (
  tenantId: number,
  userId: number,
  roleSlug: string,
  branchId?: number | null
): Promise<string[]> => {
  if (roleSlug === 'SUPER_ADMIN' || roleSlug === 'ADMIN') {
    return ['*'];
  }

  // 1. Check branch-specific role override if user has a membership for the active branch
  if (branchId) {
    const [membership] = await db
      .select({
        rolePermissions: roles.permissions,
      })
      .from(userBranchMemberships)
      .innerJoin(roles, eq(userBranchMemberships.roleId, roles.id))
      .where(
        and(
          eq(userBranchMemberships.tenantId, tenantId),
          eq(userBranchMemberships.userId, userId),
          eq(userBranchMemberships.branchId, branchId),
          eq(userBranchMemberships.isActive, true)
        )
      )
      .limit(1);

    if (membership?.rolePermissions) {
      return membership.rolePermissions;
    }
  }

  // 2. Fall back to the user's primary tenant role slug (preferring tenant-scoped over system template)
  const matchedRoles = await db
    .select({
      tenantId: roles.tenantId,
      permissions: roles.permissions,
    })
    .from(roles)
    .where(
      and(
        eq(roles.slug, roleSlug),
        or(eq(roles.tenantId, tenantId), isNull(roles.tenantId))
      )
    );

  const tenantRole = matchedRoles.find((r) => r.tenantId === tenantId) ?? matchedRoles[0];
  return tenantRole?.permissions ?? [];
};

export const findUserAuthorizedBranchIds = async (
  tenantId: number,
  userId: number,
  roleSlug: string
): Promise<number[] | 'ALL'> => {
  if (roleSlug === 'SUPER_ADMIN' || roleSlug === 'ADMIN') {
    return 'ALL';
  }

  const memberships = await db
    .select({ branchId: userBranchMemberships.branchId })
    .from(userBranchMemberships)
    .innerJoin(
      branches,
      and(
        eq(userBranchMemberships.branchId, branches.id),
        eq(branches.tenantId, tenantId),
        eq(branches.isActive, true)
      )
    )
    .where(
      and(
        eq(userBranchMemberships.tenantId, tenantId),
        eq(userBranchMemberships.userId, userId),
        eq(userBranchMemberships.isActive, true)
      )
    );

  if (memberships.length > 0) {
    return memberships.map((m) => m.branchId);
  }

  // Fallback to user's defaultBranchId if no explicit membership rows exist yet
  const [userRow] = await db
    .select({ defaultBranchId: users.defaultBranchId })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
    .limit(1);

  return userRow?.defaultBranchId ? [userRow.defaultBranchId] : [];
};

export const createCustomRoleTransaction = async (
  tenantId: number,
  input: CreateRoleInput
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.slug, input.slug)))
      .limit(1);

    if (existing) {
      throw new Error(`Role slug '${input.slug}' already exists for your organization.`);
    }

    const [newRole] = await tx
      .insert(roles)
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

export const updateCustomRoleTransaction = async (
  tenantId: number,
  roleId: number,
  input: UpdateRoleInput
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return null;
    }
    if (existing.isSystemRole) {
      throw new Error('System-standard master templates cannot be altered.');
    }

    const [updated] = await tx
      .update(roles)
      .set({
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description : existing.description,
        permissions: input.permissions ?? existing.permissions,
        updatedAt: new Date(),
      })
      .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)))
      .returning();

    return updated ?? null;
  });
};

export const deleteCustomRoleTransaction = async (tenantId: number, roleId: number) => {
  return await db.transaction(async (tx) => {
    const [role] = await tx
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)))
      .limit(1);

    if (!role) {
      return null;
    }
    if (role.isSystemRole) {
      throw new Error('System-standard roles cannot be deleted.');
    }

    const [assignedUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.role, role.slug),
          eq(users.isActive, true)
        )
      )
      .limit(1);

    if (assignedUser) {
      throw new Error(
        `Cannot delete role '${role.name}': active staff members are still assigned to it.`
      );
    }

    await tx
      .delete(roles)
      .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)));

    return { id: role.id };
  });
};