// apps/api/src/repositories/handover.repository.ts
import {
  eq,
  and,
  desc,
  asc,
  gte,
  lte,
  inArray,
  or,
  isNull,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db } from '../config/db';
import {
  shiftHandovers,
  branches,
  users,
  userBranchMemberships,
  cashierShifts,
  drawerSessions,
  cashDrawers,
  orders,
  menuItemAvailability,
  menuItems,
  attendanceRecords,
  tenantFinancialSettings,
  financialAdjustments,
  notifications,
  auditLogs,
} from '../config/schema';
import type { CreateHandoverInput, UpdateHandoverInput } from '../validators/handover.validator';

export interface HandoverAuditActor {
  userId: number;
  ipAddress?: string | null;
}

export interface ScopedHandoverFilters {
  startDate?: string;
  endDate?: string;
  effectiveBranchIds: number[] | null;
  shiftType?: string;
  status?: string;
}

function formatLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const listHandovers = async (tenantId: number, filters: ScopedHandoverFilters) => {
  const outgoingUsers = db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    })
    .from(users)
    .as('outgoing_users');

  const incomingUsers = db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    })
    .from(users)
    .as('incoming_users');

  const conditions: SQL[] = [eq(shiftHandovers.tenantId, tenantId)];

  if (filters.effectiveBranchIds !== null) {
    if (filters.effectiveBranchIds.length === 0) return [];
    conditions.push(inArray(shiftHandovers.branchId, filters.effectiveBranchIds));
  }
  if (filters.shiftType) conditions.push(eq(shiftHandovers.shiftType, filters.shiftType));
  if (filters.status) conditions.push(eq(shiftHandovers.status, filters.status));
  if (filters.startDate) conditions.push(gte(shiftHandovers.handoverDate, filters.startDate));
  if (filters.endDate) conditions.push(lte(shiftHandovers.handoverDate, filters.endDate));

  return await db
    .select({
      id: shiftHandovers.id,
      branchId: shiftHandovers.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      handoverScope: shiftHandovers.handoverScope,
      cashierShiftId: shiftHandovers.cashierShiftId,
      cashDrawerId: shiftHandovers.cashDrawerId,
      drawerName: cashDrawers.name,
      drawerCode: cashDrawers.drawerCode,
      linkedAdjustmentId: shiftHandovers.linkedAdjustmentId,
      shiftType: shiftHandovers.shiftType,
      handoverDate: shiftHandovers.handoverDate,
      cashStatus: shiftHandovers.cashStatus,
      openingFloat: shiftHandovers.openingFloat,
      closingCash: shiftHandovers.closingCash,
      cashVariance: shiftHandovers.cashVariance,
      operationalIncidents: shiftHandovers.operationalIncidents,
      inventoryKitchenNotes: shiftHandovers.inventoryKitchenNotes,
      hardwareMaintenanceNotes: shiftHandovers.hardwareMaintenanceNotes,
      guestExperienceNotes: shiftHandovers.guestExperienceNotes,
      checklistItems: shiftHandovers.checklistItems,
      status: shiftHandovers.status,
      outgoingSignedAt: shiftHandovers.outgoingSignedAt,
      incomingSignedAt: shiftHandovers.incomingSignedAt,
      resolutionNotes: shiftHandovers.resolutionNotes,
      resolvedAt: shiftHandovers.resolvedAt,
      outgoingManagerId: shiftHandovers.outgoingManagerId,
      outgoingManagerName: sql<string>`TRIM(CONCAT(${outgoingUsers.firstName}, ' ', ${outgoingUsers.lastName}))`,
      outgoingManagerRole: outgoingUsers.role,
      incomingManagerId: shiftHandovers.incomingManagerId,
      incomingManagerName: sql<string | null>`NULLIF(TRIM(CONCAT(${incomingUsers.firstName}, ' ', ${incomingUsers.lastName})), '')`,
      createdAt: shiftHandovers.createdAt,
    })
    .from(shiftHandovers)
    .innerJoin(
      branches,
      and(eq(shiftHandovers.branchId, branches.id), eq(branches.tenantId, tenantId))
    )
    .innerJoin(outgoingUsers, eq(shiftHandovers.outgoingManagerId, outgoingUsers.id))
    .leftJoin(incomingUsers, eq(shiftHandovers.incomingManagerId, incomingUsers.id))
    .leftJoin(cashDrawers, eq(shiftHandovers.cashDrawerId, cashDrawers.id))
    .where(and(...conditions))
    .orderBy(desc(shiftHandovers.handoverDate), desc(shiftHandovers.id))
    .limit(200);
};

