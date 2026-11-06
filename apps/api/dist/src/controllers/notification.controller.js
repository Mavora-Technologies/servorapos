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
exports.patchReadAll = exports.patchNotificationRead = exports.getNotifications = void 0;
const notificationRepo = __importStar(require("../repositories/notification.repository"));
const getNotifications = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch notifications' });
    }
};
exports.getNotifications = getNotifications;
const patchNotificationRead = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to update notification' });
    }
};
exports.patchNotificationRead = patchNotificationRead;
const patchReadAll = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        await notificationRepo.markAllNotificationsAsRead(tenantId);
        res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to batch update notifications' });
    }
};
exports.patchReadAll = patchReadAll;
