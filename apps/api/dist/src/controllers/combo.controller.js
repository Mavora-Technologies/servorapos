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
exports.deleteCombo = exports.updateCombo = exports.createCombo = exports.getCombos = void 0;
const zod_1 = require("zod");
const comboService = __importStar(require("../services/combo.service"));
const combo_validator_1 = require("../validators/combo.validator");
const getCombos = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const rawBranchId = req.query.branchId;
        const branchId = typeof rawBranchId === 'string' && rawBranchId !== '' && rawBranchId !== 'ALL'
            ? Number(rawBranchId)
            : undefined;
        const activeOnly = req.query.activeOnly === 'true';
        const combos = await comboService.listTenantCombos(tenantId, {
            branchId: branchId && Number.isInteger(branchId) && branchId > 0 ? branchId : undefined,
            activeOnly,
        });
        res.status(200).json({ status: 'success', data: combos });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch combo bundles';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getCombos = getCombos;
const createCombo = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const validated = combo_validator_1.createComboBundleSchema.parse(req.body);
        const branchId = req.user?.defaultBranchId ?? null;
        const created = await comboService.registerComboBundle(tenantId, branchId, validated, {
            userId,
            ipAddress: req.ip || null,
        });
        res.status(201).json({ status: 'success', data: created });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Validation failed',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to create combo bundle';
        res.status(400).json({ status: 'error', message });
    }
};
exports.createCombo = createCombo;
const updateCombo = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const comboId = Number(req.params.id);
        if (!Number.isInteger(comboId) || comboId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid combo bundle ID' });
            return;
        }
        const validated = combo_validator_1.updateComboBundleSchema.parse(req.body);
        const updated = await comboService.modifyComboBundle(tenantId, comboId, validated, {
            userId,
            ipAddress: req.ip || null,
        });
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Combo bundle not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: updated });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Validation failed',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to update combo bundle';
        res.status(400).json({ status: 'error', message });
    }
};
exports.updateCombo = updateCombo;
const deleteCombo = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const comboId = Number(req.params.id);
        if (!Number.isInteger(comboId) || comboId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid combo bundle ID' });
            return;
        }
        const deleted = await comboService.removeComboBundle(tenantId, comboId, {
            userId,
            ipAddress: req.ip || null,
        });
        if (!deleted) {
            res.status(404).json({ status: 'error', message: 'Combo bundle not found' });
            return;
        }
        res.status(200).json({ status: 'success', message: 'Combo bundle deleted successfully' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete combo bundle';
        res.status(500).json({ status: 'error', message });
    }
};
exports.deleteCombo = deleteCombo;
