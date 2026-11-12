import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as kitchenService from '../services/kitchen.service';
import {
  kitchenTicketsQuerySchema,
  updateTicketStatusSchema,
  updateKitchenItemStatusSchema,
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
    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const history = await kitchenService.fetchKitchenHistory(tenantId, branchId);
    res.status(200).json({ status: 'success', data: history });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch kitchen history' });
  }
};

export const getPerformance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const stats = await kitchenService.fetchKitchenPerformance(tenantId, branchId);
    res.status(200).json({ status: 'success', data: stats });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch kitchen performance stats' });
  }
};