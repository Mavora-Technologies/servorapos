// apps/web/app/(dashboard)/menu/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  UtensilsCrossed,
  Tag,
  CheckCircle2,
  XCircle,
  Search,
  Layers,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  Link2,
  Package,
  ChefHat,
  RefreshCw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

type StockTrackingType = 'RECIPE' | 'STOCKED_PRODUCT' | 'COMPOSITE' | 'NON_TRACKED';

interface MenuCategoryRecord {
  id: number;
  name: string;
  description?: string | null;
}

interface LinkedIngredient {
  id?: number;
  inventoryItemId: number;
  inventoryItemName?: string;
  inventoryItemSku?: string | null;
  quantity: string;
  unit: string;
  wastagePercentage: string;
  unitCost?: string;
}

interface DirectInventoryLink {
  id: number;
  name: string;
  sku: string | null;
  unit: string;
  costPrice: string;
  currentStock: string;
}

interface MenuItemRecord {
  id: number;
  categoryId: number;
  category: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  costEstimate: number;
  stockTrackingType: StockTrackingType;
  directInventoryItemId: number | null;
  directInventoryItem: DirectInventoryLink | null;
  recipeIngredients: LinkedIngredient[];
  kitchenStation: string;
  prepTimeMinutes: number;
  taxRate: number;
  cateringLevyRate: number;
  isTaxInclusive: boolean;
  isAvailable: boolean;
  imageUrl: string | null;
}

interface InventoryOption {
  id: number;
  name: string;
  sku: string | null;
  materialType: string;
  category: string;
  unit: string;
  costPrice: string;
  currentStock: string;
  isActive: boolean;
}

interface RecipeFormLine {
  inventoryItemId: string;
  quantity: string;
  unit: string;
  wastagePercentage: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function AdvancedMenuManagementPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<MenuCategoryRecord[]>([]);
  const [items, setItems] = useState<MenuItemRecord[]>([]);
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Page Feedback
  const [loadError, setLoadError] = useState<string | null>(null);
  const [referenceWarning, setReferenceWarning] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<'ALL' | number>('ALL');

  // Create / Edit Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [pendingDeleteItem, setPendingDeleteItem] = useState<MenuItemRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [itemName, setItemName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemSku, setItemSku] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [kitchenStation, setKitchenStation] = useState('MAIN_KITCHEN');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('15');
  const [isAvailable, setIsAvailable] = useState(true);

  // Inventory & Raw Material Linkage Fields
  const [stockTrackingType, setStockTrackingType] = useState<StockTrackingType>('RECIPE');
  const [directInventoryItemId, setDirectInventoryItemId] = useState('');
  const [recipeLines, setRecipeLines] = useState<RecipeFormLine[]>([]);

  const loadMenuData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setReferenceWarning(null);

    const [catalogResult, invResult] = await Promise.allSettled([
      fetchApi('/api/v1/menu/catalog'),
      fetchApi('/api/v1/inventory/items'),
    ]);

    if (catalogResult.status === 'fulfilled') {
      const payload = catalogResult.value?.data;
      if (payload && Array.isArray(payload.categories) && Array.isArray(payload.items)) {
        setCategories(payload.categories);
        setItems(payload.items);
      } else {
        setLoadError('Unexpected response structure received from menu catalog API.');
        setCategories([]);
        setItems([]);
      }
    } else {
      setLoadError(getErrorMessage(catalogResult.reason, 'Failed to load menu catalog.'));
      setCategories([]);
      setItems([]);
    }