export const findHandoverById = async (tenantId: number, handoverId: number) => {
  const outgoingUsers = db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role })
    .from(users)
    .as('outgoing_users');

  const incomingUsers = db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .as('incoming_users');

  const [handover] = await db
    .select({
      id: shiftHandovers.id,
      branchId: shiftHandovers.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      handoverScope: shiftHandovers.handoverScope,
      cashierShiftId: shiftHandovers.cashierShiftId,
      cashDrawerId: shiftHandovers.cashDrawerId,
      drawerName: cashDrawers.name,
      drawerCode: cashDrawers.drawerCode,
      linkedAdjustmentId: shiftHandovers.linkedAdjustmentId,
      shiftType: shiftHandovers.shiftType,
      handoverDate: shiftHandovers.handoverDate,
      cashStatus: shiftHandovers.cashStatus,
      openingFloat: shiftHandovers.openingFloat,
      closingCash: shiftHandovers.closingCash,
      cashVariance: shiftHandovers.cashVariance,
      operationalIncidents: shiftHandovers.operationalIncidents,
      inventoryKitchenNotes: shiftHandovers.inventoryKitchenNotes,
      hardwareMaintenanceNotes: shiftHandovers.hardwareMaintenanceNotes,
      guestExperienceNotes: shiftHandovers.guestExperienceNotes,
      checklistItems: shiftHandovers.checklistItems,
      status: shiftHandovers.status,
      outgoingSignedAt: shiftHandovers.outgoingSignedAt,
      incomingSignedAt: shiftHandovers.incomingSignedAt,
      resolutionNotes: shiftHandovers.resolutionNotes,
      resolvedAt: shiftHandovers.resolvedAt,
      outgoingManagerId: shiftHandovers.outgoingManagerId,
      outgoingManagerName: sql<string>`TRIM(CONCAT(${outgoingUsers.firstName}, ' ', ${outgoingUsers.lastName}))`,
      outgoingManagerRole: outgoingUsers.role,
      incomingManagerId: shiftHandovers.incomingManagerId,
      incomingManagerName: sql<string | null>`NULLIF(TRIM(CONCAT(${incomingUsers.firstName}, ' ', ${incomingUsers.lastName})), '')`,
    })
    .from(shiftHandovers)
    .innerJoin(
      branches,
      and(eq(shiftHandovers.branchId, branches.id), eq(branches.tenantId, tenantId))
    )
    .innerJoin(outgoingUsers, eq(shiftHandovers.outgoingManagerId, outgoingUsers.id))
    .leftJoin(incomingUsers, eq(shiftHandovers.incomingManagerId, incomingUsers.id))
    .leftJoin(cashDrawers, eq(shiftHandovers.cashDrawerId, cashDrawers.id))
    .where(and(eq(shiftHandovers.id, handoverId), eq(shiftHandovers.tenantId, tenantId)))
    .limit(1);

  return handover ?? null;
};

/**
 * Live Branch Context for Handover Modal:
 * - Selectable cashier shifts for that branch & date (with cashier name + live float/expected/counted)
 * - Physical cash drawers in that branch
 * - Eligible incoming managers cleared for that branch
 * - Branch-wide treasury, KDS, 86ed, and on-duty counts
 */
