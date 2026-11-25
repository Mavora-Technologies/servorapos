// apps/api/src/repositories/cashier-assignment.repository.ts
import {
  eq,
  and,
  desc,
  asc,
  sql,
  gte,
  lte,
  inArray,
  or,
  isNull,
  type SQL,
} from 'drizzle-orm';
import { db } from '../config/db';
import {
  cashierAssignments,
  cashDrawers,
  cashierShifts,
  drawerSessions,
  users,
  branches,
  userBranchMemberships,
  tenantFinancialSettings,
  auditLogs,
  notifications,
} from '../config/schema';
import type {
  CreateCashierAssignmentInput,
  UpdateCashierAssignmentInput,
} from '../validators/cashier-assignment.validator';

export interface CustodyAuditActor {
  userId: number;
  ipAddress?: string | null;
}

export interface ScopedAssignmentFilters {
  startDate?: string;
  endDate?: string;
  effectiveBranchIds: number[] | null;
  status?: string;
  userId?: number;
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function assertEmployeeBranchClearance(
  tx: DbTransaction,
  tenantId: number,
  employee: { id: number; role: string; defaultBranchId: number | null },
  targetBranchId: number
): Promise<void> {
  if (employee.role === 'ADMIN' || employee.role === 'SUPER_ADMIN') {
    return;
  }

  const memberships = await tx
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
        eq(userBranchMemberships.userId, employee.id),
        eq(userBranchMemberships.isActive, true)
      )
    );

  const allowedIds =
    memberships.length > 0
      ? memberships.map((m) => m.branchId)
      : employee.defaultBranchId
        ? [employee.defaultBranchId]
        : [];

  if (!allowedIds.includes(targetBranchId)) {
    throw new Error(
      'Branch clearance violation: Selected cashier is not assigned to this outlet. Grant outlet clearance in the Employee Directory first.'
    );
  }
}

