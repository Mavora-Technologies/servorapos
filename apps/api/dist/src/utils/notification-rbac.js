"use strict";
// apps/api/src/utils/notification-rbac.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFICATION_MODULE_PERMISSIONS = void 0;
exports.getAllowedNotificationModules = getAllowedNotificationModules;
exports.NOTIFICATION_MODULE_PERMISSIONS = {
    // Floor & Kitchen fulfillment (e.g., "Food Ready at Pass")
    KDS: ['pos.access', 'pos.kiosk', 'kitchen.view', 'kitchen.manage'],
    POS: ['pos.access', 'pos.kiosk', 'orders.view'],
    // Back-office & supervisory domains
    FINANCE: [
        'cash.reconcile',
        'payments.reconcile',
        'payments.view',
        'refunds.view',
        'reports.view',
    ],
    TREASURY: ['cash.reconcile', 'cash.view', 'payments.reconcile'],
    INVENTORY_SCM: [
        'inventory.view',
        'inventory.manage',
        'inventory.adjust',
        'purchasing.view',
        'purchasing.manage',
    ],
    WORKFORCE_HCM: ['staff.view', 'staff.manage', 'staff.roles'],
    GUEST_CRM: ['orders.view', 'pos.discount', 'reports.view'],
    SECURITY: ['settings.view', 'settings.manage'],
    SYSTEM: ['settings.view', 'settings.manage'],
};
/**
 * Resolves the notification modules a user may receive as tenant/branch broadcasts.
 * Returns 'ALL' for wildcard administrators.
 * A waiter/kiosk role with only `pos.access` or `pos.kiosk` resolves strictly to ['KDS', 'POS'].
 */
function getAllowedNotificationModules(permissions, role) {
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || permissions.includes('*')) {
        return 'ALL';
    }
    const allowed = [];
    for (const [moduleKey, requiredPerms] of Object.entries(exports.NOTIFICATION_MODULE_PERMISSIONS)) {
        if (requiredPerms.some((perm) => permissions.includes(perm))) {
            allowed.push(moduleKey);
        }
    }
    return allowed;
}
