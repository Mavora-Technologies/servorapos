import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as locRepo from '../repositories/inventory-locations.repository';

export const getLocationsTopology = async (req: AuthRequest, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch warehouse topology' });
  }
};

export const createWarehouseZone = async (req: AuthRequest, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to register storage zone' });
  }
};

export const createWarehouseBin = async (req: AuthRequest, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to register storage bin' });
  }
};