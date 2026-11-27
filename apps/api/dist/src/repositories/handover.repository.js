"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDisputedHandoverTransaction = exports.disputeHandoverTransaction = exports.acknowledgeHandoverTransaction = exports.updateHandoverTransaction = exports.createHandoverTransaction = exports.getBranchHandoverContext = exports.findHandoverById = exports.listHandovers = void 0;
// apps/api/src/repositories/handover.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
function formatLocalIsoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
const listHandovers = async (tenantId, filters) => {
    const outgoingUsers = db_1.db
        .select({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        role: schema_1.users.role,
    })
        .from(schema_1.users)
        .as('outgoing_users');
    const incomingUsers = db_1.db
        .select({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        role: schema_1.users.role,
    })
        .from(schema_1.users)
        .as('incoming_users');
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)];
    if (filters.effectiveBranchIds !== null) {
        if (filters.effectiveBranchIds.length === 0)
            return [];
        conditions.push((0, drizzle_orm_1.inArray)(schema_1.shiftHandovers.branchId, filters.effectiveBranchIds));
    }
    if (filters.shiftType)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.shiftType, filters.shiftType));
    if (filters.status)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.status, filters.status));
    if (filters.startDate)
        conditions.push((0, drizzle_orm_1.gte)(schema_1.shiftHandovers.handoverDate, filters.startDate));
    if (filters.endDate)
        conditions.push((0, drizzle_orm_1.lte)(schema_1.shiftHandovers.handoverDate, filters.endDate));
    return await db_1.db
        .select({
        id: schema_1.shiftHandovers.id,
        branchId: schema_1.shiftHandovers.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        handoverScope: schema_1.shiftHandovers.handoverScope,
        cashierShiftId: schema_1.shiftHandovers.cashierShiftId,
        cashDrawerId: schema_1.shiftHandovers.cashDrawerId,
        drawerName: schema_1.cashDrawers.name,
        drawerCode: schema_1.cashDrawers.drawerCode,
        linkedAdjustmentId: schema_1.shiftHandovers.linkedAdjustmentId,
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
        resolutionNotes: schema_1.shiftHandovers.resolutionNotes,
        resolvedAt: schema_1.shiftHandovers.resolvedAt,
        outgoingManagerId: schema_1.shiftHandovers.outgoingManagerId,
        outgoingManagerName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${outgoingUsers.firstName}, ' ', ${outgoingUsers.lastName}))`,
        outgoingManagerRole: outgoingUsers.role,
        incomingManagerId: schema_1.shiftHandovers.incomingManagerId,
        incomingManagerName: (0, drizzle_orm_1.sql) `NULLIF(TRIM(CONCAT(${incomingUsers.firstName}, ' ', ${incomingUsers.lastName})), '')`,
        createdAt: schema_1.shiftHandovers.createdAt,
    })
        .from(schema_1.shiftHandovers)
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
        .innerJoin(outgoingUsers, (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.outgoingManagerId, outgoingUsers.id))
        .leftJoin(incomingUsers, (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.incomingManagerId, incomingUsers.id))
        .leftJoin(schema_1.cashDrawers, (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.cashDrawerId, schema_1.cashDrawers.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.shiftHandovers.handoverDate), (0, drizzle_orm_1.desc)(schema_1.shiftHandovers.id))
        .limit(200);
};
exports.listHandovers = listHandovers;
const findHandoverById = async (tenantId, handoverId) => {
    const outgoingUsers = db_1.db
        .select({ id: schema_1.users.id, firstName: schema_1.users.firstName, lastName: schema_1.users.lastName, role: schema_1.users.role })
        .from(schema_1.users)
        .as('outgoing_users');
    const incomingUsers = db_1.db
        .select({ id: schema_1.users.id, firstName: schema_1.users.firstName, lastName: schema_1.users.lastName })
        .from(schema_1.users)
        .as('incoming_users');
    const [handover] = await db_1.db
        .select({
        id: schema_1.shiftHandovers.id,
        branchId: schema_1.shiftHandovers.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        handoverScope: schema_1.shiftHandovers.handoverScope,
        cashierShiftId: schema_1.shiftHandovers.cashierShiftId,
        cashDrawerId: schema_1.shiftHandovers.cashDrawerId,
        drawerName: schema_1.cashDrawers.name,
        drawerCode: schema_1.cashDrawers.drawerCode,
        linkedAdjustmentId: schema_1.shiftHandovers.linkedAdjustmentId,
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
        resolutionNotes: schema_1.shiftHandovers.resolutionNotes,
        resolvedAt: schema_1.shiftHandovers.resolvedAt,
        outgoingManagerId: schema_1.shiftHandovers.outgoingManagerId,
        outgoingManagerName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${outgoingUsers.firstName}, ' ', ${outgoingUsers.lastName}))`,
        outgoingManagerRole: outgoingUsers.role,
        incomingManagerId: schema_1.shiftHandovers.incomingManagerId,
        incomingManagerName: (0, drizzle_orm_1.sql) `NULLIF(TRIM(CONCAT(${incomingUsers.firstName}, ' ', ${incomingUsers.lastName})), '')`,
    })
        .from(schema_1.shiftHandovers)
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
        .innerJoin(outgoingUsers, (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.outgoingManagerId, outgoingUsers.id))
        .leftJoin(incomingUsers, (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.incomingManagerId, incomingUsers.id))
        .leftJoin(schema_1.cashDrawers, (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.cashDrawerId, schema_1.cashDrawers.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.id, handoverId), (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)))
        .limit(1);
    return handover ?? null;
};
exports.findHandoverById = findHandoverById;
/**
 * Live Branch Context for Handover Modal:
 * - Selectable cashier shifts for that branch & date (with cashier name + live float/expected/counted)
 * - Physical cash drawers in that branch
 * - Eligible incoming managers cleared for that branch
 * - Branch-wide treasury, KDS, 86ed, and on-duty counts
 */
