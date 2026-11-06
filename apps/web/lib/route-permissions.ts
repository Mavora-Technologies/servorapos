export const ROUTE_PERMISSIONS: Record<string, string> = {
  '/dashboard': 'dashboard.view',
  '/pos': 'pos.access',
  '/orders': 'orders.view',
  '/orders/open': 'orders.view',
  '/orders/delivery': 'delivery.view',
  '/tables': 'tables.view',
  '/reservations': 'reservations.view',
  '/kitchen': 'kitchen.view',
  '/kitchen/stations': 'kitchen.manage',
  '/menu': 'menu.view',
  '/menu/recipes': 'recipes.view',
  '/menu/recipes/costing': 'recipes.view',
  '/inventory': 'inventory.view',
  '/inventory/transfers': 'inventory.manage',
  '/inventory/transfers/fleet': 'inventory.manage',
  '/inventory/locations': 'inventory.manage',
  '/inventory/counts': 'inventory.manage',
  '/inventory/waste': 'inventory.manage',
  '/suppliers': 'suppliers.view',
  '/purchasing/orders': 'purchasing.view',
  '/purchasing/receiving': 'purchasing.receive',
  '/purchasing/invoices': 'purchasing.view',
  '/payments': 'payments.view',
  '/payments/mpesa': 'payments.view',
  '/payments/reconciliation': 'payments.reconcile',
  '/cash-management/drawers': 'cash.view',
  '/cash-management/reconciliation': 'cash.reconcile',
  '/reports': 'reports.view',
  '/staff': 'staff.view',
  '/staff/roles': 'staff.manage',
  '/settings/business': 'settings.view',
  '/settings/branches': 'branches.view',
  '/settings/financial': 'settings.manage',
};

export function canAccessRoute(pathname: string, userPermissions: string[] = []): boolean {
  if (userPermissions.includes('*')) return true;

  // Find the closest matching route configuration
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!matchedRoute) return true; // Unrestricted page
  return userPermissions.includes(ROUTE_PERMISSIONS[matchedRoute]);
}