'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  UtensilsCrossed,
  Package,
  Settings,
  LogOut,
  FileText,
  X,
  ChevronDown,
  Store,
  Users,
  Wallet,
  CreditCard,
  Truck,
  CalendarDays,
  ClipboardList,
  ChartNoAxesCombined,
  BrainCircuit,
  Bell,
  ShieldCheck,
  Building2,
  Boxes,
  BookOpen,
  Receipt,
  UserRound,
  Tags,
  Clock,
  CookingPot,
  HandCoins,
  Puzzle,
  Monitor,
  RefreshCw,
  CircleHelp,
  Sparkles,
  Activity,
  FileChartColumn,
  Warehouse,
  BadgePercent,
  ContactRound,
  SlidersHorizontal,
  ShoppingBasket,
  History,
  Smartphone, // Added native Smartphone icon
  type LucideIcon,
} from 'lucide-react';

interface SidebarProps {
  isMobileMenuOpen: boolean;
  closeMobileMenu: () => void;
  handleLogout: () => void;
  allowedPermissions?: string[];
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

const standaloneItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard.view',
  },
  {
    label: 'POS Checkout',
    href: '/pos',
    icon: ShoppingCart,
    permission: 'pos.access',
  },
];

const navigationGroups: NavGroup[] = [
  {
    label: 'Sales & Service',
    icon: Store,
    items: [
      { label: 'All Orders', href: '/orders', icon: FileText, permission: 'orders.view' },
      { label: 'Open Orders', href: '/orders/open', icon: ClipboardList, permission: 'orders.view' },
      { label: 'Tables & Floor Plan', href: '/tables', icon: UtensilsCrossed, permission: 'tables.view' },
      { label: 'Reservations', href: '/reservations', icon: CalendarDays, permission: 'reservations.view' },
      { label: 'Waitlist', href: '/reservations/waitlist', icon: Clock, permission: 'reservations.view' },
      { label: 'Takeaway', href: '/takeaway', icon: ShoppingBasket, permission: 'orders.view' },
      { label: 'Delivery', href: '/delivery', icon: Truck, permission: 'delivery.view' },
      { label: 'Online Orders', href: '/online-orders', icon: Monitor, permission: 'orders.view' },
    ],
  },
  {
    label: 'Kitchen Operations',
    icon: ChefHat,
    items: [
      { label: 'Kitchen Display (KDS)', href: '/kitchen', icon: CookingPot, permission: 'kitchen.view' },
      { label: 'Kitchen Stations', href: '/kitchen/stations', icon: Boxes, permission: 'kitchen.manage' },
      { label: 'Ticket History', href: '/kitchen/history', icon: History, permission: 'kitchen.view' },
      { label: 'Kitchen Performance', href: '/kitchen/performance', icon: ChartNoAxesCombined, permission: 'reports.view' },
    ],
  },
  {
    label: 'Menu & Recipes',
    icon: UtensilsCrossed,
    items: [
      { label: 'Menu Overview', href: '/menu', icon: BookOpen, permission: 'menu.view' },
      { label: 'Categories', href: '/menu/categories', icon: Tags, permission: 'menu.manage' },
      { label: 'Menu Items', href: '/menu/items', icon: UtensilsCrossed, permission: 'menu.view' },
      { label: 'Modifiers & Extras', href: '/menu/modifiers', icon: SlidersHorizontal, permission: 'menu.manage' },
      { label: 'Combos & Bundles', href: '/menu/combos', icon: ShoppingBasket, permission: 'menu.manage' },
      { label: 'Pricing', href: '/menu/pricing', icon: BadgePercent, permission: 'menu.manage' },
      { label: 'Availability', href: '/menu/availability', icon: Clock, permission: 'menu.manage' },
      { label: 'Recipe Library', href: '/recipes', icon: CookingPot, permission: 'recipes.view' },
      { label: 'Recipe Costing', href: '/recipes/costing', icon: FileChartColumn, permission: 'recipes.view' },
      { label: 'Units & Conversions', href: '/recipes/units', icon: RefreshCw, permission: 'inventory.manage' },
    ],
  },
  {
    label: 'Inventory & Purchasing',
    icon: Package,
    items: [
      { label: 'Inventory Overview', href: '/inventory', icon: Boxes, permission: 'inventory.view' },
      { label: 'Stock Items', href: '/inventory/items', icon: Package, permission: 'inventory.view' },
      { label: 'Stock Movements', href: '/inventory/movements', icon: History, permission: 'inventory.view' },
      { label: 'Stock Counts', href: '/inventory/counts', icon: ClipboardList, permission: 'inventory.manage' },
      { label: 'Stock Transfers', href: '/inventory/transfers', icon: Truck, permission: 'inventory.manage' },
      { label: 'Batches & Expiry', href: '/inventory/batches', icon: CalendarDays, permission: 'inventory.view' },
      { label: 'Reorder Suggestions', href: '/inventory/reorder', icon: ShoppingBasket, permission: 'inventory.view' },
      { label: 'Waste Management', href: '/inventory/waste', icon: Package, permission: 'inventory.manage' },
      { label: 'Suppliers', href: '/suppliers', icon: ContactRound, permission: 'suppliers.view' },
      { label: 'Purchase Requests', href: '/purchasing/requests', icon: ClipboardList, permission: 'purchasing.view' },
      { label: 'Purchase Orders', href: '/purchasing/orders', icon: FileText, permission: 'purchasing.view' },
      { label: 'Goods Receiving', href: '/purchasing/receiving', icon: Warehouse, permission: 'purchasing.receive' },
      { label: 'Supplier Invoices', href: '/purchasing/invoices', icon: Receipt, permission: 'purchasing.view' },
      { label: 'Supplier Returns', href: '/purchasing/returns', icon: RefreshCw, permission: 'purchasing.manage' },
    ],
  },
  {
    label: 'Payments & Finance',
    icon: Wallet,
    items: [
      { label: 'Payments', href: '/payments', icon: CreditCard, permission: 'payments.view' },
      { label: 'M-Pesa Transactions', href: '/payments/mpesa', icon: Smartphone, permission: 'payments.view' }, // Swapped to native Smartphone icon
      { label: 'Reconciliation', href: '/payments/reconciliation', icon: RefreshCw, permission: 'payments.reconcile' },
      { label: 'Refunds', href: '/payments/refunds', icon: HandCoins, permission: 'refunds.view' },
      { label: 'Cash Drawers', href: '/cash-management/drawers', icon: Wallet, permission: 'cash.view' },
      { label: 'Cashier Shifts', href: '/cash-management/shifts', icon: Clock, permission: 'cash.view' },
      { label: 'Cash Reconciliation', href: '/cash-management/reconciliation', icon: ClipboardList, permission: 'cash.reconcile' },
      { label: 'Expenses', href: '/finance/expenses', icon: Receipt, permission: 'finance.view' },
      { label: 'Supplier Payables', href: '/finance/payables', icon: HandCoins, permission: 'finance.view' },
      { label: 'Taxes & Charges', href: '/finance/taxes', icon: FileText, permission: 'finance.manage' },
      { label: 'Financial Adjustments', href: '/finance/adjustments', icon: SlidersHorizontal, permission: 'finance.adjust' },
    ],
  },
  {
    label: 'Customers & Loyalty',
    icon: Users,
    items: [
      { label: 'Customers', href: '/customers', icon: Users, permission: 'customers.view' },
      { label: 'Loyalty Dashboard', href: '/loyalty', icon: Sparkles, permission: 'loyalty.view' },
      { label: 'Loyalty Transactions', href: '/loyalty/transactions', icon: History, permission: 'loyalty.view' },
      { label: 'Rewards & Vouchers', href: '/loyalty/rewards', icon: BadgePercent, permission: 'loyalty.manage' },
      { label: 'Customer Feedback', href: '/customers/feedback', icon: ContactRound, permission: 'customers.view' },
      { label: 'Marketing Campaigns', href: '/marketing/campaigns', icon: Bell, permission: 'marketing.manage' },
    ],
  },
  {
    label: 'Staff & Workforce',
    icon: UserRound,
    items: [
      { label: 'Staff Directory', href: '/staff', icon: Users, permission: 'staff.view' },
      { label: 'Roles & Permissions', href: '/staff/roles', icon: ShieldCheck, permission: 'staff.manage' },
      { label: 'Staff Schedules', href: '/staff/schedules', icon: CalendarDays, permission: 'staff.view' },
      { label: 'Attendance', href: '/staff/attendance', icon: Clock, permission: 'staff.view' },
      { label: 'Shift Handover', href: '/staff/handover', icon: ClipboardList, permission: 'staff.view' },
      { label: 'Cashier Assignments', href: '/staff/cashier-assignments', icon: Wallet, permission: 'staff.manage' },
      { label: 'Staff Performance', href: '/staff/performance', icon: ChartNoAxesCombined, permission: 'reports.view' },
      { label: 'Incident Reports', href: '/staff/incidents', icon: FileText, permission: 'staff.manage' },
    ],
  },
  {
    label: 'Reports & Analytics',
    icon: ChartNoAxesCombined,
    items: [
      { label: 'Analytics Overview', href: '/reports', icon: ChartNoAxesCombined, permission: 'reports.view' },
      { label: 'Sales Reports', href: '/reports/sales', icon: FileChartColumn, permission: 'reports.view' },
      { label: 'Product Performance', href: '/reports/products', icon: Tags, permission: 'reports.view' },
      { label: 'Payment Reports', href: '/reports/payments', icon: CreditCard, permission: 'reports.view' },
      { label: 'Inventory Reports', href: '/reports/inventory', icon: Package, permission: 'reports.view' },
      { label: 'Food Costing', href: '/reports/food-costing', icon: CookingPot, permission: 'reports.view' },
      { label: 'Waste Reports', href: '/reports/waste', icon: FileChartColumn, permission: 'reports.view' },
      { label: 'Procurement Reports', href: '/reports/procurement', icon: Truck, permission: 'reports.view' },
      { label: 'Cash Reports', href: '/reports/cash', icon: Wallet, permission: 'reports.view' },
      { label: 'Report Builder', href: '/reports/builder', icon: SlidersHorizontal, permission: 'reports.custom' },
      { label: 'Saved Reports', href: '/reports/saved', icon: BookOpen, permission: 'reports.view' },
      { label: 'Export History', href: '/reports/exports', icon: FileText, permission: 'reports.export' },
    ],
  },
  {
    label: 'AI & Automation',
    icon: BrainCircuit,
    items: [
      { label: 'AI Business Assistant', href: '/ai-assistant', icon: BrainCircuit, permission: 'ai.use' },
      { label: 'Sales Insights', href: '/ai-assistant/sales', icon: ChartNoAxesCombined, permission: 'ai.use' },
      { label: 'Demand Forecasting', href: '/ai-assistant/forecasting', icon: Activity, permission: 'ai.use' },
      { label: 'Stock Recommendations', href: '/ai-assistant/inventory', icon: Package, permission: 'ai.use' },
      { label: 'Menu Analysis', href: '/ai-assistant/menu-analysis', icon: Sparkles, permission: 'ai.use' },
      { label: 'Automation Rules', href: '/automations', icon: Puzzle, permission: 'automations.manage' },
      { label: 'Automation History', href: '/automations/runs', icon: History, permission: 'automations.view' },
      { label: 'Notifications', href: '/notifications', icon: Bell, permission: 'notifications.view' },
    ],
  },
  {
    label: 'Business Settings',
    icon: Settings,
    items: [
      { label: 'Business Profile', href: '/settings/business', icon: Building2, permission: 'settings.view' },
      { label: 'Branch Management', href: '/settings/branches', icon: Store, permission: 'branches.view' },
      { label: 'Financial Settings', href: '/settings/financial', icon: Wallet, permission: 'settings.manage' },
      { label: 'Service Models', href: '/settings/service-models', icon: UtensilsCrossed, permission: 'settings.manage' },
      { label: 'Receipt Configuration', href: '/settings/receipts', icon: Receipt, permission: 'settings.manage' },
      { label: 'Printer Management', href: '/settings/printers', icon: Monitor, permission: 'settings.manage' },
      { label: 'Kitchen Configuration', href: '/settings/kitchen', icon: ChefHat, permission: 'settings.manage' },
      { label: 'Payment Integrations', href: '/settings/integrations/payments', icon: CreditCard, permission: 'integrations.manage' },
      { label: 'Messaging Integrations', href: '/settings/integrations/messaging', icon: Bell, permission: 'integrations.manage' },
      { label: 'Online Ordering', href: '/settings/integrations/orders', icon: ShoppingCart, permission: 'integrations.manage' },
      { label: 'Notification Preferences', href: '/settings/notifications', icon: Bell, permission: 'settings.manage' },
      { label: 'Audit Logs', href: '/settings/audit-logs', icon: ShieldCheck, permission: 'audit.view' },
      { label: 'Offline Synchronization', href: '/settings/offline', icon: RefreshCw, permission: 'settings.manage' },
      { label: 'Device Management', href: '/settings/devices', icon: Monitor, permission: 'settings.manage' },
      { label: 'Subscription & Billing', href: '/settings/billing', icon: Receipt, permission: 'billing.view' },
      { label: 'Security Settings', href: '/settings/security', icon: ShieldCheck, permission: 'settings.security' },
    ],
  },
];

