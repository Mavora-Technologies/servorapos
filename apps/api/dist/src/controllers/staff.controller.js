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
const staffRepo = __importStar(require("../repositories/staff.repository"));
const staff_validator_1 = require("../validators/staff.validator");
const getStaffRoster = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { search, branchId, role, isActive } = req.query;
        // Safely extract scalar string values from req.query
        const searchStr = typeof search === 'string' ? search : undefined;
        const branchIdNum = typeof branchId === 'string' ? parseInt(branchId, 10) : undefined;
        const roleStr = typeof role === 'string' ? role : undefined;
        const isActiveBool = typeof isActive === 'string' ? isActive === 'true' : undefined;
        const { staff, roles } = await staffRepo.listStaffByTenant(tenantId, {
            search: searchStr,
            branchId: branchIdNum && !isNaN(branchIdNum) ? branchIdNum : undefined,
            role: roleStr,
            isActive: isActiveBool,
        });
        const metrics = {
            totalStaff: staff.length,
            activeStaff: staff.filter((s) => s.isActive).length,
            inactiveStaff: staff.filter((s) => !s.isActive).length,
            posPinEnrolled: staff.filter((s) => s.hasPin).length,
            branchCoverage: new Set(staff.map((s) => s.defaultBranchId).filter(Boolean)).size,
        };
        res.status(200).json({
            status: 'success',
            data: {
                metrics,
                staff,
                roles,
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch staff roster' });
    }
};
exports.getStaffRoster = getStaffRoster;
const createStaff = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const payload = staff_validator_1.createStaffSchema.parse(req.body);
        const newStaff = await staffRepo.createStaffMember(tenantId, payload);
        res.status(201).json({
            status: 'success',
            data: newStaff,
            message: 'Employee successfully registered and provisioned',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to register employee' });
    }
};
exports.createStaff = createStaff;
const updateStaff = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const staffId = parseInt(String(req.params.id), 10);
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        if (isNaN(staffId)) {
            res.status(400).json({ status: 'error', message: 'Invalid employee identifier' });
            return;
        }
        const payload = staff_validator_1.updateStaffSchema.parse(req.body);
        const updated = await staffRepo.updateStaffMember(tenantId, staffId, payload);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Employee profile updated successfully',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update employee' });
    }
};
exports.updateStaff = updateStaff;
const toggleStaffStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const staffId = parseInt(String(req.params.id), 10);
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        if (isNaN(staffId)) {
            res.status(400).json({ status: 'error', message: 'Invalid employee identifier' });
            return;
        }
        const { isActive } = staff_validator_1.toggleStaffStatusSchema.parse(req.body);
        const updated = await staffRepo.updateStaffMember(tenantId, staffId, { isActive });
        res.status(200).json({
            status: 'success',
            data: updated,
            message: `Employee account ${isActive ? 'activated' : 'deactivated'} successfully`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.toggleStaffStatus = toggleStaffStatus;
const resetStaffPin = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const staffId = parseInt(String(req.params.id), 10);
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        if (isNaN(staffId)) {
            res.status(400).json({ status: 'error', message: 'Invalid employee identifier' });
            return;
        }
        const { pin } = staff_validator_1.resetPinSchema.parse(req.body);
        const result = await staffRepo.setStaffPin(tenantId, staffId, pin);
        res.status(200).json({
            status: 'success',
            message: result.message,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.resetStaffPin = resetStaffPin;
