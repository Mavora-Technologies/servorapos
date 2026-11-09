import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as messagingRepo from '../repositories/messaging-integration.repository';
import {
  createMessagingIntegrationSchema,
  updateMessagingIntegrationSchema,
  testDispatchSchema,
  createMessagingTemplateSchema,
  updateMessagingTemplateSchema,
} from '../validators/messaging-integration.validator';

export const getMessagingSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { branchId } = req.query;
    const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;

    const [integrations, templates, logs] = await Promise.all([
      messagingRepo.listMessagingIntegrations(tenantId, branchIdNum),
      messagingRepo.listMessagingTemplates(tenantId),
      messagingRepo.listRecentDispatchLogs(tenantId),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        integrations,
        templates,
        logs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch messaging configurations' });
  }
};

export const postIntegration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createMessagingIntegrationSchema.parse(req.body);
    const created = await messagingRepo.createMessagingIntegration(tenantId, input);

    res.status(201).json({
      status: 'success',
      data: created,
      message: 'Messaging gateway integration registered successfully.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create messaging integration' });
  }
};

export const putIntegration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const integrationId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(integrationId)) {
      res.status(400).json({ status: 'error', message: 'Invalid integration identifier' });
      return;
    }

    const input = updateMessagingIntegrationSchema.parse(req.body);
    const updated = await messagingRepo.updateMessagingIntegration(tenantId, integrationId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Messaging gateway configuration updated.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update messaging integration' });
  }
};

export const deleteIntegration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const integrationId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(integrationId)) {
      res.status(400).json({ status: 'error', message: 'Invalid integration identifier' });
      return;
    }

    await messagingRepo.deleteMessagingIntegration(tenantId, integrationId);
    res.status(200).json({ status: 'success', message: 'Messaging gateway profile removed.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete messaging integration' });
  }
};

export const postTestDispatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { integrationId, recipient, message } = testDispatchSchema.parse(req.body);
    const result = await messagingRepo.testMessagingDispatch(tenantId, integrationId, recipient, message);

    res.status(200).json({
      status: 'success',
      data: result,
      message: result.message,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Test dispatch failed' });
  }
};

export const postTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createMessagingTemplateSchema.parse(req.body);
    const created = await messagingRepo.createMessagingTemplate(tenantId, input);

    res.status(201).json({
      status: 'success',
      data: created,
      message: 'Notification template created successfully.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
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

    const input = updateMessagingTemplateSchema.parse(req.body);
    const updated = await messagingRepo.updateMessagingTemplate(tenantId, templateId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Notification template updated.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
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

    await messagingRepo.deleteMessagingTemplate(tenantId, templateId);
    res.status(200).json({ status: 'success', message: 'Template removed.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete template' });
  }
};