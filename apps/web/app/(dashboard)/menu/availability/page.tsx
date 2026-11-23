// apps/web/app/(dashboard)/menu/availability/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertOctagon,
  CheckCircle2,
  Flame,
  Search,
  RotateCcw,
  Ban,
  Clock,
  X,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Package,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

type StatusFilter = 'ALL' | 'AVAILABLE' | 'LOW_STOCK' | '86ED';

const REASON_PRESETS = [
  'Out of stock in kitchen',
  'Fresh ingredients delivery delayed',
  'Quality check failure',
  'Equipment maintenance issue',
  'Other',
] as const;

interface ItemAvail {
  id: number;
  name: string;
  sku: string | null;
  price: string;
  categoryName: string;
  stockTrackingType: string;
  is86ed: boolean;
  isManually86ed: boolean;
  isInventoryDepleted: boolean;
  reason: string | null;
  remainingCount: number | null;
  inventoryMaxPortions: number | null;
  effectiveRemaining: number | null;
  limitingIngredientName: string | null;
  autoResetAt: string | null;
}

interface Summary {
  total: number;
  available: number;
  outOfStock: number;
  lowStock: number;
  manual86Count: number;
  inventoryDepletedCount: number;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function AvailabilityPage() {
  const [items, setItems] = useState<ItemAvail[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    available: 0,
    outOfStock: 0,
    lowStock: 0,
    manual86Count: 0,
    inventoryDepletedCount: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Loading & Feedback States
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // 86 Modal State
  const [is86ModalOpen, setIs86ModalOpen] = useState(false);
  const [target86Item, setTarget86Item] = useState<ItemAvail | null>(null);
  const [reasonPreset, setReasonPreset] = useState<string>('Out of stock in kitchen');
  const [customReason, setCustomReason] = useState('');
  const [autoResetTomorrow, setAutoResetTomorrow] = useState(true);

  // Portion Limit Modal State
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [targetLimitItem, setTargetLimitItem] = useState<ItemAvail | null>(null);
  const [portionCount, setPortionCount] = useState<string>('5');
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const savedBranchId =
        typeof window !== 'undefined'
          ? Number(localStorage.getItem('servora_active_branch_id')) || undefined
          : undefined;
      const query = savedBranchId ? `?branchId=${savedBranchId}` : '';

      const res = await fetchApi(`/api/v1/menu/availability${query}`);
      if (res?.data && Array.isArray(res.data.items)) {
        setItems(res.data.items);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      } else {
        setItems([]);
        setLoadError('Unexpected response structure received from availability API.');
      }
    } catch (err: unknown) {
      setItems([]);
      setLoadError(getErrorMessage(err, 'Failed to load kitchen availability telemetry.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getActiveBranchId = (): number | undefined => {
    if (typeof window === 'undefined') return undefined;
    const val = Number(localStorage.getItem('servora_active_branch_id'));
    return val > 0 ? val : undefined;
  };

  const handleStockToggleClick = async (item: ItemAvail) => {
    setActionError(null);
    if (item.isManually86ed) {
      setActionLoadingId(item.id);
      try {
        await fetchApi('/api/v1/menu/availability/toggle', {
          method: 'POST',
          body: JSON.stringify({
            menuItemId: item.id,
            branchId: getActiveBranchId(),
            is86ed: false,
            reason: null,
            remainingCount: null,
          }),
        });
        setStatusBanner(`Cleared manual 86 on "${item.name}".`);
        await loadData();
      } catch (err: unknown) {
        setActionError(getErrorMessage(err, 'Failed to restock item.'));
      } finally {
        setActionLoadingId(null);
      }
    } else {
      setTarget86Item(item);
      setReasonPreset('Out of stock in kitchen');
      setCustomReason('');
      setAutoResetTomorrow(true);
      setModalError(null);
      setIs86ModalOpen(true);
    }
  };

  const submit86Confirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target86Item) return;

    const finalReason =
      reasonPreset === 'Other' ? customReason.trim() : reasonPreset;
    if (!finalReason) {
      setModalError('Please enter a reason for taking this item out of stock.');
      return;
    }

    setActionLoadingId(target86Item.id);
    setModalError(null);

    try {
      await fetchApi('/api/v1/menu/availability/toggle', {
        method: 'POST',
        body: JSON.stringify({
          menuItemId: target86Item.id,
          branchId: getActiveBranchId(),
          is86ed: true,
          reason: finalReason,
          remainingCount: 0,
          autoResetTomorrow,
        }),
      });
      const itemName = target86Item.name;
      setIs86ModalOpen(false);
      setTarget86Item(null);
      setStatusBanner(`"${itemName}" has been 86'd across active POS terminals.`);
      await loadData();
    } catch (err: unknown) {
      setModalError(getErrorMessage(err, 'Failed to 86 item.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenLimitModal = (item: ItemAvail) => {
    setTargetLimitItem(item);
    setPortionCount(String(item.remainingCount ?? 5));
    setModalError(null);
    setIsLimitModalOpen(true);
  };

  const submitPortionLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLimitItem) return;

    const parsedCount = parseInt(portionCount, 10);
    if (Number.isNaN(parsedCount) || parsedCount < 0) {
      setModalError('Portion limit must be zero or greater.');
      return;
    }

    setActionLoadingId(targetLimitItem.id);
    setModalError(null);

    const isDepleted = parsedCount <= 0;

    try {
      await fetchApi('/api/v1/menu/availability/toggle', {
        method: 'POST',
        body: JSON.stringify({
          menuItemId: targetLimitItem.id,
          branchId: getActiveBranchId(),
          is86ed: isDepleted,
          remainingCount: isDepleted ? 0 : parsedCount,
          reason: isDepleted ? 'Portion limit exhausted' : null,
        }),
      });
      const itemName = targetLimitItem.name;
      setIsLimitModalOpen(false);
      setTargetLimitItem(null);
      setStatusBanner(
        isDepleted
          ? `"${itemName}" marked out of stock (0 portions).`
          : `Set portion cap of ${parsedCount} on "${itemName}".`
      );
      await loadData();
    } catch (err: unknown) {
      setModalError(getErrorMessage(err, 'Failed to save portion limit.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const clearPortionLimit = async () => {
    if (!targetLimitItem) return;
    setActionLoadingId(targetLimitItem.id);
    setModalError(null);
    try {
      await fetchApi('/api/v1/menu/availability/toggle', {
        method: 'POST',
        body: JSON.stringify({
          menuItemId: targetLimitItem.id,
          branchId: getActiveBranchId(),
          is86ed: false,
          remainingCount: null,
          reason: null,
        }),
      });
      const itemName = targetLimitItem.name;
      setIsLimitModalOpen(false);
      setTargetLimitItem(null);
      setStatusBanner(`Cleared portion countdown cap on "${itemName}".`);
      await loadData();
    } catch (err: unknown) {
      setModalError(getErrorMessage(err, 'Failed to clear portion limit.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBulkRestockAllManual86 = async () => {
    const manually86edIds = items.filter((i) => i.isManually86ed).map((i) => i.id);
    if (manually86edIds.length === 0 || isBulkLoading) return;

    setIsBulkLoading(true);
    setActionError(null);
    try {
      await fetchApi('/api/v1/menu/availability/bulk', {
        method: 'POST',
        body: JSON.stringify({
          menuItemIds: manually86edIds,
          branchId: getActiveBranchId(),
          is86ed: false,
          reason: null,
        }),
      });
      setStatusBanner(`Cleared manual 86 status on ${manually86edIds.length} item(s).`);
      await loadData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to restock 86 items.'));
    } finally {
      setIsBulkLoading(false);
    }
  };

  const categoriesList = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.categoryName).filter(Boolean))).sort(),
    [items]
  );

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.limitingIngredientName &&
          item.limitingIngredientName.toLowerCase().includes(q));
      const matchesCat = categoryFilter === 'ALL' || item.categoryName === categoryFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === '86ED' && item.is86ed) ||
        (statusFilter === 'AVAILABLE' && !item.is86ed) ||
        (statusFilter === 'LOW_STOCK' &&
          !item.is86ed &&
          item.effectiveRemaining !== null &&
          item.effectiveRemaining <= 5);
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [items, searchTerm, categoryFilter, statusFilter]);

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

      {/* Top Banner with Live Database & Inventory Telemetry */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/menu"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core inline-flex items-center gap-1 transition-colors"
            >
              Menu Catalog <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Item Availability &amp; 86 Controls</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">
            Item Availability &amp; Kitchen 86 Controls
          </h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-1">
            Real-time kitchen 86 controls combined with live inventory &amp; recipe BOM stock telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center min-w-[96px]">
            <span className="block text-xs font-bold text-emerald-800">{summary.available} Active</span>
            <span className="text-[10px] text-emerald-600 font-medium uppercase">Sellable</span>
          </div>
          {summary.lowStock > 0 && (
            <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-center min-w-[96px]">
              <span className="block text-xs font-bold text-amber-800">{summary.lowStock} Low</span>
              <span className="text-[10px] text-amber-600 font-medium uppercase">5 or Fewer</span>
            </div>
          )}
          <div className="px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-xl text-center min-w-[110px]">
            <span className="block text-xs font-bold text-rose-800">
              {summary.outOfStock} Out of Stock
            </span>
            <span className="text-[10px] text-rose-600 font-medium uppercase">
              {summary.manual86Count} 86&apos;d &bull; {summary.inventoryDepletedCount} Inv
            </span>
          </div>

          {summary.manual86Count > 0 && (
            <button
              type="button"
              onClick={handleBulkRestockAllManual86}
              disabled={isBulkLoading}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw size={13} />
              {isBulkLoading ? 'Restocking...' : `Restock All 86'd (${summary.manual86Count})`}
            </button>
          )}

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 text-servora-deepTeal bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 disabled:opacity-50 cursor-pointer"
            title="Refresh live availability"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[190px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              aria-label="Search dishes, SKUs, or limiting ingredients"
              placeholder="Search dishes, SKU, or limiting ingredient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white font-medium text-servora-navy"
          >
            <option value="ALL">All Categories</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {(
            [
              { id: 'ALL', label: `All (${summary.total})` },
              { id: 'AVAILABLE', label: `Available (${summary.available})` },
              { id: 'LOW_STOCK', label: `Low (${summary.lowStock})` },
              { id: '86ED', label: `Out of Stock (${summary.outOfStock})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white shadow-xs text-servora-navy font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Availability Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse bg-white rounded-2xl border border-gray-100">
          Syncing kitchen &amp; inventory availability telemetry...
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className="p-12 text-center bg-white rounded-2xl border border-gray-100 space-y-3"
        >
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
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center text-xs text-servora-deepTeal bg-white rounded-2xl border border-gray-100">
          No items match your selected filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                item.is86ed
                  ? 'bg-rose-50/40 border-rose-200'
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-servora-deepTeal bg-gray-100 px-2 py-0.5 rounded-md truncate">
                    {item.categoryName}
                  </span>

                  {item.isManually86ed ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 shrink-0">
                      <AlertOctagon size={11} />
                      86&apos;ED
                    </span>
                  ) : item.isInventoryDepleted ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 shrink-0">
                      <Package size={11} />
                      NO STOCK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 shrink-0">
                      <CheckCircle2 size={11} />
                      AVAILABLE
                    </span>
                  )}
                </div>

                <h3
                  className={`text-sm font-bold mt-1 ${
                    item.is86ed ? 'text-gray-500 line-through' : 'text-servora-navy'
                  }`}
                >
                  {item.name}
                </h3>
                <p className="text-xs font-mono font-semibold text-servora-core mt-1">
                  KES {parseFloat(item.price).toLocaleString()}
                </p>

                {/* Manual 86 Reason */}
                {item.isManually86ed && item.reason && (
                  <div className="mt-2.5 p-2 bg-rose-100/70 border border-rose-200 rounded-xl text-[11px] text-rose-800">
                    <strong>86 Reason:</strong> {item.reason}
                  </div>
                )}

                {/* Inventory / BOM Stock Depletion Notice */}
                {item.isInventoryDepleted && (
                  <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                    <div className="flex items-center gap-1 font-bold">
                      <Package size={11} className="shrink-0" />
                      <span>
                        Depleted in Inventory
                        {item.limitingIngredientName ? `: ${item.limitingIngredientName}` : ''}
                      </span>
                    </div>
                    <Link
                      href="/inventory"
                      className="inline-block text-[10px] font-bold text-servora-core hover:underline"
                    >
                      Restock raw material in Inventory &rarr;
                    </Link>
                  </div>
                )}

                {/* Live Effective Portion Telemetry */}
                {!item.is86ed && item.effectiveRemaining !== null && (
                  <div
                    className={`mt-2.5 flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border ${
                      item.effectiveRemaining <= 5
                        ? 'text-amber-800 bg-amber-50 border-amber-200'
                        : 'text-emerald-800 bg-emerald-50/60 border-emerald-100'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Flame size={12} />
                      {item.effectiveRemaining} portion{item.effectiveRemaining === 1 ? '' : 's'} left
                    </span>
                    {item.remainingCount !== null && (
                      <span className="text-[10px] font-mono opacity-80">Cap: {item.remainingCount}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenLimitModal(item)}
                  className="px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 hover:text-servora-navy hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Clock size={12} />
                  Portion Cap
                </button>

                <button
                  type="button"
                  disabled={actionLoadingId === item.id}
                  onClick={() => handleStockToggleClick(item)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    item.isManually86ed
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  {item.isManually86ed ? (
                    <>
                      <RotateCcw size={13} />
                      Clear 86
                    </>
                  ) : (
                    <>
                      <Ban size={13} />
                      86 Item
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 86 CONFIRMATION MODAL */}
      {is86ModalOpen && target86Item && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-86-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Ban size={18} />
                </div>
                <div>
                  <h2 id="modal-86-title" className="text-sm font-bold text-servora-navy">
                    86 (Take Out of Stock)
                  </h2>
                  <p className="text-[11px] text-servora-deepTeal">{target86Item.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIs86ModalOpen(false)}
                aria-label="Close modal"
                className="text-gray-400 hover:text-servora-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit86Confirmation} className="p-5 space-y-4">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-semibold"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1.5" htmlFor="reason-select">
                  Reason for 86&apos;ing (Broadcast to Waiters &amp; POS) *
                </label>
                <select
                  id="reason-select"
                  value={reasonPreset}
                  onChange={(e) => setReasonPreset(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white mb-2"
                >
                  {REASON_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset === 'Other' ? 'Other (Custom explanation)' : preset}
                    </option>
                  ))}
                </select>

                {reasonPreset === 'Other' && (
                  <input
                    type="text"
                    required
                    placeholder="Provide specific reason for waitstaff..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                )}
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer text-xs text-servora-navy font-medium">
                <input
                  type="checkbox"
                  checked={autoResetTomorrow}
                  onChange={(e) => setAutoResetTomorrow(e.target.checked)}
                  className="rounded text-servora-core w-4 h-4 border-gray-300"
                />
                <span>Automatically clear 86 at 06:00 tomorrow morning</span>
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIs86ModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === target86Item.id}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  {actionLoadingId === target86Item.id ? 'Broadcasting...' : 'Confirm 86'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PORTION LIMIT MODAL */}
      {isLimitModalOpen && targetLimitItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-limit-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <h2 id="modal-limit-title" className="text-sm font-bold text-servora-navy">
                    Set Portion Countdown Cap
                  </h2>
                  <p className="text-[11px] text-servora-deepTeal">{targetLimitItem.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLimitModalOpen(false)}
                aria-label="Close modal"
                className="text-gray-400 hover:text-servora-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitPortionLimit} className="p-5 space-y-4">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-semibold"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="portion-cap-input">
                  Remaining Prepared Portions
                </label>
                <input
                  id="portion-cap-input"
                  type="number"
                  min="0"
                  max="500"
                  required
                  value={portionCount}
                  onChange={(e) => setPortionCount(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                />
                <p className="text-[11px] text-servora-deepTeal mt-1">
                  POS decrements this cap automatically on every sale and 86&apos;s the item when it reaches 0.
                  {targetLimitItem.inventoryMaxPortions !== null && (
                    <span className="block mt-0.5 font-semibold text-servora-navy">
                      Current raw-material stock capacity: {targetLimitItem.inventoryMaxPortions} portion(s).
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                {targetLimitItem.remainingCount !== null ? (
                  <button
                    type="button"
                    onClick={clearPortionLimit}
                    disabled={actionLoadingId === targetLimitItem.id}
                    className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear Cap
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLimitModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingId === targetLimitItem.id}
                    className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
                  >
                    {actionLoadingId === targetLimitItem.id ? 'Saving...' : 'Save Cap'}
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