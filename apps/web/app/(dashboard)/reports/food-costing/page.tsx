'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Utensils,
  Percent,
  DollarSign,
  Download,
  RefreshCw,
  ChevronRight,
  Calendar,
  Search,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Layers,
  ChefHat,
  Sparkles,
  PieChart as PieIcon,
  ShieldAlert,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface CostedRecipeItem {
  menuItemId: number;
  name: string;
  sku: string;
  categoryName: string;
  kitchenStation: string;
  sellingPrice: number;
  theoreticalPortionCost: number;
  grossProfit: number;
  foodCostPercent: number;
  grossMarginPercent: number;
  yieldPortions: number;
  ingredientCount: number;
  costHealth: 'OPTIMAL' | 'WARNING' | 'CRITICAL_HIGH_COST';
  unitsSoldPeriod: number;
  totalCostOfSalesPeriod: number;
  totalRevenuePeriod: number;
}

interface FoodCostSummary {
  totalCostedRecipes: number;
  avgFoodCostPercent: number;
  optimalRecipesCount: number;
  warningRecipesCount: number;
  criticalHighCostCount: number;
  potentialMarginSavings: number;
}

interface CategoryCostSummary {
  category: string;
  recipeCount: number;
  avgPortionPrice: number;
  avgPortionCost: number;
  categoryFoodCostPercent: number;
}