export const getBranchHandoverContext = async (
  tenantId: number,
  branchId: number,
  dateStr?: string
) => {
  const targetDate = dateStr || formatLocalIsoDate(new Date());

  const branchMemberSubquery = db
    .select({ userId: userBranchMemberships.userId })
    .from(userBranchMemberships)
    .where(
      and(
        eq(userBranchMemberships.tenantId, tenantId),
        eq(userBranchMemberships.branchId, branchId),
        eq(userBranchMemberships.isActive, true)
      )
    );

  const [
    branchShifts,
    branchDrawers,
    activeDrawerSessions,
    eligibleManagers,
    [kdsAgg],
    items86edRows,
    [onDutyAgg],
    [finSettings],
  ] = await Promise.all([
    db
      .select({
        id: cashierShifts.id,
        cashierId: cashierShifts.cashierId,
        cashierName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        cashierRole: users.role,
        openingFloat: cashierShifts.openingFloat,
        expectedCash: cashierShifts.expectedCash,
        countedCash: cashierShifts.countedCash,
        variance: cashierShifts.variance,
        status: cashierShifts.status,
        openedAt: cashierShifts.openedAt,
        closedAt: cashierShifts.closedAt,
      })
      .from(cashierShifts)
      .innerJoin(users, and(eq(cashierShifts.cashierId, users.id), eq(users.tenantId, tenantId)))
      .where(
        and(
          eq(cashierShifts.tenantId, tenantId),
          eq(cashierShifts.branchId, branchId),
          or(
            sql`date(${cashierShifts.openedAt}) = ${targetDate}::date`,
            eq(cashierShifts.status, 'OPEN')
          )
        )
      )
      .orderBy(desc(cashierShifts.openedAt)),

    db
      .select({
        id: cashDrawers.id,
        drawerCode: cashDrawers.drawerCode,
        name: cashDrawers.name,
        status: cashDrawers.status,
        currentBalance: cashDrawers.currentBalance,
      })
      .from(cashDrawers)
      .where(
        and(
          eq(cashDrawers.tenantId, tenantId),
          or(eq(cashDrawers.branchId, branchId), isNull(cashDrawers.branchId))
        )
      )
      .orderBy(asc(cashDrawers.drawerCode)),

    db
      .select({
        drawerId: drawerSessions.drawerId,
        cashierId: drawerSessions.cashierId,
        expectedClosingBalance: drawerSessions.expectedClosingBalance,
      })
      .from(drawerSessions)
      .innerJoin(
        cashDrawers,
        and(eq(drawerSessions.drawerId, cashDrawers.id), eq(cashDrawers.tenantId, tenantId))
      )
      .where(
        and(
          eq(drawerSessions.tenantId, tenantId),
          eq(cashDrawers.branchId, branchId),
          inArray(drawerSessions.status, ['OPEN', 'ACTIVE'])
        )
      ),

    db
      .select({
        id: users.id,
        fullName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.isActive, true),
          or(
            inArray(users.role, ['ADMIN', 'SUPER_ADMIN']),
            eq(users.defaultBranchId, branchId),
            inArray(users.id, branchMemberSubquery)
          )
        )
      )
      .orderBy(asc(users.firstName)),

    db
      .select({ openTicketsCount: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.branchId, branchId),
          inArray(orders.status, ['Confirmed', 'Sent-To-Kitchen', 'Preparing', 'Ready'])
        )
      ),

    db
      .select({ name: menuItems.name, reason: menuItemAvailability.reason })
      .from(menuItemAvailability)
      .innerJoin(menuItems, eq(menuItemAvailability.menuItemId, menuItems.id))
      .where(
        and(
          eq(menuItemAvailability.tenantId, tenantId),
          eq(menuItemAvailability.branchId, branchId),
          eq(menuItemAvailability.is86ed, true)
        )
      )
      .orderBy(asc(menuItems.name))
      .limit(15),

    db
      .select({ onDutyCount: sql<number>`count(*)::int` })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.branchId, branchId),
          eq(attendanceRecords.status, 'ON_DUTY')
        )
      ),

    db
      .select({ baseCurrency: tenantFinancialSettings.baseCurrency })
      .from(tenantFinancialSettings)
      .where(eq(tenantFinancialSettings.tenantId, tenantId))
      .limit(1),
  ]);

  const sessionByCashier = new Map(activeDrawerSessions.map((s) => [s.cashierId, s]));

  const enrichedShifts = branchShifts.map((s) => {
    const linked = sessionByCashier.get(s.cashierId);
    const openingFloat = Number(s.openingFloat) || 0;
    const expectedCash = linked
      ? Math.max(Number(s.expectedCash) || 0, Number(linked.expectedClosingBalance) || 0)
      : Number(s.expectedCash) || 0;
    const countedCash = s.countedCash !== null ? Number(s.countedCash) : expectedCash;
    const variance = s.variance !== null ? Number(s.variance) : 0;

    return {
      id: s.id,
      cashierId: s.cashierId,
      cashierName: s.cashierName,
      cashierRole: s.cashierRole,
      drawerId: linked?.drawerId ?? null,
      status: s.status,
      openingFloat: Number(openingFloat.toFixed(2)),
      expectedCash: Number(expectedCash.toFixed(2)),
      countedCash: Number(countedCash.toFixed(2)),
      variance: Number(variance.toFixed(2)),
      openedAt: s.openedAt,
    };
  });

  const openingFloatSum = enrichedShifts.reduce((a, s) => a + s.openingFloat, 0);
  const expectedCashSum = enrichedShifts.reduce((a, s) => a + s.expectedCash, 0);
  const countedCashSum = enrichedShifts.reduce((a, s) => a + s.countedCash, 0);
  const netVarianceSum = enrichedShifts.reduce((a, s) => a + s.variance, 0);

  return {
    targetDate,
    currency: finSettings?.baseCurrency ?? 'KES',
    treasury: {
      totalShifts: enrichedShifts.length,
      openShifts: enrichedShifts.filter((s) => s.status === 'OPEN').length,
      closedShifts: enrichedShifts.filter((s) => s.status === 'CLOSED').length,
      openDrawersCount: activeDrawerSessions.length,
      openingFloat: Number(openingFloatSum.toFixed(2)),
      expectedCash: Number(expectedCashSum.toFixed(2)),
      countedCash: Number(countedCashSum.toFixed(2)),
      variance: Number(netVarianceSum.toFixed(2)),
    },
    shifts: enrichedShifts,
    drawers: branchDrawers.map((d) => ({
      ...d,
      currentBalance: Number(d.currentBalance) || 0,
    })),
    eligibleIncomingManagers: eligibleManagers,
    operations: {
      openKitchenTickets: kdsAgg?.openTicketsCount ?? 0,
      onDutyStaffCount: onDutyAgg?.onDutyCount ?? 0,
      items86ed: items86edRows,
    },
  };
};

