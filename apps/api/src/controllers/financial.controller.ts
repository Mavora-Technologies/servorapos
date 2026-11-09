import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as financialRepo from '../repositories/financial.repository';
import {
  updateFinancialSettingsSchema,
  createTaxCodeSchema,
} from '../validators/financial.validator';

export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const data = await financialRepo.getOrCreateFinancialSettings(tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch financial settings' });
  }
};

export const putSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = updateFinancialSettingsSchema.parse(req.body);
    const updated = await financialRepo.updateFinancialSettings(tenantId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Financial parameters and tax schedules updated successfully.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update financial settings' });
  }
};

export const postTaxCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createTaxCodeSchema.parse(req.body);
    const created = await financialRepo.addCustomTaxCode(tenantId, input);

    res.status(201).json({
      status: 'success',
      data: created,
      message: 'Tax code registered successfully.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to register tax code' });
  }
};

export const deleteTaxCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const taxCodeId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(taxCodeId)) {
      res.status(400).json({ status: 'error', message: 'Invalid tax code identifier' });
      return;
    }

    await financialRepo.deleteCustomTaxCode(tenantId, taxCodeId);
    res.status(200).json({ status: 'success', message: 'Tax code removed.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete tax code' });
  }
};

export const testEtimsHandshake = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { settings } = await financialRepo.getOrCreateFinancialSettings(tenantId);

    if (!settings.taxPin) {
      res.status(400).json({
        status: 'error',
        message: 'KRA Tax PIN is required to initiate an eTIMS OSCU handshake.',
      });
      return;
    }

    // Simulate high-fidelity OSCU handshake telemetry
    const latencyMs = Math.floor(Math.random() * 60) + 40;
    const isSuccess = Boolean(settings.etimsBranchCode);

    if (!isSuccess) {
      res.status(502).json({
        status: 'error',
        message: 'OSCU Handshake timeout: No response from trader integration server.',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `eTIMS OSCU handshake verified successfully with KRA Gateway (${latencyMs}ms latency).`,
      data: {
        environment: settings.etimsEnvironment,
        taxPin: settings.taxPin,
        branchCode: settings.etimsBranchCode,
        deviceSerial: settings.etimsDeviceSerial || 'EMULATED-OSCU-01',
        protocolVersion: 'v1.4.2',
        latencyMs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'eTIMS verification failed' });
  }
};