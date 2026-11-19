// apps/web/app/(dashboard)/inventory/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  X,
  Search,
  DollarSign,
  TrendingDown,
  Boxes,
  Sparkles,
  ChevronRight,
  Barcode,
  RefreshCw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

type MaterialType = 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'FINISHED_GOOD' | 'CONSUMABLE';
type ValuationMethod = 'FIFO' | 'AVCO' | 'STANDARD';
type TaxClassification = 'A_16' | 'B_ZERO' | 'E_EXEMPT';
type MovementType = 'GOODS_RECEIPT_PO' | 'WASTE_SCRAP' | 'PHYSICAL_INVENTORY_ADJ';
type StockStatusFilter = 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'ADEQUATE';

interface InventoryItem {
  id: number;
  branchId: number | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  materialType: MaterialType;
  category: string;
  unit: string;
  purchaseUnit: string | null;
  conversionFactor: string | null;
  preferredSupplierId: number | null;
  preferredSupplierName: string | null;
  currentStock: string;
  minThreshold: string;
  reorderQuantity: string;
  costPrice: string;
  valuationMethod: ValuationMethod;
  storageCondition: string;
  taxClassification: TaxClassification;
  allowNegativeStock: boolean;
  isActive: boolean;
}

interface InventorySummary {
  totalItems: number;
  activeItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalBookValuation: string;
}

interface StorageLocationOption {
  id: number;
  branchId: number;
  code: string;
  name: string;
  zoneType: string;
  isRefrigerated: boolean;
}

interface SupplierOption {
  id: number;
  name: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [storageLocations, setStorageLocations] = useState<StorageLocationOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Explicit Error & Banner States (Never mask failures as empty states)
  const [loadError, setLoadError] = useState<string | null>(null);
  const [referenceWarning, setReferenceWarning] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<'ALL' | MaterialType>('ALL');
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form States (New Item)
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [materialType, setMaterialType] = useState<MaterialType>('RAW_MATERIAL');
  const [category, setCategory] = useState('PRODUCE');
  const [unit, setUnit] = useState('kg');
  const [purchaseUnit, setPurchaseUnit] = useState('');
  const [conversionFactor, setConversionFactor] = useState('1');
  const [preferredSupplierId, setPreferredSupplierId] = useState('');
  const [openingStock, setOpeningStock] = useState('');
  const [minThreshold, setMinThreshold] = useState('10');
  const [reorderQuantity, setReorderQuantity] = useState('50');
  const [costPrice, setCostPrice] = useState('');
  const [valuationMethod, setValuationMethod] = useState<ValuationMethod>('FIFO');
  const [storageCondition, setStorageCondition] = useState('DRY_AMBIENT');
  const [taxClassification, setTaxClassification] = useState<TaxClassification>('A_16');

