import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as perfRepo from '../repositories/performance.repository';
import {
  createReviewSchema,
  updateReviewSchema,
  acknowledgeReviewSchema,
} from '../validators/performance.validator';

export const getReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { cycle, userId, status, startDate, endDate } = req.query;

    const userIdNum = typeof userId === 'string' && userId !== 'ALL' ? parseInt(userId, 10) : undefined;

    const reviews = await perfRepo.listPerformanceReviews(tenantId, {
      cycle: typeof cycle === 'string' ? cycle : undefined,
      userId: userIdNum && !isNaN(userIdNum) ? userIdNum : undefined,
      status: typeof status === 'string' ? status : undefined,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
    });

    res.status(200).json({ status: 'success', data: reviews });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch performance reviews' });
  }
};

export const getTelemetry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const telemetry = await perfRepo.getLiveStaffTelemetry(tenantId);
    res.status(200).json({ status: 'success', data: telemetry });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch live telemetry' });
  }
};

export const postReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const reviewerId = req.user?.userId;

    if (!tenantId || !reviewerId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createReviewSchema.parse(req.body);
    const review = await perfRepo.createReview(tenantId, reviewerId, input);

    res.status(201).json({
      status: 'success',
      data: review,
      message: 'Staff performance appraisal successfully submitted.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');

      res.status(400).json({
        status: 'error',
        message: detailedMessage,
        errors: error.errors,
      });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create review' });
  }
};

export const putReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const reviewId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(reviewId)) {
      res.status(400).json({ status: 'error', message: 'Invalid review identifier' });
      return;
    }

    const input = updateReviewSchema.parse(req.body);
    const updated = await perfRepo.updateReview(tenantId, reviewId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Performance review updated successfully.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update review' });
  }
};

export const postAcknowledge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const reviewId = parseInt(String(req.params.id), 10);

    if (!tenantId || !userId || isNaN(reviewId)) {
      res.status(400).json({ status: 'error', message: 'Invalid request or session' });
      return;
    }

    const { employeeFeedback } = acknowledgeReviewSchema.parse(req.body);
    const acknowledged = await perfRepo.acknowledgeReview(tenantId, reviewId, userId, employeeFeedback);

    res.status(200).json({
      status: 'success',
      data: acknowledged,
      message: 'Appraisal acknowledged and archived to employee file.',
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to acknowledge review' });
  }
};