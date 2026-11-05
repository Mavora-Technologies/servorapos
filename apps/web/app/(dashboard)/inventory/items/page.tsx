'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Boxes, 
  Building2, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  ArrowRight,
  SlidersHorizontal,
  ChevronRight,
  Snowflake,
  Flame,
  ShieldAlert,
  Barcode,
  Layers,
  DollarSign,
  FileSpreadsheet,
  Check,
  Scale
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface InventoryItemMaster {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  materialType: 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'FINISHED_GOOD' | 'CONSUMABLE';
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
  valuationMethod: 'FIFO' | 'AVCO' | 'STANDARD';
  trackingMethod: 'BATCH_EXPIRY' | 'SERIALIZED' | 'NONE';
  storageCondition: 'DRY_AMBIENT' | 'CHILLED_2_8C' | 'DEEP_FREEZE' | 'WARM_HEATED';
  taxClassification: 'A_16' | 'B_ZERO' | 'E_EXEMPT';
  allowNegativeStock: boolean;
  isActive: boolean;
}

interface SupplierOption {
  id: number;
  name: string;
  leadTimeDays: number;
}

interface CatalogSummary {
  totalCatalogItems: number;
  totalStockValuation: number;
  criticalItemsCount: number;
}

export default function InventoryItemsMasterPage() {
  const [items, setItems] = useState<InventoryItemMaster[]>([]);
  const [summary, setSummary] = useState<CatalogSummary | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [materialTypeFilter, setMaterialTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemMaster | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'GENERAL' | 'PROCUREMENT' | 'LOGISTICS' | 'FINANCE'>('GENERAL');

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [materialType, setMaterialType] = useState<InventoryItemMaster['materialType']>('RAW_MATERIAL');
  const [category, setCategory] = useState('PRODUCE');
  const [unit, setUnit] = useState('kg');
  const [purchaseUnit, setPurchaseUnit] = useState('Crate');
  const [conversionFactor, setConversionFactor] = useState('1');
  const [preferredSupplierId, setPreferredSupplierId] = useState<string>('');
  const [costPrice, setCostPrice] = useState('');
  const [valuationMethod, setValuationMethod] = useState<'FIFO' | 'AVCO' | 'STANDARD'>('FIFO');
  const [minThreshold, setMinThreshold] = useState('10');
  const [reorderQuantity, setReorderQuantity] = useState('50');
  const [trackingMethod, setTrackingMethod] = useState<'BATCH_EXPIRY' | 'SERIALIZED' | 'NONE'>('BATCH_EXPIRY');
  const [storageCondition, setStorageCondition] = useState<'DRY_AMBIENT' | 'CHILLED_2_8C' | 'DEEP_FREEZE' | 'WARM_HEATED'>('DRY_AMBIENT');
  const [taxClassification, setTaxClassification] = useState<'A_16' | 'B_ZERO' | 'E_EXEMPT'>('A_16');
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [itemsRes, suppliersRes] = await Promise.all([
        fetchApi('/api/v1/inventory/items'),
        fetchApi('/api/v1/suppliers').catch(() => ({ data: [] })),
      ]);

      if (itemsRes?.data) {
        setItems(itemsRes.data.items || itemsRes.data);
        setSummary(itemsRes.data.summary || null);
      }
      if (suppliersRes?.data) setSuppliers(suppliersRes.data);
    } catch (err) {
      console.error('Failed to load catalog items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (item?: InventoryItemMaster) => {
    setActiveModalTab('GENERAL');
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setSku(item.sku || '');
      setBarcode(item.barcode || '');
      setMaterialType(item.materialType || 'RAW_MATERIAL');
      setCategory(item.category);
      setUnit(item.unit);
      setPurchaseUnit(item.purchaseUnit || item.unit);
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
      setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setBarcode('');
      setMaterialType('RAW_MATERIAL');
      setCategory('PRODUCE');
      setUnit('kg');
      setPurchaseUnit('Crate');
      setConversionFactor('1');
      setPreferredSupplierId('');
      setCostPrice('');
      setValuationMethod('FIFO');
      setMinThreshold('10');
      setReorderQuantity('50');
      setTrackingMethod('BATCH_EXPIRY');
      setStorageCondition('DRY_AMBIENT');
      setTaxClassification('A_16');
      setAllowNegativeStock(false);
      setIsActive(true);
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    const payload = {
      name,
      sku: sku || undefined,
      barcode: barcode || undefined,
      materialType,
      category,
      unit,
      purchaseUnit: purchaseUnit || undefined,
      conversionFactor: parseFloat(conversionFactor) || 1,
      preferredSupplierId: preferredSupplierId ? parseInt(preferredSupplierId, 10) : null,
      costPrice: parseFloat(costPrice) || 0,
      valuationMethod,
      minThreshold: parseFloat(minThreshold) || 0,
      reorderQuantity: parseFloat(reorderQuantity) || 0,
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
      } else {
        await fetchApi('/api/v1/inventory/items', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save item specification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this inventory catalog item? This will remove all recipe ingredient linkages.')) return;
    try {
      await fetchApi(`/api/v1/inventory/items/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const categories = useMemo(() => {
    const unique = new Set(items.map((i) => i.category).filter(Boolean));
    return ['ALL', ...Array.from(unique)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.barcode && item.barcode.includes(searchTerm));

      const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesType = materialTypeFilter === 'ALL' || item.materialType === materialTypeFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && item.isActive) ||
        (statusFilter === 'INACTIVE' && !item.isActive);

      return matchesSearch && matchesCat && matchesType && matchesStatus;
    });
  }, [items, searchTerm, selectedCategory, materialTypeFilter, statusFilter]);

  const getStorageBadge = (condition: InventoryItemMaster['storageCondition']) => {
    switch (condition) {
      case 'CHILLED_2_8C':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
            <Snowflake size={10} /> Chilled (2-8°C)
          </span>
        );
      case 'DEEP_FREEZE':
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <Snowflake size={10} /> Deep Freeze (-18°C)
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

  const getMaterialTypeBadge = (type: InventoryItemMaster['materialType']) => {
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
          <h1 className="text-xl font-bold text-servora-navy">Material & Catalog Specifications</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Configure GTIN barcodes, dual UoM conversion ratios, KRA eTIMS tax classification, and FEFO lot protocols.
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> Create Material Record
        </button>
      </div>

      {/* Aggregate Telemetry Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Catalog Valuation</span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">
                KES {summary.totalStockValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-emerald-600 font-medium">FIFO asset value on hand</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">SKUs Requiring Restock</span>
              <h3 className="text-lg font-bold text-amber-700 mt-1">{summary.criticalItemsCount} Items</h3>
              <span className="text-[11px] text-amber-600 font-medium">Below safety thresholds</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Total Active Articles</span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">{summary.totalCatalogItems} Master SKUs</h3>
              <span className="text-[11px] text-servora-deepTeal font-medium">Integrated across kitchen & POS</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
              <Boxes size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search by SKU barcode, item name, or GTIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
            />
          </div>

          <select
            value={materialTypeFilter}
            onChange={(e) => setMaterialTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white font-medium text-servora-navy"
          >
            <option value="ALL">All Material Types</option>
            <option value="RAW_MATERIAL">Raw Materials</option>
            <option value="SEMI_FINISHED">Sub-Recipes / Preps</option>
            <option value="FINISHED_GOOD">Finished Dishes / Retail</option>
            <option value="CONSUMABLE">Packaging & Supplies</option>
          </select>

          <select
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
          {['ALL', 'ACTIVE', 'INACTIVE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === st ? 'bg-white shadow-xs text-servora-navy font-bold' : 'text-gray-500 hover:text-gray-900'
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
            Connecting to enterprise material master catalog...
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
                  <th className="py-3.5 px-4">Article & Barcode</th>
                  <th className="py-3.5 px-4">Type & Storage</th>
                  <th className="py-3.5 px-4">Base Consumption Unit</th>
                  <th className="py-3.5 px-4">Procurement Packaging (UoM)</th>
                  <th className="py-3.5 px-4">Unit Standard Cost</th>
                  <th className="py-3.5 px-4">Replenish Point</th>
                  <th className="py-3.5 px-4">Preferred Purveyor</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
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
                                <span className="flex items-center gap-0.5"><Barcode size={10} /> {item.barcode}</span>
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
                        KES {(Number(item.costPrice) * Number(item.conversionFactor || 1)).toFixed(2)} / {item.purchaseUnit || item.unit}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-servora-core">
                      KES {Number(item.costPrice).toFixed(2)}
                      <span className="text-[10px] text-gray-400 font-normal"> / {item.unit}</span>
                      <span className="block text-[9.5px] text-gray-400 font-sans font-normal">
                        Valuation: {item.valuationMethod}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[11px] font-mono">
                        <span className="text-gray-500">Min: </span>
                        <strong className="text-servora-navy">{Number(item.minThreshold)} {item.unit}</strong>
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
                          {item.preferredSupplierLeadTime && (
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
                          onClick={() => openModal(item)}
                          className="p-1.5 text-gray-500 hover:text-servora-core rounded-lg hover:bg-servora-pale transition-colors"
                          title="Edit Master Specification"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete Material"
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

      {/* SAP / NETSUITE MULTI-TAB MASTER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingItem ? `Edit Material Record: ${editingItem.name}` : 'New Enterprise Material Master'}
                </h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Define item classification, procurement packages, storage compliance, and tax rules
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            {/* Segmented Operational Tabs */}
            <div className="flex items-center gap-1 border-b border-gray-100 pb-2">
              {[
                { id: 'GENERAL', label: '1. Identification & Base UoM' },
                { id: 'PROCUREMENT', label: '2. Purchasing & Suppliers' },
                { id: 'LOGISTICS', label: '3. Storage & Traceability' },
                { id: 'FINANCE', label: '4. Valuation & eTIMS Tax' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveModalTab(tab.id as any)}
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

            <form onSubmit={handleSave} className="space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* TAB 1: GENERAL & BASE UOM */}
              {activeModalTab === 'GENERAL' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-servora-navy mb-1">Material Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kerrygold Pure Irish Butter (Block)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1">Internal Article SKU *</label>
                      <input
                        type="text"
                        required
                        placeholder="ING-DRY-BTR"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1">EAN / GTIN Barcode</label>
                      <input
                        type="text"
                        placeholder="6001234567890"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1">Material Type (Classification) *</label>
                      <select
                        value={materialType}
                        onChange={(e) => setMaterialType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                      >
                        <option value="RAW_MATERIAL">Raw Material (Kitchen Ingredients)</option>
                        <option value="SEMI_FINISHED">Semi-Finished (In-House Sauces, Preps, Dough)</option>
                        <option value="FINISHED_GOOD">Finished Good (Retail Drinks, Direct POS)</option>
                        <option value="CONSUMABLE">Operating Consumable (Boxes, Bags, Foil)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1">Catalog Department Category *</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                      >
                        <option value="PRODUCE">PRODUCE (Vegetables, Herbs, Fruits)</option>
                        <option value="MEAT">MEAT & POULTRY (Beef, Lamb, Chicken)</option>
                        <option value="DAIRY">DAIRY (Cheeses, Milk, Heavy Cream)</option>
                        <option value="PANTRY">PANTRY & DRY (Spices, Oils, Canned)</option>
                        <option value="BAKERY">BAKERY (Flour, Grains, Yeast)</option>
                        <option value="BEVERAGE">BEVERAGES (Syrups, Coffee Beans, Tea)</option>
                        <option value="PACKAGING">PACKAGING & DISPOSABLES</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-servora-navy mb-1">
                      Base Consumption Unit of Measure (UoM Base) *
                    </label>
                    <select
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
                    <p className="text-[10px] text-gray-400 mt-1">Used internally for recipe formulation, kitchen batch depletion, and inventory audits.</p>
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
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Wholesale Purveyor Package</label>
                        <input
                          type="text"
                          placeholder="e.g. Crate, Carton, Bale, Bag"
                          value={purchaseUnit}
                          onChange={(e) => setPurchaseUnit(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Conversion Multiplier Ratio</label>
                        <input
                          type="number"
                          step="0.0001"
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
                        Procurement Math: <strong>1 {purchaseUnit || unit}</strong> = <strong>{conversionFactor} {unit}</strong>
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-servora-navy mb-1">Primary Preferred Supplier</label>
                    <select
                      value={preferredSupplierId}
                      onChange={(e) => setPreferredSupplierId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                    >
                      <option value="">No vendor assigned (Ad-hoc purchasing)</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.leadTimeDays}d lead time)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1">Safety Stock Threshold ({unit})</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={minThreshold}
                        onChange={(e) => setMinThreshold(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1">Default Batch Reorder Qty ({unit})</label>
                      <input
                        type="number"
                        step="0.01"
                        required
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
                    <label className="block text-xs font-bold text-servora-navy mb-1">Lot & Traceability Protocol *</label>
                    <select
                      value={trackingMethod}
                      onChange={(e) => setTrackingMethod(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                    >
                      <option value="BATCH_EXPIRY">Strict Lot & Expiration Tracking (FEFO Required)</option>
                      <option value="SERIALIZED">Individual Serialized Asset Tracking</option>
                      <option value="NONE">Standard Count (Non-Perishable / Dry Goods)</option>
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">If set to FEFO, dock workers must enter expiration dates during Goods Inward (GRN).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-servora-navy mb-1">Storage Condition & Temperature Zone *</label>
                    <select
                      value={storageCondition}
                      onChange={(e) => setStorageCondition(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                    >
                      <option value="DRY_AMBIENT">Ambient Dry Pantry (18°C - 24°C)</option>
                      <option value="CHILLED_2_8C">Walk-in Dairy / Meat Chiller (2°C - 8°C)</option>
                      <option value="DEEP_FREEZE">Commercial Deep Freeze (-18°C)</option>
                      <option value="WARM_HEATED">Heated Holding Pass / Warmer (&gt;63°C)</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-servora-navy block">Negative Stock Depletion</span>
                      <span className="text-[10px] text-gray-400">Allow kitchen POS checkout even if ledger balance equals zero</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowNegativeStock}
                      onChange={(e) => setAllowNegativeStock(e.target.checked)}
                      className="rounded text-servora-core focus:ring-0 w-4 h-4 border-gray-300"
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-servora-navy block">Active Lifecycle Status</span>
                      <span className="text-[10px] text-gray-400">Available for recipe formulation and purchase requisitions</span>
                    </div>
                    <input
                      type="checkbox"
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1">Standard Cost / {unit} (KES) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="850.00"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-servora-navy mb-1">Inventory Valuation Policy *</label>
                      <select
                        value={valuationMethod}
                        onChange={(e) => setValuationMethod(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                      >
                        <option value="FIFO">First-In, First-Out (FIFO Real Cost)</option>
                        <option value="AVCO">Weighted Moving Average (AVCO)</option>
                        <option value="STANDARD">Standard Fixed Accounting Cost</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-servora-navy mb-1">KRA eTIMS Fiscal Tax Rate Classification *</label>
                    <select
                      value={taxClassification}
                      onChange={(e) => setTaxClassification(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-bold"
                    >
                      <option value="A_16">Class A: Standard Rated VAT (16.00%)</option>
                      <option value="B_ZERO">Class B: Zero Rated (0.00%)</option>
                      <option value="E_EXEMPT">Class E: VAT Exempt Food Commodity</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="text-[10px] text-gray-400">
                  {editingItem ? `Item ID: ${editingItem.id}` : 'Unsaved Draft Material'}
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
    </div>
  );
}