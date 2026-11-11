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
exports.patchReviewAdjustment = exports.postCreateAdjustment = exports.getAdjustments = exports.getAdjustmentsOverview = void 0;
const adjustmentsRepo = __importStar(require("../repositories/adjustments.repository"));
const adjustments_validator_1 = require("../validators/adjustments.validator");
const getAdjustmentsOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const metrics = await adjustmentsRepo.getAdjustmentsMetrics(tenantId, branchId);
        res.status(200).json({ status: 'success', data: metrics });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate adjustment metrics' });
    }
};
exports.getAdjustmentsOverview = getAdjustmentsOverview;
const getAdjustments = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = adjustments_validator_1.listAdjustmentsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid query filters', errors: parseResult.error.issues });
            return;
        }
        const data = await adjustmentsRepo.listTenantAdjustments(tenantId, parseResult.data);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list adjustment vouchers' });
    }
};
exports.getAdjustments = getAdjustments;
const postCreateAdjustment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = adjustments_validator_1.createAdjustmentSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid adjustment payload', errors: parseResult.error.issues });
            return;
        }
        const created = await adjustmentsRepo.createAdjustmentVoucher(tenantId, userId, parseResult.data);
        res.status(201).json({
            status: 'success',
            data: created,
            message: `Adjustment voucher ${created.adjustmentNumber} submitted for Maker-Checker review.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to submit adjustment voucher' });
    }
};
exports.postCreateAdjustment = postCreateAdjustment;
const patchReviewAdjustment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const supervisorId = req.user?.userId;
        const { id } = req.params;
        if (!tenantId || !supervisorId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const adjustmentId = parseInt(Array.isArray(id) ? id[0] : id, 10);
        const parseResult = adjustments_validator_1.reviewAdjustmentSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid action payload', errors: parseResult.error.issues });
            return;
        }
        const updated = await adjustmentsRepo.reviewAdjustmentVoucher(tenantId, supervisorId, adjustmentId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: `Adjustment voucher ${updated.adjustmentNumber} status updated to ${updated.status}.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Review action failed' });
    }
};
exports.patchReviewAdjustment = patchReviewAdjustment;
