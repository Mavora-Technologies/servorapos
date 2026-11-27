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
const zod_1 = require("zod");
const scheduleService = __importStar(require("../services/schedule.service"));
const schedule_validator_1 = require("../validators/schedule.validator");
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
const getRoster = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = schedule_validator_1.getRosterQuerySchema.parse(req.query);
        const data = await scheduleService.fetchWeeklyRoster(actor, query);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Invalid roster query parameters',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to retrieve roster';
        res.status(400).json({ status: 'error', message });
    }
};
exports.getRoster = getRoster;
const createShift = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = schedule_validator_1.createScheduleSchema.parse(req.body);
        const shift = await scheduleService.allocateShift(actor, input);
        res.status(201).json({
            status: 'success',
            data: shift,
            message: 'Shift allocated successfully.',
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
        const message = error instanceof Error ? error.message : 'Failed to allocate shift';
        res.status(400).json({ status: 'error', message });
    }
};
exports.createShift = createShift;
const updateShift = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const scheduleId = Number(req.params.id);
        if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid shift identifier' });
            return;
        }
        const input = schedule_validator_1.updateScheduleSchema.parse(req.body);
        const updated = await scheduleService.modifyShift(actor, scheduleId, input);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Shift schedule entry not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Shift updated successfully.',
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
        const message = error instanceof Error ? error.message : 'Failed to update shift';
        res.status(400).json({ status: 'error', message });
    }
};
exports.updateShift = updateShift;
const deleteShift = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const scheduleId = Number(req.params.id);
        if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid shift identifier' });
            return;
        }
        const deleted = await scheduleService.removeShift(actor, scheduleId);
        if (!deleted) {
            res.status(404).json({ status: 'error', message: 'Shift entry not found' });
            return;
        }
        res.status(200).json({ status: 'success', message: 'Shift deleted successfully.' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete shift';
        res.status(400).json({ status: 'error', message });
    }
};
exports.deleteShift = deleteShift;
const publishWeekRoster = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = schedule_validator_1.publishWeekSchema.parse(req.body);
        const result = await scheduleService.publishWeeklyRoster(actor, input);
        res.status(200).json({
            status: 'success',
            data: result,
            message: `${result.publishedCount} draft shift(s) officially published.`,
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
        const message = error instanceof Error ? error.message : 'Failed to publish roster';
        res.status(400).json({ status: 'error', message });
    }
};
exports.publishWeekRoster = publishWeekRoster;
const copyWeekRoster = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = schedule_validator_1.copyWeekSchema.parse(req.body);
        const result = await scheduleService.replicateWeeklyRoster(actor, input);
        const suffix = result.skippedConflicts > 0
            ? ` (${result.skippedConflicts} conflicting shift(s) skipped)`
            : '';
        res.status(200).json({
            status: 'success',
            data: result,
            message: `${result.copiedCount} shift(s) replicated to target week${suffix}.`,
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
        const message = error instanceof Error ? error.message : 'Failed to copy schedule';
        res.status(400).json({ status: 'error', message });
    }
};
exports.copyWeekRoster = copyWeekRoster;
const createPreset = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = schedule_validator_1.createTemplateSchema.parse(req.body);
        const preset = await scheduleService.provisionShiftTemplate(actor, input);
        res.status(201).json({
            status: 'success',
            data: preset,
            message: `Shift pattern "${preset.name}" created.`,
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
        const message = error instanceof Error ? error.message : 'Failed to create shift template';
        res.status(400).json({ status: 'error', message });
    }
};
exports.createPreset = createPreset;
