'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Calendar,
  Download,
  RefreshCw,
  ChevronRight,
  Receipt,
  Building2,
  DollarSign,
  Percent,
  Clock,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  PieChart as PieIcon,
  UtensilsCrossed,
  Store,
  Layers,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SalesSummary {
  totalOrders: number;
  completedOrders: number;
  voidedOrders: number;
  grossSales: number;
  netSales: number;
  discountTotal: number;
  taxTotal: number;
  serviceChargeTotal: number;
  tipTotal: number;
  grandTotal: number;
  averageOrderValue: number;
  avgSalesByTable: number;
  distinctTablesCount: number;
}

interface PaymentBreakdownItem {
  paymentMethod: string;
  transactionCount: number;
  totalCollected: number;
}

interface CategoryBreakdownItem {
  categoryId: number;
  categoryName: string;
  totalQuantity: number;
  totalRevenue: number;
}

interface BranchBreakdownItem {
  branchId: number;
  branchName: string;
  branchCode: string;
  orderCount: number;
  totalRevenue: number;
}

interface TopItem {
  itemId: number;
  itemName: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

interface TimelinePoint {
  timeBucket: string;
  orderCount: number;
  netSales: number;
  taxTotal: number;
  grandTotal: number;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

const TENDER_COLORS = ['#0554F4', '#FF5733', '#F4B400', '#00C49F', '#9333EA', '#06B6D4'];

export default function SalesReportPage() {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdownItem[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [branchBreakdown, setBranchBreakdown] = useState<BranchBreakdownItem[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  const [datePreset, setDatePreset] = useState<'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active hover states for charts
  const [hoveredPoint, setHoveredPoint] = useState<TimelinePoint | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const applyPreset = (preset: 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH') => {
    setDatePreset(preset);
    const now = new Date();
    let s = new Date();
    let e = new Date();

    if (preset === 'TODAY') {
      s = now;
      e = now;
    } else if (preset === 'YESTERDAY') {
      s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      e = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay() || 7;
      s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
      e = new Date();
    } else if (preset === 'THIS_MONTH') {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = new Date();
    }

    setStartDate(s.toISOString().split('T')[0]);
    setEndDate(e.toISOString().split('T')[0]);
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const params = new URLSearchParams();
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const [reportRes, branchRes] = await Promise.all([
        fetchApi(`/api/v1/reports/sales?${params.toString()}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (reportRes?.data) {
        setSummary(reportRes.data.summary || null);
        setPaymentBreakdown(reportRes.data.paymentBreakdown || []);
        setCategoryBreakdown(reportRes.data.categoryBreakdown || []);
        setBranchBreakdown(reportRes.data.branchBreakdown || []);
        setTopItems(reportRes.data.topItems || []);
        setTimeline(reportRes.data.timeline || []);
      }

      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load sales report data:', err);
      setErrorMessage(err.message || 'Failed to aggregate realtime sales metrics.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;

    const directKeys = [
      'token',
      'accessToken',
      'access_token',
      'auth_token',
      'authToken',
      'jwt',
      'servora_token',
    ];
    for (const key of directKeys) {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (val && val.trim() !== '') return val.trim();
    }

    const jsonKeys = ['user', 'auth', 'session', 'servora_user', 'servora_auth'];
    for (const key of jsonKeys) {
      try {
        const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const candidate =
            parsed.token ||
            parsed.accessToken ||
            parsed.access_token ||
            parsed.data?.token ||
            parsed.state?.token;
          if (candidate && typeof candidate === 'string') return candidate.trim();
        }
      } catch {
        // scan next
      }
    }

    const cookieMatch = document.cookie.match(
      /(?:^|;\s*)(?:token|accessToken|access_token|auth_token)\s*=\s*([^;]+)/
    );
    if (cookieMatch) {
      return decodeURIComponent(cookieMatch[1]);
    }

    return null;
  };

  const handleExport = async (exportType: 'SUMMARY' | 'PAYMENT_TENDERS' | 'LINE_ITEMS') => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      params.set('exportType', exportType);
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const token = getAuthToken();
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBaseUrl}/api/v1/reports/sales/export?${params.toString()}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-${exportType.toLowerCase()}-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // SVG Area Graph Coordinates Generator
  const areaGraphMetrics = useMemo(() => {
    if (!timeline || timeline.length === 0) return null;
    const height = 180;
    const width = 640;
    const paddingX = 24;
    const paddingY = 24;

    const maxSales = Math.max(...timeline.map((t) => t.grandTotal), 100);
    const minSales = 0;

    const points = timeline.map((t, idx) => {
      const x = paddingX + (idx / Math.max(timeline.length - 1, 1)) * (width - paddingX * 2);
      const y = height - paddingY - ((t.grandTotal - minSales) / (maxSales - minSales)) * (height - paddingY * 2);
      return { x, y, data: t };
    });

    const pathD = points.reduce((acc, p, i, a) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = a[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

    return { width, height, points, pathD, areaD, maxSales };
  }, [timeline]);

  // SVG Order Volume Column Graph Coordinates Generator
  const barGraphMetrics = useMemo(() => {
    if (!timeline || timeline.length === 0) return null;
    const height = 180;
    const width = 640;
    const paddingX = 16;
    const paddingY = 24;

    const maxOrders = Math.max(...timeline.map((t) => t.orderCount), 5);
    const barWidth = Math.max(8, Math.min(32, (width - paddingX * 2) / timeline.length - 6));

    const bars = timeline.map((t, idx) => {
      const x = paddingX + (idx / Math.max(timeline.length, 1)) * (width - paddingX * 2) + barWidth / 2;
      const barHeight = ((t.orderCount / maxOrders) * (height - paddingY * 2));
      const y = height - paddingY - barHeight;
      return { x, y, width: barWidth, height: barHeight, data: t };
    });

    return { width, height, bars, maxOrders };
  }, [timeline]);

  // Donut Arc Calculations
  const donutArcs = useMemo(() => {
    const total = paymentBreakdown.reduce((sum, p) => sum + p.totalCollected, 0) || 1;
    let accumulatedAngle = 0;
    const radius = 60;
    const circumference = 2 * Math.PI * radius;

    return paymentBreakdown.map((item, idx) => {
      const percentage = (item.totalCollected / total);
      const strokeDasharray = `${percentage * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle * circumference;
      accumulatedAngle += percentage;
      const color = TENDER_COLORS[idx % TENDER_COLORS.length];

      return {
        item,
        percentage: Math.round(percentage * 100),
        strokeDasharray,
        strokeDashoffset,
        color,
      };
    });
  }, [paymentBreakdown]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER & CONTROLS */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Enterprise Control <ChevronRight size={12} />
            </Link>
            <Link
              href="/reports"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Reporting Hub <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Sales Overview</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <TrendingUp className="text-servora-core" size={22} />
            Restaurant Sales Overview
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Real-time omnichannel sales analytics, visual trends, volume velocity, and multi-location rankings.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => handleExport('SUMMARY')}
            disabled={isExporting}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Download size={13} />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh Ledger"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. DATE PRESETS & BRANCH FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          {(['TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                datePreset === preset
                  ? 'bg-servora-navy text-white shadow-xs'
                  : 'bg-slate-50 text-servora-navy border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {preset.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
            <Calendar size={13} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDatePreset('CUSTOM');
                setStartDate(e.target.value);
              }}
              className="bg-transparent text-[11px] font-mono font-bold text-servora-navy focus:outline-none"
            />
            <span className="text-gray-400 font-mono">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDatePreset('CUSTOM');
                setEndDate(e.target.value);
              }}
              className="bg-transparent text-[11px] font-mono font-bold text-servora-navy focus:outline-none"
            />
          </div>

