'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
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
  ChevronLeft,
  ChevronRight,
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
  Smartphone,
  Search,
  Check,
  ChevronsUpDown,
  Star,
  CornerDownLeft,
  ChevronsDownUp,
  ChevronsUpDown as ExpandAllIcon,
  Megaphone,
  Target,
  FileCode,
  type LucideIcon,
} from 'lucide-react';

interface BranchNode {
  id: number;
  name: string;
  code: string;
  isMainBranch?: boolean;
  isActive?: boolean;
}

interface SidebarProps {
  isMobileMenuOpen: boolean;
  closeMobileMenu: () => void;
  handleLogout: () => void;
  allowedPermissions?: string[];
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
  businessName?: string;
  activeBranch?: string;
  userRole?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  badge?: string;
  badgeType?: 'live' | 'warning' | 'info' | 'count';
  keywords?: string[];
}

interface NavGroup {
  label: string;
  domain: 'OPERATIONS' | 'SUPPLY_CHAIN' | 'FINANCE_GROWTH' | 'ADMINISTRATION';
  icon: LucideIcon;
  items: NavItem[];
}

const domainHeaders: Record<NavGroup['domain'], string> = {
  OPERATIONS: 'Front-of-House & Culinary Operations',
  SUPPLY_CHAIN: 'Supply Chain, Fleet & Inventory',
  FINANCE_GROWTH: 'Finance, Treasury & Customer Growth',
  ADMINISTRATION: 'Human Capital & System Settings',
};

const standaloneItems: NavItem[] = [
  {
    label: 'Overview Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard.view',
    keywords: ['metrics', 'summary', 'analytics', 'home'],
  },
  {
    label: 'Point of Sale Terminal',
    href: '/pos',
    icon: ShoppingCart,
    permission: 'pos.access',
    badge: 'Live',
    badgeType: 'live',
    keywords: ['register', 'checkout', 'billing', 'cashier'],
  },
];

