import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as templateRepo from '../repositories/marketing-template.repository';
import {
  createMarketingTemplateSchema,
  listTemplatesQuerySchema,
  updateMarketingTemplateSchema,
} from '../validators/marketing-template.validator';

export const getMarketingTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listTemplatesQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await templateRepo.listTenantTemplates(tenantId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: result.templates,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list marketing templates' });
  }
};

export const postMarketingTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createMarketingTemplateSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const created = await templateRepo.createTemplateRecord(tenantId, parseResult.data);
    res.status(201).json({
      status: 'success',
      data: created,
      message: `Template "${created.name}" published to template registry.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to save template' });
  }
};

export const patchMarketingTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const templateId = parseInt(String(req.params.id), 10);
    if (!tenantId || isNaN(templateId)) {
      res.status(400).json({ status: 'error', message: 'Valid template identifier required' });
      return;
    }

    const parseResult = updateMarketingTemplateSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const updated = await templateRepo.updateTemplateRecord(tenantId, templateId, parseResult.data);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Template not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Template "${updated.name}" updated successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update template' });
  }
};

export const deleteMarketingTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const templateId = parseInt(String(req.params.id), 10);
    if (!tenantId || isNaN(templateId)) {
      res.status(400).json({ status: 'error', message: 'Valid template identifier required' });
      return;
    }

    const deleted = await templateRepo.deleteTemplateRecord(tenantId, templateId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Template not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `Template "${deleted.name}" removed from library.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete template' });
  }
};