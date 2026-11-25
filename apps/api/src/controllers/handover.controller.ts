// apps/api/src/controllers/handover.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as handoverService from '../services/handover.service';
import {
  listHandoversQuerySchema,
  handoverContextQuerySchema,
  createHandoverSchema,
  updateHandoverSchema,
  acknowledgeHandoverSchema,
  disputeHandoverSchema,
  resolveDisputeSchema,
} from '../validators/handover.validator';

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

export const getHandovers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = listHandoversQuerySchema.parse(req.query);
    const entries = await handoverService.fetchHandoverLogs(actor, query);

    res.status(200).json({ status: 'success', data: entries });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Invalid filter parameters',
        errors: error.issues,
      });
      return;
    }
    const message =
      error instanceof Error ? error.message : 'Failed to retrieve handover logs';
    res.status(400).json({ status: 'error', message });
  }
};

export const getHandoverContext = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = handoverContextQuerySchema.parse(req.query);
    const snapshot = await handoverService.fetchBranchContextSnapshot(actor, query);

    res.status(200).json({ status: 'success', data: snapshot });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Invalid context parameters',
        errors: error.issues,
      });
      return;
    }
    const message =
      error instanceof Error ? error.message : 'Failed to load branch handover telemetry';
    res.status(400).json({ status: 'error', message });
  }
};

export const getHandoverDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const handoverId = Number(req.params.id);
    if (!Number.isInteger(handoverId) || handoverId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid handover identifier' });
      return;
    }

    const entry = await handoverService.fetchHandoverById(actor, handoverId);
    if (!entry) {
      res.status(404).json({ status: 'error', message: 'Handover report not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: entry });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch handover detail';
    res.status(400).json({ status: 'error', message });
  }
};

export const postHandover = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createHandoverSchema.parse(req.body);
    const handover = await handoverService.submitHandover(actor, input);

    res.status(201).json({
      status: 'success',
      data: handover,
      message: 'Manager shift handover successfully submitted.',
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
    const message = error instanceof Error ? error.message : 'Failed to submit handover';
    res.status(400).json({ status: 'error', message });
  }
};

export const putHandover = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const handoverId = Number(req.params.id);
    if (!Number.isInteger(handoverId) || handoverId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid handover identifier' });
      return;
    }

    const input = updateHandoverSchema.parse(req.body);
    const updated = await handoverService.modifyHandover(actor, handoverId, input);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Handover report not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Shift handover report updated successfully.',
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
    const message = error instanceof Error ? error.message : 'Failed to update handover';
    res.status(400).json({ status: 'error', message });
  }
};

export const postAcknowledge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const handoverId = Number(req.params.id);
    if (!Number.isInteger(handoverId) || handoverId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid handover identifier' });
      return;
    }

    const input = acknowledgeHandoverSchema.parse(req.body || {});
    const acknowledged = await handoverService.countersignHandover(
      actor,
      handoverId,
      input.notes
    );
    if (!acknowledged) {
      res.status(404).json({ status: 'error', message: 'Handover report not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: acknowledged,
      message: 'Shift handover officially acknowledged and digitally countersigned.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to acknowledge handover';
    res.status(400).json({ status: 'error', message });
  }
};

export const postDispute = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const handoverId = Number(req.params.id);
    if (!Number.isInteger(handoverId) || handoverId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid handover identifier' });
      return;
    }

    const { reason } = disputeHandoverSchema.parse(req.body);
    const disputed = await handoverService.escalateHandoverDispute(actor, handoverId, reason);
    if (!disputed) {
      res.status(404).json({ status: 'error', message: 'Handover report not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: disputed,
      message: 'Shift handover disputed and escalated to compliance governance.',
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Dispute justification is required',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to dispute handover';
    res.status(400).json({ status: 'error', message });
  }
};

export const postResolveDispute = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const handoverId = Number(req.params.id);
    if (!Number.isInteger(handoverId) || handoverId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid handover identifier' });
      return;
    }

    const { resolutionNotes, postGlAdjustment } = resolveDisputeSchema.parse(req.body);
    const resolved = await handoverService.resolveHandoverDispute(
      actor,
      handoverId,
      resolutionNotes,
      postGlAdjustment
    );
    if (!resolved) {
      res.status(404).json({ status: 'error', message: 'Handover report not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: resolved,
      message: 'Handover dispute officially resolved and closed.',
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Resolution notes required',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to resolve dispute';
    res.status(400).json({ status: 'error', message });
  }
};