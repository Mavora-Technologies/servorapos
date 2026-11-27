// apps/api/src/controllers/pos-terminal.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as posRepo from '../repositories/pos-terminal.repository';
import { getUserAuthorizedBranches } from '../services/role.service';
import {
  posBootstrapQuerySchema,
  posCustomerSearchQuerySchema,
  posValidatePromoSchema,
  posValidateStockSchema,
  posPinSwitchSchema,
  assignStaffPosPinSchema,
} from '../validators/pos-terminal.validator';

export const getPosContext = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!tenantId || !userId || !role) {
      res.status(401).json({ status: 'error', message: 'Unauthorized terminal session' });
      return;
    }

    const parsed = posBootstrapQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: parsed.error.issues[0]?.message || 'Invalid branch parameter',
      });
      return;
    }

    const requestedBranchId = parsed.data.branchId;
    const authorized = await getUserAuthorizedBranches(tenantId, userId, role);
    const authorizedBranchIds = authorized === 'ALL' ? null : authorized;

    if (
      requestedBranchId !== undefined &&
      authorizedBranchIds !== null &&
      !authorizedBranchIds.includes(requestedBranchId)
    ) {
      res.status(403).json({
        status: 'error',
        message: 'You are not authorized to operate a POS terminal at the selected branch.',
      });
      return;
    }

    const context = await posRepo.getPosTerminalContext(
      tenantId,
      userId,
      requestedBranchId,
      authorizedBranchIds
    );

    res.status(200).json({ status: 'success', data: context });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to load POS terminal context';
    res.status(500).json({ status: 'error', message });
  }
};

export const searchPosCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parsed = posCustomerSearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(200).json({ status: 'success', data: [] });
      return;
    }

    const results = await posRepo.searchPosCustomersWithLoyalty(tenantId, parsed.data.search);
    res.status(200).json({ status: 'success', data: results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Customer search failed';
    res.status(500).json({ status: 'error', message });
  }
};

export const postValidatePromo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parsed = posValidatePromoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: parsed.error.issues[0]?.message || 'Invalid promo validation payload',
      });
      return;
    }

    const result = await posRepo.validatePosPromoCode(
      tenantId,
      parsed.data.code,
      parsed.data.subtotalKes
    );

    res.status(200).json({ status: 'success', data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Promo code invalid';
    res.status(400).json({ status: 'error', message });
  }
};

export const postValidateStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!tenantId || !userId || !role) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parsed = posValidateStockSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: parsed.error.issues[0]?.message || 'Invalid stock validation payload',
      });
      return;
    }

    const targetBranchId = parsed.data.branchId ?? req.user?.defaultBranchId ?? undefined;
    const authorized = await getUserAuthorizedBranches(tenantId, userId, role);

    if (
      targetBranchId !== undefined &&
      authorized !== 'ALL' &&
      !authorized.includes(targetBranchId)
    ) {
      res.status(403).json({
        status: 'error',
        message: 'Unauthorized branch scope for stock validation.',
      });
      return;
    }

    const validation = await posRepo.validateOrderStockAvailability(
      tenantId,
      parsed.data.items,
      targetBranchId
    );

    if (!validation.valid) {
      res.status(409).json({
        status: 'error',
        message: validation.shortages.map((s) => s.reason).join(' '),
        shortages: validation.shortages,
      });
      return;
    }

    res.status(200).json({ status: 'success', data: validation });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Stock validation failed';
    res.status(500).json({ status: 'error', message });
  }
};

export const getKioskOperators = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!tenantId || !userId || !role) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parsed = posBootstrapQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: parsed.error.issues[0]?.message || 'Invalid branch parameter',
      });
      return;
    }

    const branchId = parsed.data.branchId ?? req.user?.defaultBranchId ?? undefined;
    if (!branchId) {
      res.status(400).json({ status: 'error', message: 'Active branchId is required' });
      return;
    }

    const authorized = await getUserAuthorizedBranches(tenantId, userId, role);
    if (authorized !== 'ALL' && !authorized.includes(branchId)) {
      res.status(403).json({ status: 'error', message: 'Unauthorized branch scope' });
      return;
    }

    const operators = await posRepo.listBranchKioskOperators(tenantId, branchId);
    res.status(200).json({ status: 'success', data: operators });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load kiosk operators';
    res.status(500).json({ status: 'error', message });
  }
};

export const postPosPinSwitch = async (req: AuthRequest, res: Response): Promise<void> => {
  // Prevent globalAuditLogger from persisting plaintext PIN from req.body
  res.locals.auditLogged = true;

  try {
    const tenantId = req.user?.tenantId;
    const previousUserId = req.user?.userId;

    if (!tenantId || !previousUserId) {
      res.status(401).json({ status: 'error', message: 'Terminal session required' });
      return;
    }

    const parsed = posPinSwitchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: parsed.error.issues[0]?.message || 'Invalid PIN payload',
      });
      return;
    }

    const session = await posRepo.authenticatePosPinSwitch({
      tenantId,
      branchId: parsed.data.branchId,
      pin: parsed.data.pin,
      targetUserId: parsed.data.userId,
      previousUserId,
      ipAddress: req.ip || null,
    });

    res.status(200).json({
      status: 'success',
      data: session,
      message: `Switched active POS operator to ${session.user.fullName}.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'POS PIN authentication failed';
    res.status(401).json({ status: 'error', message });
  }
};

export const putStaffPosPin = async (req: AuthRequest, res: Response): Promise<void> => {
  // Prevent globalAuditLogger from persisting plaintext PIN from req.body
  res.locals.auditLogged = true;

  try {
    const tenantId = req.user?.tenantId;
    const actorUserId = req.user?.userId;

    if (!tenantId || !actorUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid staff user ID' });
      return;
    }

    const parsed = assignStaffPosPinSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: parsed.error.issues[0]?.message || 'PIN must be 4 to 6 numeric digits',
      });
      return;
    }

    const result = await posRepo.assignStaffPosPinTransaction({
      tenantId,
      targetUserId,
      pin: parsed.data.pin,
      actorUserId,
      ipAddress: req.ip || null,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: `POS PIN updated for ${result.fullName}.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to assign POS PIN';
    res.status(400).json({ status: 'error', message });
  }
};