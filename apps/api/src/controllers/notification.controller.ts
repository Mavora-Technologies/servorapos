// apps/api/src/controllers/notification.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as notificationRepo from '../repositories/notification.repository';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const items = await notificationRepo.fetchTenantNotifications(tenantId);
    const unreadCount = items.filter((i) => !i.isRead).length;

    res.status(200).json({
      status: 'success',
      data: {
        unreadCount,
        notifications: items,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch notifications' });
  }
};

export const patchNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawId = Array.isArray(id) ? id[0] : id;
    const notificationId = parseInt(rawId, 10);

    const updated = await notificationRepo.markNotificationAsRead(tenantId, notificationId);
    res.status(200).json({ status: 'success', data: updated, message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update notification' });
  }
};

export const patchReadAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    await notificationRepo.markAllNotificationsAsRead(tenantId);
    res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to batch update notifications' });
  }
};