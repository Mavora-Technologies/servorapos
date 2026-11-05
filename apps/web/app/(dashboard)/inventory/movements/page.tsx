'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowUpDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Plus, 
  X, 
  Filter, 
  ChevronRight, 
  Calendar, 
  Clock, 
  User, 
  Package, 
  FileText,
  AlertOctagon,
  Boxes,
  RotateCcw,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  MapPin,
  Tag
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface StockMovement {
  id: number;
  inventoryItemId: number;
  itemName: string;
  itemSku: string | null;
  itemUnit: string;
  itemCategory: string;
  orderId: number | null;
  userId: number | null;
  userName: string | null;
  type: 
    | 'GOODS_RECEIPT_PO' 
    | 'POS_RECIPE_DEPLETION' 
    | 'PHYSICAL_INVENTORY_ADJ' 
    | 'WASTE_SCRAP' 
    | 'SUPPLIER_RETURN' 
    | 'STORNO_REVERSAL' 
    | 'TRANSFER'
    | 'PURCHASE'
    | 'SALE_CONSUMPTION'
    | 'WASTE'
    | 'ADJUSTMENT';
  quantity: string;
  unitCost: string;
  totalValuation: string;
  balanceAfter: string;
  batchNumber: string | null;
  locationBin: string | null;
  documentReference: string | null;
  reversedMovementId: number | null;
  isReversed: boolean;
  notes: string | null;
  createdAt: string;
}

interface MovementsSummary {
  totalEntries: number;
  totalInflowValuation: number;
  totalOutflowValuation: number;
}

interface InventoryOption {
  id: number;
  name: string;
  unit: string;
  category: string;
  currentStock: string;
  costPrice: string;
  storageCondition?: string;
}

interface StorageLocationOption {
  id: number;
  code: string;
  name: string;
  zoneType: string;
  targetMinTemp: string | null;
  targetMaxTemp: string | null;
  isRefrigerated: boolean;
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [summary, setSummary] = useState<MovementsSummary | null>(null);
  const [inventoryList, setInventoryList] = useState<InventoryOption[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedItemId, setSelectedItemId] = useState<string>('ALL');

  // Inspect Modal
  const [activeMovement, setActiveMovement] = useState<StockMovement | null>(null);

  // New Movement Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formItemId, setFormItemId] = useState<string>('');
  const [formType, setFormType] = useState<'GOODS_RECEIPT_PO' | 'WASTE_SCRAP' | 'PHYSICAL_INVENTORY_ADJ' | 'TRANSFER'>('GOODS_RECEIPT_PO');
  const [formQuantity, setFormQuantity] = useState<string>('');
  const [formUnitCost, setFormUnitCost] = useState<string>('');
  const [formBatchNumber, setFormBatchNumber] = useState<string>('');
  
  // Dynamic Location States
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [customLocationBin, setCustomLocationBin] = useState<string>('');
  const [isCustomBin, setIsCustomBin] = useState(false);

  const [formDocRef, setFormDocRef] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [movesRes, itemsRes, locRes] = await Promise.all([
        fetchApi('/api/v1/inventory/movements?limit=150'),
        fetchApi('/api/v1/inventory/items').catch(() => fetchApi('/api/v1/inventory')),
        fetchApi('/api/v1/inventory/locations').catch(() => ({ data: [] })),
      ]);

