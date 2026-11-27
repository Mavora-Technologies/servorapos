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
exports.deleteRole = exports.updateRole = exports.createRole = exports.getRolesDirectory = void 0;
const zod_1 = require("zod");
const roleService = __importStar(require("../services/role.service"));
const role_validator_1 = require("../validators/role.validator");
const getRolesDirectory = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const data = await roleService.fetchTenantRolesDirectory(tenantId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch roles';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getRolesDirectory = getRolesDirectory;
const createRole = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const payload = role_validator_1.createRoleSchema.parse(req.body);
        const newRole = await roleService.provisionCustomRole(tenantId, payload);
        res.status(201).json({
            status: 'success',
            data: newRole,
            message: 'Role security clearance provisioned successfully.',
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
        const message = error instanceof Error ? error.message : 'Failed to create role';
        res.status(400).json({ status: 'error', message });
    }
};
exports.createRole = createRole;
const updateRole = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const roleId = Number(req.params.id);
        if (!Number.isInteger(roleId) || roleId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid role identifier' });
            return;
        }
        const payload = role_validator_1.updateRoleSchema.parse(req.body);
        const updated = await roleService.modifyCustomRole(tenantId, roleId, payload);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Custom role not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Role security matrix updated successfully.',
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
        const message = error instanceof Error ? error.message : 'Failed to update role';
        res.status(400).json({ status: 'error', message });
    }
};
exports.updateRole = updateRole;
const deleteRole = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const roleId = Number(req.params.id);
        if (!Number.isInteger(roleId) || roleId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid role identifier' });
            return;
        }
        const deleted = await roleService.removeCustomRole(tenantId, roleId);
        if (!deleted) {
            res.status(404).json({ status: 'error', message: 'Role not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            message: 'Custom role security profile deleted successfully.',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete role';
        res.status(400).json({ status: 'error', message });
    }
};
exports.deleteRole = deleteRole;
