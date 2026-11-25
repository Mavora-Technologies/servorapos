// apps/web/app/(dashboard)/dashboard/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  UtensilsCrossed,
  Store,
  Receipt,
  ShieldCheck,
  ChevronRight,
  Wallet,
  RefreshCw,
  ChefHat,
  ArrowRight,
  Package,
  Warehouse,
  Sparkles,
  Layers,
  Award,
  Scale,
  Calendar,
  Activity,
  Users,
  Building2,
  CreditCard,
  WifiOff,
  RotateCcw,
  AlertTriangle,
  Percent,
  GitCompareArrows,
} from 'lucide-react';
import { fetchApi, ApiError } from '@/lib/api';
import { canAccessRoute } from '@/lib/rbac';

type CompareMode = 'NONE' | 'PREVIOUS_PERIOD' | 'PREVIOUS_YEAR' | 'PRESET' | 'CUSTOM';

interface StaffSalesRow {
  staffId: number;
  staffName: string;
  role: string;
  ordersCount: number;
  grossRevenue: number;
  netRevenue: number;
  averageTicketValue: number;
  discountTotal: number;
  discountRate: number;
}

interface BranchComparisonRow {
  branchId: number;
  branchName: string;
  branchCode: string;
  ordersCount: number;
  grossRevenue: number;
  netRevenue: number;
  averageOrderValue: number;
  discountTotal: number;
}

interface DashboardComparison {
  mode: CompareMode;
  label: string;
  periodStart: string;
  periodEnd: string;
  previous: {
    grossRevenue: number;
    netRevenue: number;
    totalCogs: number;
    grossProfit: number;
    grossMarginPercent: number;
    totalOrders: number;
    averageOrderValue: number;
    discountTotal: number;
  };
  deltas: {
    grossRevenuePct: number | null;
    netRevenuePct: number | null;
    grossMarginPts: number;
    ordersPct: number | null;
    aovPct: number | null;
    discountPct: number | null;
  };
}

interface DashboardPayload {
  period?: {
    timeframe: string;
    start: string;
    end: string;
    granularity: 'hour' | 'day' | 'month';
  };
  comparison: DashboardComparison | null;
  financials: {
    grossRevenue: number;
    netRevenue: number;
    totalTax: number;
    cateringLevy: number;
    discountTotal: number;
    averageOrderValue: number;
    totalCogs: number;
    grossProfit: number;
    grossMarginPercent: number;
  };
  orders: {
    totalOrders: number;
    completedOrders: number;
    kitchenQueue: number;
    cancelledOrders: number;
    activeDeliveries: number;
  };
  floorPlan: {
    totalSeats: number;
    occupiedSeats: number;
    utilizationRate: number;
    availableTables: number;
    occupiedTables: number;
    reservedTables: number;
    cleaningTables: number;
    activeReservations: number;
    waitlistCount: number;
    items86edCount: number;
  };
  inventory: {
    totalSkus: number;
    totalValuation: number;
    depletedItemsCount: number;
    outOfStockCount: number;
    expiringBatchesCount: number;
    wasteLossAmount: number;
    wasteIncidentsCount: number;
    activeTransfersCount: number;
    openStockCounts: number;
  };
  procurement: {
    pendingRequisitions: number;
    openPurchaseOrders: number;
    openPoCommitment: number;
    unpaidInvoicesCount: number;
    accountsPayableBalance: number;
    pendingSupplierReturns: number;
  };
  treasury: {
    hasActiveSession: boolean;
    activeDrawersCount: number;
    drawerName: string | null;
    openingFloat: number;
    expectedClosing: number;
    openShiftsCount: number;
    closedShiftsCount: number;
    netShiftVariance: number;
    pendingExpensesCount: number;
    approvedExpensesTotal: number;
    pendingAdjustmentsCount: number;
    pendingAdjustmentsAmount: number;
    unallocatedMpesaCount: number;
    unallocatedMpesaAmount: number;
    etimsFiscalizedCount: number;
    etimsPendingCount: number;
    tenderBreakdown: { method: string; amount: number }[];
  };
  offline: {
    batchesCount: number;
    reconciledOrders: number;
    conflictsCount: number;
    avgLatencyMs: number;
    lastSyncAt: string | null;
  };
  loyalty: {
    enrolledMembersCount: number;
    activePointsPool: number;
  };
  salesTrend: {
    time: string;
    sales: number;
    orders: number;
    previousSales?: number;
    previousOrders?: number;
    previousTime?: string;
  }[];
  channelBreakdown: { type: string; revenue: number; orders: number }[];
  topProducts: {
    id: number;
    name: string;
    station: string;
    quantity: number;
    revenue: number;
    marginPercent: number;
  }[];
  staffPerformance: StaffSalesRow[];
  branchComparison: BranchComparisonRow[];
  filterOptions: {
    staff: { id: number; name: string; role: string }[];
    branches: { id: number; name: string; code: string }[];
    channels: string[];
    paymentMethods: string[];
  };
  recentAudits: {
    id: number;
    action: string;
    module: string;
    entityType: string;
    actorName: string | null;
    createdAt: string;
  }[];
}

