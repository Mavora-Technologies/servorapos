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
exports.deleteMarketingTemplate = exports.patchMarketingTemplate = exports.postMarketingTemplate = exports.getMarketingTemplates = void 0;
const templateRepo = __importStar(require("../repositories/marketing-template.repository"));
const marketing_template_validator_1 = require("../validators/marketing-template.validator");
const getMarketingTemplates = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = marketing_template_validator_1.listTemplatesQuerySchema.safeParse(req.query);
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
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list marketing templates' });
    }
};
exports.getMarketingTemplates = getMarketingTemplates;
const postMarketingTemplate = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = marketing_template_validator_1.createMarketingTemplateSchema.safeParse(req.body);
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
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to save template' });
    }
};
exports.postMarketingTemplate = postMarketingTemplate;
const patchMarketingTemplate = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const templateId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(templateId)) {
            res.status(400).json({ status: 'error', message: 'Valid template identifier required' });
            return;
        }
        const parseResult = marketing_template_validator_1.updateMarketingTemplateSchema.safeParse(req.body);
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
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update template' });
    }
};
exports.patchMarketingTemplate = patchMarketingTemplate;
const deleteMarketingTemplate = async (req, res) => {
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
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete template' });
    }
};
exports.deleteMarketingTemplate = deleteMarketingTemplate;