const getBranchHandoverContext = async (tenantId, branchId, dateStr) => {
    const targetDate = dateStr || formatLocalIsoDate(new Date());
    const branchMemberSubquery = db_1.db
        .select({ userId: schema_1.userBranchMemberships.userId })
        .from(schema_1.userBranchMemberships)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.branchId, branchId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true)));
    const [branchShifts, branchDrawers, activeDrawerSessions, eligibleManagers, [kdsAgg], items86edRows, [onDutyAgg], [finSettings],] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.cashierShifts.id,
            cashierId: schema_1.cashierShifts.cashierId,
            cashierName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            cashierRole: schema_1.users.role,
            openingFloat: schema_1.cashierShifts.openingFloat,
            expectedCash: schema_1.cashierShifts.expectedCash,
            countedCash: schema_1.cashierShifts.countedCash,
            variance: schema_1.cashierShifts.variance,
            status: schema_1.cashierShifts.status,
            openedAt: schema_1.cashierShifts.openedAt,
            closedAt: schema_1.cashierShifts.closedAt,
        })
            .from(schema_1.cashierShifts)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, schema_1.users.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, branchId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.sql) `date(${schema_1.cashierShifts.openedAt}) = ${targetDate}::date`, (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'OPEN'))))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.cashierShifts.openedAt)),
        db_1.db
            .select({
            id: schema_1.cashDrawers.id,
            drawerCode: schema_1.cashDrawers.drawerCode,
            name: schema_1.cashDrawers.name,
            status: schema_1.cashDrawers.status,
            currentBalance: schema_1.cashDrawers.currentBalance,
        })
            .from(schema_1.cashDrawers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.cashDrawers.branchId))))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.cashDrawers.drawerCode)),
        db_1.db
            .select({
            drawerId: schema_1.drawerSessions.drawerId,
            cashierId: schema_1.drawerSessions.cashierId,
            expectedClosingBalance: schema_1.drawerSessions.expectedClosingBalance,
        })
            .from(schema_1.drawerSessions)
            .innerJoin(schema_1.cashDrawers, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.drawerId, schema_1.cashDrawers.id), (0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashDrawers.branchId, branchId), (0, drizzle_orm_1.inArray)(schema_1.drawerSessions.status, ['OPEN', 'ACTIVE']))),
        db_1.db
            .select({
            id: schema_1.users.id,
            fullName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            role: schema_1.users.role,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.users.role, ['ADMIN', 'SUPER_ADMIN']), (0, drizzle_orm_1.eq)(schema_1.users.defaultBranchId, branchId), (0, drizzle_orm_1.inArray)(schema_1.users.id, branchMemberSubquery))))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.users.firstName)),
        db_1.db
            .select({ openTicketsCount: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.orders.branchId, branchId), (0, drizzle_orm_1.inArray)(schema_1.orders.status, ['Confirmed', 'Sent-To-Kitchen', 'Preparing', 'Ready']))),
        db_1.db
            .select({ name: schema_1.menuItems.name, reason: schema_1.menuItemAvailability.reason })
            .from(schema_1.menuItemAvailability)
            .innerJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.menuItemId, schema_1.menuItems.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.branchId, branchId), (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.is86ed, true)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.menuItems.name))
            .limit(15),
        db_1.db
            .select({ onDutyCount: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.branchId, branchId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.status, 'ON_DUTY'))),
        db_1.db
            .select({ baseCurrency: schema_1.tenantFinancialSettings.baseCurrency })
            .from(schema_1.tenantFinancialSettings)
            .where((0, drizzle_orm_1.eq)(schema_1.tenantFinancialSettings.tenantId, tenantId))
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
exports.getBranchHandoverContext = getBranchHandoverContext;
const createHandoverTransaction = async (tenantId, outgoingManagerId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [branchRow] = await tx
            .select({ id: schema_1.branches.id, name: schema_1.branches.name })
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, input.branchId), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)))
            .limit(1);
        if (!branchRow)
            throw new Error('Selected branch does not exist or is inactive.');
        if (input.cashierShiftId) {
            const [shiftRow] = await tx
                .select({ id: schema_1.cashierShifts.id })
                .from(schema_1.cashierShifts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.id, input.cashierShiftId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, input.branchId)))
                .limit(1);
            if (!shiftRow) {
                throw new Error('Selected cashier shift does not belong to this branch.');
            }
        }
        if (input.cashDrawerId) {
            const [drawerRow] = await tx
                .select({ id: schema_1.cashDrawers.id })
                .from(schema_1.cashDrawers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, input.cashDrawerId), (0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.branchId, input.branchId), (0, drizzle_orm_1.isNull)(schema_1.cashDrawers.branchId))))
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
                .select({ id: schema_1.users.id })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, input.incomingManagerId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)))
                .limit(1);
            if (!incomingUser)
                throw new Error('Selected incoming manager is invalid or inactive.');
        }
        const [created] = await tx
            .insert(schema_1.shiftHandovers)
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
        await tx.insert(schema_1.auditLogs).values({
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
            await tx.insert(schema_1.notifications).values({
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
exports.createHandoverTransaction = createHandoverTransaction;
const updateHandoverTransaction = async (tenantId, handoverId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.shiftHandovers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.id, handoverId), (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
        if (existing.status === 'ACKNOWLEDGED' || existing.status === 'RESOLVED') {
            throw new Error('Immutable handover log: Countersigned/resolved reports cannot be edited.');
        }
        const [updated] = await tx
            .update(schema_1.shiftHandovers)
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
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.id, handoverId), (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)))
            .returning();
        await tx.insert(schema_1.auditLogs).values({
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
exports.updateHandoverTransaction = updateHandoverTransaction;
const acknowledgeHandoverTransaction = async (tenantId, handoverId, incomingManagerId, notes, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.shiftHandovers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.id, handoverId), (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
        if (existing.outgoingManagerId === incomingManagerId) {
            throw new Error('Dual-signature governance: The incoming manager must be a different supervisor than the outgoing manager.');
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
                .insert(schema_1.financialAdjustments)
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
                .returning({ id: schema_1.financialAdjustments.id });
            linkedAdjustmentId = adj.id;
        }
        const updatedIncidents = notes
            ? [existing.operationalIncidents, `[Incoming Countersign Note]: ${notes}`]
                .filter(Boolean)
                .join('\n')
            : existing.operationalIncidents;
        const [acknowledged] = await tx
            .update(schema_1.shiftHandovers)
            .set({
            incomingManagerId,
            linkedAdjustmentId,
            status: 'ACKNOWLEDGED',
            incomingSignedAt: new Date(),
            operationalIncidents: updatedIncidents,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.id, handoverId), (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)))
            .returning();
        // Resolve any pending handover notifications
        await tx
            .update(schema_1.notifications)
            .set({ isRead: true, isResolved: true, resolvedAt: new Date(), resolvedByUserId: incomingManagerId })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.notifications.entityType, 'shift_handovers'), (0, drizzle_orm_1.eq)(schema_1.notifications.entityId, String(handoverId)), (0, drizzle_orm_1.eq)(schema_1.notifications.isResolved, false)));
        await tx.insert(schema_1.auditLogs).values({
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
exports.acknowledgeHandoverTransaction = acknowledgeHandoverTransaction;
const disputeHandoverTransaction = async (tenantId, handoverId, incomingManagerId, reason, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.shiftHandovers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.id, handoverId), (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
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
            .update(schema_1.shiftHandovers)
            .set({
            incomingManagerId,
            status: 'DISPUTED',
            incomingSignedAt: new Date(),
            operationalIncidents: updatedIncidents,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.id, handoverId), (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)))
            .returning();
        await tx.insert(schema_1.auditLogs).values({
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
        await tx.insert(schema_1.notifications).values({
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
exports.disputeHandoverTransaction = disputeHandoverTransaction;
const resolveDisputedHandoverTransaction = async (tenantId, handoverId, resolutionNotes, postGlAdjustment, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.shiftHandovers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.id, handoverId), (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
        if (existing.status !== 'DISPUTED') {
            throw new Error('Only DISPUTED handovers can be resolved through governance escalation.');
        }
        let linkedAdjustmentId = existing.linkedAdjustmentId;
        const varianceNum = Number(existing.cashVariance) || 0;
        if (postGlAdjustment && varianceNum !== 0 && !linkedAdjustmentId) {
            const isShortage = varianceNum < 0;
            const [adj] = await tx
                .insert(schema_1.financialAdjustments)
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
                .returning({ id: schema_1.financialAdjustments.id });
            linkedAdjustmentId = adj.id;
        }
        const [resolved] = await tx
            .update(schema_1.shiftHandovers)
            .set({
            status: 'RESOLVED',
            linkedAdjustmentId,
            resolutionNotes,
            resolvedByUserId: actor.userId,
            resolvedAt: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shiftHandovers.id, handoverId), (0, drizzle_orm_1.eq)(schema_1.shiftHandovers.tenantId, tenantId)))
            .returning();
        await tx
            .update(schema_1.notifications)
            .set({ isRead: true, isResolved: true, resolvedAt: new Date(), resolvedByUserId: actor.userId })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.notifications.entityType, 'shift_handovers'), (0, drizzle_orm_1.eq)(schema_1.notifications.entityId, String(handoverId)), (0, drizzle_orm_1.eq)(schema_1.notifications.isResolved, false)));
        await tx.insert(schema_1.auditLogs).values({
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
exports.resolveDisputedHandoverTransaction = resolveDisputedHandoverTransaction;
