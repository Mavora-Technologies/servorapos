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
exports.patchForecastModifier = exports.getForecastOverview = void 0;
const forecastRepo = __importStar(require("../repositories/forecasting.repository"));
const forecasting_validator_1 = require("../validators/forecasting.validator");
const getForecastOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = forecasting_validator_1.forecastingQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const data = await forecastRepo.getDemandForecastingTelemetry(tenantId, parseResult.data);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Demand forecast computation failed' });
    }
};
exports.getForecastOverview = getForecastOverview;
const patchForecastModifier = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = forecasting_validator_1.adjustForecastModifierSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid forecast modifier parameters' });
            return;
        }
        const updated = await forecastRepo.updateSnapshotModifier(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Forecasting model recalibrated successfully.',
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update forecast' });
    }
};
exports.patchForecastModifier = patchForecastModifier;
