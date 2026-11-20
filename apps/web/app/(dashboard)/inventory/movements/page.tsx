// apps/web/app/(dashboard)/inventory/movements/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Plus,
  X,
  ChevronRight,
  Package,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

type MovementType =
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

type ManualMovementType =
  | 'GOODS_RECEIPT_PO'
  | 'WASTE_SCRAP'
  | 'PHYSICAL_INVENTORY_ADJ'
  | 'TRANSFER';

type MovementFilterTab = 'ALL' | 'INWARD' | 'OUTWARD' | 'WASTE' | 'ADJUSTMENT' | 'REVERSAL';

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
  type: MovementType;
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

interface RawLocationRecord {
  id: number;
  code?: string;
  zoneCode?: string;
  name: string;
  zoneType?: string;
  targetMinTemp?: string | null;
  targetMaxTemp?: string | null;
  temperatureMinC?: string | null;
  temperatureMaxC?: string | null;
  isRefrigerated?: boolean;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function normalizeLocations(raw: unknown): StorageLocationOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (entry): entry is RawLocationRecord =>
        Boolean(entry && typeof entry === 'object' && 'id' in entry)
    )
    .map((loc) => {
      const zoneType = loc.zoneType ?? 'DRY_AMBIENT';
      return {
        id: Number(loc.id),
        code: loc.code ?? loc.zoneCode ?? `LOC-${loc.id}`,
        name: loc.name,
        zoneType,
        targetMinTemp: loc.targetMinTemp ?? loc.temperatureMinC ?? null,
        targetMaxTemp: loc.targetMaxTemp ?? loc.temperatureMaxC ?? null,
        isRefrigerated:
          typeof loc.isRefrigerated === 'boolean'
            ? loc.isRefrigerated
            : ['COLD_STORAGE', 'DEEP_FREEZE', 'CHILLED_2_8C'].includes(zoneType),
      };
    });
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [summary, setSummary] = useState<MovementsSummary | null>(null);
  const [inventoryList, setInventoryList] = useState<InventoryOption[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Page Feedback States
  const [loadError, setLoadError] = useState<string | null>(null);
  const [referenceWarning, setReferenceWarning] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<MovementFilterTab>('ALL');
  const [selectedItemId, setSelectedItemId] = useState<string>('ALL');

  // Inspect & Storno Reversal Modal
  const [activeMovement, setActiveMovement] = useState<StockMovement | null>(null);
  const [isReversingMode, setIsReversingMode] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalError, setReversalError] = useState<string | null>(null);
  const [isReversingSubmit, setIsReversingSubmit] = useState(false);

  // New Movement Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formItemId, setFormItemId] = useState<string>('');
  const [formType, setFormType] = useState<ManualMovementType>('GOODS_RECEIPT_PO');
  const [formQuantity, setFormQuantity] = useState<string>('');
  const [formUnitCost, setFormUnitCost] = useState<string>('');
  const [formBatchNumber, setFormBatchNumber] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [customLocationBin, setCustomLocationBin] = useState<string>('');
  const [isCustomBin, setIsCustomBin] = useState(false);
  const [formDocRef, setFormDocRef] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setReferenceWarning(null);

    const [movesResult, itemsResult, locResult] = await Promise.allSettled([
      fetchApi('/api/v1/inventory/movements?limit=150'),
      fetchApi('/api/v1/inventory/items'),
      fetchApi('/api/v1/inventory/locations'),
    ]);

    if (movesResult.status === 'fulfilled') {
      const payload = movesResult.value?.data;
      const rawMoves = Array.isArray(payload) ? payload : payload?.movements;
      if (!Array.isArray(rawMoves)) {
        setLoadError('Unexpected response structure received from stock movements ledger.');
        setMovements([]);
        setSummary(null);
      } else {
        setMovements(rawMoves);
        setSummary(
          payload && !Array.isArray(payload) && payload.summary ? payload.summary : null
        );
      }
    } else {
      setLoadError(getErrorMessage(movesResult.reason, 'Failed to load stock movements ledger.'));
      setMovements([]);
      setSummary(null);
    }

    const warnings: string[] = [];

    if (itemsResult.status === 'fulfilled') {
      const payload = itemsResult.value?.data;
      const rawItems = Array.isArray(payload) ? payload : payload?.items;
      setInventoryList(Array.isArray(rawItems) ? rawItems : []);
    } else {
      setInventoryList([]);
      warnings.push('Inventory catalog could not be loaded.');
    }

    if (locResult.status === 'fulfilled') {
      const locPayload = locResult.value?.data;
      const rawLocations = Array.isArray(locPayload)
        ? locPayload
        : Array.isArray(locPayload?.zones)
          ? locPayload.zones
          : locPayload?.locations;
      setStorageLocations(normalizeLocations(rawLocations));
    } else {
      setStorageLocations([]);
      warnings.push('Facility storage locations could not be loaded.');
    }

    if (warnings.length > 0) {
      setReferenceWarning(warnings.join(' '));
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignDefaultBinForItem = (
    item: InventoryOption,
    locations: StorageLocationOption[]
  ) => {
    const safeLocations = Array.isArray(locations) ? locations : [];
    if (safeLocations.length === 0) {
      setSelectedLocationId('CUSTOM');
      setIsCustomBin(true);
      return;
    }

    const matchingLoc = safeLocations.find((l) => {
      if (item.storageCondition === 'CHILLED_2_8C' || item.storageCondition === 'CHILLED') {
        return l.isRefrigerated || l.zoneType.includes('CHILLED') || l.zoneType.includes('COLD');
      }
      if (item.storageCondition === 'DEEP_FREEZE') {
        return l.zoneType.includes('FREEZE');
      }
      return !l.isRefrigerated;
    });

    setSelectedLocationId(matchingLoc ? String(matchingLoc.id) : String(safeLocations[0].id));
    setIsCustomBin(false);
  };

  const openModal = () => {
    setFormType('GOODS_RECEIPT_PO');
    setFormQuantity('');
    setFormUnitCost('');
    setFormBatchNumber('');
    setCustomLocationBin('');
    setIsCustomBin(false);
    setFormDocRef('');
    setFormNotes('');
    setModalError(null);

    if (inventoryList.length > 0) {
      const firstItem = inventoryList[0];
      setFormItemId(String(firstItem.id));
      setFormUnitCost(firstItem.costPrice || '0');
      assignDefaultBinForItem(firstItem, storageLocations);
    } else {
      setFormItemId('');
      setSelectedLocationId(storageLocations.length > 0 ? String(storageLocations[0].id) : 'CUSTOM');
      setIsCustomBin(storageLocations.length === 0);
    }

    setIsModalOpen(true);
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
    if (isSubmitting) return;
    setModalError(null);

    if (!formItemId) {
      setModalError('Please select a target inventory article.');
      return;
    }

    const parsedQty = parseFloat(formQuantity);
    if (Number.isNaN(parsedQty) || parsedQty === 0) {
      setModalError('Quantity delta must be a non-zero number.');
      return;
    }

    if (formType === 'GOODS_RECEIPT_PO' && parsedQty < 0) {
      setModalError('Goods receipt quantity must be positive.');
      return;
    }

    let locationId: number | null = null;
    let finalLocationBin: string | null = null;

    if (isCustomBin) {
      const trimmed = customLocationBin.trim();
      if (!trimmed) {
        setModalError('Please specify a storage location or station bin code.');
        return;
      }
      finalLocationBin = trimmed;
    } else {
      const matchLoc = storageLocations.find((l) => String(l.id) === selectedLocationId);
      if (!matchLoc) {
        setModalError('Please select a valid facility storage bin.');
        return;
      }
      locationId = matchLoc.id;
      finalLocationBin = `${matchLoc.name} (${matchLoc.code})`;
    }

    let rawQty = parsedQty;
    if (formType === 'WASTE_SCRAP' && rawQty > 0) {
      rawQty = -rawQty;
    }

    setIsSubmitting(true);
    try {
      await fetchApi('/api/v1/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({
          inventoryItemId: parseInt(formItemId, 10),
          type: formType,
          quantityDelta: rawQty,
          unitCost: formUnitCost ? parseFloat(formUnitCost) : undefined,
          batchNumber: formBatchNumber.trim() || undefined,
          locationId,
          locationBin: finalLocationBin || undefined,
          documentReference: formDocRef.trim() || undefined,
          notes: formNotes.trim() || undefined,
        }),
      });

      setIsModalOpen(false);
      setStatusBanner(`Posted ${formType} movement to the material ledger.`);
      await loadData();
    } catch (err: unknown) {
      setModalError(getErrorMessage(err, 'Failed to record stock movement.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openInspectModal = (move: StockMovement) => {
    setActiveMovement(move);
    setIsReversingMode(false);
    setReversalReason('');
    setReversalError(null);
  };

  const handleConfirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMovement || isReversingSubmit) return;

    const trimmedReason = reversalReason.trim();
    if (trimmedReason.length < 3) {
      setReversalError('Please enter a clear audit justification (at least 3 characters).');
      return;
    }

    setIsReversingSubmit(true);
    setReversalError(null);
    try {
      await fetchApi(`/api/v1/inventory/movements/${activeMovement.id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason: trimmedReason }),
      });
      const reversedId = activeMovement.id;
      setActiveMovement(null);
      setIsReversingMode(false);
      setStatusBanner(
        `Document #${reversedId} reversed successfully via compensating Storno transaction.`
      );
      await loadData();
    } catch (err: unknown) {
      setReversalError(getErrorMessage(err, 'Failed to reverse material document.'));
    } finally {
      setIsReversingSubmit(false);
    }
  };

  const filteredMovements = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return movements.filter((m) => {
      const matchesSearch =
        !query ||
        m.itemName.toLowerCase().includes(query) ||
        (m.itemSku && m.itemSku.toLowerCase().includes(query)) ||
        (m.documentReference && m.documentReference.toLowerCase().includes(query)) ||
        (m.batchNumber && m.batchNumber.toLowerCase().includes(query)) ||
        (m.locationBin && m.locationBin.toLowerCase().includes(query)) ||
        (m.notes && m.notes.toLowerCase().includes(query));

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

  const getTypeBadge = (type: MovementType, isReversed: boolean) => {
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
      {/* Status & Warning Banners */}
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
            <span className="text-xs font-bold text-servora-navy">Double-Entry Material Ledger</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">
            Stock Movements &amp; Material Document Audit
          </h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Immutable physical stock ledger: trace batch numbers, loading dock receipts, POS depletion, and Storno reversals.
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
            onClick={openModal}
            disabled={inventoryList.length === 0}
            className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Plus size={15} /> Post Manual Movement
          </button>
        </div>
      </div>

      {/* Aggregate Telemetry Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                Inward Procurement
              </span>
              <h3 className="text-lg font-bold text-emerald-700 mt-1">
                +KES{' '}
                {summary.totalInflowValuation.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </h3>
              <span className="text-[11px] text-emerald-600 font-medium">
                Receipts &amp; stock additions
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                Outward Consumption &amp; Loss
              </span>
              <h3 className="text-lg font-bold text-rose-700 mt-1">
                -KES{' '}
                {summary.totalOutflowValuation.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </h3>
              <span className="text-[11px] text-rose-600 font-medium">
                POS sales &amp; recorded waste
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                Audited Entries
              </span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">
                {summary.totalEntries} Documents
              </h3>
              <span className="text-[11px] text-servora-deepTeal font-medium">
                Immutable material transactions
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
              <Layers size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              aria-label="Search movements by ingredient, SKU, document reference, or batch"
              placeholder="Search ingredient, SKU, document ref (GRN/PO), or batch #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter by inventory article"
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
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {(
            [
              { id: 'ALL', label: 'All Documents' },
              { id: 'INWARD', label: 'Receipts' },
              { id: 'OUTWARD', label: 'POS Sales' },
              { id: 'WASTE', label: 'Wastage' },
              { id: 'ADJUSTMENT', label: 'Recalibrations' },
              { id: 'REVERSAL', label: 'Storno' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
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
            Loading double-entry material document journal...
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
        ) : filteredMovements.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No stock movement records match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th scope="col" className="py-3.5 px-4">Doc Timestamp</th>
                  <th scope="col" className="py-3.5 px-4">Article &amp; Batch</th>
                  <th scope="col" className="py-3.5 px-4">Movement Type Code</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Quantity Delta</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Standard Cost</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Total Impact</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Balance Post</th>
                  <th scope="col" className="py-3.5 px-4">Document Ref / Source</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Action</th>
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
                              <span className="text-purple-700 font-semibold">
                                Lot: {move.batchNumber}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">{getTypeBadge(move.type, move.isReversed)}</td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={isPositive ? 'text-emerald-700' : 'text-rose-600'}>
                          {isPositive ? `+${qtyNum.toLocaleString()}` : qtyNum.toLocaleString()}{' '}
                          {move.itemUnit}
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
                          <span className="text-gray-400 text-[11px]">
                            {move.notes || 'Manual Entry'}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openInspectModal(move)}
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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-doc-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 id="inspect-doc-title" className="text-sm font-bold text-servora-navy">
                    Material Document #{activeMovement.id}
                  </h3>
                  {getTypeBadge(activeMovement.type, activeMovement.isReversed)}
                </div>
                <p className="text-[11px] text-servora-deepTeal mt-0.5">
                  Item: <strong>{activeMovement.itemName}</strong> ({activeMovement.itemSku || 'NO-SKU'})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMovement(null)}
                aria-label="Close modal"
                className="text-gray-400 hover:text-servora-navy"
              >
                <X size={18} />
              </button>
            </div>

            {/* Document Details Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-gray-200 rounded-xl text-xs">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">
                  Quantity Delta
                </span>
                <span className="font-mono font-bold text-sm text-servora-navy">
                  {activeMovement.quantity} {activeMovement.itemUnit}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">
                  Balance Post-Txn
                </span>
                <span className="font-mono font-bold text-sm text-servora-navy">
                  {activeMovement.balanceAfter} {activeMovement.itemUnit}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">
                  Standard Unit Cost
                </span>
                <span className="font-mono font-bold text-servora-navy">
                  KES {parseFloat(activeMovement.unitCost).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">
                  Financial Valuation
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  KES{' '}
                  {parseFloat(activeMovement.totalValuation).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              {activeMovement.batchNumber && (
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-400">Lot / Batch Tracking Code:</span>
                  <span className="font-mono font-bold text-purple-700">
                    {activeMovement.batchNumber}
                  </span>
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
                  <span className="font-mono font-bold text-servora-core">
                    {activeMovement.documentReference}
                  </span>
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

            {/* Inline Storno Reversal Form */}
            {isReversingMode ? (
              <form
                onSubmit={handleConfirmReversal}
                className="space-y-3 pt-3 border-t border-purple-100 bg-purple-50/50 p-3.5 rounded-xl"
              >
                <label
                  htmlFor="storno-reason"
                  className="block text-xs font-bold text-purple-900"
                >
                  Storno Reversal Audit Justification *
                </label>
                <input
                  id="storno-reason"
                  type="text"
                  required
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Duplicate GRN entry posted in error"
                  className="w-full px-3 py-2 border border-purple-200 bg-white rounded-xl text-xs focus:border-purple-600 focus:outline-none"
                />
                {reversalError && (
                  <p role="alert" className="text-[11px] font-semibold text-rose-700">
                    {reversalError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReversingMode(false);
                      setReversalError(null);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-white rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isReversingSubmit}
                    className="px-3.5 py-1.5 bg-purple-700 text-white text-xs font-bold rounded-lg hover:bg-purple-800 disabled:opacity-50"
                  >
                    {isReversingSubmit ? 'Reversing...' : 'Confirm Storno Reversal'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveMovement(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
                >
                  Close
                </button>

                {!activeMovement.isReversed && activeMovement.type !== 'STORNO_REVERSAL' && (
                  <button
                    type="button"
                    onClick={() => setIsReversingMode(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
                  >
                    <RotateCcw size={13} /> Compensating Storno Reversal
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANUAL RECORD MOVEMENT MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-movement-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 id="record-movement-title" className="text-sm font-bold text-servora-navy">
                  Post Inventory Movement Document
                </h3>
                <p className="text-[11px] text-servora-deepTeal">Audit-safe manual transaction</p>
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

            <form onSubmit={handleRecordMovement} className="space-y-3.5">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
                >
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="m-item">
                  Target Inventory Article *
                </label>
                <select
                  id="m-item"
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
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="m-type">
                    Movement Type Code *
                  </label>
                  <select
                    id="m-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ManualMovementType)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="GOODS_RECEIPT_PO">GOODS_RECEIPT_PO (+)</option>
                    <option value="WASTE_SCRAP">WASTE_SCRAP (-)</option>
                    <option value="PHYSICAL_INVENTORY_ADJ">PHYSICAL_INVENTORY_ADJ (+/-)</option>
                    <option value="TRANSFER">TRANSFER (Warehouse Shift)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="m-qty">
                    Quantity Delta *
                  </label>
                  <input
                    id="m-qty"
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
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="m-cost">
                    Unit Valuation Cost (KES)
                  </label>
                  <input
                    id="m-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formUnitCost}
                    onChange={(e) => setFormUnitCost(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:border-servora-core focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="m-batch">
                    Lot / Batch ID (Optional)
                  </label>
                  <input
                    id="m-batch"
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
                  <label
                    htmlFor="m-location"
                    className="block text-[11px] font-bold text-servora-navy uppercase tracking-wider"
                  >
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
                      id="m-location"
                      value={selectedLocationId}
                      onChange={(e) => handleLocationSelect(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium focus:border-servora-core focus:outline-none"
                    >
                      <option value="">Select facility storage bin...</option>
                      {storageLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.code} — {loc.name}{' '}
                          {loc.isRefrigerated && loc.targetMinTemp && loc.targetMaxTemp
                            ? `(${loc.targetMinTemp}°C to ${loc.targetMaxTemp}°C)`
                            : loc.isRefrigerated
                              ? '(Refrigerated)'
                              : '(Ambient)'}
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
                        aria-label="Custom storage bin code"
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
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="m-doc">
                  Document Reference #
                </label>
                <input
                  id="m-doc"
                  type="text"
                  placeholder="e.g. PO-2026-001 / GRN-998"
                  value={formDocRef}
                  onChange={(e) => setFormDocRef(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:border-servora-core focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="m-notes">
                  Audit Justification Notes
                </label>
                <input
                  id="m-notes"
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