type PerspectiveTab =
  | 'OVERVIEW'
  | 'WORKFORCE_BRANCHES'
  | 'OPERATIONS'
  | 'SUPPLY_CHAIN'
  | 'FINANCE_TREASURY'
  | 'DIRECTORY';

const CHANNEL_COLORS: Record<string, string> = {
  'Dine-In': '#2563EB',
  'Standard Dining Room': '#2563EB',
  Takeaway: '#059669',
  'Express Counter & Takeaway': '#059669',
  Delivery: '#7C3AED',
  'Delivery & 3PL Logistics': '#7C3AED',
  'Bar-Tab': '#D97706',
  'Lounge & Bar Tabs': '#D97706',
};

function DeltaBadge({
  value,
  suffix = '%',
  invertColors = false,
}: {
  value: number | null | undefined;
  suffix?: string;
  invertColors?: boolean;
}) {
  if (value === undefined) return null;
  if (value === null) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 text-servora-core">
        New
      </span>
    );
  }
  const isPositive = value > 0;
  const isZero = value === 0;
  const isGood = invertColors ? !isPositive : isPositive;

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
        isZero
          ? 'bg-gray-100 text-gray-500'
          : isGood
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-rose-50 text-rose-700'
      }`}
    >
      {!isZero && (isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />)}
      {isPositive ? '+' : ''}
      {value}
      {suffix}
    </span>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [timeframe, setTimeframe] = useState<string>('today');
  const [compareSelection, setCompareSelection] = useState<string>('PREVIOUS_PERIOD');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [compareStartDate, setCompareStartDate] = useState<string>('');
  const [compareEndDate, setCompareEndDate] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<PerspectiveTab>('OVERVIEW');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const [currencySymbol, setCurrencySymbol] = useState('KES');
  const [businessName, setBusinessName] = useState('Workspace');
  const [userPermissions, setUserPermissions] = useState<string[] | undefined>(undefined);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);

  // Hydrate business & RBAC context from cached workspace immediately
  useEffect(() => {
    try {
      const cached = localStorage.getItem('servora_cached_workspace');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.business?.name) setBusinessName(parsed.business.name);
        if (parsed?.business?.currency) setCurrencySymbol(parsed.business.currency);
        if (parsed?.user?.permissions) setUserPermissions(parsed.user.permissions);
        if (parsed?.user?.role) setUserRole(parsed.user.role);
      }
    } catch {
      // Ignore malformed cache
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setIsLoading(false);
      return;
    }

    if (timeframe === 'custom' && !customStartDate) return;
    if (compareSelection === 'CUSTOM' && !compareStartDate) return;

    try {
      setIsLoading(true);
      setLoadError(null);

      const params = new URLSearchParams();
      params.set('timeframe', timeframe);
      params.set('branchId', selectedBranchId);

      if (compareSelection.startsWith('PRESET:')) {
        params.set('compareMode', 'PRESET');
        params.set('compareTimeframe', compareSelection.replace('PRESET:', ''));
      } else if (compareSelection === 'CUSTOM') {
        params.set('compareMode', 'CUSTOM');
        params.set('compareStartDate', compareStartDate);
        if (compareEndDate) params.set('compareEndDate', compareEndDate);
      } else {
        params.set('compareMode', compareSelection);
      }

      if (selectedStaffId !== 'ALL') params.set('staffId', selectedStaffId);
      if (selectedChannel !== 'ALL') params.set('orderType', selectedChannel);
      if (selectedPaymentMethod !== 'ALL') params.set('paymentMethod', selectedPaymentMethod);
      if (timeframe === 'custom' && customStartDate) {
        params.set('startDate', customStartDate);
        if (customEndDate) params.set('endDate', customEndDate);
      }

      const [analyticsRes, authRes] = await Promise.all([
        fetchApi(`/api/v1/analytics/dashboard?${params.toString()}`),
        fetchApi('/api/v1/auth/me').catch(() => null),
      ]);

      if (analyticsRes?.data) {
        setData(analyticsRes.data);
      }
      if (authRes?.data) {
        if (authRes.data.business?.currency) setCurrencySymbol(authRes.data.business.currency);
        if (authRes.data.business?.name) setBusinessName(authRes.data.business.name);
        if (authRes.data.user?.permissions) setUserPermissions(authRes.data.user.permissions);
        if (authRes.data.user?.role) setUserRole(authRes.data.user.role);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.isNetworkError || err.status === 0)) {
        setIsOnline(false);
        return;
      }
      setLoadError(err instanceof Error ? err.message : 'Failed to load dashboard telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [
    timeframe,
    compareSelection,
    customStartDate,
    customEndDate,
    compareStartDate,
    compareEndDate,
    selectedBranchId,
    selectedStaffId,
    selectedChannel,
    selectedPaymentMethod,
  ]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const onOnline = () => {
      setIsOnline(true);
      void fetchDashboardData();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [fetchDashboardData]);

  const hasActiveFilters =
    selectedBranchId !== 'ALL' ||
    selectedStaffId !== 'ALL' ||
    selectedChannel !== 'ALL' ||
    selectedPaymentMethod !== 'ALL' ||
    timeframe !== 'today' ||
    compareSelection !== 'PREVIOUS_PERIOD';

  const handleResetFilters = () => {
    setSelectedBranchId('ALL');
    setSelectedStaffId('ALL');
    setSelectedChannel('ALL');
    setSelectedPaymentMethod('ALL');
    setTimeframe('today');
    setCompareSelection('PREVIOUS_PERIOD');
    setCustomStartDate('');
    setCustomEndDate('');
    setCompareStartDate('');
    setCompareEndDate('');
  };

  const channelChartData = useMemo(() => {
    if (!data?.channelBreakdown) return [];
    const fallbackPalette = ['#2563EB', '#059669', '#7C3AED', '#D97706', '#0891B2'];
    return data.channelBreakdown.map((c, idx) => ({
      name: c.type,
      value: c.revenue,
      orders: c.orders,
      color: CHANNEL_COLORS[c.type] || fallbackPalette[idx % fallbackPalette.length],
    }));
  }, [data?.channelBreakdown]);

  const totalChannelRevenue = useMemo(
    () => channelChartData.reduce((acc, curr) => acc + curr.value, 0),
    [channelChartData]
  );

  const branches = data?.filterOptions.branches ?? [];
  const staffOptions = data?.filterOptions.staff ?? [];
  const channelOptions = data?.filterOptions.channels ?? [];
  const paymentMethodOptions = data?.filterOptions.paymentMethods ?? [];

  const totalBranchGross = useMemo(
    () => (data?.branchComparison ?? []).reduce((s, b) => s + b.grossRevenue, 0),
    [data?.branchComparison]
  );

  const comp = data?.comparison ?? null;
  const canOpen = (href: string) => canAccessRoute(href, userPermissions, userRole);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE ACTION & MULTI-DIMENSIONAL FILTER BAR */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-servora-core bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-servora-core animate-pulse" />
                Executive Control Tower
              </span>
              <ChevronRight size={12} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-500">{businessName}</span>
              {comp && (
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                  {comp.label}
                </span>
              )}
              {!isOnline && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  <WifiOff size={10} /> Offline Snapshot
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-servora-navy">
              Enterprise Operations &amp; Multi-Branch Analytics
            </h1>
            <p className="text-xs text-servora-deepTeal mt-0.5">
              Real-time gross margin, period-over-period comparisons, staff sales attribution, and branch performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canOpen('/pos') && (
              <Link
                href="/pos"
                className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <ShoppingBag size={14} /> Launch POS
              </Link>
            )}
            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={isLoading || !isOnline}
              title="Refresh Telemetry"
              className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-xs font-bold text-servora-navy transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin text-servora-core' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Multi-Dimensional Filter Controls */}
        <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
          {/* Branch Filter (independent analytics slice — does not remount layout) */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
            <Building2 size={13} className="text-servora-core shrink-0" />
            <select
              aria-label="Filter by branch"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Authorized Branches ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Staff Operator Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
            <Users size={13} className="text-purple-600 shrink-0" />
            <select
              aria-label="Filter by staff operator"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer max-w-[180px]"
            >
              <option value="ALL">All Staff Operators</option>
              {staffOptions.map((st) => (
                <option key={st.id} value={String(st.id)}>
                  {st.name} ({st.role})
                </option>
              ))}
            </select>
          </div>

          {/* Service Channel Filter */}
          <select
            aria-label="Filter by service channel"
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="ALL">All Service Channels</option>
            {channelOptions.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>

          {/* Payment Tender Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
            <CreditCard size={13} className="text-emerald-600 shrink-0" />
            <select
              aria-label="Filter by payment tender"
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Tenders</option>
              {paymentMethodOptions.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>

          {/* Duration Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
            <Calendar size={13} className="text-servora-core shrink-0" />
            <select
              aria-label="Filter by duration"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week (Mon–Now)</option>
              <option value="last_week">Last Week</option>
              <option value="7days">Past 7 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="30days">Past 30 Days</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="last_year">Last Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Flexible Period Comparison Selector */}
          <div className="flex items-center gap-1.5 bg-purple-50/70 border border-purple-200 px-2.5 py-1.5 rounded-xl">
            <GitCompareArrows size={13} className="text-purple-700 shrink-0" />
            <select
              aria-label="Compare against period"
              value={compareSelection}
              onChange={(e) => setCompareSelection(e.target.value)}
              className="bg-transparent text-xs font-bold text-purple-900 focus:outline-none cursor-pointer"
            >
              <optgroup label="Automatic Comparison">
                <option value="PREVIOUS_PERIOD">Compare: Previous Period (Auto)</option>
                <option value="PREVIOUS_YEAR">Compare: Same Period Last Year (YoY)</option>
                <option value="NONE">No Comparison</option>
              </optgroup>
              <optgroup label="Compare Against Specific Period">
                <option value="PRESET:today">vs Today</option>
                <option value="PRESET:yesterday">vs Yesterday</option>
                <option value="PRESET:this_week">vs This Week</option>
                <option value="PRESET:last_week">vs Last Week</option>
                <option value="PRESET:7days">vs Past 7 Days</option>
                <option value="PRESET:this_month">vs This Month</option>
                <option value="PRESET:last_month">vs Last Month</option>
                <option value="PRESET:30days">vs Past 30 Days</option>
                <option value="PRESET:this_quarter">vs This Quarter</option>
                <option value="PRESET:this_year">vs Year to Date</option>
                <option value="PRESET:last_year">vs Last Year</option>
              </optgroup>
              <optgroup label="Custom Range">
                <option value="CUSTOM">vs Custom Date Range...</option>
              </optgroup>
            </select>
          </div>

          {timeframe === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1 rounded-xl text-xs">
              <input
                type="date"
                aria-label="Start date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent font-mono text-xs focus:outline-none"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                aria-label="End date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent font-mono text-xs focus:outline-none"
              />
            </div>
          )}

          {compareSelection === 'CUSTOM' && (
            <div className="flex items-center gap-1.5 bg-purple-50/50 border border-purple-200 px-2.5 py-1 rounded-xl text-xs">
              <span className="text-[10px] font-bold uppercase text-purple-700">vs</span>
              <input
                type="date"
                aria-label="Comparison start date"
                value={compareStartDate}
                onChange={(e) => setCompareStartDate(e.target.value)}
                className="bg-transparent font-mono text-xs text-purple-950 focus:outline-none"
              />
              <span className="text-purple-400">to</span>
              <input
                type="date"
                aria-label="Comparison end date"
                value={compareEndDate}
                onChange={(e) => setCompareEndDate(e.target.value)}
                className="bg-transparent font-mono text-xs text-purple-950 focus:outline-none"
              />
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-rose-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. FUNCTIONAL PERSPECTIVE TABS */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 pb-2 overflow-x-auto">
        {(
          [
            { id: 'OVERVIEW', label: 'Executive Overview', icon: Layers },
            { id: 'WORKFORCE_BRANCHES', label: 'Staff Sales & Branches', icon: Users },
            { id: 'OPERATIONS', label: 'Hospitality & Kitchen', icon: UtensilsCrossed },
            { id: 'SUPPLY_CHAIN', label: 'Inventory & Procurement', icon: Package },
            { id: 'FINANCE_TREASURY', label: 'Treasury & Compliance', icon: Wallet },
            { id: 'DIRECTORY', label: 'Module Directory', icon: Sparkles },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-servora-navy text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TIER-1 FINANCIAL, MARGIN & COMPARISON KPI MATRIX */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Gross Revenue + Comparison */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Gross Turnover
            </span>
            {comp ? (
              <DeltaBadge value={comp.deltas.grossRevenuePct} />
            ) : (
              <div className="p-1.5 bg-blue-50 text-servora-core rounded-lg">
                <TrendingUp size={14} />
              </div>
            )}
          </div>
          <div className="my-1.5">
            <span className="text-lg font-bold font-mono text-servora-navy block truncate">
              {currencySymbol}{' '}
              {(data?.financials.grossRevenue || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
            <span className="text-[11px] text-gray-500 font-mono block truncate">
              {comp
                ? `Prior: ${currencySymbol} ${comp.previous.grossRevenue.toLocaleString()}`
                : `Net: ${currencySymbol} ${(data?.financials.netRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-500">
            <span>Avg Ticket:</span>
            <span className="font-mono font-bold text-servora-navy flex items-center gap-1">
              {currencySymbol} {(data?.financials.averageOrderValue || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Gross Margin & COGS + Comparison */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Gross Margin
            </span>
            {comp ? (
              <DeltaBadge value={comp.deltas.grossMarginPts} suffix="pp" />
            ) : (
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <Percent size={14} />
              </div>
            )}
          </div>
          <div className="my-1.5">
            <span
              className={`text-lg font-bold font-mono block ${
                (data?.financials.grossMarginPercent || 0) >= 65
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {data?.financials.grossMarginPercent || 0}%
            </span>
            <span className="text-[11px] text-gray-500 font-mono block truncate">
              COGS: {currencySymbol} {(data?.financials.totalCogs || 0).toLocaleString()}
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-500">
            <span>Discounts:</span>
            <span className="font-mono font-bold text-amber-700">
              {currencySymbol} {(data?.financials.discountTotal || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Tax & Fiscal Compliance */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Tax &amp; Levies
            </span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Receipt size={14} />
            </div>
          </div>
          <div className="my-1.5">
            <span className="text-lg font-bold font-mono text-emerald-700 block truncate">
              {currencySymbol}{' '}
              {((data?.financials.totalTax || 0) + (data?.financials.cateringLevy || 0)).toLocaleString(
                undefined,
                { minimumFractionDigits: 2 }
              )}
            </span>
            <span className="text-[11px] text-gray-500 font-mono block truncate">
              VAT: {(data?.financials.totalTax || 0).toLocaleString()} &bull; Levy:{' '}
              {(data?.financials.cateringLevy || 0).toLocaleString()}
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-500">
            <span>eTIMS Signed:</span>
            <span className="font-mono font-bold text-emerald-600">
              {data?.treasury.etimsFiscalizedCount || 0}
            </span>
          </div>
        </div>

        {/* Orders & Kitchen Line + Comparison */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Order Volume
            </span>
            {comp ? (
              <DeltaBadge value={comp.deltas.ordersPct} />
            ) : (
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <ChefHat size={14} />
              </div>
            )}
          </div>
          <div className="my-1.5">
            <span className="text-lg font-bold font-mono text-servora-navy block">
              {data?.orders.totalOrders || 0} Orders
            </span>
            <span className="text-[11px] text-amber-700 font-bold block">
              {comp
                ? `Prior: ${comp.previous.totalOrders} orders`
                : `${data?.orders.kitchenQueue || 0} In Kitchen Queue`}
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-500">
            <span>Completed:</span>
            <span className="font-mono font-bold text-servora-navy">
              {data?.orders.completedOrders || 0}
            </span>
          </div>
        </div>

        {/* Active Cash Custody & Shifts */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Active Tills
            </span>
            <div className="p-1.5 bg-blue-50 text-servora-core rounded-lg">
              <Scale size={14} />
            </div>
          </div>
          <div className="my-1.5">
            <span className="text-lg font-bold font-mono text-servora-core block truncate">
              {currencySymbol} {(data?.treasury.expectedClosing || 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-gray-500 block">
              {data?.treasury.openShiftsCount || 0} Open Shifts &bull;{' '}
              {data?.treasury.activeDrawersCount || 0} Drawers
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-500">
            <span>Net Drift:</span>
            <span
              className={`font-mono font-bold ${
                (data?.treasury.netShiftVariance || 0) < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {currencySymbol} {(data?.treasury.netShiftVariance || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Inventory Holdings */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Stock Valuation
            </span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <Package size={14} />
            </div>
          </div>
          <div className="my-1.5">
            <span className="text-lg font-bold font-mono text-servora-navy block truncate">
              {currencySymbol}{' '}
              {(data?.inventory.totalValuation || 0).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </span>
            <span className="text-[11px] text-rose-600 font-bold block">
              {data?.inventory.depletedItemsCount || 0} Low &bull;{' '}
              {data?.inventory.outOfStockCount || 0} Out
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-500">
            <span>Expiring Batches:</span>
            <span className="font-mono font-bold text-rose-600">
              {data?.inventory.expiringBatchesCount || 0}
            </span>
          </div>
        </div>
      </div>

      {/* 4. VISUAL ANALYTICAL CHARTS WITH PERIOD COMPARISON OVERLAY */}
      {(activeTab === 'OVERVIEW' || activeTab === 'FINANCE_TREASURY') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Revenue Velocity Area Chart (Current vs Comparison) */}
          <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-sm font-bold text-servora-navy">
                  Revenue &amp; Ticket Velocity
                </h2>
                <p className="text-[11px] text-gray-400">
                  {comp
                    ? `Solid: Current Period • Dashed: ${comp.label}`
                    : 'Trading volume and throughput distribution'}
                </p>
              </div>
              {canOpen('/reports') && (
                <Link
                  href="/reports/sales"
                  className="text-[11px] font-bold text-servora-core hover:underline flex items-center gap-1"
                >
                  View Ledger <ArrowRight size={12} />
                </Link>
              )}
            </div>

            <div className="h-64 w-full">
              {!data?.salesTrend || data.salesTrend.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  <TrendingUp size={28} className="mb-2 opacity-30 text-servora-navy" />
                  <p className="text-xs font-semibold">No sales recorded for active filters</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.salesTrend}>
                    <defs>
                      <linearGradient id="colorSalesClean" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0554F4" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0554F4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#64748B' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      tickFormatter={(val) => `${val.toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        fontSize: '11px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      formatter={(value: unknown, name: unknown) => [
                        `${currencySymbol} ${Number(value).toLocaleString()}`,
                        name === 'previousSales' ? comp?.label || 'Comparison' : 'Current Revenue',
                      ]}
                    />
                    {comp && (
                      <Area
                        type="monotone"
                        dataKey="previousSales"
                        stroke="#94A3B8"
                        strokeWidth={1.75}
                        strokeDasharray="4 4"
                        fillOpacity={0}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#0554F4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSalesClean)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Omnichannel Mix (Donut Chart) */}
          <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-servora-navy">Channel Distribution</h2>
              <p className="text-[11px] text-gray-400 mb-2">
                Dine-In, Takeaway, and Delivery mix
              </p>

              <div className="h-44 w-full flex items-center justify-center relative">
                {channelChartData.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 italic">No channel data</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={channelChartData}
                          innerRadius={46}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {channelChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: unknown) => [
                            `${currencySymbol} ${Number(val).toLocaleString()}`,
                            'Revenue',
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                        Total
                      </span>
                      <span className="text-xs font-bold font-mono text-servora-navy">
                        {currencySymbol} {Math.round(totalChannelRevenue).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs">
              {channelChartData.map((c) => {
                const percent =
                  totalChannelRevenue > 0 ? Math.round((c.value / totalChannelRevenue) * 100) : 0;
                return (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="font-semibold text-servora-navy truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-gray-400">{percent}%</span>
                      <span className="font-mono font-bold text-servora-navy">
                        {currencySymbol} {c.value.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Selling Dishes Matrix */}
          <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="text-sm font-bold text-servora-navy">Top Menu Products</h2>
                  <p className="text-[11px] text-gray-400">Ranked by revenue &amp; margin</p>
                </div>
                {canOpen('/menu') && (
                  <Link
                    href="/menu"
                    className="text-[11px] font-bold text-servora-core hover:underline"
                  >
                    Menu &rarr;
                  </Link>
                )}
              </div>

              <div className="space-y-2">
                {!data?.topProducts || data.topProducts.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
                    No sales recorded
                  </div>
                ) : (
                  data.topProducts.slice(0, 5).map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-gray-100 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-servora-navy text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-servora-navy truncate">{item.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {item.quantity} sold &bull; {item.marginPercent}% GM
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-servora-core shrink-0 ml-2">
                        {currencySymbol} {item.revenue.toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2.5 border-t border-gray-100 flex justify-between items-center text-[11px]">
              <span className="text-gray-500">Unavailable (86ed) Dishes:</span>
              <span className="font-bold text-rose-600 font-mono">
                {data?.floorPlan.items86edCount || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. WORKFORCE SALES ATTRIBUTION & MULTI-BRANCH PERFORMANCE MATRIX */}
      {(activeTab === 'OVERVIEW' || activeTab === 'WORKFORCE_BRANCHES') && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Staff Sales Leaderboard */}
          <div className="xl:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Award size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-servora-navy">
                    Staff Sales Attribution Leaderboard
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Click any operator to filter the dashboard by their sales
                  </p>
                </div>
              </div>
              {canOpen('/staff/performance') && (
                <Link
                  href="/staff/performance"
                  className="text-xs font-bold text-servora-core hover:underline"
                >
                  HCM Reviews &rarr;
                </Link>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3">Operator</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">Gross Sales</th>
                    <th className="py-2.5 px-3 text-right">Avg Ticket</th>
                    <th className="py-2.5 px-3 text-right">Discount %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!data?.staffPerformance || data.staffPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                        No operator sales attributed in this period.
                      </td>
                    </tr>
                  ) : (
                    data.staffPerformance.map((st, idx) => {
                      const isFocused = selectedStaffId === String(st.staffId);
                      return (
                        <tr
                          key={st.staffId}
                          onClick={() =>
                            setSelectedStaffId(isFocused ? 'ALL' : String(st.staffId))
                          }
                          className={`cursor-pointer transition-colors ${
                            isFocused ? 'bg-blue-50/70' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-servora-navy text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-servora-navy block">
                                  {st.staffName}
                                </span>
                                <span className="text-[10px] font-mono text-gray-400 uppercase">
                                  {st.role}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-servora-navy">
                            {st.ordersCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-servora-core">
                            {currencySymbol} {st.grossRevenue.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-700">
                            {currencySymbol} {st.averageTicketValue.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                st.discountRate > 10
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {st.discountRate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Multi-Branch Performance Matrix */}
          <div className="xl:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-servora-navy">
                    Multi-Branch Performance Matrix
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Click an outlet to slice dashboard telemetry
                  </p>
                </div>
              </div>
              {canOpen('/settings/branches') && (
                <Link
                  href="/settings/branches"
                  className="text-xs font-bold text-servora-core hover:underline"
                >
                  Outlets &rarr;
                </Link>
              )}
            </div>

            <div className="space-y-2.5">
              {!data?.branchComparison || data.branchComparison.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 italic">
                  No authorized branches found.
                </div>
              ) : (
                data.branchComparison.map((br) => {
                  const sharePct =
                    totalBranchGross > 0
                      ? Math.round((br.grossRevenue / totalBranchGross) * 100)
                      : 0;
                  const isFocused = selectedBranchId === String(br.branchId);
                  return (
                    <button
                      key={br.branchId}
                      type="button"
                      onClick={() =>
                        setSelectedBranchId(isFocused ? 'ALL' : String(br.branchId))
                      }
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isFocused
                          ? 'bg-blue-50/70 border-servora-core/50 ring-1 ring-servora-core/20'
                          : 'bg-slate-50 border-gray-200 hover:bg-gray-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-servora-navy">{br.branchName}</span>
                          <span className="ml-1.5 text-[10px] font-mono text-gray-400">
                            {br.branchCode}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-servora-core">
                          {currencySymbol} {br.grossRevenue.toLocaleString()}
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-servora-core rounded-full"
                          style={{ width: `${sharePct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                        <span>
                          {br.ordersCount} orders &bull; ATV: {currencySymbol}{' '}
                          {br.averageOrderValue.toLocaleString()}
                        </span>
                        <span className="font-bold text-servora-navy">{sharePct}% share</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. FRONT-OF-HOUSE & CULINARY COMMAND */}
      {(activeTab === 'OVERVIEW' || activeTab === 'OPERATIONS') && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
                <UtensilsCrossed size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-servora-navy">
                  Front-of-House &amp; Culinary Command
                </h2>
                <p className="text-[11px] text-gray-400">
                  Live floor seating, order pipeline, KDS tickets, and dispatch tracking
                </p>
              </div>
            </div>
            {canOpen('/orders') && (
              <Link href="/orders" className="text-xs font-bold text-servora-core hover:underline">
                Orders Ledger &rarr;
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <Link
              href="/tables"
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Floor Tables &amp; Seating
              </span>
              <span className="text-base font-bold text-servora-navy mt-1 block">
                {data?.floorPlan.occupiedTables || 0} Occupied /{' '}
                {data?.floorPlan.availableTables || 0} Free
              </span>
              <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
                {data?.floorPlan.utilizationRate || 0}% Utilization &bull;{' '}
                {data?.floorPlan.cleaningTables || 0} Cleaning
              </span>
            </Link>

            <Link
              href="/kitchen"
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Kitchen Display Console
              </span>
              <span className="text-base font-bold text-amber-700 mt-1 block">
                {data?.orders.kitchenQueue || 0} Active Tickets
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                {data?.orders.completedOrders || 0} Completed in Period
              </span>
            </Link>

            <Link
              href="/reservations"
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Reservations &amp; Waitlist
              </span>
              <span className="text-base font-bold text-servora-navy mt-1 block">
                {data?.floorPlan.activeReservations || 0} Bookings Active
              </span>
              <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">
                {data?.floorPlan.waitlistCount || 0} Parties Waiting
              </span>
            </Link>

            <Link
              href="/orders/delivery"
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                3PL Dispatch &amp; Deliveries
              </span>
              <span className="text-base font-bold text-servora-navy mt-1 block">
                {data?.orders.activeDeliveries || 0} Couriers En Route
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                In-House Fleet &amp; Aggregators
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* 7. SUPPLY CHAIN & MATERIALS MANAGEMENT */}
      {(activeTab === 'OVERVIEW' || activeTab === 'SUPPLY_CHAIN') && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Warehouse size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-servora-navy">
                  Materials Management &amp; Procure-to-Pay
                </h2>
                <p className="text-[11px] text-gray-400">
                  Inventory par levels, FIFO batches, inter-branch consignments, and vendor POs
                </p>
              </div>
            </div>
            {canOpen('/inventory') && (
              <Link
                href="/inventory"
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Inventory Ledger &rarr;
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <Link
              href="/inventory/reorder"
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Automated Stock Reorder
              </span>
              <span className="text-base font-bold text-rose-600 mt-1 block">
                {data?.inventory.depletedItemsCount || 0} Items Below Par
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                {data?.inventory.totalSkus || 0} Total Tracked SKUs
              </span>
            </Link>

            <Link
              href="/inventory/batches"
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                FIFO Batches &amp; Waste
              </span>
              <span className="text-base font-bold text-amber-700 mt-1 block">
                {data?.inventory.expiringBatchesCount || 0} Batches Expiring
              </span>
              <span className="text-[10px] text-rose-600 font-mono block mt-0.5">
                Waste: {currencySymbol} {(data?.inventory.wasteLossAmount || 0).toLocaleString()}
              </span>
            </Link>

            <Link
              href="/purchasing/requests"
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Purchase Requisitions &amp; POs
              </span>
              <span className="text-base font-bold text-servora-navy mt-1 block">
                {data?.procurement.pendingRequisitions || 0} Pending Approvals
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                {data?.procurement.openPurchaseOrders || 0} Open POs ({currencySymbol}{' '}
                {(data?.procurement.openPoCommitment || 0).toLocaleString()})
              </span>
            </Link>

            <Link
              href="/inventory/transfers"
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Inter-Branch Consignments
              </span>
              <span className="text-base font-bold text-servora-navy mt-1 block">
                {data?.inventory.activeTransfersCount || 0} In-Transit Transfers
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                {data?.inventory.openStockCounts || 0} Open Stock Audits
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* 8. TREASURY, CASH CUSTODY, OFFLINE SYNC & KRA COMPLIANCE */}
      {(activeTab === 'OVERVIEW' || activeTab === 'FINANCE_TREASURY') && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Wallet size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-servora-navy">
                  Treasury, Cash Custody &amp; Resilience Governance
                </h2>
                <p className="text-[11px] text-gray-400">
                  Cash drawers, expenses, GL adjustments, KRA eTIMS, and offline sync reconciliation
                </p>
              </div>
            </div>
            {canOpen('/cash-management/reconciliation') && (
              <Link
                href="/cash-management/reconciliation"
                className="text-xs font-bold text-purple-700 hover:underline"
              >
                EOD Z-Report Cockpit &rarr;
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <Link
              href="/cash-management/drawers"
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-purple-50/40 border border-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Active Cash Tills
              </span>
              <span className="text-sm font-bold text-servora-navy mt-1 block truncate">
                {data?.treasury.hasActiveSession
                  ? `${data.treasury.activeDrawersCount} Open (${data.treasury.drawerName})`
                  : 'No Active Session'}
              </span>
              <span className="text-[10px] font-mono text-emerald-700 font-bold block mt-0.5">
                Expected: {currencySymbol} {(data?.treasury.expectedClosing || 0).toLocaleString()}
              </span>
            </Link>

            <Link
              href="/finance/expenses"
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-purple-50/40 border border-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Corporate Expenses
              </span>
              <span className="text-sm font-bold text-servora-navy mt-1 block">
                {data?.treasury.pendingExpensesCount || 0} Pending Approval
              </span>
              <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                Approved: {currencySymbol}{' '}
                {(data?.treasury.approvedExpensesTotal || 0).toLocaleString()}
              </span>
            </Link>

            <Link
              href="/finance/adjustments"
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-purple-50/40 border border-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                GL Adjustments
              </span>
              <span className="text-sm font-bold text-rose-600 mt-1 block">
                {data?.treasury.pendingAdjustmentsCount || 0} Awaiting Checker
              </span>
              <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                {currencySymbol} {(data?.treasury.pendingAdjustmentsAmount || 0).toLocaleString()}
              </span>
            </Link>

            <Link
              href="/finance/taxes"
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-purple-50/40 border border-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                KRA eTIMS &amp; M-Pesa
              </span>
              <span className="text-sm font-bold text-servora-navy mt-1 block">
                {data?.treasury.etimsFiscalizedCount || 0} Invoices Signed
              </span>
              <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                {data?.treasury.unallocatedMpesaCount || 0} Unallocated M-Pesa
              </span>
            </Link>

            <Link
              href="/settings/offline"
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Offline Sync Engine
              </span>
              <span className="text-sm font-bold text-servora-core mt-1 block">
                {data?.offline.reconciledOrders || 0} Orders Synced
              </span>
              <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                {data?.offline.conflictsCount || 0} Conflicts &bull;{' '}
                {data?.offline.avgLatencyMs || 0}ms avg
              </span>
            </Link>
          </div>

          {/* Live Enterprise Governance Audit Stream */}
          {data?.recentAudits && data.recentAudits.length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Activity size={12} className="text-servora-core" /> Live Governance &amp; Custody
                  Audit Trail
                </span>
                {canOpen('/settings/audit-logs') && (
                  <Link
                    href="/settings/audit-logs"
                    className="text-[11px] font-bold text-servora-core hover:underline"
                  >
                    Full Audit Ledger &rarr;
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                {data.recentAudits.map((log) => (
                  <div
                    key={log.id}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-gray-100 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-servora-navy block truncate">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-gray-500 truncate block">
                        {log.module} &bull; {log.actorName || 'System'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9. RBAC-FILTERED ENTERPRISE MODULE LAUNCHPAD */}
      {activeTab === 'DIRECTORY' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-servora-navy">
              Enterprise System Module Directory
            </h2>
            <p className="text-xs text-gray-500">
              Modules filtered strictly by your assigned RBAC security clearance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {[
              {
                title: 'Sales & Service',
                icon: Store,
                iconCls: 'text-servora-core',
                links: [
                  { href: '/pos', label: 'Point of Sale Terminal' },
                  { href: '/orders', label: 'Master Orders Ledger' },
                  { href: '/orders/open', label: 'Open Dining Checks' },
                  { href: '/tables', label: 'Floor Layout & Tables' },
                  { href: '/reservations', label: 'Guest Reservations' },
                  { href: '/orders/delivery', label: 'Dispatch & Delivery' },
                ],
              },
              {
                title: 'Kitchen & Recipes',
                icon: ChefHat,
                iconCls: 'text-amber-600',
                links: [
                  { href: '/kitchen', label: 'Kitchen Display (KDS)' },
                  { href: '/kitchen/stations', label: 'Prep Stations' },
                  { href: '/menu', label: 'Menu Master Catalog' },
                  { href: '/menu/recipes', label: 'Standard Recipe BOM' },
                  { href: '/menu/recipes/costing', label: 'Food Cost & Margin Matrix' },
                  { href: '/menu/availability', label: '86 List & Availability' },
                ],
              },
              {
                title: 'Supply Chain',
                icon: Package,
                iconCls: 'text-emerald-600',
                links: [
                  { href: '/inventory', label: 'Stock Valuation' },
                  { href: '/inventory/items', label: 'Master Raw SKUs' },
                  { href: '/inventory/transfers', label: 'Inter-Branch Consignments' },
                  { href: '/inventory/counts', label: 'Physical Cycle Counts' },
                  { href: '/purchasing/orders', label: 'Purchase Orders' },
                  { href: '/suppliers', label: 'Vendor Directory' },
                ],
              },
              {
                title: 'Governance & Finance',
                icon: ShieldCheck,
                iconCls: 'text-purple-600',
                links: [
                  { href: '/cash-management/drawers', label: 'POS Cash Drawers' },
                  { href: '/cash-management/shifts', label: 'Cashier Shift Custody' },
                  { href: '/cash-management/reconciliation', label: 'EOD Z-Report Reconciliation' },
                  { href: '/finance/expenses', label: 'Corporate Expenses' },
                  { href: '/settings/audit-logs', label: 'Audit Logs & Compliance' },
                  { href: '/settings/offline', label: 'Offline Sync & Resilience' },
                ],
              },
            ].map((section) => {
              const SectionIcon = section.icon;
              const visibleLinks = section.links.filter((l) => canOpen(l.href));
              if (visibleLinks.length === 0) return null;
              return (
                <div
                  key={section.title}
                  className="p-4 rounded-xl bg-slate-50 border border-gray-200 space-y-2"
                >
                  <span className="font-bold text-servora-navy flex items-center gap-1.5 border-b border-gray-200 pb-2">
                    <SectionIcon size={14} className={section.iconCls} /> {section.title}
                  </span>
                  <div className="space-y-1.5 pt-1">
                    {visibleLinks.map((l) => (
                      <Link key={l.href} href={l.href} className="block hover:text-servora-core">
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}