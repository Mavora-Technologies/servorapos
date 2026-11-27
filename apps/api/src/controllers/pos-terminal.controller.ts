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