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
exports.createWarehouseBin = exports.createWarehouseZone = exports.getLocationsTopology = void 0;
const locRepo = __importStar(require("../repositories/inventory-locations.repository"));
const getLocationsTopology = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const { zones, bins } = await locRepo.listWarehouseTopology(tenantId);
        const metrics = {
            totalZones: zones.length,
            totalBins: bins.length,
            coldChainZones: zones.filter((z) => ['COLD_STORAGE', 'DEEP_FREEZE'].includes(z.zoneType)).length,
            occupiedBins: bins.filter((b) => b.isOccupied).length,
            quarantineBins: bins.filter((b) => b.isQuarantine).length,
        };
        res.status(200).json({
            status: 'success',
            data: {
                metrics,
                zones,
                bins,
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch warehouse topology' });
    }
};
exports.getLocationsTopology = getLocationsTopology;
const createWarehouseZone = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const { branchId, zoneCode, name, zoneType, temperatureMinC, temperatureMaxC } = req.body;
        if (!branchId || !zoneCode || !name) {
            res.status(400).json({ status: 'error', message: 'Depot Branch, Zone Identifier, and Name are required.' });
            return;
        }
        const zone = await locRepo.createZone({
            tenantId,
            branchId: parseInt(branchId, 10),
            zoneCode,
            name,
            zoneType: zoneType || 'INTERNAL_STORAGE',
            temperatureMinC,
            temperatureMaxC,
        });
        res.status(201).json({ status: 'success', data: zone, message: 'Storage zone registered successfully' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to register storage zone' });
    }
};
exports.createWarehouseZone = createWarehouseZone;
const createWarehouseBin = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const { zoneId, binCode, barcode, binType, pickSequence, maxWeightKg, maxVolumeCbm, isQuarantine } = req.body;
        if (!zoneId || !binCode) {
            res.status(400).json({ status: 'error', message: 'Storage Zone and Bin Coordinate Code are mandatory.' });
            return;
        }
        const bin = await locRepo.createBin({
            tenantId,
            zoneId: parseInt(zoneId, 10),
            binCode,
            barcode,
            binType,
            pickSequence: pickSequence ? parseInt(pickSequence, 10) : 10,
            maxWeightKg,
            maxVolumeCbm,
            isQuarantine,
        });
        res.status(201).json({ status: 'success', data: bin, message: 'Bin coordinate registered successfully' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to register storage bin' });
    }
};
exports.createWarehouseBin = createWarehouseBin;
