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
exports.postCloseShift = exports.postOpenShift = exports.getMyActiveShift = exports.getShifts = exports.getShiftOverview = void 0;
const cashShiftRepo = __importStar(require("../repositories/cash-shifts.repository"));
const cash_shifts_validator_1 = require("../validators/cash-shifts.validator");
const getShiftOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const data = await cashShiftRepo.getCashShiftMetrics(tenantId, branchId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate cash metrics' });
    }
};
exports.getShiftOverview = getShiftOverview;
const getShifts = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = cash_shifts_validator_1.listShiftsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid query parameters', errors: parseResult.error.issues });
            return;
        }
        const data = await cashShiftRepo.listTenantCashShifts(tenantId, parseResult.data);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list shift records' });
    }
};
exports.getShifts = getShifts;
const getMyActiveShift = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const active = await cashShiftRepo.getActiveShiftForCashier(tenantId, userId, branchId);
        res.status(200).json({ status: 'success', data: active });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to check active shift' });
    }
};
exports.getMyActiveShift = getMyActiveShift;
const postOpenShift = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = cash_shifts_validator_1.openShiftSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid shift parameters', errors: parseResult.error.issues });
            return;
        }
        const shift = await cashShiftRepo.openCashShiftRecord(tenantId, userId, parseResult.data);
        res.status(201).json({
            status: 'success',
            data: shift,
            message: `Cashier shift #${shift.id} opened with opening float of KES ${Number(shift.openingFloat).toLocaleString()}`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to open shift' });
    }
};
exports.postOpenShift = postOpenShift;
const postCloseShift = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const supervisorId = req.user?.userId;
        if (!tenantId || !supervisorId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = cash_shifts_validator_1.closeShiftSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid closing parameters', errors: parseResult.error.issues });
            return;
        }
        const shift = await cashShiftRepo.closeCashShiftRecord(tenantId, supervisorId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: shift,
            message: `Shift #${shift.id} balanced and closed with variance of KES ${Number(shift.variance).toLocaleString()}`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to close shift' });
    }
};
exports.postCloseShift = postCloseShift;
