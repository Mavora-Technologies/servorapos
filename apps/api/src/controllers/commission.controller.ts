// apps/api/src/controllers/commission.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as commissionService from '../services/commission.service';
import {
  createCommissionPlanSchema,
  updateCommissionPlanSchema,
  previewCommissionQuerySchema,
  generatePayoutRunSchema,
  settlePayoutRunSchema,
} from '../validators/commission.validator';

function getActor(req: AuthRequest) {
  const user = req.user;
  if (!user?.tenantId || !user?.userId) return null;
  return {
    tenantId: user.tenantId,
    userId: user.userId,
    role: user.role,
    ipAddress: req.ip || null,
  };
}

function parseOptionalBranchId(raw: unknown): number | undefined {
  if (typeof raw !== 'string' || raw === '' || raw === 'ALL') return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export const getPlans = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = parseOptionalBranchId(req.query.branchId);
    const plans = await commissionService.fetchPlans(actor, branchId);
    res.status(200).json({ status: 'success', data: plans });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch commission plans';
    res.status(400).json({ status: 'error', message });
  }
};

export const postPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createCommissionPlanSchema.parse(req.body);
    const plan = await commissionService.provisionPlan(actor, input);
    res.status(201).json({
      status: 'success',
      data: plan,
      message: `Commission plan "${plan.name}" created.`,
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
    const message = error instanceof Error ? error.message : 'Failed to create commission plan';
    res.status(400).json({ status: 'error', message });
  }
};

export const putPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const planId = Number(req.params.id);
    if (!Number.isInteger(planId) || planId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid plan identifier' });
      return;
    }

    const input = updateCommissionPlanSchema.parse(req.body);
    const updated = await commissionService.modifyPlan(actor, planId, input);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Commission plan not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Commission plan updated successfully.',
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
    const message = error instanceof Error ? error.message : 'Failed to update commission plan';
    res.status(400).json({ status: 'error', message });
  }
};

export const getPreview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = previewCommissionQuerySchema.parse(req.query);
    const preview = await commissionService.previewCommissions(actor, query);
    res.status(200).json({ status: 'success', data: preview });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Invalid preview parameters',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to calculate commissions';
    res.status(400).json({ status: 'error', message });
  }
};

export const getRuns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = parseOptionalBranchId(req.query.branchId);
    const runs = await commissionService.fetchPayoutRuns(actor, branchId);
    res.status(200).json({ status: 'success', data: runs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payout runs';
    res.status(400).json({ status: 'error', message });
  }
};

export const postGenerateRun = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = generatePayoutRunSchema.parse(req.body);
    const run = await commissionService.generateRun(actor, input);
    res.status(201).json({
      status: 'success',
      data: run,
      message: `Commission run ${run.runNumber} generated as Draft.`,
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
    const message = error instanceof Error ? error.message : 'Failed to generate commission run';
    res.status(400).json({ status: 'error', message });
  }
};

export const postApproveRun = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const runId = Number(req.params.id);
    if (!Number.isInteger(runId) || runId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid payout run identifier' });
      return;
    }

    const approved = await commissionService.approveRun(actor, runId);
    if (!approved) {
      res.status(404).json({ status: 'error', message: 'Commission payout run not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: approved,
      message: `Commission run ${approved.runNumber} approved for disbursement.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to approve commission run';
    res.status(400).json({ status: 'error', message });
  }
};

export const postSettleRun = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const runId = Number(req.params.id);
    if (!Number.isInteger(runId) || runId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid payout run identifier' });
      return;
    }

    const input = settlePayoutRunSchema.parse(req.body);
    const settled = await commissionService.settleRun(actor, runId, input);
    if (!settled) {
      res.status(404).json({ status: 'error', message: 'Commission payout run not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: settled,
      message: `Commission run ${settled.runNumber} settled and associates notified.`,
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
    const message = error instanceof Error ? error.message : 'Failed to settle commission run';
    res.status(400).json({ status: 'error', message });
  }
};