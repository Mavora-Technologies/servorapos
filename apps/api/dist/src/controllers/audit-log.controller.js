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
exports.exportAuditLogs = exports.getFilterOptions = exports.getAuditTelemetry = exports.getAuditLogDetail = exports.getAuditLogs = void 0;
const auditRepo = __importStar(require("../repositories/audit-log.repository"));
const audit_log_validator_1 = require("../validators/audit-log.validator");
const getAuditLogs = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = audit_log_validator_1.listAuditLogsQuerySchema.parse(req.query);
        const result = await auditRepo.listAuditLogs(tenantId, query);
        res.status(200).json({
            status: 'success',
            data: result.records,
            pagination: result.pagination,
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailed = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: error.errors });
            return;
        }
        res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve audit logs' });
    }
};
exports.getAuditLogs = getAuditLogs;
const getAuditLogDetail = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const logId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(logId)) {
            res.status(400).json({ status: 'error', message: 'Valid audit log ID is required' });
            return;
        }
        const log = await auditRepo.getAuditLogById(tenantId, logId);
        if (!log) {
            res.status(404).json({ status: 'error', message: 'Audit record not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: log });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve audit log detail' });
    }
};
exports.getAuditLogDetail = getAuditLogDetail;
const getAuditTelemetry = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const telemetry = await auditRepo.getAuditLogTelemetry(tenantId);
        res.status(200).json({ status: 'success', data: telemetry });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve telemetry' });
    }
};
exports.getAuditTelemetry = getAuditTelemetry;
const getFilterOptions = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const options = await auditRepo.getDynamicFilterOptions(tenantId);
        res.status(200).json({ status: 'success', data: options });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve filter options' });
    }
};
exports.getFilterOptions = getFilterOptions;
const exportAuditLogs = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = audit_log_validator_1.exportAuditLogsQuerySchema.parse(req.query);
        const result = await auditRepo.listAuditLogs(tenantId, { ...query, page: 1, limit: 5000 });
        if (query.format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
            res.status(200).send(JSON.stringify(result.records, null, 2));
            return;
        }
        // Default CSV formatting
        const headers = ['Timestamp', 'Module', 'Action', 'Entity Type', 'Entity ID', 'Actor Name', 'Actor Email', 'Branch', 'IP Address', 'Reason'];
        const rows = result.records.map((r) => [
            `"${new Date(r.createdAt).toISOString()}"`,
            `"${r.module}"`,
            `"${r.action}"`,
            `"${r.entityType}"`,
            `"${r.entityId}"`,
            `"${(r.actorName || 'System').replace(/"/g, '""')}"`,
            `"${(r.actorEmail || '').replace(/"/g, '""')}"`,
            `"${(r.branchName || '').replace(/"/g, '""')}"`,
            `"${r.ipAddress || ''}"`,
            `"${(r.reason || '').replace(/"/g, '""')}"`,
        ]);
        const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
        res.status(200).send(csvContent);
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to export audit logs' });
    }
};
exports.exportAuditLogs = exportAuditLogs;
