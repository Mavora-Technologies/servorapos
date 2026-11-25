// apps/web/lib/rbac.ts

// Maps each route prefix to the exact permission(s) from ENTERPRISE_PERMISSIONS_CATALOG.
// Empty array = accessible to any authenticated user (e.g. /notifications, /help).
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  // Mission Control & Terminals
  '/dashboard': ['reports.view', 'settings.view'],
  '/pos': ['pos.access'],

  // Front-of-House & Guest Service
  '/orders/open': ['orders.view', 'pos.access'],
  '/orders/takeaway': ['orders.view', 'pos.access'],
  '/orders/delivery': ['orders.view'],
  '/orders': ['orders.view'],
  '/online-orders': ['orders.view'],
  '/tables': ['tables.manage', 'pos.access'],
  '/reservations/waitlist': ['reservations.manage'],
  '/reservations': ['reservations.manage'],

  // Kitchen Operations (KDS)
  '/kitchen/stations': ['kitchen.manage'],
  '/kitchen/history': ['kitchen.view', 'kitchen.manage'],
  '/kitchen/performance': ['reports.view', 'kitchen.manage'],
  '/kitchen': ['kitchen.view', 'kitchen.manage'],

  // Menu & Recipe Engineering
  '/menu/recipes/costing': ['recipes.view', 'reports.view'],
  '/menu/recipes/units': ['recipes.view', 'inventory.manage'],
  '/menu/recipes': ['recipes.view'],
  '/menu/categories': ['settings.manage', 'pos.discount'],
  '/menu/modifiers': ['settings.manage', 'pos.discount'],
  '/menu/combos': ['settings.manage', 'pos.discount'],
  '/menu/pricing': ['settings.manage', 'pos.discount'],
  '/menu/availability': ['kitchen.manage', 'pos.access', 'settings.manage'],
  '/menu': ['pos.access', 'recipes.view', 'settings.manage'],

  // Inventory & Logistics
  '/inventory/counts': ['inventory.count', 'inventory.manage'],
  '/inventory/transfers/fleet': ['inventory.manage'],
  '/inventory/transfers': ['inventory.manage'],
  '/inventory/locations': ['inventory.manage'],
  '/inventory/waste': ['inventory.adjust', 'inventory.manage'],
  '/inventory/movements': ['inventory.view', 'inventory.adjust'],
  '/inventory/batches': ['inventory.view'],
  '/inventory/reorder': ['inventory.view', 'purchasing.view'],
  '/inventory/items': ['inventory.view'],
  '/inventory': ['inventory.view'],

  // Procurement & Vendors
  '/suppliers': ['purchasing.view', 'purchasing.manage'],
  '/purchasing/receiving': ['purchasing.receive', 'purchasing.manage'],
  '/purchasing/returns': ['purchasing.manage'],
  '/purchasing/requests': ['purchasing.view', 'purchasing.manage'],
  '/purchasing/orders': ['purchasing.view', 'purchasing.manage'],
  '/purchasing/invoices': ['purchasing.view', 'payments.view'],

  // Treasury, Finance & Cash
  '/payments/reconciliation': ['payments.reconcile'],
  '/payments/refunds': ['refunds.view'],
  '/payments/mpesa': ['payments.view', 'payments.reconcile'],
  '/payments': ['payments.view'],
  '/cash-management/reconciliation': ['cash.reconcile'],
  '/cash-management/drawers': ['cash.view', 'cash.reconcile'],
  '/cash-management/shifts': ['cash.view', 'cash.reconcile'],
  '/finance/taxes': ['settings.manage', 'reports.view'],
  '/finance/adjustments': ['cash.reconcile', 'payments.reconcile'],
  '/finance/expenses': ['payments.view', 'reports.view'],
  '/finance/payables': ['purchasing.view', 'payments.view'],
  '/finance': ['payments.view', 'reports.view'],
  '/marketing': ['pos.discount', 'reports.view'],

  // Guests, Loyalty & Marketing
  '/customers/feedback': ['orders.view', 'reports.view'],
  '/customers': ['orders.view', 'pos.access'],
  '/loyalty/rewards': ['pos.discount', 'settings.manage'],
  '/loyalty/transactions': ['orders.view', 'payments.view'],
  '/loyalty': ['orders.view', 'pos.access'],
  '/marketing/campaigns': ['pos.discount', 'reports.view'],

  // Executive Analytics & BI
  '/reports/builder': ['reports.view'],
  '/reports/exports': ['reports.view'],
  '/reports': ['reports.view'],

  // AI & Automations
  '/ai-assistant': ['reports.view', 'settings.view'],
  '/automations/runs': ['settings.view', 'settings.manage'],
  '/automations': ['settings.manage'],
  '/notifications': [],

  // Staff & Workforce HCM
  '/staff/roles': ['staff.roles'],
  '/staff/cashier-assignments': ['staff.manage', 'cash.reconcile'],
  '/staff/incidents': ['staff.manage'],
  '/staff/performance': ['reports.view', 'staff.manage'],
  '/staff/schedules': ['staff.view', 'staff.manage'],
  '/staff/attendance': ['staff.view', 'staff.manage'],
  '/staff/handover': ['staff.view', 'cash.reconcile'],
  '/staff': ['staff.view', 'staff.manage'],

  // Organization & System Settings
  '/settings/business': ['settings.view', 'settings.manage'],
  '/settings/branches': ['settings.view', 'settings.manage'],
  '/settings/audit-logs': ['settings.view', 'settings.manage'],
  '/settings/billing': ['settings.view', 'settings.manage'],
  '/settings/security': ['settings.manage'],
  '/settings/offline': ['settings.manage'],
  '/settings/devices': ['settings.manage'],
  '/settings/financial': ['settings.manage'],
  '/settings/service-models': ['settings.manage'],
  '/settings/receipts': ['settings.manage'],
  '/settings/printers': ['settings.manage'],
  '/settings/kitchen': ['settings.manage', 'kitchen.manage'],
  '/settings/integrations': ['settings.manage'],
  '/settings/notifications': ['settings.manage'],
  '/help': [],
};

