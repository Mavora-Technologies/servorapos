// apps/api/src/repositories/branch.repository.ts
import { eq, and, desc, asc, inArray, ne, sql, type SQL } from 'drizzle-orm';
import { db } from '../config/db';
import { branches, auditLogs } from '../config/schema';
import type { CreateBranchInput, UpdateBranchInput } from '../validators/branch.validator';

export interface BranchAuditActor {
  userId: number;
  ipAddress?: string | null;
}

export const findBranchesByTenantScope = async (
  tenantId: number,
  authorizedBranchIds: number[] | null // null = all tenant branches (ADMIN/SUPER_ADMIN)
) => {
  const conditions: SQL[] = [eq(branches.tenantId, tenantId)];

  if (authorizedBranchIds !== null) {
    if (authorizedBranchIds.length === 0) {
      return [];
    }
    conditions.push(inArray(branches.id, authorizedBranchIds));
  }

  return await db
    .select({
      id: branches.id,
      tenantId: branches.tenantId,
      name: branches.name,
      code: branches.code,
      phone: branches.phone,
      email: branches.email,
      address: branches.address,
      kraPin: branches.kraPin,
      etimsBranchId: branches.etimsBranchId,
      etimsDeviceSerial: branches.etimsDeviceSerial,
      receiptFooter: branches.receiptFooter,
      isMainBranch: branches.isMainBranch,
      isActive: branches.isActive,
      createdAt: branches.createdAt,
      updatedAt: branches.updatedAt,
    })
    .from(branches)
    .where(and(...conditions))
    .orderBy(desc(branches.isMainBranch), asc(branches.name));
};

export const createBranchTransaction = async (
  tenantId: number,
  payload: CreateBranchInput,
  actor: BranchAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [duplicate] = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.tenantId, tenantId), eq(branches.code, payload.code)))
      .limit(1);

    if (duplicate) {
      throw new Error(`Branch code '${payload.code}' is already registered for your organization.`);
    }

    // Maintain single Headquarters / Main Hub invariant per tenant
    if (payload.isMainBranch) {
      await tx
        .update(branches)
        .set({ isMainBranch: false, updatedAt: new Date() })
        .where(and(eq(branches.tenantId, tenantId), eq(branches.isMainBranch, true)));
    }

    const [created] = await tx
      .insert(branches)
      .values({
        tenantId,
        name: payload.name,
        code: payload.code,
        address: payload.address ?? null,
        phone: payload.phone ?? null,
        email: payload.email ?? null,
        kraPin: payload.kraPin ?? null,
        etimsBranchId: payload.etimsBranchId ?? '00',
        etimsDeviceSerial: payload.etimsDeviceSerial ?? null,
        receiptFooter: payload.receiptFooter ?? null,
        isMainBranch: payload.isMainBranch,
        isActive: payload.isActive,
      })
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: created.id,
      userId: actor.userId,
      action: 'BRANCH_CREATED',
      module: 'SETTINGS',
      entityType: 'branches',
      entityId: String(created.id),
      newValues: {
        name: created.name,
        code: created.code,
        isMainBranch: created.isMainBranch,
      },
      ipAddress: actor.ipAddress ?? null,
    });

    return created;
  });
};

export const updateBranchTransaction = async (
  tenantId: number,
  branchId: number,
  payload: UpdateBranchInput,
  actor: BranchAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(branches)
      .where(and(eq(branches.id, branchId), eq(branches.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return null;
    }

    if (payload.code && payload.code !== existing.code) {
      const [duplicate] = await tx
        .select({ id: branches.id })
        .from(branches)
        .where(
          and(
            eq(branches.tenantId, tenantId),
            eq(branches.code, payload.code),
            ne(branches.id, branchId)
          )
        )
        .limit(1);

      if (duplicate) {
        throw new Error(`Branch code '${payload.code}' is already registered.`);
      }
    }

    if (payload.isMainBranch === true && !existing.isMainBranch) {
      await tx
        .update(branches)
        .set({ isMainBranch: false, updatedAt: new Date() })
        .where(
          and(
            eq(branches.tenantId, tenantId),
            eq(branches.isMainBranch, true),
            ne(branches.id, branchId)
          )
        );
    }

    const updateSet: Partial<typeof branches.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) updateSet.name = payload.name;
    if (payload.code !== undefined) updateSet.code = payload.code;
    if (payload.address !== undefined) updateSet.address = payload.address;
    if (payload.phone !== undefined) updateSet.phone = payload.phone;
    if (payload.email !== undefined) updateSet.email = payload.email;
    if (payload.kraPin !== undefined) updateSet.kraPin = payload.kraPin;
    if (payload.etimsBranchId !== undefined) updateSet.etimsBranchId = payload.etimsBranchId;
    if (payload.etimsDeviceSerial !== undefined) {
      updateSet.etimsDeviceSerial = payload.etimsDeviceSerial;
    }
    if (payload.receiptFooter !== undefined) updateSet.receiptFooter = payload.receiptFooter;
    if (payload.isMainBranch !== undefined) updateSet.isMainBranch = payload.isMainBranch;
    if (payload.isActive !== undefined) updateSet.isActive = payload.isActive;

    const [updated] = await tx
      .update(branches)
      .set(updateSet)
      .where(and(eq(branches.id, branchId), eq(branches.tenantId, tenantId)))
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: updated.id,
      userId: actor.userId,
      action: 'BRANCH_UPDATED',
      module: 'SETTINGS',
      entityType: 'branches',
      entityId: String(updated.id),
      previousValues: {
        name: existing.name,
        code: existing.code,
        isMainBranch: existing.isMainBranch,
        isActive: existing.isActive,
      },
      newValues: {
        name: updated.name,
        code: updated.code,
        isMainBranch: updated.isMainBranch,
        isActive: updated.isActive,
      },
      ipAddress: actor.ipAddress ?? null,
    });

    return updated;
  });
};

export const toggleBranchStatusTransaction = async (
  tenantId: number,
  branchId: number,
  actor: BranchAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(branches)
      .where(and(eq(branches.id, branchId), eq(branches.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return null;
    }

    const nextActive = !existing.isActive;

    if (!nextActive) {
      if (existing.isMainBranch) {
        throw new Error(
          'Cannot deactivate the primary Headquarters branch. Assign another outlet as Headquarters first.'
        );
      }

      const [activeCountRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(branches)
        .where(and(eq(branches.tenantId, tenantId), eq(branches.isActive, true)));

      if ((activeCountRow?.count ?? 0) <= 1) {
        throw new Error('At least one operating branch must remain active.');
      }
    }

    const [updated] = await tx
      .update(branches)
      .set({ isActive: nextActive, updatedAt: new Date() })
      .where(and(eq(branches.id, branchId), eq(branches.tenantId, tenantId)))
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: updated.id,
      userId: actor.userId,
      action: nextActive ? 'BRANCH_ACTIVATED' : 'BRANCH_DEACTIVATED',
      module: 'SETTINGS',
      entityType: 'branches',
      entityId: String(updated.id),
      previousValues: { isActive: existing.isActive },
      newValues: { isActive: updated.isActive },
      ipAddress: actor.ipAddress ?? null,
    });

    return updated;
  });
};