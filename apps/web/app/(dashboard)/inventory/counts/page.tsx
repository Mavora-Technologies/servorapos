'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ClipboardCheck, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  X, 
  Clock, 
  Calendar, 
  ChevronRight, 
  Layers, 
  Save, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileCheck,
  Eye,
  EyeOff,
  AlertOctagon,
  RotateCcw,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface StockCountHeader {
  id: number;
  countNumber: string;
  status: 'IN_PROGRESS' | 'RECONCILED' | 'CANCELLED';
  countType: 'FULL' | 'CYCLE' | 'SPOT_CHECK';
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

export default function StockCountsPage() {
  const [counts, setCounts] = useState<StockCountHeader[]>([]);
  const [activeCount, setActiveCount] = useState<DetailedStockCount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);

  // Blind Count visibility override (for Managers)
  const [revealExpected, setRevealExpected] = useState(false);

  // Filter within Sheet
  const [sheetFilter, setSheetFilter] = useState<'ALL' | 'UNCOUNTED' | 'DISCREPANCIES' | 'RECOUNTS'>('ALL');

  // New Audit Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newCountType, setNewCountType] = useState<'FULL' | 'CYCLE' | 'SPOT_CHECK'>('FULL');
  const [newCategory, setNewCategory] = useState('');
  const [newIsBlind, setNewIsBlind] = useState(true);
  const [newNotes, setNewNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Line inputs buffer: lineId -> countedQuantity string
  const [lineBuffer, setLineBuffer] = useState<Record<number, string>>({});
  const [savingLineId, setSavingLineId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadCounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi('/api/v1/inventory/counts');
      if (res?.data) {
        setCounts(res.data);
      }
    } catch (err) {
      console.error('Failed to load stock counts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const openCountAudit = async (countId: number) => {
    setIsAuditing(true);
    setRevealExpected(false);
    try {
      const res = await fetchApi(`/api/v1/inventory/counts/${countId}`);
      if (res?.data) {
        setActiveCount(res.data);
        const buffer: Record<number, string> = {};
        res.data.items.forEach((item: StockCountItemLine) => {
          if (item.countedQuantity !== null) {
            buffer[item.id] = item.countedQuantity;
          }
        });
        setLineBuffer(buffer);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load count items');
      setIsAuditing(false);
    }
  };

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetchApi('/api/v1/inventory/counts/initiate', {
        method: 'POST',
        body: JSON.stringify({
          countType: newCountType,
          category: newCategory || undefined,
          isBlindCount: newIsBlind,
          notes: newNotes || undefined,
        }),
      });

      setIsNewModalOpen(false);
      setNewNotes('');
      await loadCounts();
      if (res?.data?.id) {
        openCountAudit(res.data.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initiate stock count');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveLine = async (line: StockCountItemLine) => {
    const val = lineBuffer[line.id];
    if (val === undefined || val === '') return;

    setSavingLineId(line.id);
    try {
      const res = await fetchApi(`/api/v1/inventory/counts/items/${line.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          countedQuantity: parseFloat(val),
        }),
      });

      if (res?.data && activeCount) {
        setActiveCount({
          ...activeCount,
          items: activeCount.items.map((i) => (i.id === line.id ? { ...i, ...res.data } : i)),
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update line');
    } finally {
      setSavingLineId(null);
    }
  };

  const handleReconcile = async () => {
    if (!activeCount) return;
    const uncounted = activeCount.items.filter((i) => i.countedQuantity === null).length;
    if (uncounted > 0) {
      alert(`Cannot reconcile: There are still ${uncounted} uncounted item(s). Every line must have a physical count.`);
      return;
    }

    if (!confirm(`Reconcile stock count ${activeCount.countNumber}? All item quantity variances will balance live inventory and post to the stock movement ledger.`)) {
      return;
    }

    try {
      await fetchApi(`/api/v1/inventory/counts/${activeCount.id}/reconcile`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Physical floor audit reconciled' }),
      });

      alert('Audit reconciled and balances adjusted successfully.');
      setIsAuditing(false);
      setActiveCount(null);
      loadCounts();
    } catch (err: any) {
      alert(err.message || 'Failed to reconcile count');
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
        const cost = parseFloat(item.varianceCost || '0');
        netVarianceCost += cost;
        if (parseFloat(item.varianceQuantity || '0') !== 0) {
          discrepancyCount++;
        }
        if (item.recountRequired) {
          recountCount++;
        }
      }
    });

    return {
      total: activeCount.items.length,
      countedItems,
      discrepancyCount,
      recountCount,
      netVarianceCost,
    };
  }, [activeCount]);

  const filteredLines = useMemo(() => {
    if (!activeCount) return [];
    return activeCount.items.filter((i) => {
      const matchesSearch =
        i.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.itemSku && i.itemSku.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesFilter = true;
      if (sheetFilter === 'UNCOUNTED') matchesFilter = i.countedQuantity === null;
      else if (sheetFilter === 'DISCREPANCIES') matchesFilter = i.countedQuantity !== null && parseFloat(i.varianceQuantity || '0') !== 0;
      else if (sheetFilter === 'RECOUNTS') matchesFilter = i.recountRequired;

      return matchesSearch && matchesFilter;
    });
  }, [activeCount, searchTerm, sheetFilter]);

  return (
    <div className="space-y-6">
      {/* View 1: Active Audit Floor Sheet */}
      {isAuditing && activeCount ? (
        <div className="space-y-6">
          {/* Top Audit Sheet Header */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <button
                onClick={() => { setIsAuditing(false); setActiveCount(null); }}
                className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 mb-1 transition-colors"
              >
                &larr; Back to Physical Audits
              </button>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-servora-navy">Physical Inventory Audit: {activeCount.countNumber}</h1>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  activeCount.status === 'RECONCILED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-blue-50 text-servora-core border border-blue-200'
                }`}>
                  {activeCount.status}
                </span>
                {activeCount.isBlindCount && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                    <Lock size={10} /> Blind Counting Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-servora-deepTeal mt-0.5">
                Scope: <strong>{activeCount.countType} {activeCount.category ? `(${activeCount.category})` : ''}</strong> | Opened: {new Date(activeCount.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeCount.isBlindCount && activeCount.status !== 'RECONCILED' && (
                <button
                  onClick={() => setRevealExpected(!revealExpected)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  {revealExpected ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{revealExpected ? 'Hide Expected Book Qty' : 'Manager Reveal'}</span>
                </button>
              )}

              {activeCount.status !== 'RECONCILED' && (
                <button
                  onClick={handleReconcile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <FileCheck size={16} /> Reconcile & Balance Material Ledger
                </button>
              )}
            </div>
          </div>

          {/* Telemetry Header */}
          {activeTelemetry && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Count Progress</span>
                <p className="text-lg font-bold text-servora-navy mt-1">
                  {activeTelemetry.countedItems} / {activeTelemetry.total}
                </p>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-servora-core h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(activeTelemetry.countedItems / activeTelemetry.total) * 100}%` }}
                  />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Variances Detected</span>
                <p className="text-lg font-bold text-amber-700 mt-1">
                  {activeTelemetry.discrepancyCount} SKUs
                </p>
                <span className="text-[11px] text-amber-600 font-medium">Book vs. physical delta</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">High-Tolerance Recounts</span>
                <p className="text-lg font-bold text-rose-700 mt-1">
                  {activeTelemetry.recountCount} Items
                </p>
                <span className="text-[11px] text-rose-600 font-medium">&gt;15% or &gt;KES 1,500 gap</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Net P&L Discrepancy Impact</span>
                <p className={`text-lg font-bold mt-1 ${activeTelemetry.netVarianceCost < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  KES {activeTelemetry.netVarianceCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[11px] text-gray-500 font-medium">To be adjusted in ledger</span>
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
                  placeholder="Filter items by SKU barcode or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
                {[
                  { id: 'ALL', label: `All (${activeCount.items.length})` },
                  { id: 'UNCOUNTED', label: 'Uncounted' },
                  { id: 'DISCREPANCIES', label: 'Variances' },
                  { id: 'RECOUNTS', label: 'Flagged Recounts' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSheetFilter(tab.id as any)}
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
                    <th className="py-3.5 px-4">Item SKU & Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">System Expected (Book)</th>
                    <th className="py-3.5 px-4 text-center">Physical Floor Count</th>
                    <th className="py-3.5 px-4 text-right">Variance Qty</th>
                    <th className="py-3.5 px-4 text-right">Cost Variance (KES)</th>
                    <th className="py-3.5 px-4">Audit Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
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
                          <span className="text-[10px] text-gray-400 font-mono">{line.itemSku || 'NO-SKU'}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold uppercase text-servora-deepTeal bg-gray-100 px-2 py-0.5 rounded-md">
                            {line.itemCategory}
                          </span>
                        </td>

                        {/* Expected Quantity: Guarded by Blind Counting Mode */}
                        <td className="py-3.5 px-4 text-right font-mono font-medium text-gray-600">
                          {activeCount.isBlindCount && !revealExpected && activeCount.status !== 'RECONCILED' ? (
                            <span className="text-gray-400 italic flex items-center justify-end gap-1">
                              <Lock size={11} /> Locked
                            </span>
                          ) : (
                            <span>{parseFloat(line.expectedQuantity).toLocaleString()} {line.itemUnit}</span>
                          )}
                        </td>

                        {/* Physical Count Input */}
                        <td className="py-3.5 px-4 text-center">
                          {activeCount.status === 'RECONCILED' ? (
                            <span className="font-bold font-mono text-servora-navy">
                              {line.countedQuantity ? `${parseFloat(line.countedQuantity).toLocaleString()} ${line.itemUnit}` : '-'}
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 w-32">
                              <input
                                type="number"
                                min="0"
                                step="0.001"
                                placeholder="Raw Count"
                                value={lineBuffer[line.id] ?? ''}
                                onChange={(e) => setLineBuffer({ ...lineBuffer, [line.id]: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs text-center font-bold border border-gray-300 rounded-lg focus:border-servora-core focus:outline-none bg-white shadow-2xs font-mono"
                              />
                              <span className="text-[11px] text-gray-400">{line.itemUnit}</span>
                            </div>
                          )}
                        </td>

                        {/* Variance Quantity */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {line.countedQuantity === null ? (
                            <span className="text-gray-300">-</span>
                          ) : (
                            <span className={varianceNum < 0 ? 'text-rose-600' : varianceNum > 0 ? 'text-emerald-700' : 'text-gray-400'}>
                              {varianceNum > 0 ? `+${varianceNum.toLocaleString()}` : varianceNum.toLocaleString()} {line.itemUnit}
                            </span>
                          )}
                        </td>

                        {/* Variance Cost */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {line.countedQuantity === null ? (
                            <span className="text-gray-300">-</span>
                          ) : (
                            <span className={varianceNum < 0 ? 'text-rose-600' : varianceNum > 0 ? 'text-emerald-700' : 'text-gray-400'}>
                              KES {parseFloat(line.varianceCost || '0').toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* Audit Status / Tolerance Warning */}
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
                          {activeCount.status !== 'RECONCILED' && (
                            <button
                              onClick={() => handleSaveLine(line)}
                              disabled={savingLineId === line.id}
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
                <span className="text-xs font-bold text-servora-navy">Stock Audit & Count Cycles</span>
              </div>
              <h1 className="text-xl font-bold text-servora-navy">Physical Stocktake & Reconciliation</h1>
              <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
                Snapshot live kitchen balances, run blind physical counts, detect cost variances, and balance material ledgers.
              </p>
            </div>

            <button
              onClick={() => setIsNewModalOpen(true)}
              className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={15} /> Start New Stock Take
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
                Loading stocktake audit history...
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
                      <th className="py-3.5 px-4">Audit Session #</th>
                      <th className="py-3.5 px-4">Audit Scope & Mode</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Created Date</th>
                      <th className="py-3.5 px-4">Auditor</th>
                      <th className="py-3.5 px-4 text-right">Net Financial Variance</th>
                      <th className="py-3.5 px-4">Reconciled At</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
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
                              <span className="text-[10px] text-purple-700 font-mono">Blind Counting</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              count.status === 'RECONCILED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-servora-core border border-blue-200'
                            }`}>
                              {count.status === 'RECONCILED' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                              {count.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                            {new Date(count.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4 text-servora-deepTeal">
                            {count.conductorEmail || 'Floor Supervisor'}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold">
                            {count.status === 'RECONCILED' ? (
                              <span className={netVal < 0 ? 'text-rose-600' : netVal > 0 ? 'text-emerald-700' : 'text-gray-500'}>
                                KES {netVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-normal">Pending</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                            {count.reconciledAt ? new Date(count.reconciledAt).toLocaleDateString() : '-'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Initiate Stock Take Audit</h3>
                <p className="text-[11px] text-servora-deepTeal">Snapshots live system balances for physical verification</p>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInitiate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Audit Type *</label>
                <select
                  value={newCountType}
                  onChange={(e) => setNewCountType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                >
                  <option value="FULL">Full Inventory Audit (All active catalog SKUs)</option>
                  <option value="CYCLE">Category Cycle Count (Targeted section)</option>
                  <option value="SPOT_CHECK">Spot Check Audit</option>
                </select>
              </div>

              {newCountType === 'CYCLE' && (
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Target Department Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="">Select Category...</option>
                    <option value="PRODUCE">PRODUCE</option>
                    <option value="MEAT">MEAT & POULTRY</option>
                    <option value="DAIRY">DAIRY</option>
                    <option value="PANTRY">PANTRY & DRY</option>
                    <option value="BAKERY">BAKERY</option>
                    <option value="BEVERAGE">BEVERAGES</option>
                  </select>
                </div>
              )}

              <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-900 block">Blind Counting Mode</span>
                  <span className="text-[10px] text-purple-700">Hides theoretical system quantities from floor staff</span>
                </div>
                <input
                  type="checkbox"
                  checked={newIsBlind}
                  onChange={(e) => setNewIsBlind(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-0 w-4 h-4 border-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Session Audit Notes</label>
                <textarea
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
    </div>
  );
}