export const listCashierAssignments = async (
  tenantId: number,
  filters: ScopedAssignmentFilters
) => {
  const supervisorUsers = db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .as('supervisor_users');

  const conditions: SQL[] = [eq(cashierAssignments.tenantId, tenantId)];

  if (filters.effectiveBranchIds !== null) {
    if (filters.effectiveBranchIds.length === 0) return [];
    conditions.push(inArray(cashierAssignments.branchId, filters.effectiveBranchIds));
  }
  if (filters.userId) conditions.push(eq(cashierAssignments.userId, filters.userId));
  if (filters.status) conditions.push(eq(cashierAssignments.status, filters.status));
  if (filters.startDate) {
    conditions.push(gte(cashierAssignments.assignmentDate, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(cashierAssignments.assignmentDate, filters.endDate));
  }

  return await db
    .select({
      id: cashierAssignments.id,
      branchId: cashierAssignments.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      cashDrawerId: cashierAssignments.cashDrawerId,
      drawerName: cashDrawers.name,
      drawerCode: cashDrawers.drawerCode,
      drawerStatus: cashDrawers.status,
      userId: cashierAssignments.userId,
      cashierName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      cashierEmail: users.email,
      cashierRole: users.role,
      assignedByUserId: cashierAssignments.assignedByUserId,
      supervisorName: sql<string | null>`NULLIF(TRIM(CONCAT(${supervisorUsers.firstName}, ' ', ${supervisorUsers.lastName})), '')`,
      assignmentDate: cashierAssignments.assignmentDate,
      shiftType: cashierAssignments.shiftType,
      status: cashierAssignments.status,
      allocatedFloat: cashierAssignments.allocatedFloat,
      maxCashLimit: cashierAssignments.maxCashLimit,
      allowRefunds: cashierAssignments.allowRefunds,
      allowDrawerPop: cashierAssignments.allowDrawerPop,
      allowManualDiscount: cashierAssignments.allowManualDiscount,
      maxDiscountPercent: cashierAssignments.maxDiscountPercent,
      activatedAt: cashierAssignments.activatedAt,
      closedAt: cashierAssignments.closedAt,
      handoverNotes: cashierAssignments.handoverNotes,
      createdAt: cashierAssignments.createdAt,
    })
    .from(cashierAssignments)
    .innerJoin(
      branches,
      and(eq(cashierAssignments.branchId, branches.id), eq(branches.tenantId, tenantId))
    )
    .innerJoin(
      cashDrawers,
      and(eq(cashierAssignments.cashDrawerId, cashDrawers.id), eq(cashDrawers.tenantId, tenantId))
    )
    .innerJoin(
      users,
      and(eq(cashierAssignments.userId, users.id), eq(users.tenantId, tenantId))
    )
    .leftJoin(supervisorUsers, eq(cashierAssignments.assignedByUserId, supervisorUsers.id))
    .where(and(...conditions))
    .orderBy(desc(cashierAssignments.assignmentDate), desc(cashierAssignments.id))
    .limit(250);
};

export const findAssignmentById = async (tenantId: number, assignmentId: number) => {
  const [row] = await db
    .select()
    .from(cashierAssignments)
    .where(
      and(eq(cashierAssignments.id, assignmentId), eq(cashierAssignments.tenantId, tenantId))
    )
    .limit(1);

  return row ?? null;
};

export const getAssignmentContext = async (
  tenantId: number,
  authorizedBranchIds: number[] | null,
  effectiveBranchIds: number[] | null
) => {
  const branchConditions: SQL[] = [eq(branches.tenantId, tenantId), eq(branches.isActive, true)];
  if (authorizedBranchIds !== null) {
    if (authorizedBranchIds.length === 0) branchConditions.push(sql`FALSE`);
    else branchConditions.push(inArray(branches.id, authorizedBranchIds));
  }

  const drawerConditions: SQL[] = [eq(cashDrawers.tenantId, tenantId)];
  if (effectiveBranchIds !== null) {
    if (effectiveBranchIds.length === 0) {
      drawerConditions.push(isNull(cashDrawers.branchId));
    } else {
      const drawerScope = or(
        inArray(cashDrawers.branchId, effectiveBranchIds),
        isNull(cashDrawers.branchId)
      );
      if (drawerScope) drawerConditions.push(drawerScope);
    }
  }

  const staffConditions: SQL[] = [eq(users.tenantId, tenantId), eq(users.isActive, true)];
  if (effectiveBranchIds !== null) {
    if (effectiveBranchIds.length === 0) {
      staffConditions.push(sql`FALSE`);
    } else {
      const memberSubquery = db
        .select({ userId: userBranchMemberships.userId })
        .from(userBranchMemberships)
        .where(
          and(
            eq(userBranchMemberships.tenantId, tenantId),
            eq(userBranchMemberships.isActive, true),
            inArray(userBranchMemberships.branchId, effectiveBranchIds)
          )
        );
      const staffScope = or(
        inArray(users.role, ['ADMIN', 'SUPER_ADMIN']),
        inArray(users.defaultBranchId, effectiveBranchIds),
        inArray(users.id, memberSubquery)
      );
      if (staffScope) staffConditions.push(staffScope);
    }
  }

  const [branchList, activeDrawers, activeStaff, activeMemberships, [finSettings]] =
    await Promise.all([
      db
        .select({
          id: branches.id,
          name: branches.name,
          code: branches.code,
          isMainBranch: branches.isMainBranch,
        })
        .from(branches)
        .where(and(...branchConditions))
        .orderBy(desc(branches.isMainBranch), asc(branches.name)),

      db
        .select({
          id: cashDrawers.id,
          drawerCode: cashDrawers.drawerCode,
          name: cashDrawers.name,
          branchId: cashDrawers.branchId,
          status: cashDrawers.status,
        })
        .from(cashDrawers)
        .where(and(...drawerConditions))
        .orderBy(asc(cashDrawers.drawerCode)),

      db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          defaultBranchId: users.defaultBranchId,
        })
        .from(users)
        .where(and(...staffConditions))
        .orderBy(asc(users.firstName), asc(users.lastName)),

      db
        .select({
          userId: userBranchMemberships.userId,
          branchId: userBranchMemberships.branchId,
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
        .where(
          and(
            eq(userBranchMemberships.tenantId, tenantId),
            eq(userBranchMemberships.isActive, true)
          )
        ),

      db
        .select({
          baseCurrency: tenantFinancialSettings.baseCurrency,
          maxDrawerCashThreshold: tenantFinancialSettings.maxDrawerCashThreshold,
        })
        .from(tenantFinancialSettings)
        .where(eq(tenantFinancialSettings.tenantId, tenantId))
        .limit(1),
    ]);

  const membershipMap = new Map<number, number[]>();
  for (const m of activeMemberships) {
    const arr = membershipMap.get(m.userId) ?? [];
    arr.push(m.branchId);
    membershipMap.set(m.userId, arr);
  }

  const allBranchIds = branchList.map((b) => b.id);

  return {
    branches: branchList,
    drawers: activeDrawers,
    staff: activeStaff.map((s) => {
      const mems = membershipMap.get(s.id) ?? [];
      const assignedBranchIds =
        s.role === 'ADMIN' || s.role === 'SUPER_ADMIN'
          ? allBranchIds
          : mems.length > 0
            ? mems
            : s.defaultBranchId
              ? [s.defaultBranchId]
              : [];
      return { ...s, assignedBranchIds };
    }),
    treasuryPolicy: {
      currency: finSettings?.baseCurrency ?? 'KES',
      maxDrawerCashThreshold: parseFloat(finSettings?.maxDrawerCashThreshold ?? '50000.00') || 50000,
    },
  };
};

export const assignCashierTransaction = async (
  tenantId: number,
  supervisorId: number,
  input: CreateCashierAssignmentInput,
  actor: CustodyAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [[branchRow], [drawerRow], [cashierRow]] = await Promise.all([
      tx
        .select({ id: branches.id })
        .from(branches)
        .where(
          and(
            eq(branches.id, input.branchId),
            eq(branches.tenantId, tenantId),
            eq(branches.isActive, true)
          )
        )
        .limit(1),
      tx
        .select({ id: cashDrawers.id, branchId: cashDrawers.branchId, name: cashDrawers.name })
        .from(cashDrawers)
        .where(
          and(
            eq(cashDrawers.id, input.cashDrawerId),
            eq(cashDrawers.tenantId, tenantId),
            or(eq(cashDrawers.branchId, input.branchId), isNull(cashDrawers.branchId))
          )
        )
        .limit(1),
      tx
        .select({
          id: users.id,
          role: users.role,
          defaultBranchId: users.defaultBranchId,
          isActive: users.isActive,
        })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.tenantId, tenantId)))
        .limit(1),
    ]);

    if (!branchRow) throw new Error('Selected branch does not exist or is inactive.');
    if (!drawerRow) {
      throw new Error('Selected cash drawer does not belong to the chosen operating branch.');
    }
    if (!cashierRow || !cashierRow.isActive) {
      throw new Error('Selected cashier account is inactive or not found.');
    }

    await assertEmployeeBranchClearance(tx, tenantId, cashierRow, input.branchId);

    const [existingActiveDrawer] = await tx
      .select({ id: cashierAssignments.id })
      .from(cashierAssignments)
      .where(
        and(
          eq(cashierAssignments.tenantId, tenantId),
          eq(cashierAssignments.cashDrawerId, input.cashDrawerId),
          eq(cashierAssignments.assignmentDate, input.assignmentDate),
          eq(cashierAssignments.shiftType, input.shiftType),
          inArray(cashierAssignments.status, ['ASSIGNED', 'ACTIVE'])
        )
      )
      .limit(1);

    if (existingActiveDrawer) {
      throw new Error(
        `Register Conflict: "${drawerRow.name}" is already assigned to a custodian for this shift.`
      );
    }

    const [existingCashierShift] = await tx
      .select({ id: cashierAssignments.id })
      .from(cashierAssignments)
      .where(
        and(
          eq(cashierAssignments.tenantId, tenantId),
          eq(cashierAssignments.userId, input.userId),
          eq(cashierAssignments.assignmentDate, input.assignmentDate),
          eq(cashierAssignments.shiftType, input.shiftType),
          inArray(cashierAssignments.status, ['ASSIGNED', 'ACTIVE'])
        )
      )
      .limit(1);

    if (existingCashierShift) {
      throw new Error(
        'Custodian Overlap: This cashier already holds an active drawer custody assignment for this shift.'
      );
    }

    const [assignment] = await tx
      .insert(cashierAssignments)
      .values({
        tenantId,
        branchId: input.branchId,
        cashDrawerId: input.cashDrawerId,
        userId: input.userId,
        assignedByUserId: supervisorId,
        assignmentDate: input.assignmentDate,
        shiftType: input.shiftType,
        status: 'ASSIGNED',
        allocatedFloat: input.allocatedFloat.toFixed(2),
        maxCashLimit: input.maxCashLimit.toFixed(2),
        allowRefunds: input.allowRefunds,
        allowDrawerPop: input.allowDrawerPop,
        allowManualDiscount: input.allowManualDiscount,
        maxDiscountPercent: input.allowManualDiscount ? input.maxDiscountPercent : 0,
        handoverNotes: input.handoverNotes ?? null,
      })
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: assignment.branchId,
      userId: actor.userId,
      action: 'CASHIER_CUSTODY_ASSIGNED',
      module: 'WORKFORCE_HCM',
      entityType: 'cashier_assignments',
      entityId: String(assignment.id),
      newValues: {
        cashierId: assignment.userId,
        cashDrawerId: assignment.cashDrawerId,
        shiftType: assignment.shiftType,
        allocatedFloat: assignment.allocatedFloat,
        allowRefunds: assignment.allowRefunds,
      },
      ipAddress: actor.ipAddress ?? null,
    });

    return assignment;
  });
};

