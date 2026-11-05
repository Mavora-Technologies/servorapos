'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Plus, 
  AlertTriangle, 
  ArrowUpDown, 
  CheckCircle2, 
  X, 
  Search, 
  Filter, 
  DollarSign, 
  TrendingDown, 
  Boxes, 
  Layers, 
  ArrowUpRight, 
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Truck,
  ShieldAlert,
  Snowflake,
  Scale,
  Building2,
  Barcode,
  History,
  FileSpreadsheet
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface InventoryItem {
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
  currentStock: string;
  minThreshold: string;
  reorderQuantity: string;
  costPrice: string;
  valuationMethod: 'FIFO' | 'AVCO' | 'STANDARD';
  storageCondition: string;
  taxClassification: 'A_16' | 'B_ZERO' | 'E_EXEMPT';
  allowNegativeStock: boolean;
  isActive: boolean;
}

interface StorageLocationOption {
  id: number;
  code: string;
  name: string;
  zoneType: string;
  isRefrigerated: boolean;
}

interface SupplierOption {
  id: number;
  name: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocationOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [materialTypeFilter, setMaterialTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'ADEQUATE'>('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form States (New Item)
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [materialType, setMaterialType] = useState<InventoryItem['materialType']>('RAW_MATERIAL');
  const [category, setCategory] = useState('PRODUCE');
  const [unit, setUnit] = useState('kg');
  const [purchaseUnit, setPurchaseUnit] = useState('Crate');
  const [conversionFactor, setConversionFactor] = useState('1');
  const [preferredSupplierId, setPreferredSupplierId] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [minThreshold, setMinThreshold] = useState('10');
  const [reorderQuantity, setReorderQuantity] = useState('50');
  const [costPrice, setCostPrice] = useState('');
  const [valuationMethod, setValuationMethod] = useState<'FIFO' | 'AVCO' | 'STANDARD'>('FIFO');
  const [storageCondition, setStorageCondition] = useState('DRY_AMBIENT');
  const [taxClassification, setTaxClassification] = useState<'A_16' | 'B_ZERO' | 'E_EXEMPT'>('A_16');

  // Dynamic Adjustment State
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'GOODS_RECEIPT_PO' | 'WASTE_SCRAP' | 'PHYSICAL_INVENTORY_ADJ'>('GOODS_RECEIPT_PO');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [customLocationBin, setCustomLocationBin] = useState('');
  const [isCustomBin, setIsCustomBin] = useState(false);
  const [batchLotNumber, setBatchLotNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const [itemsRes, locRes, supRes] = await Promise.all([
        fetchApi('/api/v1/inventory/items').catch(() => fetchApi('/api/v1/inventory')),
        fetchApi('/api/v1/inventory/locations').catch(() => ({ data: [] })),
        fetchApi('/api/v1/suppliers').catch(() => ({ data: [] })),
      ]);

      if (itemsRes?.data) {
        setItems(itemsRes.data.items || itemsRes.data || []);
      }
      if (locRes?.data) {
        setStorageLocations(locRes.data);
      }
      if (supRes?.data) {
        setSuppliers(supRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Telemetry Aggregations
  const telemetry = useMemo(() => {
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    items.forEach((item) => {
      const stock = parseFloat(item.currentStock) || 0;
      const min = parseFloat(item.minThreshold) || 0;
      const cost = parseFloat(item.costPrice) || 0;

      totalValuation += stock * cost;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= min) {
        lowStockCount++;
      }
    });

    return {
      totalValuation,
      itemCount: items.length,
      lowStockCount,
      outOfStockCount,
    };
  }, [items]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.barcode && item.barcode.includes(searchTerm));

      const matchesCategory =
        selectedCategory === 'ALL' || item.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesType = materialTypeFilter === 'ALL' || item.materialType === materialTypeFilter;

      const stock = parseFloat(item.currentStock) || 0;
      const min = parseFloat(item.minThreshold) || 0;

      let matchesStatus = true;
      if (statusFilter === 'OUT_OF_STOCK') matchesStatus = stock <= 0;
      else if (statusFilter === 'LOW_STOCK') matchesStatus = stock > 0 && stock <= min;
      else if (statusFilter === 'ADEQUATE') matchesStatus = stock > min;

      return matchesSearch && matchesCategory && matchesType && matchesStatus;
    });
  }, [items, searchTerm, selectedCategory, materialTypeFilter, statusFilter]);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [items]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetchApi('/api/v1/inventory/items', {
        method: 'POST',
        body: JSON.stringify({
          name,
          sku: sku || undefined,
          barcode: barcode || undefined,
          materialType,
          category,
          unit,
          purchaseUnit: purchaseUnit || undefined,
          conversionFactor: parseFloat(conversionFactor) || 1,
          preferredSupplierId: preferredSupplierId ? parseInt(preferredSupplierId, 10) : undefined,
          currentStock: parseFloat(currentStock || '0'),
          minThreshold: parseFloat(minThreshold || '0'),
          reorderQuantity: parseFloat(reorderQuantity || '0'),
          costPrice: parseFloat(costPrice || '0'),
          valuationMethod,
          storageCondition,
          taxClassification,
          allowNegativeStock: false,
          isActive: true,
        }),
      });

