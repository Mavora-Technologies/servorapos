'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  BrainCircuit,
  TrendingUp,
  DollarSign,
  UtensilsCrossed,
  ArrowUpRight,
  Star,
  Award,
  AlertTriangle,
  HelpCircle,
  Scissors,
  CheckCircle2,
  RefreshCw,
  Search,
  ChevronRight,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface MenuItemAnalysis {
  id: number;
  name: string;
  categoryName: string;
  unitsSold: number;
  sellingPriceKes: number;
  foodCostKes: number;
  contributionMarginKes: number;
  grossRevenueKes: number;
  foodCostPercentage: number;
  popularitySharePct: number;
  classification: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG';
  recommendationType: string;
  suggestedPriceAdjustmentKes: number;
  strategicNote: string;
}

interface MenuAnalysisTelemetry {
  kpis: {
    totalMenuItems: number;
    starsCount: number;
    plowhorsesCount: number;
    puzzlesCount: number;
    dogsCount: number;
    avgContributionMarginKes: number;
    avgFoodCostPercentage: number;
    benchmarks: {
      unitsThreshold: number;
      marginThresholdKes: number;
    };
  };
  items: MenuItemAnalysis[];
}

const CLASSIFICATION_CONFIG = {
  STAR: {
    label: 'Star',
    icon: Star,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'High Popularity & High Margin',
  },
  PLOWHORSE: {
    label: 'Plowhorse',
    icon: Award,
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'High Popularity & Low Margin',
  },
  PUZZLE: {
    label: 'Puzzle',
    icon: HelpCircle,
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    desc: 'Low Popularity & High Margin',
  },
  DOG: {
    label: 'Dog',
    icon: Scissors,
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: 'Low Popularity & Low Margin',
  },
};

