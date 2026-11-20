// apps/web/app/(dashboard)/inventory/counts/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Clock,
  ChevronRight,
  Save,
  FileCheck,
  Eye,
  EyeOff,
  AlertOctagon,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

type CountStatus = 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'RECONCILED' | 'CANCELLED';
type CountType = 'FULL' | 'CYCLE' | 'SPOT_CHECK';
type SheetFilter = 'ALL' | 'UNCOUNTED' | 'DISCREPANCIES' | 'RECOUNTS';

interface StockCountHeader {
  id: number;
  countNumber: string;
  status: CountStatus;
  countType: CountType;
  category: string | null;
  isBlindCount: boolean;
  totalItemsCount: number;
  discrepancyItemsCount: number;
  netVarianceCost: string;
  notes: string | null;
  reconciledAt: string | null;
  createdAt: string;
  conductorEmail: string | null;
}

interface StockCountItemLine {
  id: number;
  inventoryItemId: number;
  itemName: string;
  itemSku: string | null;
  itemUnit: string;
  itemCategory: string;
  expectedQuantity: string;
  countedQuantity: string | null;
  varianceQuantity: string | null;
  varianceCost: string | null;
  unitCost: string;
  recountRequired: boolean;
  notes: string | null;
}

interface DetailedStockCount extends StockCountHeader {
  items: StockCountItemLine[];
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function StockCountsPage() {
  const [counts, setCounts] = useState<StockCountHeader[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [activeCount, setActiveCount] = useState<DetailedStockCount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);

  // Page & Action Feedback
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Blind Count visibility override (for Managers)
  const [revealExpected, setRevealExpected] = useState(false);

  // Filter within Sheet
  const [sheetFilter, setSheetFilter] = useState<SheetFilter>('ALL');

  // New Audit Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newCountType, setNewCountType] = useState<CountType>('FULL');
  const [newCategory, setNewCategory] = useState('');
  const [newIsBlind, setNewIsBlind] = useState(true);
  const [newNotes, setNewNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newModalError, setNewModalError] = useState<string | null>(null);

  // Reconcile Confirmation Modal State
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);

