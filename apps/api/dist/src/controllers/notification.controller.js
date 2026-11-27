"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchReadAll = exports.patchNotificationRead = exports.patchResolveAction = exports.getNotifications = void 0;
const notificationRepo = __importStar(require("../repositories/notification.repository"));
const roleService = __importStar(require("../services/role.service"));
const notification_rbac_1 = require("../utils/notification-rbac");
async function resolveNotificationScope(req) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const roleSlug = req.user?.role || '';
    if (!tenantId || !userId)
        return null;
    const rawBranch = req.query.branchId ?? req.headers['x-branch-id'];
    const parsedBranch = rawBranch ? Number(rawBranch) : null;
    const activeBranchId = parsedBranch && Number.isInteger(parsedBranch) && parsedBranch > 0 ? parsedBranch : null;
    const [permissions, authorizedBranchIds] = await Promise.all([
        roleService.getEffectiveUserPermissions(tenantId, userId, roleSlug, activeBranchId),
        roleService.getUserAuthorizedBranches(tenantId, userId, roleSlug),
    ]);
    const allowedModules = (0, notification_rbac_1.getAllowedNotificationModules)(permissions, roleSlug);
    return {
        tenantId,
        userId,
        allowedModules,
        authorizedBranchIds,
        activeBranchId,
    };
}
const getNotifications = async (req, res) => {
    try {
        const scope = await resolveNotificationScope(req);
        if (!scope) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { category, severity, module, isRead, search, page, limit } = req.query;
        const [data, telemetry] = await Promise.all([
            notificationRepo.fetchScopedNotifications(scope, {
                category: category,
                severity: severity,
                module: module,
                isRead: isRead,
                search: search,
                page: page ? parseInt(String(page), 10) : 1,
                limit: limit ? parseInt(String(limit), 10) : 50,
            }),
            notificationRepo.fetchScopedTelemetrySummary(scope),
        ]);
        const exposedModules = scope.allowedModules === 'ALL'
            ? Object.keys(notification_rbac_1.NOTIFICATION_MODULE_PERMISSIONS)
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch notification bus';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getNotifications = getNotifications;
const patchResolveAction = async (req, res) => {
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
        const resolutionNotes = typeof req.body?.resolutionNotes === 'string' ? req.body.resolutionNotes : undefined;
        const updated = await notificationRepo.resolveScopedActionableNotification(scope, notificationId, resolutionNotes);
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to resolve notification';
        res.status(500).json({ status: 'error', message });
    }
};
exports.patchResolveAction = patchResolveAction;
const patchNotificationRead = async (req, res) => {
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update notification';
        res.status(500).json({ status: 'error', message });
    }
};
exports.patchNotificationRead = patchNotificationRead;
const patchReadAll = async (req, res) => {
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to batch update notifications';
        res.status(500).json({ status: 'error', message });
    }
};
exports.patchReadAll = patchReadAll;
