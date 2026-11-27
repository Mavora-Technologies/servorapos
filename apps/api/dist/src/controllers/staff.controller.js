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
exports.resetStaffPin = exports.toggleStaffStatus = exports.updateStaff = exports.createStaff = exports.getStaffRoster = void 0;
const zod_1 = require("zod");
const staffService = __importStar(require("../services/staff.service"));
const staff_validator_1 = require("../validators/staff.validator");
function getActorContext(req) {
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
const getStaffRoster = async (req, res) => {
    try {
        const actor = getActorContext(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const filters = staff_validator_1.listStaffQuerySchema.parse(req.query);
        const data = await staffService.getStaffRosterDirectory(actor, filters);
        res.status(200).json({ status: 'success', data });
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
        const message = error instanceof Error ? error.message : 'Failed to fetch staff roster';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getStaffRoster = getStaffRoster;
const createStaff = async (req, res) => {
    try {
        const actor = getActorContext(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const payload = staff_validator_1.createStaffSchema.parse(req.body);
        const newStaff = await staffService.provisionEmployee(actor, payload);
        res.status(201).json({
            status: 'success',
            data: newStaff,
            message: 'Employee successfully provisioned.',
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
        const message = error instanceof Error ? error.message : 'Failed to register employee';
        res.status(400).json({ status: 'error', message });
    }
};
exports.createStaff = createStaff;
const updateStaff = async (req, res) => {
    try {
        const actor = getActorContext(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const staffId = Number(req.params.id);
        if (!Number.isInteger(staffId) || staffId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid employee identifier' });
            return;
        }
        const payload = staff_validator_1.updateStaffSchema.parse(req.body);
        const updated = await staffService.modifyEmployee(actor, staffId, payload);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Employee record not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Employee profile updated successfully.',
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
        const message = error instanceof Error ? error.message : 'Failed to update employee';
        res.status(400).json({ status: 'error', message });
    }
};
exports.updateStaff = updateStaff;
const toggleStaffStatus = async (req, res) => {
    try {
        const actor = getActorContext(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const staffId = Number(req.params.id);
        if (!Number.isInteger(staffId) || staffId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid employee identifier' });
            return;
        }
        const { isActive, reason } = staff_validator_1.toggleStaffStatusSchema.parse(req.body);
        const updated = await staffService.setEmployeeStatus(actor, staffId, isActive, reason);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Employee record not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: `Employee account ${isActive ? 'activated' : 'suspended'} successfully.`,
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
        const message = error instanceof Error ? error.message : 'Failed to update status';
        res.status(400).json({ status: 'error', message });
    }
};
exports.toggleStaffStatus = toggleStaffStatus;
const resetStaffPin = async (req, res) => {
    try {
        const actor = getActorContext(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const staffId = Number(req.params.id);
        if (!Number.isInteger(staffId) || staffId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid employee identifier' });
            return;
        }
        const { pin } = staff_validator_1.resetPinSchema.parse(req.body);
        const result = await staffService.resetEmployeePin(actor, staffId, pin);
        if (!result) {
            res.status(404).json({ status: 'error', message: 'Employee record not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            message: 'POS Quick PIN updated successfully.',
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Invalid PIN format',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to reset PIN';
        res.status(400).json({ status: 'error', message });
    }
};
exports.resetStaffPin = resetStaffPin;
