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
exports.dispatchVehicle = exports.createVehicle = exports.getFleetDashboard = void 0;
const fleetRepo = __importStar(require("../repositories/logistics-fleet.repository"));
const getFleetDashboard = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const [vehicles, activeDispatches] = await Promise.all([
            fleetRepo.listVehiclesByTenant(tenantId),
            fleetRepo.listActiveFleetDispatches(tenantId),
        ]);
        const metrics = {
            totalVehicles: vehicles.length,
            availableVehicles: vehicles.filter((v) => v.currentStatus === 'AVAILABLE').length,
            inTransitVehicles: vehicles.filter((v) => v.currentStatus === 'IN_TRANSIT').length,
            maintenanceVehicles: vehicles.filter((v) => v.currentStatus === 'MAINTENANCE').length,
            coldChainVehicles: vehicles.filter((v) => v.isRefrigerated).length,
        };
        res.status(200).json({
            status: 'success',
            data: {
                metrics,
                vehicles,
                activeDispatches,
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch fleet telemetry' });
    }
};
exports.getFleetDashboard = getFleetDashboard;
const createVehicle = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const { vehiclePlate, makeModel, vehicleType, driverName, driverPhone, maxPayloadKg, isRefrigerated, minTargetTemp, maxTargetTemp, branchId, } = req.body;
        if (!vehiclePlate) {
            res.status(400).json({ status: 'error', message: 'Vehicle registration plate is required.' });
            return;
        }
        const vehicle = await fleetRepo.createVehicle({
            tenantId,
            branchId: branchId ? parseInt(branchId, 10) : null,
            vehiclePlate: vehiclePlate.toUpperCase().trim(),
            makeModel: makeModel?.trim() || 'Standard Fleet',
            vehicleType: vehicleType || 'REEFER_VAN',
            driverName: driverName?.trim(),
            driverPhone: driverPhone?.trim(),
            maxPayloadKg: maxPayloadKg ? parseFloat(maxPayloadKg).toFixed(2) : '1500.00',
            isRefrigerated: Boolean(isRefrigerated),
            minTargetTemp: minTargetTemp ? parseFloat(minTargetTemp).toFixed(2) : undefined,
            maxTargetTemp: maxTargetTemp ? parseFloat(maxTargetTemp).toFixed(2) : undefined,
        });
        res.status(201).json({ status: 'success', data: vehicle, message: 'Vehicle asset registered successfully' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to register vehicle' });
    }
};
exports.createVehicle = createVehicle;
const dispatchVehicle = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const { transferId, fleetVehicleId, departureOdometerKm, dispatchTempProbe, deliveryNotes } = req.body;
        if (!transferId || !fleetVehicleId) {
            res.status(400).json({ status: 'error', message: 'transferId and fleetVehicleId are required.' });
            return;
        }
        const result = await fleetRepo.dispatchVehicleForTransfer(tenantId, {
            transferId: parseInt(transferId, 10),
            fleetVehicleId: parseInt(fleetVehicleId, 10),
            dispatchedById: userId,
            departureOdometerKm: departureOdometerKm ? parseFloat(departureOdometerKm).toFixed(2) : undefined,
            dispatchTempProbe: dispatchTempProbe ? parseFloat(dispatchTempProbe).toFixed(2) : undefined,
            deliveryNotes,
        });
        res.status(200).json({ status: 'success', data: result, message: 'Consignment marked in transit' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to dispatch' });
    }
};
exports.dispatchVehicle = dispatchVehicle;
