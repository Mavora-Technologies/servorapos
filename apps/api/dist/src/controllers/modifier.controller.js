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
exports.deleteModifierGroup = exports.updateModifierGroup = exports.createModifierGroup = exports.getModifiers = void 0;
const zod_1 = require("zod");
const modifierService = __importStar(require("../services/modifier.service"));
const modifier_validator_1 = require("../validators/modifier.validator");
const getModifiers = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const groups = await modifierService.listTenantModifierGroups(tenantId);
        res.status(200).json({ status: 'success', data: groups });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch modifiers';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getModifiers = getModifiers;
const createModifierGroup = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const validated = modifier_validator_1.createModifierGroupSchema.parse(req.body);
        const createdGroup = await modifierService.registerModifierGroup(tenantId, validated);
        res.status(201).json({ status: 'success', data: createdGroup });
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
        const message = error instanceof Error ? error.message : 'Failed to create modifier group';
        res.status(400).json({ status: 'error', message });
    }
};
exports.createModifierGroup = createModifierGroup;
const updateModifierGroup = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const groupId = Number(req.params.id);
        if (!Number.isInteger(groupId) || groupId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid modifier group ID' });
            return;
        }
        const validated = modifier_validator_1.updateModifierGroupSchema.parse(req.body);
        const updated = await modifierService.modifyModifierGroup(tenantId, groupId, validated);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Modifier group not found' });
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
        const message = error instanceof Error ? error.message : 'Failed to update modifier group';
        res.status(400).json({ status: 'error', message });
    }
};
exports.updateModifierGroup = updateModifierGroup;
const deleteModifierGroup = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const groupId = Number(req.params.id);
        if (!Number.isInteger(groupId) || groupId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid modifier group ID' });
            return;
        }
        const deleted = await modifierService.removeModifierGroup(tenantId, groupId);
        if (!deleted) {
            res.status(404).json({ status: 'error', message: 'Modifier group not found' });
            return;
        }
        res.status(200).json({ status: 'success', message: 'Modifier group deleted successfully' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete modifier group';
        res.status(500).json({ status: 'error', message });
    }
};
exports.deleteModifierGroup = deleteModifierGroup;
