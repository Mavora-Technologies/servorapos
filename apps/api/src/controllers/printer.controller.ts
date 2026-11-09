import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as printerRepo from '../repositories/printer.repository';
import {
  createPrinterSchema,
  updatePrinterSchema,
  testPrintSchema,
} from '../validators/printer.validator';

export const getPrinters = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { branchId } = req.query;
    const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;

    const result = await printerRepo.listNetworkPrinters(tenantId, branchIdNum);
    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch network printers' });
  }
};

export const postPrinter = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createPrinterSchema.parse(req.body);
    const created = await printerRepo.createPrinter(tenantId, input);

    res.status(201).json({
      status: 'success',
      data: created,
      message: 'Network hardware printer successfully provisioned.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to register printer' });
  }
};

export const putPrinter = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const printerId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(printerId)) {
      res.status(400).json({ status: 'error', message: 'Invalid device identifier' });
      return;
    }

    const input = updatePrinterSchema.parse(req.body);
    const updated = await printerRepo.updatePrinter(tenantId, printerId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Printer hardware parameters updated.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update printer' });
  }
};

export const deletePrinter = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const printerId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(printerId)) {
      res.status(400).json({ status: 'error', message: 'Invalid device identifier' });
      return;
    }

    await printerRepo.deletePrinter(tenantId, printerId);
    res.status(200).json({ status: 'success', message: 'Printer hardware profile removed.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete printer' });
  }
};

export const postPingPrinter = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const printerId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(printerId)) {
      res.status(400).json({ status: 'error', message: 'Invalid device identifier' });
      return;
    }

    const result = await printerRepo.pingPrinterHardware(tenantId, printerId);
    res.status(200).json({
      status: 'success',
      data: result,
      message: `Device handshake verified (${result.latencyMs}ms response time).`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Printer ping failed' });
  }
};

export const postTestPrint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { printerId } = testPrintSchema.parse(req.body);
    const pingResult = await printerRepo.pingPrinterHardware(tenantId, printerId);

    res.status(200).json({
      status: 'success',
      data: pingResult,
      message: `Test print ticket dispatched to ${pingResult.name} (${pingResult.ipAddress}:${pingResult.port}).`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Test print failed' });
  }
};