    if (invResult.status === 'fulfilled') {
      const payload = invResult.value?.data;
      const rawInv = Array.isArray(payload) ? payload : payload?.items;
      if (Array.isArray(rawInv)) {
        setInventoryOptions(
          rawInv.filter((it: InventoryOption) => it.isActive !== false)
        );
      } else {
        setInventoryOptions([]);
      }
    } else {
      setInventoryOptions([]);
      setReferenceWarning(
        'Inventory catalog could not be loaded. Raw material and product linking may be unavailable.'
      );
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadMenuData();
  }, [loadMenuData]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory =
        selectedCategoryId === 'ALL' || item.categoryId === selectedCategoryId;
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.sku && item.sku.toLowerCase().includes(query)) ||
        (item.directInventoryItem?.name.toLowerCase().includes(query) ?? false);
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategoryId, searchQuery]);

  // Live cost calculation inside modal based on linked raw materials or stocked product
  const liveEstimatedCost = useMemo(() => {
    if (stockTrackingType === 'STOCKED_PRODUCT' && directInventoryItemId) {
      const match = inventoryOptions.find((i) => String(i.id) === directInventoryItemId);
      return match ? parseFloat(match.costPrice) || 0 : 0;
    }
    if (stockTrackingType === 'RECIPE' || stockTrackingType === 'COMPOSITE') {
      return recipeLines.reduce((sum, line) => {
        const match = inventoryOptions.find((i) => String(i.id) === line.inventoryItemId);
        const unitCost = match ? parseFloat(match.costPrice) || 0 : 0;
        const qty = parseFloat(line.quantity) || 0;
        const wastage = parseFloat(line.wastagePercentage) || 0;
        return sum + qty * unitCost * (1 + wastage / 100);
      }, 0);
    }
    return 0;
  }, [stockTrackingType, directInventoryItemId, recipeLines, inventoryOptions]);

  const openItemModal = (item?: MenuItemRecord) => {
    setModalError(null);
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setCategoryId(String(item.categoryId));
      setItemPrice(String(item.price));
      setItemSku(item.sku || '');
      setItemDesc(item.description || '');
      setKitchenStation(item.kitchenStation || 'MAIN_KITCHEN');
      setPrepTimeMinutes(String(item.prepTimeMinutes ?? 15));
      setIsAvailable(item.isAvailable);
      setStockTrackingType(item.stockTrackingType || 'RECIPE');
      setDirectInventoryItemId(
        item.directInventoryItemId ? String(item.directInventoryItemId) : ''
      );
      setRecipeLines(
        (item.recipeIngredients ?? []).map((ing) => ({
          inventoryItemId: String(ing.inventoryItemId),
          quantity: String(parseFloat(ing.quantity)),
          unit: ing.unit,
          wastagePercentage: String(parseFloat(ing.wastagePercentage || '0')),
        }))
      );
    } else {
      setEditingItem(null);
      setItemName('');
      setCategoryId(categories.length > 0 ? String(categories[0].id) : '');
      setItemPrice('');
      setItemSku('');
      setItemDesc('');
      setKitchenStation('MAIN_KITCHEN');
      setPrepTimeMinutes('15');
      setIsAvailable(true);
      setStockTrackingType('RECIPE');
      setDirectInventoryItemId('');
      setRecipeLines([]);
    }
    setIsItemModalOpen(true);
  };

  const addRecipeLine = () => {
    const firstInv = inventoryOptions[0];
    setRecipeLines((prev) => [
      ...prev,
      {
        inventoryItemId: firstInv ? String(firstInv.id) : '',
        quantity: '1',
        unit: firstInv ? firstInv.unit : 'kg',
        wastagePercentage: '0',
      },
    ]);
  };

  const updateRecipeLine = (index: number, patch: Partial<RecipeFormLine>) => {
    setRecipeLines((prev) =>
      prev.map((line, idx) => {
        if (idx !== index) return line;
        const next = { ...line, ...patch };
        // Auto-sync base unit when switching raw material
        if (patch.inventoryItemId) {
          const inv = inventoryOptions.find((i) => String(i.id) === patch.inventoryItemId);
          if (inv) next.unit = inv.unit;
        }
        return next;
      })
    );
  };

  const removeRecipeLine = (index: number) => {
    setRecipeLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setModalError(null);

    const parsedCategoryId = parseInt(categoryId, 10);
    if (Number.isNaN(parsedCategoryId) || parsedCategoryId <= 0) {
      setModalError('Please select a valid menu category. Create one first if none exist.');
      return;
    }

    const parsedPrice = parseFloat(itemPrice);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setModalError('Selling price must be greater than zero.');
      return;
    }

    if (stockTrackingType === 'STOCKED_PRODUCT' && !directInventoryItemId) {
      setModalError('Please select the stocked inventory product to link.');
      return;
    }

    const sanitizedRecipeLines =
      stockTrackingType === 'RECIPE' || stockTrackingType === 'COMPOSITE'
        ? recipeLines
            .filter((l) => l.inventoryItemId && parseFloat(l.quantity) > 0)
            .map((l) => ({
              inventoryItemId: parseInt(l.inventoryItemId, 10),
              quantity: parseFloat(l.quantity),
              unit: l.unit.trim() || 'pcs',
              wastagePercentage: parseFloat(l.wastagePercentage) || 0,
            }))
        : [];

    setIsSubmitting(true);
    try {
      const payload = {
        categoryId: parsedCategoryId,
        name: itemName.trim(),
        price: parsedPrice,
        sku: itemSku.trim() || null,
        description: itemDesc.trim() || null,
        kitchenStation,
        prepTimeMinutes: parseInt(prepTimeMinutes, 10) || 0,
        stockTrackingType,
        directInventoryItemId:
          stockTrackingType === 'STOCKED_PRODUCT' ? parseInt(directInventoryItemId, 10) : null,
        recipeIngredients: sanitizedRecipeLines,
        isAvailable,
      };

      if (editingItem) {
        await fetchApi(`/api/v1/menu/items/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setStatusBanner(`Updated menu item "${itemName.trim()}" and inventory linkage.`);
      } else {
        await fetchApi('/api/v1/menu/items', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setStatusBanner(`Published menu item "${itemName.trim()}" to POS catalog.`);
      }

      setIsItemModalOpen(false);
      await loadMenuData();
    } catch (err: unknown) {
      setModalError(getErrorMessage(err, 'Failed to save menu item.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteItem || isDeleting) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await fetchApi(`/api/v1/menu/items/${pendingDeleteItem.id}`, {
        method: 'DELETE',
      });
      const deletedName = pendingDeleteItem.name;
      setPendingDeleteItem(null);
      setStatusBanner(`Deleted menu item "${deletedName}".`);
      await loadMenuData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to delete menu item.'));
      setPendingDeleteItem(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderInventoryLinkCell = (item: MenuItemRecord) => {
    if (item.stockTrackingType === 'STOCKED_PRODUCT' && item.directInventoryItem) {
      return (
        <div className="space-y-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
            <Package size={10} /> Direct Product
          </span>
          <span className="block text-[11px] font-medium text-servora-navy">
            {item.directInventoryItem.name}
          </span>
        </div>
      );
    }

    if (item.stockTrackingType === 'RECIPE' || item.stockTrackingType === 'COMPOSITE') {
      const count = item.recipeIngredients?.length ?? 0;
      return (
        <div className="space-y-0.5">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
              count > 0
                ? 'text-blue-700 bg-blue-50 border-blue-200'
                : 'text-amber-700 bg-amber-50 border-amber-200'
            }`}
          >
            <ChefHat size={10} /> {count > 0 ? `BOM (${count} raw mat${count === 1 ? '' : 's'})` : 'Recipe Unlinked'}
          </span>
          {item.costEstimate > 0 && (
            <span className="block text-[10px] font-mono text-gray-500">
              Est. Cost: KES {item.costEstimate.toFixed(2)}
            </span>
          )}
        </div>
      );
    }

    return (
      <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
        Non-Tracked
      </span>
    );
  };

  const numericPrice = parseFloat(itemPrice) || 0;
  const estimatedMarginPct =
    numericPrice > 0 && liveEstimatedCost > 0
      ? ((numericPrice - liveEstimatedCost) / numericPrice) * 100
      : null;

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

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-servora-navy">Advanced Menu &amp; POS Catalog</h1>
          <p className="text-servora-deepTeal text-xs mt-1">
            Configure POS pricing, kitchen station routing, direct stocked product links, and recipe raw-material BOMs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadMenuData}
            disabled={isLoading}
            className="bg-gray-50 border border-gray-200 text-servora-deepTeal text-xs font-semibold px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => router.push('/menu/categories')}
            className="bg-white border border-gray-200 text-servora-navy text-xs font-semibold px-4 py-2 rounded-xl shadow-2xs hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Tag size={14} /> Manage Categories
          </button>
          <button
            type="button"
            onClick={() => openItemModal()}
            disabled={categories.length === 0}
            className="bg-servora-core text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Plus size={14} /> Add Menu Item
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            aria-label="Search menu items by name, SKU, or linked product"
            placeholder="Search by item name, SKU, or linked material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              selectedCategoryId === 'ALL'
                ? 'bg-servora-navy text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Categories ({items.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedCategoryId === cat.id
                  ? 'bg-servora-navy text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name} ({items.filter((i) => i.categoryId === cat.id).length})
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Overview Sidebar */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs lg:col-span-1 h-fit space-y-4">
          <h3 className="text-sm font-bold text-servora-navy flex items-center gap-2">
            <Layers size={16} className="text-servora-core" /> Categories Summary
          </h3>
          {categories.length === 0 ? (
            <div className="text-xs text-servora-deepTeal space-y-2">
              <p>No menu categories configured yet.</p>
              <Link
                href="/menu/categories"
                className="inline-block font-bold text-servora-core hover:underline"
              >
                Create first category &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs border transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'bg-blue-50 border-servora-core/30 text-servora-core font-bold'
                      : 'bg-gray-50 text-servora-navy border-gray-100 hover:bg-gray-100'
                  }`}
                >
                  <span className="font-medium truncate">{cat.name}</span>
                  <span className="text-[10px] bg-white text-servora-core px-2 py-0.5 rounded-full font-bold border border-gray-200">
                    {items.filter((i) => i.categoryId === cat.id).length}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Menu Items Catalog Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs lg:col-span-3 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-bold text-servora-navy flex items-center gap-2">
              <UtensilsCrossed size={16} className="text-servora-core" /> Catalog Products (
              {filteredItems.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center text-servora-deepTeal text-xs animate-pulse">
                Loading menu catalog...
              </div>
            ) : loadError ? (
              <div role="alert" className="p-12 text-center space-y-3">
                <p className="text-xs font-bold text-rose-800">{loadError}</p>
                <button
                  type="button"
                  onClick={loadMenuData}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center text-gray-400 space-y-2">
                <UtensilsCrossed size={32} className="mx-auto opacity-25" />
                <p className="text-sm font-semibold text-servora-navy">
                  {items.length === 0
                    ? 'No POS menu items configured yet'
                    : 'No items found matching filter'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                    <th scope="col" className="p-4">Item Name</th>
                    <th scope="col" className="p-4">Category &amp; Station</th>
                    <th scope="col" className="p-4">Inventory / Raw Material Link</th>
                    <th scope="col" className="p-4 text-right">Price (KES)</th>
                    <th scope="col" className="p-4">Status</th>
                    <th scope="col" className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-servora-navy">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-servora-navy">{item.name}</div>
                        {item.sku && (
                          <div className="text-[10px] text-gray-400 font-mono">SKU: {item.sku}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-servora-deepTeal font-semibold">{item.category}</div>
                        <span className="inline-block mt-0.5 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-mono">
                          {item.kitchenStation || 'MAIN_KITCHEN'}
                        </span>
                      </td>
                      <td className="p-4">{renderInventoryLinkCell(item)}</td>
                      <td className="p-4 text-right font-mono font-bold text-servora-core">
                        KES {item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        {item.isAvailable ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                            <CheckCircle2 size={11} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                            <XCircle size={11} /> Hidden
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openItemModal(item)}
                            title="Edit Menu Item & Inventory Link"
                            aria-label={`Edit ${item.name}`}
                            className="p-1.5 text-gray-500 hover:text-servora-core hover:bg-servora-pale rounded-lg transition-colors"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteItem(item)}
                            title="Delete Menu Item"
                            aria-label={`Delete ${item.name}`}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MENU ITEM MODAL WITH INVENTORY & RAW MATERIAL LINKAGE */}
      {isItemModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-item-modal-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 id="menu-item-modal-title" className="text-base font-bold text-servora-navy">
                  {editingItem ? `Edit POS Menu Item: ${editingItem.name}` : 'Add POS Menu Item'}
                </h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Configure selling price, kitchen routing, and linked inventory / raw materials
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                aria-label="Close modal"
                className="text-gray-400 hover:text-servora-navy"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mi-name">
                    Item Name *
                  </label>
                  <input
                    id="mi-name"
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Nyama Choma Portion"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mi-cat">
                    Category *
                  </label>
                  <select
                    id="mi-cat"
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:border-servora-core focus:outline-none"
                  >
                    <option value="">Select category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mi-price">
                    Selling Price (KES) *
                  </label>
                  <input
                    id="mi-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="750.00"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mi-station">
                    Kitchen Station
                  </label>
                  <select
                    id="mi-station"
                    value={kitchenStation}
                    onChange={(e) => setKitchenStation(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  >
                    <option value="MAIN_KITCHEN">Main Kitchen</option>
                    <option value="GRILL">Grill &amp; Choma</option>
                    <option value="BAR">Bar &amp; Beverages</option>
                    <option value="PASTRY">Pastry &amp; Bakery</option>
                    <option value="COLD_PANTRY">Cold Pantry</option>
                    <option value="PACKING">Packing / Takeaway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mi-sku">
                    SKU / Code
                  </label>
                  <input
                    id="mi-sku"
                    type="text"
                    value={itemSku}
                    onChange={(e) => setItemSku(e.target.value)}
                    placeholder="MEAT-01"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              {/* INVENTORY & RAW MATERIAL LINKAGE PANEL */}
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-servora-navy flex items-center gap-1.5">
                    <Link2 size={14} className="text-servora-core" />
                    Inventory &amp; Raw Material Linkage
                  </span>
                  {liveEstimatedCost > 0 && (
                    <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      Est. COGS: KES {liveEstimatedCost.toFixed(2)}
                      {estimatedMarginPct !== null ? ` (${estimatedMarginPct.toFixed(1)}% margin)` : ''}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    className="block text-[11px] font-bold text-servora-navy mb-1"
                    htmlFor="mi-tracking"
                  >
                    Stock Depletion Mode *
                  </label>
                  <select
                    id="mi-tracking"
                    value={stockTrackingType}
                    onChange={(e) => setStockTrackingType(e.target.value as StockTrackingType)}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold focus:border-servora-core focus:outline-none"
                  >
                    <option value="RECIPE">RECIPE — Link Multiple Raw Materials (Kitchen BOM)</option>
                    <option value="STOCKED_PRODUCT">
                      STOCKED_PRODUCT — Direct 1:1 Link to a Stocked Inventory Product
                    </option>
                    <option value="COMPOSITE">COMPOSITE — Combined Prep &amp; Packaged Components</option>
                    <option value="NON_TRACKED">NON_TRACKED — No Stock Depletion</option>
                  </select>
                </div>

                {/* Direct 1:1 Stocked Product Selector */}
                {stockTrackingType === 'STOCKED_PRODUCT' && (
                  <div>
                    <label
                      className="block text-[11px] font-bold text-servora-navy mb-1"
                      htmlFor="mi-direct-inv"
                    >
                      Linked Inventory Product *
                    </label>
                    <select
                      id="mi-direct-inv"
                      required
                      value={directInventoryItemId}
                      onChange={(e) => setDirectInventoryItemId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:border-servora-core focus:outline-none"
                    >
                      <option value="">
                        {inventoryOptions.length === 0
                          ? 'No active inventory items found'
                          : 'Select inventory product to deduct on sale...'}
                      </option>
                      {inventoryOptions.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} ({inv.sku || 'NO-SKU'}) — Stock:{' '}
                          {parseFloat(inv.currentStock).toLocaleString()} {inv.unit} | Cost: KES{' '}
                          {parseFloat(inv.costPrice).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Multi-Ingredient Recipe BOM Builder */}
                {(stockTrackingType === 'RECIPE' || stockTrackingType === 'COMPOSITE') && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-600">
                        Linked Raw Materials / Recipe Ingredients ({recipeLines.length})
                      </span>
                      <button
                        type="button"
                        onClick={addRecipeLine}
                        disabled={inventoryOptions.length === 0}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-servora-core/40 text-servora-core rounded-lg text-[11px] font-bold hover:bg-blue-50 disabled:opacity-50"
                      >
                        <Plus size={12} /> Add Raw Material
                      </button>
                    </div>

                    {recipeLines.length === 0 ? (
                      <p className="text-[11px] text-gray-500 bg-white border border-dashed border-gray-300 rounded-xl p-3 text-center">
                        No raw materials linked yet. Click &quot;Add Raw Material&quot; to build the recipe Bill of Materials for automatic POS deduction.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {recipeLines.map((line, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-gray-200"
                          >
                            <div className="col-span-5">
                              <select
                                aria-label="Raw material"
                                value={line.inventoryItemId}
                                onChange={(e) =>
                                  updateRecipeLine(idx, { inventoryItemId: e.target.value })
                                }
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white font-medium"
                              >
                                <option value="">Select material...</option>
                                {inventoryOptions.map((inv) => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.name} ({inv.unit})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                step="0.0001"
                                min="0.0001"
                                aria-label="Quantity per portion"
                                placeholder="Qty"
                                value={line.quantity}
                                onChange={(e) =>
                                  updateRecipeLine(idx, { quantity: e.target.value })
                                }
                                className="w-full px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-lg"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="text"
                                aria-label="Unit"
                                value={line.unit}
                                onChange={(e) => updateRecipeLine(idx, { unit: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 font-mono"
                              />
                            </div>
                            <div className="col-span-1">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="100"
                                title="Wastage %"
                                aria-label="Wastage percentage"
                                value={line.wastagePercentage}
                                onChange={(e) =>
                                  updateRecipeLine(idx, { wastagePercentage: e.target.value })
                                }
                                className="w-full px-1.5 py-1.5 text-xs font-mono border border-gray-200 rounded-lg text-center"
                              />
                            </div>
                            <div className="col-span-1 text-right">
                              <button
                                type="button"
                                onClick={() => removeRecipeLine(idx)}
                                aria-label="Remove raw material line"
                                className="p-1 text-gray-400 hover:text-rose-600 rounded"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <p className="text-[10px] text-gray-400">
                          Columns: Raw Material &bull; Quantity per Portion &bull; Unit &bull; Wastage %
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mi-prep">
                    Prep Time (Minutes)
                  </label>
                  <input
                    id="mi-prep"
                    type="number"
                    min="0"
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <label className="flex items-center gap-2.5 pt-4 cursor-pointer text-xs font-bold text-servora-navy">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="rounded border-gray-300 text-servora-core w-4 h-4"
                  />
                  <span>Visible &amp; Available on Live POS</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mi-desc">
                  Description / Serving Note
                </label>
                <textarea
                  id="mi-desc"
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="Ingredients, allergens, or kitchen plating notes..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs h-16 focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs text-white bg-servora-core hover:bg-blue-700 rounded-xl font-bold disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingItem
                      ? 'Save Changes'
                      : 'Publish Menu Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {pendingDeleteItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-menu-item-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 id="delete-menu-item-title" className="text-sm font-bold text-servora-navy">
                  Delete Menu Item?
                </h3>
                <p className="text-xs text-servora-deepTeal mt-1 leading-relaxed">
                  Are you sure you want to delete{' '}
                  <strong className="text-servora-navy">{pendingDeleteItem.name}</strong>? Items referenced by historical POS orders cannot be deleted—hide them by toggling availability off instead.
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
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}