export const createHandoverTransaction = async (
  tenantId: number,
  outgoingManagerId: number,
  input: CreateHandoverInput,
  actor: HandoverAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [branchRow] = await tx
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(
        and(
          eq(branches.id, input.branchId),
          eq(branches.tenantId, tenantId),
          eq(branches.isActive, true)
        )
      )
      .limit(1);

    if (!branchRow) throw new Error('Selected branch does not exist or is inactive.');

    if (input.cashierShiftId) {
      const [shiftRow] = await tx
        .select({ id: cashierShifts.id })
        .from(cashierShifts)
        .where(
          and(
            eq(cashierShifts.id, input.cashierShiftId),
            eq(cashierShifts.tenantId, tenantId),
            eq(cashierShifts.branchId, input.branchId)
          )
        )
        .limit(1);
      if (!shiftRow) {
        throw new Error('Selected cashier shift does not belong to this branch.');
      }
    }

    if (input.cashDrawerId) {
      const [drawerRow] = await tx
        .select({ id: cashDrawers.id })
        .from(cashDrawers)
        .where(
          and(
            eq(cashDrawers.id, input.cashDrawerId),
            eq(cashDrawers.tenantId, tenantId),
            or(eq(cashDrawers.branchId, input.branchId), isNull(cashDrawers.branchId))
          )
        )
        .limit(1);
      if (!drawerRow) {
        throw new Error('Selected cash drawer does not belong to this branch.');
      }
    }

    if (input.incomingManagerId) {
      if (input.incomingManagerId === outgoingManagerId) {
        throw new Error('Incoming manager must be a different supervisor than the outgoing manager.');
      }
      const [incomingUser] = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, input.incomingManagerId),
            eq(users.tenantId, tenantId),
            eq(users.isActive, true)
          )
        )
        .limit(1);
      if (!incomingUser) throw new Error('Selected incoming manager is invalid or inactive.');
    }

    const [created] = await tx
      .insert(shiftHandovers)
      .values({
        tenantId,
        branchId: input.branchId,
        handoverScope: input.handoverScope,
        cashierShiftId: input.cashierShiftId ?? null,
        cashDrawerId: input.cashDrawerId ?? null,
        outgoingManagerId,
        incomingManagerId: input.incomingManagerId ?? null,
        shiftType: input.shiftType,
        handoverDate: input.handoverDate,
        cashStatus: input.cashStatus,
        openingFloat: input.openingFloat.toFixed(2),
        closingCash: input.closingCash.toFixed(2),
        cashVariance: input.cashVariance.toFixed(2),
        operationalIncidents: input.operationalIncidents ?? null,
        inventoryKitchenNotes: input.inventoryKitchenNotes ?? null,
        hardwareMaintenanceNotes: input.hardwareMaintenanceNotes ?? null,
        guestExperienceNotes: input.guestExperienceNotes ?? null,
        checklistItems: input.checklistItems,
        status: input.status,
        outgoingSignedAt: new Date(),
      })
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: created.branchId,
      userId: actor.userId,
      action: 'SHIFT_HANDOVER_SUBMITTED',
      module: 'WORKFORCE_HCM',
      entityType: 'shift_handovers',
      entityId: String(created.id),
      newValues: {
        handoverScope: created.handoverScope,
        cashierShiftId: created.cashierShiftId,
        cashDrawerId: created.cashDrawerId,
        shiftType: created.shiftType,
        cashVariance: created.cashVariance,
        incomingManagerId: created.incomingManagerId,
      },
      ipAddress: actor.ipAddress ?? null,
    });

    // Dispatch actionable handover notification to incoming manager (or branch managers)
    if (input.status === 'SUBMITTED') {
      const isMaterialVariance = Math.abs(input.cashVariance) >= 500;
      await tx.insert(notifications).values({
        tenantId,
        branchId: created.branchId,
        userId: created.incomingManagerId ?? null,
        title: isMaterialVariance
          ? `Action Required: Handover #${created.id} Cash Variance (${branchRow.name})`
          : `Pending Shift Handover Countersignature (#${created.id} • ${branchRow.name})`,
        detail: `${created.handoverScope === 'TILL_CUSTODY' ? 'Till Custody' : 'Branch'} ${created.shiftType} handover awaiting incoming countersignature. Cash variance: ${input.cashVariance.toLocaleString()}.`,
        severity: isMaterialVariance ? 'CRITICAL' : 'WARNING',
        module: 'WORKFORCE_HCM',
        category: 'ACTION_REQUIRED',
        entityType: 'shift_handovers',
        entityId: String(created.id),
        actionUrl: '/staff/handover',
        isRead: false,
        isResolved: false,
      });
    }

    return created;
  });
};

