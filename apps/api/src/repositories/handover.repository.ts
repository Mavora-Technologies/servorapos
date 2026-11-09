import { eq, and, desc, gte, lte, or, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { shiftHandovers, branches, users } from '../config/schema';
import { CreateHandoverInput, UpdateHandoverInput } from '../validators/handover.validator';

export interface HandoverFilters {
  startDate?: string;
  endDate?: string;
  branchId?: number;
  shiftType?: string;
  status?: string;
}

export const listHandovers = async (tenantId: number, filters: HandoverFilters) => {
  const outgoingUsers = db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(users)
    .as('outgoing_users');

  const incomingUsers = db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(users)
    .as('incoming_users');

  const conditions = [
    eq(shiftHandovers.tenantId, tenantId),
    filters.branchId ? eq(shiftHandovers.branchId, filters.branchId) : undefined,
    filters.shiftType && filters.shiftType !== 'ALL' ? eq(shiftHandovers.shiftType, filters.shiftType) : undefined,
    filters.status && filters.status !== 'ALL' ? eq(shiftHandovers.status, filters.status) : undefined,
    filters.startDate ? gte(shiftHandovers.handoverDate, filters.startDate) : undefined,
    filters.endDate ? lte(shiftHandovers.handoverDate, filters.endDate) : undefined,
  ].filter(Boolean);

  const entries = await db
    .select({
      id: shiftHandovers.id,
      branchId: shiftHandovers.branchId,
      branchName: branches.name,
      branchCode: branches.code,
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
      outgoingManagerId: shiftHandovers.outgoingManagerId,
      outgoingManagerName: sql<string>`CONCAT(${outgoingUsers.firstName}, ' ', ${outgoingUsers.lastName})`,
      incomingManagerId: shiftHandovers.incomingManagerId,
      incomingManagerName: sql<string | null>`CONCAT(${incomingUsers.firstName}, ' ', ${incomingUsers.lastName})`,
      createdAt: shiftHandovers.createdAt,
    })
    .from(shiftHandovers)
    .innerJoin(branches, eq(shiftHandovers.branchId, branches.id))
    .innerJoin(outgoingUsers, eq(shiftHandovers.outgoingManagerId, outgoingUsers.id))
    .leftJoin(incomingUsers, eq(shiftHandovers.incomingManagerId, incomingUsers.id))
    .where(and(...conditions))
    .orderBy(desc(shiftHandovers.handoverDate), desc(shiftHandovers.id));

  return entries;
};

export const findHandoverById = async (tenantId: number, handoverId: number) => {
  const outgoingUsers = db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .as('outgoing_users');

  const incomingUsers = db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .as('incoming_users');

  const [handover] = await db
    .select({
      id: shiftHandovers.id,
      branchId: shiftHandovers.branchId,
      branchName: branches.name,
      branchCode: branches.code,
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
      outgoingManagerId: shiftHandovers.outgoingManagerId,
      outgoingManagerName: sql<string>`CONCAT(${outgoingUsers.firstName}, ' ', ${outgoingUsers.lastName})`,
      incomingManagerId: shiftHandovers.incomingManagerId,
      incomingManagerName: sql<string | null>`CONCAT(${incomingUsers.firstName}, ' ', ${incomingUsers.lastName})`,
    })
    .from(shiftHandovers)
    .innerJoin(branches, eq(shiftHandovers.branchId, branches.id))
    .innerJoin(outgoingUsers, eq(shiftHandovers.outgoingManagerId, outgoingUsers.id))
    .leftJoin(incomingUsers, eq(shiftHandovers.incomingManagerId, incomingUsers.id))
    .where(and(eq(shiftHandovers.id, handoverId), eq(shiftHandovers.tenantId, tenantId)))
    .limit(1);

  return handover || null;
};

export const createHandover = async (
  tenantId: number,
  outgoingManagerId: number,
  input: CreateHandoverInput
) => {
  const [newHandover] = await db
    .insert(shiftHandovers)
    .values({
      tenantId,
      branchId: input.branchId,
      outgoingManagerId,
      incomingManagerId: input.incomingManagerId || null,
      shiftType: input.shiftType,
      handoverDate: input.handoverDate,
      cashStatus: input.cashStatus,
      openingFloat: String(input.openingFloat),
      closingCash: String(input.closingCash),
      cashVariance: String(input.cashVariance),
      operationalIncidents: input.operationalIncidents || null,
      inventoryKitchenNotes: input.inventoryKitchenNotes || null,
      hardwareMaintenanceNotes: input.hardwareMaintenanceNotes || null,
      guestExperienceNotes: input.guestExperienceNotes || null,
      checklistItems: input.checklistItems,
      status: input.status,
      outgoingSignedAt: new Date(),
    })
    .returning();

  return newHandover;
};

export const updateHandover = async (
  tenantId: number,
  handoverId: number,
  input: UpdateHandoverInput
) => {
  const [existing] = await db
    .select({ id: shiftHandovers.id, status: shiftHandovers.status })
    .from(shiftHandovers)
    .where(and(eq(shiftHandovers.id, handoverId), eq(shiftHandovers.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    throw new Error('Shift handover report not found.');
  }

  if (existing.status === 'ACKNOWLEDGED') {
    throw new Error('Immutable handover log: Acknowledged reports cannot be edited.');
  }

  const [updated] = await db
    .update(shiftHandovers)
    .set({
      ...(input.incomingManagerId !== undefined ? { incomingManagerId: input.incomingManagerId } : {}),
      ...(input.openingFloat !== undefined ? { openingFloat: String(input.openingFloat) } : {}),
      ...(input.closingCash !== undefined ? { closingCash: String(input.closingCash) } : {}),
      ...(input.cashVariance !== undefined ? { cashVariance: String(input.cashVariance) } : {}),
      ...(input.cashStatus !== undefined ? { cashStatus: input.cashStatus } : {}),
      ...(input.operationalIncidents !== undefined ? { operationalIncidents: input.operationalIncidents } : {}),
      ...(input.inventoryKitchenNotes !== undefined ? { inventoryKitchenNotes: input.inventoryKitchenNotes } : {}),
      ...(input.hardwareMaintenanceNotes !== undefined ? { hardwareMaintenanceNotes: input.hardwareMaintenanceNotes } : {}),
      ...(input.guestExperienceNotes !== undefined ? { guestExperienceNotes: input.guestExperienceNotes } : {}),
      ...(input.checklistItems !== undefined ? { checklistItems: input.checklistItems } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(shiftHandovers.id, handoverId), eq(shiftHandovers.tenantId, tenantId)))
    .returning();

  return updated;
};

export const acknowledgeHandover = async (
  tenantId: number,
  handoverId: number,
  incomingManagerId: number
) => {
  const [existing] = await db
    .select({
      id: shiftHandovers.id,
      outgoingManagerId: shiftHandovers.outgoingManagerId,
      status: shiftHandovers.status,
    })
    .from(shiftHandovers)
    .where(and(eq(shiftHandovers.id, handoverId), eq(shiftHandovers.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    throw new Error('Shift handover report not found.');
  }

  if (existing.outgoingManagerId === incomingManagerId) {
    throw new Error('Dual-signature governance: The incoming manager must be a different supervisor than the outgoing manager.');
  }

  if (existing.status === 'ACKNOWLEDGED') {
    throw new Error('This shift handover has already been acknowledged.');
  }

  const [acknowledged] = await db
    .update(shiftHandovers)
    .set({
      incomingManagerId,
      status: 'ACKNOWLEDGED',
      incomingSignedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(shiftHandovers.id, handoverId), eq(shiftHandovers.tenantId, tenantId)))
    .returning();

  return acknowledged;
};