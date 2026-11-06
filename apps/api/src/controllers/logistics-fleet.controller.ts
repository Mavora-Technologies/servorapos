import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as fleetRepo from '../repositories/logistics-fleet.repository';

export const getFleetDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch fleet telemetry' });
  }
};

export const createVehicle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const {
      vehiclePlate,
      makeModel,
      vehicleType,
      driverName,
      driverPhone,
      maxPayloadKg,
      isRefrigerated,
      minTargetTemp,
      maxTargetTemp,
      branchId,
    } = req.body;

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
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to register vehicle' });
  }
};

export const dispatchVehicle = async (req: AuthRequest, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to dispatch' });
  }
};