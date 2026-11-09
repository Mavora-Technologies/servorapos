'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Boxes,
  TrendingDown,
  AlertTriangle,
  Download,
  RefreshCw,
  ChevronRight,
  Search,
  Filter,
  Package,
  Layers,
  Thermometer,
  Trash2,
  Building2,
  Calendar,
  CheckCircle2,
  ArrowUpDown,
  DollarSign,
  AlertOctagon,
  Clock,
  Sparkles,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface InventoryItemRecord {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string;
  materialType: string;
  unit: string;
  costPrice: number;
  minThreshold: number;
  reorderQuantity: number;
  currentStock: number;
  valuationMethod: string;
  storageCondition: string;
  allowNegativeStock: boolean;
  totalValuation: number;
  supplierName: string | null;
  branchName: string | null;
  healthStatus: 'HEALTHY' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

interface CategoryBreakdownItem {
  category: string;
  itemCount: number;
  totalStockQty: number;
  totalValuation: number;
}

interface DepartmentalWasteItem {
  department: string;
  totalLossCost: number;
  incidentCount: number;
}

interface ExpiringBatchItem {
  batchId: number;
  batchNumber: string;
  itemName: string;
  currentQuantity: number;
  unitCost: number;
  expiryDate: string;
  daysRemaining: number;
  atRiskValuation: number;
  status: string;
}

interface InventorySummary {
  totalSkus: number;
  totalBookValuation: number;
  outOfStockCount: number;
  lowStockCount: number;
  healthyStockCount: number;
  totalWasteCost: number;
  wasteIncidentCount: number;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

const HEALTH_BADGES: Record<InventoryItemRecord['healthStatus'], { label: string; bg: string; text: string }> = {
  HEALTHY: { label: 'Adequate', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  LOW_STOCK: { label: 'Reorder Urgently', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  OUT_OF_STOCK: { label: 'Depleted', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
};

export default function InventoryReportPage() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [items, setItems] = useState<InventoryItemRecord[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [departmentalWaste, setDepartmentalWaste] = useState<DepartmentalWasteItem[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatchItem[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Filters & Sorting State
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('ALL');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'VALUATION' | 'STOCK_LEVEL' | 'NAME'>('VALUATION');

  const [datePreset, setDatePreset] = useState<'THIS_MONTH' | 'LAST_30_DAYS' | 'ALL_TIME'>('THIS_MONTH');
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
      if (stockStatusFilter !== 'ALL') params.set('stockStatus', stockStatusFilter);
      if (materialTypeFilter !== 'ALL') params.set('materialType', materialTypeFilter);
      params.set('sortBy', sortBy);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const [reportRes, branchRes] = await Promise.all([
        fetchApi(`/api/v1/reports/inventory?${params.toString()}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (reportRes?.data) {
        setSummary(reportRes.data.summary);
        setItems(reportRes.data.items || []);
        setCategoryBreakdown(reportRes.data.categoryBreakdown || []);
        setDepartmentalWaste(reportRes.data.departmentalWaste || []);
        setExpiringBatches(reportRes.data.expiringBatches || []);
      }

      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load inventory valuation report:', err);
      setErrorMessage(err.message || 'Failed to aggregate inventory metrics.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, startDate, endDate, stockStatusFilter, materialTypeFilter, sortBy, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    if (stockStatusFilter === 'ALL') return items;
    return items.filter((i) => i.healthStatus === stockStatusFilter);
  }, [items, stockStatusFilter]);

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

  const handleExport = async (exportType: 'STOCK_ON_HAND' | 'WASTE_SCRAP_LEDGER' | 'BATCH_EXPIRY_SCHEDULE') => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      params.set('exportType', exportType);
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (materialTypeFilter !== 'ALL') params.set('materialType', materialTypeFilter);

      const token = getAuthToken();
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${apiBaseUrl}/api/v1/reports/inventory/export?${params.toString()}`, {
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
      a.download = `inventory-report-${exportType.toLowerCase()}-${Date.now()}.csv`;
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
            <span className="text-xs font-bold text-servora-navy">Inventory Valuation & Waste</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Boxes className="text-servora-core" size={22} />
            Inventory Valuation & Depletion Analysis
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Audit inventory asset valuations, stock-out vulnerabilities, cold-chain batch expiration dates, and departmental waste write-offs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => handleExport('STOCK_ON_HAND')}
            disabled={isExporting}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Download size={13} />
            <span>{isExporting ? 'Exporting...' : 'Export Stock (CSV)'}</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh Inventory Valuation"
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
            value={materialTypeFilter}
            onChange={(e) => setMaterialTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Material Types</option>
            <option value="RAW_MATERIAL">Raw Materials</option>
            <option value="SEMI_FINISHED">Semi-Finished Prep</option>
            <option value="FINISHED_GOOD">Finished Products</option>
            <option value="CONSUMABLE">Consumables & Packaging</option>
          </select>

          {branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Branch Warehouses</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 3. INVENTORY VALUATION KPI RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Total Asset Valuation</span>
          <p className="text-xl font-bold font-mono text-servora-navy mt-1">
            KES {summary ? summary.totalBookValuation.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">{summary?.totalSkus || 0} Catalog SKUs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Stock Depletions</span>
          <p className="text-xl font-bold font-mono text-rose-600 mt-1">
            {summary ? summary.outOfStockCount : 0}
          </p>
          <span className="text-[10px] text-rose-600 font-medium mt-0.5 block">Zero Stock Level</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Reorder Warnings</span>
          <p className="text-xl font-bold font-mono text-amber-600 mt-1">
            {summary ? summary.lowStockCount : 0}
          </p>
          <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">Below Par Min Threshold</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Adequate Inventory</span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {summary ? summary.healthyStockCount : 0}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Sufficient Headroom</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Spoilage & Waste Loss</span>
          <p className="text-xl font-bold font-mono text-purple-700 mt-1">
            KES {summary ? summary.totalWasteCost.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">{summary?.wasteIncidentCount || 0} Scrap Logged</span>
        </div>
      </div>

      {/* 4. VISUAL TILES: BATCH EXPIRY RADAR & CATEGORY ASSET DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Batch Expiration Radar (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Critical Batch Expiry Radar</h3>
              <p className="text-[10px] text-gray-400">Batches expiring within the next 30 days</p>
            </div>
            <button
              onClick={() => handleExport('BATCH_EXPIRY_SCHEDULE')}
              className="text-[10px] font-bold text-servora-core hover:underline cursor-pointer"
            >
              Export
            </button>
          </div>

          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {expiringBatches.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">No active batches near expiration.</p>
            ) : (
              expiringBatches.map((batch) => {
                const isUrgent = batch.daysRemaining <= 7;
                return (
                  <div
                    key={batch.batchId}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      isUrgent ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/70 border-gray-100'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-servora-navy block">{batch.itemName}</span>
                      <span className="font-mono text-[10px] text-gray-400">
                        Lot: {batch.batchNumber} &bull; Qty: {batch.currentQuantity}
                      </span>
                    </div>

                    <div className="text-right font-mono">
                      <span
                        className={`font-bold block text-[11px] ${
                          isUrgent ? 'text-rose-600' : 'text-amber-600'
                        }`}
                      >
                        {batch.daysRemaining <= 0 ? 'Expired Today' : `${batch.daysRemaining} days left`}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        KES {batch.atRiskValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Category Asset Share (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Capitalization by Storage Category</h3>
              <p className="text-[10px] text-gray-400">Proportion of financial assets tied up in inventory</p>
            </div>
            <button
              onClick={() => handleExport('WASTE_SCRAP_LEDGER')}
              className="text-[10px] font-bold text-servora-core hover:underline cursor-pointer"
            >
              Export Waste
            </button>
          </div>

          <div className="space-y-3">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">No inventory valuation recorded.</p>
            ) : (
              categoryBreakdown.map((cat, idx) => {
                const maxVal = categoryBreakdown[0]?.totalValuation || 1;
                const ratio = Math.min(100, Math.max(8, Math.round((cat.totalValuation / maxVal) * 100)));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-servora-navy">
                        <span>{cat.category}</span>
                        <span className="text-[10px] font-normal text-gray-400 font-mono">
                          ({cat.itemCount} SKUs &bull; {cat.totalStockQty.toLocaleString()} units)
                        </span>
                      </div>
                      <span className="font-mono font-bold text-servora-navy text-[11px]">
                        KES {cat.totalValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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

      {/* 5. MASTER STOCK-ON-HAND MATRIX */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-xs text-servora-navy uppercase tracking-wider">
              Stock-on-Hand Ledger ({filteredItems.length} Materials)
            </h3>
            <p className="text-[10px] text-gray-400">Physical counts, par levels, and unit cost valuations</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="HEALTHY">Adequate Level</option>
              <option value="LOW_STOCK">Below Par Threshold</option>
              <option value="OUT_OF_STOCK">Depleted (0 Count)</option>
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="Search material SKU..."
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
                <th className="py-2.5 px-3">Material Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Physical Stock</th>
                <th className="py-2.5 px-3">Base Unit</th>
                <th className="py-2.5 px-3 text-right">Unit Cost</th>
                <th className="py-2.5 px-3 text-right">Book Value</th>
                <th className="py-2.5 px-3 text-right">Par Min</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Storage Condition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 italic">
                    {isLoading ? 'Aggregating physical stock balances...' : 'No inventory items match active criteria.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const badge = HEALTH_BADGES[item.healthStatus];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{item.name}</span>
                        <span className="font-mono text-[10px] text-gray-400">SKU: {item.sku || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 font-medium">
                        {item.category}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                        {item.currentStock.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-500">
                        {item.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-700">
                        KES {item.costPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-core">
                        KES {item.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-400">
                        {item.minThreshold.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-slate-100 text-gray-600 border border-gray-200">
                          {item.storageCondition}
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