      if (movesRes?.data) {
        setMovements(movesRes.data.movements || movesRes.data || []);
        setSummary(movesRes.data.summary || null);
      }
      if (itemsRes?.data) {
        setInventoryList(itemsRes.data.items || itemsRes.data || []);
      }
      if (locRes?.data) {
        setStorageLocations(locRes.data);
      }
    } catch (err) {
      console.error('Failed to load stock movements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = () => {
    setFormType('GOODS_RECEIPT_PO');
    setFormQuantity('');
    setFormUnitCost('');
    setFormBatchNumber('');
    setCustomLocationBin('');
    setIsCustomBin(false);
    setFormDocRef('');
    setFormNotes('');

    if (inventoryList.length > 0) {
      const firstItem = inventoryList[0];
      setFormItemId(String(firstItem.id));
      setFormUnitCost(firstItem.costPrice || '0');
      
      // Auto-assign matching bin
      assignDefaultBinForItem(firstItem, storageLocations);
    } else {
      setSelectedLocationId('');
    }

    setModalError(null);
    setIsModalOpen(true);
  };

  const assignDefaultBinForItem = (item: InventoryOption, locations: StorageLocationOption[]) => {
    if (locations.length === 0) {
      setSelectedLocationId('CUSTOM');
      setIsCustomBin(true);
      return;
    }

    const matchingLoc = locations.find((l) => {
      if (item.storageCondition === 'CHILLED_2_8C' || item.storageCondition === 'CHILLED') {
        return l.isRefrigerated || l.zoneType.includes('CHILLED');
      }
      if (item.storageCondition === 'DEEP_FREEZE') {
        return l.zoneType.includes('FREEZE');
      }
      return !l.isRefrigerated;
    });

    if (matchingLoc) {
      setSelectedLocationId(String(matchingLoc.id));
      setIsCustomBin(false);
    } else {
      setSelectedLocationId(String(locations[0].id));
      setIsCustomBin(false);
    }
  };

  const handleItemSelectChange = (itemIdStr: string) => {
    setFormItemId(itemIdStr);
    const item = inventoryList.find((i) => String(i.id) === itemIdStr);
    if (item) {
      setFormUnitCost(item.costPrice || '0');
      assignDefaultBinForItem(item, storageLocations);
    }
  };

  const handleLocationSelect = (locIdStr: string) => {
    setSelectedLocationId(locIdStr);
    if (locIdStr === 'CUSTOM') {
      setIsCustomBin(true);
      setCustomLocationBin('');
    } else {
      setIsCustomBin(false);
      setCustomLocationBin('');
    }
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemId) return;

    // Resolve final location bin
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
    setModalError(null);

    let rawQty = parseFloat(formQuantity) || 0;
    // Waste/Scrap decreases inventory
    if (formType === 'WASTE_SCRAP' && rawQty > 0) {
      rawQty = -rawQty;
    }

    try {
      await fetchApi('/api/v1/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({
          inventoryItemId: parseInt(formItemId, 10),
          type: formType,
          quantityDelta: rawQty,
          unitCost: formUnitCost ? parseFloat(formUnitCost) : undefined,
          batchNumber: formBatchNumber || undefined,
          locationBin: finalLocationBin || undefined,
          documentReference: formDocRef || undefined,
          notes: formNotes || undefined,
        }),
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to record movement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReverseMovement = async (movementId: number) => {
    const reason = prompt('Please enter the audit justification for reversing this movement:');
    if (!reason) return;

    try {
      await fetchApi(`/api/v1/inventory/movements/${movementId}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      alert('Movement reversed successfully via compensating Storno transaction.');
      setActiveMovement(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reverse movement');
    }
  };

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchesSearch =
        m.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.itemSku && m.itemSku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.documentReference && m.documentReference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.batchNumber && m.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.locationBin && m.locationBin.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.notes && m.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesType = true;
      if (selectedType === 'INWARD') {
        matchesType = m.type === 'GOODS_RECEIPT_PO' || m.type === 'PURCHASE';
      } else if (selectedType === 'OUTWARD') {
        matchesType = m.type === 'POS_RECIPE_DEPLETION' || m.type === 'SALE_CONSUMPTION';
      } else if (selectedType === 'WASTE') {
        matchesType = m.type === 'WASTE_SCRAP' || m.type === 'WASTE';
      } else if (selectedType === 'ADJUSTMENT') {
        matchesType = m.type === 'PHYSICAL_INVENTORY_ADJ' || m.type === 'ADJUSTMENT';
      } else if (selectedType === 'REVERSAL') {
        matchesType = m.type === 'STORNO_REVERSAL';
      }

      const matchesItem = selectedItemId === 'ALL' || String(m.inventoryItemId) === selectedItemId;

      return matchesSearch && matchesType && matchesItem;
    });
  }, [movements, searchTerm, selectedType, selectedItemId]);

  const getTypeBadge = (type: StockMovement['type'], isReversed: boolean) => {
    if (isReversed) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md line-through">
          {type} (REVERSED)
        </span>
      );
    }

    switch (type) {
      case 'GOODS_RECEIPT_PO':
      case 'PURCHASE':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <ArrowDownLeft size={11} /> GOODS RECEIPT (PO)
          </span>
        );
      case 'POS_RECIPE_DEPLETION':
      case 'SALE_CONSUMPTION':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
            <ArrowUpRight size={11} /> POS ORDER RECIPE
          </span>
        );
      case 'WASTE_SCRAP':
      case 'WASTE':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
            <AlertOctagon size={11} /> SPOILAGE / WASTE
          </span>
        );
      case 'PHYSICAL_INVENTORY_ADJ':
      case 'ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            <ArrowUpDown size={11} /> AUDIT RECALIBRATION
          </span>
        );
      case 'STORNO_REVERSAL':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
            <RotateCcw size={11} /> STORNO REVERSAL
          </span>
        );
      case 'SUPPLIER_RETURN':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
            <Package size={11} /> SUPPLIER RETURN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-md">
            {type}
          </span>
        );
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
            <span className="text-xs font-bold text-servora-navy">Double-Entry Material Ledger</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Stock Movements & Material Document Audit</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Immutable physical stock ledger: trace FIFO batch numbers, loading dock receipts, POS depletion, and Storno reversals.
          </p>
        </div>

        <button
          onClick={openModal}
          className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> Post Manual Movement
        </button>
      </div>

      {/* Aggregate Telemetry Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Inward Procurement</span>
              <h3 className="text-lg font-bold text-emerald-700 mt-1">
                +KES {summary.totalInflowValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-emerald-600 font-medium">Receipts & stock additions</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Outward Consumption & Loss</span>
              <h3 className="text-lg font-bold text-rose-700 mt-1">
                -KES {summary.totalOutflowValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-rose-600 font-medium">POS sales & recorded waste</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Audited Entries</span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">{summary.totalEntries} Documents</h3>
              <span className="text-[11px] text-servora-deepTeal font-medium">Immutable material transactions</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
              <Layers size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search ingredient, SKU, document ref (GRN/PO), or batch #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
            />
          </div>

          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white font-medium text-servora-navy max-w-[200px]"
          >
            <option value="ALL">All Catalog Articles</option>
            {inventoryList.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {[
            { id: 'ALL', label: 'All Documents' },
            { id: 'INWARD', label: 'Receipts' },
            { id: 'OUTWARD', label: 'POS Sales' },
            { id: 'WASTE', label: 'Wastage' },
            { id: 'ADJUSTMENT', label: 'Recalibrations' },
            { id: 'REVERSAL', label: 'Storno' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedType === tab.id
                  ? 'bg-white shadow-xs text-servora-navy font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Connecting to double-entry material document journal...
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No stock movement records match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3.5 px-4">Doc Timestamp</th>
                  <th className="py-3.5 px-4">Article & Batch</th>
                  <th className="py-3.5 px-4">Movement Type Code</th>
                  <th className="py-3.5 px-4 text-right">Quantity Delta</th>
                  <th className="py-3.5 px-4 text-right">Standard Cost</th>
                  <th className="py-3.5 px-4 text-right">Total Impact</th>
                  <th className="py-3.5 px-4 text-right">Balance Post</th>
                  <th className="py-3.5 px-4">Document Ref / Source</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredMovements.map((move) => {
                  const qtyNum = parseFloat(move.quantity) || 0;
                  const isPositive = qtyNum > 0;
                  const valNum = parseFloat(move.totalValuation) || 0;

                  return (
                    <tr 
                      key={move.id} 
                      className={`hover:bg-slate-50/70 transition-colors ${
                        move.isReversed ? 'opacity-50 bg-gray-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                        {new Date(move.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-servora-navy block">{move.itemName}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
                          <span>{move.itemSku || 'NO-SKU'}</span>
                          {move.batchNumber && (
                            <>
                              <span>&bull;</span>
                              <span className="text-purple-700 font-semibold">Lot: {move.batchNumber}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getTypeBadge(move.type, move.isReversed)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={isPositive ? 'text-emerald-700' : 'text-rose-600'}>
                          {isPositive ? `+${qtyNum.toLocaleString()}` : qtyNum.toLocaleString()} {move.itemUnit}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-gray-600">
                        KES {parseFloat(move.unitCost).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-servora-navy">
                        KES {valNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-servora-navy">
                        {parseFloat(move.balanceAfter).toLocaleString()} {move.itemUnit}
                      </td>

                      <td className="py-3.5 px-4">
                        {move.documentReference ? (
                          <span className="font-mono font-semibold text-servora-core text-[11px]">
                            {move.documentReference}
                          </span>
                        ) : move.orderId ? (
                          <span className="font-mono font-semibold text-blue-600 text-[11px]">
                            POS Order #{move.orderId}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">{move.notes || 'Manual Entry'}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setActiveMovement(move)}
                          className="px-2.5 py-1 text-xs font-semibold text-servora-core hover:bg-servora-pale rounded-lg transition-colors"
                        >
                          Inspect &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT MATERIAL DOCUMENT MODAL */}
      {activeMovement && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-servora-navy">Material Document #{activeMovement.id}</h3>
                  {getTypeBadge(activeMovement.type, activeMovement.isReversed)}
                </div>
                <p className="text-[11px] text-servora-deepTeal mt-0.5">
                  Item: <strong>{activeMovement.itemName}</strong> ({activeMovement.itemSku || 'NO-SKU'})
                </p>
              </div>
              <button onClick={() => setActiveMovement(null)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            {/* Document Details Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-gray-200 rounded-xl text-xs">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Quantity Delta</span>
                <span className="font-mono font-bold text-sm text-servora-navy">
                  {activeMovement.quantity} {activeMovement.itemUnit}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Balance Post-Txn</span>
                <span className="font-mono font-bold text-sm text-servora-navy">
                  {activeMovement.balanceAfter} {activeMovement.itemUnit}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Standard Unit Cost</span>
                <span className="font-mono font-bold text-servora-navy">
                  KES {parseFloat(activeMovement.unitCost).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Financial Valuation</span>
                <span className="font-mono font-bold text-emerald-700">
                  KES {parseFloat(activeMovement.totalValuation).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              {activeMovement.batchNumber && (
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-400">Lot / Batch Tracking Code:</span>
                  <span className="font-mono font-bold text-purple-700">{activeMovement.batchNumber}</span>
                </div>
              )}
              {activeMovement.locationBin && (
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-400">Storage Location / Bin:</span>
                  <span className="font-semibold">{activeMovement.locationBin}</span>
                </div>
              )}
              {activeMovement.documentReference && (
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-400">Commercial Source Document:</span>
                  <span className="font-mono font-bold text-servora-core">{activeMovement.documentReference}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-400">Authenticated Actor:</span>
                <span>{activeMovement.userName || 'System POS Automator'}</span>
              </div>
              {activeMovement.notes && (
                <div className="bg-gray-50 p-2.5 rounded-xl text-gray-500 text-[11px]">
                  <strong>Audit Notes:</strong> {activeMovement.notes}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveMovement(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Close
              </button>

              {/* Storno Reversal Action */}
              {!activeMovement.isReversed && activeMovement.type !== 'STORNO_REVERSAL' && (
                <button
                  type="button"
                  onClick={() => handleReverseMovement(activeMovement.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
                >
                  <RotateCcw size={13} /> Compensating Storno Reversal
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MANUAL RECORD MOVEMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Post Inventory Movement Document</h3>
                <p className="text-[11px] text-servora-deepTeal">Audit-safe manual transaction</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordMovement} className="space-y-3.5">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Target Inventory Article *</label>
                <select
                  required
                  value={formItemId}
                  onChange={(e) => handleItemSelectChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                >
                  {inventoryList.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} (On Hand: {parseFloat(inv.currentStock).toLocaleString()} {inv.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Movement Type Code *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="GOODS_RECEIPT_PO">GOODS_RECEIPT_PO (+)</option>
                    <option value="WASTE_SCRAP">WASTE_SCRAP (-)</option>
                    <option value="PHYSICAL_INVENTORY_ADJ">PHYSICAL_INVENTORY_ADJ (+/-)</option>
                    <option value="TRANSFER">TRANSFER (Warehouse Shift)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Quantity Delta *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder={formType === 'WASTE_SCRAP' ? 'Enter scrap (e.g. 2.5)' : 'e.g. 50'}
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Unit Valuation Cost (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formUnitCost}
                    onChange={(e) => setFormUnitCost(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:border-servora-core focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Lot / Batch ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. LOT-2026-B12"
                    value={formBatchNumber}
                    onChange={(e) => setFormBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono uppercase focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              {/* DYNAMIC STORAGE LOCATION / FACILITY BIN PICKER */}
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-servora-navy uppercase tracking-wider">
                    Storage Location / Facility Bin *
                  </label>
                  {storageLocations.length > 0 && (
                    <span className="text-[10px] text-servora-deepTeal">
                      {storageLocations.length} Facility Bins Registered
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className={isCustomBin ? 'col-span-1' : 'col-span-2'}>
                    <select
                      value={selectedLocationId}
                      onChange={(e) => handleLocationSelect(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium focus:border-servora-core focus:outline-none"
                    >
                      <option value="">Select facility storage bin...</option>
                      {storageLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.code} — {loc.name} {loc.isRefrigerated ? `(${loc.targetMinTemp}°C to ${loc.targetMaxTemp}°C)` : '(Ambient)'}
                        </option>
                      ))}
                      <option value="CUSTOM">+ Specify Custom Station / Bin</option>
                    </select>
                  </div>

                  {isCustomBin && (
                    <div className="col-span-1">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Main Kitchen Pass"
                        value={customLocationBin}
                        onChange={(e) => setCustomLocationBin(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium focus:border-servora-core focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Document Reference #</label>
                <input
                  type="text"
                  placeholder="e.g. PO-2026-001 / GRN-998"
                  value={formDocRef}
                  onChange={(e) => setFormDocRef(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:border-servora-core focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Audit Justification Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Broken packaging / Supplier delivery reconciliation"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
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