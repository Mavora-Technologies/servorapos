import { Response } from 'express';
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { z } from 'zod';
import { cashDrawers, drawerSessions, users, branches } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { 
  openDrawerSessionSchema, 
  closeDrawerSessionSchema, 
  cashDropSchema 
} from '../validators/cash-drawer.validator';

// 1. Get Drawers & Active Sessions Dashboard
export const getDrawersDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const drawers = await db
      .select()
      .from(cashDrawers)
      .where(eq(cashDrawers.tenantId, tenantId))
      .orderBy(cashDrawers.name);

    const activeSessions = await db
      .select({
        id: drawerSessions.id,
        drawerId: drawerSessions.drawerId,
        drawerName: cashDrawers.name,
        drawerCode: cashDrawers.drawerCode,
        status: drawerSessions.status,
        openingFloat: drawerSessions.openingFloat,
        cashSalesTotal: drawerSessions.cashSalesTotal,
        expectedClosingBalance: drawerSessions.expectedClosingBalance,
        cashierEmail: users.email,
        openedAt: drawerSessions.openedAt,
      })
      .from(drawerSessions)
      .innerJoin(cashDrawers, eq(drawerSessions.drawerId, cashDrawers.id))
      .leftJoin(users, eq(drawerSessions.cashierId, users.id))
      .where(and(eq(drawerSessions.tenantId, tenantId), sql`${drawerSessions.status} != 'CLOSED_RECONCILED'`))
      .orderBy(desc(drawerSessions.openedAt));

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
  } catch (error: any) {
    console.error('[Get Drawers Error]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Open Cash Drawer Session
export const openDrawerSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = openDrawerSessionSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const [drawer] = await tx
        .select()
        .from(cashDrawers)
        .where(and(eq(cashDrawers.id, payload.drawerId), eq(cashDrawers.tenantId, tenantId)))
        .limit(1);

      if (!drawer) throw new Error('Cash drawer terminal not found');
      if (drawer.status === 'OPEN') throw new Error('Drawer is already open with an active session');

      // 1. Mark drawer OPEN
      await tx
        .update(cashDrawers)
        .set({
          status: 'OPEN',
          currentBalance: payload.openingFloat.toFixed(4),
          updatedAt: new Date(),
        })
        .where(eq(cashDrawers.id, drawer.id));

      // 2. Insert Drawer Session
      const [session] = await tx
        .insert(drawerSessions)
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
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 3. Record Cash Drop / Safe Transfer
export const recordCashDrop = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = cashDropSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(drawerSessions)
        .where(and(eq(drawerSessions.id, payload.sessionId), eq(drawerSessions.tenantId, tenantId)))
        .limit(1);

      if (!session) throw new Error('Active drawer session not found');

      const currentDrops = parseFloat(session.cashDropsTotal) || 0;
      const expected = parseFloat(session.expectedClosingBalance) || 0;
      const newDrops = currentDrops + payload.amount;
      const newExpected = Math.max(0, expected - payload.amount);

      const [updatedSession] = await tx
        .update(drawerSessions)
        .set({
          cashDropsTotal: newDrops.toFixed(4),
          expectedClosingBalance: newExpected.toFixed(4),
        })
        .where(eq(drawerSessions.id, session.id))
        .returning();

      return updatedSession;
    });

    res.status(200).json({ status: 'success', message: 'Cash drop to safe recorded', data: result });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 4. Close & Reconcile Drawer Session
export const closeDrawerSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = closeDrawerSessionSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(drawerSessions)
        .where(and(eq(drawerSessions.id, Number(id)), eq(drawerSessions.tenantId, tenantId)))
        .limit(1);

      if (!session) throw new Error('Drawer session not found');
      if (session.status === 'CLOSED_RECONCILED') throw new Error('Session is already closed and reconciled');

      const expected = parseFloat(session.expectedClosingBalance) || 0;
      const actual = payload.actualClosingBalance;
      const variance = Number((actual - expected).toFixed(4));

      // 1. Close session
      const [closedSession] = await tx
        .update(drawerSessions)
        .set({
          status: 'CLOSED_RECONCILED',
          actualClosingBalance: actual.toFixed(4),
          variance: variance.toFixed(4),
          denominations: payload.denominations || {},
          supervisorId: userId ? Number(userId) : null,
          closedAt: new Date(),
          notes: payload.notes ? `Closed. Note: ${payload.notes}` : 'Shift closed and reconciled',
        })
        .where(eq(drawerSessions.id, session.id))
        .returning();

      // 2. Lock drawer status to CLOSED
      await tx
        .update(cashDrawers)
        .set({
          status: 'CLOSED',
          currentBalance: '0.0000',
          updatedAt: new Date(),
        })
        .where(eq(cashDrawers.id, session.drawerId));

      return closedSession;
    });

    res.status(200).json({ status: 'success', message: 'Drawer session closed and reconciled', data: result });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const createCashDrawerSchema = z.object({
  drawerCode: z.string().min(2, 'Drawer code/number is required').trim(),
  name: z.string().min(2, 'Terminal name is required').trim(),
});

export const createCashDrawer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const rawBranchId = req.user?.defaultBranchId;
    const branchId = rawBranchId ? Number(rawBranchId) : null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createCashDrawerSchema.parse(req.body);

    const [newDrawer] = await db
      .insert(cashDrawers)
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
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};