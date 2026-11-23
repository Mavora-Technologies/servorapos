// apps/api/src/controllers/unit-conversion.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as unitConversionService from '../services/unit-conversion.service';
import {
  createUnitConversionSchema,
  updateUnitConversionSchema,
} from '../validators/unit-conversion.validator';

export const getUnitConversions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const data = await unitConversionService.listTenantUnitConversions(tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch unit conversions';
    res.status(500).json({ status: 'error', message });
  }
};

export const createUnitConversion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createUnitConversionSchema.parse(req.body);
    const created = await unitConversionService.registerUnitConversion(tenantId, payload);
    res.status(201).json({ status: 'success', data: created });
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
      error instanceof Error ? error.message : 'Failed to create unit conversion rule';
    res.status(400).json({ status: 'error', message });
  }
};

export const updateUnitConversion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const conversionId = Number(req.params.id);
    if (!Number.isInteger(conversionId) || conversionId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid conversion rule ID' });
      return;
    }

    const payload = updateUnitConversionSchema.parse(req.body);
    const updated = await unitConversionService.modifyUnitConversion(
      tenantId,
      conversionId,
      payload
    );

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Unit conversion rule not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: updated });
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
      error instanceof Error ? error.message : 'Failed to update unit conversion rule';
    res.status(400).json({ status: 'error', message });
  }
};

export const deleteUnitConversion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const conversionId = Number(req.params.id);
    if (!Number.isInteger(conversionId) || conversionId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid conversion rule ID' });
      return;
    }

    const deleted = await unitConversionService.removeUnitConversion(tenantId, conversionId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Unit conversion rule not found' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Unit conversion rule deleted.' });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete unit conversion rule';
    res.status(500).json({ status: 'error', message });
  }
};