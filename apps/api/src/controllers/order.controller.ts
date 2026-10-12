import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as orderRepo from '../repositories/order.repository';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const { orderType, subtotal, tax, total, items } = req.body;
    
    const order = await orderRepo.createOrderRecord(tenantId, { orderType, subtotal, tax, total }, items);
    res.status(201).json({ status: 'success', data: order });
  } catch (error: any) {
    console.error('[Order Error]:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process order' });
  }
};

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const allOrders = await orderRepo.fetchTenantOrders(tenantId);
    res.status(200).json({ status: 'success', data: allOrders });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch orders' });
  }
};

export const getOpenOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const openOrders = await orderRepo.fetchOpenOrders(tenantId);
    res.status(200).json({ status: 'success', data: openOrders });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch open orders' });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string; // Assert as string to satisfy TypeScript
    const { status } = req.body;
    
    // Pass the parsed integer
    await orderRepo.updateOrderStatus(tenantId, parseInt(id, 10), status);
    res.status(200).json({ status: 'success', message: `Order updated to ${status}` });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: 'Failed to update order status' });
  }
};

export const getTakeawayOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const takeawayOrders = await orderRepo.fetchTakeawayOrders(tenantId);
    res.status(200).json({ status: 'success', data: takeawayOrders });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch takeaway orders' });
  }
};