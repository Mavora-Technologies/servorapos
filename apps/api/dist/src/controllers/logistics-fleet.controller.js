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
            coldChainVehicles: vehicles.filter((v) => v.temperatureControlled).length,
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
        const { plateNumber, makeModel, vehicleType, driverName, driverPhone, maxPayloadKg, temperatureControlled, primaryBranchId, } = req.body;
        if (!plateNumber || !makeModel || !driverName || !driverPhone) {
            res.status(400).json({ status: 'error', message: 'Plate number, model, driver name, and phone are mandatory.' });
            return;
        }
        const vehicle = await fleetRepo.createVehicle({
            tenantId,
            primaryBranchId: primaryBranchId ? parseInt(primaryBranchId, 10) : null,
            plateNumber: plateNumber.toUpperCase().trim(),
            makeModel: makeModel.trim(),
            vehicleType: vehicleType || 'VAN',
            driverName: driverName.trim(),
            driverPhone: driverPhone.trim(),
            maxPayloadKg: maxPayloadKg ? parseFloat(maxPayloadKg).toFixed(2) : '1000.00',
            temperatureControlled: Boolean(temperatureControlled),
        });
        res.status(201).json({ status: 'success', data: vehicle, message: 'Vehicle registered in fleet directory' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to register vehicle' });
    }
};
exports.createVehicle = createVehicle;
const dispatchVehicle = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId; // ✅ Matches '{ userId: number; tenantId: number; role: string; ... }'
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const { transferId, vehicleId, departureOdometerKm, temperatureSetpointC, deliveryNotes } = req.body;
        if (!transferId || !vehicleId) {
            res.status(400).json({ status: 'error', message: 'Transfer ID and Vehicle ID are required for dispatch.' });
            return;
        }
        const result = await fleetRepo.dispatchVehicleForTransfer(tenantId, {
            transferId: parseInt(transferId, 10),
            vehicleId: parseInt(vehicleId, 10),
            dispatchedById: userId,
            departureOdometerKm: departureOdometerKm ? parseFloat(departureOdometerKm).toFixed(2) : undefined,
            temperatureSetpointC: temperatureSetpointC ? parseFloat(temperatureSetpointC).toFixed(2) : undefined,
            deliveryNotes,
        });
        res.status(200).json({ status: 'success', data: result, message: 'Consignment marked in-transit with assigned vehicle' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to dispatch vehicle' });
    }
};
exports.dispatchVehicle = dispatchVehicle;
