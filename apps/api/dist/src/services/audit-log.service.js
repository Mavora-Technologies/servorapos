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
exports.buildTenantAuditExport = exports.logAuditEvent = exports.getTenantFilterOptions = exports.getTenantAuditTelemetry = exports.getTenantAuditLogDetail = exports.listTenantAuditLogs = void 0;
exports.redactSensitivePayload = redactSensitivePayload;
// apps/api/src/services/audit-log.service.ts
const auditRepo = __importStar(require("../repositories/audit-log.repository"));
const SENSITIVE_KEY_PATTERN = /(password|pin|secret|token|apikey|api_key|passkey|pass_key|authorization|creditcard|cvv)/i;
function redactSensitivePayload(value, depth = 0) {
    if (depth > 6 || value === null || value === undefined)
        return value;
    if (Array.isArray(value)) {
        return value.slice(0, 50).map((item) => redactSensitivePayload(item, depth + 1));
    }
    if (typeof value === 'object') {
        const cleaned = {};
        for (const [key, val] of Object.entries(value)) {
            if (SENSITIVE_KEY_PATTERN.test(key)) {
                cleaned[key] = '[REDACTED]';
            }
            else {
                cleaned[key] = redactSensitivePayload(val, depth + 1);
            }
        }
        return cleaned;
    }
    return value;
}
function escapeCsvCell(value) {
    const str = String(value ?? '');
    // Neutralize spreadsheet formula injection (=, +, -, @)
    const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
    return `"${safe.replace(/"/g, '""')}"`;
}
const listTenantAuditLogs = async (tenantId, query) => {
    return await auditRepo.listAuditLogs(tenantId, query);
};
exports.listTenantAuditLogs = listTenantAuditLogs;
const getTenantAuditLogDetail = async (tenantId, logId) => {
    if (!Number.isInteger(logId) || logId <= 0) {
        throw new Error('Valid audit log ID is required');
    }
    return await auditRepo.getAuditLogById(tenantId, logId);
};
exports.getTenantAuditLogDetail = getTenantAuditLogDetail;
const getTenantAuditTelemetry = async (tenantId) => {
    return await auditRepo.getAuditLogTelemetry(tenantId);
};
exports.getTenantAuditTelemetry = getTenantAuditTelemetry;
const getTenantFilterOptions = async (tenantId) => {
    return await auditRepo.getDynamicFilterOptions(tenantId);
};
exports.getTenantFilterOptions = getTenantFilterOptions;
/**
 * Fail-safe audit event recorder for controllers, services, and middleware.
 * Automatically redacts credentials/tokens before persistence.
 */
const logAuditEvent = async (tenantId, input) => {
    try {
        await auditRepo.recordAuditLog(tenantId, {
            ...input,
            previousValues: input.previousValues
                ? redactSensitivePayload(input.previousValues)
                : null,
            newValues: input.newValues
                ? redactSensitivePayload(input.newValues)
                : null,
        });
    }
    catch (error) {
        console.error('[AuditLog Write Error]:', error);
    }
};
exports.logAuditEvent = logAuditEvent;
const buildTenantAuditExport = async (tenantId, query) => {
    const result = await auditRepo.listAuditLogs(tenantId, {
        ...query,
        page: 1,
        limit: 5000,
    });
    if (query.format === 'json') {
        return {
            contentType: 'application/json; charset=utf-8',
            extension: 'json',
            body: JSON.stringify(result.records, null, 2),
            count: result.records.length,
        };
    }
    const headers = [
        'ID',
        'Timestamp (UTC)',
        'Module',
        'Action',
        'Entity Type',
        'Entity ID',
        'Actor Name',
        'Actor Email',
        'Actor Role',
        'Branch',
        'IP Address',
        'Reason',
    ];
    const rows = result.records.map((r) => [
        escapeCsvCell(r.id),
        escapeCsvCell(new Date(r.createdAt).toISOString()),
        escapeCsvCell(r.module),
        escapeCsvCell(r.action),
        escapeCsvCell(r.entityType),
        escapeCsvCell(r.entityId),
        escapeCsvCell(r.actorName || 'System'),
        escapeCsvCell(r.actorEmail || ''),
        escapeCsvCell(r.actorRole || ''),
        escapeCsvCell(r.branchName ? `${r.branchName} (${r.branchCode || ''})` : ''),
        escapeCsvCell(r.ipAddress || ''),
        escapeCsvCell(r.reason || ''),
    ]);
    const csvBody = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    return {
        contentType: 'text/csv; charset=utf-8',
        extension: 'csv',
        body: csvBody,
        count: result.records.length,
    };
};
exports.buildTenantAuditExport = buildTenantAuditExport;
