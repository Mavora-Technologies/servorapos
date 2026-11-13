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
exports.saveKitchenGlobalSettings = exports.deleteKitchenStation = exports.updateKitchenStation = exports.createKitchenStation = exports.fetchStationsManagementOverview = exports.bumpStationQueueItems = exports.fetchStationWorkload = exports.fetchKitchenPerformance = exports.fetchKitchenHistory = exports.advanceLineItemStatus = exports.advanceTicketStatus = exports.fetchActiveTickets = exports.fetchTenantStations = void 0;
// apps/api/src/services/kitchen.service.ts
const kitchenRepo = __importStar(require("../repositories/kitchen.repository"));
const fetchTenantStations = async (tenantId) => {
    return await kitchenRepo.getDistinctTenantKitchenStations(tenantId);
};
exports.fetchTenantStations = fetchTenantStations;
const fetchActiveTickets = async (tenantId, query = {}) => {
    return await kitchenRepo.getActiveKitchenTickets(tenantId, query);
};
exports.fetchActiveTickets = fetchActiveTickets;
const advanceTicketStatus = async (tenantId, userId, orderId, status) => {
    if (!['Confirmed', 'Preparing', 'Ready', 'Cancelled'].includes(status)) {
        throw new Error('Invalid kitchen status transition');
    }
    return await kitchenRepo.updateTicketStatus(tenantId, userId, orderId, status);
};
exports.advanceTicketStatus = advanceTicketStatus;
const advanceLineItemStatus = async (tenantId, orderItemId, kitchenStatus) => {
    return await kitchenRepo.updateLineItemKitchenStatus(tenantId, orderItemId, kitchenStatus);
};
exports.advanceLineItemStatus = advanceLineItemStatus;
const fetchKitchenHistory = async (tenantId, query = { limit: 150 }) => {
    return await kitchenRepo.getKitchenHistoryTickets(tenantId, query);
};
exports.fetchKitchenHistory = fetchKitchenHistory;
const fetchKitchenPerformance = async (tenantId, query = {}) => {
    return await kitchenRepo.getKitchenPerformanceStats(tenantId, query);
};
exports.fetchKitchenPerformance = fetchKitchenPerformance;
const fetchStationWorkload = async (tenantId, branchId) => {
    return await kitchenRepo.getStationWorkloadSummary(tenantId, branchId);
};
exports.fetchStationWorkload = fetchStationWorkload;
const bumpStationQueueItems = async (tenantId, userId, orderId, station) => {
    return await kitchenRepo.bumpStationItemsOnOrder(tenantId, userId, orderId, station);
};
exports.bumpStationQueueItems = bumpStationQueueItems;
const fetchStationsManagementOverview = async (tenantId, branchId) => {
    const [stations, workloads, globalSettings, categories] = await Promise.all([
        kitchenRepo.listConfiguredKitchenStations(tenantId, branchId),
        kitchenRepo.getStationWorkloadSummary(tenantId, branchId),
        kitchenRepo.getKitchenGlobalSettingsRecord(tenantId),
        kitchenRepo.listTenantMenuCategoriesForRouting(tenantId),
    ]);
    return {
        stations,
        workloads,
        globalSettings,
        categories,
    };
};
exports.fetchStationsManagementOverview = fetchStationsManagementOverview;
const createKitchenStation = async (tenantId, userId, input) => {
    return await kitchenRepo.createKitchenStationRecord(tenantId, userId, input);
};
exports.createKitchenStation = createKitchenStation;
const updateKitchenStation = async (tenantId, userId, stationId, input) => {
    return await kitchenRepo.updateKitchenStationRecord(tenantId, userId, stationId, input);
};
exports.updateKitchenStation = updateKitchenStation;
const deleteKitchenStation = async (tenantId, userId, stationId) => {
    return await kitchenRepo.deleteKitchenStationRecord(tenantId, userId, stationId);
};
exports.deleteKitchenStation = deleteKitchenStation;
const saveKitchenGlobalSettings = async (tenantId, userId, input) => {
    return await kitchenRepo.upsertKitchenGlobalSettingsRecord(tenantId, userId, input);
};
exports.saveKitchenGlobalSettings = saveKitchenGlobalSettings;
