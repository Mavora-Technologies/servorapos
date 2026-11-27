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
exports.finalizeStockCountReconciliation = exports.recordPhysicalCountLine = exports.startStockCountSession = exports.fetchStockCountSheet = exports.listTenantStockCounts = void 0;
// apps/api/src/services/stock-count.service.ts
const stockCountRepo = __importStar(require("../repositories/stock-count.repository"));
const listTenantStockCounts = async (tenantId) => {
    return await stockCountRepo.findStockCountsByTenant(tenantId);
};
exports.listTenantStockCounts = listTenantStockCounts;
const fetchStockCountSheet = async (tenantId, countId) => {
    if (!Number.isInteger(countId) || countId <= 0) {
        throw new Error('Invalid stock count ID');
    }
    return await stockCountRepo.findStockCountDetailsById(tenantId, countId);
};
exports.fetchStockCountSheet = fetchStockCountSheet;
const startStockCountSession = async (tenantId, branchId, userId, payload) => {
    return await stockCountRepo.createStockCountSessionTransaction(tenantId, branchId, userId, payload);
};
exports.startStockCountSession = startStockCountSession;
const recordPhysicalCountLine = async (tenantId, lineId, payload) => {
    if (!Number.isInteger(lineId) || lineId <= 0) {
        throw new Error('Invalid stock count line ID');
    }
    return await stockCountRepo.updateStockCountLineTransaction(tenantId, lineId, payload);
};
exports.recordPhysicalCountLine = recordPhysicalCountLine;
const finalizeStockCountReconciliation = async (tenantId, branchId, userId, countId, payload) => {
    if (!Number.isInteger(countId) || countId <= 0) {
        throw new Error('Invalid stock count ID');
    }
    return await stockCountRepo.reconcileStockCountTransaction(tenantId, branchId, userId, countId, payload);
};
exports.finalizeStockCountReconciliation = finalizeStockCountReconciliation;
