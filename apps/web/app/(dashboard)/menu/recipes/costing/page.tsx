'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  ArrowLeft, 
  Search, 
  Filter, 
  Sliders, 
  ChevronRight, 
  Layers, X,
  HelpCircle,
  PieChart
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

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
  category: string;
  retailPrice: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
  foodCostPercent: number;
  targetPrice: number;
  hasRecipe: boolean;
  ingredients: IngredientCostDetail[];
}

interface CostingSummary {
  totalDishes: number;
  formulatedDishes: number;
  averageMargin: number;
  highMarginCount: number;
  lowMarginCount: number;
  totalCogs: number;
}

export default function RecipeCostingPage() {
  const [items, setItems] = useState<CostingItem[]>([]);
  const [summary, setSummary] = useState<CostingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [marginFilter, setMarginFilter] = useState<'ALL' | 'HEALTHY' | 'ALERT'>('ALL');
  
  // Simulator State
  const [selectedItem, setSelectedItem] = useState<CostingItem | null>(null);
  const [simulatedPrice, setSimulatedPrice] = useState<number>(0);
  const [ingredientCostOffset, setIngredientCostOffset] = useState<number>(0); // % supplier price change

  const loadCosting = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi('/api/v1/menu/recipes/costing');
      if (res?.data) {
        setItems(res.data.items || []);
        setSummary(res.data.summary || null);
      }
    } catch (err) {
      console.error('Failed to load recipe costing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCosting();
  }, []);

  const openSimulator = (item: CostingItem) => {
    setSelectedItem(item);
    setSimulatedPrice(item.retailPrice);
    setIngredientCostOffset(0);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMargin =
      marginFilter === 'ALL' ||
      (marginFilter === 'HEALTHY' && item.marginPercent >= 65) ||
      (marginFilter === 'ALERT' && item.marginPercent < 65 && item.hasRecipe);
    return matchesSearch && matchesMargin;
  });

  // Simulator Calculations
  const simCogs = selectedItem
    ? selectedItem.cogs * (1 + ingredientCostOffset / 100)
    : 0;
  const simGrossProfit = simulatedPrice - simCogs;
  const simMargin = simulatedPrice > 0 ? (simGrossProfit / simulatedPrice) * 100 : 0;
  const simFoodCost = simulatedPrice > 0 ? (simCogs / simulatedPrice) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/menu/recipes"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              <ArrowLeft size={13} /> Back to Recipes
            </Link>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Menu Recipe Costing & Margin Engine</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Real-time Food Cost Percentages (FC%), gross margin contributions, and price elasticity modeling.
          </p>
        </div>

        {/* Aggregate KPI Badges */}
        {summary && (
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center min-w-[110px]">
              <span className="block text-xs font-bold text-emerald-800">{summary.averageMargin}%</span>
              <span className="text-[10px] text-emerald-600 font-medium uppercase tracking-wider">Avg Food Margin</span>
            </div>
            <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-center min-w-[110px]">
              <span className="block text-xs font-bold text-blue-800">{summary.highMarginCount} Dishes</span>
              <span className="text-[10px] text-blue-600 font-medium uppercase tracking-wider">High Margin (&ge;65%)</span>
            </div>
            <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-center min-w-[110px]">
              <span className="block text-xs font-bold text-amber-800">{summary.lowMarginCount} Alert</span>
              <span className="text-[10px] text-amber-600 font-medium uppercase tracking-wider">Low Margin (&lt;65%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search menu items or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          <button
            onClick={() => setMarginFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              marginFilter === 'ALL' ? 'bg-white shadow-xs text-servora-navy' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All Items ({items.length})
          </button>
          <button
            onClick={() => setMarginFilter('HEALTHY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              marginFilter === 'HEALTHY' ? 'bg-white shadow-xs text-emerald-700' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Healthy Margins (&ge;65%)
          </button>
          <button
            onClick={() => setMarginFilter('ALERT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              marginFilter === 'ALERT' ? 'bg-white shadow-xs text-amber-700' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Needs Review (&lt;65%)
          </button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Analyzing recipe formulation costs and inventory stock ledgers...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No dishes found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-servora-deepTeal font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Menu Dish</th>
                  <th className="py-3.5 px-4">Retail Price</th>
                  <th className="py-3.5 px-4">Recipe COGS</th>
                  <th className="py-3.5 px-4">Gross Profit</th>
                  <th className="py-3.5 px-4">Food Cost %</th>
                  <th className="py-3.5 px-4">Gross Margin</th>
                  <th className="py-3.5 px-4">Target 70% Price</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => {
                  const isHealthy = item.marginPercent >= 65;

                  return (
                    <tr key={item.menuItemId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-servora-navy block">{item.itemName}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">{item.category}</span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-servora-navy">
                        KES {item.retailPrice.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.hasRecipe ? (
                          <span className="font-semibold text-rose-600 font-mono">
                            KES {item.cogs.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No recipe</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.hasRecipe ? (
                          <span className="font-semibold text-emerald-700 font-mono">
                            KES {item.grossProfit.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.hasRecipe ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            item.foodCostPercent <= 35 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {item.foodCostPercent}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.hasRecipe ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                            isHealthy
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {!isHealthy && <AlertTriangle size={11} />}
                            {item.marginPercent}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-gray-600">
                        {item.hasRecipe ? (
                          <span>KES {item.targetPrice.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {item.hasRecipe ? (
                          <button
                            onClick={() => openSimulator(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-servora-core hover:bg-servora-pale rounded-lg transition-colors"
                          >
                            <Sliders size={13} /> Simulate
                          </button>
                        ) : (
                          <Link
                            href="/menu/recipes"
                            className="text-xs font-semibold text-blue-600 hover:underline"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-servora-pale text-servora-core flex items-center justify-center">
                  <Sliders size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-servora-navy">Recipe Profitability Simulator</h2>
                  <p className="text-[11px] text-servora-deepTeal">{selectedItem.itemName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Simulation Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1.5">
                    Simulated Retail Price (KES)
                  </label>
                  <input
                    type="number"
                    step="10"
                    value={simulatedPrice}
                    onChange={(e) => setSimulatedPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-bold border border-gray-300 rounded-xl focus:border-servora-core focus:outline-none bg-white"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Current price: KES {selectedItem.retailPrice}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1.5">
                    Ingredient Cost Fluctuation: {ingredientCostOffset > 0 ? `+${ingredientCostOffset}%` : `${ingredientCostOffset}%`}
                  </label>
                  <input
                    type="range"
                    min="-30"
                    max="50"
                    step="5"
                    value={ingredientCostOffset}
                    onChange={(e) => setIngredientCostOffset(Number(e.target.value))}
                    className="w-full accent-servora-core cursor-pointer mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>-30% supplier cut</span>
                    <span>Base Cost</span>
                    <span>+50% inflation</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Impact Display Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-gray-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Simulated COGS</span>
                  <span className="text-sm font-bold text-rose-600 font-mono">
                    KES {simCogs.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-gray-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Gross Profit</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono">
                    KES {simGrossProfit.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-gray-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Gross Margin</span>
                  <span className={`text-sm font-bold ${simMargin >= 65 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {simMargin.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Ingredient Cost Contributions Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-servora-navy mb-2 flex items-center gap-1.5">
                  <PieChart size={14} className="text-servora-core" />
                  Ingredient Cost Contribution
                </h4>
                <div className="space-y-1.5">
                  {selectedItem.ingredients.map((ing) => {
                    const adjustedCost = ing.lineCost * (1 + ingredientCostOffset / 100);
                    const costShare = simCogs > 0 ? ((adjustedCost / simCogs) * 100).toFixed(1) : '0';

                    return (
                      <div key={ing.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100 text-xs">
                        <div>
                          <span className="font-semibold text-servora-navy">{ing.ingredientName}</span>
                          <span className="text-[11px] text-gray-400 ml-2">
                            ({ing.quantity} {ing.unit} @ KES {ing.unitCost})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-servora-navy">KES {adjustedCost.toFixed(2)}</span>
                          <span className="text-[10px] text-gray-400 block">{costShare}% of dish COGS</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 text-xs font-semibold bg-gray-100 text-servora-navy rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Close Simulator
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}