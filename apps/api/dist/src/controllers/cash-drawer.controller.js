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
exports.createCashDrawer = exports.closeDrawerSession = exports.recordCashDrop = exports.openDrawerSession = exports.getDrawersDashboard = void 0;
const cashDrawerRepo = __importStar(require("../repositories/cash-drawer.repository"));
const cash_drawer_validator_1 = require("../validators/cash-drawer.validator");
const getDrawersDashboard = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const data = await cashDrawerRepo.getDrawersDashboardData(Number(tenantId), branchId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        console.error('[Get Drawers Error]:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getDrawersDashboard = getDrawersDashboard;
const openDrawerSession = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const authUserId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId || !authUserId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = cash_drawer_validator_1.openDrawerSessionSchema.parse(req.body);
        const result = await cashDrawerRepo.openDrawerSessionRecord(Number(tenantId), Number(authUserId), payload);
        res.status(201).json({
            status: 'success',
            message: 'Cash drawer session opened successfully',
            data: result,
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.openDrawerSession = openDrawerSession;
const recordCashDrop = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = cash_drawer_validator_1.cashDropSchema.parse(req.body);
        const result = await cashDrawerRepo.recordDrawerCashDrop(Number(tenantId), payload);
        res.status(200).json({ status: 'success', message: 'Cash drop to safe recorded', data: result });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.recordCashDrop = recordCashDrop;
const closeDrawerSession = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const { id } = req.params;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = cash_drawer_validator_1.closeDrawerSessionSchema.parse(req.body);
        const result = await cashDrawerRepo.closeDrawerSessionRecord(Number(tenantId), Number(userId), Number(id), payload);
        res.status(200).json({
            status: 'success',
            message: 'Drawer session closed and reconciled',
            data: result,
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.closeDrawerSession = closeDrawerSession;
const createCashDrawer = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = cash_drawer_validator_1.createCashDrawerSchema.parse(req.body);
        const rawBranchId = payload.branchId ?? req.user?.defaultBranchId;
        const branchId = rawBranchId ? Number(rawBranchId) : null;
        const newDrawer = await cashDrawerRepo.createCashDrawerRecord(Number(tenantId), branchId, payload);
        res.status(201).json({
            status: 'success',
            message: 'POS terminal registered successfully',
            data: newDrawer,
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.createCashDrawer = createCashDrawer;