          {branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
            >
              <option value="ALL">All Branch Locations</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 3. EXECUTIVE 5-CARD KPI METRIC BAR (Matches Reference Layout) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Sales Amount</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-1">
              KES {summary ? summary.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Net: KES {summary ? summary.netSales.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Discount</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-1">
              KES {summary ? summary.discountTotal.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
            </p>
            <span className="text-[10px] text-rose-500 font-medium mt-0.5 block">{summary?.voidedOrders || 0} Voided Orders</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Percent size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">No of Orders</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-1">
              {summary ? summary.totalOrders.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-400 font-medium mt-0.5 block">{summary?.completedOrders || 0} Fulfilled</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center shrink-0">
            <Receipt size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Avg Order Value</span>
            <p className="text-xl font-bold font-mono text-indigo-700 mt-1">
              KES {summary ? summary.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </p>
            <span className="text-[10px] text-gray-400 font-medium mt-0.5 block">Ticket Velocity</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BarChart3 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Avg Sales by Table</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-1">
              KES {summary ? summary.avgSalesByTable.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
            </p>
            <span className="text-[10px] text-gray-400 font-medium mt-0.5 block">{summary?.distinctTablesCount || 0} Tables Active</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Store size={20} />
          </div>
        </div>
      </div>

      {/* 4. MAIN DUAL VISUAL CHARTS (Trend & Volume) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart A: Smooth Area Sales Trend */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Monthly Sales Trend</h3>
              <p className="text-[10px] text-gray-400">Continuous gross revenue flow across timeframe</p>
            </div>
            {hoveredPoint && (
              <span className="font-mono text-xs font-bold text-servora-core bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                {hoveredPoint.timeBucket}: KES {hoveredPoint.grandTotal.toLocaleString()}
              </span>
            )}
          </div>

          <div className="relative h-[210px] w-full flex items-center justify-center">
            {areaGraphMetrics && areaGraphMetrics.points.length > 0 ? (
              <svg viewBox={`0 0 ${areaGraphMetrics.width} ${areaGraphMetrics.height}`} className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="salesTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0554F4" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0554F4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Baseline Gridlines */}
                {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
                  const y = (areaGraphMetrics.height - 48) * ratio + 24;
                  return (
                    <line
                      key={idx}
                      x1="24"
                      y1={y}
                      x2={areaGraphMetrics.width - 24}
                      y2={y}
                      stroke="#F1F5F9"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Area and Line Path */}
                <path d={areaGraphMetrics.areaD} fill="url(#salesTrendGradient)" />
                <path d={areaGraphMetrics.pathD} fill="none" stroke="#0554F4" strokeWidth="2.5" strokeLinecap="round" />

                {/* Interactive Node Markers */}
                {areaGraphMetrics.points.map((pt, idx) => (
                  <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(pt.data)} onMouseLeave={() => setHoveredPoint(null)}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPoint?.timeBucket === pt.data.timeBucket ? '5.5' : '3.5'}
                      fill="#FFFFFF"
                      stroke="#0554F4"
                      strokeWidth="2.5"
                      className="transition-all"
                    />
                  </g>
                ))}
              </svg>
            ) : (
              <p className="text-xs text-gray-400 italic">No timeline data points available.</p>
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono pt-1 border-t border-gray-50">
            <span>{timeline[0]?.timeBucket || 'Start'}</span>
            <span>{timeline[Math.floor(timeline.length / 2)]?.timeBucket || 'Mid'}</span>
            <span>{timeline[timeline.length - 1]?.timeBucket || 'End'}</span>
          </div>
        </div>

        {/* Chart B: Orders Volume Bar Chart */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">No of Orders by Period</h3>
              <p className="text-[10px] text-gray-400">Total customer transaction density per bucket</p>
            </div>
            {hoveredBarIndex !== null && timeline[hoveredBarIndex] && (
              <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                {timeline[hoveredBarIndex].timeBucket}: {timeline[hoveredBarIndex].orderCount} Orders
              </span>
            )}
          </div>

          <div className="relative h-[210px] w-full flex items-center justify-center">
            {barGraphMetrics && barGraphMetrics.bars.length > 0 ? (
              <svg viewBox={`0 0 ${barGraphMetrics.width} ${barGraphMetrics.height}`} className="w-full h-full overflow-visible">
                {/* Horizontal Baseline Gridlines */}
                {[0.25, 0.5, 0.75].map((ratio, idx) => {
                  const y = (barGraphMetrics.height - 48) * ratio + 24;
                  return (
                    <line
                      key={idx}
                      x1="16"
                      y1={y}
                      x2={barGraphMetrics.width - 16}
                      y2={y}
                      stroke="#F1F5F9"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Vertical Bars */}
                {barGraphMetrics.bars.map((bar, idx) => (
                  <g
                    key={idx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    <rect
                      x={bar.x - bar.width / 2}
                      y={bar.y}
                      width={bar.width}
                      height={Math.max(bar.height, 3)}
                      rx="4"
                      fill={hoveredBarIndex === idx ? '#0554F4' : '#2A9D8F'}
                      className="transition-colors"
                    />
                  </g>
                ))}
              </svg>
            ) : (
              <p className="text-xs text-gray-400 italic">No order volume recorded.</p>
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono pt-1 border-t border-gray-50">
            <span>Volume Max: {barGraphMetrics?.maxOrders || 0}</span>
            <span>Order Volume Density</span>
          </div>
        </div>
      </div>

      {/* 5. MULTI-DIMENSIONAL BREAKDOWN (Rankings, Donut, Cuisines - Reference Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Widget 1: Top Restaurants / Branches by Sales */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Top Restaurants by Sales</h3>
              <p className="text-[10px] text-gray-400">Branch revenue distribution</p>
            </div>
            <Store size={16} className="text-servora-core" />
          </div>

          <div className="space-y-3">
            {branchBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">No branch sales recorded.</p>
            ) : (
              branchBreakdown.map((b, idx) => {
                const maxRev = branchBreakdown[0]?.totalRevenue || 1;
                const ratio = Math.min(100, Math.max(10, Math.round((b.totalRevenue / maxRev) * 100)));
                return (
                  <div key={b.branchId} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-servora-navy truncate max-w-[140px]">
                        <span className="w-4 h-4 rounded-full bg-blue-50 text-servora-core text-[9px] flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span className="truncate">{b.branchName}</span>
                      </div>
                      <span className="font-mono font-bold text-servora-core text-[11px]">
                        KES {b.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-servora-core h-full rounded-full transition-all duration-500"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Widget 2: Sales by Payment Method (Donut Visualization) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Sales by Payment Method</h3>
              <p className="text-[10px] text-gray-400">Tender mix breakdown</p>
            </div>
            <button
              onClick={() => handleExport('PAYMENT_TENDERS')}
              className="text-[10px] font-bold text-servora-core hover:underline cursor-pointer"
            >
              Export
            </button>
          </div>

          <div className="flex flex-col items-center justify-center pt-2">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90 transform">
                {donutArcs.map((arc, idx) => (
                  <circle
                    key={idx}
                    cx="80"
                    cy="80"
                    r="60"
                    fill="transparent"
                    stroke={arc.color}
                    strokeWidth="18"
                    strokeDasharray={arc.strokeDasharray}
                    strokeDashoffset={arc.strokeDashoffset}
                    className="transition-all duration-500"
                  />
                ))}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[9px] uppercase font-bold text-gray-400">Total</span>
                <span className="font-mono font-bold text-xs text-servora-navy">
                  KES {summary ? summary.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full pt-4">
              {donutArcs.map((arc, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: arc.color }} />
                  <span className="truncate font-medium text-gray-700">{arc.item.paymentMethod}</span>
                  <span className="font-mono font-bold text-servora-navy ml-auto">{arc.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Widget 3: Sales by Cuisines / Menu Categories */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Sales by Cuisines & Menu</h3>
              <p className="text-[10px] text-gray-400">Revenue split across culinary categories</p>
            </div>
            <UtensilsCrossed size={16} className="text-servora-core" />
          </div>

          <div className="space-y-3">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">No categorized sales recorded.</p>
            ) : (
              categoryBreakdown.map((cat, idx) => {
                const maxCatRev = categoryBreakdown[0]?.totalRevenue || 1;
                const ratio = Math.min(100, Math.max(10, Math.round((cat.totalRevenue / maxCatRev) * 100)));
                const barColor = idx === 0 ? '#E76F51' : idx === 1 ? '#F4A261' : idx === 2 ? '#E9C46A' : '#2A9D8F';

                return (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-servora-navy truncate max-w-[140px]">{cat.categoryName}</span>
                      <span className="font-mono font-bold text-servora-navy text-[11px]">
                        KES {cat.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${ratio}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 6. TOP PRODUCTS SALES VELOCITY TABLE */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-servora-navy">Top Product Sales Velocity</h3>
            <p className="text-[11px] text-gray-400">Best-selling menu items by revenue and physical unit count</p>
          </div>
          <button
            onClick={() => handleExport('LINE_ITEMS')}
            className="text-[11px] font-bold text-servora-core hover:underline cursor-pointer"
          >
            Export Items
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3 text-right">Units Sold</th>
                <th className="py-2.5 px-3 text-right">Gross Revenue (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-400 italic">
                    No item sales registered in this window.
                  </td>
                </tr>
              ) : (
                topItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-servora-navy">{item.itemName}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-600">
                      {item.totalQuantitySold.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-servora-core">
                      {item.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. PERIODIC REVENUE TIMELINE TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-xs text-servora-navy uppercase tracking-wider">
              Periodic Revenue Timeline
            </h3>
            <p className="text-[11px] text-gray-400">Detailed performance ledger over the selected period</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Time Period</th>
                <th className="py-2.5 px-3">Order Volume</th>
                <th className="py-2.5 px-3">Net Sales (Excl. Tax)</th>
                <th className="py-2.5 px-3">Statutory Tax</th>
                <th className="py-2.5 px-3 text-right">Total Gross Collections</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {timeline.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 italic">
                    {isLoading ? 'Aggregating revenue transactions...' : 'No sales records found for this timeframe.'}
                  </td>
                </tr>
              ) : (
                timeline.map((point, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-servora-navy whitespace-nowrap">
                      {point.timeBucket}
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-600">
                      {point.orderCount} orders
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-700">
                      KES {point.netSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 font-mono text-purple-700">
                      KES {point.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-servora-core">
                      KES {point.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}