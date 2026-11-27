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
exports.handleBatchReject = exports.handleBatchApprove = exports.handleManualAdjustment = exports.handleClockOut = exports.handleClockIn = exports.getLiveDuty = exports.getAttendanceList = void 0;
const zod_1 = require("zod");
const attendanceService = __importStar(require("../services/attendance.service"));
const attendance_validator_1 = require("../validators/attendance.validator");
function getActor(req) {
    const user = req.user;
    if (!user?.tenantId || !user?.userId)
        return null;
    return {
        tenantId: user.tenantId,
        userId: user.userId,
        role: user.role,
        ipAddress: req.ip || null,
    };
}
const getAttendanceList = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = attendance_validator_1.listAttendanceQuerySchema.parse(req.query);
        const records = await attendanceService.fetchAttendanceLedger(actor, query);
        res.status(200).json({ status: 'success', data: records });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Invalid filter parameters',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to fetch attendance records';
        res.status(400).json({ status: 'error', message });
    }
};
exports.getAttendanceList = getAttendanceList;
const getLiveDuty = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = attendance_validator_1.liveDutyQuerySchema.parse(req.query);
        const roster = await attendanceService.fetchLiveDutyRoster(actor, query);
        res.status(200).json({ status: 'success', data: roster });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch live duty roster';
        res.status(400).json({ status: 'error', message });
    }
};
exports.getLiveDuty = getLiveDuty;
const handleClockIn = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = attendance_validator_1.clockInSchema.parse(req.body);
        const session = await attendanceService.recordClockIn(actor, input);
        res.status(201).json({
            status: 'success',
            data: session,
            message: 'Clock-in recorded. Status set to On Duty.',
        });
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
        const message = error instanceof Error ? error.message : 'Clock-in failed';
        res.status(400).json({ status: 'error', message });
    }
};
exports.handleClockIn = handleClockIn;
const handleClockOut = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = attendance_validator_1.clockOutSchema.parse(req.body);
        const record = await attendanceService.recordClockOut(actor, input);
        res.status(200).json({
            status: 'success',
            data: record,
            message: 'Clock-out recorded. Timesheet entry completed.',
        });
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
        const message = error instanceof Error ? error.message : 'Clock-out failed';
        res.status(400).json({ status: 'error', message });
    }
};
exports.handleClockOut = handleClockOut;
const handleManualAdjustment = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = attendance_validator_1.manualAdjustmentSchema.parse(req.body);
        const record = await attendanceService.recordManualAdjustment(actor, input);
        res.status(201).json({
            status: 'success',
            data: record,
            message: 'Manual time-card entry recorded with audit trail.',
        });
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
        const message = error instanceof Error ? error.message : 'Failed to submit manual adjustment';
        res.status(400).json({ status: 'error', message });
    }
};
exports.handleManualAdjustment = handleManualAdjustment;
const handleBatchApprove = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = attendance_validator_1.approveAttendanceSchema.parse(req.body);
        const result = await attendanceService.approveTimesheets(actor, input.recordIds);
        res.status(200).json({
            status: 'success',
            data: result,
            message: `${result.approvedCount} timesheet record(s) approved for payroll.`,
        });
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
        const message = error instanceof Error ? error.message : 'Failed to approve attendance records';
        res.status(400).json({ status: 'error', message });
    }
};
exports.handleBatchApprove = handleBatchApprove;
const handleBatchReject = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = attendance_validator_1.rejectAttendanceSchema.parse(req.body);
        const result = await attendanceService.rejectTimesheets(actor, input.recordIds, input.reason);
        res.status(200).json({
            status: 'success',
            data: result,
            message: `${result.rejectedCount} timesheet record(s) rejected.`,
        });
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
        const message = error instanceof Error ? error.message : 'Failed to reject attendance records';
        res.status(400).json({ status: 'error', message });
    }
};
exports.handleBatchReject = handleBatchReject;
