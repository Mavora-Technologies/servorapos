'use client';

import { useEffect, useState } from 'react';
import { 
  AlertOctagon, 
  CheckCircle2, 
  Flame, 
  Search, 
  RotateCcw, 
  Ban, 
  Clock, 
  X,
  AlertCircle 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ItemAvail {
  id: number;
  name: string;
  price: string;
  categoryName?: string;
  is86ed: boolean;
  reason?: string | null;
  remainingCount?: number | null;
  autoResetAt?: string | null;
}

interface Summary {
  total: number;
  available: number;
  outOfStock: number;
  lowStock: number;
}

export default function AvailabilityPage() {
  const [items, setItems] = useState<ItemAvail[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, available: 0, outOfStock: 0, lowStock: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | '86ED' | 'AVAILABLE'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Modals
  const [is86ModalOpen, setIs86ModalOpen] = useState(false);
  const [target86Item, setTarget86Item] = useState<ItemAvail | null>(null);
  const [reason, setReason] = useState('Out of stock in kitchen');
  const [autoResetTomorrow, setAutoResetTomorrow] = useState(true);

  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [targetLimitItem, setTargetLimitItem] = useState<ItemAvail | null>(null);
  const [portionCount, setPortionCount] = useState<number>(5);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi('/api/v1/menu/availability');
      if (res?.data) {
        setItems(res.data.items || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load menu availability:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStockToggleClick = async (item: ItemAvail) => {
    if (item.is86ed) {
      // Restock back to available
      setActionLoadingId(item.id);
      try {
        await fetchApi('/api/v1/menu/availability/toggle', {
          method: 'POST',
          body: JSON.stringify({
            menuItemId: item.id,
            is86ed: false,
            reason: null,
            remainingCount: null,
          }),
        });
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to restock item');
      } finally {
        setActionLoadingId(null);
      }
    } else {
      // Open 86 modal
      setTarget86Item(item);
      setReason('Out of stock in kitchen');
      setAutoResetTomorrow(true);
      setModalError(null);
      setIs86ModalOpen(true);
    }
  };

  const submit86Confirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target86Item) return;

    setActionLoadingId(target86Item.id);
    setModalError(null);

    try {
      await fetchApi('/api/v1/menu/availability/toggle', {
        method: 'POST',
        body: JSON.stringify({
          menuItemId: target86Item.id,
          is86ed: true,
          reason,
          autoResetTomorrow,
        }),
      });
      setIs86ModalOpen(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to update item');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenLimitModal = (item: ItemAvail) => {
    setTargetLimitItem(item);
    setPortionCount(item.remainingCount ?? 5);
    setModalError(null);
    setIsLimitModalOpen(true);
  };

  const submitPortionLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLimitItem) return;

    setActionLoadingId(targetLimitItem.id);
    setModalError(null);

    const isDepleted = portionCount <= 0;

    try {
      await fetchApi('/api/v1/menu/availability/toggle', {
        method: 'POST',
        body: JSON.stringify({
          menuItemId: targetLimitItem.id,
          is86ed: isDepleted,
          remainingCount: isDepleted ? null : portionCount,
          reason: isDepleted ? 'Portion limit exhausted' : null,
        }),
      });
      setIsLimitModalOpen(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save portion limit');
    } finally {
      setActionLoadingId(null);
    }
  };

  const clearPortionLimit = async () => {
    if (!targetLimitItem) return;
    setActionLoadingId(targetLimitItem.id);
    try {
      await fetchApi('/api/v1/menu/availability/toggle', {
        method: 'POST',
        body: JSON.stringify({
          menuItemId: targetLimitItem.id,
          is86ed: false,
          remainingCount: null,
          reason: null,
        }),
      });
      setIsLimitModalOpen(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to clear limit');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || item.categoryName === categoryFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === '86ED' && item.is86ed) ||
      (statusFilter === 'AVAILABLE' && !item.is86ed);
    return matchesSearch && matchesCat && matchesStatus;
  });

  const categoriesList = Array.from(
    new Set(items.map((i) => i.categoryName).filter(Boolean))
  ) as string[];

  return (
    <div className="space-y-6">
      {/* Top Banner with Real Database-driven Telemetry */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-servora-navy">Item Availability & Kitchen 86 Controls</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-1">
            Real-time kitchen stock management. Changes synchronize across all live waitstaff POS screens.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center min-w-[110px]">
            <span className="block text-xs font-bold text-emerald-800">{summary.available} Active</span>
            <span className="text-[10px] text-emerald-600 font-medium uppercase tracking-wider">Ready to Order</span>
          </div>
          {summary.lowStock > 0 && (
            <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-center min-w-[110px]">
              <span className="block text-xs font-bold text-amber-800">{summary.lowStock} Low Stock</span>
              <span className="text-[10px] text-amber-600 font-medium uppercase tracking-wider">Portion Watch</span>
            </div>
          )}
          <div className="px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl text-center min-w-[110px]">
            <span className="block text-xs font-bold text-rose-800">{summary.outOfStock} Out of Stock</span>
            <span className="text-[10px] text-rose-600 font-medium uppercase tracking-wider">86'ed Items</span>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search dishes, drinks, or ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white font-medium text-servora-navy"
          >
            <option value="ALL">All Categories</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'ALL' ? 'bg-white shadow-xs text-servora-navy' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All Items ({summary.total})
          </button>
          <button
            onClick={() => setStatusFilter('AVAILABLE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'AVAILABLE' ? 'bg-white shadow-xs text-emerald-700' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Available Only ({summary.available})
          </button>
          <button
            onClick={() => setStatusFilter('86ED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === '86ED' ? 'bg-white shadow-xs text-rose-700' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Out of Stock ({summary.outOfStock})
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse bg-white rounded-2xl border border-gray-100">
          Syncing kitchen item availability telemetry...
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-servora-deepTeal bg-gray-100 px-2 py-0.5 rounded-md">
                    {item.categoryName || 'General'}
                  </span>

                  {item.is86ed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-md border border-rose-200">
                      <AlertOctagon size={12} />
                      86'ED (OUT OF STOCK)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                      <CheckCircle2 size={12} />
                      AVAILABLE
                    </span>
                  )}
                </div>

                <h3 className={`text-sm font-bold mt-1 ${item.is86ed ? 'text-gray-500 line-through' : 'text-servora-navy'}`}>
                  {item.name}
                </h3>
                <p className="text-xs font-semibold text-servora-core mt-1">
                  KES {Number(item.price).toLocaleString()}
                </p>

                {item.is86ed && item.reason && (
                  <div className="mt-2.5 p-2 bg-rose-100/70 border border-rose-200 rounded-xl text-[11px] text-rose-800">
                    <strong>86 Reason:</strong> {item.reason}
                  </div>
                )}

                {item.remainingCount !== null && item.remainingCount !== undefined && !item.is86ed && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-semibold">
                    <Flame size={13} />
                    Only {item.remainingCount} portions remaining
                  </div>
                )}
              </div>

              {/* Dynamic Action Buttons */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenLimitModal(item)}
                  className="px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 hover:text-servora-navy hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Clock size={12} />
                  Portion Limit
                </button>

                <button
                  type="button"
                  disabled={actionLoadingId === item.id}
                  onClick={() => handleStockToggleClick(item)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 ${
                    item.is86ed
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  {item.is86ed ? (
                    <>
                      <RotateCcw size={13} />
                      Restock Item
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Ban size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-servora-navy">86 (Take Out of Stock)</h2>
                  <p className="text-[11px] text-servora-deepTeal">{target86Item.name}</p>
                </div>
              </div>
              <button onClick={() => setIs86ModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit86Confirmation} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1.5">
                  Reason for 86ing (Broadcast to Waiters & POS) *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white mb-2"
                >
                  <option value="Out of stock in kitchen">Out of stock in kitchen</option>
                  <option value="Fresh ingredients delivery delayed">Fresh ingredients delivery delayed</option>
                  <option value="Quality check failure">Quality check failure</option>
                  <option value="Equipment maintenance issue">Equipment maintenance issue</option>
                  <option value="Other">Other (Custom explanation)</option>
                </select>

                {reason === 'Other' && (
                  <input
                    type="text"
                    required
                    placeholder="Provide specific reason for waitstaff"
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoReset"
                  checked={autoResetTomorrow}
                  onChange={(e) => setAutoResetTomorrow(e.target.checked)}
                  className="rounded text-servora-core focus:ring-0 w-4 h-4 border-gray-300"
                />
                <label htmlFor="autoReset" className="text-xs text-servora-navy font-medium cursor-pointer">
                  Automatically restock at next service opening shift (tomorrow)
                </label>
              </div>

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
                  className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-servora-navy">Set Portion Countdown Limit</h2>
                  <p className="text-[11px] text-servora-deepTeal">{targetLimitItem.name}</p>
                </div>
              </div>
              <button onClick={() => setIsLimitModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitPortionLimit} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">
                  Remaining Prepared Portions
                </label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  required
                  value={portionCount}
                  onChange={(e) => setPortionCount(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                />
                <p className="text-[11px] text-servora-deepTeal mt-1">
                  When this count reaches 0 during live ordering, the POS automatically 86s the item.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                {targetLimitItem.remainingCount !== null && targetLimitItem.remainingCount !== undefined ? (
                  <button
                    type="button"
                    onClick={clearPortionLimit}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Clear Limit
                  </button>
                ) : <span />}

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
                    className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    {actionLoadingId === targetLimitItem.id ? 'Saving...' : 'Save Limit'}
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