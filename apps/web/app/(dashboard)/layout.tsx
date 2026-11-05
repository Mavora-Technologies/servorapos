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
  AlertCircle
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

  // Production Notifications State (Zero Hardcoding)
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
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
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

  const getHeaderTitle = () => {
    if (!pathname) return 'Dashboard';
    if (pathname === '/' || pathname === '/dashboard') return 'Executive Control Tower';
    if (pathname === '/pos') return 'POS Terminal [POS01]';
    if (pathname === '/kitchen') return 'Kitchen Display System [KDS01]';
    if (pathname === '/menu') return 'Menu Catalog Master [BOM01]';
    if (pathname === '/inventory') return 'Inventory Control Tower [MM01]';
    if (pathname === '/inventory/items') return 'Item SKU Master [MM02]';
    if (pathname === '/inventory/movements') return 'Stock Movement Ledger [MM03]';
    if (pathname === '/inventory/counts') return 'Physical Stocktake Reconciliation [MM04]';
    if (pathname === '/inventory/transfers') return 'Inter-Branch Consignments [MM05]';
    if (pathname === '/purchasing/orders') return 'Purchase Orders [P2P03]';
    if (pathname === '/purchasing/receiving') return 'Goods Received GRN [P2P04]';
    if (pathname === '/payments/mpesa') return 'M-Pesa Daraja Hub [FI02]';
    if (pathname === '/settings/branches') return 'Multi-Branch Nodes [CFG02]';
    if (pathname === '/finance/taxes') return 'KRA eTIMS Ledger [FI10]';
    if (pathname === '/notifications') return 'System Alert Center';

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      return segments
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '))
        .join(' / ');
    }
    return 'Enterprise Cockpit';
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="h-screen w-full flex bg-servora-pale text-servora-navy font-sans text-sm overflow-hidden">
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        closeMobileMenu={closeMobileMenu}
        handleLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={toggleSidebarCollapse}
        businessName={workspace?.business.name}
        activeBranch={activeBranchName}
        userRole={workspace?.user.role}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Header Shell */}
        <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-20 shadow-xs">
          {/* Left section: Hamburger, Collapse toggle, Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-servora-navy hover:bg-gray-100 rounded-lg"
              aria-label="Open mobile menu"
            >
              <Menu size={20} />
            </button>

            <button
              onClick={toggleSidebarCollapse}
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="hidden lg:flex items-center justify-center p-2 text-servora-navy/70 hover:text-servora-navy hover:bg-gray-100 rounded-lg transition-colors"
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

          {/* Right section: Branch Switcher, Quick POS Action, Alerts, User Avatar */}
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            {/* Quick POS Terminal Jump */}
            {pathname !== '/pos' && (
              <Link
                href="/pos"
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-servora-core text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors"
              >
                <ShoppingBag size={14} />
                <span>POS [POS01]</span>
              </Link>
            )}

            {/* Multi-Branch Quick Node Switcher Dropdown */}
            <div ref={branchRef} className="relative">
              <button
                type="button"
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-servora-navy transition-colors"
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
                      Switch Operating Node
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
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
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
                            {isSelected && <Check size={14} className="text-servora-core shrink-0 ml-2" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        {activeBranchName} (Single Node)
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
                      <span>Inter-Branch Stock Transfers [MM05]</span>
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
                className="relative p-2 text-servora-navy/70 hover:text-servora-navy hover:bg-gray-100 rounded-xl transition-colors"
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
                          className={`p-2.5 rounded-xl border text-xs transition-colors ${
                            notif.isRead ? 'bg-white border-gray-100' : 'bg-slate-50 border-gray-200'
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
                className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded-xl transition-colors text-left"
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
                    <span>Corporate Entity [CFG01]</span>
                  </Link>

                  <Link
                    href="/settings/branches"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-servora-navy hover:bg-gray-50 transition-colors"
                  >
                    <Store size={14} className="text-gray-400" />
                    <span>Multi-Branch Nodes [CFG02]</span>
                  </Link>

                  <Link
                    href="/help"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-servora-navy hover:bg-gray-50 transition-colors"
                  >
                    <HelpCircle size={14} className="text-gray-400" />
                    <span>Executive Helpdesk</span>
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

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-servora-pale">
          <div className="w-full space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}