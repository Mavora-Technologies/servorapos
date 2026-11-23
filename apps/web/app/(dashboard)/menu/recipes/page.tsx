// apps/web/app/(dashboard)/menu/recipes/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ChefHat,
  Plus,
  Trash2,
  X,
  Search,
  Edit3,
  Calculator,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

type FormulationFilter = 'ALL' | 'FORMULATED' | 'MISSING';

interface InventoryItemOption {
  id: number;
  name: string;
  sku?: string | null;
  category: string;
  unit: string;
  costPrice: string;
  isActive?: boolean;
}

interface SelectedIngredientRow {
  inventoryItemId: string;
  quantity: string;
  unit: string;
  unitCost: number;
  wastagePercentage: string;
}

interface RecipeIngredientRecord {
  id: number;
  inventoryItemId: number;
  ingredientName: string;
  ingredientSku?: string | null;
  quantity: string;
  unit: string;
  unitCost: string;
  wastagePercentage: string;
}

interface ItemRecipeOverview {
  menuItemId: number;
  itemName: string;
  sku: string | null;
  categoryName: string;
  stockTrackingType: string;
  retailPrice: string;
  hasRecipe: boolean;
  cogsPerPortion: number;
  foodCostPercent: string;
  marginPercent: string;
  recipe: {
    id: number;
    version: number;
    prepTimeMinutes: number;
    cookTimeMinutes: number;
    yieldPortions: string;
    instructions: string | null;
    notes: string | null;
    batchCogs: number;
    calculatedCogs: number;
    ingredients: RecipeIngredientRecord[];
  } | null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function RecipesPage() {
  const [items, setItems] = useState<ItemRecipeOverview[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [formulationFilter, setFormulationFilter] = useState<FormulationFilter>('ALL');

  // Feedback States
  const [loadError, setLoadError] = useState<string | null>(null);
  const [referenceWarning, setReferenceWarning] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<ItemRecipeOverview | null>(null);
  const [prepTime, setPrepTime] = useState('15');
  const [cookTime, setCookTime] = useState('10');
  const [yieldPortions, setYieldPortions] = useState('1');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [ingredients, setIngredients] = useState<SelectedIngredientRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [pendingDeleteItem, setPendingDeleteItem] = useState<ItemRecipeOverview | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setReferenceWarning(null);

    const [recipesResult, invResult] = await Promise.allSettled([
      fetchApi('/api/v1/menu/recipes'),
      fetchApi('/api/v1/inventory/items'),
    ]);

    if (recipesResult.status === 'fulfilled' && Array.isArray(recipesResult.value?.data)) {
      setItems(recipesResult.value.data);
    } else {
      setItems([]);
      setLoadError(
        recipesResult.status === 'rejected'
          ? getErrorMessage(recipesResult.reason, 'Failed to load recipes & BOM specifications.')
          : 'Unexpected response structure received from recipes API.'
      );
    }

    if (invResult.status === 'fulfilled') {
      const payload = invResult.value?.data;
      const rawInv = Array.isArray(payload) ? payload : payload?.items;
      if (Array.isArray(rawInv)) {
        setInventoryList(
          rawInv
            .filter((inv: InventoryItemOption) => inv.isActive !== false)
            .sort((a: InventoryItemOption, b: InventoryItemOption) =>
              a.name.localeCompare(b.name)
            )
        );
      } else {
        setInventoryList([]);
      }
    } else {
      setInventoryList([]);
      setReferenceWarning(
        'Inventory raw materials could not be loaded. Editing ingredients may be unavailable.'
      );
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoriesList = useMemo(
    () => Array.from(new Set(items.map((i) => i.categoryName).filter(Boolean))).sort(),
    [items]
  );

  const formulatedCount = useMemo(() => items.filter((i) => i.hasRecipe).length, [items]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.itemName.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.recipe?.ingredients.some((ing) =>
          ing.ingredientName.toLowerCase().includes(q)
        ) ??
          false);

      const matchesCat = categoryFilter === 'ALL' || item.categoryName === categoryFilter;
      const matchesForm =
        formulationFilter === 'ALL' ||
        (formulationFilter === 'FORMULATED' && item.hasRecipe) ||
        (formulationFilter === 'MISSING' && !item.hasRecipe);

      return matchesSearch && matchesCat && matchesForm;
    });
  }, [items, searchTerm, categoryFilter, formulationFilter]);

  const openRecipeEditor = (item: ItemRecipeOverview) => {
    setActiveItem(item);
    setModalError(null);
    if (item.recipe) {
      setPrepTime(String(item.recipe.prepTimeMinutes));
      setCookTime(String(item.recipe.cookTimeMinutes));
      setYieldPortions(String(parseFloat(item.recipe.yieldPortions) || 1));
      setInstructions(item.recipe.instructions || '');
      setNotes(item.recipe.notes || '');
      setIngredients(
        item.recipe.ingredients.map((ing) => ({
          inventoryItemId: String(ing.inventoryItemId),
          quantity: String(parseFloat(ing.quantity) || 0),
          unit: ing.unit,
          unitCost: parseFloat(ing.unitCost) || 0,
          wastagePercentage: String(parseFloat(ing.wastagePercentage) || 0),
        }))
      );
    } else {
      setPrepTime('15');
      setCookTime('10');
      setYieldPortions('1');
      setInstructions('');
      setNotes('');
      setIngredients([]);
    }
    setIsModalOpen(true);
  };

  const closeRecipeEditor = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setActiveItem(null);
    setModalError(null);
  };

  const handleAddIngredientRow = () => {
    if (inventoryList.length === 0) return;
    const defaultItem = inventoryList[0];
    setIngredients((prev) => [
      ...prev,
      {
        inventoryItemId: String(defaultItem.id),
        quantity: '1',
        unit: defaultItem.unit,
        unitCost: parseFloat(defaultItem.costPrice) || 0,
        wastagePercentage: '0',
      },
    ]);
  };

  const handleSelectInventoryItem = (index: number, selectedIdStr: string) => {
    const selected = inventoryList.find((inv) => String(inv.id) === selectedIdStr);
    setIngredients((prev) =>
      prev.map((row, idx) =>
        idx === index
          ? {
              ...row,
              inventoryItemId: selectedIdStr,
              unit: selected ? selected.unit : row.unit,
              unitCost: selected ? parseFloat(selected.costPrice) || 0 : 0,
            }
          : row
      )
    );
  };

  const handleRowPatch = (index: number, patch: Partial<SelectedIngredientRow>) => {
    setIngredients((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const handleRemoveIngredientRow = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Live Batch & Per-Portion COGS Calculations inside modal
  const modalCostSummary = useMemo(() => {
    const batchCogs = ingredients.reduce((sum, ing) => {
      const qty = parseFloat(ing.quantity) || 0;
      const cost = ing.unitCost || 0;
      const wastage = parseFloat(ing.wastagePercentage) || 0;
      return sum + qty * cost * (1 + wastage / 100);
    }, 0);

    const parsedYield = Math.max(parseFloat(yieldPortions) || 1, 0.01);
    const cogsPerPortion = batchCogs / parsedYield;
    const retailPrice = activeItem ? parseFloat(activeItem.retailPrice) || 0 : 0;
    const foodCostPct = retailPrice > 0 ? (cogsPerPortion / retailPrice) * 100 : 0;
    const marginPct = retailPrice > 0 ? ((retailPrice - cogsPerPortion) / retailPrice) * 100 : 0;

    return { batchCogs, cogsPerPortion, foodCostPct, marginPct };
  }, [ingredients, yieldPortions, activeItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem || isSubmitting) return;
    setModalError(null);

    const validIngredients = ingredients
      .map((ing) => ({
        inventoryItemId: parseInt(ing.inventoryItemId, 10),
        quantity: parseFloat(ing.quantity),
        unit: ing.unit.trim() || 'pcs',
        wastagePercentage: parseFloat(ing.wastagePercentage || '0') || 0,
      }))
      .filter(
        (ing) =>
          !Number.isNaN(ing.inventoryItemId) &&
          ing.inventoryItemId > 0 &&
          !Number.isNaN(ing.quantity) &&
          ing.quantity > 0
      );

    if (validIngredients.length === 0) {
      setModalError('Attach at least one raw material with a quantity greater than zero.');
      return;
    }

    const parsedYield = parseFloat(yieldPortions);
    if (Number.isNaN(parsedYield) || parsedYield <= 0) {
      setModalError('Yield portions must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchApi('/api/v1/menu/recipes', {
        method: 'POST',
        body: JSON.stringify({
          menuItemId: activeItem.menuItemId,
          prepTimeMinutes: Math.max(0, parseInt(prepTime, 10) || 0),
          cookTimeMinutes: Math.max(0, parseInt(cookTime, 10) || 0),
          yieldPortions: parsedYield,
          instructions: instructions.trim() || null,
          notes: notes.trim() || null,
          ingredients: validIngredients,
        }),
      });

      const savedName = activeItem.itemName;
      setIsModalOpen(false);
      setActiveItem(null);
      setStatusBanner(`Saved recipe BOM & updated COGS for "${savedName}".`);
      await loadData();
    } catch (err: unknown) {
      setModalError(getErrorMessage(err, 'Failed to save recipe specification.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteRecipe = async () => {
    if (!pendingDeleteItem?.recipe || isDeleting) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await fetchApi(`/api/v1/menu/recipes/${pendingDeleteItem.recipe.id}`, {
        method: 'DELETE',
      });
      const itemName = pendingDeleteItem.itemName;
      setPendingDeleteItem(null);
      setStatusBanner(`Removed recipe specification for "${itemName}".`);
      await loadData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to remove recipe specification.'));
      setPendingDeleteItem(null);
    } finally {
      setIsDeleting(false);
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

      {referenceWarning && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900"
        >
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>{referenceWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setReferenceWarning(null)}
            aria-label="Dismiss warning"
            className="text-amber-700 hover:text-amber-950"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/menu"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core inline-flex items-center gap-1 transition-colors"
            >
              Menu Catalog <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">
              Standard Recipes &amp; Bill of Materials
            </span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">
            Kitchen Recipes &amp; COGS Bill of Materials
          </h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-1">
            Standardized culinary BOMs linked to live inventory unit costs, wastage allowances, and per-portion margins.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-xl text-center">
            <span className="block text-xs font-bold text-servora-core">
              {formulatedCount} / {items.length}
            </span>
            <span className="text-[10px] text-servora-deepTeal font-medium uppercase">
              Formulated
            </span>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="px-3 py-2.5 text-xs font-semibold text-servora-deepTeal bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              aria-label="Search dishes, SKUs, or raw ingredients"
              placeholder="Search dishes, SKU, or raw ingredients..."
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
        </div>

        <div className="flex items-center gap-1 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {(
            [
              { id: 'ALL', label: `All (${items.length})` },
              { id: 'FORMULATED', label: `Formulated (${formulatedCount})` },
              { id: 'MISSING', label: `Unlinked (${items.length - formulatedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFormulationFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                formulationFilter === tab.id
                  ? 'bg-white shadow-xs text-servora-navy font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipes Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse bg-white rounded-2xl border border-gray-100">
          Loading culinary formulation profiles...
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className="p-12 text-center bg-white rounded-2xl border border-gray-100 space-y-3"
        >
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <p className="text-xs font-bold text-rose-800">{loadError}</p>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
          >
            Retry Request
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center text-xs text-servora-deepTeal bg-white rounded-2xl border border-gray-100">
          No menu items matched your search or filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const marginNum = parseFloat(item.marginPercent) || 0;
            return (
              <div
                key={item.menuItemId}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-servora-deepTeal bg-gray-100 px-2 py-0.5 rounded-md">
                        {item.categoryName}
                      </span>
                      <h3 className="text-sm font-bold text-servora-navy mt-1.5 truncate">
                        {item.itemName}
                      </h3>
                    </div>
                    {item.recipe && (
                      <span className="text-[10px] font-mono font-bold text-gray-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                        v{item.recipe.version}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs font-mono font-semibold text-gray-600">
                      Retail: KES {parseFloat(item.retailPrice).toLocaleString()}
                    </span>
                    {item.hasRecipe && (
                      <>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                            marginNum >= 60
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : marginNum >= 35
                                ? 'text-amber-700 bg-amber-50 border-amber-200'
                                : 'text-rose-700 bg-rose-50 border-rose-200'
                          }`}
                        >
                          Margin: {item.marginPercent}%
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">
                          FC: {item.foodCostPercent}%
                        </span>
                      </>
                    )}
                  </div>

                  {item.hasRecipe && item.recipe ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-xl text-center">
                        <div>
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">
                            Prep
                          </span>
                          <span className="text-xs font-bold text-servora-navy">
                            {item.recipe.prepTimeMinutes}m
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">
                            Cook
                          </span>
                          <span className="text-xs font-bold text-servora-navy">
                            {item.recipe.cookTimeMinutes}m
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-gray-400 uppercase font-bold">
                            Yield
                          </span>
                          <span className="text-xs font-bold text-servora-navy">
                            {parseFloat(item.recipe.yieldPortions)} port.
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5">
                          BOM Ingredients ({item.recipe.ingredients.length})
                        </p>
                        <div className="space-y-1">
                          {item.recipe.ingredients.slice(0, 3).map((ing) => {
                            const qty = parseFloat(ing.quantity) || 0;
                            const unitCost = parseFloat(ing.unitCost) || 0;
                            const wastage = parseFloat(ing.wastagePercentage) || 0;
                            const lineCost = qty * unitCost * (1 + wastage / 100);
                            return (
                              <div
                                key={ing.id}
                                className="flex items-center justify-between text-xs py-0.5 gap-2"
                              >
                                <span className="text-servora-navy font-medium truncate">
                                  {qty} {ing.unit} {ing.ingredientName}
                                  {wastage > 0 ? ` (+${wastage}%)` : ''}
                                </span>
                                <span className="text-gray-500 font-mono font-semibold text-[11px] shrink-0">
                                  KES {lineCost.toFixed(0)}
                                </span>
                              </div>
                            );
                          })}
                          {item.recipe.ingredients.length > 3 && (
                            <p className="text-[10px] text-servora-deepTeal font-medium">
                              +{item.recipe.ingredients.length - 3} additional ingredient(s)...
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="py-2 px-3 bg-servora-pale/60 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-medium text-servora-deepTeal">COGS / Portion:</span>
                        <span className="font-mono font-bold text-servora-core">
                          KES {item.recipe.calculatedCogs.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-xs text-gray-400 font-medium">
                        No kitchen recipe formulated
                      </p>
                      <button
                        type="button"
                        onClick={() => openRecipeEditor(item)}
                        className="mt-2 text-xs font-bold text-servora-core hover:underline cursor-pointer"
                      >
                        + Formulate Specification
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => openRecipeEditor(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-servora-core bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <Edit3 size={13} /> {item.hasRecipe ? 'Edit Recipe BOM' : 'Create Recipe BOM'}
                  </button>
                  {item.hasRecipe && item.recipe && (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteItem(item)}
                      aria-label={`Delete recipe for ${item.itemName}`}
                      title="Delete Recipe Specification"
                      className="p-2 text-gray-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RECIPE BOM EDITOR MODAL */}
      {isModalOpen && activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="recipe-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-servora-pale text-servora-core flex items-center justify-center">
                  <ChefHat size={18} />
                </div>
                <div>
                  <h2 id="recipe-modal-title" className="text-sm font-bold text-servora-navy">
                    Recipe &amp; Bill of Materials (BOM)
                  </h2>
                  <p className="text-[11px] text-servora-deepTeal">
                    {activeItem.itemName} &bull; Retail: KES{' '}
                    {parseFloat(activeItem.retailPrice).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeRecipeEditor}
                aria-label="Close modal"
                className="text-gray-400 hover:text-servora-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200 flex items-center gap-2 font-semibold"
                >
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="rec-prep">
                    Prep Time (Min)
                  </label>
                  <input
                    id="rec-prep"
                    type="number"
                    min="0"
                    required
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="rec-cook">
                    Cook Time (Min)
                  </label>
                  <input
                    id="rec-cook"
                    type="number"
                    min="0"
                    required
                    value={cookTime}
                    onChange={(e) => setCookTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="rec-yield">
                    Yield (Portions) *
                  </label>
                  <input
                    id="rec-yield"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={yieldPortions}
                    onChange={(e) => setYieldPortions(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Database-Driven Ingredients */}
              <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-servora-navy">
                    Raw Materials &amp; Stock Ledger Costs ({ingredients.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    disabled={inventoryList.length === 0}
                    className="text-xs font-bold text-servora-core hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus size={13} /> Add Ingredient
                  </button>
                </div>

                {ingredients.length === 0 ? (
                  <div className="p-4 bg-white border border-dashed border-gray-300 rounded-xl text-center text-xs text-gray-500">
                    No ingredients attached yet. Click <strong>+ Add Ingredient</strong> to select from inventory.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      <span className="col-span-5">Raw Material</span>
                      <span className="col-span-2 text-center">Qty</span>
                      <span className="col-span-1 text-center">Unit</span>
                      <span className="col-span-2 text-center">Waste %</span>
                      <span className="col-span-1 text-right">Cost</span>
                      <span className="col-span-1" />
                    </div>

                    {ingredients.map((row, idx) => {
                      const lineCost =
                        (parseFloat(row.quantity) || 0) *
                        (row.unitCost || 0) *
                        (1 + (parseFloat(row.wastagePercentage) || 0) / 100);

                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-gray-200"
                        >
                          <div className="col-span-5">
                            <select
                              aria-label="Raw material"
                              value={row.inventoryItemId}
                              onChange={(e) => handleSelectInventoryItem(idx, e.target.value)}
                              className="w-full px-2 py-1.5 text-xs font-medium border border-gray-200 rounded-lg focus:border-servora-core focus:outline-none bg-white"
                            >
                              {inventoryList.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.name} — KES {parseFloat(inv.costPrice).toFixed(2)}/{inv.unit}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.0001"
                              min="0.0001"
                              required
                              aria-label="Quantity"
                              value={row.quantity}
                              onChange={(e) => handleRowPatch(idx, { quantity: e.target.value })}
                              className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-gray-200 rounded-lg focus:border-servora-core focus:outline-none text-center"
                            />
                          </div>

                          <div className="col-span-1 text-center">
                            <span className="text-[11px] font-mono font-semibold text-servora-deepTeal">
                              {row.unit}
                            </span>
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="100"
                              aria-label="Wastage percentage"
                              value={row.wastagePercentage}
                              onChange={(e) =>
                                handleRowPatch(idx, { wastagePercentage: e.target.value })
                              }
                              className="w-full px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-lg focus:border-servora-core focus:outline-none text-center"
                            />
                          </div>

                          <div className="col-span-1 text-right">
                            <span className="text-[11px] font-mono font-bold text-servora-navy">
                              {lineCost.toFixed(0)}
                            </span>
                          </div>

                          <div className="col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredientRow(idx)}
                              aria-label="Remove ingredient"
                              className="p-1 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Real-time Batch vs Per-Portion COGS Telemetry */}
                <div className="pt-2 border-t border-gray-200 grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">
                      Batch COGS
                    </span>
                    <span className="font-mono font-bold text-servora-navy">
                      KES {modalCostSummary.batchCogs.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                    <span className="text-[10px] text-servora-deepTeal uppercase font-bold flex items-center gap-1">
                      <Calculator size={10} /> COGS / Portion
                    </span>
                    <span className="font-mono font-bold text-servora-core">
                      KES {modalCostSummary.cogsPerPortion.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                      Margin / FC%
                    </span>
                    <span className="font-mono font-bold text-emerald-800">
                      {modalCostSummary.marginPct.toFixed(1)}% ({modalCostSummary.foodCostPct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="rec-inst">
                    Kitchen Chef Preparation Instructions
                  </label>
                  <textarea
                    id="rec-inst"
                    rows={3}
                    placeholder="Cooking temperature, plating steps, and garnishing..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="rec-notes">
                    Allergen &amp; Portion Control Notes
                  </label>
                  <textarea
                    id="rec-notes"
                    rows={3}
                    placeholder="Allergens, substitution policy, or shelf-life notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeRecipeEditor}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving Specification...' : 'Save Recipe & Sync COGS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE RECIPE CONFIRMATION MODAL */}
      {pendingDeleteItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-recipe-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 id="delete-recipe-title" className="text-sm font-bold text-servora-navy">
                  Remove Recipe Specification?
                </h3>
                <p className="text-xs text-servora-deepTeal mt-1 leading-relaxed">
                  Are you sure you want to delete the BOM recipe for{' '}
                  <strong className="text-servora-navy">{pendingDeleteItem.itemName}</strong>? The menu item will remain active, but automatic raw-material deduction will stop until a new recipe is configured.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPendingDeleteItem(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRecipe}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Remove Recipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}