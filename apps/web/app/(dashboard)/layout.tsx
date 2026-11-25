// apps/web/app/(dashboard)/layout.tsx
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
  ShieldAlert,
  LogOut,
  HelpCircle,
  Truck,
  Lock,
} from 'lucide-react';
import Sidebar from './Sidebar';
import { fetchApi, ApiError } from '@/lib/api';
import {
  canAccessRoute,
  getRequiredPermissionsForPath,
  getDefaultLandingRoute,
  getLandingRouteLabel,
} from '@/lib/rbac';

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

interface BranchSwitchedDetail {
  branchId: number;
  branchName: string;
  branchCode?: string;
}

function clearSessionStorage(): void {
  localStorage.removeItem('servora_token');
  localStorage.removeItem('servora_active_branch_id');
  localStorage.removeItem('servora_active_branch_name');
  localStorage.removeItem('servora_cached_workspace');
  localStorage.removeItem('servora_cached_branches');
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

  // Listen for branch changes from sidebar or child terminals (e.g. POS)
  useEffect(() => {
    const handleBranchSwitched = (e: Event) => {
      const detail = (e as CustomEvent<BranchSwitchedDetail>).detail;
      if (detail?.branchId) {
        setActiveBranchId(detail.branchId);
        setActiveBranchName(detail.branchName);
      }
    };

    window.addEventListener('servora:branch-switched', handleBranchSwitched);
    return () => window.removeEventListener('servora:branch-switched', handleBranchSwitched);
  }, []);

  // Offline-resilient session & branch bootstrap with reconnect listener
  useEffect(() => {
    const token = localStorage.getItem('servora_token');
    if (!token) {
      const currentPath =
        typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
      const nextParam =
        currentPath && currentPath !== '/' ? `?next=${encodeURIComponent(currentPath)}` : '';
      router.replace(`/login${nextParam}`);
      return;
    }

    setIsAuthorized(true);

    // 1. Hydrate immediately from cached workspace so offline reloads keep RBAC & branch context
    try {
      const cachedWorkspace = localStorage.getItem('servora_cached_workspace');
      if (cachedWorkspace) {
        const parsed: WorkspaceInfo = JSON.parse(cachedWorkspace);
        setWorkspace(parsed);
        const savedBranchName = localStorage.getItem('servora_active_branch_name');
        const savedBranchId = localStorage.getItem('servora_active_branch_id');
        setActiveBranchName(savedBranchName || parsed.branch?.name || 'Main Branch');
        setActiveBranchId(savedBranchId ? Number(savedBranchId) : parsed.branch?.id || null);
      }
      const cachedBranches = localStorage.getItem('servora_cached_branches');
      if (cachedBranches) {
        const parsedBranches = JSON.parse(cachedBranches);
        if (Array.isArray(parsedBranches)) {
          setBranches(parsedBranches);
        }
      }
    } catch {
      // Ignore malformed cache entries
    }

    const loadSessionAndBranches = async () => {
      // Pause background polling while disconnected
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return;
      }

      try {
        const [meRes, branchRes, notifRes] = await Promise.all([
          fetchApi('/api/v1/auth/me'),
          fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
          fetchApi('/api/v1/notifications').catch(() => ({ data: { notifications: [] } })),
        ]);

        if (meRes?.data) {
          setWorkspace(meRes.data);
          localStorage.setItem('servora_cached_workspace', JSON.stringify(meRes.data));
          if (!localStorage.getItem('servora_active_branch_id') && meRes.data.branch?.id) {
            localStorage.setItem('servora_active_branch_id', String(meRes.data.branch.id));
            localStorage.setItem('servora_active_branch_name', meRes.data.branch.name);
            setActiveBranchId(meRes.data.branch.id);
            setActiveBranchName(meRes.data.branch.name);
          } else {
            setActiveBranchName(
              localStorage.getItem('servora_active_branch_name') ||
                meRes.data.branch?.name ||
                'Main Branch'
            );
            const storedId = localStorage.getItem('servora_active_branch_id');
            setActiveBranchId(storedId ? Number(storedId) : meRes.data.branch?.id || null);
          }
        }

        if (branchRes?.data && Array.isArray(branchRes.data)) {
          const activeOnly = branchRes.data.filter(
            (b: BranchRecord) => b.isActive !== false
          );
          setBranches(activeOnly);
          localStorage.setItem('servora_cached_branches', JSON.stringify(activeOnly));

          const savedBranchId = localStorage.getItem('servora_active_branch_id');
          if (savedBranchId) {
            const found = activeOnly.find((b: BranchRecord) => String(b.id) === savedBranchId);
            if (found) {
              setActiveBranchId(found.id);
              setActiveBranchName(found.name);
            } else if (activeOnly.length > 0) {
              // Saved branch is no longer authorized or active — fall back cleanly
              setActiveBranchId(activeOnly[0].id);
              setActiveBranchName(activeOnly[0].name);
              localStorage.setItem('servora_active_branch_id', String(activeOnly[0].id));
              localStorage.setItem('servora_active_branch_name', activeOnly[0].name);
            }
          }
        }

        if (notifRes?.data?.notifications) {
          setNotifications(notifRes.data.notifications);
        }
      } catch (error: unknown) {
        // Force logout only on a genuine 401 unauthorized response
        if (error instanceof ApiError && error.status === 401) {
          clearSessionStorage();
          const currentPath =
            typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
          const nextParam =
            currentPath && currentPath !== '/' ? `?next=${encodeURIComponent(currentPath)}` : '';
          router.replace(`/login${nextParam}`);
          return;
        }

        // Suppress Next.js dev error overlay during Wi-Fi drops or upstream DB outages
        if (
          error instanceof ApiError &&
          (error.isNetworkError || error.status === 0 || error.status >= 500)
        ) {
          console.warn('Offline/degraded mode: using cached session profile.');
          return;
        }

        console.warn('Session refresh skipped:', error);
      }
    };

    loadSessionAndBranches();
    const pollInterval = setInterval(loadSessionAndBranches, 30000);
    window.addEventListener('online', loadSessionAndBranches);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('online', loadSessionAndBranches);
    };
  }, [router]);

  if (!isAuthorized) return null;

  const handleLogout = () => {
    clearSessionStorage();
    router.replace('/login');
  };

  const handleSelectBranchNode = (b: BranchRecord) => {
    setActiveBranchId(b.id);
    setActiveBranchName(b.name);
    localStorage.setItem('servora_active_branch_id', String(b.id));
    localStorage.setItem('servora_active_branch_name', b.name);
    setIsBranchDropdownOpen(false);

    window.dispatchEvent(
      new CustomEvent<BranchSwitchedDetail>('servora:branch-switched', {
        detail: { branchId: b.id, branchName: b.name, branchCode: b.code },
      })
    );

    startTransition(() => {
      router.refresh();
    });
  };

  const handleMarkAllRead = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    try {
      await fetchApi('/api/v1/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err);
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const toggleSidebarCollapse = () => setIsSidebarCollapsed((prev) => !prev);

  const getUserInitials = () => {
    if (!workspace?.user) return 'U';
    const first = workspace.user.firstName?.[0] || '';
    const last = workspace.user.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'U';
  };

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
    if (pathname === '/menu/modifiers') return 'Modifiers & Add-Ons';
    if (pathname === '/menu/combos') return 'Combos & Meal Bundles';
    if (pathname === '/menu/pricing') return 'Menu Pricing & Tariff Rules';
    if (pathname === '/menu/availability') return 'Item Availability & Stock Controls';
    if (pathname === '/menu/recipes') return 'Standard Recipes & Bill of Materials';
    if (pathname === '/menu/recipes/costing') return 'Food Cost & Margin Matrix';
    if (pathname === '/menu/recipes/units') return 'Measurement Units & Conversions';
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
    if (pathname === '/settings/offline') return 'Offline Survivability & Sync Engine';
    if (pathname === '/settings/audit-logs') return 'Audit Logs & Compliance Ledger';
    if (pathname === '/settings/billing') return 'Billing & Headcount Licensing';
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

  const userPerms = workspace?.user.permissions;
  const userRole = workspace?.user.role;

  const requiredPermissions = getRequiredPermissionsForPath(pathname);
  const isWorkspaceHydrated = workspace !== null;
  const isPageAuthorized = isWorkspaceHydrated
    ? canAccessRoute(pathname, userPerms, userRole)
    : requiredPermissions.length === 0;

  const defaultHomeRoute = getDefaultLandingRoute(userPerms, userRole);
  const defaultHomeLabel = getLandingRouteLabel(defaultHomeRoute);

  const canSwitchBranches = branches.length > 1;
  const canManageBranches = canAccessRoute('/settings/branches', userPerms, userRole);
  const canViewTransfers = canAccessRoute('/inventory/transfers', userPerms, userRole);
  const canViewBusiness = canAccessRoute('/settings/business', userPerms, userRole);

  return (
    <div className="h-screen w-full flex bg-servora-pale text-servora-navy font-sans text-sm overflow-hidden">
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        closeMobileMenu={closeMobileMenu}
        handleLogout={handleLogout}
        allowedPermissions={userPerms}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={toggleSidebarCollapse}
        businessName={workspace?.business.name}
        activeBranch={activeBranchName}
        userRole={userRole}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Header Shell */}
        <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-20 shadow-xs">
          {/* Left section: Mobile Toggle, Desktop Collapse, Dynamic Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-servora-navy hover:bg-gray-100 rounded-lg cursor-pointer"
              aria-label="Open mobile menu"
            >
              <Menu size={20} />
            </button>

            <button
              type="button"
              onClick={toggleSidebarCollapse}
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="hidden lg:flex items-center justify-center p-2 text-servora-navy/70 hover:text-servora-navy hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>

            <div className="min-w-0 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-servora-core animate-pulse" />
              <h2 className="text-sm lg:text-base font-bold text-servora-navy tracking-tight truncate">
                {getHeaderTitle()}
              </h2>
            </div>
          </div>

          {/* Right section: Action Buttons, Branch Context, Alerts, Profile */}
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            {pathname !== '/pos' && canAccessRoute('/pos', userPerms, userRole) && (
              <Link
                href="/pos"
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-servora-core text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors"
              >
                <ShoppingBag size={14} />
                <span>Open POS</span>
              </Link>
            )}

            {/* Active Operating Branch Context (Interactive Switcher for Multi-Branch, Read-Only Badge for Single-Branch) */}
            <div ref={branchRef} className="relative">
              {canSwitchBranches ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-servora-navy transition-colors cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
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
                        {canManageBranches && (
                          <Link
                            href="/settings/branches"
                            onClick={() => setIsBranchDropdownOpen(false)}
                            className="text-[10px] font-bold text-servora-core hover:underline flex items-center gap-0.5"
                          >
                            <span>Manage</span>
                            <ExternalLink size={10} />
                          </Link>
                        )}
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
                        {branches.map((b) => {
                          const isSelected = activeBranchId === b.id || activeBranchName === b.name;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => handleSelectBranchNode(b)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                                isSelected
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
                              {isSelected && (
                                <Check size={14} className="text-servora-core shrink-0 ml-2" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {canViewTransfers && (
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
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div
                  title="Assigned operating branch"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy select-none"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <Store size={13} className="text-servora-core shrink-0" />
                  <span className="truncate max-w-[140px]">{activeBranchName}</span>
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
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 top-11 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl p-3 z-30 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-servora-navy">
                        Operational Alerts
                      </span>
                      <span className="px-1.5 py-0.2 bg-servora-pale text-servora-core text-[10px] font-bold rounded-full">
                        {unreadCount}
                      </span>
                    </div>
                    <button
                      type="button"
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
                          className={`p-2.5 rounded-xl border text-xs transition-colors ${
                            notif.isRead
                              ? 'bg-white border-gray-100'
                              : 'bg-slate-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-servora-navy">{notif.title}</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(notif.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
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
                    {workspace?.user.firstName || 'User'}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">
                    {workspace?.user.role || 'Staff'}
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

                  {canViewBusiness && (
                    <Link
                      href="/settings/business"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-servora-navy hover:bg-gray-50 transition-colors"
                    >
                      <Building2 size={14} className="text-gray-400" />
                      <span>Business Profile</span>
                    </Link>
                  )}

                  {canManageBranches && (
                    <Link
                      href="/settings/branches"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-servora-navy hover:bg-gray-50 transition-colors"
                    >
                      <Store size={14} className="text-gray-400" />
                      <span>Locations &amp; Outlets</span>
                    </Link>
                  )}

                  <Link
                    href="/help"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-servora-navy hover:bg-gray-50 transition-colors"
                  >
                    <HelpCircle size={14} className="text-gray-400" />
                    <span>Documentation &amp; Support</span>
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

        {/* Content Viewport with Fail-Closed RBAC Interception & Clean Branch Remount */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-servora-pale">
          {!isWorkspaceHydrated && requiredPermissions.length > 0 ? (
            <div className="min-h-[65vh] flex items-center justify-center text-xs font-semibold text-servora-deepTeal animate-pulse">
              Verifying workspace security clearance...
            </div>
          ) : isPageAuthorized ? (
            <div key={activeBranchId ?? 'default'} className="w-full space-y-6">
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
                  Your current operational profile (
                  <strong>{workspace?.user.role || 'Staff'}</strong>) does not include the required
                  security permission to view or operate{' '}
                  <code className="font-mono font-bold text-servora-core bg-slate-100 px-1.5 py-0.5 rounded">
                    {pathname}
                  </code>
                  .
                </p>
              </div>

              {requiredPermissions.length > 0 && (
                <div className="px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-[11px] font-mono text-gray-600">
                  Required Authority:{' '}
                  <strong className="text-servora-navy">
                    {requiredPermissions.join(' or ')}
                  </strong>
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
                  href={defaultHomeRoute}
                  className="px-4 py-2 bg-servora-core text-white hover:bg-blue-700 rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  Open {defaultHomeLabel}
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}