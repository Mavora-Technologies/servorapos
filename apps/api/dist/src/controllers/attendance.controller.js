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
exports.handleBatchApprove = exports.handleManualAdjustment = exports.handleClockOut = exports.handleClockIn = exports.getLiveDuty = exports.getAttendanceList = void 0;
const attendanceRepo = __importStar(require("../repositories/attendance.repository"));
const attendance_validator_1 = require("../validators/attendance.validator");
const getAttendanceList = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { startDate, endDate, branchId, userId, status } = req.query;
        const records = await attendanceRepo.listAttendanceRecords(tenantId, {
            startDate: typeof startDate === 'string' ? startDate : undefined,
            endDate: typeof endDate === 'string' ? endDate : undefined,
            branchId: typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined,
            userId: typeof userId === 'string' && userId !== 'ALL' ? parseInt(userId, 10) : undefined,
            status: typeof status === 'string' ? status : undefined,
        });
        res.status(200).json({ status: 'success', data: records });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch attendance records' });
    }
};
exports.getAttendanceList = getAttendanceList;
const getLiveDuty = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { branchId } = req.query;
        const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;
        const roster = await attendanceRepo.getLiveDutyRoster(tenantId, branchIdNum);
        res.status(200).json({ status: 'success', data: roster });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch live duty roster' });
    }
};
exports.getLiveDuty = getLiveDuty;
const handleClockIn = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = attendance_validator_1.clockInSchema.parse(req.body);
        const session = await attendanceRepo.clockIn(tenantId, input);
        res.status(201).json({
            status: 'success',
            data: session,
            message: 'Clock-in recorded. Status set to On Duty.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Clock-in failed' });
    }
};
exports.handleClockIn = handleClockIn;
const handleClockOut = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = attendance_validator_1.clockOutSchema.parse(req.body);
        const record = await attendanceRepo.clockOut(tenantId, input);
        res.status(200).json({
            status: 'success',
            data: record,
            message: 'Clock-out recorded. Timesheet entry completed.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Clock-out failed' });
    }
};
exports.handleClockOut = handleClockOut;
const handleManualAdjustment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const managerUserId = req.user?.userId;
        if (!tenantId || !managerUserId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = attendance_validator_1.manualAdjustmentSchema.parse(req.body);
        const record = await attendanceRepo.createManualAdjustment(tenantId, managerUserId, input);
        res.status(201).json({
            status: 'success',
            data: record,
            message: 'Manual time-card entry recorded with manager audit authorization.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to submit manual adjustment' });
    }
};
exports.handleManualAdjustment = handleManualAdjustment;
const handleBatchApprove = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const managerUserId = req.user?.userId;
        if (!tenantId || !managerUserId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = attendance_validator_1.approveAttendanceSchema.parse(req.body);
        const result = await attendanceRepo.batchApproveAttendance(tenantId, managerUserId, input.recordIds);
        res.status(200).json({
            status: 'success',
            data: result,
            message: `${result.approvedCount} timesheet record(s) approved for payroll consolidation.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to approve attendance records' });
    }
};
exports.handleBatchApprove = handleBatchApprove;
