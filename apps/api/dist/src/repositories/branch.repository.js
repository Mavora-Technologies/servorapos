"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleBranchStatusTransaction = exports.updateBranchTransaction = exports.createBranchTransaction = exports.findBranchesByTenantScope = void 0;
// apps/api/src/repositories/branch.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const findBranchesByTenantScope = async (tenantId, authorizedBranchIds // null = all tenant branches (ADMIN/SUPER_ADMIN)
) => {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)];
    if (authorizedBranchIds !== null) {
        if (authorizedBranchIds.length === 0) {
            return [];
        }
        conditions.push((0, drizzle_orm_1.inArray)(schema_1.branches.id, authorizedBranchIds));
    }
    return await db_1.db
        .select({
        id: schema_1.branches.id,
        tenantId: schema_1.branches.tenantId,
        name: schema_1.branches.name,
        code: schema_1.branches.code,
        phone: schema_1.branches.phone,
        email: schema_1.branches.email,
        address: schema_1.branches.address,
        kraPin: schema_1.branches.kraPin,
        etimsBranchId: schema_1.branches.etimsBranchId,
        etimsDeviceSerial: schema_1.branches.etimsDeviceSerial,
        receiptFooter: schema_1.branches.receiptFooter,
        isMainBranch: schema_1.branches.isMainBranch,
        isActive: schema_1.branches.isActive,
        createdAt: schema_1.branches.createdAt,
        updatedAt: schema_1.branches.updatedAt,
    })
        .from(schema_1.branches)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.branches.isMainBranch), (0, drizzle_orm_1.asc)(schema_1.branches.name));
};
exports.findBranchesByTenantScope = findBranchesByTenantScope;
const createBranchTransaction = async (tenantId, payload, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [duplicate] = await tx
            .select({ id: schema_1.branches.id })
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.code, payload.code)))
            .limit(1);
        if (duplicate) {
            throw new Error(`Branch code '${payload.code}' is already registered for your organization.`);
        }
        // Maintain single Headquarters / Main Hub invariant per tenant
        if (payload.isMainBranch) {
            await tx
                .update(schema_1.branches)
                .set({ isMainBranch: false, updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isMainBranch, true)));
        }
        const [created] = await tx
            .insert(schema_1.branches)
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
        await tx.insert(schema_1.auditLogs).values({
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
exports.createBranchTransaction = createBranchTransaction;
const updateBranchTransaction = async (tenantId, branchId, payload, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, branchId), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            return null;
        }
        if (payload.code && payload.code !== existing.code) {
            const [duplicate] = await tx
                .select({ id: schema_1.branches.id })
                .from(schema_1.branches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.code, payload.code), (0, drizzle_orm_1.ne)(schema_1.branches.id, branchId)))
                .limit(1);
            if (duplicate) {
                throw new Error(`Branch code '${payload.code}' is already registered.`);
            }
        }
        if (payload.isMainBranch === true && !existing.isMainBranch) {
            await tx
                .update(schema_1.branches)
                .set({ isMainBranch: false, updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isMainBranch, true), (0, drizzle_orm_1.ne)(schema_1.branches.id, branchId)));
        }
        const updateSet = {
            updatedAt: new Date(),
        };
        if (payload.name !== undefined)
            updateSet.name = payload.name;
        if (payload.code !== undefined)
            updateSet.code = payload.code;
        if (payload.address !== undefined)
            updateSet.address = payload.address;
        if (payload.phone !== undefined)
            updateSet.phone = payload.phone;
        if (payload.email !== undefined)
            updateSet.email = payload.email;
        if (payload.kraPin !== undefined)
            updateSet.kraPin = payload.kraPin;
        if (payload.etimsBranchId !== undefined)
            updateSet.etimsBranchId = payload.etimsBranchId;
        if (payload.etimsDeviceSerial !== undefined) {
            updateSet.etimsDeviceSerial = payload.etimsDeviceSerial;
        }
        if (payload.receiptFooter !== undefined)
            updateSet.receiptFooter = payload.receiptFooter;
        if (payload.isMainBranch !== undefined)
            updateSet.isMainBranch = payload.isMainBranch;
        if (payload.isActive !== undefined)
            updateSet.isActive = payload.isActive;
        const [updated] = await tx
            .update(schema_1.branches)
            .set(updateSet)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, branchId), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
            .returning();
        await tx.insert(schema_1.auditLogs).values({
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
exports.updateBranchTransaction = updateBranchTransaction;
const toggleBranchStatusTransaction = async (tenantId, branchId, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, branchId), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            return null;
        }
        const nextActive = !existing.isActive;
        if (!nextActive) {
            if (existing.isMainBranch) {
                throw new Error('Cannot deactivate the primary Headquarters branch. Assign another outlet as Headquarters first.');
            }
            const [activeCountRow] = await tx
                .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(schema_1.branches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)));
            if ((activeCountRow?.count ?? 0) <= 1) {
                throw new Error('At least one operating branch must remain active.');
            }
        }
        const [updated] = await tx
            .update(schema_1.branches)
            .set({ isActive: nextActive, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, branchId), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
            .returning();
        await tx.insert(schema_1.auditLogs).values({
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
exports.toggleBranchStatusTransaction = toggleBranchStatusTransaction;