export const updateAssignmentTransaction = async (
  tenantId: number,
  assignmentId: number,
  input: UpdateCashierAssignmentInput,
  actor: CustodyAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(cashierAssignments)
      .where(
        and(eq(cashierAssignments.id, assignmentId), eq(cashierAssignments.tenantId, tenantId))
      )
      .limit(1);

    if (!existing) return null;

    if (existing.status === 'REVOKED') {
      throw new Error('Revoked custody assignments cannot be modified.');
    }

    // 1. Activating custody syncs live POS shift + cash drawer session
    if (input.status === 'ACTIVE' && existing.status === 'ASSIGNED') {
      const [drawer] = await tx
        .select()
        .from(cashDrawers)
        .where(
          and(eq(cashDrawers.id, existing.cashDrawerId), eq(cashDrawers.tenantId, tenantId))
        )
        .limit(1);

      if (!drawer) throw new Error('Linked physical cash drawer no longer exists.');
      if (drawer.status === 'OPEN') {
        throw new Error(
          `Cash drawer "${drawer.name}" is already OPEN under another active shift. Close it first.`
        );
      }

      const [existingOpenShift] = await tx
        .select({ id: cashierShifts.id })
        .from(cashierShifts)
        .where(
          and(
            eq(cashierShifts.tenantId, tenantId),
            eq(cashierShifts.cashierId, existing.userId),
            eq(cashierShifts.status, 'OPEN')
          )
        )
        .limit(1);

      const floatNum =
        input.allocatedFloat !== undefined
          ? input.allocatedFloat
          : parseFloat(existing.allocatedFloat) || 0;

      if (!existingOpenShift) {
        await tx.insert(cashierShifts).values({
          tenantId,
          branchId: existing.branchId,
          cashierId: existing.userId,
          openingFloat: floatNum.toFixed(2),
          expectedCash: floatNum.toFixed(2),
          status: 'OPEN',
          varianceNotes: `[${existing.shiftType}] Activated via Cashier Custody #${existing.id}`,
        });
      }

      await tx.insert(drawerSessions).values({
        tenantId,
        drawerId: drawer.id,
        cashierId: existing.userId,
        supervisorId: actor.userId !== existing.userId ? actor.userId : null,
        status: 'ACTIVE',
        openingFloat: floatNum.toFixed(4),
        expectedClosingBalance: floatNum.toFixed(4),
        notes: existing.handoverNotes || `Activated from Custody Assignment #${existing.id}`,
      });

      await tx
        .update(cashDrawers)
        .set({
          status: 'OPEN',
          currentBalance: floatNum.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(cashDrawers.id, drawer.id));
    }

    // 2. Fiduciary guard on RELEASED: prevent releasing custody while an OPEN shift hasn't been counted/closed
    if (input.status === 'RELEASED' && existing.status === 'ACTIVE') {
      const [openShift] = await tx
        .select({ id: cashierShifts.id })
        .from(cashierShifts)
        .where(
          and(
            eq(cashierShifts.tenantId, tenantId),
            eq(cashierShifts.cashierId, existing.userId),
            eq(cashierShifts.status, 'OPEN')
          )
        )
        .limit(1);

      if (openShift) {
        throw new Error(
          `Cannot release custody while Cashier Shift #${openShift.id} is still OPEN. Reconcile and close the till under Cash Management → Cashier Till first.`
        );
      }
    }

    const updateSet: Partial<typeof cashierAssignments.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.status) {
      updateSet.status = input.status;
      if (input.status === 'ACTIVE' && !existing.activatedAt) {
        updateSet.activatedAt = new Date();
      }
      if ((input.status === 'RELEASED' || input.status === 'REVOKED') && !existing.closedAt) {
        updateSet.closedAt = new Date();
      }
    }

    if (input.allocatedFloat !== undefined) {
      updateSet.allocatedFloat = input.allocatedFloat.toFixed(2);
    }
    if (input.maxCashLimit !== undefined) {
      updateSet.maxCashLimit = input.maxCashLimit.toFixed(2);
    }
    if (input.allowRefunds !== undefined) updateSet.allowRefunds = input.allowRefunds;
    if (input.allowDrawerPop !== undefined) updateSet.allowDrawerPop = input.allowDrawerPop;
    if (input.allowManualDiscount !== undefined) {
      updateSet.allowManualDiscount = input.allowManualDiscount;
    }
    if (input.maxDiscountPercent !== undefined) {
      updateSet.maxDiscountPercent = input.maxDiscountPercent;
    }
    if (input.handoverNotes !== undefined) updateSet.handoverNotes = input.handoverNotes;

    const [updated] = await tx
      .update(cashierAssignments)
      .set(updateSet)
      .where(
        and(eq(cashierAssignments.id, assignmentId), eq(cashierAssignments.tenantId, tenantId))
      )
      .returning();

    const action =
      input.status === 'ACTIVE'
        ? 'CASHIER_CUSTODY_ACTIVATED'
        : input.status === 'RELEASED'
          ? 'CASHIER_CUSTODY_RELEASED'
          : 'CASHIER_CUSTODY_UPDATED';

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: updated.branchId,
      userId: actor.userId,
      action,
      module: 'WORKFORCE_HCM',
      entityType: 'cashier_assignments',
      entityId: String(updated.id),
      previousValues: { status: existing.status, allocatedFloat: existing.allocatedFloat },
      newValues: { status: updated.status, allocatedFloat: updated.allocatedFloat },
      ipAddress: actor.ipAddress ?? null,
    });

    return updated;
  });
};

