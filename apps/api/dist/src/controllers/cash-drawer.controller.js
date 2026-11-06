"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCashDrawer = exports.createCashDrawerSchema = exports.closeDrawerSession = exports.recordCashDrop = exports.openDrawerSession = exports.getDrawersDashboard = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const zod_1 = require("zod");
const schema_1 = require("../config/schema");
const cash_drawer_validator_1 = require("../validators/cash-drawer.validator");
// 1. Get Drawers & Active Sessions Dashboard
const getDrawersDashboard = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const drawers = await db_1.db
            .select()
            .from(schema_1.cashDrawers)
            .where((0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId))
            .orderBy(schema_1.cashDrawers.name);
        const activeSessions = await db_1.db
            .select({
            id: schema_1.drawerSessions.id,
            drawerId: schema_1.drawerSessions.drawerId,
            drawerName: schema_1.cashDrawers.name,
            drawerCode: schema_1.cashDrawers.drawerCode,
            status: schema_1.drawerSessions.status,
            openingFloat: schema_1.drawerSessions.openingFloat,
            cashSalesTotal: schema_1.drawerSessions.cashSalesTotal,
            expectedClosingBalance: schema_1.drawerSessions.expectedClosingBalance,
            cashierEmail: schema_1.users.email,
            openedAt: schema_1.drawerSessions.openedAt,
        })
            .from(schema_1.drawerSessions)
            .innerJoin(schema_1.cashDrawers, (0, drizzle_orm_1.eq)(schema_1.drawerSessions.drawerId, schema_1.cashDrawers.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.drawerSessions.cashierId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.drawerSessions.status} != 'CLOSED_RECONCILED'`))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.drawerSessions.openedAt));
        let totalFloatLiquidity = 0;
        drawers.forEach((d) => {
            totalFloatLiquidity += parseFloat(d.currentBalance) || 0;
        });
        res.status(200).json({
            status: 'success',
            data: {
                summary: {
                    totalDrawersCount: drawers.length,
                    activeSessionsCount: activeSessions.length,
                    totalFloatLiquidity: Number(totalFloatLiquidity.toFixed(2)),
                },
                drawers,
                activeSessions,
            },
        });
    }
    catch (error) {
        console.error('[Get Drawers Error]:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getDrawersDashboard = getDrawersDashboard;
// 2. Open Cash Drawer Session
const openDrawerSession = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = cash_drawer_validator_1.openDrawerSessionSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const [drawer] = await tx
                .select()
                .from(schema_1.cashDrawers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, payload.drawerId), (0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId)))
                .limit(1);
            if (!drawer)
                throw new Error('Cash drawer terminal not found');
            if (drawer.status === 'OPEN')
                throw new Error('Drawer is already open with an active session');
            // 1. Mark drawer OPEN
            await tx
                .update(schema_1.cashDrawers)
                .set({
                status: 'OPEN',
                currentBalance: payload.openingFloat.toFixed(4),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, drawer.id));
            // 2. Insert Drawer Session
            const [session] = await tx
                .insert(schema_1.drawerSessions)
                .values({
                tenantId: Number(tenantId),
                drawerId: drawer.id,
                cashierId: userId ? Number(userId) : null,
                status: 'ACTIVE',
                openingFloat: payload.openingFloat.toFixed(4),
                expectedClosingBalance: payload.openingFloat.toFixed(4),
                notes: payload.notes || 'Shift float initialized',
            })
                .returning();
            return session;
        });
        res.status(201).json({ status: 'success', message: 'Cash drawer session opened successfully', data: result });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.openDrawerSession = openDrawerSession;
// 3. Record Cash Drop / Safe Transfer
const recordCashDrop = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = cash_drawer_validator_1.cashDropSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const [session] = await tx
                .select()
                .from(schema_1.drawerSessions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.id, payload.sessionId), (0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId)))
                .limit(1);
            if (!session)
                throw new Error('Active drawer session not found');
            const currentDrops = parseFloat(session.cashDropsTotal) || 0;
            const expected = parseFloat(session.expectedClosingBalance) || 0;
            const newDrops = currentDrops + payload.amount;
            const newExpected = Math.max(0, expected - payload.amount);
            const [updatedSession] = await tx
                .update(schema_1.drawerSessions)
                .set({
                cashDropsTotal: newDrops.toFixed(4),
                expectedClosingBalance: newExpected.toFixed(4),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.drawerSessions.id, session.id))
                .returning();
            return updatedSession;
        });
        res.status(200).json({ status: 'success', message: 'Cash drop to safe recorded', data: result });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.recordCashDrop = recordCashDrop;
// 4. Close & Reconcile Drawer Session
const closeDrawerSession = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = cash_drawer_validator_1.closeDrawerSessionSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const [session] = await tx
                .select()
                .from(schema_1.drawerSessions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId)))
                .limit(1);
            if (!session)
                throw new Error('Drawer session not found');
            if (session.status === 'CLOSED_RECONCILED')
                throw new Error('Session is already closed and reconciled');
            const expected = parseFloat(session.expectedClosingBalance) || 0;
            const actual = payload.actualClosingBalance;
            const variance = Number((actual - expected).toFixed(4));
            // 1. Close session
            const [closedSession] = await tx
                .update(schema_1.drawerSessions)
                .set({
                status: 'CLOSED_RECONCILED',
                actualClosingBalance: actual.toFixed(4),
                variance: variance.toFixed(4),
                denominations: payload.denominations || {},
                supervisorId: userId ? Number(userId) : null,
                closedAt: new Date(),
                notes: payload.notes ? `Closed. Note: ${payload.notes}` : 'Shift closed and reconciled',
            })
                .where((0, drizzle_orm_1.eq)(schema_1.drawerSessions.id, session.id))
                .returning();
            // 2. Lock drawer status to CLOSED
            await tx
                .update(schema_1.cashDrawers)
                .set({
                status: 'CLOSED',
                currentBalance: '0.0000',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, session.drawerId));
            return closedSession;
        });
        res.status(200).json({ status: 'success', message: 'Drawer session closed and reconciled', data: result });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.closeDrawerSession = closeDrawerSession;
exports.createCashDrawerSchema = zod_1.z.object({
    drawerCode: zod_1.z.string().min(2, 'Drawer code/number is required').trim(),
    name: zod_1.z.string().min(2, 'Terminal name is required').trim(),
});
const createCashDrawer = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rawBranchId = req.user?.defaultBranchId;
        const branchId = rawBranchId ? Number(rawBranchId) : null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = exports.createCashDrawerSchema.parse(req.body);
        const [newDrawer] = await db_1.db
            .insert(schema_1.cashDrawers)
            .values({
            tenantId: Number(tenantId),
            branchId,
            drawerCode: payload.drawerCode,
            name: payload.name,
            status: 'CLOSED',
            currentBalance: '0.0000',
        })
            .returning();
        res.status(201).json({ status: 'success', message: 'POS terminal registered successfully', data: newDrawer });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.createCashDrawer = createCashDrawer;
