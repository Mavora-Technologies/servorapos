// apps/web/app/(dashboard)/menu/recipes/costing/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Search,
  Sliders,
  X,
  PieChart,
  RefreshCw,
  CheckCircle2,
  Package,
  ChefHat,
  Save,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

type MarginFilter = 'ALL' | 'HEALTHY' | 'ALERT' | 'UNCOSTED';
type TaxBasis = 'NET' | 'GROSS';
type MenuMatrixClass = 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG' | 'NO_SALES';

interface IngredientCostDetail {
  id: number;
  ingredientName: string;
  quantity: string;
  unit: string;
  unitCost: string;
  lineCost: number;
  wastagePercentage: string;
}

interface CostingItem {
  menuItemId: number;
  itemName: string;
  sku: string | null;
  category: string;
  stockTrackingType: string;
  costSource: 'RECIPE_BOM' | 'DIRECT_STOCK' | 'UNCOSTED';
  yieldPortions: number;
  isTaxInclusive: boolean;
  combinedTaxPercent: number;
  retailPrice: number;
  netSellingPrice: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
  foodCostPercent: number;
  targetPrice: number;
  hasRecipe: boolean;
  unitsSold: number;
  periodContributionMargin: number;
  matrixClass: MenuMatrixClass;
  ingredients: IngredientCostDetail[];
}

