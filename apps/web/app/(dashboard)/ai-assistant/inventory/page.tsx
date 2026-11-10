'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  SlidersHorizontal,
  DollarSign,
  Truck,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Check,
  X, Search,
  FileText,
  Boxes,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ReplenishmentItem {
  id: number;
  inventoryItemId: number;
  itemName: string;
  itemSku: string;
  unitOfMeasure: string;
  supplierId: number | null;
  supplierName: string;
  currentStockLevel: number;
  dailyBurnRate: number;
  daysOfInventoryRemaining: number;
  forecastedRunoutDate: string;
  recommendedOrderQty: number;
  estimatedUnitCostKes: number;
  totalProjectedCostKes: number;
  supplierLeadTimeDays: number;
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'STABLE';
  approvalStatus: 'PENDING_REVIEW' | 'APPROVED_PO_CREATED' | 'REJECTED_DISMISSED' | 'AUTO_DISPATCHED';
  aiReasoningNote: string;
  createdAt: string;
}

interface SCMTelemetry {
  kpis: {
    totalRecommendations: number;
    criticalStockoutRisk: number;
    pendingReviewCount: number;
    totalSuggestedOrderCapitalKes: number;
    avgDaysOfSupplyRemaining: number;
  };
  recommendations: ReplenishmentItem[];
}

