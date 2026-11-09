'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  TrendingUp,
  Percent,
  DollarSign,
  Download,
  RefreshCw,
  ChevronRight,
  Calendar,
  Search,
  ArrowUpDown,
  Star,
  Award,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Layers,
  UtensilsCrossed,
  SlidersHorizontal,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ProductItem {
  menuItemId: number;
  itemName: string;
  sku: string;
  categoryName: string;
  stockTrackingType: string;
  kitchenStation: string;
  avgSellingPrice: number;
  quantitySold: number;
  grossRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
  foodCostPercent: number;
  matrixClassification: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG';
}

interface ProductSummary {
  totalProductsAnalyzed: number;
  totalUnitsSold: number;
  portfolioGrossSales: number;
  portfolioTotalCost: number;
  portfolioGrossProfit: number;
  portfolioFoodCostPercent: number;
  topVolumeProduct: string;
  topMarginProduct: string;
}

interface CategoryBreakdown {
  categoryName: string;
  unitsSold: number;
  grossRevenue: number;
  grossProfit: number;
  marginPercent: number;
}

interface MatrixDistribution {
  stars: number;
  plowhorses: number;
  puzzles: number;
  dogs: number;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

const MATRIX_BADGES: Record<ProductItem['matrixClassification'], { label: string; bg: string; text: string; icon: any }> = {
  STAR: { label: 'Star', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: Star },
  PLOWHORSE: { label: 'Plowhorse', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: Award },
  PUZZLE: { label: 'Puzzle', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: HelpCircle },
  DOG: { label: 'Underperformer', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', icon: AlertTriangle },
};

export default function ProductReportsPage() {
  const [summary, setSummary] = useState<ProductSummary | null>(null);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [matrixDist, setMatrixDist] = useState<MatrixDistribution | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Filters & Sorters
  const [sortBy, setSortBy] = useState<'REVENUE' | 'QUANTITY' | 'PROFIT' | 'MARGIN'>('REVENUE');
  const [matrixFilter, setMatrixFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyPreset = (preset: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH') => {
    setDatePreset(preset);
    const now = new Date();
    let s = new Date();
    let e = new Date();

    if (preset === 'TODAY') {
      s = now;
      e = now;
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
      params.set('sortBy', sortBy);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const [reportRes, branchRes] = await Promise.all([
        fetchApi(`/api/v1/reports/products?${params.toString()}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (reportRes?.data) {
        setSummary(reportRes.data.summary);
        setItems(reportRes.data.items || []);
        setCategoryBreakdown(reportRes.data.categoryBreakdown || []);
        setMatrixDist(reportRes.data.matrixDistribution || null);
      }

      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load product report:', err);
      setErrorMessage(err.message || 'Failed to load product performance telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, startDate, endDate, sortBy, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    if (matrixFilter === 'ALL') return items;
    return items.filter((i) => i.matrixClassification === matrixFilter);
  }, [items, matrixFilter]);

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    const directKeys = ['token', 'accessToken', 'access_token', 'auth_token', 'authToken', 'jwt', 'servora_token'];
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
          const candidate = parsed.token || parsed.accessToken || parsed.access_token || parsed.data?.token;
          if (candidate && typeof candidate === 'string') return candidate.trim();
        }
      } catch {
        // scan next
      }
    }
    const cookieMatch = document.cookie.match(/(?:^|;\s*)(?:token|accessToken|access_token|auth_token)\s*=\s*([^;]+)/);
    if (cookieMatch) return decodeURIComponent(cookieMatch[1]);
    return null;
  };

  const handleExport = async (exportType: 'PRODUCT_MATRIX' | 'CATEGORY_BREAKDOWN') => {
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
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${apiBaseUrl}/api/v1/reports/products/export?${params.toString()}`, {
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
      a.download = `product-report-${exportType.toLowerCase()}-${startDate}-to-${endDate}.csv`;
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

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
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
            <span className="text-xs font-bold text-servora-navy">Product Velocity & Menu Engineering</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Package className="text-servora-core" size={22} />
            Product Performance & Profitability Ledger
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Audit item velocities, recipe food-cost margins, Boston Consulting Group (BCG) menu engineering classifications, and inventory depletion.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => handleExport('PRODUCT_MATRIX')}
            disabled={isExporting}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Download size={13} />
            <span>{isExporting ? 'Exporting...' : 'Export Matrix (CSV)'}</span>
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
          {(['TODAY', 'THIS_WEEK', 'THIS_MONTH'] as const).map((preset) => (
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

      {/* 3. MERCHANDISING EXECUTIVE KPI RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Total Revenue</span>
          <p className="text-lg font-bold font-mono text-servora-navy mt-1">
            KES {summary ? summary.portfolioGrossSales.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">{summary?.totalProductsAnalyzed || 0} SKUs Sold</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Total Units Sold</span>
          <p className="text-lg font-bold font-mono text-servora-core mt-1">
            {summary ? summary.totalUnitsSold.toLocaleString() : '0'}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Quantity Dispatched</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Portfolio Cost (COGS)</span>
          <p className="text-lg font-bold font-mono text-amber-700 mt-1">
            KES {summary ? summary.portfolioTotalCost.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Recipe Deductions</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Gross Profit</span>
          <p className="text-lg font-bold font-mono text-emerald-700 mt-1">
            KES {summary ? summary.portfolioGrossProfit.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Net Contribution</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Food Cost %</span>
          <p className="text-lg font-bold font-mono text-purple-700 mt-1">
            {summary ? `${summary.portfolioFoodCostPercent}%` : '0%'}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Target: 28% - 32%</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Top Performer</span>
          <p className="text-sm font-bold text-servora-navy mt-1 truncate" title={summary?.topVolumeProduct}>
            {summary?.topVolumeProduct || 'None'}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Highest Volume</span>
        </div>
      </div>

      {/* 4. MENU ENGINEERING QUADRANTS (BCG MATRIX) & CATEGORY BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* BCG Matrix Quadrant Distribution (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-2.5 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Menu Engineering Matrix</h3>
              <p className="text-[10px] text-gray-400">Classified by volume vs. recipe profit margin</p>
            </div>
            <Sparkles size={16} className="text-servora-core" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setMatrixFilter(matrixFilter === 'STAR' ? 'ALL' : 'STAR')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                matrixFilter === 'STAR' ? 'bg-emerald-100/50 border-emerald-500' : 'bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                <span className="flex items-center gap-1">
                  <Star size={13} className="fill-emerald-600 text-emerald-600" /> Stars
                </span>
                <span className="font-mono">{matrixDist?.stars || 0}</span>
              </div>
              <p className="text-[10px] text-emerald-700/80 mt-1">High Volume, High Margin</p>
            </div>

            <div
              onClick={() => setMatrixFilter(matrixFilter === 'PLOWHORSE' ? 'ALL' : 'PLOWHORSE')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                matrixFilter === 'PLOWHORSE' ? 'bg-blue-100/50 border-blue-500' : 'bg-blue-50/40 border-blue-100 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-blue-800">
                <span className="flex items-center gap-1">
                  <Award size={13} className="text-blue-600" /> Plowhorses
                </span>
                <span className="font-mono">{matrixDist?.plowhorses || 0}</span>
              </div>
              <p className="text-[10px] text-blue-700/80 mt-1">High Volume, Low Margin</p>
            </div>

            <div
              onClick={() => setMatrixFilter(matrixFilter === 'PUZZLE' ? 'ALL' : 'PUZZLE')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                matrixFilter === 'PUZZLE' ? 'bg-amber-100/50 border-amber-500' : 'bg-amber-50/40 border-amber-100 hover:bg-amber-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                <span className="flex items-center gap-1">
                  <HelpCircle size={13} className="text-amber-600" /> Puzzles
                </span>
                <span className="font-mono">{matrixDist?.puzzles || 0}</span>
              </div>
              <p className="text-[10px] text-amber-700/80 mt-1">Low Volume, High Margin</p>
            </div>

            <div
              onClick={() => setMatrixFilter(matrixFilter === 'DOG' ? 'ALL' : 'DOG')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                matrixFilter === 'DOG' ? 'bg-rose-100/50 border-rose-500' : 'bg-rose-50/40 border-rose-100 hover:bg-rose-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-rose-800">
                <span className="flex items-center gap-1">
                  <AlertTriangle size={13} className="text-rose-600" /> Dogs
                </span>
                <span className="font-mono">{matrixDist?.dogs || 0}</span>
              </div>
              <p className="text-[10px] text-rose-700/80 mt-1">Low Volume, Low Margin</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
            <span>Filter Active: <strong>{matrixFilter}</strong></span>
            {matrixFilter !== 'ALL' && (
              <button onClick={() => setMatrixFilter('ALL')} className="text-servora-core font-bold hover:underline cursor-pointer">
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Category Contribution Bars (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-2.5 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Category Revenue & Profit Contribution</h3>
              <p className="text-[10px] text-gray-400">Total gross income generated by menu hierarchy</p>
            </div>
            <button
              onClick={() => handleExport('CATEGORY_BREAKDOWN')}
              className="text-[11px] font-bold text-servora-core hover:underline cursor-pointer"
            >
              Export Categories
            </button>
          </div>

          <div className="space-y-3">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">No categories mapped to sales in this range.</p>
            ) : (
              categoryBreakdown.map((cat, idx) => {
                const maxRev = categoryBreakdown[0]?.grossRevenue || 1;
                const ratio = Math.min(100, Math.max(8, Math.round((cat.grossRevenue / maxRev) * 100)));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-servora-navy">
                        <span>{cat.categoryName}</span>
                        <span className="text-[10px] font-normal text-gray-400 font-mono">({cat.unitsSold} units)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-mono">
                          {cat.marginPercent}% margin
                        </span>
                        <span className="font-mono font-bold text-servora-navy text-[11px]">
                          KES {cat.grossRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
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
      </div>

      {/* 5. INTERACTIVE PRODUCT LEDGER & DATA GRID */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-servora-navy uppercase tracking-wider">
              Product Performance Matrix ({filteredItems.length} SKUs)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Sorter */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded-xl text-xs">
              <ArrowUpDown size={12} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
              >
                <option value="REVENUE">Sort by Revenue</option>
                <option value="QUANTITY">Sort by Units Sold</option>
                <option value="PROFIT">Sort by Gross Margin</option>
                <option value="MARGIN">Sort by Margin %</option>
              </select>
            </div>

            {/* In-table Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="Search SKU or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core w-36 sm:w-48 font-medium"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Item Details</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Tracking</th>
                <th className="py-2.5 px-3 text-right">Units Sold</th>
                <th className="py-2.5 px-3 text-right">Avg Price</th>
                <th className="py-2.5 px-3 text-right">Revenue</th>
                <th className="py-2.5 px-3 text-right">COGS Cost</th>
                <th className="py-2.5 px-3 text-right">Gross Profit</th>
                <th className="py-2.5 px-3 text-right">Food Cost %</th>
                <th className="py-2.5 px-3 text-center">Menu Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400 italic">
                    {isLoading ? 'Aggregating menu item transactions...' : 'No products found matching your active criteria.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const badge = MATRIX_BADGES[item.matrixClassification];
                  const BadgeIcon = badge.icon;
                  return (
                    <tr key={item.menuItemId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{item.itemName}</span>
                        <span className="font-mono text-[10px] text-gray-400">SKU: {item.sku}</span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 font-medium">
                        {item.categoryName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-gray-600 border border-gray-200">
                          {item.stockTrackingType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                        {item.quantitySold.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-600">
                        {item.avgSellingPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-core">
                        KES {item.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700">
                        KES {item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        KES {item.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className={item.foodCostPercent > 35 ? 'text-rose-600' : 'text-gray-700'}>
                          {item.foodCostPercent}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${badge.bg} ${badge.text}`}>
                          <BadgeIcon size={10} />
                          {badge.label}
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
    </div>
  );
}