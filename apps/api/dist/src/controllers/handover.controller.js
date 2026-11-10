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
exports.postAcknowledge = exports.putHandover = exports.postHandover = exports.getHandoverDetail = exports.getHandovers = void 0;
const handoverRepo = __importStar(require("../repositories/handover.repository"));
const handover_validator_1 = require("../validators/handover.validator");
const getHandovers = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { startDate, endDate, branchId, shiftType, status } = req.query;
        const branchIdStr = typeof branchId === 'string' ? branchId : undefined;
        const branchIdNum = branchIdStr && branchIdStr !== 'ALL' ? parseInt(branchIdStr, 10) : undefined;
        const entries = await handoverRepo.listHandovers(tenantId, {
            startDate: typeof startDate === 'string' ? startDate : undefined,
            endDate: typeof endDate === 'string' ? endDate : undefined,
            branchId: branchIdNum && !isNaN(branchIdNum) ? branchIdNum : undefined,
            shiftType: typeof shiftType === 'string' ? shiftType : undefined,
            status: typeof status === 'string' ? status : undefined,
        });
        res.status(200).json({ status: 'success', data: entries });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve handover logs' });
    }
};
exports.getHandovers = getHandovers;
const getHandoverDetail = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const handoverId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(handoverId)) {
            res.status(400).json({ status: 'error', message: 'Invalid handover identifier' });
            return;
        }
        const entry = await handoverRepo.findHandoverById(tenantId, handoverId);
        if (!entry) {
            res.status(404).json({ status: 'error', message: 'Handover report not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: entry });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch handover detail' });
    }
};
exports.getHandoverDetail = getHandoverDetail;
const postHandover = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const outgoingManagerId = req.user?.userId;
        if (!tenantId || !outgoingManagerId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = handover_validator_1.createHandoverSchema.parse(req.body);
        const handover = await handoverRepo.createHandover(tenantId, outgoingManagerId, input);
        res.status(201).json({
            status: 'success',
            data: handover,
            message: 'Manager shift handover successfully submitted.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to submit handover' });
    }
};
exports.postHandover = postHandover;
const putHandover = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const handoverId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(handoverId)) {
            res.status(400).json({ status: 'error', message: 'Invalid handover identifier' });
            return;
        }
        const input = handover_validator_1.updateHandoverSchema.parse(req.body);
        const updated = await handoverRepo.updateHandover(tenantId, handoverId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Shift handover report updated successfully.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update handover' });
    }
};
exports.putHandover = putHandover;
const postAcknowledge = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const incomingManagerId = req.user?.userId;
        const handoverId = parseInt(String(req.params.id), 10);
        if (!tenantId || !incomingManagerId || isNaN(handoverId)) {
            res.status(400).json({ status: 'error', message: 'Invalid session or handover identifier' });
            return;
        }
        handover_validator_1.acknowledgeHandoverSchema.parse(req.body);
        const acknowledged = await handoverRepo.acknowledgeHandover(tenantId, handoverId, incomingManagerId);
        res.status(200).json({
            status: 'success',
            data: acknowledged,
            message: 'Shift handover officially acknowledged and digitally countersigned.',
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to acknowledge handover' });
    }
};
exports.postAcknowledge = postAcknowledge;
