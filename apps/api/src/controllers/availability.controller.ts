// apps/api/src/controllers/availability.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as availabilityService from '../services/availability.service';
import {
  availabilityQuerySchema,
  updateAvailabilitySchema,
  bulkAvailabilityToggleSchema,
} from '../validators/availability.validator';

export const getAvailabilityOverview = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const parsedQuery = availabilityQuerySchema.safeParse(req.query);
    const branchId = parsedQuery.success
      ? parsedQuery.data.branchId ?? req.user?.defaultBranchId ?? undefined
      : req.user?.defaultBranchId ?? undefined;

    const data = await availabilityService.fetchTenantAvailabilityOverview(tenantId, branchId);
    res.status(200).json({ status: 'success', data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch menu availability';
    res.status(500).json({ status: 'error', message });
  }
};

export const updateItemAvailability = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = updateAvailabilitySchema.parse(req.body);
    const defaultBranchId = req.user?.defaultBranchId ?? null;

    const updated = await availabilityService.toggleSingleItemAvailability(
      tenantId,
      defaultBranchId,
      payload
    );

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Menu item not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: payload.is86ed
        ? 'Item marked 86 (Out of Stock).'
        : 'Item availability updated.',
      data: updated,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message =
      error instanceof Error ? error.message : 'Failed to update item availability';
    res.status(400).json({ status: 'error', message });
  }
};

export const bulkUpdateItemAvailability = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = bulkAvailabilityToggleSchema.parse(req.body);
    const defaultBranchId = req.user?.defaultBranchId ?? null;

    const result = await availabilityService.bulkToggleItemAvailability(
      tenantId,
      defaultBranchId,
      payload
    );

    res.status(200).json({
      status: 'success',
      message: payload.is86ed
        ? `Marked ${result.updatedCount} item(s) as 86'd.`
        : `Restocked ${result.updatedCount} item(s).`,
      data: result,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message =
      error instanceof Error ? error.message : 'Failed to bulk update availability';
    res.status(400).json({ status: 'error', message });
  }
};