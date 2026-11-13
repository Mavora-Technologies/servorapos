// apps/api/src/controllers/kitchen.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as kitchenService from '../services/kitchen.service';
import {
  kitchenTicketsQuerySchema,
  kitchenHistoryQuerySchema,
  kitchenPerformanceQuerySchema,
  updateTicketStatusSchema,
  updateKitchenItemStatusSchema,
  bumpStationItemsSchema,
  createKitchenStationSchema,
  updateKitchenStationSchema,
  updateKitchenGlobalSettingsSchema,
} from '../validators/kitchen.validator';

export const getStationsMeta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const stations = await kitchenService.fetchTenantStations(tenantId);
    res.status(200).json({ status: 'success', data: stations });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to load kitchen stations' });
  }
};

export const getTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const parsed = kitchenTicketsQuerySchema.safeParse(req.query);
    const tickets = await kitchenService.fetchActiveTickets(
      tenantId,
      parsed.success ? parsed.data : {}
    );
    res.status(200).json({ status: 'success', data: tickets });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch tickets' });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ status: 'error', message: 'Invalid ticket ID' });
      return;
    }

    const parsed = updateTicketStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ status: 'error', message: 'Invalid ticket status' });
      return;
    }

    await kitchenService.advanceTicketStatus(tenantId, userId, id, parsed.data.status);
    res.status(200).json({ status: 'success', message: `Order marked as ${parsed.data.status}` });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const updateItemStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const itemId = parseInt(String(req.params.itemId), 10);
    if (isNaN(itemId)) {
      res.status(400).json({ status: 'error', message: 'Invalid line item ID' });
      return;
    }

    const parsed = updateKitchenItemStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ status: 'error', message: 'Invalid line item status' });
      return;
    }

    const updated = await kitchenService.advanceLineItemStatus(
      tenantId,
      itemId,
      parsed.data.kitchenStatus
    );
    res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const parsed = kitchenHistoryQuerySchema.safeParse(req.query);
    const history = await kitchenService.fetchKitchenHistory(
      tenantId,
      parsed.success ? parsed.data : { limit: 150 }
    );
    res.status(200).json({ status: 'success', data: history });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch kitchen history' });
  }
};

export const getPerformance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const parsed = kitchenPerformanceQuerySchema.safeParse(req.query);
    const stats = await kitchenService.fetchKitchenPerformance(
      tenantId,
      parsed.success ? parsed.data : {}
    );
    res.status(200).json({ status: 'success', data: stats });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch kitchen performance stats' });
  }
};

export const getStationWorkload = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const data = await kitchenService.fetchStationWorkload(tenantId, branchId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to load station workload' });
  }
};

export const postBumpStationItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    const parsed = bumpStationItemsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: parsed.error.issues[0]?.message || 'Invalid station bump payload',
      });
      return;
    }

    const result = await kitchenService.bumpStationQueueItems(
      tenantId,
      userId,
      parsed.data.orderId,
      parsed.data.station
    );

    res.status(200).json({
      status: 'success',
      data: result,
      message: result.allItemsReady
        ? `All stations complete — ${result.orderNumber} moved to Expediter Ready.`
        : `Station "${result.station}" items marked Ready (${result.orderNumber} remains in prep for other stations).`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to bump station items' });
  }
};

export const getStationsMasterOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const data = await kitchenService.fetchStationsManagementOverview(tenantId, branchId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to load stations master' });
  }
};

export const postCreateKitchenStation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    const parsed = createKitchenStationSchema.safeParse(req.body);
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
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create kitchen station' });
  }
};

export const patchUpdateKitchenStation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;
    const stationId = parseInt(String(req.params.id), 10);
    if (isNaN(stationId)) {
      res.status(400).json({ status: 'error', message: 'Invalid station ID' });
      return;
    }

    const parsed = updateKitchenStationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: parsed.error.issues[0]?.message || 'Invalid station update payload',
      });
      return;
    }

    const updated = await kitchenService.updateKitchenStation(
      tenantId,
      userId,
      stationId,
      parsed.data
    );
    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Prep station "${updated.name}" updated.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update kitchen station' });
  }
};

export const deleteKitchenStation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;
    const stationId = parseInt(String(req.params.id), 10);
    if (isNaN(stationId)) {
      res.status(400).json({ status: 'error', message: 'Invalid station ID' });
      return;
    }

    await kitchenService.deleteKitchenStation(tenantId, userId, stationId);
    res.status(200).json({ status: 'success', message: 'Prep station removed.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to remove kitchen station' });
  }
};

export const putKitchenGlobalSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    const parsed = updateKitchenGlobalSettingsSchema.safeParse(req.body);
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
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to save KDS settings' });
  }
};