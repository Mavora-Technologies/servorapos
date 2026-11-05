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
  code: string; // SAP / NetSuite style rapid T-Code
  icon: LucideIcon;
  permission?: string;
  badge?: string;
  badgeType?: 'live' | 'warning' | 'info' | 'count';
}

interface NavGroup {
  label: string;
  domain: 'FRONT_OFFICE' | 'SUPPLY_CHAIN' | 'FINANCE_BI' | 'GOVERNANCE';
  icon: LucideIcon;
  items: NavItem[];
}

const domainHeaders: Record<NavGroup['domain'], string> = {
  FRONT_OFFICE: 'Front-of-House & Culinary',
  SUPPLY_CHAIN: 'Supply Chain & Materials (MM)',
  FINANCE_BI: 'Financials, Treasury & BI (FI/CO)',
  GOVERNANCE: 'Human Capital & System Admin',
};

const standaloneItems: NavItem[] = [
  {
    label: 'Executive Dashboard',
    href: '/dashboard',
    code: 'EXEC01',
    icon: LayoutDashboard,
    permission: 'dashboard.view',
  },
  {
    label: 'POS Register Terminal',
    href: '/pos',
    code: 'POS01',
    icon: ShoppingCart,
    permission: 'pos.access',
    badge: 'Live',
    badgeType: 'live',
  },
];

