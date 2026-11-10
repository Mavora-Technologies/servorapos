"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acknowledgeHandover = exports.updateHandover = exports.createHandover = exports.findHandoverById = exports.listHandovers = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listHandovers = async (tenantId, filters) => {
    const outgoingUsers = db_1.db
        .select({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        email: schema_1.users.email,
    })
        .from(schema_1.users)
        .as('outgoing_users');
    const incomingUsers = db_1.db
        .select({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        email: schema_1.users.email,
    })
        .from(schema_1.users)
        .as('incoming_users');
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId),
        filters.branchId ? (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.branchId, filters.branchId) : undefined,
        filters.shiftType && filters.shiftType !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.shiftType, filters.shiftType) : undefined,
        filters.status && filters.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.status, filters.status) : undefined,
        filters.startDate ? (0, drizzle_orm_1.gte)(schema_1.shiftHandovers.handoverDate, filters.startDate) : undefined,
        filters.endDate ? (0, drizzle_orm_1.lte)(schema_1.shiftHandovers.handoverDate, filters.endDate) : undefined,
    ].filter(Boolean);
    const entries = await db_1.db
        .select({
        id: schema_1.shiftHandovers.id,
        branchId: schema_1.shiftHandovers.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        shiftType: schema_1.shiftHandovers.shiftType,
        handoverDate: schema_1.shiftHandovers.handoverDate,
        cashStatus: schema_1.shiftHandovers.cashStatus,
        openingFloat: schema_1.shiftHandovers.openingFloat,
        closingCash: schema_1.shiftHandovers.closingCash,
        cashVariance: schema_1.shiftHandovers.cashVariance,
        operationalIncidents: schema_1.shiftHandovers.operationalIncidents,
        inventoryKitchenNotes: schema_1.shiftHandovers.inventoryKitchenNotes,
        hardwareMaintenanceNotes: schema_1.shiftHandovers.hardwareMaintenanceNotes,
        guestExperienceNotes: schema_1.shiftHandovers.guestExperienceNotes,
        checklistItems: schema_1.shiftHandovers.checklistItems,
        status: schema_1.shiftHandovers.status,
        outgoingSignedAt: schema_1.shiftHandovers.outgoingSignedAt,
        incomingSignedAt: schema_1.shiftHandovers.incomingSignedAt,
        outgoingManagerId: schema_1.shiftHandovers.outgoingManagerId,
        outgoingManagerName: (0, drizzle_orm_1.sql) `CONCAT(${outgoingUsers.firstName}, ' ', ${outgoingUsers.lastName})`,
        incomingManagerId: schema_1.shiftHandovers.incomingManagerId,
        incomingManagerName: (0, drizzle_orm_1.sql) `CONCAT(${incomingUsers.firstName}, ' ', ${incomingUsers.lastName})`,
        createdAt: schema_1.shiftHandovers.createdAt,
    })
        .from(schema_1.shiftHandovers)
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.branchId, schema_1.branches.id))
        .innerJoin(outgoingUsers, (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.outgoingManagerId, outgoingUsers.id))
        .leftJoin(incomingUsers, (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.incomingManagerId, incomingUsers.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.shiftHandovers.handoverDate), (0, drizzle_orm_1.desc)(schema_1.shiftHandovers.id));
    return entries;
};
exports.listHandovers = listHandovers;
const findHandoverById = async (tenantId, handoverId) => {
    const outgoingUsers = db_1.db
        .select({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
    })
        .from(schema_1.users)
        .as('outgoing_users');
    const incomingUsers = db_1.db
        .select({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
    })
        .from(schema_1.users)
        .as('incoming_users');
    const [handover] = await db_1.db
        .select({
        id: schema_1.shiftHandovers.id,
        branchId: schema_1.shiftHandovers.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        shiftType: schema_1.shiftHandovers.shiftType,
        handoverDate: schema_1.shiftHandovers.handoverDate,
        cashStatus: schema_1.shiftHandovers.cashStatus,
        openingFloat: schema_1.shiftHandovers.openingFloat,
        closingCash: schema_1.shiftHandovers.closingCash,
        cashVariance: schema_1.shiftHandovers.cashVariance,
        operationalIncidents: schema_1.shiftHandovers.operationalIncidents,
        inventoryKitchenNotes: schema_1.shiftHandovers.inventoryKitchenNotes,
        hardwareMaintenanceNotes: schema_1.shiftHandovers.hardwareMaintenanceNotes,
        guestExperienceNotes: schema_1.shiftHandovers.guestExperienceNotes,
        checklistItems: schema_1.shiftHandovers.checklistItems,
        status: schema_1.shiftHandovers.status,
        outgoingSignedAt: schema_1.shiftHandovers.outgoingSignedAt,
        incomingSignedAt: schema_1.shiftHandovers.incomingSignedAt,
        outgoingManagerId: schema_1.shiftHandovers.outgoingManagerId,
        outgoingManagerName: (0, drizzle_orm_1.sql) `CONCAT(${outgoingUsers.firstName}, ' ', ${outgoingUsers.lastName})`,
        incomingManagerId: schema_1.shiftHandovers.incomingManagerId,
        incomingManagerName: (0, drizzle_orm_1.sql) `CONCAT(${incomingUsers.firstName}, ' ', ${incomingUsers.lastName})`,
    })
        .from(schema_1.shiftHandovers)
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.branchId, schema_1.branches.id))
        .innerJoin(outgoingUsers, (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.outgoingManagerId, outgoingUsers.id))
        .leftJoin(incomingUsers, (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.incomingManagerId, incomingUsers.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.id, handoverId), (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)))
        .limit(1);
    return handover || null;
};
exports.findHandoverById = findHandoverById;
const createHandover = async (tenantId, outgoingManagerId, input) => {
    const [newHandover] = await db_1.db
        .insert(schema_1.shiftHandovers)
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
exports.createHandover = createHandover;
const updateHandover = async (tenantId, handoverId, input) => {
    const [existing] = await db_1.db
        .select({ id: schema_1.shiftHandovers.id, status: schema_1.shiftHandovers.status })
        .from(schema_1.shiftHandovers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.id, handoverId), (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)))
        .limit(1);
    if (!existing) {
        throw new Error('Shift handover report not found.');
    }
    if (existing.status === 'ACKNOWLEDGED') {
        throw new Error('Immutable handover log: Acknowledged reports cannot be edited.');
    }
    const [updated] = await db_1.db
        .update(schema_1.shiftHandovers)
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
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.id, handoverId), (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)))
        .returning();
    return updated;
};
exports.updateHandover = updateHandover;
const acknowledgeHandover = async (tenantId, handoverId, incomingManagerId) => {
    const [existing] = await db_1.db
        .select({
        id: schema_1.shiftHandovers.id,
        outgoingManagerId: schema_1.shiftHandovers.outgoingManagerId,
        status: schema_1.shiftHandovers.status,
    })
        .from(schema_1.shiftHandovers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.id, handoverId), (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)))
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
    const [acknowledged] = await db_1.db
        .update(schema_1.shiftHandovers)
        .set({
        incomingManagerId,
        status: 'ACKNOWLEDGED',
        incomingSignedAt: new Date(),
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.id, handoverId), (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)))
        .returning();
    return acknowledged;
};
exports.acknowledgeHandover = acknowledgeHandover;
