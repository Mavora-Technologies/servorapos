// apps/web/app/(dashboard)/inventory/items/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Boxes,
  Building2,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Snowflake,
  Flame,
  Barcode,
  DollarSign,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

type MaterialType = 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'FINISHED_GOOD' | 'CONSUMABLE';
type ValuationMethod = 'FIFO' | 'AVCO' | 'STANDARD';
type TrackingMethod = 'BATCH_EXPIRY' | 'SERIALIZED' | 'NONE';
type StorageCondition = 'DRY_AMBIENT' | 'CHILLED_2_8C' | 'DEEP_FREEZE' | 'WARM_HEATED';
type TaxClassification = 'A_16' | 'B_ZERO' | 'E_EXEMPT';
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type ModalTab = 'GENERAL' | 'PROCUREMENT' | 'LOGISTICS' | 'FINANCE';

interface InventoryItemMaster {
  id: number;
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
  preferredSupplierLeadTime: number | null;
  currentStock: string;
  minThreshold: string;
  reorderQuantity: string;
  costPrice: string;
  valuationMethod: ValuationMethod;
  trackingMethod: TrackingMethod;
  storageCondition: StorageCondition;
  taxClassification: TaxClassification;
  allowNegativeStock: boolean;
  isActive: boolean;
}

interface SupplierOption {
  id: number;
  name: string;
  leadTimeDays?: number;
}

