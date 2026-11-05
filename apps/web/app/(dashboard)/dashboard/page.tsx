'use client';

import { useEffect, useState, useMemo } from 'react';
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
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  AlertCircle,
  UtensilsCrossed,
  Building2,
  Store,
  Truck,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Users,
  Wallet,
  RefreshCw,
  ChefHat,
  ArrowRight,
  Package,
  Warehouse,
  Smartphone,
  FileText,
  CalendarDays,
  Sparkles,
  BrainCircuit,
  SlidersHorizontal,
  Boxes,
  ClipboardList,
  BookOpen,
  ContactRound,
  HandCoins,
  BadgePercent,
  Layers,
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
    drawerName: string | null;
    openingFloat: number;
    expectedClosing: number;
    unallocatedMpesaCount: number;
    unallocatedMpesaAmount: number;
    etimsFiscalizedCount: number;
    etimsPendingCount: number;
    tenderBreakdown: { method: string; amount: number }[];
  };
  salesTrend: { time: string; sales: number; orders: number }[];
  channelBreakdown: { type: string; revenue: number; orders: number }[];
  topProducts: { id: number; name: string; station: string; quantity: number; revenue: number }[];
  recentAudits: { id: number; action: string; module: string; entityType: string; createdAt: string }[];
}

interface BranchRecord {
  id: number;
  name: string;
  code: string;
}

type CockpitPerspective = 'ALL' | 'FRONT_OFFICE' | 'SUPPLY_CHAIN' | 'TREASURY_TAX' | 'LAUNCHPAD';

