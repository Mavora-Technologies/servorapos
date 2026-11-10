import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as wfRepo from '../repositories/workflow-automation.repository';
import {
  createWorkflowRuleSchema,
  listWorkflowRulesQuerySchema,
  updateWorkflowRuleSchema,
} from '../validators/workflow-automation.validator';

export const getWorkflowOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const data = await wfRepo.getWorkflowMetrics(tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate workflow telemetry' });
  }
};

export const getWorkflowRules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listWorkflowRulesQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await wfRepo.listTenantWorkflowRules(tenantId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: result.rules,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list workflow rules' });
  }
};

export const postWorkflowRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createWorkflowRuleSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const created = await wfRepo.createWorkflowRuleRecord(tenantId, userId, parseResult.data);
    res.status(201).json({
      status: 'success',
      data: created,
      message: `Workflow automation rule "${created.name}" configured and active.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to register workflow rule' });
  }
};

export const patchWorkflowRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const ruleId = parseInt(String(req.params.id), 10);
    if (!tenantId || isNaN(ruleId)) {
      res.status(400).json({ status: 'error', message: 'Valid workflow rule ID required' });
      return;
    }

    const parseResult = updateWorkflowRuleSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const updated = await wfRepo.updateWorkflowRuleRecord(tenantId, ruleId, parseResult.data);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Workflow rule not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Workflow rule "${updated.name}" updated successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update workflow rule' });
  }
};

export const postTriggerTestRun = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const ruleId = parseInt(String(req.params.id), 10);
    if (!tenantId || isNaN(ruleId)) {
      res.status(400).json({ status: 'error', message: 'Valid workflow rule ID required' });
      return;
    }

    const result = await wfRepo.executeWorkflowTestRun(tenantId, ruleId);
    res.status(200).json({
      status: 'success',
      data: result,
      message: `Test run triggered successfully. Output: ${result.log.executionOutput}`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Test trigger failed' });
  }
};

export const getAutomationCatalog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const data = await wfRepo.getAutomationCatalogAndRoles(tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve automation catalog' });
  }
};