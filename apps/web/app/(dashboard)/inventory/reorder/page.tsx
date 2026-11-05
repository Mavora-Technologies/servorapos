'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBasket, 
  AlertTriangle, 
  AlertOctagon, 
  Search, 
  Building2, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Send, 
  DollarSign, 
  Package, 
  ChevronRight, 
  ArrowRight,
  Filter,
  Sparkles,
  Layers,
  Check,
  Truck,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ReorderItem {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  purchaseUnit: string;
  conversionFactor: number;
  currentStock: number;
  minThreshold: number;
  suggestedQuantity: number;
  leadTimeDays: number;
  unitCost: number;
  estimatedCost: number;
  urgency: 'CRITICAL' | 'LOW' | 'NORMAL';
  isHealthy: boolean;
  supplier: {
    id: number | null;
    name: string;
    email: string | null;
    phone: string | null;
    paymentTerms: string;
  };
}

interface SupplierOption {
  id: number;
  name: string;
  paymentTerms: string;
  leadTimeDays: number;
}

interface SupplierGroupOrder {
  supplierId: number | null;
  supplierName: string;
  paymentTerms?: string;
  itemCount: number;
  estimatedTotal: number;
  items: ReorderItem[];
}

interface ReorderSummary {
  totalCatalogItems: number;
  criticalCount: number;
  lowStockCount: number;
  totalReplenishmentCommitment: number;
  suppliersAffected: number;
}

