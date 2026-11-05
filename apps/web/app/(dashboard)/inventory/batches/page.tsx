'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  CalendarDays, 
  Plus, 
  AlertTriangle, 
  Clock, 
  Search, 
  Trash2, 
  Boxes, 
  ChevronRight, 
  CheckCircle2, 
  AlertOctagon, 
  Package, 
  X,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Snowflake,
  MapPin,
  Lock,
  Thermometer,
  FileCheck
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface InventoryBatch {
  id: number;
  inventoryItemId: number;
  itemName: string;
  itemSku: string | null;
  itemUnit: string;
  itemCategory: string;
  storageCondition: string | null;
  supplierName: string | null;
  batchNumber: string;
  supplierBatchNumber: string | null;
  certificateNumber: string | null;
  initialQuantity: string;
  currentQuantity: string;
  unitCost: string;
  locationBin: string | null;
  storageTemperature: string | null;
  receivedDate: string;
  expiryDate: string;
  status: 'ACTIVE' | 'QUARANTINE' | 'QUALITY_HOLD' | 'DEPLETED' | 'EXPIRED' | 'DISCARDED';
  daysUntilExpiry: number;
  isNearExpiry: boolean;
  notes: string | null;
}

interface InventoryOption {
  id: number;
  name: string;
  unit: string;
  costPrice: string;
  storageCondition?: string;
}

