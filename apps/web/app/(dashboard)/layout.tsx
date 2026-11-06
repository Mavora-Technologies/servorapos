'use client';

import { useEffect, useState, useRef, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Menu,
  Building2,
  Store,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  Check,
  ChevronDown,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Settings,
  LogOut,
  HelpCircle,
  Truck,
  Boxes,
  CircleDot,
  Radio,
  Search,
  ChefHat,
  Receipt,
  AlertCircle,
  Lock
} from 'lucide-react';
import Sidebar from './Sidebar';
import { fetchApi } from '@/lib/api';

interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: string;
  permissions?: string[];
}

interface BranchRecord {
  id: number;
  name: string;
  code: string;
  isMainBranch?: boolean;
  isActive?: boolean;
}

interface WorkspaceInfo {
  user: UserProfile;
  business: { id: number; name: string };
  branch: { id: number; name: string; code: string };
}

interface HeaderNotification {
  id: number;
  title: string;
  detail: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  module: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

// Comprehensive Route-to-Permission Mapping (Sorted automatically from most specific to least specific)
const ROUTE_PERMISSIONS: Record<string, string> = {
  // Mission Control & Terminals
  '/dashboard': 'dashboard.view',
  '/pos': 'pos.access',

  // Front-of-House & Guest Service
  '/orders/open': 'orders.view',
  '/orders/takeaway': 'orders.view',
  '/orders/delivery': 'delivery.view',
  '/orders': 'orders.view',
  '/online-orders': 'orders.view',
  '/tables': 'tables.view',
  '/reservations/waitlist': 'reservations.view',
  '/reservations': 'reservations.view',

  // Kitchen Operations (KDS)
  '/kitchen/stations': 'kitchen.manage',
  '/kitchen/history': 'kitchen.view',
  '/kitchen/performance': 'reports.view',
  '/kitchen': 'kitchen.view',

  // Menu & Recipe Engineering
  '/menu/categories': 'menu.manage',
  '/menu/items': 'menu.view',
  '/menu/modifiers': 'menu.manage',
  '/menu/combos': 'menu.manage',
  '/menu/pricing': 'menu.manage',
  '/menu/availability': 'menu.manage',
  '/menu/recipes/costing': 'recipes.view',
  '/menu/recipes/units': 'inventory.manage',
  '/menu/recipes': 'recipes.view',
  '/menu': 'menu.view',

  // Inventory & Logistics
  '/inventory/items': 'inventory.view',
  '/inventory/movements': 'inventory.view',
  '/inventory/counts': 'inventory.manage',
  '/inventory/transfers/fleet': 'inventory.manage',
  '/inventory/transfers': 'inventory.manage',
  '/inventory/locations': 'inventory.manage',
  '/inventory/batches': 'inventory.view',
  '/inventory/reorder': 'inventory.view',
  '/inventory/waste': 'inventory.manage',
  '/inventory': 'inventory.view',

  // Procurement & Vendors
  '/suppliers': 'suppliers.view',
  '/purchasing/requests': 'purchasing.view',
  '/purchasing/orders': 'purchasing.view',
  '/purchasing/receiving': 'purchasing.receive',
  '/purchasing/invoices': 'purchasing.view',
  '/purchasing/returns': 'purchasing.manage',

  // Treasury, Finance & Cash
  '/payments/mpesa': 'payments.view',
  '/payments/reconciliation': 'payments.reconcile',
  '/payments/refunds': 'refunds.view',
  '/payments': 'payments.view',
  '/cash-management/drawers': 'cash.view',
  '/cash-management/shifts': 'cash.view',
  '/cash-management/reconciliation': 'cash.reconcile',
  '/finance/expenses': 'finance.view',
  '/finance/payables': 'finance.view',
  '/finance/taxes': 'finance.manage',
  '/finance/adjustments': 'finance.adjust',

  // Guests & Loyalty
  '/customers/feedback': 'customers.view',
  '/customers': 'customers.view',
  '/loyalty/transactions': 'loyalty.view',
  '/loyalty/rewards': 'loyalty.manage',
  '/loyalty': 'loyalty.view',
  '/marketing/campaigns': 'marketing.manage',

  // Executive Analytics & BI
  '/reports/builder': 'reports.custom',
  '/reports/exports': 'reports.export',
  '/reports': 'reports.view',

  // Servora Intelligence AI & Automations
  '/ai-assistant': 'ai.use',
  '/automations/runs': 'automations.view',
  '/automations': 'automations.manage',
  '/notifications': 'notifications.view',

  // Staff & Shift Management
  '/staff/roles': 'staff.manage',
  '/staff/schedules': 'staff.view',
  '/staff/attendance': 'staff.view',
  '/staff/handover': 'staff.view',
  '/staff/cashier-assignments': 'staff.manage',
  '/staff/performance': 'reports.view',
  '/staff/incidents': 'staff.manage',
  '/staff': 'staff.view',

  // Organization & Settings
  '/settings/business': 'settings.view',
  '/settings/branches': 'branches.view',
  '/settings/financial': 'settings.manage',
  '/settings/service-models': 'settings.manage',
  '/settings/receipts': 'settings.manage',
  '/settings/printers': 'settings.manage',
  '/settings/kitchen': 'settings.manage',
  '/settings/integrations': 'integrations.manage',
  '/settings/notifications': 'settings.manage',
  '/settings/audit-logs': 'audit.view',
  '/settings/offline': 'settings.manage',
  '/settings/devices': 'settings.manage',
  '/settings/billing': 'billing.view',
  '/settings/security': 'settings.security',
  '/help': 'help.view',
};

function getRequiredPermissionForPath(pathname: string): string | null {
  if (!pathname) return null;
  // Sort keys by length descending so deeper routes match before parent routes
  const sortedRoutes = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);
  const matchedRoute = sortedRoutes.find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  return matchedRoute ? ROUTE_PERMISSIONS[matchedRoute] : null;
}