      setIsAddModalOpen(false);
      setName('');
      setSku('');
      setBarcode('');
      setCurrentStock('');
      setMinThreshold('10');
      setCostPrice('');
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to register inventory item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAdjustModal = (item: InventoryItem, defaultType: 'GOODS_RECEIPT_PO' | 'WASTE_SCRAP' | 'PHYSICAL_INVENTORY_ADJ' = 'GOODS_RECEIPT_PO') => {
    setSelectedItem(item);
    setAdjustmentType(defaultType);
    setAdjustmentQty('');
    setBatchLotNumber('');
    setNotes('');
    setCustomLocationBin('');
    setIsCustomBin(false);

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
    } else {
      setSelectedLocationId('CUSTOM');
      setIsCustomBin(true);
    }

    setIsAdjustModalOpen(true);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    let finalLocationBin = '';
    if (isCustomBin) {
      finalLocationBin = customLocationBin.trim();
      if (!finalLocationBin) {
        alert('Please specify a storage location or station bin code');
        return;
      }
    } else {
      const matchLoc = storageLocations.find((l) => String(l.id) === selectedLocationId);
      finalLocationBin = matchLoc ? `${matchLoc.name} (${matchLoc.code})` : 'Main Storeroom';
    }

    setIsSubmitting(true);
    let delta = parseFloat(adjustmentQty) || 0;
    if (adjustmentType === 'WASTE_SCRAP' && delta > 0) {
      delta = -delta;
    }