export const updateHandoverTransaction = async (
  tenantId: number,
  handoverId: number,
  input: UpdateHandoverInput,
  actor: HandoverAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(shiftHandovers)
      .where(and(eq(shiftHandovers.id, handoverId), eq(shiftHandovers.tenantId, tenantId)))
      .limit(1);

    if (!existing) return null;
    if (existing.status === 'ACKNOWLEDGED' || existing.status === 'RESOLVED') {
      throw new Error('Immutable handover log: Countersigned/resolved reports cannot be edited.');
    }

    const [updated] = await tx
      .update(shiftHandovers)
      .set({
        ...(input.incomingManagerId !== undefined
          ? { incomingManagerId: input.incomingManagerId }
          : {}),
        ...(input.cashierShiftId !== undefined ? { cashierShiftId: input.cashierShiftId } : {}),
        ...(input.cashDrawerId !== undefined ? { cashDrawerId: input.cashDrawerId } : {}),
        ...(input.openingFloat !== undefined
          ? { openingFloat: input.openingFloat.toFixed(2) }
          : {}),
        ...(input.closingCash !== undefined ? { closingCash: input.closingCash.toFixed(2) } : {}),
        ...(input.cashVariance !== undefined
          ? { cashVariance: input.cashVariance.toFixed(2) }
          : {}),
        ...(input.cashStatus !== undefined ? { cashStatus: input.cashStatus } : {}),
        ...(input.operationalIncidents !== undefined
          ? { operationalIncidents: input.operationalIncidents }
          : {}),
        ...(input.inventoryKitchenNotes !== undefined
          ? { inventoryKitchenNotes: input.inventoryKitchenNotes }
          : {}),
        ...(input.hardwareMaintenanceNotes !== undefined
          ? { hardwareMaintenanceNotes: input.hardwareMaintenanceNotes }
          : {}),
        ...(input.guestExperienceNotes !== undefined
          ? { guestExperienceNotes: input.guestExperienceNotes }
          : {}),
        ...(input.checklistItems !== undefined ? { checklistItems: input.checklistItems } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(shiftHandovers.id, handoverId), eq(shiftHandovers.tenantId, tenantId)))
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: updated.branchId,
      userId: actor.userId,
      action: 'SHIFT_HANDOVER_UPDATED',
      module: 'WORKFORCE_HCM',
      entityType: 'shift_handovers',
      entityId: String(updated.id),
      ipAddress: actor.ipAddress ?? null,
    });

    return updated;
  });
};