function checkRouteAccess(pathname: string, permissions?: string[], role?: string): boolean {
  // Full administrative bypass for ADMIN and SUPER_ADMIN
  if (
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    (permissions && permissions.includes('*'))
  ) {
    return true;
  }

  if (!permissions) return true;

  const requiredPerm = getRequiredPermissionForPath(pathname);
  if (!requiredPerm) return true;

  return permissions.includes(requiredPerm);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);

  // Multi-Branch Node State
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<number | null>(null);
  const [activeBranchName, setActiveBranchName] = useState<string>('Loading Branch...');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  // Popover Menus
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);

  const branchRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (branchRef.current && !branchRef.current.contains(target)) {
        setIsBranchDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Listen for branch changes from sidebar or shell
  useEffect(() => {
    const handleBranchSwitched = (e: any) => {
      if (e.detail?.branchId) {
        setActiveBranchId(e.detail.branchId);
        setActiveBranchName(e.detail.branchName);
      }
    };

    window.addEventListener('servora:branch-switched', handleBranchSwitched);
    return () => window.removeEventListener('servora:branch-switched', handleBranchSwitched);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('servora_token');
    if (!token) {
      router.push('/login');
      return;
    }

    setIsAuthorized(true);

    const loadSessionAndBranches = async () => {
      try {
        const [meRes, branchRes, notifRes] = await Promise.all([
          fetchApi('/api/v1/auth/me'),
          fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
          fetchApi('/api/v1/notifications').catch(() => ({ data: { notifications: [] } })),
        ]);

        if (meRes?.data) {
          setWorkspace(meRes.data);
          setActiveBranchName(meRes.data.branch?.name || 'Main Branch');
          setActiveBranchId(meRes.data.branch?.id || null);
        }

        if (branchRes?.data && Array.isArray(branchRes.data)) {
          setBranches(branchRes.data);
          const savedBranchId = localStorage.getItem('servora_active_branch_id');
          if (savedBranchId) {
            const found = branchRes.data.find((b: BranchRecord) => String(b.id) === savedBranchId);
            if (found) {
              setActiveBranchId(found.id);
              setActiveBranchName(found.name);
            }
          }
        }

        if (notifRes?.data?.notifications) {
          setNotifications(notifRes.data.notifications);
        }
      } catch (error) {
        console.error('Failed to load session profile or branches:', error);
      }
    };

    loadSessionAndBranches();
    const pollInterval = setInterval(loadSessionAndBranches, 30000);
    return () => clearInterval(pollInterval);
  }, [router]);

  if (!isAuthorized) return null;

  const handleLogout = () => {
    localStorage.removeItem('servora_token');
    localStorage.removeItem('servora_active_branch_id');
    localStorage.removeItem('servora_active_branch_name');
    router.push('/login');
  };

  const handleSelectBranchNode = (b: BranchRecord) => {
    setActiveBranchId(b.id);
    setActiveBranchName(b.name);
    localStorage.setItem('servora_active_branch_id', String(b.id));
    localStorage.setItem('servora_active_branch_name', b.name);
    setIsBranchDropdownOpen(false);

    window.dispatchEvent(
      new CustomEvent('servora:branch-switched', {
        detail: { branchId: b.id, branchName: b.name, branchCode: b.code },
      })
    );

    startTransition(() => {
      router.refresh();
    });
  };

  const handleMarkAllRead = async () => {
    try {
      await fetchApi('/api/v1/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const toggleSidebarCollapse = () => setIsSidebarCollapsed((prev) => !prev);

  const getUserInitials = () => {
    if (!workspace?.user) return 'JD';
    const first = workspace.user.firstName?.[0] || '';
    const last = workspace.user.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'U';
  };

  // Modern, clean, professional title generator
  const getHeaderTitle = () => {
    if (!pathname) return 'Dashboard';
    if (pathname === '/' || pathname === '/dashboard') return 'Overview Dashboard';
    if (pathname === '/pos') return 'Point of Sale Terminal';
    if (pathname === '/kitchen') return 'Kitchen Display Console';
    if (pathname === '/kitchen/stations') return 'Kitchen Preparation Stations';
    if (pathname === '/kitchen/history') return 'Fulfillment Ticket History';
    if (pathname === '/kitchen/performance') return 'Culinary SLA & Performance';
    if (pathname === '/menu') return 'Menu Catalog Master';
    if (pathname === '/menu/categories') return 'Category Architecture';
    if (pathname === '/menu/items') return 'Menu Items & Variations';
    if (pathname === '/menu/recipes') return 'Standard Recipes & Bill of Materials';
    if (pathname === '/menu/recipes/costing') return 'Food Cost & Margin Matrix';
    if (pathname === '/inventory') return 'Stock Valuation Ledger';
    if (pathname === '/inventory/items') return 'Raw Materials & Master SKUs';
    if (pathname === '/inventory/movements') return 'Stock Movement Ledger';
    if (pathname === '/inventory/counts') return 'Physical Stock Audits';
    if (pathname === '/inventory/transfers') return 'Inter-Branch Stock Transfers';
    if (pathname === '/inventory/transfers/fleet') return 'Logistics Fleet & Dispatch Console';
    if (pathname === '/inventory/locations') return 'Warehouse Layout & Storage Locations';
    if (pathname === '/inventory/batches') return 'Lot Batches & Expiry Dates';
    if (pathname === '/inventory/reorder') return 'Automated Reorder Engine';
    if (pathname === '/inventory/waste') return 'Waste, Spoilage & Shrinkage';
    if (pathname === '/suppliers') return 'Vendor & Supplier Directory';
    if (pathname === '/purchasing/requests') return 'Purchase Requisitions';
    if (pathname === '/purchasing/orders') return 'Purchase Orders';
    if (pathname === '/purchasing/receiving') return 'Goods Received Notes';
    if (pathname === '/purchasing/invoices') return 'Supplier Invoices';
    if (pathname === '/payments') return 'Tender Settlement Cockpit';
    if (pathname === '/payments/mpesa') return 'M-Pesa Express & Daraja Console';
    if (pathname === '/payments/reconciliation') return 'Bank Account Reconciliation';
    if (pathname === '/cash-management/drawers') return 'Cash Drawer Registers';
    if (pathname === '/cash-management/shifts') return 'Cashier Till Shifts';
    if (pathname === '/staff') return 'Employee Directory & Roster';
    if (pathname === '/staff/roles') return 'Role Clearances & Access Authority Matrix';
    if (pathname === '/settings/branches') return 'Multi-Branch Topology';
    if (pathname === '/settings/business') return 'Business Entity Profile';
    if (pathname === '/finance/taxes') return 'Tax Compliance & eTIMS Ledger';
    if (pathname === '/notifications') return 'System Alert Center';
    if (pathname === '/help') return 'Servora Helpdesk & Documentation';

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      return segments
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '))
        .join(' / ');
    }
    return 'Servora Workspace';
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Evaluate route security clearance
  const isPageAuthorized = checkRouteAccess(
    pathname,
    workspace?.user.permissions,
    workspace?.user.role
  );
  const requiredPermission = getRequiredPermissionForPath(pathname);

  return (
    <div className="h-screen w-full flex bg-servora-pale text-servora-navy font-sans text-sm overflow-hidden">
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        closeMobileMenu={closeMobileMenu}
        handleLogout={handleLogout}
        allowedPermissions={workspace?.user.permissions}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={toggleSidebarCollapse}
        businessName={workspace?.business.name}
        activeBranch={activeBranchName}
        userRole={workspace?.user.role}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Header Shell */}
        <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-20 shadow-xs">
          {/* Left section: Mobile Toggle, Desktop Collapse, Dynamic Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-servora-navy hover:bg-gray-100 rounded-lg cursor-pointer"
              aria-label="Open mobile menu"
            >
              <Menu size={20} />
            </button>

            <button
              onClick={toggleSidebarCollapse}
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="hidden lg:flex items-center justify-center p-2 text-servora-navy/70 hover:text-servora-navy hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>

            <div className="min-w-0 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-servora-core animate-pulse"></span>
              <h2 className="text-sm lg:text-base font-bold text-servora-navy tracking-tight truncate">
                {getHeaderTitle()}
              </h2>
            </div>
          </div>

          {/* Right section: Action Buttons, Branch Switcher, Alerts, Profile */}
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            {/* Direct POS Link (Only shown if user has pos.access or wildcard) */}
            {pathname !== '/pos' && checkRouteAccess('/pos', workspace?.user.permissions, workspace?.user.role) && (
              <Link
                href="/pos"
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-servora-core text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors"
              >
                <ShoppingBag size={14} />
                <span>Open POS</span>
              </Link>
            )}

            {/* Operating Branch Dropdown */}
            <div ref={branchRef} className="relative">
              <button
                type="button"
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-servora-navy transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
                <Store size={13} className="text-servora-core shrink-0" />
                <span className="truncate max-w-[140px]">{activeBranchName}</span>
                <ChevronDown size={13} className="text-gray-400 shrink-0" />
              </button>

              {isBranchDropdownOpen && (
                <div className="absolute right-0 top-11 w-68 bg-white border border-gray-100 rounded-2xl shadow-xl p-2 z-30 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Switch Active Location
                    </span>
                    <Link
                      href="/settings/branches"
                      onClick={() => setIsBranchDropdownOpen(false)}
                      className="text-[10px] font-bold text-servora-core hover:underline flex items-center gap-0.5"
                    >
                      <span>Manage</span>
                      <ExternalLink size={10} />
                    </Link>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
                    {branches.length > 0 ? (
                      branches.map((b) => {
                        const isSelected = activeBranchId === b.id || activeBranchName === b.name;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleSelectBranchNode(b)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${isSelected
                              ? 'bg-servora-pale text-servora-core font-bold'
                              : 'text-servora-navy hover:bg-gray-50'
                              }`}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="truncate block">{b.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {b.code} {b.isMainBranch ? '• Primary Hub' : ''}
                              </span>
                            </div>
                            {isSelected && <Check size={14} className="text-servora-core shrink-0 ml-2" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        {activeBranchName} (Single Location)
                      </div>
                    )}
                  </div>

                  <div className="pt-1.5 mt-1 border-t border-gray-100">
                    <Link
                      href="/inventory/transfers"
                      onClick={() => setIsBranchDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-servora-deepTeal hover:text-servora-core hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Truck size={13} />
                      <span>Inter-Branch Stock Transfers</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Center Popover */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 text-servora-navy/70 hover:text-servora-navy hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                title="Notifications & Operational Alerts"
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 top-11 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl p-3 z-30 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-servora-navy">Operational Alerts</span>
                      <span className="px-1.5 py-0.2 bg-servora-pale text-servora-core text-[10px] font-bold rounded-full">
                        {unreadCount}
                      </span>
                    </div>
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-semibold text-gray-400 hover:text-servora-navy cursor-pointer"
                    >
                      Mark all read
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-gray-400 italic">
                        No pending alerts
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-2.5 rounded-xl border text-xs transition-colors ${notif.isRead ? 'bg-white border-gray-100' : 'bg-slate-50 border-gray-200'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-servora-navy">{notif.title}</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600 leading-snug">{notif.detail}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 mt-2 border-t border-gray-100 text-center">
                    <Link
                      href="/notifications"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-xs font-bold text-servora-core hover:underline"
                    >
                      View All System Activity &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Popover */}
            <div ref={userRef} className="relative pl-1 border-l border-gray-200">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div
                  title={workspace?.user.fullName || 'User Profile'}
                  className="w-8 h-8 rounded-full bg-servora-core text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 select-none"
                >
                  {getUserInitials()}
                </div>
                <div className="hidden lg:flex flex-col">
                  <span className="text-xs font-bold text-servora-navy leading-none">
                    {workspace?.user.firstName || 'Manager'}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">
                    {workspace?.user.role || 'Admin'}
                  </span>
                </div>
                <ChevronDown size={13} className="text-gray-400 hidden lg:block" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-11 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl p-2 z-30 animate-in fade-in zoom-in-95 space-y-1">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-bold text-servora-navy truncate">
                      {workspace?.user.fullName || 'User Account'}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{workspace?.user.email}</p>
                    <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-servora-core bg-servora-pale px-1.5 py-0.5 rounded">
                      {workspace?.user.role || 'STAFF'}
                    </span>
                  </div>

                  <Link
                    href="/settings/business"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-servora-navy hover:bg-gray-50 transition-colors"
                  >
                    <Building2 size={14} className="text-gray-400" />
                    <span>Business Profile</span>
                  </Link>

                  <Link
                    href="/settings/branches"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-servora-navy hover:bg-gray-50 transition-colors"
                  >
                    <Store size={14} className="text-gray-400" />
                    <span>Locations & Outlets</span>
                  </Link>

                  <Link
                    href="/help"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-servora-navy hover:bg-gray-50 transition-colors"
                  >
                    <HelpCircle size={14} className="text-gray-400" />
                    <span>Documentation & Support</span>
                  </Link>

                  <div className="pt-1 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Viewport with Dynamic RBAC Interception */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-servora-pale">
          {isPageAuthorized ? (
            <div className="w-full space-y-6">
              {children}
            </div>
          ) : (
            <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-gray-200 shadow-xs text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
                <ShieldAlert size={28} />
              </div>

              <div className="space-y-1.5 max-w-md">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase tracking-wider">
                  <Lock size={10} /> Access Restricted
                </span>
                <h2 className="text-lg font-bold text-servora-navy">
                  Security Clearance Required
                </h2>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Your current operational profile (<strong>{workspace?.user.role || 'Staff'}</strong>) does not include the required security permission to view or operate <code className="font-mono font-bold text-servora-core bg-slate-100 px-1.5 py-0.5 rounded">{pathname}</code>.
                </p>
              </div>

              {requiredPermission && (
                <div className="px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-[11px] font-mono text-gray-600">
                  Required Authority: <strong className="text-servora-navy">{requiredPermission}</strong>
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  &larr; Go Back
                </button>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-servora-core text-white hover:bg-blue-700 rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  Return to Overview
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}