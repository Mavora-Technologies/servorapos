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
exports.putKitchenGlobalSettings = exports.deleteKitchenStation = exports.patchUpdateKitchenStation = exports.postCreateKitchenStation = exports.getStationsMasterOverview = exports.postBumpStationItems = exports.getStationWorkload = exports.getPerformance = exports.getHistory = exports.updateItemStatus = exports.updateStatus = exports.getTickets = exports.getStationsMeta = void 0;
const kitchenService = __importStar(require("../services/kitchen.service"));
const kitchen_validator_1 = require("../validators/kitchen.validator");
const getStationsMeta = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const stations = await kitchenService.fetchTenantStations(tenantId);
        res.status(200).json({ status: 'success', data: stations });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to load kitchen stations' });
    }
};
exports.getStationsMeta = getStationsMeta;
const getTickets = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const parsed = kitchen_validator_1.kitchenTicketsQuerySchema.safeParse(req.query);
        const tickets = await kitchenService.fetchActiveTickets(tenantId, parsed.success ? parsed.data : {});
        res.status(200).json({ status: 'success', data: tickets });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch tickets' });
    }
};
exports.getTickets = getTickets;
const updateStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const id = parseInt(String(req.params.id), 10);
        if (isNaN(id)) {
            res.status(400).json({ status: 'error', message: 'Invalid ticket ID' });
            return;
        }
        const parsed = kitchen_validator_1.updateTicketStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ status: 'error', message: 'Invalid ticket status' });
            return;
        }
        await kitchenService.advanceTicketStatus(tenantId, userId, id, parsed.data.status);
        res.status(200).json({ status: 'success', message: `Order marked as ${parsed.data.status}` });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.updateStatus = updateStatus;
const updateItemStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const itemId = parseInt(String(req.params.itemId), 10);
        if (isNaN(itemId)) {
            res.status(400).json({ status: 'error', message: 'Invalid line item ID' });
            return;
        }
        const parsed = kitchen_validator_1.updateKitchenItemStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ status: 'error', message: 'Invalid line item status' });
            return;
        }
        const updated = await kitchenService.advanceLineItemStatus(tenantId, itemId, parsed.data.kitchenStatus);
        res.status(200).json({ status: 'success', data: updated });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.updateItemStatus = updateItemStatus;
const getHistory = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const parsed = kitchen_validator_1.kitchenHistoryQuerySchema.safeParse(req.query);
        const history = await kitchenService.fetchKitchenHistory(tenantId, parsed.success ? parsed.data : { limit: 150 });
        res.status(200).json({ status: 'success', data: history });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch kitchen history' });
    }
};
exports.getHistory = getHistory;
const getPerformance = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const parsed = kitchen_validator_1.kitchenPerformanceQuerySchema.safeParse(req.query);
        const stats = await kitchenService.fetchKitchenPerformance(tenantId, parsed.success ? parsed.data : {});
        res.status(200).json({ status: 'success', data: stats });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch kitchen performance stats' });
    }
};
exports.getPerformance = getPerformance;
const getStationWorkload = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const data = await kitchenService.fetchStationWorkload(tenantId, branchId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to load station workload' });
    }
};
exports.getStationWorkload = getStationWorkload;
const postBumpStationItems = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const parsed = kitchen_validator_1.bumpStationItemsSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                status: 'error',
                message: parsed.error.issues[0]?.message || 'Invalid station bump payload',
            });
            return;
        }
        const result = await kitchenService.bumpStationQueueItems(tenantId, userId, parsed.data.orderId, parsed.data.station);
        res.status(200).json({
            status: 'success',
            data: result,
            message: result.allItemsReady
                ? `All stations complete — ${result.orderNumber} moved to Expediter Ready.`
                : `Station "${result.station}" items marked Ready (${result.orderNumber} remains in prep for other stations).`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to bump station items' });
    }
};
exports.postBumpStationItems = postBumpStationItems;
const getStationsMasterOverview = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const data = await kitchenService.fetchStationsManagementOverview(tenantId, branchId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to load stations master' });
    }
};
exports.getStationsMasterOverview = getStationsMasterOverview;
const postCreateKitchenStation = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const parsed = kitchen_validator_1.createKitchenStationSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                status: 'error',
                message: parsed.error.issues[0]?.message || 'Invalid kitchen station payload',
            });
            return;
        }
        const created = await kitchenService.createKitchenStation(tenantId, userId, parsed.data);
        res.status(201).json({
            status: 'success',
            data: created,
            message: `Prep station "${created.name}" (${created.code}) registered.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create kitchen station' });
    }
};
exports.postCreateKitchenStation = postCreateKitchenStation;
const patchUpdateKitchenStation = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const stationId = parseInt(String(req.params.id), 10);
        if (isNaN(stationId)) {
            res.status(400).json({ status: 'error', message: 'Invalid station ID' });
            return;
        }
        const parsed = kitchen_validator_1.updateKitchenStationSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                status: 'error',
                message: parsed.error.issues[0]?.message || 'Invalid station update payload',
            });
            return;
        }
        const updated = await kitchenService.updateKitchenStation(tenantId, userId, stationId, parsed.data);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: `Prep station "${updated.name}" updated.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update kitchen station' });
    }
};
exports.patchUpdateKitchenStation = patchUpdateKitchenStation;
const deleteKitchenStation = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const stationId = parseInt(String(req.params.id), 10);
        if (isNaN(stationId)) {
            res.status(400).json({ status: 'error', message: 'Invalid station ID' });
            return;
        }
        await kitchenService.deleteKitchenStation(tenantId, userId, stationId);
        res.status(200).json({ status: 'success', message: 'Prep station removed.' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to remove kitchen station' });
    }
};
exports.deleteKitchenStation = deleteKitchenStation;
const putKitchenGlobalSettings = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const parsed = kitchen_validator_1.updateKitchenGlobalSettingsSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                status: 'error',
                message: parsed.error.issues[0]?.message || 'Invalid global KDS settings payload',
            });
            return;
        }
        const saved = await kitchenService.saveKitchenGlobalSettings(tenantId, userId, parsed.data);
        res.status(200).json({
            status: 'success',
            data: saved,
            message: 'Global KDS orchestration and SLA rules saved.',
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to save KDS settings' });
    }
};
exports.putKitchenGlobalSettings = putKitchenGlobalSettings;
