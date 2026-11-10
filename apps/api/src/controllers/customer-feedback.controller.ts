import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as feedbackRepo from '../repositories/customer-feedback.repository';
import {
  createFeedbackSchema,
  listFeedbackQuerySchema,
  updateFeedbackStatusSchema,
} from '../validators/customer-feedback.validator';

export const getFeedbackOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const data = await feedbackRepo.getFeedbackDashboardMetrics(tenantId, branchId);

    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate feedback metrics' });
  }
};

export const getFeedbacks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listFeedbackQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await feedbackRepo.listCustomerFeedbacks(tenantId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: result.feedback,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list feedback records' });
  }
};

export const postFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createFeedbackSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const created = await feedbackRepo.createFeedbackRecord(tenantId, parseResult.data);
    res.status(201).json({
      status: 'success',
      data: created,
      message: 'Customer feedback logged successfully.',
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to record feedback' });
  }
};

export const patchFeedbackStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const feedbackId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(feedbackId)) {
      res.status(400).json({ status: 'error', message: 'Valid feedback ID required' });
      return;
    }

    const parseResult = updateFeedbackStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const updated = await feedbackRepo.updateFeedbackStatus(tenantId, feedbackId, parseResult.data);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Feedback entry not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Feedback status transitioned to ${updated.status}.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update feedback status' });
  }
};