const navigationGroups: NavGroup[] = [
  {
    label: 'Orders & Guest Service',
    domain: 'OPERATIONS',
    icon: Store,
    items: [
      { label: 'All Orders Ledger', href: '/orders', icon: FileText, permission: 'orders.view', keywords: ['sales', 'receipts'] },
      { label: 'Open Dining Checks', href: '/orders/open', icon: ClipboardList, permission: 'orders.view', keywords: ['active', 'tables'] },
      { label: 'Floor Layout & Tables', href: '/tables', icon: UtensilsCrossed, permission: 'tables.view', keywords: ['seating', 'map'] },
      { label: 'Table Reservations', href: '/reservations', icon: CalendarDays, permission: 'reservations.view', keywords: ['booking', 'calendar'] },
      { label: 'Guest Waitlist Queue', href: '/reservations/waitlist', icon: Clock, permission: 'reservations.view', keywords: ['walkin', 'line'] },
      { label: 'Takeaway & Express Pickups', href: '/orders/takeaway', icon: ShoppingBasket, permission: 'orders.view', keywords: ['to-go', 'pickup'] },
      { label: 'Dispatch & Delivery Tracking', href: '/orders/delivery', icon: Truck, permission: 'delivery.view', keywords: ['courier', 'rider'] },
      { label: 'Online Ordering Storefront', href: '/online-orders', icon: Monitor, permission: 'orders.view', keywords: ['web', 'menu'] },
    ],
  },
  {
    label: 'Kitchen Operations (KDS)',
    domain: 'OPERATIONS',
    icon: ChefHat,
    items: [
      { label: 'Kitchen Display Console', href: '/kitchen', icon: CookingPot, permission: 'kitchen.view', keywords: ['kds', 'line', 'prep'] },
      { label: 'Kitchen Prep Stations', href: '/kitchen/stations', icon: Boxes, permission: 'kitchen.manage', keywords: ['grill', 'bar', 'cold'] },
      { label: 'Completed Ticket History', href: '/kitchen/history', icon: History, permission: 'kitchen.view', keywords: ['served', 'orders'] },
      { label: 'Culinary SLA & Speed of Service', href: '/kitchen/performance', icon: ChartNoAxesCombined, permission: 'reports.view', keywords: ['time', 'cook'] },
    ],
  },
  {
    label: 'Menu & Recipe Engineering',
    domain: 'OPERATIONS',
    icon: UtensilsCrossed,
    items: [
      { label: 'Menu Catalog Master', href: '/menu', icon: BookOpen, permission: 'menu.view', keywords: ['dishes', 'beverages'] },
      { label: 'Category Architecture', href: '/menu/categories', icon: Tags, permission: 'menu.manage', keywords: ['groups', 'sections'] },
      { label: 'Item Modifiers & Variations', href: '/menu/modifiers', icon: SlidersHorizontal, permission: 'menu.manage', keywords: ['options', 'addons'] },
      { label: 'Combos & Value Bundles', href: '/menu/combos', icon: ShoppingBasket, permission: 'menu.manage', keywords: ['sets', 'deals'] },
      { label: 'Dynamic Pricing Schedules', href: '/menu/pricing', icon: BadgePercent, permission: 'menu.manage', keywords: ['happy hour', 'promotions'] },
      { label: 'Item Availability & 86 List', href: '/menu/availability', icon: Clock, permission: 'menu.manage', keywords: ['out of stock', 'sold out'] },
      { label: 'Recipe Formulas & BOM', href: '/menu/recipes', icon: CookingPot, permission: 'recipes.view', keywords: ['ingredients', 'portions'] },
      { label: 'Food Cost & Contribution Margin', href: '/menu/recipes/costing', icon: FileChartColumn, permission: 'recipes.view', keywords: ['profit', 'cogs'] },
      { label: 'Unit of Measure Conversions', href: '/menu/recipes/units', icon: RefreshCw, permission: 'inventory.manage', keywords: ['kg', 'litres', 'grams'] },
    ],
  },
  {
    label: 'Inventory & Logistics',
    domain: 'SUPPLY_CHAIN',
    icon: Package,
    items: [
      { label: 'Stock Valuation Ledger', href: '/inventory', icon: Boxes, permission: 'inventory.view', keywords: ['stock', 'on-hand'] },
      { label: 'Raw Materials & Master SKUs', href: '/inventory/items', icon: Package, permission: 'inventory.view', keywords: ['ingredients', 'products'] },
      { label: 'Stock Movements & Bin Cards', href: '/inventory/movements', icon: History, permission: 'inventory.view', keywords: ['inward', 'outward', 'adjustments'] },
      { label: 'Physical Stock Audits', href: '/inventory/counts', icon: ClipboardList, permission: 'inventory.manage', keywords: ['stocktake', 'variance'] },
      { label: 'Inter-Branch Transfers', href: '/inventory/transfers', icon: Truck, permission: 'inventory.manage', keywords: ['depot', 'internal movement'] },
      { label: 'Logistics Fleet & Dispatch Console', href: '/inventory/transfers/fleet', icon: Truck, permission: 'inventory.manage', keywords: ['vans', 'vehicles', 'reefer', 'driver'] },
      { label: 'Warehouse Layout & Storage Bins', href: '/inventory/locations', icon: Warehouse, permission: 'inventory.manage', keywords: ['zones', 'racks', 'shelves', 'chiller'] },
      { label: 'Lot Batches & Expiry Dates', href: '/inventory/batches', icon: CalendarDays, permission: 'inventory.view', keywords: ['fifo', 'shelf life'] },
      { label: 'Automated Reorder Engine', href: '/inventory/reorder', icon: ShoppingBasket, permission: 'inventory.view', keywords: ['par levels', 'low stock'] },
      { label: 'Waste, Spoilage & Shrinkage', href: '/inventory/waste', icon: Package, permission: 'inventory.manage', keywords: ['scrap', 'loss', 'damage'] },
    ],
  },
  {
    label: 'Procurement & Vendors',
    domain: 'SUPPLY_CHAIN',
    icon: Warehouse,
    items: [
      { label: 'Vendor & Supplier Directory', href: '/suppliers', icon: ContactRound, permission: 'suppliers.view', keywords: ['vendors', 'contacts'] },
      { label: 'Purchase Requisitions', href: '/purchasing/requests', icon: ClipboardList, permission: 'purchasing.view', keywords: ['requests', 'approvals'] },
      { label: 'Purchase Orders (PO)', href: '/purchasing/orders', icon: FileText, permission: 'purchasing.view', keywords: ['orders', 'supply'] },
      { label: 'Goods Received Notes (GRN)', href: '/purchasing/receiving', icon: Warehouse, permission: 'purchasing.receive', keywords: ['inbound', 'delivery'] },
      { label: 'Supplier Invoices & 3-Way Match', href: '/purchasing/invoices', icon: Receipt, permission: 'purchasing.view', keywords: ['bills', 'verification'] },
      { label: 'Vendor Returns & Debit Notes', href: '/purchasing/returns', icon: RefreshCw, permission: 'purchasing.manage', keywords: ['rejection', 'refund'] },
    ],
  },
  {
    label: 'Treasury & Payments',
    domain: 'FINANCE_GROWTH',
    icon: Wallet,
    items: [
      { label: 'Tender Settlement Cockpit', href: '/payments', icon: CreditCard, permission: 'payments.view', keywords: ['receipts', 'methods'] },
      { label: 'M-Pesa Express & C2B/B2B', href: '/payments/mpesa', icon: Smartphone, permission: 'payments.view', badge: 'M-Pesa', badgeType: 'live', keywords: ['daraja', 'mobile money', 'stk'] },
      { label: 'Bank Account Reconciliation', href: '/payments/reconciliation', icon: RefreshCw, permission: 'payments.reconcile', keywords: ['clearing', 'audit'] },
      { label: 'Refunds & Void Approvals', href: '/payments/refunds', icon: HandCoins, permission: 'refunds.view', keywords: ['reversals', 'credit'] },
      { label: 'Cash Drawer Registers', href: '/cash-management/drawers', icon: Wallet, permission: 'cash.view', keywords: ['till', 'float'] },
      { label: 'Cashier Till Shifts', href: '/cash-management/shifts', icon: Clock, permission: 'cash.view', keywords: ['opening float', 'handover'] },
      { label: 'End of Day Z-Report Reconciliation', href: '/cash-management/reconciliation', icon: ClipboardList, permission: 'cash.reconcile', keywords: ['z-out', 'closeout'] },
      { label: 'Operational Expense Ledger', href: '/finance/expenses', icon: Receipt, permission: 'finance.view', keywords: ['petty cash', 'overhead'] },
      { label: 'Accounts Payable (AP)', href: '/finance/payables', icon: HandCoins, permission: 'finance.view', keywords: ['due dates', 'vendor pay'] },
      { label: 'Tax Compliance & eTIMS Ledger', href: '/finance/taxes', icon: FileText, permission: 'finance.manage', keywords: ['kra', 'vat'] },
      { label: 'General Journal Adjustments', href: '/finance/adjustments', icon: SlidersHorizontal, permission: 'finance.adjust', keywords: ['accruals', 'entries'] },
    ],
  },
  {
    label: 'Guests & Loyalty Programs',
    domain: 'FINANCE_GROWTH',
    icon: Users,
    items: [
      { label: 'Guest Profiles Directory', href: '/customers', icon: Users, permission: 'customers.view', keywords: ['crm', 'clients'] },
      { label: 'Loyalty Tiers & Membership', href: '/loyalty', icon: Sparkles, permission: 'loyalty.view', keywords: ['rewards', 'points'] },
      { label: 'Point Accrual Transactions', href: '/loyalty/transactions', icon: History, permission: 'loyalty.view', keywords: ['redemption', 'balance'] },
      { label: 'Vouchers & Gift Cards', href: '/loyalty/rewards', icon: BadgePercent, permission: 'loyalty.manage', keywords: ['coupons', 'discounts'] },
      { label: 'Guest Feedback & Reviews', href: '/customers/feedback', icon: ContactRound, permission: 'customers.view', keywords: ['csat', 'ratings'] },
    ],
  },
  {
    label: 'Marketing & Outreach',
    domain: 'FINANCE_GROWTH',
    icon: Megaphone,
    items: [
      { label: 'Marketing Control Center', href: '/marketing', icon: Megaphone, permission: 'marketing.view', badge: 'HQ', badgeType: 'info', keywords: ['growth', 'overview', 'roas', 'attribution'] },
      { label: 'Campaigns & Broadcasts', href: '/marketing/campaigns', icon: Bell, permission: 'marketing.manage', badge: 'Live', badgeType: 'live', keywords: ['sms', 'email', 'broadcast', 'push'] },
      { label: 'Message Copy Templates', href: '/marketing/templates', icon: FileCode, permission: 'marketing.manage', keywords: ['templates', 'merge tags', 'copy'] },
      { label: 'Promo Codes & Vouchers', href: '/marketing/promotions', icon: Tags, permission: 'marketing.manage', keywords: ['discounts', 'coupons', 'codes'] },
    ],
  },
  {
    label: 'Executive Analytics & BI',
    domain: 'FINANCE_GROWTH',
    icon: ChartNoAxesCombined,
    items: [
      { label: 'Analytics Control Tower', href: '/reports', icon: ChartNoAxesCombined, permission: 'reports.view', keywords: ['charts', 'overview'] },
      { label: 'Hourly Sales & Revenue Trends', href: '/reports/sales', icon: FileChartColumn, permission: 'reports.view', keywords: ['turnover', 'gross'] },
      { label: 'Product Margin Analysis', href: '/reports/products', icon: Tags, permission: 'reports.view', keywords: ['top sellers', 'abc'] },
      { label: 'Tender Distribution Breakdown', href: '/reports/payments', icon: CreditCard, permission: 'reports.view', keywords: ['cash vs card', 'mpesa'] },
      { label: 'Inventory Cost & Stock Valuation', href: '/reports/inventory', icon: Package, permission: 'reports.view', keywords: ['holding value', 'fifo'] },
      { label: 'Theoretical vs Actual Food Cost', href: '/reports/food-costing', icon: CookingPot, permission: 'reports.view', keywords: ['variance', 'spoilage'] },
      { label: 'Kitchen & Preparation Efficiency', href: '/reports/performance', icon: Clock, permission: 'reports.view', keywords: ['ticket time', 'speed'] },
      { label: 'Custom Report Builder', href: '/reports/builder', icon: SlidersHorizontal, permission: 'reports.custom', keywords: ['adhoc', 'queries'] },
      { label: 'Scheduled Report Deliveries', href: '/reports/saved', icon: BookOpen, permission: 'reports.view', keywords: ['automated', 'emails'] },
      { label: 'Data Warehouse Export Center', href: '/reports/exports', icon: FileText, permission: 'reports.export', keywords: ['csv', 'excel', 'backup'] },
    ],
  },
  {
    label: 'Servora Intelligence AI',
    domain: 'FINANCE_GROWTH',
    icon: BrainCircuit,
    items: [
      { label: 'Copilot Assistant Console', href: '/ai-assistant', icon: BrainCircuit, permission: 'ai.use', badge: 'AI', badgeType: 'info', keywords: ['chat', 'copilot', 'advisor'] },
      { label: 'Demand & Cover Forecasting', href: '/ai-assistant/forecasting', icon: Activity, permission: 'ai.use', keywords: ['footfall', 'covers', 'predictions'] },
      { label: 'Predictive Purchasing Engine', href: '/ai-assistant/inventory', icon: Package, permission: 'ai.use', keywords: ['auto replenishment', 'smart po'] },
      { label: 'Menu Engineering Matrix', href: '/ai-assistant/menu-analysis', icon: Sparkles, permission: 'ai.use', keywords: ['boston matrix', 'stars', 'dogs'] },
      { label: 'Workflow Automations Engine', href: '/automations', icon: Puzzle, permission: 'automations.manage', keywords: ['triggers', 'rules'] },
      { label: 'System Notifications Log', href: '/notifications', icon: Bell, permission: 'notifications.view', keywords: ['alerts', 'events'] },
    ],
  },
  {
    label: 'Staff & Shift Management',
    domain: 'ADMINISTRATION',
    icon: UserRound,
    items: [
      { label: 'Employee Directory & Roster', href: '/staff', icon: Users, permission: 'staff.view', keywords: ['team', 'workers'] },
      { label: 'Role-Based Access Control (RBAC)', href: '/staff/roles', icon: ShieldCheck, permission: 'staff.manage', keywords: ['permissions', 'security'] },
      { label: 'Weekly Shift Schedule Planner', href: '/staff/schedules', icon: CalendarDays, permission: 'staff.view', keywords: ['rota', 'planning'] },
      { label: 'Biometric Clock-In / Attendance', href: '/staff/attendance', icon: Clock, permission: 'staff.view', keywords: ['timesheet', 'hours'] },
      { label: 'Manager Shift Handover Notes', href: '/staff/handover', icon: ClipboardList, permission: 'staff.view', keywords: ['logbook', 'closing'] },
      { label: 'Cash Drawer Custodians', href: '/staff/cashier-assignments', icon: Wallet, permission: 'staff.manage', keywords: ['till assignment', 'register'] },
      { label: 'Server Performance & Tip Pool', href: '/staff/performance', icon: ChartNoAxesCombined, permission: 'reports.view', keywords: ['waiter kpis', 'gratuity'] },
    ],
  },
  {
    label: 'Organization & Settings',
    domain: 'ADMINISTRATION',
    icon: Settings,
    items: [
      { label: 'Business Profile & Legal Entity', href: '/settings/business', icon: Building2, permission: 'settings.view', keywords: ['kra pin', 'company'] },
      { label: 'Multi-Location Branch Topology', href: '/settings/branches', icon: Store, permission: 'branches.view', keywords: ['outlets', 'depots'] },
      { label: 'Tax Configurations & Fiscal Devices', href: '/settings/financial', icon: Wallet, permission: 'settings.manage', keywords: ['etims', 'oscu', 'vat'] },
      { label: 'Hospitality Service Models', href: '/settings/service-models', icon: UtensilsCrossed, permission: 'settings.manage', keywords: ['dine-in', 'bar', 'counter'] },
      { label: 'Receipt & Invoice Customizer', href: '/settings/receipts', icon: Receipt, permission: 'settings.manage', keywords: ['footer', 'logo'] },
      { label: 'Network Hardware & POS Printers', href: '/settings/printers', icon: Monitor, permission: 'settings.manage', keywords: ['lan', 'thermal', 'kitchen printer'] },
      { label: 'KDS Order Routing Rules', href: '/settings/kitchen', icon: ChefHat, permission: 'settings.manage', keywords: ['prep routing', 'split'] },
      { label: 'Payment Gateway Integrations', href: '/settings/integrations/payments', icon: CreditCard, permission: 'integrations.manage', keywords: ['pesapal', 'stripe'] },
      { label: 'Communication Gateways', href: '/settings/integrations/messaging', icon: Bell, permission: 'integrations.manage', keywords: ['sms api', 'infobip'] },
      { label: 'Aggregator Webhooks (Uber / Glovo)', href: '/settings/integrations/orders', icon: ShoppingCart, permission: 'integrations.manage', keywords: ['api', 'delivery sync'] },
      { label: 'Audit Trail & Immutable Logs', href: '/settings/audit-logs', icon: ShieldCheck, permission: 'audit.view', keywords: ['security log', 'compliance'] },
      { label: 'Offline Edge Sync Queue', href: '/settings/offline', icon: RefreshCw, permission: 'settings.manage', keywords: ['local storage', 'sync'] },
      { label: 'Registered POS Terminals', href: '/settings/devices', icon: Monitor, permission: 'settings.manage', keywords: ['android', 'hardware'] },
      { label: 'Subscription Plan & Billing', href: '/settings/billing', icon: Receipt, permission: 'billing.view', keywords: ['saas', 'invoices'] },
      { label: 'Security & Two-Factor Authentication', href: '/settings/security', icon: ShieldCheck, permission: 'settings.security', keywords: ['2fa', 'passwords'] },
    ],
  },
];

function routeIsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupIsActive(pathname: string, group: NavGroup) {
  return group.items.some((item) => routeIsActive(pathname, item.href));
}

function hasPermission(item: NavItem, permissions?: string[], userRole?: string) {
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return true;
  if (!permissions) return true;
  if (permissions.includes('*')) return true;
  return item.permission ? permissions.includes(item.permission) : true;
}

export default function Sidebar({
  isMobileMenuOpen,
  closeMobileMenu,
  handleLogout,
  allowedPermissions,
  isCollapsed = false,
  toggleCollapse,
  businessName = 'Workspace',
  activeBranch = 'Main Branch',
  userRole = 'STAFF',
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  // Enterprise Pinned Favorites & Recent History
  const [pinnedHrefs, setPinnedHrefs] = useState<string[]>(['/pos', '/orders/open', '/kitchen']);
  const [recentHrefs, setRecentHrefs] = useState<string[]>([]);

  // Live Operational Telemetry Badges
  const [liveCounts, setLiveCounts] = useState<{
    kitchenQueue: number;
    lowStock: number;
  }>({ kitchenQueue: 0, lowStock: 0 });

  // Dynamic Branches State
  const [branchNodes, setBranchNodes] = useState<BranchNode[]>([]);
  const [currentBranchName, setCurrentBranchName] = useState<string>(activeBranch);
  const [currentBranchId, setCurrentBranchId] = useState<number | null>(null);

  // System latency state
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    try {
      const savedPins = localStorage.getItem('servora_pinned_nav');
      if (savedPins) setPinnedHrefs(JSON.parse(savedPins));

      const savedRecents = localStorage.getItem('servora_recent_nav');
      if (savedRecents) setRecentHrefs(JSON.parse(savedRecents));
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!pathname || pathname === '/dashboard' || pathname === '/') return;
    setRecentHrefs((prev) => {
      const updated = [pathname, ...prev.filter((h) => h !== pathname)].slice(0, 4);
      try {
        localStorage.setItem('servora_recent_nav', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [pathname]);

  const togglePinFavorite = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    setPinnedHrefs((prev) => {
      const updated = prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href];
      try {
        localStorage.setItem('servora_pinned_nav', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(event.target as Node)
      ) {
        setIsBranchDropdownOpen(false);
      }
    };
    if (isBranchDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isBranchDropdownOpen]);

  useEffect(() => {
    let isMounted = true;
    const loadBranchesAndTelemetry = async () => {
      try {
        const [branchRes, telemetryRes] = await Promise.all([
          fetchApi('/api/v1/branches').catch(() => null),
          fetchApi('/api/v1/analytics/dashboard?timeframe=today').catch(() => null),
        ]);

        if (isMounted && branchRes?.data && Array.isArray(branchRes.data)) {
          setBranchNodes(branchRes.data);

          const savedBranchId = localStorage.getItem('servora_active_branch_id');
          if (savedBranchId) {
            const match = branchRes.data.find((b: BranchNode) => String(b.id) === savedBranchId);
            if (match) {
              setCurrentBranchName(match.name);
              setCurrentBranchId(match.id);
            }
          } else {
            const defaultBranch =
              branchRes.data.find((b: BranchNode) => b.isMainBranch && b.isActive !== false) ||
              branchRes.data.find((b: BranchNode) => b.isActive !== false) ||
              branchRes.data[0];

            if (defaultBranch) {
              setCurrentBranchName(defaultBranch.name);
              setCurrentBranchId(defaultBranch.id);
              localStorage.setItem('servora_active_branch_id', String(defaultBranch.id));
            }
          }
        }

        if (isMounted && telemetryRes?.data) {
          setLiveCounts({
            kitchenQueue: Number(telemetryRes.data.orders?.kitchenQueue) || 0,
            lowStock: Number(telemetryRes.data.inventory?.depletedItemsCount) || 0,
          });
        }
      } catch {
        // Silent fallback
      }
    };

    loadBranchesAndTelemetry();
    const interval = setInterval(loadBranchesAndTelemetry, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSelectBranch = (branch: BranchNode) => {
    setCurrentBranchName(branch.name);
    setCurrentBranchId(branch.id);
    localStorage.setItem('servora_active_branch_id', String(branch.id));
    localStorage.setItem('servora_active_branch_name', branch.name);
    setIsBranchDropdownOpen(false);

    window.dispatchEvent(
      new CustomEvent('servora:branch-switched', {
        detail: { branchId: branch.id, branchName: branch.name, branchCode: branch.code },
      })
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isCollapsed && toggleCollapse) {
          toggleCollapse();
        }
        setTimeout(() => searchInputRef.current?.focus(), 80);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, toggleCollapse]);

  useEffect(() => {
    const fetchLatency = async () => {
      const start = performance.now();
      try {
        await fetchApi('/health').catch(() => null);
        setLatency(Math.round(performance.now() - start));
      } catch {
        setLatency(null);
      }
    };
    fetchLatency();
    const interval = setInterval(fetchLatency, 60000);
    return () => clearInterval(interval);
  }, []);

  const enrichedGroups = useMemo(() => {
    return navigationGroups
      .map((group) => ({
        ...group,
        items: group.items
          .filter((item) => hasPermission(item, allowedPermissions, userRole))
          .map((item) => {
            if (item.href === '/kitchen' || item.href === '/orders/open') {
              return liveCounts.kitchenQueue > 0
                ? { ...item, badge: String(liveCounts.kitchenQueue), badgeType: 'warning' as const }
                : item;
            }
            if (item.href === '/inventory/items' || item.href === '/inventory/reorder') {
              return liveCounts.lowStock > 0
                ? { ...item, badge: `${liveCounts.lowStock} Low`, badgeType: 'warning' as const }
                : item;
            }
            return item;
          }),
      }))
      .filter((group) => group.items.length > 0);
  }, [allowedPermissions, liveCounts, userRole]);

  const visibleStandaloneItems = useMemo(
    () => standaloneItems.filter((item) => hasPermission(item, allowedPermissions, userRole)),
    [allowedPermissions, userRole]
  );

  const allAccessibleItems = useMemo(() => {
    const map = new Map<string, NavItem>();
    visibleStandaloneItems.forEach((i) => map.set(i.href, i));
    enrichedGroups.forEach((g) => g.items.forEach((i) => map.set(i.href, i)));
    return map;
  }, [visibleStandaloneItems, enrichedGroups]);

  const pinnedItems = useMemo(
    () => pinnedHrefs.map((h) => allAccessibleItems.get(h)).filter(Boolean) as NavItem[],
    [pinnedHrefs, allAccessibleItems]
  );

  const recentItems = useMemo(
    () => recentHrefs.map((h) => allAccessibleItems.get(h)).filter(Boolean) as NavItem[],
    [recentHrefs, allAccessibleItems]
  );

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return enrichedGroups;
    const query = searchQuery.toLowerCase().trim();

    return enrichedGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            item.href.toLowerCase().includes(query) ||
            group.label.toLowerCase().includes(query) ||
            item.keywords?.some((k) => k.toLowerCase().includes(query))
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [enrichedGroups, searchQuery]);

  const firstSearchMatch = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return filteredGroups[0]?.items[0] || null;
  }, [searchQuery, filteredGroups]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && firstSearchMatch) {
      e.preventDefault();
      router.push(firstSearchMatch.href);
      setSearchQuery('');
      closeMobileMenu();
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      searchInputRef.current?.blur();
    }
  };

  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    const active = enrichedGroups
      .filter((group) => groupIsActive(pathname, group))
      .map((group) => group.label);

    setExpandedGroups((curr) => [...new Set([...curr, ...active])]);
  }, [pathname, enrichedGroups]);

  const toggleGroup = (label: string) => {
    if (isCollapsed && toggleCollapse) {
      toggleCollapse();
    }
    setExpandedGroups((curr) =>
      curr.includes(label) ? curr.filter((i) => i !== label) : [...curr, label]
    );
  };

  const toggleExpandAll = () => {
    if (expandedGroups.length === enrichedGroups.length) {
      setExpandedGroups([]);
    } else {
      setExpandedGroups(enrichedGroups.map((g) => g.label));
    }
  };

  const getBadgeStyle = (type?: NavItem['badgeType'], active?: boolean) => {
    if (active) return 'bg-white/25 text-white';
    switch (type) {
      case 'live':
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'warning':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
      case 'info':
        return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
      default:
        return 'bg-servora-teal/20 text-servora-teal border border-servora-teal/30';
    }
  };

  const renderNavItem = (item: NavItem, nested = false, showPinAction = true) => {
    const Icon = item.icon;
    const active = routeIsActive(pathname, item.href);
    const isPinned = pinnedHrefs.includes(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeMobileMenu}
        title={isCollapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        className={[
          'group relative flex min-w-0 items-center gap-2.5 rounded-lg text-xs font-medium transition-all duration-150',
          isCollapsed ? 'justify-center p-2.5' : 'px-2.5 py-1.5',
          nested && !isCollapsed ? 'ml-2 pl-2.5 py-1.5 text-[12px]' : '',
          active
            ? 'bg-servora-core text-white shadow-xs font-semibold'
            : 'text-servora-pale/75 hover:bg-white/[0.07] hover:text-white',
        ].join(' ')}
      >
        <Icon
          size={nested ? 14 : 16}
          className={[
            'shrink-0 transition-transform duration-150',
            active ? 'text-white' : 'text-servora-pale/60 group-hover:text-servora-teal group-hover:scale-105',
          ].join(' ')}
        />

        {!isCollapsed && (
          <>
            <span className="min-w-0 flex-1 truncate tracking-tight">{item.label}</span>

            {item.badge && (
              <span
                className={[
                  'rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider shrink-0',
                  getBadgeStyle(item.badgeType, active),
                ].join(' ')}
              >
                {item.badge}
              </span>
            )}

            {showPinAction && (
              <button
                type="button"
                onClick={(e) => togglePinFavorite(e, item.href)}
                title={isPinned ? 'Unpin from Favorites' : 'Pin to Favorites'}
                className={[
                  'opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 rounded transition-opacity shrink-0 cursor-pointer',
                  isPinned ? 'opacity-100 text-amber-400' : 'text-servora-pale/40 hover:text-amber-300',
                ].join(' ')}
              >
                <Star size={11} fill={isPinned ? 'currentColor' : 'none'} />
              </button>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <>
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      <aside
        aria-label="Main Navigation"
        className={[
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.08]',
          'bg-servora-navy text-servora-pale shadow-2xl transition-all duration-300 ease-in-out',
          'lg:static lg:shadow-none',
          isCollapsed ? 'lg:w-20' : 'lg:w-72',
          isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div
          className={[
            'flex h-16 shrink-0 items-center border-b border-white/[0.08] bg-white transition-all duration-200',
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4',
          ].join(' ')}
        >
          <Link
            href="/dashboard"
            onClick={closeMobileMenu}
            className="flex items-center gap-2 overflow-hidden"
          >
            <Image
              src="/logo.png"
              alt="Servora Logo"
              width={130}
              height={38}
              priority
              className={[
                'h-auto max-h-9 w-auto object-contain transition-all duration-200',
                isCollapsed ? 'max-h-8 scale-90' : '',
              ].join(' ')}
            />
          </Link>

          {toggleCollapse && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-servora-navy/70 hover:text-servora-navy hover:bg-gray-100 transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}

          <button
            type="button"
            onClick={closeMobileMenu}
            className="rounded-lg p-1.5 text-servora-navy hover:bg-gray-100 transition-colors lg:hidden cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {!isCollapsed ? (
          <div ref={branchDropdownRef} className="relative px-3 pt-3 pb-1">
            <button
              type="button"
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-servora-core/25 border border-servora-core/40 flex items-center justify-center text-servora-teal shrink-0">
                  <Building2 size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{businessName}</p>
                  <p className="text-[10px] text-servora-teal font-medium truncate flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                    <span className="truncate">{currentBranchName}</span>
                  </p>
                </div>
              </div>
              <ChevronsUpDown size={14} className="text-servora-pale/40 shrink-0 ml-1" />
            </button>

            {isBranchDropdownOpen && (
              <div className="absolute left-3 right-3 top-16 z-30 bg-[#071739] border border-white/10 rounded-xl shadow-2xl p-1.5 space-y-1 backdrop-blur-md animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between px-2 py-1 border-b border-white/[0.08] mb-1">
                  <span className="text-[10px] font-bold text-servora-pale/40 uppercase tracking-wider">
                    Operating Branches ({branchNodes.length})
                  </span>
                  <Link
                    href="/settings/branches"
                    onClick={() => {
                      setIsBranchDropdownOpen(false);
                      closeMobileMenu();
                    }}
                    className="text-[10px] font-semibold text-servora-teal hover:underline"
                  >
                    Manage
                  </Link>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar">
                  {branchNodes.length > 0 ? (
                    branchNodes.map((b) => {
                      const isSelected = currentBranchId === b.id || currentBranchName === b.name;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelectBranch(b)}
                          className={[
                            'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer',
                            isSelected
                              ? 'bg-servora-core/25 text-white border border-servora-core/40'
                              : 'text-servora-pale/75 hover:bg-white/[0.08] hover:text-white',
                          ].join(' ')}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="truncate block font-medium">{b.name}</span>
                            <span className="text-[9.5px] font-mono text-servora-pale/45 block">
                              {b.code} {b.isMainBranch ? '• Main Hub' : ''}
                            </span>
                          </div>
                          {isSelected && <Check size={13} className="text-servora-teal shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsBranchDropdownOpen(false)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-servora-core/20 text-white text-xs font-semibold"
                    >
                      <span className="truncate">{currentBranchName}</span>
                      <Check size={13} className="text-servora-teal shrink-0" />
                    </button>
                  )}
                </div>

                <div className="pt-1 mt-1 border-t border-white/[0.08]">
                  <Link
                    href="/inventory/transfers"
                    onClick={() => {
                      setIsBranchDropdownOpen(false);
                      closeMobileMenu();
                    }}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] font-medium text-servora-pale/60 hover:text-servora-teal hover:bg-white/[0.05] transition-colors"
                  >
                    <Truck size={12} className="shrink-0" />
                    <span>Inter-Branch Stock Transfers</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-3 flex justify-center border-b border-white/[0.06]">
            <div
              title={`${businessName} (${currentBranchName})`}
              className="h-9 w-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-servora-teal cursor-default"
            >
              <Building2 size={17} />
            </div>
          </div>
        )}

        {!isCollapsed && (
          <div className="px-3 py-2 shrink-0 space-y-1">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-servora-pale/40 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Jump to module (e.g. marketing, kds, pos)..."
                className="w-full bg-white/[0.04] border border-white/[0.07] focus:border-servora-teal/50 focus:bg-white/[0.08] text-white placeholder-servora-pale/35 text-xs rounded-lg pl-8 pr-12 py-1.5 outline-none transition-all"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-servora-pale/40 hover:text-white cursor-pointer"
                >
                  <X size={12} />
                </button>
              ) : (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 border border-white/10 rounded px-1 text-[9.5px] font-mono text-servora-pale/40">
                  ⌘K
                </span>
              )}
            </div>

            {searchQuery && firstSearchMatch && (
              <div className="flex items-center justify-between px-2 py-1 rounded bg-servora-core/20 border border-servora-core/30 text-[10px] text-servora-pale/90">
                <span className="truncate">
                  Jump to <strong>{firstSearchMatch.label}</strong>
                </span>
                <span className="flex items-center gap-0.5 font-mono text-[9px] text-servora-teal shrink-0 ml-1">
                  Enter <CornerDownLeft size={10} />
                </span>
              </div>
            )}
          </div>
        )}

        <nav
          className={[
            'flex-1 space-y-1 overflow-y-auto py-1.5 overscroll-contain select-none custom-scrollbar transition-all',
            isCollapsed ? 'px-2' : 'px-3',
          ].join(' ')}
        >
          {!searchQuery && (
            <div className="mb-2.5">
              {!isCollapsed && (
                <p className="mb-1 px-2.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-servora-pale/40">
                  Quick Terminals
                </p>
              )}
              <div className="space-y-0.5">
                {visibleStandaloneItems.map((item) => renderNavItem(item, false, false))}
              </div>
            </div>
          )}

          {!searchQuery && !isCollapsed && pinnedItems.length > 0 && (
            <div className="mb-2.5 pt-1.5 border-t border-white/[0.06]">
              <div className="mb-1 px-2.5 flex items-center justify-between">
                <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-amber-400/80 flex items-center gap-1">
                  <Star size={10} fill="currentColor" /> Pinned Favorites
                </span>
                <span className="text-[9px] font-mono text-servora-pale/35">{pinnedItems.length}</span>
              </div>
              <div className="space-y-0.5">
                {pinnedItems.map((item) => renderNavItem(item, false, true))}
              </div>
            </div>
          )}

          {!searchQuery && !isCollapsed && recentItems.length > 0 && (
            <div className="mb-2.5 pt-1.5 border-t border-white/[0.06]">
              <p className="mb-1 px-2.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-servora-pale/40">
                Recently Visited
              </p>
              <div className="space-y-0.5">
                {recentItems.slice(0, 3).map((item) => renderNavItem(item, false, false))}
              </div>
            </div>
          )}

          {!searchQuery && !isCollapsed && (
            <div className="pt-2 mb-1 px-2.5 flex items-center justify-between border-t border-white/[0.06]">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-servora-pale/40">
                Navigation Modules
              </p>
              <button
                type="button"
                onClick={toggleExpandAll}
                title={expandedGroups.length === enrichedGroups.length ? 'Collapse All' : 'Expand All'}
                className="text-[10px] font-semibold text-servora-pale/40 hover:text-servora-teal flex items-center gap-1 transition-colors cursor-pointer"
              >
                {expandedGroups.length === enrichedGroups.length ? (
                  <>
                    <ChevronsDownUp size={11} /> Collapse
                  </>
                ) : (
                  <>
                    <ExpandAllIcon size={11} /> Expand
                  </>
                )}
              </button>
            </div>
          )}

          <div className="space-y-1">
            {filteredGroups.map((group, idx) => {
              const GroupIcon = group.icon;
              const expanded = searchQuery.trim().length > 0 || expandedGroups.includes(group.label);
              const active = groupIsActive(pathname, group);
              const prevDomain = idx > 0 ? filteredGroups[idx - 1].domain : null;
              const showDomainDivider = !searchQuery && !isCollapsed && group.domain !== prevDomain;

              const groupBadgeCount = group.items.reduce((acc, item) => {
                const numeric = parseInt(item.badge || '0', 10);
                return acc + (isNaN(numeric) ? 0 : numeric);
              }, 0);

              return (
                <div key={group.label}>
                  {showDomainDivider && (
                    <div className="pt-2.5 pb-1 px-2.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-servora-teal/70">
                        {domainHeaders[group.domain]}
                      </span>
                    </div>
                  )}

                  <section
                    className="relative rounded-lg transition-colors"
                    onMouseEnter={() => isCollapsed && setHoveredGroup(group.label)}
                    onMouseLeave={() => isCollapsed && setHoveredGroup(null)}
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.label)}
                      title={isCollapsed ? group.label : undefined}
                      aria-expanded={expanded}
                      className={[
                        'group flex w-full items-center gap-2.5 rounded-lg text-left text-xs font-semibold transition-all duration-150 cursor-pointer',
                        isCollapsed ? 'justify-center p-2.5' : 'px-2.5 py-2',
                        active && (!expanded || isCollapsed)
                          ? 'text-white bg-white/[0.06]'
                          : 'text-servora-pale/80 hover:bg-white/[0.05] hover:text-white',
                      ].join(' ')}
                    >
                      <GroupIcon
                        size={16}
                        className={[
                          'shrink-0 transition-colors',
                          active ? 'text-servora-teal' : 'text-servora-pale/50 group-hover:text-servora-teal',
                        ].join(' ')}
                      />
                      {!isCollapsed && (
                        <>
                          <span className="min-w-0 flex-1 truncate tracking-tight">{group.label}</span>
                          {!expanded && groupBadgeCount > 0 && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {groupBadgeCount}
                            </span>
                          )}
                          <ChevronDown
                            size={13}
                            className={[
                              'shrink-0 text-servora-pale/40 transition-transform duration-200 group-hover:text-white',
                              expanded ? 'rotate-180 text-servora-teal' : '',
                            ].join(' ')}
                          />
                        </>
                      )}
                    </button>

                    {expanded && !isCollapsed && (
                      <div className="mt-0.5 space-y-0.5 border-l border-white/[0.08] ml-4 pl-1 transition-all">
                        {group.items.map((item) => renderNavItem(item, true, true))}
                      </div>
                    )}

                    {isCollapsed && hoveredGroup === group.label && (
                      <div className="absolute left-full top-0 ml-2 z-50 w-60 rounded-xl bg-[#071739] border border-white/10 shadow-2xl p-2 space-y-1">
                        <div className="px-2.5 py-1 text-[11px] font-bold text-white border-b border-white/10 mb-1 flex items-center justify-between">
                          <span>{group.label}</span>
                          <span className="text-[9px] font-mono text-servora-pale/40">
                            {group.items.length}
                          </span>
                        </div>
                        <div className="space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
                          {group.items.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeMobileMenu}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-servora-pale/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <item.icon size={13} className="text-servora-teal shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              );
            })}
          </div>

          {!searchQuery && (
            <div className={`pt-3 border-t border-white/[0.08] mt-3 ${isCollapsed ? 'flex justify-center' : ''}`}>
              {renderNavItem(
                {
                  label: 'Help & Knowledgebase',
                  href: '/help',
                  icon: CircleHelp,
                  permission: 'help.view',
                },
                false,
                false
              )}
            </div>
          )}
        </nav>

        <div className="shrink-0 border-t border-white/[0.08] bg-black/15 p-2.5">
          {!isCollapsed ? (
            <div className="mb-2 flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 border border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-white leading-tight truncate">
                    Enterprise SLA
                  </p>
                  <p className="text-[9.5px] text-servora-pale/40 truncate font-mono">
                    {latency ? `${latency}ms latency` : 'Online • Synced'}
                  </p>
                </div>
              </div>
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-servora-teal bg-servora-teal/15 border border-servora-teal/30 px-1.5 py-0.5 rounded">
                {userRole}
              </span>
            </div>
          ) : (
            <div
              title={`Enterprise SLA (${latency ? `${latency}ms` : 'Operational'})`}
              className="mb-2 flex justify-center py-1"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title={isCollapsed ? 'Sign Out' : undefined}
            className={[
              'flex w-full items-center gap-2 rounded-xl bg-white/[0.03] hover:bg-red-500/15 text-servora-pale/75 hover:text-red-300 border border-white/[0.06] hover:border-red-500/30 text-xs font-semibold transition-all duration-150 cursor-pointer',
              isCollapsed ? 'justify-center p-2.5' : 'justify-center px-3 py-2',
            ].join(' ')}
          >
            <LogOut size={15} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}