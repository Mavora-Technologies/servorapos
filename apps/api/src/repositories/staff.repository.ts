// apps/api/src/repositories/staff.repository.ts
import { eq, and, desc, asc, sql, ilike, or, inArray, isNull, type SQL } from 'drizzle-orm';
import { db } from '../config/db';
import {
  users,
  branches,
  roles,
  userBranchMemberships,
  attendanceRecords,
  auditLogs,
} from '../config/schema';
import type { BranchMembershipInput, ListStaffQuery } from '../validators/staff.validator';

export interface StaffAuditActor {
  userId: number;
  ipAddress?: string | null;
}

export const listStaffByTenant = async (
  tenantId: number,
  filters: ListStaffQuery,
  authorizedBranchIds: number[] | null // null = all tenant branches
) => {
  const conditions: SQL[] = [eq(users.tenantId, tenantId)];

  if (filters.role) {
    conditions.push(eq(users.role, filters.role));
  }
  if (filters.isActive !== undefined) {
    conditions.push(eq(users.isActive, filters.isActive));
  }
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    const searchClause = or(
      ilike(users.firstName, pattern),
      ilike(users.lastName, pattern),
      ilike(users.email, pattern),
      ilike(users.phone, pattern)
    );
    if (searchClause) conditions.push(searchClause);
  }

  // Enforce branch scope: match either defaultBranchId OR an active user_branch_memberships row
  const effectiveBranchFilter = filters.branchId
    ? [filters.branchId]
    : authorizedBranchIds;

  if (effectiveBranchFilter !== null) {
    if (effectiveBranchFilter.length === 0) {
      conditions.push(sql`FALSE`);
    } else {
      const membershipSubquery = db
        .select({ userId: userBranchMemberships.userId })
        .from(userBranchMemberships)
        .where(
          and(
            eq(userBranchMemberships.tenantId, tenantId),
            eq(userBranchMemberships.isActive, true),
            inArray(userBranchMemberships.branchId, effectiveBranchFilter)
          )
        );

      const branchClause = or(
        inArray(users.defaultBranchId, effectiveBranchFilter),
        inArray(users.id, membershipSubquery)
      );
      if (branchClause) conditions.push(branchClause);
    }
  }

  const [staffRows, membershipsRows, onDutyRows, tenantRoles, branchList] = await Promise.all([
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        hasPin: sql<boolean>`CASE WHEN ${users.pinHash} IS NOT NULL THEN true ELSE false END`,
        defaultBranchId: users.defaultBranchId,
        branchName: branches.name,
        branchCode: branches.code,
      })
      .from(users)
      .leftJoin(
        branches,
        and(eq(users.defaultBranchId, branches.id), eq(branches.tenantId, tenantId))
      )
      .where(and(...conditions))
      .orderBy(desc(users.createdAt)),

    db
      .select({
        userId: userBranchMemberships.userId,
        branchId: userBranchMemberships.branchId,
        branchName: branches.name,
        branchCode: branches.code,
        roleId: userBranchMemberships.roleId,
        roleName: roles.name,
        roleSlug: roles.slug,
      })
      .from(userBranchMemberships)
      .innerJoin(
        branches,
        and(
          eq(userBranchMemberships.branchId, branches.id),
          eq(branches.tenantId, tenantId),
          eq(branches.isActive, true)
        )
      )
      .leftJoin(roles, eq(userBranchMemberships.roleId, roles.id))
      .where(
        and(
          eq(userBranchMemberships.tenantId, tenantId),
          eq(userBranchMemberships.isActive, true)
        )
      ),

    db
      .select({
        userId: attendanceRecords.userId,
        branchId: attendanceRecords.branchId,
        clockInAt: attendanceRecords.clockInAt,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.status, 'ON_DUTY')
        )
      ),

    db
      .select({
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
        permissions: roles.permissions,
        isSystemRole: roles.isSystemRole,
      })
      .from(roles)
      .where(
        or(eq(roles.tenantId, tenantId), and(eq(roles.isSystemRole, true), isNull(roles.tenantId)))
      )
      .orderBy(desc(roles.isSystemRole), asc(roles.name)),

    db
      .select({
        id: branches.id,
        name: branches.name,
        code: branches.code,
        isMainBranch: branches.isMainBranch,
      })
      .from(branches)
      .where(
        and(
          eq(branches.tenantId, tenantId),
          eq(branches.isActive, true),
          authorizedBranchIds !== null
            ? authorizedBranchIds.length > 0
              ? inArray(branches.id, authorizedBranchIds)
              : sql`FALSE`
            : undefined
        )
      )
      .orderBy(desc(branches.isMainBranch), asc(branches.name)),
  ]);

  const membershipMap = new Map<
    number,
    Array<{
      branchId: number;
      branchName: string;
      branchCode: string;
      roleId: number | null;
      roleName: string | null;
      roleSlug: string | null;
    }>
  >();

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

  const onDutyMap = new Map<number, { branchId: number; clockInAt: Date }>();
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

export const findStaffById = async (tenantId: number, staffId: number) => {
  const [staff] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      defaultBranchId: users.defaultBranchId,
    })
    .from(users)
    .where(and(eq(users.id, staffId), eq(users.tenantId, tenantId)))
    .limit(1);

  return staff ?? null;
};

