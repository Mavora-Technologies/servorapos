// apps/api/src/controllers/notification.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as notificationRepo from '../repositories/notification.repository';
import * as roleService from '../services/role.service';
import {
  getAllowedNotificationModules,
  NOTIFICATION_MODULE_PERMISSIONS,
} from '../utils/notification-rbac';

async function resolveNotificationScope(
  req: AuthRequest
): Promise<notificationRepo.NotificationAccessScope | null> {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.userId;
  const roleSlug = req.user?.role || '';

  if (!tenantId || !userId) return null;

  const rawBranch = req.query.branchId ?? req.headers['x-branch-id'];
  const parsedBranch = rawBranch ? Number(rawBranch) : null;
  const activeBranchId =
    parsedBranch && Number.isInteger(parsedBranch) && parsedBranch > 0 ? parsedBranch : null;

  const [permissions, authorizedBranchIds] = await Promise.all([
    roleService.getEffectiveUserPermissions(tenantId, userId, roleSlug, activeBranchId),
    roleService.getUserAuthorizedBranches(tenantId, userId, roleSlug),
  ]);

  const allowedModules = getAllowedNotificationModules(permissions, roleSlug);

  return {
    tenantId,
    userId,
    allowedModules,
    authorizedBranchIds,
    activeBranchId,
  };
}

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scope = await resolveNotificationScope(req);
    if (!scope) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { category, severity, module, isRead, search, page, limit } = req.query;

    const [data, telemetry] = await Promise.all([
      notificationRepo.fetchScopedNotifications(scope, {
        category: category as notificationRepo.NotificationQueryFilters['category'],
        severity: severity as notificationRepo.NotificationQueryFilters['severity'],
        module: module as string | undefined,
        isRead: isRead as notificationRepo.NotificationQueryFilters['isRead'],
        search: search as string | undefined,
        page: page ? parseInt(String(page), 10) : 1,
        limit: limit ? parseInt(String(limit), 10) : 50,
      }),
      notificationRepo.fetchScopedTelemetrySummary(scope),
    ]);

    const exposedModules =
      scope.allowedModules === 'ALL'
        ? Object.keys(NOTIFICATION_MODULE_PERMISSIONS)
        : scope.allowedModules;

    res.status(200).json({
      status: 'success',
      data: {
        telemetry,
        allowedModules: exposedModules,
        notifications: data.notifications,
        pagination: {
          total: data.total,
          page: data.page,
          totalPages: data.totalPages,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notification bus';
    res.status(500).json({ status: 'error', message });
  }
};

export const patchResolveAction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scope = await resolveNotificationScope(req);
    if (!scope) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notificationId = parseInt(rawId, 10);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid notification identifier' });
      return;
    }

    const resolutionNotes =
      typeof req.body?.resolutionNotes === 'string' ? req.body.resolutionNotes : undefined;

    const updated = await notificationRepo.resolveScopedActionableNotification(
      scope,
      notificationId,
      resolutionNotes
    );

    if (!updated) {
      res.status(404).json({
        status: 'error',
        message: 'Notification not found or outside your operational clearance.',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Actionable item resolved and recorded in audit ledger.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to resolve notification';
    res.status(500).json({ status: 'error', message });
  }
};

export const patchNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scope = await resolveNotificationScope(req);
    if (!scope) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notificationId = parseInt(rawId, 10);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid notification identifier' });
      return;
    }

    const updated = await notificationRepo.markScopedNotificationAsRead(scope, notificationId);
    if (!updated) {
      res.status(404).json({
        status: 'error',
        message: 'Notification not found or outside your operational clearance.',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Notification marked as read',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update notification';
    res.status(500).json({ status: 'error', message });
  }
};

export const patchReadAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scope = await resolveNotificationScope(req);
    if (!scope) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const updatedCount = await notificationRepo.markAllScopedNotificationsAsRead(scope);
    res.status(200).json({
      status: 'success',
      data: { updatedCount },
      message: 'All authorized notifications marked as read',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to batch update notifications';
    res.status(500).json({ status: 'error', message });
  }
};