export default function InventoryReorderPage() {
  const router = useRouter();

  const [items, setItems] = useState<ReorderItem[]>([]);
  const [suppliersList, setSuppliersList] = useState<SupplierOption[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<SupplierGroupOrder[]>([]);
  const [summary, setSummary] = useState<ReorderSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Editable replenishment buffer state: { [itemId]: customQuantity }
  const [customQuantities, setCustomQuantities] = useState<Record<number, number>>({});

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<'ACTIONABLE' | 'CRITICAL' | 'LOW' | 'ALL'>('ACTIONABLE');

  // Multi-select for Purchase Order bundling
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [updatingSupplierItemId, setUpdatingSupplierItemId] = useState<number | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi('/api/v1/inventory/reorder/suggestions');
      if (res?.data) {
        const rawItems: ReorderItem[] = res.data.items || [];
        setItems(rawItems);
        setSuppliersList(res.data.suppliersList || []);
        setSupplierOrders(res.data.supplierOrders || []);
        setSummary(res.data.summary || null);

        // Pre-populate custom quantity buffer with initial recommendations
        const qtyBuf: Record<number, number> = {};
        rawItems.forEach((i) => {
          qtyBuf[i.id] = i.suggestedQuantity;
        });
        setCustomQuantities(qtyBuf);

        // Auto-select critical & low stock items for fast requisition
        const actionableIds = rawItems
          .filter((i) => i.urgency === 'CRITICAL' || i.urgency === 'LOW')
          .map((i) => i.id);
        setSelectedItemIds(actionableIds);
      }
    } catch (err) {
      console.error('Failed to load reorder recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleSelectItem = (id: number) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCustomQtyChange = (itemId: number, val: number) => {
    setCustomQuantities((prev) => ({
      ...prev,
      [itemId]: isNaN(val) || val < 0 ? 0 : val,
    }));
  };

  // Inline Preferred Supplier Switching
  const handleAssignSupplier = async (itemId: number, supplierId: string) => {
    setUpdatingSupplierItemId(itemId);
    const parsedSupId = supplierId ? parseInt(supplierId, 10) : null;

    try {
      await fetchApi('/api/v1/inventory/reorder/assign-supplier', {
        method: 'PATCH',
        body: JSON.stringify({
          inventoryItemId: itemId,
          supplierId: parsedSupId,
        }),
      });

      // Update local state without full reload
      const chosenSup = suppliersList.find((s) => s.id === parsedSupId);
      setItems((prev) =>
        prev.map((it) => {
          if (it.id === itemId) {
            return {
              ...it,
              supplier: {
                ...it.supplier,
                id: parsedSupId,
                name: chosenSup?.name || 'Unassigned Supplier',
                paymentTerms: chosenSup?.paymentTerms || 'NET_30',
              },
            };
          }
          return it;
        })
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update preferred supplier');
    } finally {
      setUpdatingSupplierItemId(null);
    }
  };

  // One-Click Replenishment Engine Action
  const handleExecuteOrder = async (destinationType: 'PURCHASE_ORDERS' | 'PURCHASE_REQUEST') => {
    const selectedItems = items.filter((i) => selectedItemIds.includes(i.id));
    if (selectedItems.length === 0) {
      alert('Please select at least one ingredient to generate orders.');
      return;
    }

    // Verify unassigned suppliers before raising direct POs
    if (destinationType === 'PURCHASE_ORDERS') {
      const hasUnassigned = selectedItems.some((i) => !i.supplier.id);
      if (hasUnassigned && suppliersList.length === 0) {
        alert('Please assign preferred suppliers to selected items or create an approved vendor profile first.');
        return;
      }
    }

    setIsExecuting(true);
    try {
      const payload = {
        destinationType,
        department: 'KITCHEN',
        items: selectedItems.map((it) => ({
          inventoryItemId: it.id,
          orderQuantity: customQuantities[it.id] ?? it.suggestedQuantity,
          unitCost: it.unitCost,
          supplierId: it.supplier.id,
        })),
      };

      const res = await fetchApi('/api/v1/inventory/reorder/execute', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      alert(res.message || 'Orders created successfully!');

      if (destinationType === 'PURCHASE_REQUEST') {
        router.push('/purchasing/requests');
      } else {
        router.push('/purchasing/orders');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to process replenishment order');
    } finally {
      setIsExecuting(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.supplier.name.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesUrgency = true;
      if (urgencyFilter === 'ACTIONABLE') matchesUrgency = item.urgency === 'CRITICAL' || item.urgency === 'LOW';
      else if (urgencyFilter === 'CRITICAL') matchesUrgency = item.urgency === 'CRITICAL';
      else if (urgencyFilter === 'LOW') matchesUrgency = item.urgency === 'LOW';

      return matchesSearch && matchesUrgency;
    });
  }, [items, searchTerm, urgencyFilter]);

  const selectedTotalCommitment = useMemo(() => {
    return items
      .filter((i) => selectedItemIds.includes(i.id))
      .reduce((acc, curr) => {
        const qty = customQuantities[curr.id] ?? curr.suggestedQuantity;
        return acc + qty * curr.unitCost;
      }, 0);
  }, [items, selectedItemIds, customQuantities]);

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
            <span className="text-xs font-bold text-servora-navy">Smart Reorder Engine (MRP)</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Automated Restock & Order Point Planning</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Enterprise replenishment algorithm evaluating safety buffers, lead-time demand, and preferred supplier lot packaging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExecuteOrder('PURCHASE_REQUEST')}
            disabled={selectedItemIds.length === 0 || isExecuting}
            className="bg-slate-100 text-servora-navy hover:bg-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Create internal requisition for manager approval"
          >
            <FileText size={14} /> Send Internal PR
          </button>

          <button
            onClick={() => handleExecuteOrder('PURCHASE_ORDERS')}
            disabled={selectedItemIds.length === 0 || isExecuting}
            className="bg-servora-core text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Directly bundle and generate commercial vendor POs"
          >
            <Sparkles size={15} />
            <span>{isExecuting ? 'Processing...' : `Generate POs (${selectedItemIds.length}) \u2192`}</span>
          </button>
        </div>
      </div>

      {/* Aggregate Telemetry Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Out of Stock Alert</span>
              <h3 className="text-lg font-bold text-rose-700 mt-1">{summary.criticalCount} SKUs</h3>
              <span className="text-[11px] text-rose-600 font-medium">Critical kitchen disruption</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertOctagon size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Low Stock Watch</span>
              <h3 className="text-lg font-bold text-amber-700 mt-1">{summary.lowStockCount} SKUs</h3>
              <span className="text-[11px] text-amber-600 font-medium">Under safety minimums</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Est. Restock Commitment</span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">
                KES {summary.totalReplenishmentCommitment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-servora-deepTeal font-medium">Across {summary.suppliersAffected} vendors</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Selected Cart Value</span>
              <h3 className="text-lg font-bold text-emerald-700 mt-1">
                KES {selectedTotalCommitment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-emerald-600 font-medium">{selectedItemIds.length} items checked</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingBasket size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Supplier PO Bundles Preview */}
      {supplierOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-servora-navy uppercase tracking-wider block">
              Vendor Order Groupings (One PO per Supplier)
            </span>
            <span className="text-xs text-servora-deepTeal">
              Click &quot;Select Only&quot; to isolate a single supplier&apos;s order
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {supplierOrders.map((sup, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-servora-navy">
                      <Building2 size={14} className="text-servora-core shrink-0" />
                      <span className="truncate max-w-[180px]">{sup.supplierName}</span>
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                      {sup.itemCount} SKUs
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {sup.items.map((i) => i.name).join(', ')}
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-servora-navy block">
                      KES {sup.estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    {sup.paymentTerms && (
                      <span className="text-[10px] text-gray-400 font-mono">{sup.paymentTerms}</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const supItemIds = sup.items.map((i) => i.id);
                      setSelectedItemIds(supItemIds);
                    }}
                    className="text-[11px] font-semibold text-servora-core hover:underline flex items-center gap-0.5"
                  >
                    Select Only <ArrowRight size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search ingredient, SKU, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          <button
            onClick={() => setUrgencyFilter('ACTIONABLE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              urgencyFilter === 'ACTIONABLE' ? 'bg-white shadow-xs text-servora-navy font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Actionable ({items.filter((i) => i.urgency !== 'NORMAL').length})
          </button>
          <button
            onClick={() => setUrgencyFilter('CRITICAL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              urgencyFilter === 'CRITICAL' ? 'bg-white shadow-xs text-rose-700 font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Depleted ({summary?.criticalCount || 0})
          </button>
          <button
            onClick={() => setUrgencyFilter('LOW')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              urgencyFilter === 'LOW' ? 'bg-white shadow-xs text-amber-700 font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Low Stock ({summary?.lowStockCount || 0})
          </button>
          <button
            onClick={() => setUrgencyFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              urgencyFilter === 'ALL' ? 'bg-white shadow-xs text-servora-navy font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Full Catalog ({items.length})
          </button>
        </div>
      </div>

      {/* Main Replenishment Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Calculating stock depletion velocity and supplier reorder parameters...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No items require replenishment matching your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredItems.length > 0 &&
                        filteredItems.every((i) => selectedItemIds.includes(i.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const ids = Array.from(new Set([...selectedItemIds, ...filteredItems.map((i) => i.id)]));
                          setSelectedItemIds(ids);
                        } else {
                          const filterIds = new Set(filteredItems.map((i) => i.id));
                          setSelectedItemIds(selectedItemIds.filter((id) => !filterIds.has(id)));
                        }
                      }}
                      className="rounded text-servora-core focus:ring-0 w-3.5 h-3.5 border-gray-300"
                    />
                  </th>
                  <th className="py-3.5 px-4">Ingredient & SKU</th>
                  <th className="py-3.5 px-4">Stock On Hand</th>
                  <th className="py-3.5 px-4">Safety Buffer</th>
                  <th className="py-3.5 px-4">Replenishment Qty</th>
                  <th className="py-3.5 px-4">Unit Cost</th>
                  <th className="py-3.5 px-4">Subtotal Commitment</th>
                  <th className="py-3.5 px-4">Preferred Supplier (Purveyor)</th>
                  <th className="py-3.5 px-4">Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredItems.map((item) => {
                  const isChecked = selectedItemIds.includes(item.id);
                  const orderQty = customQuantities[item.id] ?? item.suggestedQuantity;
                  const lineTotal = orderQty * item.unitCost;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isChecked ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectItem(item.id)}
                          className="rounded text-servora-core focus:ring-0 w-3.5 h-3.5 border-gray-300 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-servora-navy block">{item.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-gray-400 font-mono tracking-wider">
                            {item.sku || 'SKU-UNASSIGNED'}
                          </span>
                          <span className="text-[10px] text-gray-400">&bull;</span>
                          <span className="text-[10px] text-servora-deepTeal">{item.category}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className={item.urgency === 'CRITICAL' ? 'text-rose-600' : item.urgency === 'LOW' ? 'text-amber-700' : 'text-servora-navy'}>
                          {item.currentStock.toLocaleString()} {item.unit}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-500 font-mono">
                        {item.minThreshold.toLocaleString()} {item.unit}
                      </td>

                      {/* Interactive Editable Order Quantity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={orderQty}
                            onChange={(e) => handleCustomQtyChange(item.id, parseFloat(e.target.value))}
                            className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg text-center font-mono font-bold text-servora-core focus:border-servora-core focus:outline-none bg-white shadow-2xs"
                          />
                          <span className="text-[11px] font-medium text-gray-500">{item.unit}</span>
                        </div>
                        {item.purchaseUnit && item.purchaseUnit !== item.unit && (
                          <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                            &asymp; {(orderQty / item.conversionFactor).toFixed(1)} {item.purchaseUnit}s
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-gray-600">
                        KES {item.unitCost.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-servora-navy">
                        KES {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Interactive Inline Supplier Dropdown */}
                      <td className="py-3.5 px-4 min-w-[190px]">
                        <select
                          disabled={updatingSupplierItemId === item.id}
                          value={item.supplier.id ? String(item.supplier.id) : ''}
                          onChange={(e) => handleAssignSupplier(item.id, e.target.value)}
                          className={`w-full px-2.5 py-1 text-xs border rounded-lg focus:border-servora-core focus:outline-none transition-colors ${
                            !item.supplier.id
                              ? 'border-amber-300 bg-amber-50/50 text-amber-900 font-bold'
                              : 'border-gray-200 bg-white font-medium text-servora-navy'
                          }`}
                        >
                          <option value="">Assign Purveyor...</option>
                          {suppliersList.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.leadTimeDays}d lead)
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.urgency === 'CRITICAL' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertOctagon size={11} /> CRITICAL
                          </span>
                        ) : item.urgency === 'LOW' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle size={11} /> REORDER
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <CheckCircle2 size={11} /> HEALTHY
                          </span>
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
    </div>
  );
}