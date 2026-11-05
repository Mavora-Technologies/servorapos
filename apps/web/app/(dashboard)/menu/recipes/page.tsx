'use client';

import { useEffect, useState } from 'react';
import { 
  ChefHat, 
  Plus, 
  Trash2, 
  X, 
  Search, 
  Edit3,
  Calculator
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface InventoryItemOption {
  id: number;
  name: string;
  category: string;
  unit: string;
  costPrice: string;
}

interface SelectedIngredientRow {
  inventoryItemId: number;
  ingredientName?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  wastagePercentage: number;
}

interface ItemRecipeOverview {
  menuItemId: number;
  itemName: string;
  retailPrice: string;
  hasRecipe: boolean;
  recipe?: {
    id: number;
    prepTimeMinutes: number;
    cookTimeMinutes: number;
    yieldPortions: string;
    instructions: string | null;
    notes: string | null;
    calculatedCogs: number;
    ingredients: Array<{
      id: number;
      inventoryItemId: number;
      ingredientName: string;
      quantity: string;
      unit: string;
      unitCost: string;
      wastagePercentage: string;
    }>;
  } | null;
  marginPercent: string;
}

export default function RecipesPage() {
  const [items, setItems] = useState<ItemRecipeOverview[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItemOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<ItemRecipeOverview | null>(null);
  const [prepTime, setPrepTime] = useState(15);
  const [cookTime, setCookTime] = useState(10);
  const [yieldPortions, setYieldPortions] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<SelectedIngredientRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [recipesRes, invRes] = await Promise.all([
        fetchApi('/api/v1/menu/recipes'),
        fetchApi('/api/v1/inventory'),
      ]);

      if (recipesRes?.data) {
        setItems(recipesRes.data);
      }
      if (invRes?.data) {
        setInventoryList(invRes.data);
      }
    } catch (err) {
      console.error('Failed to load recipe data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openRecipeEditor = (item: ItemRecipeOverview) => {
    setActiveItem(item);
    if (item.recipe) {
      setPrepTime(item.recipe.prepTimeMinutes);
      setCookTime(item.recipe.cookTimeMinutes);
      setYieldPortions(Number(item.recipe.yieldPortions) || 1);
      setInstructions(item.recipe.instructions || '');
      setIngredients(
        item.recipe.ingredients.map((ing) => ({
          inventoryItemId: ing.inventoryItemId,
          ingredientName: ing.ingredientName,
          quantity: Number(ing.quantity) || 0,
          unit: ing.unit,
          unitCost: Number(ing.unitCost) || 0,
          wastagePercentage: Number(ing.wastagePercentage) || 0,
        }))
      );
    } else {
      setPrepTime(15);
      setCookTime(10);
      setYieldPortions(1);
      setInstructions('');
      setIngredients([]);
    }
    setIsModalOpen(true);
  };

  const handleAddIngredientRow = () => {
    if (inventoryList.length === 0) return;
    const defaultItem = inventoryList[0];
    setIngredients([
      ...ingredients,
      {
        inventoryItemId: defaultItem.id,
        ingredientName: defaultItem.name,
        quantity: 1,
        unit: defaultItem.unit,
        unitCost: Number(defaultItem.costPrice),
        wastagePercentage: 0,
      },
    ]);
  };

  const handleSelectInventoryItem = (index: number, selectedId: number) => {
    const selected = inventoryList.find((inv) => inv.id === selectedId);
    if (!selected) return;

    const updated = [...ingredients];
    updated[index] = {
      ...updated[index],
      inventoryItemId: selected.id,
      ingredientName: selected.name,
      unit: selected.unit,
      unitCost: Number(selected.costPrice),
    };
    setIngredients(updated);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...ingredients];
    updated[index].quantity = qty;
    setIngredients(updated);
  };

  const handleWastageChange = (index: number, wastage: number) => {
    const updated = [...ingredients];
    updated[index].wastagePercentage = wastage;
    setIngredients(updated);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Calculated COGS sum for modal
  const computedRecipeCogs = ingredients.reduce((sum, ing) => {
    const baseCost = (Number(ing.quantity) || 0) * (Number(ing.unitCost) || 0);
    const withWastage = baseCost * (1 + (Number(ing.wastagePercentage) || 0) / 100);
    return sum + withWastage;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    if (ingredients.length === 0) {
      alert('Please add at least one inventory item to the bill of materials.');
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchApi('/api/v1/menu/recipes', {
        method: 'POST',
        body: JSON.stringify({
          menuItemId: activeItem.menuItemId,
          prepTimeMinutes: Number(prepTime),
          cookTimeMinutes: Number(cookTime),
          yieldPortions: Number(yieldPortions),
          instructions,
          ingredients: ingredients.map((ing) => ({
            inventoryItemId: ing.inventoryItemId,
            quantity: Number(ing.quantity),
            unit: ing.unit,
            unitCost: Number(ing.unitCost),
            wastagePercentage: Number(ing.wastagePercentage) || 0,
          })),
        }),
      });

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save recipe specification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) =>
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-servora-navy">Kitchen Recipes & COGS Bill of Materials</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-1">
            Formulations dynamically linked to ledger inventory records and weighted average costs.
          </p>
        </div>
      </div>

      {/* Search Header */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search dish recipes and formulations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>
        <span className="text-xs text-servora-deepTeal font-medium">
          {items.filter((i) => i.hasRecipe).length} of {items.length} dishes formulated
        </span>
      </div>

      {/* Recipes Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse bg-white rounded-2xl border border-gray-100">
          Loading culinary formulation profiles...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.menuItemId}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-servora-navy">{item.itemName}</h3>
                  <button
                    onClick={() => openRecipeEditor(item)}
                    className="p-1.5 text-servora-core hover:bg-servora-pale rounded-lg transition-colors"
                  >
                    <Edit3 size={15} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-gray-600">
                    Retail: KES {Number(item.retailPrice).toLocaleString()}
                  </span>
                  {item.hasRecipe && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      Margin: {item.marginPercent}%
                    </span>
                  )}
                </div>

                {item.hasRecipe && item.recipe ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-xl text-center">
                      <div>
                        <span className="block text-[10px] text-gray-400 uppercase font-bold">Prep</span>
                        <span className="text-xs font-bold text-servora-navy">{item.recipe.prepTimeMinutes}m</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-gray-400 uppercase font-bold">Cook</span>
                        <span className="text-xs font-bold text-servora-navy">{item.recipe.cookTimeMinutes}m</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-gray-400 uppercase font-bold">Portions</span>
                        <span className="text-xs font-bold text-servora-navy">{item.recipe.yieldPortions}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5">
                        BOM Ingredients ({item.recipe.ingredients.length})
                      </p>
                      <div className="space-y-1">
                        {item.recipe.ingredients.slice(0, 3).map((ing, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-servora-navy font-medium">
                              {Number(ing.quantity)} {ing.unit} {ing.ingredientName}
                            </span>
                            <span className="text-gray-500 font-semibold text-[11px]">
                              KES {(Number(ing.quantity) * Number(ing.unitCost)).toFixed(0)}
                            </span>
                          </div>
                        ))}
                        {item.recipe.ingredients.length > 3 && (
                          <p className="text-[10px] text-servora-deepTeal font-medium">
                            +{item.recipe.ingredients.length - 3} additional ingredients...
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="py-2 px-3 bg-servora-pale/60 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-medium text-servora-deepTeal">Recipe COGS Cost:</span>
                      <span className="font-bold text-servora-core">
                        KES {item.recipe.calculatedCogs.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-xs text-gray-400 font-medium">No kitchen recipe formulated</p>
                    <button
                      onClick={() => openRecipeEditor(item)}
                      className="mt-2 text-xs font-bold text-servora-core hover:underline"
                    >
                      + Formulate Specification
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RECIPE BOM MODAL */}
      {isModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-servora-pale text-servora-core flex items-center justify-center">
                  <ChefHat size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-servora-navy">Recipe & Bill of Materials (BOM)</h2>
                  <p className="text-[11px] text-servora-deepTeal">{activeItem.itemName}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Prep Time (Min)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prepTime}
                    onChange={(e) => setPrepTime(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Cook Time (Min)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={cookTime}
                    onChange={(e) => setCookTime(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Yield (Portions)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={yieldPortions}
                    onChange={(e) => setYieldPortions(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Database-Driven Ingredients */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-servora-navy">
                    Raw Ingredients & Stock Inventory Costs
                  </span>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="text-xs font-semibold text-servora-core hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Ingredient from Inventory
                  </button>
                </div>

                {ingredients.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-500">
                    No ingredients attached yet. Click <strong>+ Add Ingredient from Inventory</strong> to select from stock.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ingredients.map((row, idx) => {
                      const lineCost = (Number(row.quantity) || 0) * (Number(row.unitCost) || 0) * (1 + (Number(row.wastagePercentage) || 0) / 100);

                      return (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50/70 p-2 rounded-xl border border-gray-200">
                          {/* 1. Inventory Item Selector */}
                          <div className="flex-1">
                            <select
                              value={row.inventoryItemId}
                              onChange={(e) => handleSelectInventoryItem(idx, Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-lg focus:border-servora-core focus:outline-none bg-white"
                            >
                              {inventoryList.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.name} ({inv.category}) — KES {Number(inv.costPrice).toFixed(2)} / {inv.unit}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 2. Portion Quantity */}
                          <div className="w-20">
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              required
                              placeholder="Qty"
                              value={row.quantity}
                              onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:border-servora-core focus:outline-none bg-white text-center font-bold"
                            />
                          </div>

                          {/* 3. Base Unit (Read-only from Inventory) */}
                          <div className="w-14 text-center">
                            <span className="text-xs font-semibold text-servora-deepTeal">
                              {row.unit}
                            </span>
                          </div>

                          {/* 4. Unit Cost (Read-only from Inventory ledger) */}
                          <div className="w-24 text-right">
                            <span className="text-[11px] font-mono text-gray-600 block">
                              @ KES {Number(row.unitCost).toFixed(2)}
                            </span>
                          </div>

                          {/* 5. Line Cost Total */}
                          <div className="w-24 text-right pr-1">
                            <span className="text-xs font-bold text-servora-navy block">
                              KES {lineCost.toFixed(2)}
                            </span>
                          </div>

                          {/* 6. Remove Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredientRow(idx)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Real-time Calculated Recipe COGS */}
                <div className="mt-3 p-3 bg-servora-pale/60 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-servora-navy flex items-center gap-1.5">
                    <Calculator size={14} className="text-servora-core" />
                    Total Recipe COGS Cost:
                  </span>
                  <span className="text-sm font-bold text-servora-core">
                    KES {computedRecipeCogs.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">
                  Kitchen Chef Preparation Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail cooking temperature, plating steps, and garnishing..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
                >
                  {isSubmitting ? 'Saving Specification...' : 'Save Recipe & COGS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}