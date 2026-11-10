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
exports.createPreset = exports.copyWeekRoster = exports.publishWeekRoster = exports.deleteShift = exports.updateShift = exports.createShift = exports.getRoster = void 0;
const scheduleRepo = __importStar(require("../repositories/schedule.repository"));
const schedule_validator_1 = require("../validators/schedule.validator");
const getRoster = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { weekStart, branchId, role } = req.query;
        const weekStartStr = typeof weekStart === 'string' ? weekStart : undefined;
        if (!weekStartStr) {
            res.status(400).json({ status: 'error', message: 'weekStart (YYYY-MM-DD) query parameter is required' });
            return;
        }
        const startDate = new Date(weekStartStr);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        const weekEnd = endDate.toISOString().split('T')[0];
        const branchIdStr = typeof branchId === 'string' ? branchId : undefined;
        const branchIdNum = branchIdStr && branchIdStr !== 'ALL' ? parseInt(branchIdStr, 10) : undefined;
        const roleStr = typeof role === 'string' ? role : undefined;
        const data = await scheduleRepo.getWeeklyRoster(tenantId, {
            weekStart: weekStartStr,
            weekEnd,
            branchId: branchIdNum && !isNaN(branchIdNum) ? branchIdNum : undefined,
            role: roleStr,
        });
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve roster' });
    }
};
exports.getRoster = getRoster;
const createShift = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = schedule_validator_1.createScheduleSchema.parse(req.body);
        const shift = await scheduleRepo.createScheduleEntry(tenantId, input);
        res.status(201).json({ status: 'success', data: shift, message: 'Shift allocated successfully' });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to allocate shift' });
    }
};
exports.createShift = createShift;
const updateShift = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        // Coerce req.params.id to string to satisfy parseInt(string, radix)
        const scheduleId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(scheduleId)) {
            res.status(400).json({ status: 'error', message: 'Invalid request parameters' });
            return;
        }
        const input = schedule_validator_1.updateScheduleSchema.parse(req.body);
        const updated = await scheduleRepo.updateScheduleEntry(tenantId, scheduleId, input);
        res.status(200).json({ status: 'success', data: updated, message: 'Shift updated successfully' });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update shift' });
    }
};
exports.updateShift = updateShift;
const deleteShift = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        // Coerce req.params.id to string to satisfy parseInt(string, radix)
        const scheduleId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(scheduleId)) {
            res.status(400).json({ status: 'error', message: 'Invalid shift identifier' });
            return;
        }
        await scheduleRepo.deleteScheduleEntry(tenantId, scheduleId);
        res.status(200).json({ status: 'success', message: 'Shift deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete shift' });
    }
};
exports.deleteShift = deleteShift;
const publishWeekRoster = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = schedule_validator_1.publishWeekSchema.parse(req.body);
        const result = await scheduleRepo.publishWeek(tenantId, input.weekStart, input.branchId);
        res.status(200).json({
            status: 'success',
            data: result,
            message: `${result.publishedCount} draft shift(s) officially published.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to publish roster' });
    }
};
exports.publishWeekRoster = publishWeekRoster;
const copyWeekRoster = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = schedule_validator_1.copyWeekSchema.parse(req.body);
        const result = await scheduleRepo.copyWeekRoster(tenantId, input.fromWeekStart, input.toWeekStart, input.branchId);
        res.status(200).json({
            status: 'success',
            data: result,
            message: `${result.copiedCount} shift(s) replicated to the target week.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to copy schedule' });
    }
};
exports.copyWeekRoster = copyWeekRoster;
const createPreset = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = schedule_validator_1.createTemplateSchema.parse(req.body);
        const preset = await scheduleRepo.createShiftPreset(tenantId, input);
        res.status(201).json({ status: 'success', data: preset, message: 'Shift pattern created' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create shift template' });
    }
};
exports.createPreset = createPreset;
