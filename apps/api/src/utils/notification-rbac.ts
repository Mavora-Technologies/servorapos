// apps/api/src/utils/notification-rbac.ts

export const NOTIFICATION_MODULE_PERMISSIONS: Record<string, string[]> = {
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
export function getAllowedNotificationModules(
  permissions: string[],
  role?: string
): string[] | 'ALL' {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || permissions.includes('*')) {
    return 'ALL';
  }

  const allowed: string[] = [];
  for (const [moduleKey, requiredPerms] of Object.entries(NOTIFICATION_MODULE_PERMISSIONS)) {
    if (requiredPerms.some((perm) => permissions.includes(perm))) {
      allowed.push(moduleKey);
    }
  }

  return allowed;
}