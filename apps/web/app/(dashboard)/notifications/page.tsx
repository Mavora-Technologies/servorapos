// apps/web/app/(dashboard)/notifications/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  Check,
  RefreshCw,
  ExternalLink,
  Layers,
  ChevronRight,
  Clock,
  Search,
  Zap,
  Users,
  Package,
  DollarSign,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  ChefHat,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface NotificationRecord {
  id: number;
  title: string;
  detail: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  module: string;
  category: 'ACTION_REQUIRED' | 'FYI_STREAM' | 'COMPLIANCE_AUDIT';
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  actionPayload?: {
    actionCode?: string;
    buttonLabel?: string;
    resolutionNotes?: string;
  };
  isRead: boolean;
  isResolved: boolean;
  resolvedAt?: string | null;
  resolvedByName?: string | null;
  branchName?: string;
  createdAt: string;
}

interface TelemetryMetrics {
  total: number;
  unread: number;
  critical: number;
  actionRequired: number;
  warnings: number;
}

type TabCategory = 'ALL' | 'ACTION_REQUIRED' | 'FYI_STREAM' | 'COMPLIANCE_AUDIT';
type SeverityFilter = 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';

const MODULE_META: Record<string, { label: string; icon: LucideIcon }> = {
  KDS: { label: 'Kitchen & Food Ready (KDS)', icon: ChefHat },
  POS: { label: 'Point of Sale (POS)', icon: ShoppingCart },
  WORKFORCE_HCM: { label: 'Workforce & HCM', icon: Users },
  INVENTORY_SCM: { label: 'Inventory & SCM', icon: Package },
  GUEST_CRM: { label: 'Guest & CRM', icon: Sparkles },
  FINANCE: { label: 'Finance & Treasury', icon: DollarSign },
  TREASURY: { label: 'Cash & Treasury', icon: DollarSign },
  SECURITY: { label: 'Security & Auth', icon: ShieldCheck },
  SYSTEM: { label: 'System Operations', icon: SlidersHorizontal },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryMetrics>({
    total: 0,
    unread: 0,
    critical: 0,
    actionRequired: 0,
    warnings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & State (default to ALL so KDS food-ready FYI alerts are immediately visible)
  const [activeTab, setActiveTab] = useState<TabCategory>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityFilter>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.set('category', activeTab);
      if (selectedSeverity !== 'ALL') params.set('severity', selectedSeverity);
      if (selectedModule !== 'ALL') params.set('module', selectedModule);
      if (showUnreadOnly) params.set('isRead', 'FALSE');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const activeBranchId =
        typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;
      if (activeBranchId) params.set('branchId', activeBranchId);

      const res = await fetchApi(`/api/v1/notifications?${params.toString()}`);
      if (res?.data) {
        setNotifications(res.data.notifications || []);
        if (Array.isArray(res.data.allowedModules)) {
          setAllowedModules(res.data.allowedModules);
        }
        if (res.data.telemetry) {
          setTelemetry(res.data.telemetry);
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load notifications stream:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedSeverity, selectedModule, showUnreadOnly, searchQuery]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await fetchApi(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setTelemetry((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to acknowledge notification';
      alert(msg);
    }
  };

  const handleResolveAction = async (item: NotificationRecord) => {
    try {
      const res = await fetchApi(`/api/v1/notifications/${item.id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ resolutionNotes: 'Executed via Enterprise Alert Console' }),
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === item.id
            ? { ...n, isRead: true, isResolved: true, resolvedAt: new Date().toISOString() }
            : n
        )
      );

      setToastMessage(res.message || `Action executed: ${item.title}`);
      setTimeout(() => setToastMessage(null), 4000);
      fetchNotifications();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resolve task';
      alert(msg);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetchApi('/api/v1/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setTelemetry((prev) => ({ ...prev, unread: 0, critical: 0, warnings: 0 }));
      setToastMessage('All authorized notifications marked as read.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to batch acknowledge alerts';
      alert(msg);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1">
            <ShieldAlert size={11} /> Critical
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1">
            <AlertTriangle size={11} /> Warning
          </span>
        );
      case 'SUCCESS':
        return (
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1">
            <CheckCircle2 size={11} /> Ready / Success
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1">
            <Info size={11} /> Info
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/pos"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Operations <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Action &amp; Escalation Bus</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Bell className="text-servora-core" size={24} />
            Operational Alert Inbox
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Role-scoped real-time notifications filtered strictly to your branch and operational clearances.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={telemetry.unread === 0}
            className="px-3.5 py-2 bg-servora-navy text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
          >
            <Check size={14} /> Acknowledge All ({telemetry.unread})
          </button>
          <button
            type="button"
            onClick={fetchNotifications}
            title="Refresh Feed"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. ENTERPRISE TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Action Required
            </span>
            <p className="text-xl font-bold font-mono text-servora-core mt-0.5">
              {telemetry.actionRequired} Tasks
            </p>
            <span className="text-[10px] text-servora-core font-medium">Pending Decisions</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Zap size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Critical Alerts
            </span>
            <p className="text-xl font-bold font-mono text-rose-700 mt-0.5">
              {telemetry.critical} Urgent
            </p>
            <span className="text-[10px] text-rose-600 font-medium">Immediate Attention</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Warnings
            </span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              {telemetry.warnings} Active
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Operational Tolerances</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Total Unread
            </span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {telemetry.unread}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">In your scope</span>
          </div>
          <div className="p-2.5 bg-slate-100 text-gray-700 rounded-xl">
            <Layers size={18} />
          </div>
        </div>
      </div>

      {/* 3. INBOX TABS & CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white text-servora-navy shadow-xs'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              All Alerts ({telemetry.total})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FYI_STREAM')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'FYI_STREAM'
                  ? 'bg-white text-servora-navy shadow-xs'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              <ChefHat size={13} className="text-emerald-600" />
              <span>Kitchen &amp; Activity Feed</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ACTION_REQUIRED')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ACTION_REQUIRED'
                  ? 'bg-white text-servora-navy shadow-xs'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              <Zap size={13} className="text-servora-core" />
              <span>Action Items ({telemetry.actionRequired})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('COMPLIANCE_AUDIT')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'COMPLIANCE_AUDIT'
                  ? 'bg-white text-servora-navy shadow-xs'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>Compliance &amp; Audit</span>
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-servora-navy cursor-pointer">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="rounded border-gray-300 text-servora-core focus:ring-servora-core w-4 h-4 cursor-pointer"
            />
            Show Unread Only
          </label>
        </div>

        {/* Secondary Filters (Module dropdown dynamically scoped to authorized modules) */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as SeverityFilter)}
              className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warnings Only</option>
              <option value="INFO">Informational Only</option>
              <option value="SUCCESS">Ready / Success Only</option>
            </select>

            {allowedModules.length > 1 && (
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Authorized Modules</option>
                {allowedModules.map((mod) => (
                  <option key={mod} value={mod}>
                    {MODULE_META[mod]?.label || mod.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={13}
            />
            <input
              type="text"
              placeholder="Search notifications or order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-servora-core w-44 sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* 4. NOTIFICATION INBOX STREAM */}
      <div className="space-y-3">
        {isLoading && notifications.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-xs text-servora-deepTeal animate-pulse">
            Querying authorized alert stream...
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck size={26} />
            </div>
            <div className="max-w-sm mx-auto space-y-1">
              <h3 className="text-sm font-bold text-servora-navy">No Active Notifications</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                You are all caught up. Authorized real-time updates for your branch and role will appear here automatically.
              </p>
            </div>
          </div>
        ) : (
          notifications.map((n) => {
            const ModuleIcon = MODULE_META[n.module]?.icon || SlidersHorizontal;
            const moduleLabel = MODULE_META[n.module]?.label || n.module.replace(/_/g, ' ');
            const hasAction = n.category === 'ACTION_REQUIRED' && !n.isResolved;

            return (
              <div
                key={n.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 ${
                  !n.isRead
                    ? 'border-servora-core/40 bg-blue-50/15 ring-1 ring-blue-100'
                    : 'border-gray-200'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(n.severity)}

                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-gray-700 px-2 py-0.5 rounded-md flex items-center gap-1 border border-gray-200">
                      <ModuleIcon size={11} className="text-servora-core" />
                      {moduleLabel}
                    </span>

                    {n.branchName && (
                      <span className="text-[10px] font-mono text-gray-400">
                        Outlet: {n.branchName}
                      </span>
                    )}

                    <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                      <Clock size={11} />{' '}
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      &bull; {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-servora-navy flex items-center gap-2">
                      {n.title}
                      {n.entityId && (
                        <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                          {n.entityId}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{n.detail}</p>
                  </div>

                  {n.isResolved && n.resolvedAt && (
                    <div className="text-[10px] text-emerald-700 font-mono flex items-center gap-1 pt-0.5">
                      <CheckCircle2 size={11} />
                      <span>
                        Resolved {new Date(n.resolvedAt).toLocaleDateString()} by{' '}
                        {n.resolvedByName || 'Operator'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actionable Decision Cockpit */}
                <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100">
                  {n.actionUrl && (
                    <Link
                      href={n.actionUrl}
                      className="px-3 py-2 bg-slate-50 border border-gray-200 text-servora-navy text-xs font-bold rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                    >
                      <span>Review Details</span>
                      <ExternalLink size={12} />
                    </Link>
                  )}

                  {hasAction ? (
                    <button
                      type="button"
                      onClick={() => handleResolveAction(n)}
                      className="px-3.5 py-2 bg-servora-core text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Zap size={13} /> {n.actionPayload?.buttonLabel || 'Execute Action'}
                    </button>
                  ) : !n.isRead ? (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(n.id)}
                      className="px-3.5 py-2 bg-slate-100 text-servora-navy text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check size={13} /> Acknowledge
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-gray-500 bg-slate-50 border border-gray-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-600" /> Acknowledged
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}