const platformGroup: NavGroup = {
  label: 'Mavora Platform',
  icon: Building2,
  items: [
    { label: 'Platform Dashboard', href: '/platform', icon: LayoutDashboard, permission: 'platform.access' },
    { label: 'Restaurant Tenants', href: '/platform/tenants', icon: Building2, permission: 'platform.tenants' },
    { label: 'Subscriptions & Plans', href: '/platform/plans', icon: Receipt, permission: 'platform.billing' },
    { label: 'Feature Management', href: '/platform/features', icon: Puzzle, permission: 'platform.manage' },
    { label: 'Platform Users', href: '/platform/users', icon: Users, permission: 'platform.users' },
    { label: 'Support Access', href: '/platform/support-access', icon: ShieldCheck, permission: 'platform.support' },
    { label: 'Usage Analytics', href: '/platform/usage', icon: ChartNoAxesCombined, permission: 'platform.analytics' },
    { label: 'Integration Health', href: '/platform/integrations', icon: Activity, permission: 'platform.monitor' },
    { label: 'Background Jobs', href: '/platform/jobs', icon: RefreshCw, permission: 'platform.monitor' },
    { label: 'Error Monitoring', href: '/platform/errors', icon: Activity, permission: 'platform.monitor' },
    { label: 'Platform Billing', href: '/platform/billing', icon: Wallet, permission: 'platform.billing' },
    { label: 'Platform Audit Logs', href: '/platform/audit-logs', icon: ShieldCheck, permission: 'platform.audit' },
    { label: 'System Health', href: '/platform/health', icon: Activity, permission: 'platform.monitor' },
  ],
};

function routeIsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupIsActive(pathname: string, group: NavGroup) {
  return group.items.some((item) => routeIsActive(pathname, item.href));
}

function hasPermission(item: NavItem, permissions?: string[]) {
  if (!permissions) return true;
  return item.permission ? permissions.includes(item.permission) : true;
}

export default function Sidebar({
  isMobileMenuOpen,
  closeMobileMenu,
  handleLogout,
  allowedPermissions,
}: SidebarProps) {
  const pathname = usePathname();

  const visibleGroups = useMemo(
    () =>
      navigationGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            hasPermission(item, allowedPermissions),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [allowedPermissions],
  );

  const visibleStandaloneItems = useMemo(
    () => standaloneItems.filter((item) => hasPermission(item, allowedPermissions)),
    [allowedPermissions],
  );

  const canAccessPlatform = !!allowedPermissions?.some((permission) =>
    permission.startsWith('platform.'),
  );

  const visiblePlatformGroup = useMemo(
    () => ({
      ...platformGroup,
      items: platformGroup.items.filter((item) =>
        hasPermission(item, allowedPermissions),
      ),
    }),
    [allowedPermissions],
  );

  const groups = canAccessPlatform
    ? [...visibleGroups, visiblePlatformGroup]
    : visibleGroups;

  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    const activeGroups = groups
      .filter((group) => groupIsActive(pathname, group))
      .map((group) => group.label);

    setExpandedGroups((current) => [...new Set([...current, ...activeGroups])]);
  }, [pathname, groups]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    );
  };

  const linkClasses = (href: string) => {
    const active = routeIsActive(pathname, href);

    return [
      'flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5',
      'text-sm font-medium transition-colors duration-150',
      active
        ? 'bg-servora-core/20 text-white'
        : 'text-servora-pale/75 hover:bg-white/5 hover:text-white',
    ].join(' ');
  };

  const renderNavItem = (item: NavItem, nested = false) => {
    const Icon = item.icon;
    const active = routeIsActive(pathname, item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeMobileMenu}
        aria-current={active ? 'page' : undefined}
        className={[
          linkClasses(item.href),
          nested ? 'ml-3 py-2 text-[13px]' : '',
          active ? 'border-l-2 border-servora-core' : 'border-l-2 border-transparent',
        ].join(' ')}
      >
        <Icon size={nested ? 16 : 18} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      <aside
        aria-label="Main navigation"
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col',
          'bg-servora-navy text-servora-pale shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          'lg:static lg:translate-x-0 lg:shadow-xl',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Brand header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-servora-pale/10 bg-white px-5">
          <Link
            href="/dashboard"
            onClick={closeMobileMenu}
            aria-label="Servora home"
            className="flex items-center"
          >
            <Image
              src="/logo.png"
              alt="Servora"
              width={130}
              height={38}
              priority
              className="h-auto max-h-10 w-auto object-contain"
            />
          </Link>

          <button
            type="button"
            onClick={closeMobileMenu}
            aria-label="Close menu"
            className="rounded-md p-2 text-servora-navy transition-colors hover:bg-servora-pale lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-5">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-servora-pale/45">
            Overview
          </p>

          {visibleStandaloneItems.map((item) => renderNavItem(item))}

          <div className="my-5 border-t border-servora-pale/10" />

          {groups.map((group) => {
            const GroupIcon = group.icon;
            const expanded = expandedGroups.includes(group.label);
            const active = groupIsActive(pathname, group);

            return (
              <section key={group.label} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={expanded}
                  className={[
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5',
                    'text-left text-sm font-semibold transition-colors',
                    active
                      ? 'text-white'
                      : 'text-servora-pale/70 hover:bg-white/5 hover:text-white',
                  ].join(' ')}
                >
                  <GroupIcon size={18} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{group.label}</span>
                  <ChevronDown
                    size={16}
                    className={[
                      'shrink-0 transition-transform duration-200',
                      expanded ? 'rotate-180' : '',
                    ].join(' ')}
                  />
                </button>

                {expanded && (
                  <div className="mt-1 space-y-0.5">
                    {group.items.map((item) => renderNavItem(item, true))}
                  </div>
                )}
              </section>
            );
          })}

          <div className="my-5 border-t border-servora-pale/10" />

          {renderNavItem({
            label: 'Help & Support',
            href: '/help',
            icon: CircleHelp,
            permission: 'help.view',
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-servora-pale/10 p-3">
          <div className="mb-2 flex items-center gap-2 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-servora-core/20">
              <Store size={16} className="text-servora-pale" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">Servora POS</p>
              <p className="truncate text-[10px] text-servora-pale/50">
                Powered by Mavora Technologies
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-servora-pale/75 transition-colors hover:bg-red-500/15 hover:text-red-300"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}