const CHANNEL_COLORS: Record<string, string> = {
  'Dine-In': '#0554F4',
  Takeaway: '#10B981',
  Delivery: '#8B5CF6',
  'Bar-Tab': '#F59E0B',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [timeframe, setTimeframe] = useState<string>('today');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [perspective, setPerspective] = useState<CockpitPerspective>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('KES');
  const [businessName, setBusinessName] = useState('Enterprise Workspace');

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [analyticsRes, branchRes, authRes] = await Promise.all([
        fetchApi(`/api/v1/analytics/dashboard?timeframe=${timeframe}&branchId=${selectedBranchId}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
        fetchApi('/api/v1/auth/me').catch(() => null),
      ]);

      if (analyticsRes?.data) {
        setData(analyticsRes.data);
      }
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
      if (authRes?.data?.business) {
        setCurrencySymbol(authRes.data.business.currency || 'KES');
        setBusinessName(authRes.data.business.name || 'Enterprise Workspace');
      }
    } catch (err: any) {
      console.error('Failed to load live dashboard analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [timeframe, selectedBranchId]);

  // Listen to global branch switch events from Sidebar/Header
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
    return data.channelBreakdown.map((c) => ({
      name: c.type,
      value: c.revenue,
      orders: c.orders,
      color: CHANNEL_COLORS[c.type] || '#64748B',
    }));
  }, [data?.channelBreakdown]);

  return (
    <div className="space-y-6 pb-8">
      {/* 1. TOP EXECUTIVE COMMAND & FILTER BAR */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-servora-core bg-blue-50 px-2 py-0.5 rounded-md">
                Servora Cockpit
              </span>
              <ChevronRight size={12} className="text-gray-400" />
              <span className="text-xs font-bold text-servora-navy">{businessName}</span>
            </div>
            <h1 className="text-xl font-bold text-servora-navy">
              360° Enterprise Operations & Financial Control Tower
            </h1>
            <p className="text-xs text-servora-deepTeal mt-0.5">
              Real-time database telemetry across POS, KDS, Floor Plan, Multi-Branch Inventory, P2P Procurement, M-Pesa Daraja, and KRA eTIMS.
            </p>
          </div>

          {/* Global Dimensional Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/pos"
              className="bg-servora-core text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5"
            >
              <ShoppingBag size={14} /> Launch POS [POS01]
            </Link>

            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-slate-50 border border-gray-200 text-servora-navy text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-servora-core"
            >
              <option value="ALL">All Branch Outlets</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>

            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-slate-50 border border-gray-200 text-servora-navy text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-servora-core"
            >
              <option value="today">Today&apos;s Trading</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days Rolling</option>
              <option value="30days">Last 30 Days (Monthly)</option>
            </select>

            <button
              onClick={fetchDashboardData}
              title="Refresh Live Database Telemetry"
              className="p-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl hover:bg-gray-100 transition-colors shadow-xs"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
            </button>
          </div>
        </div>

        {/* Role / Domain Perspective Switcher */}
        <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100 overflow-x-auto scrollbar-hide">
          {(
            [
              { id: 'ALL', label: '360° Executive Overview', icon: Layers },
              { id: 'FRONT_OFFICE', label: 'Front-of-House & KDS', icon: UtensilsCrossed },
              { id: 'SUPPLY_CHAIN', label: 'Inventory & Procurement (MM/P2P)', icon: Package },
              { id: 'TREASURY_TAX', label: 'Treasury, M-Pesa & KRA eTIMS (FI)', icon: Wallet },
              { id: 'LAUNCHPAD', label: 'Full ERP Module Matrix (T-Codes)', icon: Sparkles },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = perspective === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPerspective(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  active
                    ? 'bg-servora-navy text-white shadow-xs'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-servora-navy'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TIER-1 EXECUTIVE KPI RIBBON (6 CORE PILLARS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Gross Sales & Net Base */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gross Turnover</span>
            <div className="p-1.5 bg-blue-50 text-servora-core rounded-lg">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="my-2">
            <span className="text-lg font-bold font-mono text-servora-navy block truncate">
              {currencySymbol} {(data?.financials.grossRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-gray-500 font-mono block">
              Net: {currencySymbol} {(data?.financials.netRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <Link href="/reports/sales" className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-servora-core hover:underline">
            <span>Avg: {currencySymbol} {(data?.financials.averageOrderValue || 0).toLocaleString()}</span>
            <ArrowRight size={11} />
          </Link>
        </div>

        {/* KRA VAT 16% + 2% Levy Liability */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">KRA Tax & Levy</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Receipt size={15} />
            </div>
          </div>
          <div className="my-2">
            <span className="text-lg font-bold font-mono text-emerald-700 block truncate">
              {currencySymbol}{' '}
              {((data?.financials.totalTax || 0) + (data?.financials.cateringLevy || 0)).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
            <span className="text-[11px] text-gray-500 font-mono block">
              VAT: {(data?.financials.totalTax || 0).toLocaleString()} • Levy: {(data?.financials.cateringLevy || 0).toLocaleString()}
            </span>
          </div>
          <Link href="/finance/taxes" className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-emerald-700 hover:underline">
            <span>{data?.treasury.etimsFiscalizedCount || 0} eTIMS Signed</span>
            <ArrowRight size={11} />
          </Link>
        </div>

        {/* Orders & Active KDS Queue */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Orders & Kitchen</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <ChefHat size={15} />
            </div>
          </div>
          <div className="my-2">
            <span className="text-lg font-bold font-mono text-servora-navy block">
              {data?.orders.totalOrders || 0} Tickets
            </span>
            <span className="text-[11px] text-amber-700 font-bold block">
              {data?.orders.kitchenQueue || 0} Active in KDS
            </span>
          </div>
          <Link href="/kitchen" className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-servora-core hover:underline">
            <span>{data?.orders.completedOrders || 0} Completed</span>
            <ArrowRight size={11} />
          </Link>
        </div>

        {/* Floor Seating & Waitlist */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Floor Occupancy</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <UtensilsCrossed size={15} />
            </div>
          </div>
          <div className="my-2">
            <span className="text-lg font-bold font-mono text-servora-navy block">
              {data?.floorPlan.utilizationRate || 0}% Seated
            </span>
            <span className="text-[11px] text-gray-500 block">
              {data?.floorPlan.occupiedTables || 0} Busy • {data?.floorPlan.availableTables || 0} Free
            </span>
          </div>
          <Link href="/tables" className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-purple-700 hover:underline">
            <span>{data?.floorPlan.activeReservations || 0} Bookings • {data?.floorPlan.waitlistCount || 0} Waitlist</span>
            <ArrowRight size={11} />
          </Link>
        </div>

        {/* Inventory Valuation & Depletions */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stock Valuation</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <Package size={15} />
            </div>
          </div>
          <div className="my-2">
            <span className="text-lg font-bold font-mono text-servora-navy block truncate">
              {currencySymbol} {(data?.inventory.totalValuation || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] text-rose-600 font-bold block">
              {data?.inventory.depletedItemsCount || 0} Low • {data?.inventory.outOfStockCount || 0} Stockout
            </span>
          </div>
          <Link href="/inventory/reorder" className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-rose-600 hover:underline">
            <span>{data?.inventory.expiringBatchesCount || 0} Expiring Batches</span>
            <ArrowRight size={11} />
          </Link>
        </div>

        {/* Accounts Payable & Active Till */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AP & Till Float</span>
            <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
              <Wallet size={15} />
            </div>
          </div>
          <div className="my-2">
            <span className="text-lg font-bold font-mono text-servora-navy block truncate">
              {currencySymbol} {(data?.procurement.accountsPayableBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] text-gray-500 block">
              {data?.procurement.unpaidInvoicesCount || 0} Unpaid Vendor Bills
            </span>
          </div>
          <Link href="/purchasing/invoices" className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-teal-700 hover:underline">
            <span>{data?.procurement.openPurchaseOrders || 0} Open POs</span>
            <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      {/* 3. VISUAL ANALYTICS ROW: HOURLY REVENUE, CHANNEL MIX & TOP MENU ITEMS */}
      {(perspective === 'ALL' || perspective === 'FRONT_OFFICE' || perspective === 'TREASURY_TAX') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Hourly Sales Velocity Chart (5 cols) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Hourly Revenue & Check Velocity</h3>
                <p className="text-[11px] text-gray-400">Live settlement throughput from `orders` table</p>
              </div>
              <Link href="/reports/sales" className="text-[11px] font-bold text-servora-core hover:underline">
                Full Report [BI02] &rarr;
              </Link>
            </div>

            <div className="h-64 w-full">
              {!data?.salesTrend || data.salesTrend.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  <TrendingUp size={32} className="mb-2 opacity-30 text-servora-navy" />
                  <p className="text-xs font-bold text-servora-navy">No sales posted in this window</p>
                  <p className="text-[11px] text-gray-400">Complete a POS checkout to populate live curve</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.salesTrend}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0554F4" stopOpacity={0.22} />
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
                        fontFamily: 'monospace',
                        fontSize: '11px',
                      }}
                      formatter={(value: any) => [`${currencySymbol} ${Number(value).toLocaleString()}`, 'Sales']}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#0554F4"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Fulfillment Channel Split (3 cols) */}
          <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-servora-navy">Omnichannel Mix</h3>
              <p className="text-[11px] text-gray-400 mb-2">Dine-In vs Takeaway vs 3PL Delivery</p>

              <div className="h-44 w-full flex items-center justify-center">
                {channelChartData.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 italic">Awaiting channel orders</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelChartData}
                        innerRadius={42}
                        outerRadius={68}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {channelChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${currencySymbol} ${Number(val).toLocaleString()}`, 'Sales']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs">
              {channelChartData.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="font-bold text-servora-navy">{c.name}</span>
                    <span className="text-[10px] text-gray-400">({c.orders})</span>
                  </div>
                  <span className="font-mono font-bold text-servora-navy">
                    {currencySymbol} {c.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Selling Menu Items Leaderboard (4 cols) */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="text-sm font-bold text-servora-navy">Top Menu Items Leaderboard</h3>
                  <p className="text-[11px] text-gray-400">Ranked by gross revenue contribution</p>
                </div>
                <Link href="/menu/recipes/costing" className="text-[11px] font-bold text-servora-core hover:underline">
                  BOM Costing [BOM09] &rarr;
                </Link>
              </div>

              <div className="space-y-2.5">
                {!data?.topProducts || data.topProducts.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
                    No item sales recorded in this period
                  </div>
                ) : (
                  data.topProducts.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-gray-100 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-lg bg-servora-navy text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-servora-navy truncate">{item.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">
                            {item.station} • {item.quantity} sold
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

            <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-[11px]">
              <span className="text-gray-400">86ed / Out-of-Stock Dishes:</span>
              <Link href="/menu/availability" className="font-bold text-rose-600 hover:underline">
                {data?.floorPlan.items86edCount || 0} Dishes 86ed [BOM07] &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 4. CROSS-DOMAIN ENTERPRISE CONTROL TOWERS (FRONT OFFICE, SUPPLY CHAIN, TREASURY) */}
      {perspective !== 'LAUNCHPAD' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TOWER A: FRONT-OF-HOUSE, FLOOR, KDS & 3PL DISPATCH */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
                  <Store size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-servora-navy">Front-of-House & Culinary</h3>
                  <p className="text-[10px] text-gray-400">Floor Seating, KDS, Reservations & 3PL</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-blue-50 text-servora-core px-2 py-0.5 rounded-md">
                SD / KDS
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <Link href="/tables" className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-gray-200 transition-colors">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Dining Tables [SD03]</span>
                <span className="text-sm font-bold text-servora-navy mt-0.5 block">
                  {data?.floorPlan.occupiedTables || 0} Occupied / {data?.floorPlan.availableTables || 0} Free
                </span>
                <span className="text-[10px] text-amber-600 font-semibold">
                  {data?.floorPlan.cleaningTables || 0} Turning • {data?.floorPlan.reservedTables || 0} Reserved
                </span>
              </Link>

              <Link href="/kitchen" className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-gray-200 transition-colors">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">KDS Expediter [KDS01]</span>
                <span className="text-sm font-bold text-amber-700 mt-0.5 block">
                  {data?.orders.kitchenQueue || 0} Active Tickets
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  {data?.orders.completedOrders || 0} Fulfilled Today
                </span>
              </Link>

              <Link href="/reservations" className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-gray-200 transition-colors">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Bookings & Waitlist</span>
                <span className="text-sm font-bold text-servora-navy mt-0.5 block">
                  {data?.floorPlan.activeReservations || 0} Reservations
                </span>
                <span className="text-[10px] text-purple-700 font-semibold">
                  {data?.floorPlan.waitlistCount || 0} Parties Waiting [SD05]
                </span>
              </Link>

              <Link href="/orders/delivery" className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-gray-200 transition-colors">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">3PL Dispatch [SD07]</span>
                <span className="text-sm font-bold text-servora-navy mt-0.5 block">
                  {data?.orders.activeDeliveries || 0} En Route
                </span>
                <span className="text-[10px] text-gray-500">Uber Direct / Bolt / Fleet</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-1.5">
              <Link href="/orders/open" className="text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-servora-navy px-2.5 py-1 rounded-lg">
                Open Checks [SD02]
              </Link>
              <Link href="/orders/takeaway" className="text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-servora-navy px-2.5 py-1 rounded-lg">
                Takeaway Hub [SD06]
              </Link>
              <Link href="/menu/pricing" className="text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-servora-navy px-2.5 py-1 rounded-lg">
                Dynamic Pricing [BOM06]
              </Link>
            </div>
          </div>

          {/* TOWER B: SUPPLY CHAIN, WAREHOUSE & P2P PROCUREMENT */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Warehouse size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-servora-navy">Supply Chain & Procure-to-Pay</h3>
                  <p className="text-[10px] text-gray-400">Stock, FIFO Batches, Transfers, POs & GRN</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                MM / P2P
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <Link href="/inventory/reorder" className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-gray-200 transition-colors">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">MRP Replenishment [MM09]</span>
                <span className="text-sm font-bold text-rose-600 mt-0.5 block">
                  {data?.inventory.depletedItemsCount || 0} Below Min
                </span>
                <span className="text-[10px] text-gray-500">
                  {data?.inventory.totalSkus || 0} Active SKUs Tracked
                </span>
              </Link>

              <Link href="/inventory/batches" className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-gray-200 transition-colors">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">FIFO Expiry & Waste</span>
                <span className="text-sm font-bold text-amber-700 mt-0.5 block">
                  {data?.inventory.expiringBatchesCount || 0} Lots Expiring
                </span>
                <span className="text-[10px] text-rose-600 font-mono">
                  Waste: {currencySymbol} {(data?.inventory.wasteLossAmount || 0).toLocaleString()}
                </span>
              </Link>

              <Link href="/purchasing/requests" className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-gray-200 transition-colors">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Requisitions & POs</span>
                <span className="text-sm font-bold text-servora-navy mt-0.5 block">
                  {data?.procurement.pendingRequisitions || 0} Pending PRs
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  {data?.procurement.openPurchaseOrders || 0} Open POs [P2P03]
                </span>
              </Link>

              <Link href="/inventory/transfers" className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-gray-200 transition-colors">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Stock Transfers & Audits</span>
                <span className="text-sm font-bold text-servora-navy mt-0.5 block">
                  {data?.inventory.activeTransfersCount || 0} In-Transit STOs
                </span>
                <span className="text-[10px] text-gray-500">
                  {data?.inventory.openStockCounts || 0} Open Physical Counts
                </span>
              </Link>
            </div>

            <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-1.5">
              <Link href="/purchasing/receiving" className="text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-servora-navy px-2.5 py-1 rounded-lg">
                Receive Goods (GRN) [P2P04]
              </Link>
              <Link href="/purchasing/returns" className="text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-servora-navy px-2.5 py-1 rounded-lg">
                Returns ({data?.procurement.pendingSupplierReturns || 0}) [P2P06]
              </Link>
              <Link href="/suppliers" className="text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-servora-navy px-2.5 py-1 rounded-lg">
                Suppliers [P2P01]
              </Link>
            </div>
          </div>

          {/* TOWER C: TREASURY, M-PESA DARAJA, CASH DRAWER & AUDIT */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Wallet size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-servora-navy">Treasury, Daraja & Compliance</h3>
                  <p className="text-[10px] text-gray-400">Cash Till, M-Pesa C2B, AP & KRA eTIMS</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md">
                FI / TAX
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <Link href="/cash-management/drawers" className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50/40 border border-gray-200 transition-colors">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Active Cash Drawer [FI05]</span>
                <span className="text-sm font-bold text-servora-navy mt-0.5 block truncate">
                  {data?.treasury.hasActiveSession ? data.treasury.drawerName : 'No Open Shift'}
                </span>
                <span className="text-[10px] font-mono text-emerald-700 font-bold">
                  Exp: {currencySymbol} {(data?.treasury.expectedClosing || 0).toLocaleString()}
                </span>
              </Link>

              <Link href="/payments/mpesa" className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50/40 border border-gray-200 transition-colors">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">M-Pesa Unclaimed [FI02]</span>
                <span className="text-sm font-bold text-emerald-700 mt-0.5 block">
                  {data?.treasury.unallocatedMpesaCount || 0} C2B Payments
                </span>
                <span className="text-[10px] font-mono text-gray-500">
                  {currencySymbol} {(data?.treasury.unallocatedMpesaAmount || 0).toLocaleString()} Unallocated
                </span>
              </Link>

              <Link href="/purchasing/invoices" className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50/40 border border-gray-200 transition-colors">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Accounts Payable [FI09]</span>
                <span className="text-sm font-bold text-rose-600 mt-0.5 block truncate">
                  {currencySymbol} {(data?.procurement.accountsPayableBalance || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-gray-500">
                  {data?.procurement.unpaidInvoicesCount || 0} Open Vendor Invoices
                </span>
              </Link>

              <Link href="/finance/taxes" className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50/40 border border-gray-200 transition-colors">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">KRA eTIMS Queue [FI10]</span>
                <span className="text-sm font-bold text-servora-navy mt-0.5 block">
                  {data?.treasury.etimsFiscalizedCount || 0} Fiscalized
                </span>
                <span className="text-[10px] text-amber-700 font-semibold">
                  {data?.treasury.etimsPendingCount || 0} Pending OSCU Sync
                </span>
              </Link>
            </div>

            <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-1.5">
              <Link href="/payments/reconciliation" className="text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-servora-navy px-2.5 py-1 rounded-lg">
                Bank Recon [FI03]
              </Link>
              <Link href="/payments/refunds" className="text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-servora-navy px-2.5 py-1 rounded-lg">
                Refunds [FI04]
              </Link>
              <Link href="/settings/audit-logs" className="text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-servora-navy px-2.5 py-1 rounded-lg">
                Audit Logs [CFG12]
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 5. FULL ENTERPRISE MODULE LAUNCHPAD (SAP FIORI / ODOO APP DIRECTORY) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-servora-navy flex items-center gap-2">
              <Sparkles size={17} className="text-servora-core" /> Enterprise Functional Module Directory (T-Code Launchpad)
            </h2>
            <p className="text-xs text-gray-500">
              Complete operational access to all 10 ERP domains synced with your sidebar navigation and database schema.
            </p>
          </div>
          <span className="text-[11px] font-mono text-gray-400">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-servora-navy font-bold">⌘K</kbd> to jump by T-Code
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 text-xs">
          {/* Domain 1: Sales & Service */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-gray-200/80 space-y-2.5">
            <div className="flex items-center justify-between font-bold text-servora-navy border-b border-gray-200 pb-2">
              <span className="flex items-center gap-1.5"><Store size={14} className="text-servora-core" /> Sales & Service</span>
              <span className="text-[10px] font-mono text-gray-400">SD</span>
            </div>
            <div className="space-y-1.5">
              <Link href="/pos" className="flex justify-between hover:text-servora-core font-medium"><span>POS Terminal</span><span className="font-mono text-[10px] text-gray-400">POS01</span></Link>
              <Link href="/orders" className="flex justify-between hover:text-servora-core font-medium"><span>All Orders Ledger</span><span className="font-mono text-[10px] text-gray-400">SD01</span></Link>
              <Link href="/orders/open" className="flex justify-between hover:text-servora-core font-medium"><span>Open Active Checks</span><span className="font-mono text-[10px] text-gray-400">SD02</span></Link>
              <Link href="/tables" className="flex justify-between hover:text-servora-core font-medium"><span>Floor Plan & Tables</span><span className="font-mono text-[10px] text-gray-400">SD03</span></Link>
              <Link href="/reservations" className="flex justify-between hover:text-servora-core font-medium"><span>Reservations Desk</span><span className="font-mono text-[10px] text-gray-400">SD04</span></Link>
              <Link href="/reservations/waitlist" className="flex justify-between hover:text-servora-core font-medium"><span>Waitlist Queue</span><span className="font-mono text-[10px] text-gray-400">SD05</span></Link>
              <Link href="/orders/takeaway" className="flex justify-between hover:text-servora-core font-medium"><span>Takeaway Counter</span><span className="font-mono text-[10px] text-gray-400">SD06</span></Link>
              <Link href="/orders/delivery" className="flex justify-between hover:text-servora-core font-medium"><span>3PL Dispatch Tower</span><span className="font-mono text-[10px] text-gray-400">SD07</span></Link>
            </div>
          </div>

          {/* Domain 2: Kitchen & Menu Engineering */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-gray-200/80 space-y-2.5">
            <div className="flex items-center justify-between font-bold text-servora-navy border-b border-gray-200 pb-2">
              <span className="flex items-center gap-1.5"><ChefHat size={14} className="text-amber-600" /> Kitchen & BOM</span>
              <span className="text-[10px] font-mono text-gray-400">KDS/BOM</span>
            </div>
            <div className="space-y-1.5">
              <Link href="/kitchen" className="flex justify-between hover:text-servora-core font-medium"><span>Kitchen Display (KDS)</span><span className="font-mono text-[10px] text-gray-400">KDS01</span></Link>
              <Link href="/kitchen/stations" className="flex justify-between hover:text-servora-core font-medium"><span>Prep Stations</span><span className="font-mono text-[10px] text-gray-400">KDS02</span></Link>
              <Link href="/menu" className="flex justify-between hover:text-servora-core font-medium"><span>Menu Catalog Master</span><span className="font-mono text-[10px] text-gray-400">BOM01</span></Link>
              <Link href="/menu/items" className="flex justify-between hover:text-servora-core font-medium"><span>Menu Items & SKUs</span><span className="font-mono text-[10px] text-gray-400">BOM03</span></Link>
              <Link href="/menu/modifiers" className="flex justify-between hover:text-servora-core font-medium"><span>Modifiers & Add-ons</span><span className="font-mono text-[10px] text-gray-400">BOM04</span></Link>
              <Link href="/menu/combos" className="flex justify-between hover:text-servora-core font-medium"><span>Combo Meal Bundles</span><span className="font-mono text-[10px] text-gray-400">BOM05</span></Link>
              <Link href="/menu/recipes" className="flex justify-between hover:text-servora-core font-medium"><span>Standard Recipes</span><span className="font-mono text-[10px] text-gray-400">BOM08</span></Link>
              <Link href="/menu/recipes/units" className="flex justify-between hover:text-servora-core font-medium"><span>UOM Conversions</span><span className="font-mono text-[10px] text-gray-400">BOM10</span></Link>
            </div>
          </div>

          {/* Domain 3: Inventory & Procurement */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-gray-200/80 space-y-2.5">
            <div className="flex items-center justify-between font-bold text-servora-navy border-b border-gray-200 pb-2">
              <span className="flex items-center gap-1.5"><Package size={14} className="text-emerald-600" /> Supply Chain</span>
              <span className="text-[10px] font-mono text-gray-400">MM/P2P</span>
            </div>
            <div className="space-y-1.5">
              <Link href="/inventory/items" className="flex justify-between hover:text-servora-core font-medium"><span>Material SKU Master</span><span className="font-mono text-[10px] text-gray-400">MM02</span></Link>
              <Link href="/inventory/movements" className="flex justify-between hover:text-servora-core font-medium"><span>Stock Movements</span><span className="font-mono text-[10px] text-gray-400">MM03</span></Link>
              <Link href="/inventory/counts" className="flex justify-between hover:text-servora-core font-medium"><span>Physical StockCounts</span><span className="font-mono text-[10px] text-gray-400">MM04</span></Link>
              <Link href="/inventory/transfers" className="flex justify-between hover:text-servora-core font-medium"><span>Branch Transfers</span><span className="font-mono text-[10px] text-gray-400">MM05</span></Link>
              <Link href="/inventory/batches" className="flex justify-between hover:text-servora-core font-medium"><span>FIFO Batches & Expiry</span><span className="font-mono text-[10px] text-gray-400">MM08</span></Link>
              <Link href="/purchasing/orders" className="flex justify-between hover:text-servora-core font-medium"><span>Purchase Orders (PO)</span><span className="font-mono text-[10px] text-gray-400">P2P03</span></Link>
              <Link href="/purchasing/receiving" className="flex justify-between hover:text-servora-core font-medium"><span>Goods Received (GRN)</span><span className="font-mono text-[10px] text-gray-400">P2P04</span></Link>
              <Link href="/purchasing/invoices" className="flex justify-between hover:text-servora-core font-medium"><span>Supplier AP Invoices</span><span className="font-mono text-[10px] text-gray-400">P2P05</span></Link>
            </div>
          </div>

          {/* Domain 4: Treasury, Finance & BI */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-gray-200/80 space-y-2.5">
            <div className="flex items-center justify-between font-bold text-servora-navy border-b border-gray-200 pb-2">
              <span className="flex items-center gap-1.5"><Wallet size={14} className="text-purple-600" /> Treasury & BI</span>
              <span className="text-[10px] font-mono text-gray-400">FI/BI</span>
            </div>
            <div className="space-y-1.5">
              <Link href="/payments" className="flex justify-between hover:text-servora-core font-medium"><span>Settlements Cockpit</span><span className="font-mono text-[10px] text-gray-400">FI01</span></Link>
              <Link href="/payments/mpesa" className="flex justify-between hover:text-servora-core font-medium"><span>M-Pesa Daraja Hub</span><span className="font-mono text-[10px] text-gray-400">FI02</span></Link>
              <Link href="/payments/reconciliation" className="flex justify-between hover:text-servora-core font-medium"><span>Bank Reconciliation</span><span className="font-mono text-[10px] text-gray-400">FI03</span></Link>
              <Link href="/payments/refunds" className="flex justify-between hover:text-servora-core font-medium"><span>Credit Notes & Refunds</span><span className="font-mono text-[10px] text-gray-400">FI04</span></Link>
              <Link href="/cash-management/drawers" className="flex justify-between hover:text-servora-core font-medium"><span>Cash Drawer Sessions</span><span className="font-mono text-[10px] text-gray-400">FI05</span></Link>
              <Link href="/reports/sales" className="flex justify-between hover:text-servora-core font-medium"><span>Sales Analytics</span><span className="font-mono text-[10px] text-gray-400">BI02</span></Link>
              <Link href="/reports/food-costing" className="flex justify-between hover:text-servora-core font-medium"><span>Theoretical vs Actual COGS</span><span className="font-mono text-[10px] text-gray-400">BI06</span></Link>
              <Link href="/ai-assistant" className="flex justify-between hover:text-servora-core font-medium"><span>Servora AI Advisor</span><span className="font-mono text-[10px] text-gray-400">AI01</span></Link>
            </div>
          </div>

          {/* Domain 5: CRM, HR & Enterprise Config */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-gray-200/80 space-y-2.5">
            <div className="flex items-center justify-between font-bold text-servora-navy border-b border-gray-200 pb-2">
              <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-teal-600" /> Governance</span>
              <span className="text-[10px] font-mono text-gray-400">HR/CFG</span>
            </div>
            <div className="space-y-1.5">
              <Link href="/customers" className="flex justify-between hover:text-servora-core font-medium"><span>Guest CRM Profiles</span><span className="font-mono text-[10px] text-gray-400">CRM01</span></Link>
              <Link href="/loyalty" className="flex justify-between hover:text-servora-core font-medium"><span>Loyalty & Vouchers</span><span className="font-mono text-[10px] text-gray-400">CRM02</span></Link>
              <Link href="/staff" className="flex justify-between hover:text-servora-core font-medium"><span>Personnel Roster</span><span className="font-mono text-[10px] text-gray-400">HR01</span></Link>
              <Link href="/staff/roles" className="flex justify-between hover:text-servora-core font-medium"><span>RBAC Access Matrix</span><span className="font-mono text-[10px] text-gray-400">HR02</span></Link>
              <Link href="/settings/business" className="flex justify-between hover:text-servora-core font-medium"><span>Corporate Legal Entity</span><span className="font-mono text-[10px] text-gray-400">CFG01</span></Link>
              <Link href="/settings/branches" className="flex justify-between hover:text-servora-core font-medium"><span>Multi-Branch Nodes</span><span className="font-mono text-[10px] text-gray-400">CFG02</span></Link>
              <Link href="/settings/financial" className="flex justify-between hover:text-servora-core font-medium"><span>KRA eTIMS OSCU Setup</span><span className="font-mono text-[10px] text-gray-400">CFG03</span></Link>
              <Link href="/settings/audit-logs" className="flex justify-between hover:text-servora-core font-medium"><span>Security Audit Trail</span><span className="font-mono text-[10px] text-gray-400">CFG12</span></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}