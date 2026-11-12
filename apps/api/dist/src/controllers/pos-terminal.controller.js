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
exports.postValidatePromo = exports.searchPosCustomers = exports.getPosContext = void 0;
const posRepo = __importStar(require("../repositories/pos-terminal.repository"));
const pos_terminal_validator_1 = require("../validators/pos-terminal.validator");
const getPosContext = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized terminal session' });
            return;
        }
        const parsed = pos_terminal_validator_1.posBootstrapQuerySchema.safeParse(req.query);
        const branchId = parsed.success ? parsed.data.branchId : undefined;
        const context = await posRepo.getPosTerminalContext(tenantId, userId, branchId);
        res.status(200).json({ status: 'success', data: context });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to load POS terminal context' });
    }
};
exports.getPosContext = getPosContext;
const searchPosCustomers = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parsed = pos_terminal_validator_1.posCustomerSearchQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(200).json({ status: 'success', data: [] });
            return;
        }
        const results = await posRepo.searchPosCustomersWithLoyalty(tenantId, parsed.data.search);
        res.status(200).json({ status: 'success', data: results });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Customer search failed' });
    }
};
exports.searchPosCustomers = searchPosCustomers;
const postValidatePromo = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parsed = pos_terminal_validator_1.posValidatePromoSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ status: 'error', message: 'Invalid promo validation payload' });
            return;
        }
        const result = await posRepo.validatePosPromoCode(tenantId, parsed.data.code, parsed.data.subtotalKes);
        res.status(200).json({ status: 'success', data: result });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Promo code invalid' });
    }
};
exports.postValidatePromo = postValidatePromo;