interface SupplierOption {
  id: number;
  name: string;
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

export default function InventoryBatchesPage() {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'QUARANTINE' | 'NEAR_EXPIRY' | 'EXPIRED'>('ALL');

  // Detail / Traceability Modal
  const [activeBatchDetail, setActiveBatchDetail] = useState<InventoryBatch | null>(null);

  // Register Batch Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState('');
  const [supplierBatchNumber, setSupplierBatchNumber] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [customLocationBin, setCustomLocationBin] = useState('');
  const [isCustomBin, setIsCustomBin] = useState(false);
  const [storageTemperature, setStorageTemperature] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [qcStatus, setQcStatus] = useState<'ACTIVE' | 'QUARANTINE' | 'QUALITY_HOLD'>('ACTIVE');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Discard Spoilage Modal State
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [activeBatch, setActiveBatch] = useState<InventoryBatch | null>(null);
  const [discardQty, setDiscardQty] = useState('');
  const [discardReason, setDiscardReason] = useState('Shelf life expired past safe temperature limit');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [batchesRes, itemsRes, supRes, locRes] = await Promise.all([
        fetchApi('/api/v1/inventory/batches'),
        fetchApi('/api/v1/inventory/items').catch(() => fetchApi('/api/v1/inventory')),
        fetchApi('/api/v1/suppliers').catch(() => ({ data: [] })),
        fetchApi('/api/v1/inventory/locations').catch(() => ({ data: [] })),
      ]);

      if (batchesRes?.data) setBatches(batchesRes.data);
      if (itemsRes?.data) {
        const items = itemsRes.data.items || itemsRes.data || [];
        setInventoryList(items);
        if (items.length > 0) {
          setSelectedItemId(String(items[0].id));
          setUnitCost(items[0].costPrice || '0');
        }
      }
      if (supRes?.data) setSuppliers(supRes.data);
      if (locRes?.data) setStorageLocations(locRes.data);
    } catch (err) {
      console.error('Failed to load batch tracking data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openRegisterModal = () => {
    setBatchNumber(`LOT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
    setSupplierBatchNumber('');
    setCertificateNumber('');
    setQuantity('20');
    setStorageTemperature('3.5');
    setExpiryDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setQcStatus('ACTIVE');
    setNotes('');
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

  const handleItemSelectChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = inventoryList.find((i) => String(i.id) === itemId);
    if (item) {
      setUnitCost(item.costPrice || '0');
      // Auto-match suitable location zone
      if (storageLocations.length > 0) {
        const matchingLoc = storageLocations.find((l) => {
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
        }
      }
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
      const matched = storageLocations.find((l) => String(l.id) === locIdStr);
      if (matched && matched.targetMinTemp) {
        setStorageTemperature(matched.targetMinTemp);
      }
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;

    // Resolve final bin string
    let finalBinName = '';
    if (isCustomBin) {
      finalBinName = customLocationBin.trim();
      if (!finalBinName) {
        alert('Please specify a storage location or shelf bin code');
        return;
      }
    } else {
      const selectedLoc = storageLocations.find((l) => String(l.id) === selectedLocationId);
      finalBinName = selectedLoc ? `${selectedLoc.name} (${selectedLoc.code})` : 'General Storeroom';
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      await fetchApi('/api/v1/inventory/batches', {
        method: 'POST',
        body: JSON.stringify({
          inventoryItemId: parseInt(selectedItemId, 10),
          supplierId: selectedSupplierId ? parseInt(selectedSupplierId, 10) : undefined,
          batchNumber,
          supplierBatchNumber: supplierBatchNumber || undefined,
          certificateNumber: certificateNumber || undefined,
          initialQuantity: parseFloat(quantity),
          unitCost: parseFloat(unitCost),
          locationBin: finalBinName,
          storageTemperature: storageTemperature ? parseFloat(storageTemperature) : undefined,
          expiryDate: new Date(expiryDate).toISOString(),
          status: qcStatus,
          notes: notes || undefined,
        }),
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create lot batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQCStatusChange = async (batchId: number, status: 'ACTIVE' | 'QUARANTINE' | 'QUALITY_HOLD') => {
    try {
      await fetchApi(`/api/v1/inventory/batches/${batchId}/qc-status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadData();
      if (activeBatchDetail && activeBatchDetail.id === batchId) {
        setActiveBatchDetail({ ...activeBatchDetail, status });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update QC status');
    }
  };

  const openDiscardModal = (b: InventoryBatch) => {
    setActiveBatch(b);
    setDiscardQty(String(parseFloat(b.currentQuantity)));
    setIsDiscardModalOpen(true);
  };

  const handleDiscard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatch) return;

    try {
      await fetchApi(`/api/v1/inventory/batches/${activeBatch.id}/discard`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: parseFloat(discardQty),
          reason: discardReason,
        }),
      });

      setIsDiscardModalOpen(false);
      setActiveBatch(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to discard batch');
    }
  };

  // Telemetry Aggregations
  const telemetry = useMemo(() => {
    let nearExpiryCount = 0;
    let expiredCount = 0;
    let quarantineCount = 0;
    let totalBatchValuation = 0;

    batches.forEach((b) => {
      const qty = parseFloat(b.currentQuantity) || 0;
      const cost = parseFloat(b.unitCost) || 0;
      if (qty > 0 && (b.status === 'ACTIVE' || b.status === 'QUARANTINE' || b.status === 'QUALITY_HOLD')) {
        totalBatchValuation += qty * cost;
        if (b.status === 'QUARANTINE' || b.status === 'QUALITY_HOLD') {
          quarantineCount++;
        }
        if (b.daysUntilExpiry <= 0) {
          expiredCount++;
        } else if (b.daysUntilExpiry <= 7) {
          nearExpiryCount++;
        }
      }
    });

    return {
      activeLots: batches.filter((b) => b.status === 'ACTIVE' && parseFloat(b.currentQuantity) > 0).length,
      nearExpiryCount,
      expiredCount,
      quarantineCount,
      totalBatchValuation,
    };
  }, [batches]);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesSearch =
        b.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.supplierBatchNumber && b.supplierBatchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.locationBin && b.locationBin.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.itemSku && b.itemSku.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') matchesStatus = b.status === 'ACTIVE' && parseFloat(b.currentQuantity) > 0;
      else if (statusFilter === 'QUARANTINE') matchesStatus = b.status === 'QUARANTINE' || b.status === 'QUALITY_HOLD';
      else if (statusFilter === 'NEAR_EXPIRY') matchesStatus = b.status === 'ACTIVE' && b.isNearExpiry;
      else if (statusFilter === 'EXPIRED') matchesStatus = b.daysUntilExpiry <= 0 || b.status === 'EXPIRED';

      return matchesSearch && matchesStatus;
    });
  }, [batches, searchTerm, statusFilter]);

  const getStatusBadge = (b: InventoryBatch) => {
    const remQty = parseFloat(b.currentQuantity);
    if (remQty <= 0) {
      return (
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
          Depleted
        </span>
      );
    }
    if (b.status === 'QUARANTINE') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
          <ShieldAlert size={11} /> QC Quarantine
        </span>
      );
    }
    if (b.status === 'QUALITY_HOLD') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
          <Lock size={11} /> Quality Hold
        </span>
      );
    }
    if (b.daysUntilExpiry <= 0 || b.status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
          <AlertOctagon size={11} /> Expired ({Math.abs(b.daysUntilExpiry)}d ago)
        </span>
      );
    }
    if (b.isNearExpiry) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={11} /> {b.daysUntilExpiry} Days Left (FEFO)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
        <CheckCircle2 size={11} /> Fresh ({b.daysUntilExpiry}d)
      </span>
    );
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
            <span className="text-xs font-bold text-servora-navy">Lot & Quality Management</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Batches, Expirations & FEFO Control</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Monitor perishable kitchen lots, First-Expired, First-Out (FEFO) rules, quarantine holds, and storage bin assignments.
          </p>
        </div>

        <button
          onClick={openRegisterModal}
          className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> Receive Batch / Lot
        </button>
      </div>

      {/* Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Active Lots</span>
            <h3 className="text-lg font-bold text-servora-navy mt-1">{telemetry.activeLots} Batches</h3>
            <span className="text-[11px] text-servora-deepTeal font-medium">Tracking on shelf</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
            <Boxes size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Lot Valuation</span>
            <h3 className="text-lg font-bold text-servora-navy mt-1">
              KES {telemetry.totalBatchValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium">Active lot holdings</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Package size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Near Expiry (&le; 7 Days)</span>
            <h3 className="text-lg font-bold text-amber-700 mt-1">{telemetry.nearExpiryCount} Lots</h3>
            <span className="text-[11px] text-amber-600 font-medium">Prioritize in kitchen prep</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Quarantined / Expired</span>
            <h3 className="text-lg font-bold text-rose-700 mt-1">
              {telemetry.quarantineCount + telemetry.expiredCount} Lots
            </h3>
            <span className="text-[11px] text-rose-600 font-medium">
              {telemetry.quarantineCount} in QC / {telemetry.expiredCount} expired
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertOctagon size={20} />
          </div>
        </div>
      </div>

      {/* Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search by ingredient, lot #, supplier batch, bin, or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {[
            { id: 'ALL', label: 'All Lots' },
            { id: 'ACTIVE', label: 'Active Unrestricted' },
            { id: 'QUARANTINE', label: `Quarantine (${telemetry.quarantineCount})` },
            { id: 'NEAR_EXPIRY', label: `Expiring Soon (${telemetry.nearExpiryCount})` },
            { id: 'EXPIRED', label: `Expired (${telemetry.expiredCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === tab.id ? 'bg-white shadow-xs text-servora-navy font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Connecting to perishables and batch lot database...
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No batch lots match your selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3.5 px-4">Lot Code</th>
                  <th className="py-3.5 px-4">Ingredient SKU</th>
                  <th className="py-3.5 px-4">Remaining Balance</th>
                  <th className="py-3.5 px-4">Unit Cost</th>
                  <th className="py-3.5 px-4">Storage Location Bin</th>
                  <th className="py-3.5 px-4">Expiration Date</th>
                  <th className="py-3.5 px-4">FEFO / QC Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredBatches.map((b) => {
                  const remQty = parseFloat(b.currentQuantity);
                  const isDepleted = remQty <= 0;
                  const isExpired = b.daysUntilExpiry <= 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-servora-navy font-mono">
                        {b.batchNumber}
                        {b.supplierBatchNumber && (
                          <span className="block text-[10px] text-gray-400 font-sans font-normal">
                            Vendor: {b.supplierBatchNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-servora-navy block">{b.itemName}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{b.itemSku || 'NO-SKU'}</span>
                      </td>

                      <td className="py-3.5 px-4 font-bold">
                        <span className={isDepleted ? 'text-gray-400 line-through' : 'text-servora-navy'}>
                          {remQty.toLocaleString()} {b.itemUnit}
                        </span>
                        <span className="block text-[10px] text-gray-400 font-normal">
                          of {parseFloat(b.initialQuantity).toLocaleString()} initial
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium">
                        KES {parseFloat(b.unitCost).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[11px] text-gray-700 font-medium block">
                          {b.locationBin || 'General Storeroom'}
                        </span>
                        {b.storageTemperature && (
                          <span className="text-[10px] text-purple-700 font-mono">
                            Intake: {b.storageTemperature}°C
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className={isExpired ? 'text-rose-600' : b.isNearExpiry ? 'text-amber-700' : 'text-servora-navy'}>
                          {new Date(b.expiryDate).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(b)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveBatchDetail(b)}
                            className="px-2 py-1 text-xs font-semibold text-servora-core hover:bg-servora-pale rounded-lg transition-colors"
                          >
                            Trace &rarr;
                          </button>
                          {!isDepleted && (
                            <button
                              onClick={() => openDiscardModal(b)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Write off spoilage"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
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

      {/* INSPECT & QC TRACEABILITY MODAL */}
      {activeBatchDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-servora-navy">{activeBatchDetail.batchNumber}</h3>
                  {getStatusBadge(activeBatchDetail)}
                </div>
                <p className="text-[11px] text-servora-deepTeal mt-0.5">
                  Ingredient: <strong>{activeBatchDetail.itemName}</strong> ({activeBatchDetail.itemSku || 'NO-SKU'})
                </p>
              </div>
              <button onClick={() => setActiveBatchDetail(null)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            {/* Traceability Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-gray-200 rounded-xl text-xs">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Available Quantity</span>
                <span className="font-mono font-bold text-sm text-servora-navy">
                  {parseFloat(activeBatchDetail.currentQuantity).toLocaleString()} {activeBatchDetail.itemUnit}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Expiration Date</span>
                <span className="font-mono font-bold text-sm text-servora-navy">
                  {new Date(activeBatchDetail.expiryDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Origin Supplier</span>
                <span className="font-semibold text-gray-800">
                  {activeBatchDetail.supplierName || 'Internal / Direct'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Storage Bin Location</span>
                <span className="font-semibold text-gray-800">
                  {activeBatchDetail.locationBin || 'General Storeroom'}
                </span>
              </div>
            </div>

            {/* Quality Compliance Attributes */}
            <div className="space-y-2 text-xs text-gray-600">
              {activeBatchDetail.supplierBatchNumber && (
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-400">Vendor Outer Packaging Lot:</span>
                  <span className="font-mono font-bold text-servora-navy">{activeBatchDetail.supplierBatchNumber}</span>
                </div>
              )}
              {activeBatchDetail.certificateNumber && (
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-400">Quality Certificate (COA) #:</span>
                  <span className="font-mono font-bold text-servora-core">{activeBatchDetail.certificateNumber}</span>
                </div>
              )}
              {activeBatchDetail.storageTemperature && (
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-400">Dock Inspection Temperature:</span>
                  <span className="font-mono font-bold text-purple-700">{activeBatchDetail.storageTemperature}°C</span>
                </div>
              )}
              {activeBatchDetail.notes && (
                <div className="bg-gray-50 p-2.5 rounded-xl text-gray-500 text-[11px]">
                  <strong>Auditor Notes:</strong> {activeBatchDetail.notes}
                </div>
              )}
            </div>

            {/* QC Gate Action Controls */}
            {parseFloat(activeBatchDetail.currentQuantity) > 0 && activeBatchDetail.daysUntilExpiry > 0 && (
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
                <span className="text-[11px] font-bold uppercase text-servora-navy tracking-wider block">
                  Quality Control (QC) Gate Management
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQCStatusChange(activeBatchDetail.id, 'ACTIVE')}
                    disabled={activeBatchDetail.status === 'ACTIVE'}
                    className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                  >
                    Release to Kitchen
                  </button>
                  <button
                    onClick={() => handleQCStatusChange(activeBatchDetail.id, 'QUARANTINE')}
                    disabled={activeBatchDetail.status === 'QUARANTINE'}
                    className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-colors"
                  >
                    Place in Quarantine
                  </button>
                  <button
                    onClick={() => handleQCStatusChange(activeBatchDetail.id, 'QUALITY_HOLD')}
                    disabled={activeBatchDetail.status === 'QUALITY_HOLD'}
                    className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition-colors"
                  >
                    Quality Hold
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveBatchDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Close Trace Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIVE BATCH MODAL (WITH DYNAMIC STORAGE BINS) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Receive Batch / Perishable Lot</h3>
                <p className="text-[11px] text-servora-deepTeal">Assign facility storage bins, temperature checks, and FEFO dates</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3.5">
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
                  onChange={(e) => handleItemSelectChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                >
                  {inventoryList.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Internal Lot Code *</label>
                  <input
                    type="text"
                    required
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Vendor Packaging Batch #</label>
                  <input
                    type="text"
                    placeholder="e.g. BRK-8812"
                    value={supplierBatchNumber}
                    onChange={(e) => setSupplierBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Received Quantity *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Unit Cost (KES) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              {/* DYNAMIC STORAGE BIN LOCATION PICKER */}
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-servora-navy tracking-wider">
                    Storage Bin Location *
                  </span>
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
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium"
                    >
                      <option value="">Select facility storage bin...</option>
                      {storageLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.code} — {loc.name} {loc.isRefrigerated ? `(${loc.targetMinTemp}°C to ${loc.targetMaxTemp}°C)` : '(Ambient)'}
                        </option>
                      ))}
                      <option value="CUSTOM">+ Specify Custom Location / Shelf</option>
                    </select>
                  </div>

                  {isCustomBin && (
                    <div className="col-span-1">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dry Store Shelf 3A"
                        value={customLocationBin}
                        onChange={(e) => setCustomLocationBin(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium focus:border-servora-core focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Expiration Date (FEFO Horizon) *</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Dock Temp Probe (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 3.5"
                    value={storageTemperature}
                    onChange={(e) => setStorageTemperature(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Initial QC Gate *</label>
                  <select
                    value={qcStatus}
                    onChange={(e) => setQcStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="ACTIVE">Release Directly (Active Unrestricted)</option>
                    <option value="QUARANTINE">Quarantine (Pending Lab / Chef Sign-off)</option>
                    <option value="QUALITY_HOLD">Quality Hold (Temperature Warning)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Quality Certificate / COA #</label>
                  <input
                    type="text"
                    placeholder="e.g. COA-2026-9901"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:border-servora-core focus:outline-none"
                  />
                </div>
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
                  {isSubmitting ? 'Receiving...' : 'Register Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISCARD SPOILAGE MODAL */}
      {isDiscardModalOpen && activeBatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Waste / Spoilage Write-Off</h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Lot: <strong className="text-servora-navy font-mono">{activeBatch.batchNumber}</strong> ({activeBatch.itemName})
                </p>
              </div>
              <button onClick={() => setIsDiscardModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDiscard} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">
                  Quantity to Discard ({activeBatch.itemUnit}) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  max={parseFloat(activeBatch.currentQuantity)}
                  required
                  value={discardQty}
                  onChange={(e) => setDiscardQty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Available in lot: {parseFloat(activeBatch.currentQuantity)} {activeBatch.itemUnit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Disposal Reason *</label>
                <select
                  value={discardReason}
                  onChange={(e) => setDiscardReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                >
                  <option value="Shelf life expired past safe temperature limit">Shelf life expired past safe temperature limit</option>
                  <option value="Visual mold / spoilage on kitchen inspection">Visual mold / spoilage on kitchen inspection</option>
                  <option value="Packaging compromised or broken seal">Packaging compromised or broken seal</option>
                  <option value="Failed chef temperature probe check">Failed chef temperature probe check</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsDiscardModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-xs transition-colors"
                >
                  Confirm Write-Off
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}