export const revokeAssignmentTransaction = async (
  tenantId: number,
  assignmentId: number,
  reason: string,
  actor: CustodyAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(cashierAssignments)
      .where(
        and(eq(cashierAssignments.id, assignmentId), eq(cashierAssignments.tenantId, tenantId))
      )
      .limit(1);

    if (!existing) return null;

    if (existing.status === 'REVOKED' || existing.status === 'RELEASED') {
      throw new Error('This custody assignment is already closed.');
    }

    const noteAddition = existing.handoverNotes
      ? `${existing.handoverNotes} | [REVOKED]: ${reason}`
      : `[REVOKED]: ${reason}`;

    const [revoked] = await tx
      .update(cashierAssignments)
      .set({
        status: 'REVOKED',
        closedAt: new Date(),
        handoverNotes: noteAddition,
        updatedAt: new Date(),
      })
      .where(
        and(eq(cashierAssignments.id, assignmentId), eq(cashierAssignments.tenantId, tenantId))
      )
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: revoked.branchId,
      userId: actor.userId,
      action: 'CASHIER_CUSTODY_REVOKED',
      module: 'WORKFORCE_HCM',
      entityType: 'cashier_assignments',
      entityId: String(revoked.id),
      reason,
      previousValues: { status: existing.status },
      newValues: { status: 'REVOKED' },
      ipAddress: actor.ipAddress ?? null,
    });

    await tx.insert(notifications).values({
      tenantId,
      branchId: revoked.branchId,
      title: `Emergency Cash Drawer Custody Revoked (#${revoked.id})`,
      detail: `Cashier custody for drawer #${revoked.cashDrawerId} was revoked. Reason: ${reason}. Perform an immediate blind till count under Cashier Shifts.`,
      severity: 'CRITICAL',
      module: 'FINANCE',
      category: 'COMPLIANCE_AUDIT',
      entityType: 'cashier_assignments',
      entityId: String(revoked.id),
      actionUrl: '/cash-management/shifts',
      isRead: false,
      isResolved: false,
    });

    return revoked;
  });
};