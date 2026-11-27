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
exports.deleteUnitConversion = exports.updateUnitConversion = exports.createUnitConversion = exports.getUnitConversions = void 0;
const zod_1 = require("zod");
const unitConversionService = __importStar(require("../services/unit-conversion.service"));
const unit_conversion_validator_1 = require("../validators/unit-conversion.validator");
const getUnitConversions = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const data = await unitConversionService.listTenantUnitConversions(tenantId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch unit conversions';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getUnitConversions = getUnitConversions;
const createUnitConversion = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = unit_conversion_validator_1.createUnitConversionSchema.parse(req.body);
        const created = await unitConversionService.registerUnitConversion(tenantId, payload);
        res.status(201).json({ status: 'success', data: created });
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
        const message = error instanceof Error ? error.message : 'Failed to create unit conversion rule';
        res.status(400).json({ status: 'error', message });
    }
};
exports.createUnitConversion = createUnitConversion;
const updateUnitConversion = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const conversionId = Number(req.params.id);
        if (!Number.isInteger(conversionId) || conversionId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid conversion rule ID' });
            return;
        }
        const payload = unit_conversion_validator_1.updateUnitConversionSchema.parse(req.body);
        const updated = await unitConversionService.modifyUnitConversion(tenantId, conversionId, payload);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Unit conversion rule not found' });
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
        const message = error instanceof Error ? error.message : 'Failed to update unit conversion rule';
        res.status(400).json({ status: 'error', message });
    }
};
exports.updateUnitConversion = updateUnitConversion;
const deleteUnitConversion = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const conversionId = Number(req.params.id);
        if (!Number.isInteger(conversionId) || conversionId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid conversion rule ID' });
            return;
        }
        const deleted = await unitConversionService.removeUnitConversion(tenantId, conversionId);
        if (!deleted) {
            res.status(404).json({ status: 'error', message: 'Unit conversion rule not found' });
            return;
        }
        res.status(200).json({ status: 'success', message: 'Unit conversion rule deleted.' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete unit conversion rule';
        res.status(500).json({ status: 'error', message });
    }
};
exports.deleteUnitConversion = deleteUnitConversion;
