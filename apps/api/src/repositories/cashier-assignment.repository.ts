import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { db } from '../config/db';
import {
  cashierAssignments,
  cashDrawers,
  users,
  branches,
} from '../config/schema';
import {
  CreateCashierAssignmentInput,
  UpdateCashierAssignmentInput,
} from '../validators/cashier-assignment.validator';

export interface CashierAssignmentFilters {
  startDate?: string;
  endDate?: string;
  branchId?: number;
  status?: string;
  userId?: number;
}

export const listCashierAssignments = async (
  tenantId: number,
  filters: CashierAssignmentFilters
) => {
  const supervisorUsers = db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .as('supervisor_users');

  const conditions = [
    eq(cashierAssignments.tenantId, tenantId),
    filters.branchId ? eq(cashierAssignments.branchId, filters.branchId) : undefined,
    filters.userId ? eq(cashierAssignments.userId, filters.userId) : undefined,
    filters.status && filters.status !== 'ALL' ? eq(cashierAssignments.status, filters.status) : undefined,
    filters.startDate ? gte(cashierAssignments.assignmentDate, filters.startDate) : undefined,
    filters.endDate ? lte(cashierAssignments.assignmentDate, filters.endDate) : undefined,
  ].filter(Boolean);

  const entries = await db
    .select({
      id: cashierAssignments.id,
      branchId: cashierAssignments.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      cashDrawerId: cashierAssignments.cashDrawerId,
      drawerName: cashDrawers.name,
      userId: cashierAssignments.userId,
      cashierName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      cashierEmail: users.email,
      cashierRole: users.role,
      assignedByUserId: cashierAssignments.assignedByUserId,
      supervisorName: sql<string>`CONCAT(${supervisorUsers.firstName}, ' ', ${supervisorUsers.lastName})`,
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
    .innerJoin(branches, eq(cashierAssignments.branchId, branches.id))
    .innerJoin(cashDrawers, eq(cashierAssignments.cashDrawerId, cashDrawers.id))
    .innerJoin(users, eq(cashierAssignments.userId, users.id))
    .leftJoin(supervisorUsers, eq(cashierAssignments.assignedByUserId, supervisorUsers.id))
    .where(and(...conditions))
    .orderBy(desc(cashierAssignments.assignmentDate), desc(cashierAssignments.id));

  return entries;
};

export const getAssignmentContext = async (tenantId: number, branchId?: number) => {
  const [activeDrawers, activeStaff] = await Promise.all([
    db
      .select({
        id: cashDrawers.id,
        name: cashDrawers.name,
        branchId: cashDrawers.branchId,
      })
      .from(cashDrawers)
      .where(
        and(
          eq(cashDrawers.tenantId, tenantId),
          branchId ? eq(cashDrawers.branchId, branchId) : undefined
        )
      ),
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        defaultBranchId: users.defaultBranchId,
      })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
      .orderBy(users.firstName),
  ]);

  return {
    drawers: activeDrawers,
    staff: activeStaff,
  };
};

export const assignCashier = async (
  tenantId: number,
  supervisorId: number,
  input: CreateCashierAssignmentInput
) => {
  const [existingActiveDrawer] = await db
    .select({ id: cashierAssignments.id })
    .from(cashierAssignments)
    .where(
      and(
        eq(cashierAssignments.tenantId, tenantId),
        eq(cashierAssignments.cashDrawerId, input.cashDrawerId),
        eq(cashierAssignments.assignmentDate, input.assignmentDate),
        eq(cashierAssignments.shiftType, input.shiftType),
        sql`${cashierAssignments.status} IN ('ASSIGNED', 'ACTIVE')`
      )
    )
    .limit(1);

  if (existingActiveDrawer) {
    throw new Error('Register Conflict: This physical cash drawer is already assigned to a custodian for this shift.');
  }

  const [existingCashierShift] = await db
    .select({ id: cashierAssignments.id })
    .from(cashierAssignments)
    .where(
      and(
        eq(cashierAssignments.tenantId, tenantId),
        eq(cashierAssignments.userId, input.userId),
        eq(cashierAssignments.assignmentDate, input.assignmentDate),
        eq(cashierAssignments.shiftType, input.shiftType),
        sql`${cashierAssignments.status} IN ('ASSIGNED', 'ACTIVE')`
      )
    )
    .limit(1);

  if (existingCashierShift) {
    throw new Error('Custodian Overlap: This cashier already holds an active drawer custody assignment for this shift.');
  }

  const [assignment] = await db
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
      allocatedFloat: String(input.allocatedFloat),
      maxCashLimit: String(input.maxCashLimit),
      allowRefunds: input.allowRefunds,
      allowDrawerPop: input.allowDrawerPop,
      allowManualDiscount: input.allowManualDiscount,
      maxDiscountPercent: input.maxDiscountPercent,
      handoverNotes: input.handoverNotes || null,
    })
    .returning();

  return assignment;
};

export const updateAssignment = async (
  tenantId: number,
  assignmentId: number,
  input: UpdateCashierAssignmentInput
) => {
  const [existing] = await db
    .select()
    .from(cashierAssignments)
    .where(
      and(
        eq(cashierAssignments.id, assignmentId),
        eq(cashierAssignments.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new Error('Cashier assignment record not found.');
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (input.status) {
    updateData.status = input.status;
    if (input.status === 'ACTIVE' && !existing.activatedAt) {
      updateData.activatedAt = new Date();
    }
    if ((input.status === 'RELEASED' || input.status === 'REVOKED') && !existing.closedAt) {
      updateData.closedAt = new Date();
    }
  }

  if (input.allocatedFloat !== undefined) updateData.allocatedFloat = String(input.allocatedFloat);
  if (input.maxCashLimit !== undefined) updateData.maxCashLimit = String(input.maxCashLimit);
  if (input.allowRefunds !== undefined) updateData.allowRefunds = input.allowRefunds;
  if (input.allowDrawerPop !== undefined) updateData.allowDrawerPop = input.allowDrawerPop;
  if (input.allowManualDiscount !== undefined) updateData.allowManualDiscount = input.allowManualDiscount;
  if (input.maxDiscountPercent !== undefined) updateData.maxDiscountPercent = input.maxDiscountPercent;
  if (input.handoverNotes !== undefined) updateData.handoverNotes = input.handoverNotes;

  const [updated] = await db
    .update(cashierAssignments)
    .set(updateData)
    .where(eq(cashierAssignments.id, assignmentId))
    .returning();

  return updated;
};

export const revokeAssignment = async (
  tenantId: number,
  assignmentId: number,
  reason: string
) => {
  const [existing] = await db
    .select({ id: cashierAssignments.id, handoverNotes: cashierAssignments.handoverNotes })
    .from(cashierAssignments)
    .where(
      and(
        eq(cashierAssignments.id, assignmentId),
        eq(cashierAssignments.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new Error('Cashier assignment record not found.');
  }

  const noteAddition = existing.handoverNotes
    ? `${existing.handoverNotes} | [REVOKED]: ${reason}`
    : `[REVOKED]: ${reason}`;

  const [revoked] = await db
    .update(cashierAssignments)
    .set({
      status: 'REVOKED',
      closedAt: new Date(),
      handoverNotes: noteAddition,
      updatedAt: new Date(),
    })
    .where(eq(cashierAssignments.id, assignmentId))
    .returning();

  return revoked;
};