export const acknowledgeHandoverTransaction = async (
  tenantId: number,
  handoverId: number,
  incomingManagerId: number,
  notes: string | undefined,
  actor: HandoverAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(shiftHandovers)
      .where(and(eq(shiftHandovers.id, handoverId), eq(shiftHandovers.tenantId, tenantId)))
      .limit(1);

    if (!existing) return null;

    if (existing.outgoingManagerId === incomingManagerId) {
      throw new Error(
        'Dual-signature governance: The incoming manager must be a different supervisor than the outgoing manager.'
      );
    }
    if (existing.status === 'ACKNOWLEDGED' || existing.status === 'RESOLVED') {
      throw new Error('This shift handover has already been countersigned.');
    }

    // If a cash variance exists, auto-create a Maker-Checker GL Adjustment voucher for Finance
    let linkedAdjustmentId = existing.linkedAdjustmentId;
    const varianceNum = Number(existing.cashVariance) || 0;

    if (varianceNum !== 0 && !linkedAdjustmentId) {
      const isShortage = varianceNum < 0;
      const [adj] = await tx
        .insert(financialAdjustments)
        .values({
          tenantId,
          branchId: existing.branchId,
          adjustmentNumber: `ADJ-HO-${existing.id}-${Date.now().toString().slice(-4)}`,
          adjustmentType: 'TILL_VARIANCE_WRITE_OFF',
          shiftId: existing.cashierShiftId ?? null,
          attributedUserId: existing.outgoingManagerId,
          createdById: incomingManagerId,
          amount: Math.abs(varianceNum).toFixed(2),
          currency: 'KES',
          adjustmentDirection: isShortage ? 'DEBIT' : 'CREDIT',
          debitGlAccount: isShortage ? '5210 - Cash Over/Short Expense' : '1010 - Main Till Cash',
          creditGlAccount: isShortage ? '1010 - Main Till Cash' : '4910 - Cash Overage Income',
          status: 'PENDING_APPROVAL',
          reasonCode: 'DRAWER_DISCREPANCY',
          justificationNotes: `Auto-generated from Shift Handover #${existing.id} (${existing.shiftType}, ${existing.handoverDate}). ${notes || ''}`.trim(),
        })
        .returning({ id: financialAdjustments.id });

      linkedAdjustmentId = adj.id;
    }

    const updatedIncidents = notes
      ? [existing.operationalIncidents, `[Incoming Countersign Note]: ${notes}`]
          .filter(Boolean)
          .join('\n')
      : existing.operationalIncidents;

    const [acknowledged] = await tx
      .update(shiftHandovers)
      .set({
        incomingManagerId,
        linkedAdjustmentId,
        status: 'ACKNOWLEDGED',
        incomingSignedAt: new Date(),
        operationalIncidents: updatedIncidents,
        updatedAt: new Date(),
      })
      .where(and(eq(shiftHandovers.id, handoverId), eq(shiftHandovers.tenantId, tenantId)))
      .returning();

    // Resolve any pending handover notifications
    await tx
      .update(notifications)
      .set({ isRead: true, isResolved: true, resolvedAt: new Date(), resolvedByUserId: incomingManagerId })
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.entityType, 'shift_handovers'),
          eq(notifications.entityId, String(handoverId)),
          eq(notifications.isResolved, false)
        )
      );

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: acknowledged.branchId,
      userId: actor.userId,
      action: 'SHIFT_HANDOVER_ACKNOWLEDGED',
      module: 'WORKFORCE_HCM',
      entityType: 'shift_handovers',
      entityId: String(acknowledged.id),
      reason: notes ?? 'Incoming manager countersigned handover',
      newValues: { incomingManagerId, linkedAdjustmentId },
      ipAddress: actor.ipAddress ?? null,
    });

    return acknowledged;
  });
};