  // Line inputs buffer: lineId -> countedQuantity string
  const [lineBuffer, setLineBuffer] = useState<Record<number, string>>({});
  const [savingLineId, setSavingLineId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadCounts = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const [countsResult, itemsResult] = await Promise.allSettled([
      fetchApi('/api/v1/inventory/counts'),
      fetchApi('/api/v1/inventory/items'),
    ]);

    if (countsResult.status === 'fulfilled') {
      const rawCounts = countsResult.value?.data;
      if (Array.isArray(rawCounts)) {
        setCounts(rawCounts);
      } else {
        setCounts([]);
        setLoadError('Unexpected response structure received from stock counts API.');
      }
    } else {
      setCounts([]);
      setLoadError(getErrorMessage(countsResult.reason, 'Failed to load stocktake history.'));
    }

    if (itemsResult.status === 'fulfilled') {
      const payload = itemsResult.value?.data;
      const rawItems = Array.isArray(payload) ? payload : payload?.items;
      if (Array.isArray(rawItems)) {
        const cats = Array.from(
          new Set(
            rawItems
              .filter((it: { isActive?: boolean; category?: string }) => it.isActive !== false && it.category)
              .map((it: { category: string }) => it.category)
          )
        ).sort();
        setAvailableCategories(cats);
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const openCountAudit = async (countId: number) => {
    setIsLoadingSheet(true);
    setActionError(null);
    setRevealExpected(false);
    setSheetFilter('ALL');
    setSearchTerm('');

    try {
      const res = await fetchApi(`/api/v1/inventory/counts/${countId}`);
      if (res?.data && Array.isArray(res.data.items)) {
        setActiveCount(res.data);
        const buffer: Record<number, string> = {};
        res.data.items.forEach((item: StockCountItemLine) => {
          if (item.countedQuantity !== null) {
            buffer[item.id] = item.countedQuantity;
          }
        });
        setLineBuffer(buffer);
        setIsAuditing(true);
      } else {
        setActionError('Audit sheet payload was incomplete.');
      }
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to load stock count sheet.'));
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const openNewModal = () => {
    setNewModalError(null);
    setNewCountType('FULL');
    setNewCategory('');
    setNewIsBlind(true);
    setNewNotes('');
    setIsNewModalOpen(true);
  };

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    setNewModalError(null);

    if (newCountType === 'CYCLE' && !newCategory) {
      setNewModalError('Please select a target department category for a Cycle Count.');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetchApi('/api/v1/inventory/counts/initiate', {
        method: 'POST',
        body: JSON.stringify({
          countType: newCountType,
          category: newCountType === 'CYCLE' ? newCategory : undefined,
          isBlindCount: newIsBlind,
          notes: newNotes.trim() || undefined,
        }),
      });

      setIsNewModalOpen(false);
      setNewNotes('');
      await loadCounts();
      if (res?.data?.id) {
        await openCountAudit(res.data.id);
      }
    } catch (err: unknown) {
      setNewModalError(getErrorMessage(err, 'Failed to initiate stock count session.'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveLine = async (line: StockCountItemLine) => {
    const rawVal = lineBuffer[line.id];
    if (rawVal === undefined || rawVal.trim() === '') return;

    const parsed = parseFloat(rawVal);
    if (Number.isNaN(parsed) || parsed < 0) {
      setActionError(`Physical count for ${line.itemName} must be zero or greater.`);
      return;
    }

    setActionError(null);
    setSavingLineId(line.id);
    try {
      const res = await fetchApi(`/api/v1/inventory/counts/items/${line.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          countedQuantity: parsed,
        }),
      });

      if (res?.data && activeCount) {
        setActiveCount({
          ...activeCount,
          items: activeCount.items.map((i) => (i.id === line.id ? { ...i, ...res.data } : i)),
        });
      }
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, `Failed to save count for ${line.itemName}.`));
    } finally {
      setSavingLineId(null);
    }
  };

  const requestReconciliation = () => {
    if (!activeCount) return;
    setActionError(null);

    const uncounted = activeCount.items.filter((i) => i.countedQuantity === null).length;
    if (uncounted > 0) {
      setActionError(
        `Cannot reconcile yet: ${uncounted} item(s) still require a saved physical count.`
      );
      return;
    }

    setReconcileNotes(activeCount.notes || 'Physical floor audit reconciled');
    setIsReconcileModalOpen(true);
  };

  const handleConfirmReconcile = async () => {
    if (!activeCount || isReconciling) return;
    setIsReconciling(true);
    setActionError(null);

    try {
      await fetchApi(`/api/v1/inventory/counts/${activeCount.id}/reconcile`, {
        method: 'POST',
        body: JSON.stringify({
          notes: reconcileNotes.trim() || undefined,
        }),
      });

      const reconciledNumber = activeCount.countNumber;
      setIsReconcileModalOpen(false);
      setIsAuditing(false);
      setActiveCount(null);
      setStatusBanner(
        `Stocktake ${reconciledNumber} reconciled and variances posted to the material ledger.`
      );
      await loadCounts();
    } catch (err: unknown) {
      setIsReconcileModalOpen(false);
      setActionError(getErrorMessage(err, 'Failed to reconcile stock count.'));
    } finally {
      setIsReconciling(false);
    }
  };

  // Variance Telemetry of Active Audit
  const activeTelemetry = useMemo(() => {
    if (!activeCount) return null;
    let netVarianceCost = 0;
    let countedItems = 0;
    let discrepancyCount = 0;
    let recountCount = 0;

    activeCount.items.forEach((item) => {
      if (item.countedQuantity !== null) {
        countedItems++;
        const cost = parseFloat(item.varianceCost || '0') || 0;
        netVarianceCost += cost;
        if (parseFloat(item.varianceQuantity || '0') !== 0) {
          discrepancyCount++;
        }
        if (item.recountRequired) {
          recountCount++;
        }
      }
    });

    const total = activeCount.items.length;
    const progressPct = total > 0 ? Math.round((countedItems / total) * 100) : 0;

    return {
      total,
      countedItems,
      progressPct,
      discrepancyCount,
      recountCount,
      netVarianceCost,
    };
  }, [activeCount]);

  const filteredLines = useMemo(() => {
    if (!activeCount) return [];
    const query = searchTerm.trim().toLowerCase();
    return activeCount.items.filter((i) => {
      const matchesSearch =
        !query ||
        i.itemName.toLowerCase().includes(query) ||
        (i.itemSku && i.itemSku.toLowerCase().includes(query));

      let matchesFilter = true;
      if (sheetFilter === 'UNCOUNTED') matchesFilter = i.countedQuantity === null;
      else if (sheetFilter === 'DISCREPANCIES')
        matchesFilter = i.countedQuantity !== null && parseFloat(i.varianceQuantity || '0') !== 0;
      else if (sheetFilter === 'RECOUNTS') matchesFilter = i.recountRequired;

      return matchesSearch && matchesFilter;
    });
  }, [activeCount, searchTerm, sheetFilter]);

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

      {/* View 1: Active Audit Floor Sheet */}
      {isAuditing && activeCount ? (
        <div className="space-y-6">
          {/* Top Audit Sheet Header */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <button
                type="button"
                onClick={() => {
                  setIsAuditing(false);
                  setActiveCount(null);
                  setActionError(null);
                }}
                className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 mb-1 transition-colors"
              >
                &larr; Back to Physical Audits
              </button>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-servora-navy">
                  Physical Inventory Audit: {activeCount.countNumber}
                </h1>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    activeCount.status === 'RECONCILED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-blue-50 text-servora-core border border-blue-200'
                  }`}
                >
                  {activeCount.status}
                </span>
                {activeCount.isBlindCount && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                    <Lock size={10} /> Blind Counting Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-servora-deepTeal mt-0.5">
                Scope:{' '}
                <strong>
                  {activeCount.countType}{' '}
                  {activeCount.category ? `(${activeCount.category})` : ''}
                </strong>{' '}
                | Opened: {new Date(activeCount.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeCount.isBlindCount && activeCount.status !== 'RECONCILED' && (
                <button
                  type="button"
                  onClick={() => setRevealExpected(!revealExpected)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  {revealExpected ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{revealExpected ? 'Hide Expected Book Qty' : 'Manager Reveal'}</span>
                </button>
              )}

              {activeCount.status !== 'RECONCILED' && activeCount.status !== 'CANCELLED' && (
                <button
                  type="button"
                  onClick={requestReconciliation}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <FileCheck size={16} /> Reconcile &amp; Balance Material Ledger
                </button>
              )}
            </div>
          </div>

          {/* Telemetry Header */}
          {activeTelemetry && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                  Count Progress
                </span>
                <p className="text-lg font-bold text-servora-navy mt-1">
                  {activeTelemetry.countedItems} / {activeTelemetry.total}
                </p>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-servora-core h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${activeTelemetry.progressPct}%` }}
                  />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                  Variances Detected
                </span>
                <p className="text-lg font-bold text-amber-700 mt-1">
                  {activeTelemetry.discrepancyCount} SKUs
                </p>
                <span className="text-[11px] text-amber-600 font-medium">
                  Book vs. physical delta
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                  High-Tolerance Recounts
                </span>
                <p className="text-lg font-bold text-rose-700 mt-1">
                  {activeTelemetry.recountCount} Items
                </p>
                <span className="text-[11px] text-rose-600 font-medium">
                  &gt;15% or &gt;KES 1,500 gap
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                  Net P&amp;L Discrepancy Impact
                </span>
                <p
                  className={`text-lg font-bold mt-1 ${
                    activeTelemetry.netVarianceCost < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  KES{' '}
                  {activeTelemetry.netVarianceCost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <span className="text-[11px] text-gray-500 font-medium">
                  To be adjusted in ledger
                </span>
              </div>
            </div>
          )}

          {/* Line Items Sheet */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <input
                  type="text"
                  aria-label="Filter audit items by SKU or title"
                  placeholder="Filter items by SKU or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
                {(
                  [
                    { id: 'ALL', label: `All (${activeCount.items.length})` },
                    { id: 'UNCOUNTED', label: 'Uncounted' },
                    { id: 'DISCREPANCIES', label: 'Variances' },
                    { id: 'RECOUNTS', label: 'Flagged Recounts' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSheetFilter(tab.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      sheetFilter === tab.id
                        ? 'bg-white shadow-xs text-servora-navy font-bold'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                    <th scope="col" className="py-3.5 px-4">Item SKU &amp; Name</th>
                    <th scope="col" className="py-3.5 px-4">Category</th>
                    <th scope="col" className="py-3.5 px-4 text-right">System Expected (Book)</th>
                    <th scope="col" className="py-3.5 px-4 text-center">Physical Floor Count</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Variance Qty</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Cost Variance (KES)</th>
                    <th scope="col" className="py-3.5 px-4">Audit Status</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-servora-navy">
                  {filteredLines.map((line) => {
                    const varianceNum = parseFloat(line.varianceQuantity || '0');
                    const hasDiscrepancy = line.countedQuantity !== null && varianceNum !== 0;

                    return (
                      <tr
                        key={line.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          line.recountRequired ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-servora-navy block">{line.itemName}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {line.itemSku || 'NO-SKU'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold uppercase text-servora-deepTeal bg-gray-100 px-2 py-0.5 rounded-md">
                            {line.itemCategory}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-medium text-gray-600">
                          {activeCount.isBlindCount &&
                          !revealExpected &&
                          activeCount.status !== 'RECONCILED' ? (
                            <span className="text-gray-400 italic flex items-center justify-end gap-1">
                              <Lock size={11} /> Locked
                            </span>
                          ) : (
                            <span>
                              {parseFloat(line.expectedQuantity).toLocaleString()} {line.itemUnit}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {activeCount.status === 'RECONCILED' ||
                          activeCount.status === 'CANCELLED' ? (
                            <span className="font-bold font-mono text-servora-navy">
                              {line.countedQuantity
                                ? `${parseFloat(line.countedQuantity).toLocaleString()} ${line.itemUnit}`
                                : '-'}
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 w-32">
                              <input
                                type="number"
                                min="0"
                                step="0.001"
                                aria-label={`Physical count for ${line.itemName}`}
                                placeholder="Raw Count"
                                value={lineBuffer[line.id] ?? ''}
                                onChange={(e) =>
                                  setLineBuffer({ ...lineBuffer, [line.id]: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveLine(line);
                                  }
                                }}
                                className="w-full px-2.5 py-1.5 text-xs text-center font-bold border border-gray-300 rounded-lg focus:border-servora-core focus:outline-none bg-white shadow-2xs font-mono"
                              />
                              <span className="text-[11px] text-gray-400">{line.itemUnit}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {line.countedQuantity === null ? (
                            <span className="text-gray-300">-</span>
                          ) : (
                            <span
                              className={
                                varianceNum < 0
                                  ? 'text-rose-600'
                                  : varianceNum > 0
                                    ? 'text-emerald-700'
                                    : 'text-gray-400'
                              }
                            >
                              {varianceNum > 0
                                ? `+${varianceNum.toLocaleString()}`
                                : varianceNum.toLocaleString()}{' '}
                              {line.itemUnit}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {line.countedQuantity === null ? (
                            <span className="text-gray-300">-</span>
                          ) : (
                            <span
                              className={
                                varianceNum < 0
                                  ? 'text-rose-600'
                                  : varianceNum > 0
                                    ? 'text-emerald-700'
                                    : 'text-gray-400'
                              }
                            >
                              KES {parseFloat(line.varianceCost || '0').toFixed(2)}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {line.recountRequired ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300">
                              <AlertOctagon size={11} /> Recount Required
                            </span>
                          ) : line.countedQuantity === null ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400">
                              <Clock size={11} /> Uncounted
                            </span>
                          ) : hasDiscrepancy ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <AlertTriangle size={11} /> Variance Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              <CheckCircle2 size={11} /> Exact Match
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {activeCount.status !== 'RECONCILED' &&
                            activeCount.status !== 'CANCELLED' && (
                              <button
                                type="button"
                                onClick={() => handleSaveLine(line)}
                                disabled={
                                  savingLineId === line.id ||
                                  lineBuffer[line.id] === undefined ||
                                  lineBuffer[line.id] === ''
                                }
                                className="px-3 py-1.5 bg-servora-core text-white font-semibold rounded-lg text-xs hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <Save size={12} />
                                {savingLineId === line.id ? 'Saving...' : 'Save'}
                              </button>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* View 2: Stock Take Header History Table */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/inventory"
                  className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
                >
                  Inventory Ledger <ChevronRight size={12} />
                </Link>
                <span className="text-xs font-bold text-servora-navy">
                  Stock Audit &amp; Count Cycles
                </span>
              </div>
              <h1 className="text-xl font-bold text-servora-navy">
                Physical Stocktake &amp; Reconciliation
              </h1>
              <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
                Snapshot live kitchen balances, run blind physical counts, detect cost variances, and balance material ledgers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadCounts}
                disabled={isLoading}
                className="px-3 py-2 text-xs font-semibold text-servora-deepTeal bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                type="button"
                onClick={openNewModal}
                className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={15} /> Start New Stock Take
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            {isLoading || isLoadingSheet ? (
              <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
                {isLoadingSheet ? 'Opening audit floor sheet...' : 'Loading stocktake audit history...'}
              </div>
            ) : loadError ? (
              <div role="alert" className="p-12 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-50 text-rose-600">
                  <AlertTriangle size={20} />
                </div>
                <p className="text-xs font-bold text-rose-800">{loadError}</p>
                <button
                  type="button"
                  onClick={loadCounts}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
                >
                  Retry Request
                </button>
              </div>
            ) : counts.length === 0 ? (
              <div className="p-12 text-center text-xs text-servora-deepTeal">
                No stock take sessions recorded yet. Click &quot;Start New Stock Take&quot; to initiate an audit.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                      <th scope="col" className="py-3.5 px-4">Audit Session #</th>
                      <th scope="col" className="py-3.5 px-4">Audit Scope &amp; Mode</th>
                      <th scope="col" className="py-3.5 px-4">Status</th>
                      <th scope="col" className="py-3.5 px-4">Created Date</th>
                      <th scope="col" className="py-3.5 px-4">Auditor</th>
                      <th scope="col" className="py-3.5 px-4 text-right">Net Financial Variance</th>
                      <th scope="col" className="py-3.5 px-4">Reconciled At</th>
                      <th scope="col" className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-servora-navy">
                    {counts.map((count) => {
                      const netVal = parseFloat(count.netVarianceCost || '0');

                      return (
                        <tr key={count.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-servora-navy font-mono">
                            {count.countNumber}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-gray-800 block">
                              {count.countType} {count.category ? `(${count.category})` : ''}
                            </span>
                            {count.isBlindCount && (
                              <span className="text-[10px] text-purple-700 font-mono">
                                Blind Counting
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                count.status === 'RECONCILED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-blue-50 text-servora-core border border-blue-200'
                              }`}
                            >
                              {count.status === 'RECONCILED' ? (
                                <CheckCircle2 size={11} />
                              ) : (
                                <Clock size={11} />
                              )}
                              {count.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                            {new Date(count.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4 text-servora-deepTeal">
                            {count.conductorEmail || 'Unassigned'}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold">
                            {count.status === 'RECONCILED' ? (
                              <span
                                className={
                                  netVal < 0
                                    ? 'text-rose-600'
                                    : netVal > 0
                                      ? 'text-emerald-700'
                                      : 'text-gray-500'
                                }
                              >
                                KES {netVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-normal">Pending</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                            {count.reconciledAt
                              ? new Date(count.reconciledAt).toLocaleDateString()
                              : '-'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => openCountAudit(count.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-servora-pale text-servora-core rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors"
                            >
                              {count.status === 'RECONCILED' ? 'View Sheet' : 'Audit Sheet'} &rarr;
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
        </div>
      )}

      {/* NEW STOCK TAKE MODAL */}
      {isNewModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="initiate-count-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 id="initiate-count-title" className="text-sm font-bold text-servora-navy">
                  Initiate Stock Take Audit
                </h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Snapshots live system balances for physical verification
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                aria-label="Close modal"
                className="text-gray-400 hover:text-servora-navy"
              >
                <X size={18} />
              </button>
            </div>

            {newModalError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
              >
                {newModalError}
              </div>
            )}

            <form onSubmit={handleInitiate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="sc-type">
                  Audit Type *
                </label>
                <select
                  id="sc-type"
                  value={newCountType}
                  onChange={(e) => setNewCountType(e.target.value as CountType)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                >
                  <option value="FULL">Full Inventory Audit (All active catalog SKUs)</option>
                  <option value="CYCLE">Category Cycle Count (Targeted section)</option>
                  <option value="SPOT_CHECK">Spot Check Audit</option>
                </select>
              </div>

              {newCountType === 'CYCLE' && (
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="sc-cat">
                    Target Department Category *
                  </label>
                  <select
                    id="sc-cat"
                    required
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="">
                      {availableCategories.length === 0
                        ? 'No active categories in catalog'
                        : 'Select Category...'}
                    </option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-purple-900 block">
                    Blind Counting Mode
                  </span>
                  <span className="text-[10px] text-purple-700">
                    Hides theoretical system quantities from floor staff
                  </span>
                </div>
                <input
                  type="checkbox"
                  aria-label="Enable blind counting mode"
                  checked={newIsBlind}
                  onChange={(e) => setNewIsBlind(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-0 w-4 h-4 border-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="sc-notes">
                  Session Audit Notes
                </label>
                <textarea
                  id="sc-notes"
                  rows={2}
                  placeholder="e.g. End of Month kitchen stocktake before supplier orders"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isCreating ? 'Snapshotting...' : 'Create Audit Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECONCILE CONFIRMATION MODAL */}
      {isReconcileModalOpen && activeCount && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reconcile-confirm-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <FileCheck size={20} />
              </div>
              <div>
                <h3 id="reconcile-confirm-title" className="text-sm font-bold text-servora-navy">
                  Reconcile Stocktake {activeCount.countNumber}?
                </h3>
                <p className="text-xs text-servora-deepTeal mt-1 leading-relaxed">
                  All physical variances will adjust live inventory balances and post immutable{' '}
                  <span className="font-mono font-semibold">PHYSICAL_INVENTORY_ADJ</span> entries to the material ledger. This action cannot be undone.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="reconcile-notes"
                className="block text-xs font-bold text-servora-navy mb-1"
              >
                Reconciliation Approval Notes
              </label>
              <input
                id="reconcile-notes"
                type="text"
                value={reconcileNotes}
                onChange={(e) => setReconcileNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsReconcileModalOpen(false)}
                disabled={isReconciling}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReconcile}
                disabled={isReconciling}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-xs disabled:opacity-50 transition-colors"
              >
                {isReconciling ? 'Reconciling Ledger...' : 'Confirm & Post Variances'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}