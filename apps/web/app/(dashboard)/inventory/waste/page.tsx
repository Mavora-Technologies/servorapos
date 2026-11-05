'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Trash2, 
  Plus, 
  AlertOctagon, 
  AlertTriangle, 
  DollarSign, 
  Search, 
  ChevronRight, 
  Filter, 
  Flame, 
  Snowflake, 
  User, 
  Clock, 
  FileSpreadsheet, 
  X,
  TrendingDown,
  Building2,
  Boxes,
  MapPin,
  ShieldCheck,
  Package,
  Layers,
  UtensilsCrossed,
  Wine,
  Croissant
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface WasteRecord {
  id: number;
  inventoryItemId: number;
  itemName: string;
  itemSku: string | null;
  itemUnit: string;
  itemCategory: string;
  inventoryBatchId: number | null;
  batchNumber: string | null;
  branchName: string | null;
  department: 'KITCHEN' | 'BAR' | 'BAKERY' | 'BUTCHERY' | 'MAIN_STORE' | 'FLOOR';
  reporterEmail: string | null;
  wasteReason: 
    | 'EXPIRED' 
    | 'SPOILED_STORAGE' 
    | 'OVERCOOKED_BURNED' 
    | 'DROPPED_DAMAGED' 
    | 'PREP_ERROR' 
    | 'OVER_PORTIONED' 
    | 'EQUIPMENT_FAILURE';
  dispositionMethod: 'TRASH_LANDFILL' | 'COMPOST_ORGANIC' | 'STAFF_FEEDING' | 'SUPPLIER_CLAIM';
  locationBin: string | null;
  documentReference: string | null;
  quantity: string;
  unitCost: string;
  totalLossCost: string;
  notes: string | null;
  loggedAt: string;
}

interface WasteSummary {
  totalEntries: number;
  totalLossValuation: number;
  reasonBreakdown: Record<string, { count: number; loss: number }>;
  departmentBreakdown: Record<string, { count: number; loss: number }>;
}

interface InventoryOption {
  id: number;
  name: string;
  unit: string;
  currentStock: string;
  costPrice: string;
}

interface BatchOption {
  id: number;
  inventoryItemId: number;
  batchNumber: string;
  currentQuantity: string;
  expiryDate: string;
}

interface StorageLocationOption {
  id: number;
  code: string;
  name: string;
  zoneType: string;
}