interface CatalogSummary {
  totalCatalogItems: number;
  activeItems: number;
  totalStockValuation: number;
  criticalItemsCount: number;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function InventoryItemsMasterPage() {
  const [items, setItems] = useState<InventoryItemMaster[]>([]);
  const [summary, setSummary] = useState<CatalogSummary | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Page-Level Error & Feedback States
  const [loadError, setLoadError] = useState<string | null>(null);
  const [referenceWarning, setReferenceWarning] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<'ALL' | MaterialType>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemMaster | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<ModalTab>('GENERAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [pendingDeleteItem, setPendingDeleteItem] = useState<InventoryItemMaster | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [materialType, setMaterialType] = useState<MaterialType>('RAW_MATERIAL');
  const [category, setCategory] = useState('PRODUCE');
  const [unit, setUnit] = useState('kg');
  const [purchaseUnit, setPurchaseUnit] = useState('');
  const [conversionFactor, setConversionFactor] = useState('1');
  const [preferredSupplierId, setPreferredSupplierId] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [valuationMethod, setValuationMethod] = useState<ValuationMethod>('FIFO');
  const [minThreshold, setMinThreshold] = useState('0');
  const [reorderQuantity, setReorderQuantity] = useState('0');
  const [trackingMethod, setTrackingMethod] = useState<TrackingMethod>('BATCH_EXPIRY');
  const [storageCondition, setStorageCondition] = useState<StorageCondition>('DRY_AMBIENT');
  const [taxClassification, setTaxClassification] = useState<TaxClassification>('A_16');
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setReferenceWarning(null);

    const [itemsResult, suppliersResult] = await Promise.allSettled([
      fetchApi('/api/v1/inventory/items'),
      fetchApi('/api/v1/suppliers'),
    ]);

    if (itemsResult.status === 'fulfilled') {
      const payload = itemsResult.value?.data;
      const rawItems = Array.isArray(payload) ? payload : payload?.items;

      if (!Array.isArray(rawItems)) {
        setLoadError('Unexpected response structure received from material catalog API.');
        setItems([]);
        setSummary(null);
      } else {
        setItems(rawItems);
        const rawSummary = payload && !Array.isArray(payload) ? payload.summary : null;
        if (rawSummary && typeof rawSummary === 'object') {
          setSummary({
            totalCatalogItems: Number(rawSummary.totalCatalogItems ?? rawSummary.totalItems ?? rawItems.length),
            activeItems: Number(rawSummary.activeItems ?? rawItems.filter((i: InventoryItemMaster) => i.isActive).length),
            totalStockValuation: Number(rawSummary.totalStockValuation ?? rawSummary.totalBookValuation ?? 0),
            criticalItemsCount: Number(rawSummary.criticalItemsCount ?? 0),
          });
        } else {
          setSummary(null);
        }
      }
    } else {
      setLoadError(getErrorMessage(itemsResult.reason, 'Failed to load material catalog.'));
      setItems([]);
      setSummary(null);
    }

    if (suppliersResult.status === 'fulfilled') {
      const rawSuppliers =
        suppliersResult.value?.data?.suppliers ?? suppliersResult.value?.data;
      setSuppliers(Array.isArray(rawSuppliers) ? rawSuppliers : []);
    } else {
      setSuppliers([]);
      setReferenceWarning('Supplier directory could not be loaded. Preferred supplier selection may be unavailable.');
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openModal = (item?: InventoryItemMaster) => {
    setActiveModalTab('GENERAL');
    setModalError(null);

    if (item) {
      setEditingItem(item);
      setName(item.name);
      setSku(item.sku || '');
      setBarcode(item.barcode || '');
      setMaterialType(item.materialType || 'RAW_MATERIAL');
      setCategory(item.category);
      setUnit(item.unit);
      setPurchaseUnit(item.purchaseUnit || '');
      setConversionFactor(item.conversionFactor || '1');
      setPreferredSupplierId(item.preferredSupplierId ? String(item.preferredSupplierId) : '');
      setCostPrice(item.costPrice);
      setValuationMethod(item.valuationMethod || 'FIFO');
      setMinThreshold(item.minThreshold);
      setReorderQuantity(item.reorderQuantity);
      setTrackingMethod(item.trackingMethod || 'BATCH_EXPIRY');
      setStorageCondition(item.storageCondition || 'DRY_AMBIENT');
      setTaxClassification(item.taxClassification || 'A_16');
      setAllowNegativeStock(item.allowNegativeStock);
      setIsActive(item.isActive);
    } else {
      setEditingItem(null);
      setName('');
      setSku('');
      setBarcode('');
      setMaterialType('RAW_MATERIAL');
      setCategory('PRODUCE');
      setUnit('kg');
      setPurchaseUnit('');
      setConversionFactor('1');
      setPreferredSupplierId('');
      setCostPrice('');
      setValuationMethod('FIFO');
      setMinThreshold('0');
      setReorderQuantity('0');
      setTrackingMethod('BATCH_EXPIRY');
      setStorageCondition('DRY_AMBIENT');
      setTaxClassification('A_16');
      setAllowNegativeStock(false);
      setIsActive(true);
    }

    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setModalError(null);

    if (name.trim().length < 2) {
      setActiveModalTab('GENERAL');
      setModalError('Material description must be at least 2 characters.');
      return;
    }

    const parsedConversion = parseFloat(conversionFactor);
    if (Number.isNaN(parsedConversion) || parsedConversion <= 0) {
      setActiveModalTab('PROCUREMENT');
      setModalError('Conversion multiplier ratio must be greater than zero.');
      return;
    }

    const parsedMinThreshold = parseFloat(minThreshold || '0');
    const parsedReorderQty = parseFloat(reorderQuantity || '0');
    if (
      Number.isNaN(parsedMinThreshold) ||
      parsedMinThreshold < 0 ||
      Number.isNaN(parsedReorderQty) ||
      parsedReorderQty < 0
    ) {
      setActiveModalTab('PROCUREMENT');
      setModalError('Safety threshold and reorder quantity must be zero or greater.');
      return;
    }

    const parsedCost = parseFloat(costPrice);
    if (costPrice.trim() === '' || Number.isNaN(parsedCost) || parsedCost < 0) {
      setActiveModalTab('FINANCE');
      setModalError('Standard cost per base unit is required and must be non-negative.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      sku: sku.trim() || null,
      barcode: barcode.trim() || null,
      materialType,
      category,
      unit,
      purchaseUnit: purchaseUnit.trim() || null,
      conversionFactor: parsedConversion,
      preferredSupplierId: preferredSupplierId ? parseInt(preferredSupplierId, 10) : null,
      costPrice: parsedCost,
      valuationMethod,
      minThreshold: parsedMinThreshold,
      reorderQuantity: parsedReorderQty,
      trackingMethod,
      storageCondition,
      taxClassification,
      allowNegativeStock,
      isActive,
    };

    try {
      if (editingItem) {
        await fetchApi(`/api/v1/inventory/items/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setStatusBanner(`Updated material specification for "${name.trim()}".`);
      } else {
        await fetchApi('/api/v1/inventory/items', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setStatusBanner(`Created material record "${name.trim()}".`);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setModalError(getErrorMessage(err, 'Failed to save material specification.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteItem || isDeleting) return;
    setIsDeleting(true);
    setActionError(null);

    try {
      await fetchApi(`/api/v1/inventory/items/${pendingDeleteItem.id}`, {
        method: 'DELETE',
      });
      const deletedName = pendingDeleteItem.name;
      setPendingDeleteItem(null);
      setStatusBanner(`Deleted material "${deletedName}" from catalog.`);
      await loadData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to delete material record.'));
      setPendingDeleteItem(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const categories = useMemo(() => {
    const unique = new Set(items.map((i) => i.category).filter(Boolean));
    return ['ALL', ...Array.from(unique)];
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.sku && item.sku.toLowerCase().includes(query)) ||
        (item.barcode && item.barcode.toLowerCase().includes(query));

      const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesType = materialTypeFilter === 'ALL' || item.materialType === materialTypeFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && item.isActive) ||
        (statusFilter === 'INACTIVE' && !item.isActive);

      return matchesSearch && matchesCat && matchesType && matchesStatus;
    });
  }, [items, searchTerm, selectedCategory, materialTypeFilter, statusFilter]);

  const getStorageBadge = (condition: StorageCondition) => {
    switch (condition) {
      case 'CHILLED_2_8C':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
            <Snowflake size={10} /> Chilled (2–8&deg;C)
          </span>
        );
      case 'DEEP_FREEZE':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <Snowflake size={10} /> Deep Freeze (-18&deg;C)
          </span>
        );
      case 'WARM_HEATED':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <Flame size={10} /> Heated Cabinet
          </span>
        );
      default:
        return (
          <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
            Ambient Dry
          </span>
        );
    }
  };

  const getMaterialTypeBadge = (type: MaterialType) => {
    switch (type) {
      case 'RAW_MATERIAL':
        return <span className="text-[10px] font-bold text-servora-navy bg-slate-100 px-2 py-0.5 rounded">Raw Mat</span>;
      case 'SEMI_FINISHED':
        return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Sub-Prep</span>;
      case 'FINISHED_GOOD':
        return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Finished</span>;
      case 'CONSUMABLE':
        return <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">Packaging</span>;
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
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
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

      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/inventory"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Inventory Ledger <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Enterprise Material Master</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Material &amp; Catalog Specifications</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Configure GTIN barcodes, dual UoM conversion ratios, tax classification, and storage protocols.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold text-servora-deepTeal bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={15} /> Add New Material
          </button>
        </div>
      </div>

      {/* Authoritative Telemetry Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                Catalog Book Valuation
              </span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">
                KES {summary.totalStockValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-emerald-600 font-medium">
                On-hand quantity &times; standard unit cost
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                SKUs Requiring Restock
              </span>
              <h3 className="text-lg font-bold text-amber-700 mt-1">
                {summary.criticalItemsCount} Items
              </h3>
              <span className="text-[11px] text-amber-600 font-medium">
                Active items at or below safety threshold
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                Master Catalog Articles
              </span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">
                {summary.activeItems} / {summary.totalCatalogItems} Active
              </h3>
              <span className="text-[11px] text-servora-deepTeal font-medium">
                Tenant-scoped material specifications
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
              <Boxes size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              aria-label="Search by SKU, item name, or barcode"
              placeholder="Search by SKU, item name, or GTIN barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter by material type"
            value={materialTypeFilter}
            onChange={(e) => setMaterialTypeFilter(e.target.value as 'ALL' | MaterialType)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white font-medium text-servora-navy"
          >
            <option value="ALL">All Material Types</option>
            <option value="RAW_MATERIAL">Raw Materials</option>
            <option value="SEMI_FINISHED">Sub-Recipes / Preps</option>
            <option value="FINISHED_GOOD">Finished Dishes / Retail</option>
            <option value="CONSUMABLE">Packaging &amp; Supplies</option>
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
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === st
                  ? 'bg-white shadow-xs text-servora-navy font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {st === 'ALL' ? `All (${items.length})` : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Enterprise Catalog Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Loading tenant material master catalog...
          </div>
        ) : loadError ? (
          <div role="alert" className="p-12 text-center space-y-3">
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
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-servora-core">
              <Boxes size={20} />
            </div>
            <h2 className="text-sm font-bold text-servora-navy">No Material Specifications Yet</h2>
            <p className="text-xs text-servora-deepTeal max-w-md mx-auto">
              Register your first raw ingredient, sub-prep, or consumable article to configure UoM conversions, suppliers, and reorder controls.
            </p>
            <button
              type="button"
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
            >
              <Plus size={14} /> Create First Material Record
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No items found matching the selected search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th scope="col" className="py-3.5 px-4">Article &amp; Barcode</th>
                  <th scope="col" className="py-3.5 px-4">Type &amp; Storage</th>
                  <th scope="col" className="py-3.5 px-4">Base Consumption Unit</th>
                  <th scope="col" className="py-3.5 px-4">Procurement Packaging (UoM)</th>
                  <th scope="col" className="py-3.5 px-4">Unit Standard Cost</th>
                  <th scope="col" className="py-3.5 px-4">Replenish Point</th>
                  <th scope="col" className="py-3.5 px-4">Preferred Purveyor</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="font-bold text-servora-navy block">{item.name}</span>
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-gray-400">
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
                        </div>
                        {!item.isActive && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div>{getMaterialTypeBadge(item.materialType)}</div>
                        <div>{getStorageBadge(item.storageCondition)}</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-servora-navy">
                      {item.unit}
                      <span className="block text-[10px] font-normal text-gray-400 font-mono">
                        Tracking: {item.trackingMethod === 'BATCH_EXPIRY' ? 'FEFO Batch' : item.trackingMethod}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-servora-navy">
                        1 {item.purchaseUnit || item.unit}
                        <ArrowRight size={10} className="text-gray-400" />
                        {Number(item.conversionFactor || 1)} {item.unit}
                      </span>
                      <span className="block text-[10px] text-gray-400 font-mono">
                        KES {(Number(item.costPrice) * Number(item.conversionFactor || 1)).toFixed(2)} /{' '}
                        {item.purchaseUnit || item.unit}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-servora-core">
                      KES {Number(item.costPrice).toFixed(2)}
                      <span className="text-[10px] text-gray-400 font-normal"> / {item.unit}</span>
                      <span className="block text-[9.5px] text-gray-400 font-sans font-normal">
                        Policy: {item.valuationMethod}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[11px] font-mono">
                        <span className="text-gray-500">Min: </span>
                        <strong className="text-servora-navy">
                          {Number(item.minThreshold)} {item.unit}
                        </strong>
                        <span className="block text-gray-400 text-[10px]">
                          Target Batch: {Number(item.reorderQuantity)} {item.unit}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.preferredSupplierName ? (
                        <div>
                          <span className="inline-flex items-center gap-1 font-medium text-servora-navy">
                            <Building2 size={12} className="text-servora-deepTeal shrink-0" />
                            {item.preferredSupplierName}
                          </span>
                          {item.preferredSupplierLeadTime !== null && (
                            <span className="block text-[10px] text-gray-400 font-mono">
                              Lead Time: {item.preferredSupplierLeadTime} Days
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned Purveyor</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openModal(item)}
                          className="p-1.5 text-gray-500 hover:text-servora-core rounded-lg hover:bg-servora-pale transition-colors"
                          title="Edit Master Specification"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteItem(item)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete Material"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MULTI-TAB MATERIAL MASTER MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="material-master-modal-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 id="material-master-modal-title" className="text-sm font-bold text-servora-navy">
                  {editingItem
                    ? `Edit Material Record: ${editingItem.name}`
                    : 'New Enterprise Material Master'}
                </h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Define item classification, procurement packages, storage compliance, and tax rules
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
                className="text-gray-400 hover:text-servora-navy"
              >
                <X size={18} />
              </button>
            </div>

            {/* Segmented Operational Tabs */}
            <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 pb-2">
              {(
                [
                  { id: 'GENERAL', label: '1. Identification & Base UoM' },
                  { id: 'PROCUREMENT', label: '2. Purchasing & Suppliers' },
                  { id: 'LOGISTICS', label: '3. Storage & Traceability' },
                  { id: 'FINANCE', label: '4. Valuation & Tax' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveModalTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    activeModalTab === tab.id
                      ? 'bg-servora-pale text-servora-core border border-servora-core/30'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSave} noValidate className="space-y-4">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-semibold"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* TAB 1: GENERAL & BASE UOM */}
              {activeModalTab === 'GENERAL' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mm-name">
                      Material Description *
                    </label>
                    <input
                      id="mm-name"
                      type="text"
                      required
                      placeholder="e.g. Kerrygold Pure Irish Butter (Block)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mm-sku">
                        Internal Article SKU
                      </label>
                      <input
                        id="mm-sku"
                        type="text"
                        placeholder="e.g. ING-DRY-BTR"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mm-barcode">
                        EAN / GTIN Barcode
                      </label>
                      <input
                        id="mm-barcode"
                        type="text"
                        placeholder="e.g. 6001234567890"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mm-type">
                        Material Type (Classification) *
                      </label>
                      <select
                        id="mm-type"
                        value={materialType}
                        onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                      >
                        <option value="RAW_MATERIAL">Raw Material (Kitchen Ingredients)</option>
                        <option value="SEMI_FINISHED">Semi-Finished (In-House Sauces, Preps, Dough)</option>
                        <option value="FINISHED_GOOD">Finished Good (Retail Drinks, Direct POS)</option>
                        <option value="CONSUMABLE">Operating Consumable (Boxes, Bags, Foil)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mm-cat">
                        Catalog Department Category *
                      </label>
                      <select
                        id="mm-cat"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                      >
                        <option value="PRODUCE">PRODUCE (Vegetables, Herbs, Fruits)</option>
                        <option value="MEAT">MEAT &amp; POULTRY (Beef, Lamb, Chicken)</option>
                        <option value="DAIRY">DAIRY (Cheeses, Milk, Heavy Cream)</option>
                        <option value="PANTRY">PANTRY &amp; DRY (Spices, Oils, Canned)</option>
                        <option value="BAKERY">BAKERY (Flour, Grains, Yeast)</option>
                        <option value="BEVERAGE">BEVERAGES (Syrups, Coffee Beans, Tea)</option>
                        <option value="PACKAGING">PACKAGING &amp; DISPOSABLES</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mm-unit">
                      Base Consumption Unit of Measure (UoM Base) *
                    </label>
                    <select
                      id="mm-unit"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-bold text-servora-core"
                    >
                      <option value="kg">kg (Kilograms) - Weight Base</option>
                      <option value="g">g (Grams) - Precision Recipe Base</option>
                      <option value="litres">litres (Litres) - Volume Base</option>
                      <option value="ml">ml (Millilitres) - Bar / Beverage Base</option>
                      <option value="pcs">pcs (Pieces / Count) - Discrete Units</option>
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Used internally for recipe formulation, kitchen batch depletion, and inventory audits.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: PROCUREMENT & DUAL-UOM */}
              {activeModalTab === 'PROCUREMENT' && (
                <div className="space-y-3.5">
                  <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-xl space-y-2.5">
                    <span className="text-[11px] font-bold uppercase text-servora-navy tracking-wider block">
                      Dual UoM Purchasing Bridge
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1" htmlFor="mm-punit">
                          Wholesale Purveyor Package
                        </label>
                        <input
                          id="mm-punit"
                          type="text"
                          placeholder="e.g. Crate, Carton, Bale, Bag"
                          value={purchaseUnit}
                          onChange={(e) => setPurchaseUnit(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1" htmlFor="mm-conv">
                          Conversion Multiplier Ratio *
                        </label>
                        <input
                          id="mm-conv"
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          required
                          value={conversionFactor}
                          onChange={(e) => setConversionFactor(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-bold text-servora-core"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs font-semibold text-servora-navy flex items-center gap-2">
                      <Scale size={14} className="text-servora-core shrink-0" />
                      <span>
                        Procurement Math: <strong>1 {purchaseUnit || unit}</strong> ={' '}
                        <strong>{conversionFactor || '1'} {unit}</strong>
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mm-supplier">
                      Primary Preferred Supplier
                    </label>
                    <select
                      id="mm-supplier"
                      value={preferredSupplierId}
                      onChange={(e) => setPreferredSupplierId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                    >
                      <option value="">
                        {suppliers.length === 0
                          ? 'No active suppliers configured'
                          : 'No vendor assigned (Ad-hoc purchasing)'}
                      </option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.leadTimeDays !== undefined ? ` (${s.leadTimeDays}d lead time)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mm-min">
                        Safety Stock Threshold ({unit})
                      </label>
                      <input
                        id="mm-min"
                        type="number"
                        step="0.01"
                        min="0"
                        value={minThreshold}
                        onChange={(e) => setMinThreshold(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mm-reorder">
                        Default Batch Reorder Qty ({unit})
                      </label>
                      <input
                        id="mm-reorder"
                        type="number"
                        step="0.01"
                        min="0"
                        value={reorderQuantity}
                        onChange={(e) => setReorderQuantity(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: STORAGE & TRACEABILITY */}
              {activeModalTab === 'LOGISTICS' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mm-track">
                      Lot &amp; Traceability Protocol *
                    </label>
                    <select
                      id="mm-track"
                      value={trackingMethod}
                      onChange={(e) => setTrackingMethod(e.target.value as TrackingMethod)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                    >
                      <option value="BATCH_EXPIRY">Strict Lot &amp; Expiration Tracking (FEFO Required)</option>
                      <option value="SERIALIZED">Individual Serialized Asset Tracking</option>
                      <option value="NONE">Standard Count (Non-Perishable / Dry Goods)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mm-storage">
                      Storage Condition &amp; Temperature Zone *
                    </label>
                    <select
                      id="mm-storage"
                      value={storageCondition}
                      onChange={(e) => setStorageCondition(e.target.value as StorageCondition)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                    >
                      <option value="DRY_AMBIENT">Ambient Dry Pantry (18&deg;C – 24&deg;C)</option>
                      <option value="CHILLED_2_8C">Walk-in Dairy / Meat Chiller (2&deg;C – 8&deg;C)</option>
                      <option value="DEEP_FREEZE">Commercial Deep Freeze (-18&deg;C)</option>
                      <option value="WARM_HEATED">Heated Holding Pass / Warmer (&gt;63&deg;C)</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-servora-navy block">
                        Allow Negative Stock Depletion
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Permit POS depletion even when recorded ledger balance reaches zero
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      aria-label="Allow negative stock depletion"
                      checked={allowNegativeStock}
                      onChange={(e) => setAllowNegativeStock(e.target.checked)}
                      className="rounded text-servora-core focus:ring-0 w-4 h-4 border-gray-300"
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-servora-navy block">
                        Active Lifecycle Status
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Available for recipe formulation and purchase requisitions
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      aria-label="Active lifecycle status"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded text-servora-core focus:ring-0 w-4 h-4 border-gray-300"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: VALUATION & TAX */}
              {activeModalTab === 'FINANCE' && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mm-cost">
                        Standard Cost / {unit} (KES) *
                      </label>
                      <input
                        id="mm-cost"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="850.00"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mm-val">
                        Inventory Valuation Policy *
                      </label>
                      <select
                        id="mm-val"
                        value={valuationMethod}
                        onChange={(e) => setValuationMethod(e.target.value as ValuationMethod)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                      >
                        <option value="FIFO">First-In, First-Out (FIFO)</option>
                        <option value="AVCO">Weighted Moving Average (AVCO)</option>
                        <option value="STANDARD">Standard Fixed Cost</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mm-tax">
                      Tax Rate Classification *
                    </label>
                    <select
                      id="mm-tax"
                      value={taxClassification}
                      onChange={(e) => setTaxClassification(e.target.value as TaxClassification)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-bold"
                    >
                      <option value="A_16">Class A: Standard Rated VAT (16.00%)</option>
                      <option value="B_ZERO">Class B: Zero Rated (0.00%)</option>
                      <option value="E_EXEMPT">Class E: VAT Exempt Commodity</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="text-[10px] text-gray-400">
                  {editingItem ? `Item ID: ${editingItem.id}` : 'Unsaved Material Draft'}
                </span>

                <div className="flex items-center gap-2">
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
                    className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Article'}
                  </button>
                </div>
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
          aria-labelledby="delete-confirm-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 id="delete-confirm-title" className="text-sm font-bold text-servora-navy">
                  Delete Material Specification?
                </h3>
                <p className="text-xs text-servora-deepTeal mt-1 leading-relaxed">
                  Are you sure you want to delete <strong className="text-servora-navy">{pendingDeleteItem.name}</strong>? Items linked to historical stock movements, recipes, or purchase orders cannot be deleted and should be marked Inactive instead.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPendingDeleteItem(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-xs disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete Material'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}