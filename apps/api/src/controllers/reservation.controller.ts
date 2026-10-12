import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as reservationService from '../services/reservation.service';

export const getReservations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await reservationService.getReservations(req.user!.tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch reservations' });
  }
};

export const createReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reservation = await reservationService.addReservation(req.user!.tenantId, req.body);
    res.status(201).json({ status: 'success', data: reservation });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to create reservation' });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const reservation = await reservationService.changeStatus(req.user!.tenantId, parseInt(id, 10), req.body.status);
    res.status(200).json({ status: 'success', data: reservation });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to update status' });
  }
};