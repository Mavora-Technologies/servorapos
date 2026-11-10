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
exports.getKbArticle = exports.patchTicketStatus = exports.postTicketMessage = exports.postTicket = exports.getTicketDetail = exports.getTickets = exports.getHelpOverview = void 0;
const helpRepo = __importStar(require("../repositories/help.repository"));
const help_validator_1 = require("../validators/help.validator");
const getHelpOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const [telemetry, kbArticles] = await Promise.all([
            helpRepo.getHelpDeskTelemetry(tenantId),
            helpRepo.listKbArticles(tenantId, {}),
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                telemetry,
                kbArticles,
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve help overview' });
    }
};
exports.getHelpOverview = getHelpOverview;
const getTickets = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = help_validator_1.listTicketsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await helpRepo.listTickets(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: result.tickets,
            pagination: result.pagination,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list tickets' });
    }
};
exports.getTickets = getTickets;
const getTicketDetail = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const ticketId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(ticketId)) {
            res.status(400).json({ status: 'error', message: 'Valid ticket identifier required' });
            return;
        }
        const ticket = await helpRepo.getTicketDetails(tenantId, ticketId);
        if (!ticket) {
            res.status(404).json({ status: 'error', message: 'Ticket not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: ticket });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve ticket' });
    }
};
exports.getTicketDetail = getTicketDetail;
const postTicket = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = help_validator_1.createTicketSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const created = await helpRepo.createTicket(tenantId, userId, parseResult.data);
        res.status(201).json({
            status: 'success',
            data: created,
            message: `Support incident ${created.ticketNumber} registered successfully.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to submit ticket' });
    }
};
exports.postTicket = postTicket;
const postTicketMessage = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const ticketId = parseInt(String(req.params.id), 10);
        if (!tenantId || !userId || isNaN(ticketId)) {
            res.status(400).json({ status: 'error', message: 'Valid ticket identifier required' });
            return;
        }
        const parseResult = help_validator_1.addTicketMessageSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const message = await helpRepo.addTicketMessage(tenantId, ticketId, userId, parseResult.data);
        res.status(201).json({
            status: 'success',
            data: message,
            message: 'Reply posted to ticket thread.',
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to post message' });
    }
};
exports.postTicketMessage = postTicketMessage;
const patchTicketStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const ticketId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(ticketId)) {
            res.status(400).json({ status: 'error', message: 'Valid ticket identifier required' });
            return;
        }
        const parseResult = help_validator_1.updateTicketStatusSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const updated = await helpRepo.updateTicketStatus(tenantId, ticketId, parseResult.data.status);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: `Ticket status marked as ${parseResult.data.status}.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update ticket status' });
    }
};
exports.patchTicketStatus = patchTicketStatus;
const getKbArticle = async (req, res) => {
    try {
        const { slug } = req.params;
        if (!slug) {
            res.status(400).json({ status: 'error', message: 'Article slug is required' });
            return;
        }
        const article = await helpRepo.getKbArticleBySlug(String(slug));
        if (!article) {
            res.status(404).json({ status: 'error', message: 'Article not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: article });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch article' });
    }
};
exports.getKbArticle = getKbArticle;
