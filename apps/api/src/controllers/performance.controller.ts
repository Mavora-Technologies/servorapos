// apps/api/src/controllers/performance.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as perfService from '../services/performance.service';
import {
  listReviewsQuerySchema,
  telemetryQuerySchema,
  createReviewSchema,
  updateReviewSchema,
  acknowledgeReviewSchema,
} from '../validators/performance.validator';

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

export const getReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = listReviewsQuerySchema.parse(req.query);
    const reviews = await perfService.fetchPerformanceReviews(actor, query);

    res.status(200).json({ status: 'success', data: reviews });
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
      error instanceof Error ? error.message : 'Failed to fetch performance reviews';
    res.status(400).json({ status: 'error', message });
  }
};

export const getTelemetry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = telemetryQuerySchema.parse(req.query);
    const payload = await perfService.fetchLiveTelemetry(actor, query);

    res.status(200).json({ status: 'success', data: payload });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Invalid telemetry parameters',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch live telemetry';
    res.status(400).json({ status: 'error', message });
  }
};

export const postReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createReviewSchema.parse(req.body);
    const review = await perfService.submitAppraisal(actor, input);

    res.status(201).json({
      status: 'success',
      data: review,
      message: 'Staff performance appraisal submitted successfully.',
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create review';
    res.status(400).json({ status: 'error', message });
  }
};

export const putReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const reviewId = Number(req.params.id);
    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid review identifier' });
      return;
    }

    const input = updateReviewSchema.parse(req.body);
    const updated = await perfService.modifyAppraisal(actor, reviewId, input);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Performance appraisal not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message:
        input.status === 'FINALIZED'
          ? 'Appraisal finalized and locked to employee file.'
          : 'Performance review updated successfully.',
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
    const message = error instanceof Error ? error.message : 'Failed to update review';
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

    const reviewId = Number(req.params.id);
    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid review identifier' });
      return;
    }

    const { employeeFeedback } = acknowledgeReviewSchema.parse(req.body || {});
    const acknowledged = await perfService.acknowledgeAppraisal(
      actor,
      reviewId,
      employeeFeedback
    );
    if (!acknowledged) {
      res.status(404).json({ status: 'error', message: 'Review record not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: acknowledged,
      message: 'Appraisal acknowledged and archived to employee file.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to acknowledge review';
    res.status(400).json({ status: 'error', message });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const reviewId = Number(req.params.id);
    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid review identifier' });
      return;
    }

    const deleted = await perfService.removeDraftAppraisal(actor, reviewId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Appraisal draft not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Draft appraisal deleted successfully.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete draft appraisal';
    res.status(400).json({ status: 'error', message });
  }
};