export const verifyTenantBranchesExist = async (
  tenantId: number,
  branchIds: number[]
): Promise<boolean> => {
  const uniqueIds = Array.from(new Set(branchIds));
  if (uniqueIds.length === 0) return true;

  const found = await db
    .select({ id: branches.id })
    .from(branches)
    .where(
      and(
        eq(branches.tenantId, tenantId),
        eq(branches.isActive, true),
        inArray(branches.id, uniqueIds)
      )
    );

  return found.length === uniqueIds.length;
};

export const verifyTenantRoleSlugExists = async (
  tenantId: number,
  roleSlug: string
): Promise<boolean> => {
  const [found] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.slug, roleSlug),
        or(eq(roles.tenantId, tenantId), and(eq(roles.isSystemRole, true), isNull(roles.tenantId)))
      )
    )
    .limit(1);

  return Boolean(found);
};

export const createStaffTransaction = async (
  tenantId: number,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    role: string;
    defaultBranchId: number;
    passwordHash: string;
    pinHash: string | null;
    branchMemberships: BranchMembershipInput[];
  },
  actor: StaffAuditActor
) => {
  return await db.transaction(async (tx) => {
    // Tenant-scoped email uniqueness check (matches users_tenant_email_idx)
    const [existing] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.email, data.email)))
      .limit(1);

    if (existing) {
      throw new Error(`An employee account with email '${data.email}' already exists.`);
    }

    const [newUser] = await tx
      .insert(users)
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
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        defaultBranchId: users.defaultBranchId,
        createdAt: users.createdAt,
      });

    // Always ensure the employee has an active membership for their defaultBranchId
    const membershipMap = new Map<number, number | null>();
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
      await tx.insert(userBranchMemberships).values(membershipRows);
    }

    await tx.insert(auditLogs).values({
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

export const updateStaffTransaction = async (
  tenantId: number,
  staffId: number,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string | null;
    role?: string;
    defaultBranchId?: number | null;
    isActive?: boolean;
    passwordHash?: string;
    pinHash?: string | null;
    branchMemberships?: BranchMembershipInput[];
    reason?: string;
  },
  actor: StaffAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        defaultBranchId: users.defaultBranchId,
      })
      .from(users)
      .where(and(eq(users.id, staffId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return null;
    }

    if (data.email && data.email !== existing.email) {
      const [collision] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.email, data.email)))
        .limit(1);

      if (collision) {
        throw new Error(`Email address '${data.email}' is already assigned to another employee.`);
      }
    }

    const updateSet: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.firstName !== undefined) updateSet.firstName = data.firstName;
    if (data.lastName !== undefined) updateSet.lastName = data.lastName;
    if (data.email !== undefined) updateSet.email = data.email;
    if (data.phone !== undefined) updateSet.phone = data.phone;
    if (data.role !== undefined) updateSet.role = data.role;
    if (data.defaultBranchId !== undefined) updateSet.defaultBranchId = data.defaultBranchId;
    if (data.isActive !== undefined) updateSet.isActive = data.isActive;
    if (data.passwordHash !== undefined) updateSet.passwordHash = data.passwordHash;
    if (data.pinHash !== undefined) updateSet.pinHash = data.pinHash;

    const [updated] = await tx
      .update(users)
      .set(updateSet)
      .where(and(eq(users.id, staffId), eq(users.tenantId, tenantId)))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        defaultBranchId: users.defaultBranchId,
        updatedAt: users.updatedAt,
      });

    // Replace branch memberships atomically when provided
    if (data.branchMemberships !== undefined) {
      const nextDefaultBranchId =
        data.defaultBranchId !== undefined ? data.defaultBranchId : existing.defaultBranchId;

      const membershipMap = new Map<number, number | null>();
      if (nextDefaultBranchId) {
        membershipMap.set(nextDefaultBranchId, null);
      }
      for (const m of data.branchMemberships) {
        membershipMap.set(m.branchId, m.roleId ?? null);
      }

      await tx
        .delete(userBranchMemberships)
        .where(
          and(
            eq(userBranchMemberships.tenantId, tenantId),
            eq(userBranchMemberships.userId, staffId)
          )
        );

      const rows = Array.from(membershipMap.entries()).map(([branchId, roleId]) => ({
        tenantId,
        userId: staffId,
        branchId,
        roleId,
        isActive: true,
      }));

      if (rows.length > 0) {
        await tx.insert(userBranchMemberships).values(rows);
      }
    }

    const action =
      data.isActive !== undefined && data.isActive !== existing.isActive
        ? data.isActive
          ? 'STAFF_REACTIVATED'
          : 'STAFF_SUSPENDED'
        : 'STAFF_UPDATED';

    await tx.insert(auditLogs).values({
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

export const updateStaffPinTransaction = async (
  tenantId: number,
  staffId: number,
  pinHash: string,
  actor: StaffAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({ pinHash, updatedAt: new Date() })
      .where(and(eq(users.id, staffId), eq(users.tenantId, tenantId)))
      .returning({ id: users.id, defaultBranchId: users.defaultBranchId });

    if (!updated) return null;

    await tx.insert(auditLogs).values({
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