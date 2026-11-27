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
exports.putStaffPosPin = exports.postPosPinSwitch = exports.getKioskOperators = exports.postValidateStock = exports.postValidatePromo = exports.searchPosCustomers = exports.getPosContext = void 0;
const posRepo = __importStar(require("../repositories/pos-terminal.repository"));
const role_service_1 = require("../services/role.service");
const pos_terminal_validator_1 = require("../validators/pos-terminal.validator");
const getPosContext = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!tenantId || !userId || !role) {
            res.status(401).json({ status: 'error', message: 'Unauthorized terminal session' });
            return;
        }
        const parsed = pos_terminal_validator_1.posBootstrapQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({
                status: 'error',
                message: parsed.error.issues[0]?.message || 'Invalid branch parameter',
            });
            return;
        }
        const requestedBranchId = parsed.data.branchId;
        const authorized = await (0, role_service_1.getUserAuthorizedBranches)(tenantId, userId, role);
        const authorizedBranchIds = authorized === 'ALL' ? null : authorized;
        if (requestedBranchId !== undefined &&
            authorizedBranchIds !== null &&
            !authorizedBranchIds.includes(requestedBranchId)) {
            res.status(403).json({
                status: 'error',
                message: 'You are not authorized to operate a POS terminal at the selected branch.',
            });
            return;
        }
        const context = await posRepo.getPosTerminalContext(tenantId, userId, requestedBranchId, authorizedBranchIds);
        res.status(200).json({ status: 'success', data: context });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load POS terminal context';
        res.status(500).json({ status: 'error', message });
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
        const message = error instanceof Error ? error.message : 'Customer search failed';
        res.status(500).json({ status: 'error', message });
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
            res.status(400).json({
                status: 'error',
                message: parsed.error.issues[0]?.message || 'Invalid promo validation payload',
            });
            return;
        }
        const result = await posRepo.validatePosPromoCode(tenantId, parsed.data.code, parsed.data.subtotalKes);
        res.status(200).json({ status: 'success', data: result });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Promo code invalid';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postValidatePromo = postValidatePromo;
const postValidateStock = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!tenantId || !userId || !role) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parsed = pos_terminal_validator_1.posValidateStockSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                status: 'error',
                message: parsed.error.issues[0]?.message || 'Invalid stock validation payload',
            });
            return;
        }
        const targetBranchId = parsed.data.branchId ?? req.user?.defaultBranchId ?? undefined;
        const authorized = await (0, role_service_1.getUserAuthorizedBranches)(tenantId, userId, role);
        if (targetBranchId !== undefined &&
            authorized !== 'ALL' &&
            !authorized.includes(targetBranchId)) {
            res.status(403).json({
                status: 'error',
                message: 'Unauthorized branch scope for stock validation.',
            });
            return;
        }
        const validation = await posRepo.validateOrderStockAvailability(tenantId, parsed.data.items, targetBranchId);
        if (!validation.valid) {
            res.status(409).json({
                status: 'error',
                message: validation.shortages.map((s) => s.reason).join(' '),
                shortages: validation.shortages,
            });
            return;
        }
        res.status(200).json({ status: 'success', data: validation });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Stock validation failed';
        res.status(500).json({ status: 'error', message });
    }
};
exports.postValidateStock = postValidateStock;
const getKioskOperators = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!tenantId || !userId || !role) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parsed = pos_terminal_validator_1.posBootstrapQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({
                status: 'error',
                message: parsed.error.issues[0]?.message || 'Invalid branch parameter',
            });
            return;
        }
        const branchId = parsed.data.branchId ?? req.user?.defaultBranchId ?? undefined;
        if (!branchId) {
            res.status(400).json({ status: 'error', message: 'Active branchId is required' });
            return;
        }
        const authorized = await (0, role_service_1.getUserAuthorizedBranches)(tenantId, userId, role);
        if (authorized !== 'ALL' && !authorized.includes(branchId)) {
            res.status(403).json({ status: 'error', message: 'Unauthorized branch scope' });
            return;
        }
        const operators = await posRepo.listBranchKioskOperators(tenantId, branchId);
        res.status(200).json({ status: 'success', data: operators });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load kiosk operators';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getKioskOperators = getKioskOperators;
const postPosPinSwitch = async (req, res) => {
    // Prevent globalAuditLogger from persisting plaintext PIN from req.body
    res.locals.auditLogged = true;
    try {
        const tenantId = req.user?.tenantId;
        const previousUserId = req.user?.userId;
        if (!tenantId || !previousUserId) {
            res.status(401).json({ status: 'error', message: 'Terminal session required' });
            return;
        }
        const parsed = pos_terminal_validator_1.posPinSwitchSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                status: 'error',
                message: parsed.error.issues[0]?.message || 'Invalid PIN payload',
            });
            return;
        }
        const session = await posRepo.authenticatePosPinSwitch({
            tenantId,
            branchId: parsed.data.branchId,
            pin: parsed.data.pin,
            targetUserId: parsed.data.userId,
            previousUserId,
            ipAddress: req.ip || null,
        });
        res.status(200).json({
            status: 'success',
            data: session,
            message: `Switched active POS operator to ${session.user.fullName}.`,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'POS PIN authentication failed';
        res.status(401).json({ status: 'error', message });
    }
};
exports.postPosPinSwitch = postPosPinSwitch;
const putStaffPosPin = async (req, res) => {
    // Prevent globalAuditLogger from persisting plaintext PIN from req.body
    res.locals.auditLogged = true;
    try {
        const tenantId = req.user?.tenantId;
        const actorUserId = req.user?.userId;
        if (!tenantId || !actorUserId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const targetUserId = Number(req.params.userId);
        if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid staff user ID' });
            return;
        }
        const parsed = pos_terminal_validator_1.assignStaffPosPinSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                status: 'error',
                message: parsed.error.issues[0]?.message || 'PIN must be 4 to 6 numeric digits',
            });
            return;
        }
        const result = await posRepo.assignStaffPosPinTransaction({
            tenantId,
            targetUserId,
            pin: parsed.data.pin,
            actorUserId,
            ipAddress: req.ip || null,
        });
        res.status(200).json({
            status: 'success',
            data: result,
            message: `POS PIN updated for ${result.fullName}.`,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to assign POS PIN';
        res.status(400).json({ status: 'error', message });
    }
};
exports.putStaffPosPin = putStaffPosPin;
