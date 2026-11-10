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
exports.postRetryFiscalization = exports.patchTaxSettings = exports.getFiscalInvoices = exports.getTaxOverview = void 0;
const taxesRepo = __importStar(require("../repositories/taxes.repository"));
const taxes_validator_1 = require("../validators/taxes.validator");
const getTaxOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const periodYear = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
        const periodMonth = req.query.month ? parseInt(String(req.query.month), 10) : undefined;
        const [telemetry, settings, codes] = await Promise.all([
            taxesRepo.getTaxLiabilityTelemetry(tenantId, branchId, periodYear, periodMonth),
            taxesRepo.getTenantTaxSettings(tenantId),
            taxesRepo.listTaxCodes(tenantId),
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                telemetry,
                settings,
                taxCodes: codes,
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate tax telemetry' });
    }
};
exports.getTaxOverview = getTaxOverview;
const getFiscalInvoices = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        // Defensive check to immediately identify import issues
        if (!taxes_validator_1.taxReportQuerySchema || typeof taxes_validator_1.taxReportQuerySchema.safeParse !== 'function') {
            res.status(500).json({
                status: 'error',
                message: 'taxReportQuerySchema is not properly defined or imported in taxes.controller',
            });
            return;
        }
        const parseResult = taxes_validator_1.taxReportQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid query filters', errors: parseResult.error.issues });
            return;
        }
        const data = await taxesRepo.listFiscalInvoices(tenantId, parseResult.data);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list fiscal invoices' });
    }
};
exports.getFiscalInvoices = getFiscalInvoices;
const patchTaxSettings = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = taxes_validator_1.updateTaxSettingsSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid tax configuration', errors: parseResult.error.issues });
            return;
        }
        const updated = await taxesRepo.updateTenantTaxSettings(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Tax configuration and fiscal device parameters updated.',
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update tax settings' });
    }
};
exports.patchTaxSettings = patchTaxSettings;
const postRetryFiscalization = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = taxes_validator_1.retryFiscalizationSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid payload', errors: parseResult.error.issues });
            return;
        }
        const updated = await taxesRepo.retryInvoiceFiscalization(tenantId, parseResult.data.fiscalInvoiceId);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: `Invoice #${updated.id} queued for eTIMS fiscal retry.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to retry fiscalization' });
    }
};
exports.postRetryFiscalization = postRetryFiscalization;
