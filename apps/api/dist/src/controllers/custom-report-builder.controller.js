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
exports.exportCustomReport = exports.getSavedCustomReports = exports.postSaveCustomReport = exports.postPreviewReport = exports.getDatasetsMetadata = void 0;
const builderRepo = __importStar(require("../repositories/custom-report-builder.repository"));
const custom_report_builder_validator_1 = require("../validators/custom-report-builder.validator");
const getDatasetsMetadata = async (req, res) => {
    try {
        const subjectAreas = builderRepo.getAvailableSubjectAreas();
        res.status(200).json({
            status: 'success',
            data: subjectAreas,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch datasets metadata' });
    }
};
exports.getDatasetsMetadata = getDatasetsMetadata;
const postPreviewReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = custom_report_builder_validator_1.runCustomReportPreviewSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await builderRepo.executeCustomReportQuery(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: result,
            message: `Dynamic query executed in ${result.executionDurationMs}ms (${result.rowCount} records projected).`,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to execute custom report' });
    }
};
exports.postPreviewReport = postPreviewReport;
const postSaveCustomReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = custom_report_builder_validator_1.saveCustomReportDefinitionSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const saved = await builderRepo.saveCustomReport(tenantId, parseResult.data);
        res.status(201).json({
            status: 'success',
            data: saved,
            message: `Custom report "${saved.name}" saved to template catalog.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to save custom report' });
    }
};
exports.postSaveCustomReport = postSaveCustomReport;
const getSavedCustomReports = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const list = await builderRepo.listTenantCustomReports(tenantId);
        res.status(200).json({
            status: 'success',
            data: list,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list saved custom reports' });
    }
};
exports.getSavedCustomReports = getSavedCustomReports;
const exportCustomReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = custom_report_builder_validator_1.exportCustomReportSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const query = parseResult.data;
        const result = await builderRepo.executeCustomReportQuery(tenantId, query);
        if (query.format === 'JSON') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=${query.reportName}-${Date.now()}.json`);
            res.status(200).send(JSON.stringify(result.rows, null, 2));
            return;
        }
        // Default: CSV formatting
        const headerRow = result.columns.map((c) => `"${c.label}"`).join(',');
        const dataRows = result.rows.map((row) => result.columns.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(','));
        const csv = [headerRow, ...dataRows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${query.reportName}-${Date.now()}.csv`);
        res.status(200).send(csv);
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
    }
};
exports.exportCustomReport = exportCustomReport;
