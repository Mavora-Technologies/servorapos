"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAutomationCatalog = exports.postTriggerTestRun = exports.patchWorkflowRule = exports.postWorkflowRule = exports.getWorkflowRules = exports.getWorkflowOverview = void 0;
const wfRepo = __importStar(require("../repositories/workflow-automation.repository"));
const workflow_automation_validator_1 = require("../validators/workflow-automation.validator");
const getWorkflowOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const data = await wfRepo.getWorkflowMetrics(tenantId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate workflow telemetry' });
    }
};
exports.getWorkflowOverview = getWorkflowOverview;
const getWorkflowRules = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = workflow_automation_validator_1.listWorkflowRulesQuerySchema.safeParse(req.query);
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
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list workflow rules' });
    }
};
exports.getWorkflowRules = getWorkflowRules;
const postWorkflowRule = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = workflow_automation_validator_1.createWorkflowRuleSchema.safeParse(req.body);
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
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to register workflow rule' });
    }
};
exports.postWorkflowRule = postWorkflowRule;
const patchWorkflowRule = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const ruleId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(ruleId)) {
            res.status(400).json({ status: 'error', message: 'Valid workflow rule ID required' });
            return;
        }
        const parseResult = workflow_automation_validator_1.updateWorkflowRuleSchema.safeParse(req.body);
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
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update workflow rule' });
    }
};
exports.patchWorkflowRule = patchWorkflowRule;
const postTriggerTestRun = async (req, res) => {
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
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Test trigger failed' });
    }
};
exports.postTriggerTestRun = postTriggerTestRun;
const getAutomationCatalog = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const data = await wfRepo.getAutomationCatalogAndRoles(tenantId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve automation catalog' });
    }
};
exports.getAutomationCatalog = getAutomationCatalog;
