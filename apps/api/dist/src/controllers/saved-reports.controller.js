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
exports.runSavedReportDirectly = exports.deleteSavedReport = exports.patchSavedReport = exports.getSavedReport = exports.getSavedReports = void 0;
const savedReportsRepo = __importStar(require("../repositories/saved-reports.repository"));
const reportsRepo = __importStar(require("../repositories/reports.repository"));
const saved_reports_validator_1 = require("../validators/saved-reports.validator");
const getSavedReports = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = saved_reports_validator_1.listSavedReportsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await savedReportsRepo.listTenantSavedReports(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: result.reports,
            summary: result.summary,
            pagination: result.pagination,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list saved reports' });
    }
};
exports.getSavedReports = getSavedReports;
const getSavedReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const reportId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(reportId)) {
            res.status(400).json({ status: 'error', message: 'Valid report identifier required' });
            return;
        }
        const report = await savedReportsRepo.getSavedReportDetail(tenantId, reportId);
        if (!report) {
            res.status(404).json({ status: 'error', message: 'Saved report not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: report });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch saved report' });
    }
};
exports.getSavedReport = getSavedReport;
const patchSavedReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const reportId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(reportId)) {
            res.status(400).json({ status: 'error', message: 'Valid report identifier required' });
            return;
        }
        const parseResult = saved_reports_validator_1.updateSavedReportSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const updated = await savedReportsRepo.updateSavedReport(tenantId, reportId, parseResult.data);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Saved report not found or cannot be edited' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: `Report "${updated.name}" updated successfully.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update saved report' });
    }
};
exports.patchSavedReport = patchSavedReport;
const deleteSavedReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const reportId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(reportId)) {
            res.status(400).json({ status: 'error', message: 'Valid report identifier required' });
            return;
        }
        const deleted = await savedReportsRepo.deleteSavedReport(tenantId, reportId);
        if (!deleted) {
            res.status(404).json({ status: 'error', message: 'Saved report not found or already deleted' });
            return;
        }
        res.status(200).json({
            status: 'success',
            message: `Saved report "${deleted.name}" has been deleted.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete saved report' });
    }
};
exports.deleteSavedReport = deleteSavedReport;
const runSavedReportDirectly = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const reportId = parseInt(String(req.params.id), 10);
        if (!tenantId || !userId || isNaN(reportId)) {
            res.status(400).json({ status: 'error', message: 'Valid session and report identifier required' });
            return;
        }
        const definition = await savedReportsRepo.getSavedReportDetail(tenantId, reportId);
        if (!definition) {
            res.status(404).json({ status: 'error', message: 'Saved report not found' });
            return;
        }
        const result = await reportsRepo.executeReportGeneration(tenantId, userId, {
            reportCode: definition.code,
            format: (req.body.format || 'CSV'),
            branchId: req.body.branchId || null,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            filters: req.body.filters || {},
        });
        res.status(200).json({
            status: 'success',
            data: result,
            message: `Executed "${definition.name}" successfully (${result.rows.length} rows).`,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Direct execution failed' });
    }
};
exports.runSavedReportDirectly = runSavedReportDirectly;
