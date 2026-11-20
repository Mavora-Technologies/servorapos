// apps/api/src/controllers/modifier.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as modifierService from '../services/modifier.service';
import {
  createModifierGroupSchema,
  updateModifierGroupSchema,
} from '../validators/modifier.validator';

export const getModifiers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groups = await modifierService.listTenantModifierGroups(tenantId);
    res.status(200).json({ status: 'success', data: groups });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch modifiers';
    res.status(500).json({ status: 'error', message });
  }
};

export const createModifierGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const validated = createModifierGroupSchema.parse(req.body);
    const createdGroup = await modifierService.registerModifierGroup(tenantId, validated);
    res.status(201).json({ status: 'success', data: createdGroup });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create modifier group';
    res.status(400).json({ status: 'error', message });
  }
};

export const updateModifierGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid modifier group ID' });
      return;
    }

    const validated = updateModifierGroupSchema.parse(req.body);
    const updated = await modifierService.modifyModifierGroup(tenantId, groupId, validated);

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Modifier group not found' });
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
    const message = error instanceof Error ? error.message : 'Failed to update modifier group';
    res.status(400).json({ status: 'error', message });
  }
};

export const deleteModifierGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid modifier group ID' });
      return;
    }

    const deleted = await modifierService.removeModifierGroup(tenantId, groupId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Modifier group not found' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Modifier group deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete modifier group';
    res.status(500).json({ status: 'error', message });
  }
};