const URGENCY_CONFIG = {
  CRITICAL: { label: 'Critical (≤2 Days)', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  HIGH: { label: 'High Priority (≤4 Days)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  MEDIUM: { label: 'Standard Restock', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  STABLE: { label: 'Adequate Buffer', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

export default function PredictiveInventoryPage() {
  const [telemetry, setTelemetry] = useState<SCMTelemetry | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_REVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Conversion to PO Modal State
  const [selectedItemToOrder, setSelectedItemToOrder] = useState<ReplenishmentItem | null>(null);
  const [approvedQty, setApprovedQty] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [procurementNotes, setProcurementNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dismissal Modal State
  const [selectedItemToDismiss, setSelectedItemToDismiss] = useState<ReplenishmentItem | null>(null);
  const [dismissalReason, setDismissalReason] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (urgencyFilter !== 'ALL') params.set('urgencyLevel', urgencyFilter);
      if (statusFilter !== 'ALL') params.set('approvalStatus', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetchApi(`/api/v1/ai-assistant/inventory?${params.toString()}`);
      if (res?.data) {
        setTelemetry(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load predictive purchasing signals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [urgencyFilter, statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenPOModal = (item: ReplenishmentItem) => {
    setSelectedItemToOrder(item);
    setApprovedQty(item.recommendedOrderQty);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + item.supplierLeadTimeDays);
    setDeliveryDate(targetDate.toISOString().split('T')[0]);
    setProcurementNotes('Auto-authorized via Servora AI Copilot Replenishment Engine');
  };

  const handleConfirmPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemToOrder) return;

    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const res = await fetchApi('/api/v1/ai-assistant/inventory/convert-po', {
        method: 'POST',
        body: JSON.stringify({
          recommendationId: selectedItemToOrder.id,
          approvedOrderQty: approvedQty,
          deliveryDate,
          procurementNotes,
        }),
      });

      setSelectedItemToOrder(null);
      setToastMessage({
        text: res.data?.message || 'Purchase Order generated and logged into Procurement queue.',
        type: 'success',
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to convert to purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDismiss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemToDismiss || !dismissalReason.trim()) return;

    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const res = await fetchApi('/api/v1/ai-assistant/inventory/dismiss', {
        method: 'POST',
        body: JSON.stringify({
          recommendationId: selectedItemToDismiss.id,
          dismissalReason: dismissalReason.trim(),
        }),
      });

      setSelectedItemToDismiss(null);
      setToastMessage({ text: res.message || 'Replenishment signal dismissed.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Dismissal failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Enterprise Control <ChevronRight size={12} />
            </Link>
            <Link
              href="/ai-assistant"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              AI Copilot <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Predictive Purchasing SCM</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Package className="text-servora-core" size={24} />
            Predictive Purchasing & Autonomous Replenishment
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Machine learning depletion models calculating run-out dates, safety stocks, lead times, and auto-generating supplier Purchase Orders.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <Link
            href="/purchasing/orders"
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileText size={14} className="text-servora-core" />
            Procurement Ledger
          </Link>
          <button
            onClick={loadData}
            title="Recalculate Runouts"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. REPLENISHMENT EXECUTIVE METRIC RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Critical Stockout Risks</span>
            <p className="text-xl font-bold font-mono text-rose-700 mt-0.5">
              {telemetry ? telemetry.kpis.criticalStockoutRisk : 0}
            </p>
            <span className="text-[10px] text-rose-600 font-medium">Runout within &le;48 hrs</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Suggested Order Capital</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              KES {telemetry ? telemetry.kpis.totalSuggestedOrderCapitalKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">To restore 12-day buffers</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Avg Supply Remaining</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              {telemetry ? `${telemetry.kpis.avgDaysOfSupplyRemaining} Days` : '0 Days'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Across active raw materials</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pending Review</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {telemetry ? telemetry.kpis.pendingReviewCount : 0}
            </p>
            <span className="text-[10px] text-purple-600 font-medium">Awaiting PO conversion</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Sparkles size={18} />
          </div>
        </div>
      </div>

      {/* 3. SEARCH & CONTROLS TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Urgency Horizons</option>
            <option value="CRITICAL">Critical Risk (&le;2 Days)</option>
            <option value="HIGH">High Priority (&le;4 Days)</option>
            <option value="MEDIUM">Standard Restock</option>
            <option value="STABLE">Stable Buffer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Lifecycle States</option>
            <option value="PENDING_REVIEW">Pending Manager Authorization</option>
            <option value="APPROVED_PO_CREATED">PO Created & Dispatched</option>
            <option value="REJECTED_DISMISSED">Dismissed / Manual Hedge</option>
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Search material SKU or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-servora-core w-44 sm:w-64"
          />
        </div>
      </div>

      {/* 4. PREDICTIVE REPLENISHMENT DIRECTORY TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Raw Material SKU</th>
                <th className="py-2.5 px-3">Current Stock Level</th>
                <th className="py-2.5 px-3">Burn Velocity</th>
                <th className="py-2.5 px-3">Forecasted Runout</th>
                <th className="py-2.5 px-3 text-right">Suggested Reorder</th>
                <th className="py-2.5 px-3 text-right">Projected Cost</th>
                <th className="py-2.5 px-3">Urgency Tier</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!telemetry || telemetry.recommendations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 italic">
                    {isLoading ? 'Computing predictive runouts...' : 'No replenishment alerts matching current filters.'}
                  </td>
                </tr>
              ) : (
                telemetry.recommendations.map((item) => {
                  const urgencyBadge = URGENCY_CONFIG[item.urgencyLevel] || URGENCY_CONFIG.MEDIUM;
                  const isPending = item.approvalStatus === 'PENDING_REVIEW';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{item.itemName}</span>
                        <span className="text-[10px] font-mono text-gray-400">SKU: {item.itemSku}</span>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-gray-700">
                        {item.currentStockLevel.toLocaleString()} {item.unitOfMeasure}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-600">
                        {item.dailyBurnRate.toLocaleString()} {item.unitOfMeasure}/day
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-servora-navy block">
                          {new Date(item.forecastedRunoutDate).toLocaleDateString()}
                        </span>
                        <span className={`text-[10px] font-bold ${item.daysOfInventoryRemaining <= 2 ? 'text-rose-600' : 'text-amber-600'}`}>
                          {item.daysOfInventoryRemaining} Days Remaining
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-core">
                        {item.recommendedOrderQty.toLocaleString()} {item.unitOfMeasure}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        KES {item.totalProjectedCostKes.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono uppercase font-bold border ${urgencyBadge.bg} ${urgencyBadge.text} ${urgencyBadge.border}`}>
                          {urgencyBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenPOModal(item)}
                              className="px-2.5 py-1 bg-servora-core text-white font-bold text-[11px] rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Zap size={11} /> Auto-PO
                            </button>
                            <button
                              onClick={() => {
                                setSelectedItemToDismiss(item);
                                setDismissalReason('Stock buffer covered by manual purchase or alternate supplier.');
                              }}
                              className="p-1 text-gray-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-slate-100 cursor-pointer"
                              title="Dismiss Alert"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : item.approvalStatus === 'APPROVED_PO_CREATED' ? (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-1">
                            <CheckCircle2 size={12} /> PO Dispatched
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-gray-400">Dismissed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: 1-CLICK CONVERT TO PURCHASE ORDER */}
      {selectedItemToOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Authorize Replenishment PO</h3>
                <p className="text-[11px] text-gray-400">
                  {selectedItemToOrder.itemName} ({selectedItemToOrder.itemSku})
                </p>
              </div>
              <button onClick={() => setSelectedItemToOrder(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmPO} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-100 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Stock:</span>
                  <span className="font-bold text-servora-navy">{selectedItemToOrder.currentStockLevel} {selectedItemToOrder.unitOfMeasure}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Runout Horizon:</span>
                  <span className="font-bold text-rose-600">{selectedItemToOrder.daysOfInventoryRemaining} Days ({new Date(selectedItemToOrder.forecastedRunoutDate).toLocaleDateString()})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Estimated Unit Cost:</span>
                  <span className="font-bold text-servora-navy">KES {selectedItemToOrder.estimatedUnitCostKes} / {selectedItemToOrder.unitOfMeasure}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Approved Order Quantity ({selectedItemToOrder.unitOfMeasure}) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={approvedQty}
                  onChange={(e) => setApprovedQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Expected Delivery Date *</label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Procurement & SCM Audit Notes</label>
                <textarea
                  rows={2}
                  value={procurementNotes}
                  onChange={(e) => setProcurementNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none text-xs"
                />
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs font-mono">
                <span className="text-blue-900 font-bold">Total PO Commitment:</span>
                <span className="font-bold text-servora-core text-sm">
                  KES {(approvedQty * selectedItemToOrder.estimatedUnitCostKes).toLocaleString()}
                </span>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItemToOrder(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || approvedQty <= 0}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating PO...' : 'Confirm & Dispatch PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: DISMISS REPLENISHMENT SIGNAL */}
      {selectedItemToDismiss && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Dismiss Restocking Alert</h3>
                <p className="text-[11px] text-gray-400">
                  {selectedItemToDismiss.itemName} ({selectedItemToDismiss.itemSku})
                </p>
              </div>
              <button onClick={() => setSelectedItemToDismiss(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDismiss} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Audit Dismissal Justification *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this replenishment signal is being overridden..."
                  value={dismissalReason}
                  onChange={(e) => setDismissalReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItemToDismiss(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !dismissalReason.trim()}
                  className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Dismissing...' : 'Log & Dismiss Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}