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
exports.postHeartbeat = exports.postGeneratePairingCode = exports.deleteDevice = exports.putDevice = exports.postRegisterDevice = exports.getDeviceContext = exports.getDevices = void 0;
const deviceRepo = __importStar(require("../repositories/device.repository"));
const device_validator_1 = require("../validators/device.validator");
const getDevices = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { branchId, status } = req.query;
        const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;
        const statusStr = typeof status === 'string' ? status : undefined;
        const [devices, telemetry] = await Promise.all([
            deviceRepo.listDevices(tenantId, branchIdNum, statusStr),
            deviceRepo.getDeviceTelemetry(tenantId),
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                devices,
                telemetry,
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch terminal fleet' });
    }
};
exports.getDevices = getDevices;
const getDeviceContext = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { branchId } = req.query;
        const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;
        const context = await deviceRepo.getDeviceContext(tenantId, branchIdNum);
        res.status(200).json({ status: 'success', data: context });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch device context' });
    }
};
exports.getDeviceContext = getDeviceContext;
const postRegisterDevice = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = device_validator_1.registerDeviceSchema.parse(req.body);
        const device = await deviceRepo.registerDevice(tenantId, userId, input);
        res.status(201).json({
            status: 'success',
            data: device,
            message: 'Terminal hardware provisioned successfully.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailed = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to register terminal' });
    }
};
exports.postRegisterDevice = postRegisterDevice;
const putDevice = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const deviceId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(deviceId)) {
            res.status(400).json({ status: 'error', message: 'Invalid device identifier' });
            return;
        }
        const input = device_validator_1.updateDeviceSchema.parse(req.body);
        const updated = await deviceRepo.updateDevice(tenantId, deviceId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Device profile and peripheral bindings updated.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailed = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update device' });
    }
};
exports.putDevice = putDevice;
const deleteDevice = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const deviceId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(deviceId)) {
            res.status(400).json({ status: 'error', message: 'Invalid device identifier' });
            return;
        }
        await deviceRepo.deleteDevice(tenantId, deviceId);
        res.status(200).json({ status: 'success', message: 'Device terminal decommissioned.' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete device' });
    }
};
exports.deleteDevice = deleteDevice;
const postGeneratePairingCode = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = device_validator_1.generateEnrollmentTokenSchema.parse(req.body);
        const tokenRecord = await deviceRepo.createEnrollmentToken(tenantId, userId, input);
        res.status(201).json({
            status: 'success',
            data: tokenRecord,
            message: 'Hardware pairing code generated.',
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to generate pairing token' });
    }
};
exports.postGeneratePairingCode = postGeneratePairingCode;
const postHeartbeat = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const deviceId = parseInt(String(req.params.id), 10);
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        if (!tenantId || isNaN(deviceId)) {
            res.status(400).json({ status: 'error', message: 'Invalid device identifier' });
            return;
        }
        const updated = await deviceRepo.recordDeviceHeartbeat(tenantId, deviceId, clientIp);
        res.status(200).json({ status: 'success', data: updated });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Heartbeat update failed' });
    }
};
exports.postHeartbeat = postHeartbeat;