interface HighImpactIngredient {
  name: string;
  unit: string;
  totalUsageCost: number;
  recipeCount: number;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

const HEALTH_CONFIG = {
  OPTIMAL: { label: 'Optimal (<28%)', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  WARNING: { label: 'Warning (28-35%)', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  CRITICAL_HIGH_COST: { label: 'Critical (>35%)', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
};

export default function FoodCostingReportPage() {
  const [summary, setSummary] = useState<FoodCostSummary | null>(null);
  const [items, setItems] = useState<CostedRecipeItem[]>([]);
  const [categoryCostSummary, setCategoryCostSummary] = useState<CategoryCostSummary[]>([]);
  const [highImpactIngredients, setHighImpactIngredients] = useState<HighImpactIngredient[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Filters & Sorting State
  const [costHealthFilter, setCostHealthFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'FOOD_COST_PERCENT' | 'THEORETICAL_COST' | 'RECIPE_PROFIT' | 'NAME'>('FOOD_COST_PERCENT');

  const [datePreset, setDatePreset] = useState<'THIS_MONTH' | 'LAST_30_DAYS'>('THIS_MONTH');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const params = new URLSearchParams();
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (costHealthFilter !== 'ALL') params.set('costHealthStatus', costHealthFilter);
      params.set('sortBy', sortBy);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const [reportRes, branchRes] = await Promise.all([
        fetchApi(`/api/v1/reports/food-costing?${params.toString()}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (reportRes?.data) {
        setSummary(reportRes.data.summary);
        setItems(reportRes.data.items || []);
        setCategoryCostSummary(reportRes.data.categoryCostSummary || []);
        setHighImpactIngredients(reportRes.data.highImpactIngredients || []);
      }

      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load food costing report:', err);
      setErrorMessage(err.message || 'Failed to aggregate recipe costing telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, startDate, endDate, costHealthFilter, sortBy, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleExport = async (exportType: 'RECIPE_BOM_LEDGER' | 'CATEGORY_MARGIN_SUMMARY') => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      params.set('exportType', exportType);
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (costHealthFilter !== 'ALL') params.set('costHealthStatus', costHealthFilter);

      const token = getAuthToken();
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${apiBaseUrl}/api/v1/reports/food-costing/export?${params.toString()}`, {
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
      a.download = `food-costing-${exportType.toLowerCase()}-${Date.now()}.csv`;
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

  // Health distribution ratios
  const healthRatios = useMemo(() => {
    const total = summary?.totalCostedRecipes || 1;
    const opt = ((summary?.optimalRecipesCount || 0) / total) * 100;
    const warn = ((summary?.warningRecipesCount || 0) / total) * 100;
    const crit = ((summary?.criticalHighCostCount || 0) / total) * 100;
    return { opt, warn, crit };
  }, [summary]);

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
            <span className="text-xs font-bold text-servora-navy">Recipe Costing & Margins</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Utensils className="text-servora-core" size={22} />
            Food Costing & Recipe Margin Analytics
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Theoretical bill-of-materials (BOM) cost rollups, ingredient inflation sensitivity, and gross margin protection.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => handleExport('RECIPE_BOM_LEDGER')}
            disabled={isExporting}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Download size={13} />
            <span>{isExporting ? 'Exporting...' : 'Export BOM (CSV)'}</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh Food Costing"
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
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
            <Calendar size={13} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-[11px] font-mono font-bold text-servora-navy focus:outline-none"
            />
            <span className="text-gray-400 font-mono">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-[11px] font-mono font-bold text-servora-navy focus:outline-none"
            />
          </div>

          <select
            value={costHealthFilter}
            onChange={(e) => setCostHealthFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Cost Health Profiles</option>
            <option value="OPTIMAL">Optimal (&lt;28% Cost)</option>
            <option value="WARNING">Warning (28% - 35% Cost)</option>
            <option value="CRITICAL_HIGH_COST">Critical High Cost (&gt;35%)</option>
          </select>

          {branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Branch Kitchens</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 3. CULINARY MARGIN EXECUTIVE KPI RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Avg Portfolio Food Cost</span>
          <p className="text-xl font-bold font-mono text-servora-navy mt-1">
            {summary ? `${summary.avgFoodCostPercent}%` : '0.0%'}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">
            Target Benchmark: &lt;30%
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Optimal Margin Items</span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {summary ? summary.optimalRecipesCount : 0}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">&lt;28% Food Cost Profile</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Warning Cost Range</span>
          <p className="text-xl font-bold font-mono text-amber-600 mt-1">
            {summary ? summary.warningRecipesCount : 0}
          </p>
          <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">28% &ndash; 35% Threshold</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Critical High-Cost</span>
          <p className="text-xl font-bold font-mono text-rose-600 mt-1">
            {summary ? summary.criticalHighCostCount : 0}
          </p>
          <span className="text-[10px] text-rose-600 font-medium mt-0.5 block">&gt;35% Margin Erosion</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Potential Optimization</span>
          <p className="text-xl font-bold font-mono text-purple-700 mt-1">
            KES {summary ? summary.potentialMarginSavings.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Formulaic Savings Target</span>
        </div>
      </div>

      {/* 4. VISUAL DISTRIBUTION BAR & TOP INGREDIENT INFLATION SENSITIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Health Distribution Meter (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-2.5 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Menu Recipe Health Distribution</h3>
              <p className="text-[10px] text-gray-400">Proportion of menu items meeting target cost</p>
            </div>
            <ChefHat size={16} className="text-servora-core" />
          </div>

          <div className="space-y-3">
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div style={{ width: `${healthRatios.opt}%` }} className="bg-emerald-500 h-full transition-all" />
              <div style={{ width: `${healthRatios.warn}%` }} className="bg-amber-500 h-full transition-all" />
              <div style={{ width: `${healthRatios.crit}%` }} className="bg-rose-500 h-full transition-all" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-gray-600">Optimal ({summary?.optimalRecipesCount || 0})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-gray-600">Warning ({summary?.warningRecipesCount || 0})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span className="text-gray-600">Critical ({summary?.criticalHighCostCount || 0})</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <span className="font-bold text-xs text-servora-navy block mb-2">Category Food Cost Benchmarks:</span>
            <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
              {categoryCostSummary.map((cat, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-1.5 rounded-lg bg-slate-50 border border-gray-100">
                  <span className="font-medium text-servora-navy truncate max-w-[150px]">{cat.category}</span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-gray-500">{cat.recipeCount} recipes</span>
                    <span className={`font-bold ${cat.categoryFoodCostPercent > 35 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {cat.categoryFoodCostPercent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Cost Drivers (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-2.5 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Top Raw Ingredient Cost Drivers</h3>
              <p className="text-[10px] text-gray-400">Inventory items with highest aggregate usage cost across recipes</p>
            </div>
            <button
              onClick={() => handleExport('CATEGORY_MARGIN_SUMMARY')}
              className="text-[10px] font-bold text-servora-core hover:underline cursor-pointer"
            >
              Export Summary
            </button>
          </div>

          <div className="space-y-3">
            {highImpactIngredients.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">No ingredient sensitivity data available.</p>
            ) : (
              highImpactIngredients.map((ing, idx) => {
                const maxCost = highImpactIngredients[0]?.totalUsageCost || 1;
                const ratio = Math.min(100, Math.max(10, Math.round((ing.totalUsageCost / maxCost) * 100)));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-servora-navy">
                        <span>{ing.name}</span>
                        <span className="text-[10px] font-normal text-gray-400 font-mono">
                          (Used in {ing.recipeCount} recipes)
                        </span>
                      </div>
                      <span className="font-mono font-bold text-servora-navy text-[11px]">
                        KES {ing.totalUsageCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
      </div>

      {/* 5. RECIPE BOM & PROFITABILITY MATRIX */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-xs text-servora-navy uppercase tracking-wider">
              Recipe Costing & Portion Margin Matrix ({items.length} Costed Items)
            </h3>
            <p className="text-[10px] text-gray-400">Live bill-of-materials theoretical costs versus POS sales</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="FOOD_COST_PERCENT">Highest Food Cost %</option>
              <option value="THEORETICAL_COST">Highest Portion Cost</option>
              <option value="RECIPE_PROFIT">Highest Margin (KES)</option>
              <option value="NAME">Sort by Name</option>
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="Search recipe..."
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
                <th className="py-2.5 px-3">Menu Item</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Selling Price</th>
                <th className="py-2.5 px-3 text-right">Portion Cost</th>
                <th className="py-2.5 px-3 text-right">Gross Margin</th>
                <th className="py-2.5 px-3 text-right">Food Cost %</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Units Sold</th>
                <th className="py-2.5 px-3 text-right">Total Cost of Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 italic">
                    {isLoading ? 'Computing live bill-of-materials costing...' : 'No active recipes mapped to selected criteria.'}
                  </td>
                </tr>
              ) : (
                items.map((recipe) => {
                  const cfg = HEALTH_CONFIG[recipe.costHealth];
                  return (
                    <tr key={recipe.menuItemId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{recipe.name}</span>
                        <span className="font-mono text-[10px] text-gray-400">
                          SKU: {recipe.sku} &bull; {recipe.ingredientCount} ingredients
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 font-medium">
                        {recipe.categoryName}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                        KES {recipe.sellingPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-700">
                        KES {recipe.theoreticalPortionCost.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        KES {recipe.grossProfit.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className={recipe.foodCostPercent > 35 ? 'text-rose-600' : recipe.foodCostPercent >= 28 ? 'text-amber-600' : 'text-emerald-600'}>
                          {recipe.foodCostPercent}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-600">
                        {recipe.unitsSoldPeriod.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-core">
                        KES {recipe.totalCostOfSalesPeriod.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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