    try {
      await fetchApi('/api/v1/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({
          inventoryItemId: selectedItem.id,
          type: adjustmentType,
          quantityDelta: delta,
          unitCost: parseFloat(selectedItem.costPrice) || 0,
          batchNumber: batchLotNumber || undefined,
          locationBin: finalLocationBin,
          notes: notes || undefined,
        }),
      });

      setIsAdjustModalOpen(false);
      setSelectedItem(null);
      setAdjustmentQty('');
      setNotes('');
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to post stock movement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-400">Inventory</span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-servora-navy">Stock Overview (MMBE)</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Raw Inventory & Material Master Ledger</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Real-time multi-branch stock valuation, dynamic reorder points, dual UoM conversion, and material movements.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => setIsAddModalOpen(true)}
            className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={15} /> Create Article
          </button>
        </div>
      </div>

      {/* Real-time Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Total Stock Value</span>
            <h3 className="text-lg font-bold text-servora-navy mt-1">
              KES {telemetry.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium">FIFO & Weighted COGS Value</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Master Catalog</span>
            <h3 className="text-lg font-bold text-servora-navy mt-1">{telemetry.itemCount} Articles</h3>
            <span className="text-[11px] text-servora-deepTeal font-medium">Active tracked SKUs</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
            <Package size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Low Stock Watch</span>
            <h3 className="text-lg font-bold text-amber-700 mt-1">{telemetry.lowStockCount} Items</h3>
            <span className="text-[11px] text-amber-600 font-medium">Below safety threshold</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Out of Stock</span>
            <h3 className="text-lg font-bold text-rose-700 mt-1">{telemetry.outOfStockCount} Items</h3>
            <span className="text-[11px] text-rose-600 font-medium">Depleted / Stockout risk</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Query Header */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search ingredient by title, SKU, or barcode..."
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
            <option value="SEMI_FINISHED">Sub-Assemblies / Preps</option>
            <option value="FINISHED_GOOD">Finished Dishes</option>
            <option value="CONSUMABLE">Consumables & Packaging</option>
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
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'ALL' ? 'bg-white shadow-xs text-servora-navy font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setStatusFilter('LOW_STOCK')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'LOW_STOCK' ? 'bg-white shadow-xs text-amber-700 font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Low Stock ({telemetry.lowStockCount})
          </button>
          <button
            onClick={() => setStatusFilter('OUT_OF_STOCK')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'OUT_OF_STOCK' ? 'bg-white shadow-xs text-rose-700 font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Depleted ({telemetry.outOfStockCount})
          </button>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Connecting to enterprise material ledger database...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-servora-deepTeal text-xs">
            No stock records matched your search filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3.5 px-4">Article & Code</th>
                  <th className="py-3.5 px-4">Type & Storage</th>
                  <th className="py-3.5 px-4">Unrestricted Stock</th>
                  <th className="py-3.5 px-4">Procurement Dual-UoM</th>
                  <th className="py-3.5 px-4">Reorder Minimum</th>
                  <th className="py-3.5 px-4">Standard Cost</th>
                  <th className="py-3.5 px-4">Total Value</th>
                  <th className="py-3.5 px-4 text-right">Material Actions</th>
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
                              <span className="flex items-center gap-0.5"><Barcode size={10} /> {item.barcode}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[10px] uppercase font-bold text-servora-deepTeal bg-gray-100 px-2 py-0.5 rounded-md block w-fit">
                          {item.materialType ? item.materialType.replace('_', ' ') : item.category}
                        </span>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                          Tax: {item.taxClassification === 'A_16' ? '16% VAT' : item.taxClassification === 'B_ZERO' ? '0% Zero' : 'Exempt'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
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
                        </div>
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
                          <span className="block text-[10px] text-gray-400">Lot: {item.reorderQuantity}</span>
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
                            onClick={() => openAdjustModal(item, 'GOODS_RECEIPT_PO')}
                            title="Post Goods Receipt (+)"
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold transition-colors inline-flex items-center gap-1 text-[11px]"
                          >
                            + Inward
                          </button>
                          <button
                            onClick={() => openAdjustModal(item, 'PHYSICAL_INVENTORY_ADJ')}
                            title="Post Material Recalibration"
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Register New Material Article</h3>
                <p className="text-[11px] text-servora-deepTeal">Define kitchen ingredients, procurement packages, and tax rules</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Article Description *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kerrygold Pure Unsalted Butter"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Internal SKU *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="ING-BTR-01"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">GTIN / EAN Barcode</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="6001234567890"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Material Classification *</label>
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="RAW_MATERIAL">Raw Material (Kitchen Ingredient)</option>
                    <option value="SEMI_FINISHED">Semi-Finished (Sub-Prep Batch)</option>
                    <option value="FINISHED_GOOD">Finished Good (Direct Sale)</option>
                    <option value="CONSUMABLE">Operating Consumable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="PRODUCE">PRODUCE (Vegetables, Fruits, Herbs)</option>
                    <option value="MEAT">MEAT & POULTRY (Beef, Goat, Chicken)</option>
                    <option value="DAIRY">DAIRY (Milk, Cheese, Butter)</option>
                    <option value="PANTRY">PANTRY & DRY (Spices, Oils, Sauces)</option>
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
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Base Tracking Unit</label>
                    <select
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
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Purchase Package</label>
                    <input
                      type="text"
                      value={purchaseUnit}
                      onChange={(e) => setPurchaseUnit(e.target.value)}
                      placeholder="e.g. Crate, Bag, Box"
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Multiplier Ratio</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={conversionFactor}
                      onChange={(e) => setConversionFactor(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Standard Cost / {unit} (KES) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="850.00"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Safety Reorder Min</label>
                  <input
                    type="number"
                    step="0.001"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Initial Opening Stock</label>
                  <input
                    type="number"
                    step="0.001"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Preferred Supplier</label>
                  <select
                    value={preferredSupplierId}
                    onChange={(e) => setPreferredSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="">No supplier assigned</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">KRA eTIMS Tax Class *</label>
                  <select
                    value={taxClassification}
                    onChange={(e) => setTaxClassification(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-bold"
                  >
                    <option value="A_16">Class A: Standard Rated (16.00%)</option>
                    <option value="B_ZERO">Class B: Zero Rated (0.00%)</option>
                    <option value="E_EXEMPT">Class E: VAT Exempt Food</option>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Post Stock Movement: {selectedItem.name}</h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Balance On-Hand: <strong className="text-servora-navy font-bold">{parseFloat(selectedItem.currentStock).toLocaleString()} {selectedItem.unit}</strong>
                </p>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Transaction Movement Type Code *</label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                >
                  <option value="GOODS_RECEIPT_PO">GOODS_RECEIPT_PO: Inward Stock Intake (+)</option>
                  <option value="PHYSICAL_INVENTORY_ADJ">PHYSICAL_INVENTORY_ADJ: Audit Recalibration (+/-)</option>
                  <option value="WASTE_SCRAP">WASTE_SCRAP: Spoilage / Floor Scrap (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">
                  Quantity Delta ({selectedItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  placeholder={adjustmentType === 'WASTE_SCRAP' ? 'Enter waste amount (e.g. 5.0)' : '25.0'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none font-mono"
                />
              </div>

              {/* Dynamic Facility Bin Location Picker */}
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Storage Location / Facility Bin *</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className={isCustomBin ? 'col-span-1' : 'col-span-2'}>
                    <select
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
                          {loc.code} — {loc.name} {loc.isRefrigerated ? '(Refrigerated)' : '(Ambient)'}
                        </option>
                      ))}
                      <option value="CUSTOM">+ Specify Station / Bin</option>
                    </select>
                  </div>
                  {isCustomBin && (
                    <div className="col-span-1">
                      <input
                        type="text"
                        placeholder="e.g. Line Station 2B"
                        value={customLocationBin}
                        onChange={(e) => setCustomLocationBin(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium focus:border-servora-core focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Lot / Batch ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. LOT-2026-B12"
                  value={batchLotNumber}
                  onChange={(e) => setBatchLotNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono uppercase focus:border-servora-core focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Audit Notes / Commercial Ref</label>
                <input
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