const SORTED_ROUTES = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);

// Ordered priority for resolving an operator's home workspace after login
const LANDING_ROUTE_PRIORITY: Array<{ path: string; label: string }> = [
  { path: '/dashboard', label: 'Overview Dashboard' },
  { path: '/pos', label: 'POS Terminal' },
  { path: '/kitchen', label: 'Kitchen Display' },
  { path: '/inventory', label: 'Inventory Ledger' },
  { path: '/purchasing/orders', label: 'Purchase Orders' },
  { path: '/payments', label: 'Payments Cockpit' },
  { path: '/orders', label: 'Order Ledger' },
  { path: '/staff', label: 'Staff Directory' },
  { path: '/notifications', label: 'Alert Center' },
];

export function getRequiredPermissionsForPath(pathname: string): string[] {
  if (!pathname) return [];
  const matched = SORTED_ROUTES.find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  return matched ? ROUTE_PERMISSIONS[matched] : [];
}

export function canAccessRoute(
  pathname: string,
  permissions?: string[],
  role?: string
): boolean {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || permissions?.includes('*')) {
    return true;
  }

  const required = getRequiredPermissionsForPath(pathname);
  if (required.length === 0) return true;

  // Fail closed when permissions are missing or empty
  if (!permissions || permissions.length === 0) return false;
  return required.some((perm) => permissions.includes(perm));
}

/**
 * Resolves the highest-priority workspace route the authenticated user is authorized to open.
 */
export function getDefaultLandingRoute(permissions?: string[], role?: string): string {
  for (const candidate of LANDING_ROUTE_PRIORITY) {
    if (canAccessRoute(candidate.path, permissions, role)) {
      return candidate.path;
    }
  }
  return '/notifications';
}

export function getLandingRouteLabel(route: string): string {
  return (
    LANDING_ROUTE_PRIORITY.find((item) => item.path === route)?.label || 'My Workspace'
  );
}

/**
 * Safely resolves an optional ?next= or ?redirect= target.
 * Rejects external URLs, auth pages, and any route the user lacks RBAC clearance for.
 */
export function resolveSafeRedirectPath(
  requestedPath: string | null | undefined,
  permissions?: string[],
  role?: string
): string {
  if (
    requestedPath &&
    requestedPath.startsWith('/') &&
    !requestedPath.startsWith('//') &&
    !requestedPath.startsWith('/login') &&
    !requestedPath.startsWith('/register') &&
    !requestedPath.startsWith('/forgot-password')
  ) {
    const cleanPathname = requestedPath.split('?')[0];
    if (canAccessRoute(cleanPathname, permissions, role)) {
      return requestedPath;
    }
  }

  return getDefaultLandingRoute(permissions, role);
}