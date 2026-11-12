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
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface DashboardPayload {
  financials: {
    grossRevenue: number;
    netRevenue: number;
    totalTax: number;
    cateringLevy: number;
    discountTotal: number;
    averageOrderValue: number;
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
  loyalty: {
    enrolledMembersCount: number;
    activePointsPool: number;
  };
  salesTrend: { time: string; sales: number; orders: number }[];
  channelBreakdown: { type: string; revenue: number; orders: number }[];
  topProducts: { id: number; name: string; station: string; quantity: number; revenue: number }[];
  recentAudits: {
    id: number;
    action: string;
    module: string;
    entityType: string;
    actorName: string | null;
    createdAt: string;
  }[];
}

interface BranchRecord {
  id: number;
  name: string;
  code: string;
}

type PerspectiveTab = 'OVERVIEW' | 'OPERATIONS' | 'SUPPLY_CHAIN' | 'FINANCE_TREASURY' | 'DIRECTORY';

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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [timeframe, setTimeframe] = useState<string>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<PerspectiveTab>('OVERVIEW');
  const [isLoading, setIsLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('KES');
  const [businessName, setBusinessName] = useState('Workspace');

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('timeframe', timeframe);
      params.set('branchId', selectedBranchId);
      if (selectedChannel !== 'ALL') params.set('orderType', selectedChannel);
      if (timeframe === 'custom' && customStartDate) {
        params.set('startDate', customStartDate);
        if (customEndDate) params.set('endDate', customEndDate);
      }

      const [analyticsRes, branchRes, authRes] = await Promise.all([
        fetchApi(`/api/v1/analytics/dashboard?${params.toString()}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
        fetchApi('/api/v1/auth/me').catch(() => null),
      ]);

      if (analyticsRes?.data) setData(analyticsRes.data);
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
      if (authRes?.data?.business) {
        setCurrencySymbol(authRes.data.business.currency || 'KES');
        setBusinessName(authRes.data.business.name || 'Workspace');
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, customStartDate, customEndDate, selectedBranchId, selectedChannel]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  useEffect(() => {
    const handleBranchSwitched = (e: any) => {
      if (e.detail?.branchId) {
        setSelectedBranchId(String(e.detail.branchId));
      }
    };
    window.addEventListener('servora:branch-switched', handleBranchSwitched);
    return () => window.removeEventListener('servora:branch-switched', handleBranchSwitched);
  }, []);

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

  const totalChannelRevenue = useMemo(() => {
    return channelChartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [channelChartData]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE ACTION & MULTI-DIMENSIONAL FILTER BAR */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-servora-core bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-servora-core animate-pulse" />
              Executive Control Tower
            </span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500">{businessName}</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Enterprise Operations & Analytics</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Consolidated telemetry across POS, Shift Custody, Multi-Branch Stock, Procurement, Expenses, and KRA Compliance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <Link
            href="/pos"
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag size={14} /> Launch POS
          </Link>

          {/* Branch Filter */}
          <select
            value={selectedBranchId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedBranchId(val);
              if (typeof window !== 'undefined' && val !== 'ALL') {
                localStorage.setItem('servora_active_branch_id', val);
                window.dispatchEvent(
                  new CustomEvent('servora:branch-switched', { detail: { branchId: Number(val) } })
                );
              }
            }}
            className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="ALL">All Branch Locations ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          {/* Service Channel Filter */}
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="ALL">All Service Channels</option>
            <option value="Dine-In">Dine-In</option>
            <option value="Takeaway">Takeaway</option>
            <option value="Delivery">Delivery</option>
            <option value="Bar-Tab">Bar-Tab</option>
          </select>

          {/* Timeframe Selector */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Past 7 Days</option>
            <option value="30days">Past 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>

          {timeframe === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl text-xs">
              <Calendar size={13} className="text-servora-core" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent font-mono text-xs focus:outline-none"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent font-mono text-xs focus:outline-none"
              />
            </div>
          )}

          <button
            onClick={fetchDashboardData}
            title="Refresh Telemetry"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 2. FUNCTIONAL PERSPECTIVE TABS */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 pb-2 overflow-x-auto">
        {(
          [
            { id: 'OVERVIEW', label: 'Executive Overview', icon: Layers },
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
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${active
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

      {/* 3. TIER-1 FINANCIAL & OPERATIONAL KPI MATRIX */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Gross Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gross Turnover</span>
            <div className="p-2 bg-blue-50 text-servora-core rounded-xl">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <span className="text-lg font-bold font-mono text-servora-navy block truncate">
              {currencySymbol} {(data?.financials.grossRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-gray-500 font-mono block">
              Net: {currencySymbol} {(data?.financials.netRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-500">
            <span>Avg Ticket:</span>
            <span className="font-mono font-bold text-servora-navy">
              {currencySymbol} {(data?.financials.averageOrderValue || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Tax & Fiscal Compliance */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tax & Levies</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Receipt size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <span className="text-lg font-bold font-mono text-emerald-700 block truncate">
              {currencySymbol}{' '}
              {((data?.financials.totalTax || 0) + (data?.financials.cateringLevy || 0)).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
            <span className="text-[11px] text-gray-500 font-mono block">
              VAT: {(data?.financials.totalTax || 0).toLocaleString()} &bull; Levy:{' '}
              {(data?.financials.cateringLevy || 0).toLocaleString()}
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-500">
            <span>eTIMS Signed:</span>
            <span className="font-mono font-bold text-emerald-600">{data?.treasury.etimsFiscalizedCount || 0}</span>
          </div>
        </div>

        {/* Orders & Kitchen Line */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order Volume</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ChefHat size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <span className="text-lg font-bold font-mono text-servora-navy block">
              {data?.orders.totalOrders || 0} Total Orders
            </span>
            <span className="text-[11px] text-amber-700 font-bold block">
              {data?.orders.kitchenQueue || 0} In Kitchen Queue
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-500">
            <span>Completed:</span>
            <span className="font-mono font-bold text-servora-navy">{data?.orders.completedOrders || 0}</span>
          </div>
        </div>

        {/* Active Cash Custody & Shifts */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Tills</span>
            <div className="p-2 bg-blue-50 text-servora-core rounded-xl">
              <Scale size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <span className="text-lg font-bold font-mono text-servora-core block truncate">
              {currencySymbol} {(data?.treasury.expectedClosing || 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-gray-500 block">
              {data?.treasury.openShiftsCount || 0} Open Shifts &bull; {data?.treasury.activeDrawersCount || 0} Drawers
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-500">
            <span>Net Drift:</span>
            <span
              className={`font-mono font-bold ${(data?.treasury.netShiftVariance || 0) < 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
            >
              {currencySymbol} {(data?.treasury.netShiftVariance || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Inventory Holdings */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stock Valuation</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Package size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <span className="text-lg font-bold font-mono text-servora-navy block truncate">
              {currencySymbol} {(data?.inventory.totalValuation || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] text-rose-600 font-bold block">
              {data?.inventory.depletedItemsCount || 0} Low &bull; {data?.inventory.outOfStockCount || 0} Out
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-500">
            <span>Expiring Batches:</span>
            <span className="font-mono font-bold text-rose-600">{data?.inventory.expiringBatchesCount || 0}</span>
          </div>
        </div>

        {/* CRM & Loyalty Engagement */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">CRM & Loyalty</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Award size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <span className="text-lg font-bold font-mono text-servora-navy block truncate">
              {(data?.loyalty?.activePointsPool || 0).toLocaleString()} pts
            </span>
            <span className="text-[11px] text-gray-500 block">
              {data?.loyalty?.enrolledMembersCount || 0} Enrolled Members
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-500">
            <span>Floor Seated:</span>
            <span className="font-mono font-bold text-purple-700">{data?.floorPlan.utilizationRate || 0}%</span>
          </div>
        </div>
      </div>

      {/* 4. VISUAL ANALYTICAL CHARTS (HOURLY/DAILY REVENUE, CHANNEL MIX, TOP ITEMS) */}
      {(activeTab === 'OVERVIEW' || activeTab === 'FINANCE_TREASURY') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Revenue Velocity Area Chart */}
          <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-sm font-bold text-servora-navy">Revenue & Ticket Velocity</h2>
                <p className="text-[11px] text-gray-400">Trading volume and throughput distribution</p>
              </div>
              <Link href="/reports/sales" className="text-[11px] font-bold text-servora-core hover:underline flex items-center gap-1">
                View Ledger <ArrowRight size={12} />
              </Link>
            </div>

            <div className="h-64 w-full">
              {!data?.salesTrend || data.salesTrend.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  <TrendingUp size={28} className="mb-2 opacity-30 text-servora-navy" />
                  <p className="text-xs font-semibold">No sales recorded for this timeframe</p>
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
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
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
                      formatter={(value: any) => [`${currencySymbol} ${Number(value).toLocaleString()}`, 'Revenue']}
                    />
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
              <p className="text-[11px] text-gray-400 mb-2">Dine-In, Takeaway, and 3PL Deliveries</p>

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
                        <Tooltip formatter={(val: any) => [`${currencySymbol} ${Number(val).toLocaleString()}`, 'Revenue']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Total</span>
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
                const percent = totalChannelRevenue > 0 ? Math.round((c.value / totalChannelRevenue) * 100) : 0;
                return (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
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
                  <p className="text-[11px] text-gray-400">Ranked by revenue contribution</p>
                </div>
                <Link href="/menu" className="text-[11px] font-bold text-servora-core hover:underline">
                  Menu &rarr;
                </Link>
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
                          <p className="text-[10px] text-gray-400">{item.quantity} sold &bull; {item.station}</p>
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
              <span className="font-bold text-rose-600 font-mono">{data?.floorPlan.items86edCount || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. DOMAIN OPERATIONAL HUBS */}
      {(activeTab === 'OVERVIEW' || activeTab === 'OPERATIONS') && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
                <UtensilsCrossed size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-servora-navy">Front-of-House & Culinary Command</h2>
                <p className="text-[11px] text-gray-400">Live floor seating, order pipeline, KDS tickets, and dispatch tracking</p>
              </div>
            </div>
            <Link href="/orders" className="text-xs font-bold text-servora-core hover:underline">
              Orders Ledger &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <Link href="/tables" className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-gray-200 transition-colors">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Floor Tables & Seating</span>
              <span className="text-base font-bold text-servora-navy mt-1 block">
                {data?.floorPlan.occupiedTables || 0} Occupied / {data?.floorPlan.availableTables || 0} Free
              </span>
              <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
                {data?.floorPlan.cleaningTables || 0} Cleaning / Turning
              </span>
            </Link>

            <Link href="/kitchen" className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-gray-200 transition-colors">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Kitchen Display Console</span>
              <span className="text-base font-bold text-amber-700 mt-1 block">
                {data?.orders.kitchenQueue || 0} Active Tickets
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                {data?.orders.completedOrders || 0} Completed Today
              </span>
            </Link>

            <Link href="/reservations" className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-gray-200 transition-colors">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Reservations & Waitlist</span>
              <span className="text-base font-bold text-servora-navy mt-1 block">
                {data?.floorPlan.activeReservations || 0} Bookings Active
              </span>
              <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">
                {data?.floorPlan.waitlistCount || 0} Parties Waiting
              </span>
            </Link>

            <Link href="/orders/delivery" className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-gray-200 transition-colors">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">3PL Dispatch & Deliveries</span>
              <span className="text-base font-bold text-servora-navy mt-1 block">
                {data?.orders.activeDeliveries || 0} Couriers En Route
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                Uber Direct, Bolt & Private Fleet
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* 6. SUPPLY CHAIN & MATERIALS MANAGEMENT */}
      {(activeTab === 'OVERVIEW' || activeTab === 'SUPPLY_CHAIN') && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Warehouse size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-servora-navy">Materials Management & Procure-to-Pay</h2>
                <p className="text-[11px] text-gray-400">Inventory levels, reorder par levels, inter-branch consignments, and vendor POs</p>
              </div>
            </div>
            <Link href="/inventory" className="text-xs font-bold text-emerald-700 hover:underline">
              Inventory Ledger &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <Link href="/inventory/reorder" className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-gray-200 transition-colors">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Automated Stock Reorder</span>
              <span className="text-base font-bold text-rose-600 mt-1 block">
                {data?.inventory.depletedItemsCount || 0} Items Below Par
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                {data?.inventory.totalSkus || 0} Total Tracked SKUs
              </span>
            </Link>

            <Link href="/inventory/batches" className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-gray-200 transition-colors">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">FIFO Batches & Waste</span>
              <span className="text-base font-bold text-amber-700 mt-1 block">
                {data?.inventory.expiringBatchesCount || 0} Batches Expiring
              </span>
              <span className="text-[10px] text-rose-600 font-mono block mt-0.5">
                Waste: {currencySymbol} {(data?.inventory.wasteLossAmount || 0).toLocaleString()}
              </span>
            </Link>

            <Link href="/purchasing/requests" className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-gray-200 transition-colors">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Purchase Requisitions</span>
              <span className="text-base font-bold text-servora-navy mt-1 block">
                {data?.procurement.pendingRequisitions || 0} Pending Approvals
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                {data?.procurement.openPurchaseOrders || 0} Open Committed POs
              </span>
            </Link>

            <Link href="/inventory/transfers" className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-gray-200 transition-colors">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Inter-Branch Consignments</span>
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

      {/* 7. TREASURY, CASH CUSTODY, EXPENSES & KRA COMPLIANCE */}
      {(activeTab === 'OVERVIEW' || activeTab === 'FINANCE_TREASURY') && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Wallet size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-servora-navy">Treasury, Cash Custody & Governance</h2>
                <p className="text-[11px] text-gray-400">Cash drawer sessions, Z-report reconciliation, corporate expenses, GL adjustments, and eTIMS</p>
              </div>
            </div>
            <Link href="/cash-management/reconciliation" className="text-xs font-bold text-purple-700 hover:underline">
              EOD Z-Report Cockpit &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <Link href="/cash-management/drawers" className="p-3.5 rounded-xl bg-slate-50 hover:bg-purple-50/40 border border-gray-200 transition-colors">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Active Cash Till Registers</span>
              <span className="text-base font-bold text-servora-navy mt-1 block truncate">
                {data?.treasury.hasActiveSession
                  ? `${data.treasury.activeDrawersCount} Open (${data.treasury.drawerName})`
                  : 'No Active Session'}
              </span>
              <span className="text-[10px] font-mono text-emerald-700 font-bold block mt-0.5">
                Expected: {currencySymbol} {(data?.treasury.expectedClosing || 0).toLocaleString()}
              </span>
            </Link>

            <Link href="/finance/expenses" className="p-3.5 rounded-xl bg-slate-50 hover:bg-purple-50/40 border border-gray-200 transition-colors">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Corporate Expenses & Claims</span>
              <span className="text-base font-bold text-servora-navy mt-1 block">
                {data?.treasury.pendingExpensesCount || 0} Pending Approval
              </span>
              <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                Approved: {currencySymbol} {(data?.treasury.approvedExpensesTotal || 0).toLocaleString()}
              </span>
            </Link>

            <Link href="/finance/adjustments" className="p-3.5 rounded-xl bg-slate-50 hover:bg-purple-50/40 border border-gray-200 transition-colors">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">GL Adjustments (Maker-Checker)</span>
              <span className="text-base font-bold text-rose-600 mt-1 block">
                {data?.treasury.pendingAdjustmentsCount || 0} Vouchers Pending
              </span>
              <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                {currencySymbol} {(data?.treasury.pendingAdjustmentsAmount || 0).toLocaleString()} Awaiting Checker
              </span>
            </Link>

            <Link href="/finance/taxes" className="p-3.5 rounded-xl bg-slate-50 hover:bg-purple-50/40 border border-gray-200 transition-colors">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">KRA eTIMS & M-Pesa IPN</span>
              <span className="text-base font-bold text-servora-navy mt-1 block">
                {data?.treasury.etimsFiscalizedCount || 0} Invoices Signed
              </span>
              <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                {data?.treasury.unallocatedMpesaCount || 0} Unallocated M-Pesa
              </span>
            </Link>
          </div>

          {/* Live Enterprise Governance Audit Stream */}
          {data?.recentAudits && data.recentAudits.length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2">
                <Activity size={12} className="text-servora-core" /> Live Governance & Custody Audit Trail
              </span>
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
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. ENTERPRISE MODULE LAUNCHPAD (STANDARD ERP DIRECTORY) */}
      {activeTab === 'DIRECTORY' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-servora-navy">Enterprise System Module Directory</h2>
            <p className="text-xs text-gray-500">Access all functional domains and sub-modules across the enterprise</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Sales & Guest Service */}
            <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 space-y-2">
              <span className="font-bold text-servora-navy flex items-center gap-1.5 border-b border-gray-200 pb-2">
                <Store size={14} className="text-servora-core" /> Sales & Service
              </span>
              <div className="space-y-1.5 pt-1">
                <Link href="/pos" className="block hover:text-servora-core">Point of Sale Terminal</Link>
                <Link href="/orders" className="block hover:text-servora-core">Master Orders Ledger</Link>
                <Link href="/orders/open" className="block hover:text-servora-core">Open Dining Checks</Link>
                <Link href="/tables" className="block hover:text-servora-core">Floor Layout & Tables</Link>
                <Link href="/reservations" className="block hover:text-servora-core">Guest Reservations</Link>
                <Link href="/orders/delivery" className="block hover:text-servora-core">Dispatch & Delivery</Link>
              </div>
            </div>

            {/* Culinary & Kitchen */}
            <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 space-y-2">
              <span className="font-bold text-servora-navy flex items-center gap-1.5 border-b border-gray-200 pb-2">
                <ChefHat size={14} className="text-amber-600" /> Kitchen & Recipes
              </span>
              <div className="space-y-1.5 pt-1">
                <Link href="/kitchen" className="block hover:text-servora-core">Kitchen Display (KDS)</Link>
                <Link href="/kitchen/stations" className="block hover:text-servora-core">Prep Stations</Link>
                <Link href="/menu" className="block hover:text-servora-core">Menu Master Catalog</Link>
                <Link href="/menu/recipes" className="block hover:text-servora-core">Standard Recipe BOM</Link>
                <Link href="/menu/pricing" className="block hover:text-servora-core">Dynamic Pricing</Link>
                <Link href="/menu/availability" className="block hover:text-servora-core">86 List & Availability</Link>
              </div>
            </div>

            {/* Supply Chain & Purchasing */}
            <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 space-y-2">
              <span className="font-bold text-servora-navy flex items-center gap-1.5 border-b border-gray-200 pb-2">
                <Package size={14} className="text-emerald-600" /> Supply Chain
              </span>
              <div className="space-y-1.5 pt-1">
                <Link href="/inventory" className="block hover:text-servora-core">Stock Valuation</Link>
                <Link href="/inventory/items" className="block hover:text-servora-core">Master Raw SKUs</Link>
                <Link href="/inventory/transfers" className="block hover:text-servora-core">Inter-Branch Consignments</Link>
                <Link href="/inventory/counts" className="block hover:text-servora-core">Physical Cycle Counts</Link>
                <Link href="/purchasing/orders" className="block hover:text-servora-core">Purchase Orders</Link>
                <Link href="/suppliers" className="block hover:text-servora-core">Vendor Directory</Link>
              </div>
            </div>

            {/* Treasury & Governance */}
            <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 space-y-2">
              <span className="font-bold text-servora-navy flex items-center gap-1.5 border-b border-gray-200 pb-2">
                <ShieldCheck size={14} className="text-purple-600" /> Governance & Finance
              </span>
              <div className="space-y-1.5 pt-1">
                <Link href="/cash-management/drawers" className="block hover:text-servora-core">POS Cash Drawers</Link>
                <Link href="/cash-management/shifts" className="block hover:text-servora-core">Cashier Shift Custody</Link>
                <Link href="/cash-management/reconciliation" className="block hover:text-servora-core">EOD Z-Report Reconciliation</Link>
                <Link href="/finance/expenses" className="block hover:text-servora-core">Corporate Expenses</Link>
                <Link href="/finance/adjustments" className="block hover:text-servora-core">GL Variance Adjustments</Link>
                <Link href="/settings/branches" className="block hover:text-servora-core">Multi-Location Branches</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}