const navigationGroups: NavGroup[] = [
  {
    label: 'Sales & Guest Service',
    domain: 'FRONT_OFFICE',
    icon: Store,
    items: [
      { label: 'All Orders Ledger', href: '/orders', code: 'SD01', icon: FileText, permission: 'orders.view' },
      { label: 'Open Active Checks', href: '/orders/open', code: 'SD02', icon: ClipboardList, permission: 'orders.view' },
      { label: 'Floor Plan & Tables', href: '/tables', code: 'SD03', icon: UtensilsCrossed, permission: 'tables.view' },
      { label: 'Reservations Desk', href: '/reservations', code: 'SD04', icon: CalendarDays, permission: 'reservations.view' },
      { label: 'Guest Waitlist Queue', href: '/reservations/waitlist', code: 'SD05', icon: Clock, permission: 'reservations.view' },
      { label: 'Takeaway & Pickups', href: '/orders/takeaway', code: 'SD06', icon: ShoppingBasket, permission: 'orders.view' },
      { label: '3PL Dispatch & Delivery', href: '/orders/delivery', code: 'SD07', icon: Truck, permission: 'delivery.view' },
      { label: 'Online Storefront', href: '/online-orders', code: 'SD08', icon: Monitor, permission: 'orders.view' },
    ],
  },
  {
    label: 'Kitchen Operations (KDS)',
    domain: 'FRONT_OFFICE',
    icon: ChefHat,
    items: [
      { label: 'Kitchen Display (KDS)', href: '/kitchen', code: 'KDS01', icon: CookingPot, permission: 'kitchen.view' },
      { label: 'Preparation Stations', href: '/kitchen/stations', code: 'KDS02', icon: Boxes, permission: 'kitchen.manage' },
      { label: 'Ticket Fulfillment Archive', href: '/kitchen/history', code: 'KDS03', icon: History, permission: 'kitchen.view' },
      { label: 'Culinary SLA Analytics', href: '/kitchen/performance', code: 'KDS04', icon: ChartNoAxesCombined, permission: 'reports.view' },
    ],
  },
  {
    label: 'Menu Engineering & BOM',
    domain: 'FRONT_OFFICE',
    icon: UtensilsCrossed,
    items: [
      { label: 'Menu Master Catalog', href: '/menu', code: 'BOM01', icon: BookOpen, permission: 'menu.view' },
      { label: 'Category Hierarchy', href: '/menu/categories', code: 'BOM02', icon: Tags, permission: 'menu.manage' },
      { label: 'Menu Items & SKUs', href: '/menu/items', code: 'BOM03', icon: UtensilsCrossed, permission: 'menu.view' },
      { label: 'Modifiers & Add-ons', href: '/menu/modifiers', code: 'BOM04', icon: SlidersHorizontal, permission: 'menu.manage' },
      { label: 'Combo Meal Bundles', href: '/menu/combos', code: 'BOM05', icon: ShoppingBasket, permission: 'menu.manage' },
      { label: 'Dynamic Pricing Rules', href: '/menu/pricing', code: 'BOM06', icon: BadgePercent, permission: 'menu.manage' },
      { label: '86ed Stock Availability', href: '/menu/availability', code: 'BOM07', icon: Clock, permission: 'menu.manage' },
      { label: 'Standard Recipes (BOM)', href: '/menu/recipes', code: 'BOM08', icon: CookingPot, permission: 'recipes.view' },
      { label: 'Food Cost & Margin Matrix', href: '/menu/recipes/costing', code: 'BOM09', icon: FileChartColumn, permission: 'recipes.view' },
      { label: 'UOM & Unit Conversions', href: '/menu/recipes/units', code: 'BOM10', icon: RefreshCw, permission: 'inventory.manage' },
    ],
  },
  {
    label: 'Inventory & Warehouse',
    domain: 'SUPPLY_CHAIN',
    icon: Package,
    items: [
      { label: 'Inventory Control Tower', href: '/inventory', code: 'MM01', icon: Boxes, permission: 'inventory.view' },
      { label: 'Material Item Master', href: '/inventory/items', code: 'MM02', icon: Package, permission: 'inventory.view' },
      { label: 'Stock Movement Ledger', href: '/inventory/movements', code: 'MM03', icon: History, permission: 'inventory.view' },
      { label: 'Physical StockCounts', href: '/inventory/counts', code: 'MM04', icon: ClipboardList, permission: 'inventory.manage' },
      { label: 'Inter-Branch Transfers', href: '/inventory/transfers', code: 'MM05', icon: Truck, permission: 'inventory.manage' },
      { label: 'Cold-Chain Fleet & Vans', href: '/inventory/transfers/fleet', code: 'MM06', icon: Truck, permission: 'inventory.manage' },
      { label: 'Warehouse Storage Bins', href: '/inventory/locations', code: 'MM07', icon: Warehouse, permission: 'inventory.manage' },
      { label: 'Lot Batches & Expiry', href: '/inventory/batches', code: 'MM08', icon: CalendarDays, permission: 'inventory.view' },
      { label: 'MRP Reorder Engine', href: '/inventory/reorder', code: 'MM09', icon: ShoppingBasket, permission: 'inventory.view' },
      { label: 'Wastage & Spoilage Logs', href: '/inventory/waste', code: 'MM10', icon: Package, permission: 'inventory.manage' },
    ],
  },
  {
    label: 'Procurement (Procure-to-Pay)',
    domain: 'SUPPLY_CHAIN',
    icon: Warehouse,
    items: [
      { label: 'Approved Vendor Master', href: '/suppliers', code: 'P2P01', icon: ContactRound, permission: 'suppliers.view' },
      { label: 'Purchase Requisitions', href: '/purchasing/requests', code: 'P2P02', icon: ClipboardList, permission: 'purchasing.view' },
      { label: 'Purchase Orders (PO)', href: '/purchasing/orders', code: 'P2P03', icon: FileText, permission: 'purchasing.view' },
      { label: 'Goods Received (GRN)', href: '/purchasing/receiving', code: 'P2P04', icon: Warehouse, permission: 'purchasing.receive' },
      { label: '3-Way Vendor Invoices', href: '/purchasing/invoices', code: 'P2P05', icon: Receipt, permission: 'purchasing.view' },
      { label: 'Vendor Returns & Debit', href: '/purchasing/returns', code: 'P2P06', icon: RefreshCw, permission: 'purchasing.manage' },
    ],
  },
  {
    label: 'Payments & Treasury (FI)',
    domain: 'FINANCE_BI',
    icon: Wallet,
    items: [
      { label: 'Settlements Cockpit', href: '/payments', code: 'FI01', icon: CreditCard, permission: 'payments.view' },
      { label: 'M-Pesa Daraja C2B/B2B', href: '/payments/mpesa', code: 'FI02', icon: Smartphone, permission: 'payments.view', badge: 'Daraja', badgeType: 'live' },
      { label: 'Bank Reconciliation', href: '/payments/reconciliation', code: 'FI03', icon: RefreshCw, permission: 'payments.reconcile' },
      { label: 'Credit Notes & Refunds', href: '/payments/refunds', code: 'FI04', icon: HandCoins, permission: 'refunds.view' },
      { label: 'Physical Cash Drawers', href: '/cash-management/drawers', code: 'FI05', icon: Wallet, permission: 'cash.view' },
      { label: 'Cashier Till Shifts', href: '/cash-management/shifts', code: 'FI06', icon: Clock, permission: 'cash.view' },
      { label: 'End-of-Day Z-Balancing', href: '/cash-management/reconciliation', code: 'FI07', icon: ClipboardList, permission: 'cash.reconcile' },
      { label: 'Operating Expenses', href: '/finance/expenses', code: 'FI08', icon: Receipt, permission: 'finance.view' },
      { label: 'Accounts Payable (AP)', href: '/finance/payables', code: 'FI09', icon: HandCoins, permission: 'finance.view' },
      { label: 'KRA eTIMS & VAT Ledger', href: '/finance/taxes', code: 'FI10', icon: FileText, permission: 'finance.manage' },
      { label: 'Journal Adjustments', href: '/finance/adjustments', code: 'FI11', icon: SlidersHorizontal, permission: 'finance.adjust' },
    ],
  },
  {
    label: 'Customers & Loyalty (CRM)',
    domain: 'FINANCE_BI',
    icon: Users,
    items: [
      { label: 'Guest CRM Directory', href: '/customers', code: 'CRM01', icon: Users, permission: 'customers.view' },
      { label: 'Loyalty Tier Program', href: '/loyalty', code: 'CRM02', icon: Sparkles, permission: 'loyalty.view' },
      { label: 'Points Accrual Ledger', href: '/loyalty/transactions', code: 'CRM03', icon: History, permission: 'loyalty.view' },
      { label: 'Promotional Vouchers', href: '/loyalty/rewards', code: 'CRM04', icon: BadgePercent, permission: 'loyalty.manage' },
      { label: 'CSAT Guest Reviews', href: '/customers/feedback', code: 'CRM05', icon: ContactRound, permission: 'customers.view' },
      { label: 'SMS/WhatsApp Broadcast', href: '/marketing/campaigns', code: 'CRM06', icon: Bell, permission: 'marketing.manage' },
    ],
  },
  {
    label: 'Business Intelligence (BI)',
    domain: 'FINANCE_BI',
    icon: ChartNoAxesCombined,
    items: [
      { label: 'BI Analytics Home', href: '/reports', code: 'BI01', icon: ChartNoAxesCombined, permission: 'reports.view' },
      { label: 'Revenue & Hourly Sales', href: '/reports/sales', code: 'BI02', icon: FileChartColumn, permission: 'reports.view' },
      { label: 'Menu Item Profitability', href: '/reports/products', code: 'BI03', icon: Tags, permission: 'reports.view' },
      { label: 'Tender Type Breakdown', href: '/reports/payments', code: 'BI04', icon: CreditCard, permission: 'reports.view' },
      { label: 'FIFO/AVCO Valuation', href: '/reports/inventory', code: 'BI05', icon: Package, permission: 'reports.view' },
      { label: 'Theoretical vs Actual COGS', href: '/reports/food-costing', code: 'BI06', icon: CookingPot, permission: 'reports.view' },
      { label: 'Shrinkage & Waste Audit', href: '/reports/waste', code: 'BI07', icon: FileChartColumn, permission: 'reports.view' },
      { label: 'Vendor Spend Analytics', href: '/reports/procurement', code: 'BI08', icon: Truck, permission: 'reports.view' },
      { label: 'Till Discrepancy Audit', href: '/reports/cash', code: 'BI09', icon: Wallet, permission: 'reports.view' },
      { label: 'Custom Query Builder', href: '/reports/builder', code: 'BI10', icon: SlidersHorizontal, permission: 'reports.custom' },
      { label: 'Scheduled Report Jobs', href: '/reports/saved', code: 'BI11', icon: BookOpen, permission: 'reports.view' },
      { label: 'CSV / Excel Data Exports', href: '/reports/exports', code: 'BI12', icon: FileText, permission: 'reports.export' },
    ],
  },
  {
    label: 'AI Copilot & Automations',
    domain: 'FINANCE_BI',
    icon: BrainCircuit,
    items: [
      { label: 'Servora AI Advisor', href: '/ai-assistant', code: 'AI01', icon: BrainCircuit, permission: 'ai.use', badge: 'AI', badgeType: 'info' },
      { label: 'Revenue Forecasting', href: '/ai-assistant/sales', code: 'AI02', icon: ChartNoAxesCombined, permission: 'ai.use' },
      { label: 'Cover Demand Predictor', href: '/ai-assistant/forecasting', code: 'AI03', icon: Activity, permission: 'ai.use' },
      { label: 'Auto-PO Replenishment', href: '/ai-assistant/inventory', code: 'AI04', icon: Package, permission: 'ai.use' },
      { label: 'Menu Boston Matrix', href: '/ai-assistant/menu-analysis', code: 'AI05', icon: Sparkles, permission: 'ai.use' },
      { label: 'Workflow Rules Engine', href: '/automations', code: 'AI06', icon: Puzzle, permission: 'automations.manage' },
      { label: 'Webhook Execution Logs', href: '/automations/runs', code: 'AI07', icon: History, permission: 'automations.view' },
      { label: 'System Alert Center', href: '/notifications', code: 'AI08', icon: Bell, permission: 'notifications.view' },
    ],
  },
  {
    label: 'Human Capital & Governance',
    domain: 'GOVERNANCE',
    icon: UserRound,
    items: [
      { label: 'Employee Master Roster', href: '/staff', code: 'HR01', icon: Users, permission: 'staff.view' },
      { label: 'RBAC Permission Matrix', href: '/staff/roles', code: 'HR02', icon: ShieldCheck, permission: 'staff.manage' },
      { label: 'Shift Rota Planner', href: '/staff/schedules', code: 'HR03', icon: CalendarDays, permission: 'staff.view' },
      { label: 'Clock-In Attendance', href: '/staff/attendance', code: 'HR04', icon: Clock, permission: 'staff.view' },
      { label: 'Manager Shift Handover', href: '/staff/handover', code: 'HR05', icon: ClipboardList, permission: 'staff.view' },
      { label: 'Drawer Custodian Rights', href: '/staff/cashier-assignments', code: 'HR06', icon: Wallet, permission: 'staff.manage' },
      { label: 'Waiter Sales KPIs', href: '/staff/performance', code: 'HR07', icon: ChartNoAxesCombined, permission: 'reports.view' },
      { label: 'Disciplinary & Incidents', href: '/staff/incidents', code: 'HR08', icon: FileText, permission: 'staff.manage' },
    ],
  },
  {
    label: 'Enterprise Configuration',
    domain: 'GOVERNANCE',
    icon: Settings,
    items: [
      { label: 'Legal Entity & KRA PIN', href: '/settings/business', code: 'CFG01', icon: Building2, permission: 'settings.view' },
      { label: 'Multi-Branch Topology', href: '/settings/branches', code: 'CFG02', icon: Store, permission: 'branches.view' },
      { label: 'Tax & eTIMS OSCU Setup', href: '/settings/financial', code: 'CFG03', icon: Wallet, permission: 'settings.manage' },
      { label: 'Dining Service Models', href: '/settings/service-models', code: 'CFG04', icon: UtensilsCrossed, permission: 'settings.manage' },
      { label: 'Thermal Receipt Designer', href: '/settings/receipts', code: 'CFG05', icon: Receipt, permission: 'settings.manage' },
      { label: 'ESC/POS Printers & LAN', href: '/settings/printers', code: 'CFG06', icon: Monitor, permission: 'settings.manage' },
      { label: 'KDS Station Routing', href: '/settings/kitchen', code: 'CFG07', icon: ChefHat, permission: 'settings.manage' },
      { label: 'Payment Gateways', href: '/settings/integrations/payments', code: 'CFG08', icon: CreditCard, permission: 'integrations.manage' },
      { label: 'SMS & WhatsApp Gateways', href: '/settings/integrations/messaging', code: 'CFG09', icon: Bell, permission: 'integrations.manage' },
      { label: 'UberEats / Glovo Webhooks', href: '/settings/integrations/orders', code: 'CFG10', icon: ShoppingCart, permission: 'integrations.manage' },
      { label: 'Alert Escalation Rules', href: '/settings/notifications', code: 'CFG11', icon: Bell, permission: 'settings.manage' },
      { label: 'Immutable Security Audit', href: '/settings/audit-logs', code: 'CFG12', icon: ShieldCheck, permission: 'audit.view' },
      { label: 'Offline Edge Sync Queue', href: '/settings/offline', code: 'CFG13', icon: RefreshCw, permission: 'settings.manage' },
      { label: 'Authorized POS Terminals', href: '/settings/devices', code: 'CFG14', icon: Monitor, permission: 'settings.manage' },
      { label: 'SaaS Subscription & Tier', href: '/settings/billing', code: 'CFG15', icon: Receipt, permission: 'billing.view' },
      { label: '2FA & Password Policies', href: '/settings/security', code: 'CFG16', icon: ShieldCheck, permission: 'settings.security' },
    ],
  },
];

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

  // Live Operational Telemetry Badges (KDS Queue, Low Stock, Open Orders)
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

  // Load saved Pinned Favorites & Recent History from localStorage
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

  // Track Recently Visited Modules automatically on route change
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

  // Close branch dropdown on outside click
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

  // Fetch registered branches + live operational badge counts
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

  // Keyboard shortcut: Ctrl+K or Cmd+K focuses T-Code / Module search
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

  // Live API latency heartbeat
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

  // Inject dynamic live counts into navigation items
  const enrichedGroups = useMemo(() => {
    return navigationGroups
      .map((group) => ({
        ...group,
        items: group.items
          .filter((item) => hasPermission(item, allowedPermissions))
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
  }, [allowedPermissions, liveCounts]);

  const visibleStandaloneItems = useMemo(
    () => standaloneItems.filter((item) => hasPermission(item, allowedPermissions)),
    [allowedPermissions]
  );

  // Flat catalog of all accessible items for T-Code jump, Favorites, and Recents
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

  // Filter by module label OR SAP-style Transaction Code (e.g., "MM02", "POS01")
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return enrichedGroups;
    const query = searchQuery.toLowerCase().trim();

    return enrichedGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            item.code.toLowerCase().includes(query) ||
            group.label.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [enrichedGroups, searchQuery]);

  // First matching item for Enter-key instant T-Code execution
  const firstSearchMatch = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    for (const item of allAccessibleItems.values()) {
      if (item.code.toLowerCase() === q) return item;
    }
    return filteredGroups[0]?.items[0] || null;
  }, [searchQuery, allAccessibleItems, filteredGroups]);

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
        title={isCollapsed ? `${item.label} [${item.code}]` : undefined}
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

            {/* T-Code subtle indicator on hover */}
            <span
              className={[
                'hidden group-hover:inline-block font-mono text-[9px] px-1 rounded uppercase',
                active ? 'text-white/80' : 'text-servora-pale/35',
              ].join(' ')}
            >
              {item.code}
            </span>

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
                  'opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 rounded transition-opacity shrink-0',
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
        {/* Top Executive Header */}
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
              className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-servora-navy/70 hover:text-servora-navy hover:bg-gray-100 transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}

          <button
            type="button"
            onClick={closeMobileMenu}
            className="rounded-lg p-1.5 text-servora-navy hover:bg-gray-100 transition-colors lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corporate Entity & Multi-Branch Context Switcher */}
        {!isCollapsed ? (
          <div ref={branchDropdownRef} className="relative px-3 pt-3 pb-1">
            <button
              type="button"
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] transition-all text-left"
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
                    Operating Nodes ({branchNodes.length})
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
                            'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left',
                            isSelected
                              ? 'bg-servora-core/25 text-white border border-servora-core/40'
                              : 'text-servora-pale/75 hover:bg-white/[0.08] hover:text-white',
                          ].join(' ')}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="truncate block font-medium">{b.name}</span>
                            <span className="text-[9.5px] font-mono text-servora-pale/45 block">
                              {b.code} {b.isMainBranch ? '• Primary Hub' : ''}
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

        {/* SAP / NetSuite T-Code Command Launcher & Search (Ctrl+K) */}
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
                placeholder="Search or T-Code (e.g. MM02)..."
                className="w-full bg-white/[0.04] border border-white/[0.07] focus:border-servora-teal/50 focus:bg-white/[0.08] text-white placeholder-servora-pale/35 text-xs rounded-lg pl-8 pr-12 py-1.5 outline-none transition-all"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-servora-pale/40 hover:text-white"
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
                  Jump to <strong>{firstSearchMatch.label}</strong> ({firstSearchMatch.code})
                </span>
                <span className="flex items-center gap-0.5 font-mono text-[9px] text-servora-teal shrink-0 ml-1">
                  Enter <CornerDownLeft size={10} />
                </span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Modules Tree */}
        <nav
          className={[
            'flex-1 space-y-1 overflow-y-auto py-1.5 overscroll-contain select-none custom-scrollbar transition-all',
            isCollapsed ? 'px-2' : 'px-3',
          ].join(' ')}
        >
          {/* Mission Control Standalone */}
          {!searchQuery && (
            <div className="mb-2.5">
              {!isCollapsed && (
                <p className="mb-1 px-2.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-servora-pale/40">
                  Mission Control
                </p>
              )}
              <div className="space-y-0.5">
                {visibleStandaloneItems.map((item) => renderNavItem(item, false, false))}
              </div>
            </div>
          )}

          {/* Starred Favorites Dock (NetSuite / SAP Fiori Paradigm) */}
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

          {/* Recently Visited Trail */}
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

          {/* Enterprise Tree Controls */}
          {!searchQuery && !isCollapsed && (
            <div className="pt-2 mb-1 px-2.5 flex items-center justify-between border-t border-white/[0.06]">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-servora-pale/40">
                ERP Functional Domains
              </p>
              <button
                type="button"
                onClick={toggleExpandAll}
                title={expandedGroups.length === enrichedGroups.length ? 'Collapse All' : 'Expand All'}
                className="text-[10px] font-semibold text-servora-pale/40 hover:text-servora-teal flex items-center gap-1 transition-colors"
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

          {/* Grouped Functional Domains */}
          <div className="space-y-1">
            {filteredGroups.map((group, idx) => {
              const GroupIcon = group.icon;
              const expanded = searchQuery.trim().length > 0 || expandedGroups.includes(group.label);
              const active = groupIsActive(pathname, group);
              const prevDomain = idx > 0 ? filteredGroups[idx - 1].domain : null;
              const showDomainDivider = !searchQuery && !isCollapsed && group.domain !== prevDomain;

              // Count total active badges inside collapsed group
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
                        'group flex w-full items-center gap-2.5 rounded-lg text-left text-xs font-semibold transition-all duration-150',
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

                    {/* Submenu in expanded view */}
                    {expanded && !isCollapsed && (
                      <div className="mt-0.5 space-y-0.5 border-l border-white/[0.08] ml-4 pl-1 transition-all">
                        {group.items.map((item) => renderNavItem(item, true, true))}
                      </div>
                    )}

                    {/* Flyout Submenu in Collapsed Mode */}
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
                              <span className="font-mono text-[9px] text-servora-pale/40 shrink-0">
                                {item.code}
                              </span>
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
                  label: 'Executive Helpdesk',
                  href: '/help',
                  code: 'HLP01',
                  icon: CircleHelp,
                  permission: 'help.view',
                },
                false,
                false
              )}
            </div>
          )}
        </nav>

        {/* Corporate Telemetry & Sign Out Footer */}
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
                    {latency ? `${latency}ms latency` : 'Online • Sync Active'}
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
              'flex w-full items-center gap-2 rounded-xl bg-white/[0.03] hover:bg-red-500/15 text-servora-pale/75 hover:text-red-300 border border-white/[0.06] hover:border-red-500/30 text-xs font-semibold transition-all duration-150',
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