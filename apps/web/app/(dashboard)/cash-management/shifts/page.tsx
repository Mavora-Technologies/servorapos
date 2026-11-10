'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Plus,
  ChevronRight,
  Search,
  DollarSign,
  Users,
  Building2,
  Lock,
  Unlock,
  Coins,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ShiftRecord {
  id: number;
  branchId: number;
  branchName: string;
  cashierId: number;
  cashierName: string;
  cashierEmail: string;
  openingFloat: number;
  expectedCash: number;
  countedCash: number | null;
  variance: number | null;
  status: 'OPEN' | 'CLOSED';
  varianceNotes: string | null;
  openedAt: string;
  closedAt: string | null;
  closedByName: string | null;
}

interface ActiveShift {
  id: number;
  branchId: number;
  branchName: string;
  cashierId: number;
  openingFloat: number;
  inboundCashSales: number;
  liveExpectedCash: number;
  status: 'OPEN';
  openedAt: string;
}

interface ShiftMetrics {
  totalShifts: number;
  activeOpenShifts: number;
  totalCashVolumeKes: number;
  totalNetVarianceKes: number;
  discrepancyCount: number;
}

export default function CashShiftsPage() {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [metrics, setMetrics] = useState<ShiftMetrics | null>(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedShiftForClose, setSelectedShiftForClose] = useState<ShiftRecord | ActiveShift | null>(null);

  // Form State
  const [openingFloatAmount, setOpeningFloatAmount] = useState<string>('5000');
  const [countedCashAmount, setCountedCashAmount] = useState<string>('');
  const [varianceReason, setVarianceReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;
      if (activeBranchId) params.set('branchId', activeBranchId);

      const [shiftsRes, metricsRes, activeRes] = await Promise.all([
        fetchApi(`/api/v1/cash-management/shifts?${params.toString()}`),
        fetchApi(`/api/v1/cash-management/shifts/metrics?${activeBranchId ? `branchId=${activeBranchId}` : ''}`),
        fetchApi(`/api/v1/cash-management/shifts/active?${activeBranchId ? `branchId=${activeBranchId}` : ''}`),
      ]);

      if (shiftsRes?.data?.shifts) setShifts(shiftsRes.data.shifts);
      if (metricsRes?.data) setMetrics(metricsRes.data);
      if (activeRes?.data) setActiveShift(activeRes.data);
      else setActiveShift(null);
    } catch (err: any) {
      console.error('Failed to load cash shift telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;
      const branchId = activeBranchId ? parseInt(activeBranchId, 10) : 1;

      const res = await fetchApi('/api/v1/cash-management/shifts/open', {
        method: 'POST',
        body: JSON.stringify({
          branchId,
          openingFloat: parseFloat(openingFloatAmount) || 0,
          shiftType: 'MORNING',
        }),
      });

      setIsOpenModalOpen(false);
      setToastMessage({ text: res.message || 'Shift opened successfully.', type: 'success' });
      setTimeout(() => setToastMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to open shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftForClose) return;

    try {
      setIsSubmitting(true);
      const res = await fetchApi('/api/v1/cash-management/shifts/close', {
        method: 'POST',
        body: JSON.stringify({
          shiftId: selectedShiftForClose.id,
          countedCash: parseFloat(countedCashAmount) || 0,
          varianceNotes: varianceReason.trim() || undefined,
        }),
      });

      setIsCloseModalOpen(false);
      setSelectedShiftForClose(null);
      setCountedCashAmount('');
      setVarianceReason('');
      setToastMessage({ text: res.message || 'Shift reconciled and closed.', type: 'success' });
      setTimeout(() => setToastMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to close shift');
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
            <span className="text-xs font-bold text-servora-navy">Treasury & Workforce Custody</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Wallet className="text-servora-core" size={24} />
            Cashier Shift & Drawer Settlement Cockpit
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Enterprise point-of-sale custody, blind cash drawer balancing, float tracking, and supervisor discrepancy sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {activeShift ? (
            <button
              onClick={() => {
                setSelectedShiftForClose(activeShift);
                setIsCloseModalOpen(true);
              }}
              className="px-3.5 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Lock size={14} /> Close Active Shift #{activeShift.id}
            </button>
          ) : (
            <button
              onClick={() => setIsOpenModalOpen(true)}
              className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Unlock size={14} /> Open Cashier Shift
            </button>
          )}

          <button
            onClick={loadData}
            title="Refresh Ledger"
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

      {/* 2. ENTERPRISE FIDUCIARY METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Sessions</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {metrics ? metrics.activeOpenShifts : 0}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Drawers In Service</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Unlock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reconciled Cash</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              KES {metrics ? metrics.totalCashVolumeKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Settled to Main Safe</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Net Drift Variance</span>
            <p
              className={`text-xl font-bold font-mono mt-0.5 ${
                metrics && metrics.totalNetVarianceKes < 0 ? 'text-rose-600' : 'text-servora-navy'
              }`}
            >
              KES {metrics ? metrics.totalNetVarianceKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-400 font-medium">Cumulative Over/Short</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Coins size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Audited Breaches</span>
            <p className="text-xl font-bold font-mono text-rose-700 mt-0.5">
              {metrics ? metrics.discrepancyCount : 0}
            </p>
            <span className="text-[10px] text-rose-600 font-medium">&gt; KES 50 Tolerance</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert size={18} />
          </div>
        </div>
      </div>

      {/* 3. ACTIVE SHIFT COCKPIT (IF CURRENT USER HAS OPEN SHIFT) */}
      {activeShift && (
        <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/40 p-5 rounded-2xl border border-blue-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">
                <Clock size={10} /> Active Drawer Assigned
              </span>
              <span className="text-xs font-mono text-gray-500">
                Opened {new Date(activeShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h3 className="text-base font-bold text-servora-navy">
              Shift #{activeShift.id} &bull; {activeShift.branchName || 'Main Outlet'}
            </h3>
            <p className="text-xs text-gray-600">
              Opening Float: <strong className="font-mono text-servora-navy">KES {activeShift.openingFloat.toLocaleString()}</strong> | Inbound Cash Tendered:{' '}
              <strong className="font-mono text-emerald-700">+KES {activeShift.inboundCashSales.toLocaleString()}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Live Expected Balance</span>
              <span className="text-lg font-bold font-mono text-servora-core">
                KES {activeShift.liveExpectedCash.toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedShiftForClose(activeShift);
                setIsCloseModalOpen(true);
              }}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
            >
              Reconcile & Close Shift
            </button>
          </div>
        </div>
      )}

      {/* 4. SHIFTS DIRECTORY & AUDIT TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            {(['ALL', 'OPEN', 'CLOSED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-white text-servora-navy shadow-xs' : 'text-gray-500 hover:text-black'
                }`}
              >
                {st === 'ALL' ? 'All Shifts' : st === 'OPEN' ? 'In Service (Open)' : 'Reconciled (Closed)'}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-gray-400">
            {shifts.length} Recorded Shifts in Ledger
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Shift ID</th>
                <th className="py-2.5 px-3">Cashier</th>
                <th className="py-2.5 px-3">Branch Outlet</th>
                <th className="py-2.5 px-3 text-right">Opening Float</th>
                <th className="py-2.5 px-3 text-right">Expected Cash</th>
                <th className="py-2.5 px-3 text-right">Counted Cash</th>
                <th className="py-2.5 px-3 text-right">Variance</th>
                <th className="py-2.5 px-3">Audit Status</th>
                <th className="py-2.5 px-3">Timeline & Supervisor</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400 italic">
                    <div className="max-w-md mx-auto space-y-2">
                      <Wallet size={36} className="mx-auto opacity-20 text-servora-navy" />
                      <p className="font-bold text-servora-navy not-italic">No Cash Shifts Recorded</p>
                      <p className="text-xs text-gray-500 not-italic">
                        New tenants start with an empty fiduciary ledger. Click <strong>Open Cashier Shift</strong> to begin your initial drawer session.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                shifts.map((s) => {
                  const isBalanced = s.variance === 0;
                  const isShortage = s.variance !== null && s.variance < 0;
                  const isOverage = s.variance !== null && s.variance > 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-servora-navy">#{s.id}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{s.cashierName}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{s.cashierEmail}</span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 font-medium">{s.branchName || 'Main Outlet'}</td>
                      <td className="py-3 px-3 text-right font-mono text-gray-700">
                        KES {s.openingFloat.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                        KES {s.expectedCash.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-purple-700">
                        {s.countedCash !== null ? `KES ${s.countedCash.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {s.variance !== null ? (
                          <span
                            className={`font-bold ${
                              isShortage ? 'text-rose-600' : isOverage ? 'text-amber-600' : 'text-emerald-700'
                            }`}
                          >
                            {s.variance > 0 ? `+KES ${s.variance.toLocaleString()}` : `KES ${s.variance.toLocaleString()}`}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-normal">Pending Drop</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {s.status === 'OPEN' ? (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            Active (Open)
                          </span>
                        ) : isBalanced ? (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Balanced
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            Discrepancy
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-gray-500 font-mono">
                        <div>In: {new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        {s.closedAt && (
                          <div className="text-[10px] text-gray-400">
                            Closed by: {s.closedByName || 'Supervisor'}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {s.status === 'OPEN' && (
                          <button
                            onClick={() => {
                              setSelectedShiftForClose(s);
                              setIsCloseModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-50 border border-gray-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                          >
                            Close
                          </button>
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

      {/* 5. MODAL: OPEN CASHIER SHIFT */}
      {isOpenModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Open Cashier Shift Session</h3>
                <p className="text-[11px] text-gray-400">Initiate cash drawer custody & register opening float</p>
              </div>
              <button onClick={() => setIsOpenModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Starting Cash Float (KES) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="50"
                  value={openingFloatAmount}
                  onChange={(e) => setOpeningFloatAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-sm text-servora-navy focus:outline-none focus:border-servora-core"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Verify starting change denominations with the main store safe supervisor.
                </span>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Starting...' : 'Confirm & Open Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: BLIND CASH DRAWER CLOSEOUT (WORKDAY / SAP ANTI-FRAUD PARADIGM) */}
      {isCloseModalOpen && selectedShiftForClose && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Blind Reconciliation & Closeout</h3>
                <p className="text-[11px] text-gray-400">Shift #{selectedShiftForClose.id} Final Settlement</p>
              </div>
              <button onClick={() => setIsCloseModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-3.5 text-xs">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1 text-[11px]">
                  <ShieldAlert size={13} /> Blind Balancing Protocol
                </span>
                <p className="text-[10px] text-amber-800 leading-relaxed">
                  Count all currency in the drawer physical register. The expected register total is computed independently by the system upon submission to prevent adjustment bias.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Total Physical Cash Counted (KES) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={countedCashAmount}
                  onChange={(e) => setCountedCashAmount(e.target.value)}
                  placeholder="Count and enter total cash"
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-sm text-purple-700 focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Variance Explanatory Notes (If Applicable)
                </label>
                <textarea
                  rows={2}
                  value={varianceReason}
                  onChange={(e) => setVarianceReason(e.target.value)}
                  placeholder="State reason for known discrepancies, coin shortages, or damaged notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !countedCashAmount}
                  className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Balancing...' : 'Submit & Close Drawer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}