export const disputeHandoverTransaction = async (
  tenantId: number,
  handoverId: number,
  incomingManagerId: number,
  reason: string,
  actor: HandoverAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(shiftHandovers)
      .where(and(eq(shiftHandovers.id, handoverId), eq(shiftHandovers.tenantId, tenantId)))
      .limit(1);

    if (!existing) return null;
    if (existing.outgoingManagerId === incomingManagerId) {
      throw new Error('You cannot dispute your own shift handover submission.');
    }
    if (existing.status === 'ACKNOWLEDGED' || existing.status === 'RESOLVED') {
      throw new Error('Countersigned/resolved handovers cannot be disputed.');
    }

    const updatedIncidents = [existing.operationalIncidents, `[DISPUTED]: ${reason}`]
      .filter(Boolean)
      .join('\n');

    const [disputed] = await tx
      .update(shiftHandovers)
      .set({
        incomingManagerId,
        status: 'DISPUTED',
        incomingSignedAt: new Date(),
        operationalIncidents: updatedIncidents,
        updatedAt: new Date(),
      })
      .where(and(eq(shiftHandovers.id, handoverId), eq(shiftHandovers.tenantId, tenantId)))
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: disputed.branchId,
      userId: actor.userId,
      action: 'SHIFT_HANDOVER_DISPUTED',
      module: 'WORKFORCE_HCM',
      entityType: 'shift_handovers',
      entityId: String(disputed.id),
      reason,
      newValues: { status: 'DISPUTED', incomingManagerId },
      ipAddress: actor.ipAddress ?? null,
    });

    await tx.insert(notifications).values({
      tenantId,
      branchId: disputed.branchId,
      title: `Shift Handover Disputed: Log #${disputed.id}`,
      detail: `Incoming manager disputed ${disputed.shiftType} handover (${disputed.handoverDate}). Reason: ${reason}`,
      severity: 'CRITICAL',
      module: 'WORKFORCE_HCM',
      category: 'COMPLIANCE_AUDIT',
      entityType: 'shift_handovers',
      entityId: String(disputed.id),
      actionUrl: '/staff/handover',
      isRead: false,
      isResolved: false,
    });

    return disputed;
  });
};

