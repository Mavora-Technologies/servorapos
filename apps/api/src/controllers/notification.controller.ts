import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as notificationRepo from '../repositories/notification.repository';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { category, severity, module, isRead, search, page, limit } = req.query;

    const [data, telemetry] = await Promise.all([
      notificationRepo.fetchTenantNotifications(tenantId, {
        category: category as any,
        severity: severity as any,
        module: module as string,
        isRead: isRead as any,
        search: search as string,
        page: page ? parseInt(String(page), 10) : 1,
        limit: limit ? parseInt(String(limit), 10) : 50,
      }),
      notificationRepo.fetchNotificationTelemetrySummary(tenantId),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        telemetry,
        notifications: data.notifications,
        pagination: {
          total: data.total,
          page: data.page,
          totalPages: data.totalPages,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch notification bus' });
  }
};

export const patchResolveAction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const notificationId = parseInt(Array.isArray(id) ? id[0] : id, 10);
    const { resolutionNotes } = req.body;

    const updated = await notificationRepo.resolveActionableNotification(
      tenantId,
      userId,
      notificationId,
      resolutionNotes
    );

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Actionable item resolved and recorded in audit ledger.',
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to resolve notification' });
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