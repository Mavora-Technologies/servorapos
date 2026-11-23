// apps/api/src/controllers/recipe.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as recipeService from '../services/recipe.service';
import { upsertRecipeSchema } from '../validators/recipe.validator';

export const getRecipesOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const data = await recipeService.fetchTenantRecipesOverview(tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch recipes';
    res.status(500).json({ status: 'error', message });
  }
};

export const saveRecipe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = upsertRecipeSchema.parse(req.body);
    const defaultBranchId = req.user?.defaultBranchId ?? null;

    const saved = await recipeService.saveTenantRecipe(tenantId, defaultBranchId, payload);

    res.status(200).json({
      status: 'success',
      message: 'Recipe specification and COGS saved successfully.',
      data: saved,
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
    const message = error instanceof Error ? error.message : 'Failed to save recipe specification';
    res.status(400).json({ status: 'error', message });
  }
};

export const deleteRecipe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const recipeId = Number(req.params.id);
    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid recipe ID' });
      return;
    }

    const deleted = await recipeService.removeTenantRecipe(tenantId, recipeId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Recipe specification not found' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Recipe specification deleted.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete recipe';
    res.status(500).json({ status: 'error', message });
  }
};