export const resolveDisputedHandoverTransaction = async (
  tenantId: number,
  handoverId: number,
  resolutionNotes: string,
  postGlAdjustment: boolean,
  actor: HandoverAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(shiftHandovers)
      .where(and(eq(shiftHandovers.id, handoverId), eq(shiftHandovers.tenantId, tenantId)))
      .limit(1);

    if (!existing) return null;
    if (existing.status !== 'DISPUTED') {
      throw new Error('Only DISPUTED handovers can be resolved through governance escalation.');
    }

    let linkedAdjustmentId = existing.linkedAdjustmentId;
    const varianceNum = Number(existing.cashVariance) || 0;

    if (postGlAdjustment && varianceNum !== 0 && !linkedAdjustmentId) {
      const isShortage = varianceNum < 0;
      const [adj] = await tx
        .insert(financialAdjustments)
        .values({
          tenantId,
          branchId: existing.branchId,
          adjustmentNumber: `ADJ-DISP-${existing.id}-${Date.now().toString().slice(-4)}`,
          adjustmentType: 'TILL_VARIANCE_WRITE_OFF',
          shiftId: existing.cashierShiftId ?? null,
          attributedUserId: existing.outgoingManagerId,
          createdById: actor.userId,
          amount: Math.abs(varianceNum).toFixed(2),
          currency: 'KES',
          adjustmentDirection: isShortage ? 'DEBIT' : 'CREDIT',
          debitGlAccount: isShortage ? '5210 - Cash Over/Short Expense' : '1010 - Main Till Cash',
          creditGlAccount: isShortage ? '1010 - Main Till Cash' : '4910 - Cash Overage Income',
          status: 'PENDING_APPROVAL',
          reasonCode: 'DRAWER_DISCREPANCY',
          justificationNotes: `Dispute Resolution for Handover #${existing.id}: ${resolutionNotes}`,
        })
        .returning({ id: financialAdjustments.id });

      linkedAdjustmentId = adj.id;
    }

    const [resolved] = await tx
      .update(shiftHandovers)
      .set({
        status: 'RESOLVED',
        linkedAdjustmentId,
        resolutionNotes,
        resolvedByUserId: actor.userId,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(shiftHandovers.id, handoverId), eq(shiftHandovers.tenantId, tenantId)))
      .returning();

    await tx
      .update(notifications)
      .set({ isRead: true, isResolved: true, resolvedAt: new Date(), resolvedByUserId: actor.userId })
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.entityType, 'shift_handovers'),
          eq(notifications.entityId, String(handoverId)),
          eq(notifications.isResolved, false)
        )
      );

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: resolved.branchId,
      userId: actor.userId,
      action: 'SHIFT_HANDOVER_DISPUTE_RESOLVED',
      module: 'WORKFORCE_HCM',
      entityType: 'shift_handovers',
      entityId: String(resolved.id),
      reason: resolutionNotes,
      newValues: { status: 'RESOLVED', linkedAdjustmentId },
      ipAddress: actor.ipAddress ?? null,
    });

    return resolved;
  });
};