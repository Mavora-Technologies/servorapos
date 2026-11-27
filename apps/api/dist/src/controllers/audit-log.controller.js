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
const zod_1 = require("zod");
const auditService = __importStar(require("../services/audit-log.service"));
const audit_log_validator_1 = require("../validators/audit-log.validator");
const getAuditLogs = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = audit_log_validator_1.listAuditLogsQuerySchema.parse(req.query);
        const result = await auditService.listTenantAuditLogs(tenantId, query);
        res.status(200).json({
            status: 'success',
            data: result.records,
            pagination: result.pagination,
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Invalid filter query',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to retrieve audit logs';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getAuditLogs = getAuditLogs;
const getAuditLogDetail = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const logId = Number(req.params.id);
        if (!Number.isInteger(logId) || logId <= 0) {
            res.status(400).json({ status: 'error', message: 'Valid audit log ID is required' });
            return;
        }
        const log = await auditService.getTenantAuditLogDetail(tenantId, logId);
        if (!log) {
            res.status(404).json({ status: 'error', message: 'Audit record not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: log });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to retrieve audit log detail';
        res.status(500).json({ status: 'error', message });
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
        const telemetry = await auditService.getTenantAuditTelemetry(tenantId);
        res.status(200).json({ status: 'success', data: telemetry });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to retrieve telemetry';
        res.status(500).json({ status: 'error', message });
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
        const options = await auditService.getTenantFilterOptions(tenantId);
        res.status(200).json({ status: 'success', data: options });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to retrieve filter options';
        res.status(500).json({ status: 'error', message });
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
        const exported = await auditService.buildTenantAuditExport(tenantId, query);
        // Log the compliance export itself
        void auditService.logAuditEvent(tenantId, {
            branchId: req.user?.defaultBranchId ?? null,
            userId: req.user?.userId ?? null,
            action: 'AUDIT_LOGS_EXPORTED',
            module: 'SECURITY',
            entityType: 'audit_logs',
            entityId: `${exported.count}_records`,
            reason: `Exported ${exported.count} audit records as ${query.format.toUpperCase()}`,
            newValues: { format: query.format, filters: query, recordCount: exported.count },
            ipAddress: (typeof req.headers['x-forwarded-for'] === 'string'
                ? req.headers['x-forwarded-for'].split(',')[0].trim()
                : req.ip) ?? null,
        });
        res.setHeader('Content-Type', exported.contentType);
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.${exported.extension}`);
        res.status(200).send(exported.body);
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Invalid export parameters',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to export audit logs';
        res.status(500).json({ status: 'error', message });
    }
};
exports.exportAuditLogs = exportAuditLogs;