export default function MenuAnalysisPage() {
  const [telemetry, setTelemetry] = useState<MenuAnalysisTelemetry | null>(null);
  const [timeframeDays, setTimeframeDays] = useState<number>(30);
  const [classificationFilter, setClassificationFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Price Adjustment Modal State
  const [selectedItemToReprice, setSelectedItemToReprice] = useState<MenuItemAnalysis | null>(null);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('timeframeDays', String(timeframeDays));
      if (classificationFilter !== 'ALL') params.set('classification', classificationFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetchApi(`/api/v1/ai-assistant/menu-analysis?${params.toString()}`);
      if (res?.data) {
        setTelemetry(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load menu engineering telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeframeDays, classificationFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenReprice = (item: MenuItemAnalysis) => {
    setSelectedItemToReprice(item);
    setNewPrice(item.sellingPriceKes + item.suggestedPriceAdjustmentKes);
  };

  const handleApplyReprice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemToReprice) return;

    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const res = await fetchApi('/api/v1/ai-assistant/menu-analysis/apply-price', {
        method: 'POST',
        body: JSON.stringify({
          menuItemId: selectedItemToReprice.id,
          newSellingPriceKes: newPrice,
          justificationNote: `AI Menu Optimization: adjusted from KES ${selectedItemToReprice.sellingPriceKes} to KES ${newPrice}`,
        }),
      });

      setSelectedItemToReprice(null);
      setToastMessage({ text: res.message || 'Selling price updated.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to apply price update');
    } finally {
      setIsSubmitting(false);
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
              href="/ai-assistant"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              AI Copilot <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Menu Engineering Matrix</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Sparkles className="text-servora-core" size={24} />
            Kasavana & Smith Menu Engineering Matrix
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Algorithmic classification into Stars, Plowhorses, Puzzles, and Dogs based on contribution margin and sales velocity.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <Link
            href="/menu"
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <UtensilsCrossed size={14} className="text-servora-core" />
            Menu Master Catalog
          </Link>
          <button
            onClick={loadData}
            title="Recalculate Matrix"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. KASAVANA & SMITH 4-QUADRANT MATRIX RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setClassificationFilter(classificationFilter === 'STAR' ? 'ALL' : 'STAR')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            classificationFilter === 'STAR'
              ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/20'
              : 'bg-white border-gray-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Stars</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Star size={16} fill="currentColor" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-servora-navy mt-1">
            {telemetry ? telemetry.kpis.starsCount : 0} Items
          </p>
          <span className="text-[10px] text-gray-500 font-medium">High Volume &bull; High Margin</span>
        </button>

        <button
          type="button"
          onClick={() => setClassificationFilter(classificationFilter === 'PLOWHORSE' ? 'ALL' : 'PLOWHORSE')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            classificationFilter === 'PLOWHORSE'
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/20'
              : 'bg-white border-gray-200 hover:border-blue-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Plowhorses</span>
            <div className="p-2 bg-blue-50 text-servora-core rounded-xl">
              <Award size={16} />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-servora-navy mt-1">
            {telemetry ? telemetry.kpis.plowhorsesCount : 0} Items
          </p>
          <span className="text-[10px] text-gray-500 font-medium">High Volume &bull; Low Margin</span>
        </button>

        <button
          type="button"
          onClick={() => setClassificationFilter(classificationFilter === 'PUZZLE' ? 'ALL' : 'PUZZLE')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            classificationFilter === 'PUZZLE'
              ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-400/20'
              : 'bg-white border-gray-200 hover:border-purple-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Puzzles</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <HelpCircle size={16} />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-servora-navy mt-1">
            {telemetry ? telemetry.kpis.puzzlesCount : 0} Items
          </p>
          <span className="text-[10px] text-gray-500 font-medium">Low Volume &bull; High Margin</span>
        </button>

        <button
          type="button"
          onClick={() => setClassificationFilter(classificationFilter === 'DOG' ? 'ALL' : 'DOG')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            classificationFilter === 'DOG'
              ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-400/20'
              : 'bg-white border-gray-200 hover:border-rose-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Dogs</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Scissors size={16} />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-servora-navy mt-1">
            {telemetry ? telemetry.kpis.dogsCount : 0} Items
          </p>
          <span className="text-[10px] text-gray-500 font-medium">Low Volume &bull; Low Margin</span>
        </button>
      </div>

      {/* 3. CONTROLS TOOLBAR & BENCHMARKS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={timeframeDays}
            onChange={(e) => setTimeframeDays(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="14">Last 14 Days</option>
            <option value="30">Last 30 Days (Standard Audit)</option>
            <option value="60">Last 60 Days</option>
            <option value="90">Last 90 Days (Quarterly Cycle)</option>
          </select>

          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Matrix Quadrants</option>
            <option value="STAR">Stars Only</option>
            <option value="PLOWHORSE">Plowhorses Only</option>
            <option value="PUZZLE">Puzzles Only</option>
            <option value="DOG">Dogs Only</option>
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Search menu item or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-servora-core w-44 sm:w-64"
          />
        </div>
      </div>

      {/* 4. DETAILED MENU MATRIX LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Menu Item Profile</th>
                <th className="py-2.5 px-3">Quadrant Tier</th>
                <th className="py-2.5 px-3 text-right">Selling Price</th>
                <th className="py-2.5 px-3 text-right">Unit Food Cost</th>
                <th className="py-2.5 px-3 text-right">Contribution Margin</th>
                <th className="py-2.5 px-3 text-right">Units Sold</th>
                <th className="py-2.5 px-3 text-right">Gross Revenue</th>
                <th className="py-2.5 px-3">AI Strategic Action</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!telemetry || telemetry.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400 italic">
                    {isLoading ? 'Running matrix regression calculations...' : 'No menu items matching current filters.'}
                  </td>
                </tr>
              ) : (
                telemetry.items.map((item) => {
                  const classConfig = CLASSIFICATION_CONFIG[item.classification] || CLASSIFICATION_CONFIG.DOG;
                  const ClassIcon = classConfig.icon;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{item.name}</span>
                        <span className="text-[10px] font-mono text-gray-400">{item.categoryName}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase border ${classConfig.badge}`}>
                          <ClassIcon size={10} fill={item.classification === 'STAR' ? 'currentColor' : 'none'} />
                          {classConfig.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                        KES {item.sellingPriceKes.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-600">
                        KES {item.foodCostKes.toLocaleString()} ({item.foodCostPercentage}%)
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        KES {item.contributionMarginKes.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-700">
                        {item.unitsSold.toLocaleString()} ({item.popularitySharePct}%)
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-core">
                        KES {item.grossRevenueKes.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 max-w-[200px]">
                        <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                          {item.strategicNote}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {item.classification === 'PLOWHORSE' && item.suggestedPriceAdjustmentKes > 0 ? (
                          <button
                            onClick={() => handleOpenReprice(item)}
                            className="px-2.5 py-1 bg-servora-core text-white font-bold text-[11px] rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer shadow-xs ml-auto"
                          >
                            <Zap size={11} /> Reprice (+{item.suggestedPriceAdjustmentKes})
                          </button>
                        ) : item.classification === 'PUZZLE' ? (
                          <Link
                            href="/marketing/campaigns"
                            className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[11px] rounded-lg hover:bg-purple-100 transition-colors inline-block text-center"
                          >
                            Promote
                          </Link>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium">Optimized</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: APPLY RECOMMENDED PRICE ADJUSTMENT */}
      {selectedItemToReprice && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Reprice Menu Item</h3>
                <p className="text-[11px] text-gray-400">{selectedItemToReprice.name}</p>
              </div>
              <button onClick={() => setSelectedItemToReprice(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyReprice} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-100 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Selling Price:</span>
                  <span className="font-bold text-servora-navy">KES {selectedItemToReprice.sellingPriceKes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Unit Food Cost:</span>
                  <span className="font-bold text-gray-700">KES {selectedItemToReprice.foodCostKes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Margin:</span>
                  <span className="font-bold text-emerald-700">KES {selectedItemToReprice.contributionMarginKes.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Adjusted Selling Price (KES) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-900 font-bold">New Projected Margin:</span>
                <span className="font-bold text-emerald-700 text-sm">
                  KES {(newPrice - selectedItemToReprice.foodCostKes).toLocaleString()} (+{(newPrice - selectedItemToReprice.sellingPriceKes).toLocaleString()})
                </span>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItemToReprice(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || newPrice <= 0}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating Catalog...' : 'Commit Price Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}