export default function WastagePage() {
  const [logs, setLogs] = useState<WasteRecord[]>([]);
  const [summary, setSummary] = useState<WasteSummary | null>(null);
  const [inventoryList, setInventoryList] = useState<InventoryOption[]>([]);
  const [batchesList, setBatchesList] = useState<BatchOption[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [department, setDepartment] = useState<WasteRecord['department']>('KITCHEN');
  const [wasteReason, setWasteReason] = useState<WasteRecord['wasteReason']>('SPOILED_STORAGE');
  const [dispositionMethod, setDispositionMethod] = useState<WasteRecord['dispositionMethod']>('TRASH_LANDFILL');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [customLocationBin, setCustomLocationBin] = useState('');
  const [isCustomBin, setIsCustomBin] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [wasteRes, invRes, batchRes, locRes] = await Promise.all([
        fetchApi('/api/v1/inventory/waste'),
        fetchApi('/api/v1/inventory/items').catch(() => fetchApi('/api/v1/inventory')),
        fetchApi('/api/v1/inventory/batches').catch(() => ({ data: [] })),
        fetchApi('/api/v1/inventory/locations').catch(() => ({ data: [] })),
      ]);

      if (wasteRes?.data) {
        setLogs(wasteRes.data.logs || []);
        setSummary(wasteRes.data.summary || null);
      }
      if (invRes?.data) {
        const items = invRes.data.items || invRes.data || [];
        setInventoryList(items);
        if (items.length > 0) setSelectedItemId(String(items[0].id));
      }
      if (batchRes?.data) setBatchesList(batchRes.data);
      if (locRes?.data) setStorageLocations(locRes.data);
    } catch (err) {
      console.error('Failed to load waste records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openLogModal = () => {
    setQuantity('');
    setWitnessName('');
    setNotes('');
    setWasteReason('SPOILED_STORAGE');
    setDepartment('KITCHEN');
    setDispositionMethod('TRASH_LANDFILL');
    setSelectedBatchId('');
    setCustomLocationBin('');
    setIsCustomBin(false);

    if (storageLocations.length > 0) {
      setSelectedLocationId(String(storageLocations[0].id));
    } else {
      setSelectedLocationId('CUSTOM');
      setIsCustomBin(true);
    }

    setModalError(null);
    setIsModalOpen(true);
  };

  const availableBatchesForItem = useMemo(() => {
    if (!selectedItemId) return [];
    return batchesList.filter(
      (b) => String(b.inventoryItemId) === selectedItemId && parseFloat(b.currentQuantity) > 0
    );
  }, [batchesList, selectedItemId]);

  const selectedItemInfo = useMemo(() => {
    return inventoryList.find((i) => String(i.id) === selectedItemId);
  }, [inventoryList, selectedItemId]);

  const estimatedModalLoss = useMemo(() => {
    if (!selectedItemInfo || !quantity) return 0;
    const qty = parseFloat(quantity) || 0;
    const cost = parseFloat(selectedItemInfo.costPrice) || 0;
    return qty * cost;
  }, [selectedItemInfo, quantity]);

  const handleLocationSelect = (locIdStr: string) => {
    setSelectedLocationId(locIdStr);
    if (locIdStr === 'CUSTOM') {
      setIsCustomBin(true);
      setCustomLocationBin('');
    } else {
      setIsCustomBin(false);
    }
  };

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;

    let finalBin = '';
    if (isCustomBin) {
      finalBin = customLocationBin.trim();
    } else {
      const matchLoc = storageLocations.find((l) => String(l.id) === selectedLocationId);
      finalBin = matchLoc ? `${matchLoc.name} (${matchLoc.code})` : 'Main Kitchen Area';
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      await fetchApi('/api/v1/inventory/waste', {
        method: 'POST',
        body: JSON.stringify({
          inventoryItemId: parseInt(selectedItemId, 10),
          inventoryBatchId: selectedBatchId ? parseInt(selectedBatchId, 10) : undefined,
          department,
          wasteReason,
          dispositionMethod,
          quantity: parseFloat(quantity),
          locationBin: finalBin || undefined,
          witnessName: witnessName || undefined,
          notes: notes || undefined,
        }),
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to record waste write-off');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.itemSku && log.itemSku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.documentReference && log.documentReference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.batchNumber && log.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesReason = reasonFilter === 'ALL' || log.wasteReason === reasonFilter;
      const matchesDept = departmentFilter === 'ALL' || log.department === departmentFilter;

      return matchesSearch && matchesReason && matchesDept;
    });
  }, [logs, searchTerm, reasonFilter, departmentFilter]);

  const getReasonBadge = (reason: WasteRecord['wasteReason']) => {
    switch (reason) {
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            <Clock size={11} /> Shelf Expired
          </span>
        );
      case 'SPOILED_STORAGE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
            <Snowflake size={11} /> Chiller / Storage
          </span>
        );
      case 'OVERCOOKED_BURNED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <Flame size={11} /> Burned / Overcooked
          </span>
        );
      case 'DROPPED_DAMAGED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
            <AlertTriangle size={11} /> Dropped / Broken
          </span>
        );
      case 'PREP_ERROR':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <AlertOctagon size={11} /> Prep Mistake
          </span>
        );
      case 'EQUIPMENT_FAILURE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300">
            <AlertOctagon size={11} /> Equipment Failure
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
            {reason.replace('_', ' ')}
          </span>
        );
    }
  };

  const getDepartmentBadge = (dept: WasteRecord['department']) => {
    switch (dept) {
      case 'KITCHEN':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-slate-100 px-2 py-0.5 rounded"><UtensilsCrossed size={10} /> Kitchen</span>;
      case 'BAR':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded"><Wine size={10} /> Bar Station</span>;
      case 'BAKERY':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded"><Croissant size={10} /> Bakery</span>;
      default:
        return <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{dept}</span>;
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
            <span className="text-xs font-bold text-servora-navy">Loss Prevention & Scrap</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Wastage, Spoilage & Loss Control</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Audit culinary yield losses, prep mistakes, temperature breaches, and lot scrap with live material ledger balancing.
          </p>
        </div>

        <button
          onClick={openLogModal}
          className="bg-rose-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-rose-700 transition-colors flex items-center gap-2"
        >
          <Trash2 size={15} /> Log Waste Incident
        </button>
      </div>

      {/* Financial Telemetry Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Total Financial Loss</span>
              <h3 className="text-lg font-bold text-rose-700 mt-1">
                KES {summary.totalLossValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-rose-600 font-medium">Culinary loss this period</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Logged Incidents</span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">{summary.totalEntries} Entries</h3>
              <span className="text-[11px] text-servora-deepTeal font-medium">Across all kitchen stations</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
              <FileSpreadsheet size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Top Loss Vector</span>
              <h3 className="text-lg font-bold text-amber-700 mt-1">
                {summary.reasonBreakdown['SPOILED_STORAGE']
                  ? `KES ${summary.reasonBreakdown['SPOILED_STORAGE'].loss.toFixed(0)}`
                  : summary.reasonBreakdown['EXPIRED']
                  ? `KES ${summary.reasonBreakdown['EXPIRED'].loss.toFixed(0)}`
                  : 'Minimal'}
              </h3>
              <span className="text-[11px] text-amber-600 font-medium">Storage & Shelf Life</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Snowflake size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Kitchen Cost-Center</span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">
                {summary.departmentBreakdown['KITCHEN']
                  ? `KES ${summary.departmentBreakdown['KITCHEN'].loss.toFixed(0)}`
                  : 'KES 0'}
              </h3>
              <span className="text-[11px] text-gray-500 font-medium">Main cooking line</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-servora-navy flex items-center justify-center">
              <Flame size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search by ingredient, SKU, document #, or lot..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white font-medium text-servora-navy"
          >
            <option value="ALL">All Cost Centers</option>
            <option value="KITCHEN">Kitchen Line</option>
            <option value="BAR">Bar Station</option>
            <option value="BAKERY">Bakery</option>
            <option value="BUTCHERY">Butchery Prep</option>
            <option value="MAIN_STORE">Main Store</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {[
            { id: 'ALL', label: 'All Incidents' },
            { id: 'SPOILED_STORAGE', label: 'Storage Spoilage' },
            { id: 'EXPIRED', label: 'Expired' },
            { id: 'OVERCOOKED_BURNED', label: 'Burned' },
            { id: 'PREP_ERROR', label: 'Prep Error' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setReasonFilter(r.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                reasonFilter === r.id ? 'bg-white shadow-xs text-servora-navy font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Wastage Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Connecting to kitchen loss & waste audit logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No waste records match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3.5 px-4">Doc # & Date</th>
                  <th className="py-3.5 px-4">Discarded Item & Lot</th>
                  <th className="py-3.5 px-4">Cost Center</th>
                  <th className="py-3.5 px-4">Loss Classification</th>
                  <th className="py-3.5 px-4 text-right">Written-Off Qty</th>
                  <th className="py-3.5 px-4 text-right">Standard Cost</th>
                  <th className="py-3.5 px-4 text-right">Total Financial Loss</th>
                  <th className="py-3.5 px-4">Storage Bin Location</th>
                  <th className="py-3.5 px-4">Auditor / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold block text-servora-navy">
                        {log.documentReference || `WST-${log.id}`}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(log.loggedAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-servora-navy block">{log.itemName}</span>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                        <span>{log.itemSku || 'NO-SKU'}</span>
                        {log.batchNumber && (
                          <>
                            <span>&bull;</span>
                            <span className="text-purple-700 font-semibold">Lot: {log.batchNumber}</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {getDepartmentBadge(log.department)}
                    </td>

                    <td className="py-3.5 px-4">
                      {getReasonBadge(log.wasteReason)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-700">
                      -{parseFloat(log.quantity).toLocaleString()} {log.itemUnit}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-gray-500">
                      KES {parseFloat(log.unitCost).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-700">
                      KES {parseFloat(log.totalLossCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-gray-600">
                      <span className="block truncate max-w-[150px]">{log.locationBin || 'Kitchen Floor'}</span>
                      <span className="text-[10px] text-gray-400 block">{log.dispositionMethod.replace('_', ' ')}</span>
                    </td>

                    <td className="py-3.5 px-4 text-gray-600 max-w-xs">
                      <span className="inline-flex items-center gap-1 text-[11px] text-servora-deepTeal font-medium block">
                        <User size={11} className="text-gray-400" />
                        {log.reporterEmail || 'Staff'}
                      </span>
                      <span className="text-[10.5px] text-gray-500 truncate block">{log.notes || '-'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LOG WASTE INCIDENT MODAL (WITH BATCH & LOCATION INTEGRATION) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Log Kitchen Scrap / Spoilage Incident</h3>
                <p className="text-[11px] text-servora-deepTeal">Writes off inventory and posts material scrap ledger</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLog} className="space-y-3.5">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Target Inventory Item *</label>
                <select
                  required
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    setSelectedBatchId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                >
                  {inventoryList.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (On hand: {parseFloat(i.currentStock).toLocaleString()} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Batch / Lot Association if lots exist */}
              {availableBatchesForItem.length > 0 && (
                <div className="p-2.5 bg-purple-50/60 border border-purple-100 rounded-xl">
                  <label className="block text-[10.5px] font-bold text-purple-900 mb-1">
                    Specific Expiring Lot (FEFO Write-Off)
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-purple-200 rounded-lg text-xs bg-white font-mono"
                  >
                    <option value="">General stock balance (Unassigned Lot)</option>
                    {availableBatchesForItem.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} (Avail: {parseFloat(b.currentQuantity)} | Exp: {new Date(b.expiryDate).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Cost Center (Station) *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="KITCHEN">Main Kitchen Line</option>
                    <option value="BAR">Bar & Beverage</option>
                    <option value="BAKERY">Bakery & Pastry</option>
                    <option value="BUTCHERY">Butchery Station</option>
                    <option value="MAIN_STORE">Central Store</option>
                    <option value="FLOOR">Dining / Floor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Disposal Disposition</label>
                  <select
                    value={dispositionMethod}
                    onChange={(e) => setDispositionMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="TRASH_LANDFILL">Discarded / Landfill</option>
                    <option value="COMPOST_ORGANIC">Composted (Organic)</option>
                    <option value="STAFF_FEEDING">Staff Meal Conversion</option>
                    <option value="SUPPLIER_CLAIM">Supplier Claim Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Loss Reason Classification *</label>
                <select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                >
                  <option value="SPOILED_STORAGE">Chiller Temperature Abuse / Breakdown</option>
                  <option value="EXPIRED">Passed Expiration Date on Shelf</option>
                  <option value="OVERCOOKED_BURNED">Burned / Overcooked on Line</option>
                  <option value="DROPPED_DAMAGED">Dropped on Floor / Compromised Seal</option>
                  <option value="PREP_ERROR">Prep Mistake (Wrong Recipe Formulation)</option>
                  <option value="OVER_PORTIONED">Excess Portion Trimming Loss</option>
                  <option value="EQUIPMENT_FAILURE">Oven / Fryer Equipment Malfunction</option>
                </select>
              </div>

              {/* Dynamic Bin Selection */}
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Origin Storage Bin / Station</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className={isCustomBin ? 'col-span-1' : 'col-span-2'}>
                    <select
                      value={selectedLocationId}
                      onChange={(e) => handleLocationSelect(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium"
                    >
                      <option value="">Select facility bin...</option>
                      {storageLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.code} — {loc.name}
                        </option>
                      ))}
                      <option value="CUSTOM">+ Specify Station / Bin</option>
                    </select>
                  </div>
                  {isCustomBin && (
                    <div className="col-span-1">
                      <input
                        type="text"
                        placeholder="e.g. Line Station 2"
                        value={customLocationBin}
                        onChange={(e) => setCustomLocationBin(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    Qty Written Off ({selectedItemInfo?.unit || 'units'}) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    placeholder="e.g. 2.5"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Witness / Sous Chef</label>
                  <input
                    type="text"
                    placeholder="e.g. Chef Alex"
                    value={witnessName}
                    onChange={(e) => setWitnessName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              {/* Estimated Loss Valuation Pill */}
              {estimatedModalLoss > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-rose-800 font-medium">Estimated Financial Write-Off:</span>
                  <span className="font-mono font-bold text-rose-700">
                    KES {estimatedModalLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Incident Justification Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Compressor failure in chiller section B"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Posting Write-Off...' : 'Write Off Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}