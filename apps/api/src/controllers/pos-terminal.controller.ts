import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as posRepo from '../repositories/pos-terminal.repository';
import {
  posBootstrapQuerySchema,
  posCustomerSearchQuerySchema,
  posValidatePromoSchema,
} from '../validators/pos-terminal.validator';

export const getPosContext = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized terminal session' });
      return;
    }

    const parsed = posBootstrapQuerySchema.safeParse(req.query);
    const branchId = parsed.success ? parsed.data.branchId : undefined;

    const context = await posRepo.getPosTerminalContext(tenantId, userId, branchId);
    res.status(200).json({ status: 'success', data: context });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to load POS terminal context' });
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
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Customer search failed' });
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
      res.status(400).json({ status: 'error', message: 'Invalid promo validation payload' });
      return;
    }

    const result = await posRepo.validatePosPromoCode(
      tenantId,
      parsed.data.code,
      parsed.data.subtotalKes
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Promo code invalid' });
  }
};