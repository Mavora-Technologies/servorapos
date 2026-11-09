import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as receiptRepo from '../repositories/receipt.repository';
import {
  createReceiptTemplateSchema,
  updateReceiptTemplateSchema,
  setDefaultTemplateSchema,
} from '../validators/receipt.validator';

export const getTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { branchId } = req.query;
    const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;

    const templates = await receiptRepo.listReceiptTemplates(tenantId, branchIdNum);
    res.status(200).json({ status: 'success', data: templates });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch receipt templates' });
  }
};

export const postTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createReceiptTemplateSchema.parse(req.body);
    const created = await receiptRepo.createReceiptTemplate(tenantId, input);

    res.status(201).json({
      status: 'success',
      data: created,
      message: 'Receipt format specification saved successfully.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create template' });
  }
};

export const putTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const templateId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(templateId)) {
      res.status(400).json({ status: 'error', message: 'Invalid template identifier' });
      return;
    }

    const input = updateReceiptTemplateSchema.parse(req.body);
    const updated = await receiptRepo.updateReceiptTemplate(tenantId, templateId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Receipt layout customizer updated.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update template' });
  }
};

export const deleteTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const templateId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(templateId)) {
      res.status(400).json({ status: 'error', message: 'Invalid template identifier' });
      return;
    }

    await receiptRepo.deleteReceiptTemplate(tenantId, templateId);
    res.status(200).json({ status: 'success', message: 'Receipt template removed.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete template' });
  }
};

export const setDefault = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { templateId, branchId } = setDefaultTemplateSchema.parse(req.body);
    const updated = await receiptRepo.setAsDefaultTemplate(tenantId, templateId, branchId);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Primary default printing layout assigned.',
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to set default template' });
  }
};