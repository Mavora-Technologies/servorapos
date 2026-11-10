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
exports.postPromptCopilot = exports.getSessionMessages = exports.getAiSessions = void 0;
const aiRepo = __importStar(require("../repositories/ai-assistant.repository"));
const ai_assistant_validator_1 = require("../validators/ai-assistant.validator");
const getAiSessions = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const sessions = await aiRepo.listTenantAiSessions(tenantId, userId);
        res.status(200).json({ status: 'success', data: sessions });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list copilot sessions' });
    }
};
exports.getAiSessions = getAiSessions;
const getSessionMessages = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const sessionId = parseInt(String(req.params.sessionId), 10);
        if (!tenantId || isNaN(sessionId)) {
            res.status(400).json({ status: 'error', message: 'Valid session ID required' });
            return;
        }
        const messages = await aiRepo.getSessionMessageHistory(tenantId, sessionId);
        res.status(200).json({ status: 'success', data: messages });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch conversation history' });
    }
};
exports.getSessionMessages = getSessionMessages;
const postPromptCopilot = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = ai_assistant_validator_1.promptAiCopilotSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await aiRepo.processCopilotInquiry(tenantId, userId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Copilot reasoning engine failed' });
    }
};
exports.postPromptCopilot = postPromptCopilot;