  // Dynamic Movement State
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<MovementType>('GOODS_RECEIPT_PO');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [customLocationBin, setCustomLocationBin] = useState('');
  const [isCustomBin, setIsCustomBin] = useState(false);
  const [batchLotNumber, setBatchLotNumber] = useState('');
  const [documentReference, setDocumentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadInventoryData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setReferenceWarning(null);

    const [itemsResult, locResult, supResult] = await Promise.allSettled([
      fetchApi('/api/v1/inventory/items'),
      fetchApi('/api/v1/inventory/locations'),
      fetchApi('/api/v1/suppliers'),
    ]);

    // 1. Authoritative Inventory Items & Summary
    if (itemsResult.status === 'fulfilled') {
      const payload = itemsResult.value?.data;
      const rawItems = Array.isArray(payload) ? payload : payload?.items;

      if (!Array.isArray(rawItems)) {
        setLoadError('Unexpected response structure received from inventory service.');
        setItems([]);
        setSummary(null);
      } else {
        setItems(rawItems);

        const rawSummary =
          payload && !Array.isArray(payload) && payload.summary && typeof payload.summary === 'object'
            ? payload.summary
            : null;

        // Compute fallback metrics directly from the returned tenant items when summary keys are absent
        let computedValuation = 0;
        let computedLowStock = 0;
        let computedOutOfStock = 0;
        let computedActive = 0;

        rawItems.forEach((item: InventoryItem) => {
          const stock = parseFloat(item.currentStock) || 0;
          const min = parseFloat(item.minThreshold) || 0;
          const cost = parseFloat(item.costPrice) || 0;

          if (item.isActive !== false) {
            computedActive++;
          }
          computedValuation += stock * cost;
          if (stock <= 0) {
            computedOutOfStock++;
          } else if (stock <= min) {
            computedLowStock++;
          }
        });

        setSummary({
          totalItems:
            typeof rawSummary?.totalItems === 'number'
              ? rawSummary.totalItems
              : typeof rawSummary?.itemCount === 'number'
                ? rawSummary.itemCount
                : rawItems.length,
          activeItems:
            typeof rawSummary?.activeItems === 'number'
              ? rawSummary.activeItems
              : typeof rawSummary?.itemCount === 'number'
                ? rawSummary.itemCount
                : computedActive,
          lowStockCount:
            typeof rawSummary?.lowStockCount === 'number'
              ? rawSummary.lowStockCount
              : typeof rawSummary?.lowStock === 'number'
                ? rawSummary.lowStock
                : computedLowStock,
          outOfStockCount:
            typeof rawSummary?.outOfStockCount === 'number'
              ? rawSummary.outOfStockCount
              : typeof rawSummary?.outOfStock === 'number'
                ? rawSummary.outOfStock
                : computedOutOfStock,
          totalBookValuation:
            rawSummary?.totalBookValuation !== undefined
              ? String(rawSummary.totalBookValuation)
              : rawSummary?.totalValuation !== undefined
                ? String(rawSummary.totalValuation)
                : computedValuation.toFixed(2),
        });
      }
    } else {
      setLoadError(
        getErrorMessage(itemsResult.reason, 'Failed to load inventory ledger from server.')
      );
      setItems([]);
      setSummary(null);
    }

    // 2. Relational Reference Data (Locations & Suppliers)
    const warnings: string[] = [];

    if (locResult.status === 'fulfilled') {
      const locPayload = locResult.value?.data;
      // Handle both flat array or warehouse topology objects ({ zones, bins })
      const rawLocations = Array.isArray(locPayload)
        ? locPayload
        : Array.isArray(locPayload?.zones)
          ? locPayload.zones
          : locPayload?.locations;

      setStorageLocations(Array.isArray(rawLocations) ? rawLocations : []);
    } else {
      setStorageLocations([]);
      warnings.push('Storage locations could not be loaded.');
    }

    if (supResult.status === 'fulfilled') {
      const rawSuppliers = supResult.value?.data?.suppliers ?? supResult.value?.data;
      setSuppliers(Array.isArray(rawSuppliers) ? rawSuppliers : []);
    } else {
      setSuppliers([]);
      warnings.push('Supplier directory could not be loaded.');
    }

    if (warnings.length > 0) {
      setReferenceWarning(warnings.join(' '));
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.sku && item.sku.toLowerCase().includes(query)) ||
        (item.barcode && item.barcode.toLowerCase().includes(query));

      const matchesCategory =
        selectedCategory === 'ALL' || item.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesType = materialTypeFilter === 'ALL' || item.materialType === materialTypeFilter;

      const stock = parseFloat(item.currentStock);
      const min = parseFloat(item.minThreshold);
      const hasValidNumbers = !Number.isNaN(stock) && !Number.isNaN(min);

      let matchesStatus = true;
      if (statusFilter === 'OUT_OF_STOCK') {
        matchesStatus = hasValidNumbers && stock <= 0;
      } else if (statusFilter === 'LOW_STOCK') {
        matchesStatus = hasValidNumbers && stock > 0 && stock <= min;
      } else if (statusFilter === 'ADEQUATE') {
        matchesStatus = hasValidNumbers && stock > min;
      }

      return matchesSearch && matchesCategory && matchesType && matchesStatus;
    });
  }, [items, searchTerm, selectedCategory, materialTypeFilter, statusFilter]);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [items]);

  const openCreateModal = () => {
    setFormError(null);
    setName('');
    setSku('');
    setBarcode('');
    setMaterialType('RAW_MATERIAL');
    setCategory('PRODUCE');
    setUnit('kg');
    setPurchaseUnit('');
    setConversionFactor('1');
    setPreferredSupplierId('');
    setOpeningStock('');
    setMinThreshold('10');
    setReorderQuantity('50');
    setCostPrice('');
    setValuationMethod('FIFO');
    setStorageCondition('DRY_AMBIENT');
    setTaxClassification('A_16');
    setIsAddModalOpen(true);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(null);

    const parsedConversion = parseFloat(conversionFactor);
    if (Number.isNaN(parsedConversion) || parsedConversion <= 0) {
      setFormError('Unit conversion multiplier must be greater than zero.');
      return;
    }

    const parsedCost = parseFloat(costPrice);
    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      setFormError('Standard cost must be a valid non-negative number.');
      return;
    }

    const parsedOpening = openingStock.trim() ? parseFloat(openingStock) : 0;
    if (Number.isNaN(parsedOpening) || parsedOpening < 0) {
      setFormError('Initial opening stock cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchApi('/api/v1/inventory/items', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim() || undefined,
          barcode: barcode.trim() || undefined,
          materialType,
          category,
          unit,
          purchaseUnit: purchaseUnit.trim() || undefined,
          conversionFactor: parsedConversion,
          preferredSupplierId: preferredSupplierId ? parseInt(preferredSupplierId, 10) : null,
          currentStock: parsedOpening,
          minThreshold: parseFloat(minThreshold || '0') || 0,
          reorderQuantity: parseFloat(reorderQuantity || '0') || 0,
          costPrice: parsedCost,
          valuationMethod,
          storageCondition,
          taxClassification,
          allowNegativeStock: false,
          isActive: true,
        }),
      });

      setIsAddModalOpen(false);
      setStatusBanner(`Material article "${name.trim()}" registered in tenant catalog.`);
      await loadInventoryData();
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, 'Failed to register inventory item.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAdjustModal = (
    item: InventoryItem,
    defaultType: MovementType = 'GOODS_RECEIPT_PO'
  ) => {
    setFormError(null);
    setSelectedItem(item);
    setAdjustmentType(defaultType);
    setAdjustmentQty('');
    setBatchLotNumber('');
    setDocumentReference('');
    setNotes('');
    setCustomLocationBin('');

    if (storageLocations.length > 0) {
      const matchLoc = storageLocations.find((l) => {
        if (item.storageCondition === 'CHILLED_2_8C' || item.storageCondition === 'CHILLED') {
          return l.isRefrigerated || l.zoneType.includes('CHILLED');
        }
        if (item.storageCondition === 'DEEP_FREEZE') {
          return l.zoneType.includes('FREEZE');
        }
        return !l.isRefrigerated;
      });
      setSelectedLocationId(matchLoc ? String(matchLoc.id) : String(storageLocations[0].id));
      setIsCustomBin(false);
    } else {
      setSelectedLocationId('CUSTOM');
      setIsCustomBin(true);
    }

    setIsAdjustModalOpen(true);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || isSubmitting) return;
    setFormError(null);

    const rawQty = parseFloat(adjustmentQty);
    if (Number.isNaN(rawQty) || rawQty === 0) {
      setFormError('Quantity delta must be a non-zero number.');
      return;
    }

    if (adjustmentType === 'GOODS_RECEIPT_PO' && rawQty < 0) {
      setFormError('Inward receipt quantity must be positive.');
      return;
    }

    let delta = rawQty;
    if (adjustmentType === 'WASTE_SCRAP' && delta > 0) {
      delta = -delta;
    }

    let locationId: number | null = null;
    let locationBin: string | null = null;

    if (isCustomBin) {
      const trimmedBin = customLocationBin.trim();
      if (!trimmedBin) {
        setFormError('Please select a configured storage location or enter a facility bin code.');
        return;
      }
      locationBin = trimmedBin;
    } else {
      const parsedLocId = parseInt(selectedLocationId, 10);
      if (Number.isNaN(parsedLocId)) {
        setFormError('Please select a valid storage location.');
        return;
      }
      locationId = parsedLocId;
    }

    setIsSubmitting(true);
    try {
      await fetchApi('/api/v1/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({
          inventoryItemId: selectedItem.id,
          type: adjustmentType,
          quantityDelta: delta,
          locationId,
          locationBin,
          batchNumber: batchLotNumber.trim() || undefined,
          documentReference: documentReference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      setIsAdjustModalOpen(false);
      setStatusBanner(
        `Posted ${adjustmentType} (${delta > 0 ? `+${delta}` : delta} ${selectedItem.unit}) for ${selectedItem.name}.`
      );
      setSelectedItem(null);
      await loadInventoryData();
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, 'Failed to post stock movement.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const bookValuation = summary ? parseFloat(summary.totalBookValuation) || 0 : null;

  return (
    <div className="space-y-6">
      {/* Status Confirmation Banner */}
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

      {/* Non-Blocking Reference Data Warning */}
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

      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-400">Inventory</span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-servora-navy">Stock Overview</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">
            Inventory &amp; Materials Management
          </h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Manage inventory master data, stock balances, material movements, and procurement controls across your authorized locations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadInventoryData}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold text-servora-deepTeal bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link
            href="/inventory/items"
            className="px-3.5 py-2 text-xs font-semibold text-servora-navy bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 inline-flex items-center gap-1.5"
          >
            <Boxes size={14} className="text-servora-deepTeal" />
            Item Specifications
          </Link>
          <Link
            href="/inventory/reorder"
            className="px-3.5 py-2 text-xs font-semibold text-servora-core bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100 inline-flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            Smart Reorder (MRP)
          </Link>
          <button
            type="button"
            onClick={openCreateModal}
            className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={15} /> Create Product
          </button>
        </div>
      </div>

      {/* Authoritative Server Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
              Standard Book Valuation
            </span>
            <h3 className="text-lg font-bold text-servora-navy mt-1">
              {bookValuation !== null
                ? `KES ${bookValuation.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : '—'}
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium">
              On-hand quantity &times; master unit cost
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
              Master Catalog
            </span>
            <h3 className="text-lg font-bold text-servora-navy mt-1">
              {summary ? `${summary.activeItems} Articles` : '—'}
            </h3>
            <span className="text-[11px] text-servora-deepTeal font-medium">
              Active tenant-scoped SKUs
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
            <Package size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
              Low Stock Watch
            </span>
            <h3 className="text-lg font-bold text-amber-700 mt-1">
              {summary ? `${summary.lowStockCount} Items` : '—'}
            </h3>
            <span className="text-[11px] text-amber-600 font-medium">
              At or below safety threshold
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
              Out of Stock
            </span>
            <h3 className="text-lg font-bold text-rose-700 mt-1">
              {summary ? `${summary.outOfStockCount} Items` : '—'}
            </h3>
            <span className="text-[11px] text-rose-600 font-medium">
              Zero balance / Stockout risk
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Query Header */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              aria-label="Search inventory by title, SKU, or barcode"
              placeholder="Search ingredient by title, SKU, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter by material classification"
            value={materialTypeFilter}
            onChange={(e) => setMaterialTypeFilter(e.target.value as 'ALL' | MaterialType)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white font-medium text-servora-navy"
          >
            <option value="ALL">All Material Types</option>
            <option value="RAW_MATERIAL">Raw Materials</option>
            <option value="SEMI_FINISHED">Sub-Assemblies / Preps</option>
            <option value="FINISHED_GOOD">Finished Dishes</option>
            <option value="CONSUMABLE">Consumables &amp; Packaging</option>
          </select>

          <select
            aria-label="Filter by category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white font-medium text-servora-navy"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-white shadow-xs text-servora-navy font-bold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All Items
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('LOW_STOCK')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'LOW_STOCK'
                ? 'bg-white shadow-xs text-amber-700 font-bold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Low Stock ({summary?.lowStockCount ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('OUT_OF_STOCK')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'OUT_OF_STOCK'
                ? 'bg-white shadow-xs text-rose-700 font-bold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Depleted ({summary?.outOfStockCount ?? 0})
          </button>
        </div>
      </div>

      {/* Main Stock Table / States */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Loading tenant material ledger...
          </div>
        ) : loadError ? (
          <div role="alert" className="p-12 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={20} />
            </div>
            <p className="text-xs font-bold text-rose-800">{loadError}</p>
            <button
              type="button"
              onClick={loadInventoryData}
              className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
            >
              Retry Request
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-servora-core">
              <Package size={20} />
            </div>
            <h2 className="text-sm font-bold text-servora-navy">No Inventory Articles Configured</h2>
            <p className="text-xs text-servora-deepTeal max-w-md mx-auto">
              Your tenant material catalog is currently empty. Create your first raw ingredient, beverage, or consumable article to begin tracking stock movements.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
            >
              <Plus size={14} /> Create First Product
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-servora-deepTeal text-xs">
            No stock records matched your active search or status filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th scope="col" className="py-3.5 px-4">Product &amp; Code</th>
                  <th scope="col" className="py-3.5 px-4">Type &amp; Tax</th>
                  <th scope="col" className="py-3.5 px-4">Unrestricted Stock</th>
                  <th scope="col" className="py-3.5 px-4">Procurement Dual-UoM</th>
                  <th scope="col" className="py-3.5 px-4">Reorder Minimum</th>
                  <th scope="col" className="py-3.5 px-4">Standard Cost</th>
                  <th scope="col" className="py-3.5 px-4">Book Value</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredItems.map((item) => {
                  const stock = parseFloat(item.currentStock) || 0;
                  const min = parseFloat(item.minThreshold) || 0;
                  const cost = parseFloat(item.costPrice) || 0;
                  const totalVal = stock * cost;

                  const isOutOfStock = stock <= 0;
                  const isLowStock = !isOutOfStock && stock <= min;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-servora-navy block">{item.name}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
                          <span>{item.sku || 'NO-SKU'}</span>
                          {item.barcode && (
                            <>
                              <span>&bull;</span>
                              <span className="flex items-center gap-0.5">
                                <Barcode size={10} /> {item.barcode}
                              </span>
                            </>
                          )}
                        </div>
                        {item.preferredSupplierName && (
                          <span className="block text-[10px] text-servora-deepTeal mt-0.5">
                            Supplier: {item.preferredSupplierName}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[10px] uppercase font-bold text-servora-deepTeal bg-gray-100 px-2 py-0.5 rounded-md block w-fit">
                          {item.materialType ? item.materialType.replace('_', ' ') : item.category}
                        </span>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                          {item.category} &bull;{' '}
                          {item.taxClassification === 'A_16'
                            ? '16% VAT'
                            : item.taxClassification === 'B_ZERO'
                              ? '0% Zero'
                              : 'Exempt'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isLowStock
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}
                        >
                          {(isLowStock || isOutOfStock) && <AlertTriangle size={11} />}
                          {stock.toLocaleString()} {item.unit}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.purchaseUnit && item.purchaseUnit !== item.unit ? (
                          <span className="text-[11px] text-servora-navy font-medium block">
                            1 {item.purchaseUnit} = {item.conversionFactor} {item.unit}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">Direct {item.unit}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-gray-600">
                        {min.toLocaleString()} {item.unit}
                        {item.reorderQuantity && parseFloat(item.reorderQuantity) > 0 && (
                          <span className="block text-[10px] text-gray-400">
                            Lot: {parseFloat(item.reorderQuantity).toLocaleString()}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium">
                        KES {cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-gray-400 font-normal"> / {item.unit}</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-servora-navy">
                        KES {totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAdjustModal(item, 'GOODS_RECEIPT_PO')}
                            title="Post Goods Receipt (+)"
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold transition-colors inline-flex items-center gap-1 text-[11px]"
                          >
                            + Inward
                          </button>
                          <button
                            type="button"
                            onClick={() => openAdjustModal(item, 'PHYSICAL_INVENTORY_ADJ')}
                            title="Post Material Movement"
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-servora-navy rounded-lg font-medium transition-colors inline-flex items-center gap-1 text-[11px]"
                          >
                            <ArrowUpDown size={11} /> Move
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE INVENTORY ITEM MODAL */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-item-modal-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 id="create-item-modal-title" className="text-sm font-bold text-servora-navy">
                  Register New Material Article
                </h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Define kitchen ingredients, procurement packages, and tax rules
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
                className="text-gray-400 hover:text-servora-navy"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-semibold text-rose-800"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="item-name">
                  Article Description *
                </label>
                <input
                  id="item-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kerrygold Pure Unsalted Butter"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="item-sku">
                    Internal SKU
                  </label>
                  <input
                    id="item-sku"
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="ING-BTR-01"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="item-barcode">
                    GTIN / EAN Barcode
                  </label>
                  <input
                    id="item-barcode"
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="6001234567890"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="item-mat-type">
                    Material Classification *
                  </label>
                  <select
                    id="item-mat-type"
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="RAW_MATERIAL">Raw Material (Kitchen Ingredient)</option>
                    <option value="SEMI_FINISHED">Semi-Finished (Sub-Prep Batch)</option>
                    <option value="FINISHED_GOOD">Finished Good (Direct Sale)</option>
                    <option value="CONSUMABLE">Operating Consumable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="item-category">
                    Category *
                  </label>
                  <select
                    id="item-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="PRODUCE">PRODUCE (Vegetables, Fruits, Herbs)</option>
                    <option value="MEAT">MEAT &amp; POULTRY (Beef, Goat, Chicken)</option>
                    <option value="DAIRY">DAIRY (Milk, Cheese, Butter)</option>
                    <option value="PANTRY">PANTRY &amp; DRY (Spices, Oils, Sauces)</option>
                    <option value="BAKERY">BAKERY (Flour, Yeast, Buns)</option>
                    <option value="BEVERAGE">BEVERAGES (Syrups, Coffee, Tea)</option>
                    <option value="PACKAGING">PACKAGING (Boxes, Cups, Cutlery)</option>
                  </select>
                </div>
              </div>

              {/* Dual UoM Procurement Bridge */}
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-2">
                <span className="text-[11px] font-bold uppercase text-servora-navy tracking-wider block">
                  Dual Unit of Measure (UoM) Conversion
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1" htmlFor="item-unit">
                      Base Tracking Unit
                    </label>
                    <select
                      id="item-unit"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-bold"
                    >
                      <option value="kg">kg (Kilograms)</option>
                      <option value="g">g (Grams)</option>
                      <option value="litres">litres (Litres)</option>
                      <option value="ml">ml (Millilitres)</option>
                      <option value="pcs">pcs (Pieces)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1" htmlFor="item-purchase-unit">
                      Purchase Package
                    </label>
                    <input
                      id="item-purchase-unit"
                      type="text"
                      value={purchaseUnit}
                      onChange={(e) => setPurchaseUnit(e.target.value)}
                      placeholder="e.g. Crate, Bag, Box"
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1" htmlFor="item-conv">
                      Multiplier Ratio
                    </label>
                    <input
                      id="item-conv"
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={conversionFactor}
                      onChange={(e) => setConversionFactor(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="item-cost">
                    Standard Cost / {unit} (KES) *
                  </label>
                  <input
                    id="item-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="850.00"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="item-min">
                    Safety Reorder Min
                  </label>
                  <input
                    id="item-min"
                    type="number"
                    step="0.001"
                    min="0"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="item-opening">
                    Opening Stock (Ledger)
                  </label>
                  <input
                    id="item-opening"
                    type="number"
                    step="0.001"
                    min="0"
                    value={openingStock}
                    onChange={(e) => setOpeningStock(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="item-supplier">
                    Preferred Supplier
                  </label>
                  <select
                    id="item-supplier"
                    value={preferredSupplierId}
                    onChange={(e) => setPreferredSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="">
                      {suppliers.length === 0 ? 'No active suppliers configured' : 'No supplier assigned'}
                    </option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="item-tax">
                    Tax Classification *
                  </label>
                  <select
                    id="item-tax"
                    value={taxClassification}
                    onChange={(e) => setTaxClassification(e.target.value as TaxClassification)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-bold"
                  >
                    <option value="A_16">Class A: Standard Rated (16.00%)</option>
                    <option value="B_ZERO">Class B: Zero Rated (0.00%)</option>
                    <option value="E_EXEMPT">Class E: VAT Exempt</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="item-reorder">
                    Reorder Lot Qty
                  </label>
                  <input
                    id="item-reorder"
                    type="number"
                    step="0.001"
                    min="0"
                    value={reorderQuantity}
                    onChange={(e) => setReorderQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="item-val">
                    Valuation Method
                  </label>
                  <select
                    id="item-val"
                    value={valuationMethod}
                    onChange={(e) => setValuationMethod(e.target.value as ValuationMethod)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="FIFO">FIFO (First-In, First-Out)</option>
                    <option value="AVCO">AVCO (Weighted Average)</option>
                    <option value="STANDARD">STANDARD Cost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="item-storage">
                    Storage Condition
                  </label>
                  <select
                    id="item-storage"
                    value={storageCondition}
                    onChange={(e) => setStorageCondition(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="DRY_AMBIENT">Dry Ambient</option>
                    <option value="CHILLED_2_8C">Chilled (2&deg;C – 8&deg;C)</option>
                    <option value="DEEP_FREEZE">Deep Freeze</option>
                    <option value="WARM_HEATED">Warm / Heated</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Registering...' : 'Save Material Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK & GOODS RECEIPT MODAL */}
      {isAdjustModalOpen && selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-movement-modal-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 id="post-movement-modal-title" className="text-sm font-bold text-servora-navy">
                  Post Stock Movement: {selectedItem.name}
                </h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Balance On-Hand:{' '}
                  <strong className="text-servora-navy font-bold">
                    {parseFloat(selectedItem.currentStock).toLocaleString()} {selectedItem.unit}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                aria-label="Close modal"
                className="text-gray-400 hover:text-servora-navy"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-semibold text-rose-800"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleAdjustStock} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mov-type">
                  Transaction Movement Type Code *
                </label>
                <select
                  id="mov-type"
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as MovementType)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                >
                  <option value="GOODS_RECEIPT_PO">GOODS_RECEIPT_PO: Inward Stock Intake (+)</option>
                  <option value="PHYSICAL_INVENTORY_ADJ">
                    PHYSICAL_INVENTORY_ADJ: Audit Recalibration (+/-)
                  </option>
                  <option value="WASTE_SCRAP">WASTE_SCRAP: Spoilage / Floor Scrap (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mov-qty">
                  Quantity Delta ({selectedItem.unit}) *
                </label>
                <input
                  id="mov-qty"
                  type="number"
                  step="0.001"
                  required
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  placeholder={
                    adjustmentType === 'WASTE_SCRAP' ? 'Enter waste amount (e.g. 5.0)' : '25.0'
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none font-mono"
                />
              </div>

              {/* Relational Storage Location Picker */}
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mov-location">
                  Storage Location / Facility Bin *
                </label>
                {storageLocations.length === 0 && (
                  <p className="text-[11px] text-amber-700 mb-1.5">
                    No facility storage locations configured yet. Enter a bin reference below or configure locations in Warehouse Settings.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className={isCustomBin ? 'col-span-1' : 'col-span-2'}>
                    <select
                      id="mov-location"
                      value={selectedLocationId}
                      onChange={(e) => {
                        setSelectedLocationId(e.target.value);
                        if (e.target.value === 'CUSTOM') {
                          setIsCustomBin(true);
                          setCustomLocationBin('');
                        } else {
                          setIsCustomBin(false);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium"
                    >
                      <option value="">Select storage bin...</option>
                      {storageLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.code} — {loc.name}{' '}
                          {loc.isRefrigerated ? '(Refrigerated)' : '(Ambient)'}
                        </option>
                      ))}
                      <option value="CUSTOM">+ Specify Station / Bin</option>
                    </select>
                  </div>
                  {isCustomBin && (
                    <div className="col-span-1">
                      <input
                        type="text"
                        aria-label="Custom storage bin code"
                        placeholder="e.g. Line Station 2B"
                        value={customLocationBin}
                        onChange={(e) => setCustomLocationBin(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium focus:border-servora-core focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mov-batch">
                    Lot / Batch ID (Optional)
                  </label>
                  <input
                    id="mov-batch"
                    type="text"
                    placeholder="e.g. LOT-2026-B12"
                    value={batchLotNumber}
                    onChange={(e) => setBatchLotNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono uppercase focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mov-doc-ref">
                    Document Ref (Optional)
                  </label>
                  <input
                    id="mov-doc-ref"
                    type="text"
                    placeholder="e.g. GRN-2026-004"
                    value={documentReference}
                    onChange={(e) => setDocumentReference(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono uppercase focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mov-notes">
                  Audit Notes
                </label>
                <input
                  id="mov-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Supplier delivery reconciliation #INV-8891"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Posting Ledger...' : 'Commit Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}