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
exports.postRevokeAllSessions = exports.postRevokeSession = exports.putSecuritySettings = exports.getSecurityOverview = void 0;
const securityRepo = __importStar(require("../repositories/security-settings.repository"));
const security_settings_validator_1 = require("../validators/security-settings.validator");
const getSecurityOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const [settings, sessions, telemetry] = await Promise.all([
            securityRepo.getOrCreateSecuritySettings(tenantId),
            securityRepo.listActiveSessions(tenantId),
            securityRepo.getSecurityTelemetry(tenantId),
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                settings,
                sessions,
                telemetry,
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve security configuration' });
    }
};
exports.getSecurityOverview = getSecurityOverview;
const putSecuritySettings = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = security_settings_validator_1.updateSecuritySettingsSchema.parse(req.body);
        const updated = await securityRepo.updateSecuritySettings(tenantId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Security governance and authentication policies updated.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailed = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update security parameters' });
    }
};
exports.putSecuritySettings = putSecuritySettings;
const postRevokeSession = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { sessionId } = security_settings_validator_1.revokeSessionSchema.parse(req.body);
        await securityRepo.revokeSession(tenantId, sessionId);
        res.status(200).json({
            status: 'success',
            message: 'Active session terminated and token revoked.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailed = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to revoke session' });
    }
};
exports.postRevokeSession = postRevokeSession;
const postRevokeAllSessions = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const revokedList = await securityRepo.revokeAllOtherSessions(tenantId, userId);
        res.status(200).json({
            status: 'success',
            message: `${revokedList.length} external session(s) revoked across all endpoints.`,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to terminate all sessions' });
    }
};
exports.postRevokeAllSessions = postRevokeAllSessions;