interface CostingSummary {
  totalDishes: number;
  formulatedDishes: number;
  uncostedDishes: number;
  averageMargin: number;
  weightedFoodCostPercent: number;
  highMarginCount: number;
  lowMarginCount: number;
  totalCogs: number;
  totalPeriodUnitsSold: number;
  totalContributionMargin: number;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

const MATRIX_BADGE_STYLES: Record<MenuMatrixClass, { label: string; cls: string }> = {
  STAR: { label: 'Star', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PLOWHORSE: { label: 'Plowhorse', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  PUZZLE: { label: 'Puzzle', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  DOG: { label: 'Dog', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  NO_SALES: { label: 'No Sales', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export default function RecipeCostingPage() {
  const [items, setItems] = useState<CostingItem[]>([]);
  const [summary, setSummary] = useState<CostingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Feedback States
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Engine Controls & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [marginFilter, setMarginFilter] = useState<MarginFilter>('ALL');
  const [taxBasis, setTaxBasis] = useState<TaxBasis>('NET');
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(70);

  // Simulator Modal State
  const [selectedItem, setSelectedItem] = useState<CostingItem | null>(null);
  const [simulatedPrice, setSimulatedPrice] = useState<string>('0');
  const [ingredientCostOffset, setIngredientCostOffset] = useState<number>(0);
  const [isApplyingPrice, setIsApplyingPrice] = useState(false);

  const loadCosting = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        taxBasis,
        targetMarginPercent: String(targetMarginPercent),
        periodDays: '30',
      });
      const res = await fetchApi(`/api/v1/menu/recipes/costing?${params.toString()}`);
      if (res?.data && Array.isArray(res.data.items)) {
        setItems(res.data.items);
        setSummary(res.data.summary || null);
      } else {
        setItems([]);
        setSummary(null);
        setLoadError('Unexpected response structure received from costing analytics API.');
      }
    } catch (err: unknown) {
      setItems([]);
      setSummary(null);
      setLoadError(getErrorMessage(err, 'Failed to load food cost and margin matrix.'));
    } finally {
      setIsLoading(false);
    }
  }, [taxBasis, targetMarginPercent]);

  useEffect(() => {
    loadCosting();
  }, [loadCosting]);

  const categoriesList = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort(),
    [items]
  );

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.itemName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q));
      const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchesMargin =
        marginFilter === 'ALL' ||
        (marginFilter === 'HEALTHY' && item.hasRecipe && item.marginPercent >= 65) ||
        (marginFilter === 'ALERT' && item.hasRecipe && item.marginPercent < 65) ||
        (marginFilter === 'UNCOSTED' && !item.hasRecipe);

      return matchesSearch && matchesCat && matchesMargin;
    });
  }, [items, searchTerm, categoryFilter, marginFilter]);

  const openSimulator = (item: CostingItem) => {
    setSelectedItem(item);
    setSimulatedPrice(String(item.retailPrice));
    setIngredientCostOffset(0);
    setActionError(null);
  };

  // Live Simulator Calculations (respecting Kenyan VAT + Catering Levy basis)
  const simCalculations = useMemo(() => {
    if (!selectedItem) {
      return { simNetPrice: 0, simCogs: 0, simGrossProfit: 0, simMargin: 0, simFoodCost: 0 };
    }
    const shelf = parseFloat(simulatedPrice) || 0;
    const taxMultiplier =
      taxBasis === 'NET' && selectedItem.isTaxInclusive
        ? 1 + selectedItem.combinedTaxPercent / 100
        : 1;
    const simNetPrice = shelf / taxMultiplier;
    const simCogs = selectedItem.cogs * (1 + ingredientCostOffset / 100);
    const simGrossProfit = simNetPrice - simCogs;
    const simMargin = simNetPrice > 0 ? (simGrossProfit / simNetPrice) * 100 : 0;
    const simFoodCost = simNetPrice > 0 ? (simCogs / simNetPrice) * 100 : 0;

    return { simNetPrice, simCogs, simGrossProfit, simMargin, simFoodCost };
  }, [selectedItem, simulatedPrice, ingredientCostOffset, taxBasis]);

  const handleApplySimulatedPrice = async () => {
    if (!selectedItem || isApplyingPrice) return;
    const nextPrice = parseFloat(simulatedPrice);
    if (Number.isNaN(nextPrice) || nextPrice <= 0) {
      setActionError('Simulated price must be greater than zero.');
      return;
    }

    setIsApplyingPrice(true);
    setActionError(null);
    try {
      await fetchApi('/api/v1/menu/pricing/bulk', {
        method: 'PUT',
        body: JSON.stringify({
          updates: [{ id: selectedItem.menuItemId, price: nextPrice }],
        }),
      });
      const updatedName = selectedItem.itemName;
      setSelectedItem(null);
      setStatusBanner(
        `Applied new POS shelf price KES ${nextPrice.toLocaleString()} to "${updatedName}".`
      );
      await loadCosting();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to apply simulated price.'));
    } finally {
      setIsApplyingPrice(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banners */}
      {statusBanner && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-900"
        >
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            aria-label="Dismiss notification"
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-900"
        >
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
            className="text-rose-700 hover:text-rose-950"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Top Banner Navigation & Aggregate KPI Telemetry */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/menu/recipes"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft size={13} /> Back to Standard Recipes &amp; BOM
            </Link>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">
            Food Cost &amp; Margin Matrix
          </h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Net-of-tax Food Cost % (FC%), 30-day Menu Engineering quadrants, and supplier inflation modeling.
          </p>
        </div>

        {summary && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center min-w-[100px]">
              <span className="block text-xs font-mono font-bold text-emerald-800">
                {summary.averageMargin}%
              </span>
              <span className="text-[10px] text-emerald-600 font-medium uppercase">
                Avg Margin
              </span>
            </div>
            <div className="px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-xl text-center min-w-[100px]">
              <span className="block text-xs font-mono font-bold text-blue-800">
                {summary.weightedFoodCostPercent}%
              </span>
              <span className="text-[10px] text-blue-600 font-medium uppercase">
                Portfolio FC%
              </span>
            </div>
            <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-center min-w-[100px]">
              <span className="block text-xs font-mono font-bold text-amber-800">
                {summary.lowMarginCount} Alert
              </span>
              <span className="text-[10px] text-amber-600 font-medium uppercase">
                &lt;65% Margin
              </span>
            </div>
            <button
              type="button"
              onClick={loadCosting}
              disabled={isLoading}
              title="Refresh costing matrix"
              className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-servora-deepTeal disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* Filter, Tax Basis & Target Margin Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              aria-label="Search menu items, SKUs, or categories"
              placeholder="Search item, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white font-medium text-servora-navy focus:border-servora-core focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            aria-label="Revenue basis for margin calculation"
            value={taxBasis}
            onChange={(e) => setTaxBasis(e.target.value as TaxBasis)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-slate-50 font-bold text-servora-navy focus:border-servora-core focus:outline-none"
          >
            <option value="NET">Net Revenue (ex-VAT &amp; Levy)</option>
            <option value="GROSS">Gross Shelf Price</option>
          </select>

          <select
            aria-label="Target gross margin benchmark"
            value={targetMarginPercent}
            onChange={(e) => setTargetMarginPercent(Number(e.target.value))}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-slate-50 font-bold text-servora-navy focus:border-servora-core focus:outline-none"
          >
            <option value={65}>Target: 65% Margin</option>
            <option value={70}>Target: 70% Margin</option>
            <option value={75}>Target: 75% Margin</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {(
            [
              { id: 'ALL', label: `All (${items.length})` },
              { id: 'HEALTHY', label: 'Healthy (≥65%)' },
              { id: 'ALERT', label: 'Review (<65%)' },
              { id: 'UNCOSTED', label: `Uncosted (${summary?.uncostedDishes ?? 0})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMarginFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                marginFilter === tab.id
                  ? 'bg-white shadow-xs text-servora-navy font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Analyzing recipe BOMs, direct stock costs, and 30-day sales mix...
          </div>
        ) : loadError ? (
          <div role="alert" className="p-12 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={20} />
            </div>
            <p className="text-xs font-bold text-rose-800">{loadError}</p>
            <button
              type="button"
              onClick={loadCosting}
              className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
            >
              Retry Request
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No menu items matched your active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-servora-deepTeal font-bold uppercase tracking-wider text-[11px]">
                  <th scope="col" className="py-3.5 px-4">Menu Item &amp; Basis</th>
                  <th scope="col" className="py-3.5 px-4">
                    Shelf / {taxBasis === 'NET' ? 'Net' : 'Gross'} Price
                  </th>
                  <th scope="col" className="py-3.5 px-4">COGS / Portion</th>
                  <th scope="col" className="py-3.5 px-4">Gross Profit</th>
                  <th scope="col" className="py-3.5 px-4">FC% / Margin</th>
                  <th scope="col" className="py-3.5 px-4">30d Mix &amp; Matrix</th>
                  <th scope="col" className="py-3.5 px-4">Target {targetMarginPercent}% Shelf</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => {
                  const isHealthy = item.marginPercent >= 65;
                  const matrixBadge = MATRIX_BADGE_STYLES[item.matrixClass];

                  return (
                    <tr key={item.menuItemId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-servora-navy block">{item.itemName}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-gray-400 uppercase font-semibold">
                            {item.category}
                          </span>
                          {item.costSource === 'DIRECT_STOCK' ? (
                            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                              <Package size={9} /> Stocked
                            </span>
                          ) : item.costSource === 'RECIPE_BOM' ? (
                            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                              <ChefHat size={9} /> BOM
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-servora-navy block">
                          KES {item.retailPrice.toLocaleString()}
                        </span>
                        {taxBasis === 'NET' && item.isTaxInclusive && (
                          <span className="text-[10px] text-gray-400">
                            Net: KES {item.netSellingPrice.toFixed(2)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {item.hasRecipe ? (
                          <span className="font-semibold text-rose-600">
                            KES {item.cogs.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic font-sans">Uncosted</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {item.hasRecipe ? (
                          <span className="font-semibold text-emerald-700">
                            KES {item.grossProfit.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.hasRecipe ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                                item.foodCostPercent <= 35
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {item.foodCostPercent}% FC
                            </span>
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-mono font-bold text-[11px] border ${
                                isHealthy
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {!isHealthy && <AlertTriangle size={10} />}
                              {item.marginPercent}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-servora-navy">
                            {item.unitsSold} sold
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${matrixBadge.cls}`}
                          >
                            {matrixBadge.label}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {item.hasRecipe ? (
                          <span
                            className={
                              item.targetPrice > item.retailPrice
                                ? 'font-bold text-amber-700'
                                : 'text-gray-600'
                            }
                          >
                            KES {item.targetPrice.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {item.hasRecipe ? (
                          <button
                            type="button"
                            onClick={() => openSimulator(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-servora-core hover:bg-servora-pale rounded-lg transition-colors cursor-pointer"
                          >
                            <Sliders size={13} /> Simulate
                          </button>
                        ) : (
                          <Link
                            href="/menu/recipes"
                            className="text-xs font-semibold text-servora-core hover:underline"
                          >
                            + Formulate
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PROFITABILITY & PRICE ELASTICITY SIMULATOR MODAL */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="simulator-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-servora-pale text-servora-core flex items-center justify-center">
                  <Sliders size={18} />
                </div>
                <div>
                  <h2 id="simulator-modal-title" className="text-sm font-bold text-servora-navy">
                    Recipe Profitability &amp; Repricing Simulator
                  </h2>
                  <p className="text-[11px] text-servora-deepTeal">
                    {selectedItem.itemName} &bull;{' '}
                    {taxBasis === 'NET'
                      ? `Net of ${selectedItem.combinedTaxPercent}% VAT & Levy`
                      : 'Gross Shelf Price Basis'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Close simulator"
                className="text-gray-400 hover:text-servora-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[82vh] overflow-y-auto">
              {/* Simulation Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <label
                    className="block text-xs font-bold text-servora-navy mb-1.5"
                    htmlFor="sim-price-input"
                  >
                    Simulated Shelf Price (KES)
                  </label>
                  <input
                    id="sim-price-input"
                    type="number"
                    step="10"
                    min="0"
                    value={simulatedPrice}
                    onChange={(e) => setSimulatedPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-gray-300 rounded-xl focus:border-servora-core focus:outline-none bg-white"
                  />
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                    <span>Current: KES {selectedItem.retailPrice.toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => setSimulatedPrice(String(selectedItem.targetPrice))}
                      className="text-servora-core font-bold hover:underline cursor-pointer"
                    >
                      Use Target ({selectedItem.targetPrice})
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1.5" htmlFor="sim-inflation">
                    Supplier Cost Change:{' '}
                    {ingredientCostOffset > 0
                      ? `+${ingredientCostOffset}%`
                      : `${ingredientCostOffset}%`}
                  </label>
                  <input
                    id="sim-inflation"
                    type="range"
                    min="-30"
                    max="50"
                    step="5"
                    value={ingredientCostOffset}
                    onChange={(e) => setIngredientCostOffset(Number(e.target.value))}
                    className="w-full accent-servora-core cursor-pointer mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>-30% cut</span>
                    <span>Base</span>
                    <span>+50% inflation</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Impact Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-gray-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    {taxBasis === 'NET' ? 'Net Revenue' : 'Gross Price'}
                  </span>
                  <span className="text-xs font-bold text-servora-navy font-mono">
                    KES {simCalculations.simNetPrice.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-gray-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Simulated COGS
                  </span>
                  <span className="text-xs font-bold text-rose-600 font-mono">
                    KES {simCalculations.simCogs.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-gray-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Gross Profit
                  </span>
                  <span className="text-xs font-bold text-emerald-700 font-mono">
                    KES {simCalculations.simGrossProfit.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-gray-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Margin / FC%
                  </span>
                  <span
                    className={`text-xs font-bold font-mono ${
                      simCalculations.simMargin >= 65 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {simCalculations.simMargin.toFixed(1)}% ({simCalculations.simFoodCost.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Per-Portion Ingredient Cost Contributions */}
              <div>
                <h4 className="text-xs font-bold text-servora-navy mb-2 flex items-center gap-1.5">
                  <PieChart size={14} className="text-servora-core" />
                  Per-Portion Cost Contribution
                </h4>
                <div className="space-y-1.5">
                  {selectedItem.ingredients.map((ing) => {
                    const adjustedCost = ing.lineCost * (1 + ingredientCostOffset / 100);
                    const costShare =
                      simCalculations.simCogs > 0
                        ? ((adjustedCost / simCalculations.simCogs) * 100).toFixed(1)
                        : '0.0';

                    return (
                      <div
                        key={ing.id}
                        className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-100 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-servora-navy">
                            {ing.ingredientName}
                          </span>
                          <span className="text-[11px] text-gray-400 ml-2">
                            ({parseFloat(ing.quantity)} {ing.unit} @ KES{' '}
                            {parseFloat(ing.unitCost).toFixed(2)}
                            {parseFloat(ing.wastagePercentage) > 0
                              ? `, +${parseFloat(ing.wastagePercentage)}% waste`
                              : ''}
                            )
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-servora-navy">
                            KES {adjustedCost.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            {costShare}% of COGS
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 text-xs font-semibold bg-gray-100 text-servora-navy rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleApplySimulatedPrice}
                  disabled={
                    isApplyingPrice ||
                    Math.abs((parseFloat(simulatedPrice) || 0) - selectedItem.retailPrice) < 0.01
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <Save size={13} />
                  {isApplyingPrice ? 'Applying...' : 'Apply Simulated Price to POS'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}