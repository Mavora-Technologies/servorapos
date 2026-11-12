'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Scale,
  DollarSign,
  Smartphone,
  CreditCard,
  Building,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  Calendar,
  ShieldCheck,
  X,
  Printer,
  Coins,
  Receipt,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface DailyTelemetry {
  targetDate: string;
  shiftCounts: {
    closedReconciled: number;
    pendingActive: number;
  };
  cashReconciliation: {
    expectedDrawerCashKes: number;
    actualPhysicalCashKes: number;
    netVarianceKes: number;
    posCashSalesKes: number;
  };
  multiTenderBreakdown: {
    mpesaClearedKes: number;
    mpesaVolumeCount: number;
    cardTerminalKes: number;
    bankTransferKes: number;
  };
  zReportSummary?: {
    grossOrdersTotalKes: number;
    ordersCount: number;
    vatCollectedKes: number;
    cateringLevyKes: number;
  };
}

interface AuditRecord {
  shiftId: number;
  branchId: number;
  branchName: string;
  cashierId: number;
  cashierName: string;
  drawerName: string | null;
  drawerCode: string | null;
  openingFloat: number;
  posSalesDoneSoFar: number;
  safeDropsTotal: number;
  expectedCash: number;
  countedCash: number | null;
  variance: number | null;
  denominations: Record<string, number> | null;
  status: 'OPEN' | 'CLOSED';
  isAuditSignedOff: boolean;
  varianceNotes: string | null;
  openedAt: string;
  closedAt: string | null;
  supervisorName: string | null;
}

export default function CashReconciliationPage() {
  const [telemetry, setTelemetry] = useState<DailyTelemetry | null>(null);
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BALANCED' | 'DISCREPANCY' | 'PENDING_AUDIT'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Supervisor Sign-off Modal
  const [selectedShiftForAudit, setSelectedShiftForAudit] = useState<AuditRecord | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [clearingAccount, setClearingAccount] = useState<string>('Main Store Safe (Vault A)');
  const [auditResolution, setAuditResolution] = useState<'VERIFIED_BALANCED' | 'VARIANCE_ACCEPTED' | 'DISPUTED_ESCALATED'>('VERIFIED_BALANCED');
  const [auditorComments, setAuditorComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReconciliationData = useCallback(async () => {
    try {
      setIsLoading(true);
      const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;

      const params = new URLSearchParams();
      params.set('date', selectedDate);
      if (activeBranchId) params.set('branchId', activeBranchId);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const [telemetryRes, listRes] = await Promise.all([
        fetchApi(`/api/v1/cash-management/reconciliation/telemetry?date=${selectedDate}${activeBranchId ? `&branchId=${activeBranchId}` : ''}`),
        fetchApi(`/api/v1/cash-management/reconciliation/audit-list?${params.toString()}`),
      ]);

      if (telemetryRes?.data) setTelemetry(telemetryRes.data);
      if (listRes?.data?.records) setRecords(listRes.data.records);
    } catch (err: any) {
      console.error('Failed to load reconciliation telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    loadReconciliationData();
  }, [loadReconciliationData]);

  const handleOpenAuditModal = (record: AuditRecord) => {
    setSelectedShiftForAudit(record);
    setDepositAmount(record.countedCash !== null ? String(record.countedCash) : String(record.expectedCash));
    setAuditResolution(record.variance === 0 ? 'VERIFIED_BALANCED' : 'VARIANCE_ACCEPTED');
    setAuditorComments('');
  };

  const handleSignOffAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftForAudit) return;

    try {
      setIsSubmitting(true);
      const res = await fetchApi('/api/v1/cash-management/reconciliation/sign-off', {
        method: 'POST',
        body: JSON.stringify({
          shiftId: selectedShiftForAudit.shiftId,
          actualDepositAmount: parseFloat(depositAmount) || 0,
          clearingAccountId: clearingAccount,
          auditResolution,
          auditorNotes: auditorComments.trim() || undefined,
        }),
      });

      setSelectedShiftForAudit(null);
      setToastMessage({ text: res.message || 'Audit sign-off completed.', type: 'success' });
      setTimeout(() => setToastMessage(null), 4000);
      loadReconciliationData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit supervisor sign-off');
    } finally {
      setIsSubmitting(false);
    }
  };

  const grandTotalCleared = telemetry
    ? telemetry.cashReconciliation.actualPhysicalCashKes +
      telemetry.multiTenderBreakdown.mpesaClearedKes +
      telemetry.multiTenderBreakdown.cardTerminalKes +
      telemetry.multiTenderBreakdown.bankTransferKes
    : 0;

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
              href="/cash-management/shifts"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Cash Management <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Z-Report & Treasury Reconciliation</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Scale className="text-servora-core" size={24} />
            End-of-Day Z-Report & Multi-Tender Reconciliation
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Dual-custody audit matching physical till deposits, live POS cash sales, M-Pesa IPN clearing, and GL variance vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy">
            <Calendar size={14} className="text-servora-core" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-servora-navy text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer print:hidden"
          >
            <Printer size={14} /> Print Z-Report
          </button>

          <button
            onClick={loadReconciliationData}
            title="Refresh Ledger"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs print:hidden"
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

      {/* 2. MULTI-TENDER & Z-REPORT FISCAL SUMMARY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Gross POS Sales</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              KES {telemetry?.zReportSummary ? telemetry.zReportSummary.grossOrdersTotalKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">
              {telemetry?.zReportSummary?.ordersCount || 0} Settled Checks &bull; VAT KES{' '}
              {telemetry?.zReportSummary?.vatCollectedKes.toLocaleString() || '0'}
            </span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Receipt size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Expected Drawer Cash</span>
            <p className="text-xl font-bold font-mono text-servora-core mt-0.5">
              KES {telemetry ? telemetry.cashReconciliation.expectedDrawerCashKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">
              Includes +KES {telemetry?.cashReconciliation.posCashSalesKes.toLocaleString() || '0'} Cash Sales
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reconciled Vault Cash</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              KES {telemetry ? telemetry.cashReconciliation.actualPhysicalCashKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">
              {telemetry?.shiftCounts.closedReconciled || 0} Closed Shifts &bull; {telemetry?.shiftCounts.pendingActive || 0} Open
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Scale size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Net Cash Drift</span>
            <p
              className={`text-xl font-bold font-mono mt-0.5 ${
                telemetry && telemetry.cashReconciliation.netVarianceKes < 0 ? 'text-rose-600' : 'text-servora-navy'
              }`}
            >
              KES {telemetry ? telemetry.cashReconciliation.netVarianceKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-400 font-medium">Over / (Short) Balance</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <ShieldAlert size={18} />
          </div>
        </div>
      </div>

      {/* 3. MULTI-TENDER BALANCE AUDIT CARD */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-bold text-xs text-servora-navy uppercase tracking-wider">
              Settlement Channel Breakdown & Clearing Audit
            </h3>
            <p className="text-[11px] text-gray-400">
              Audit for operational date <strong className="text-servora-navy font-mono">{selectedDate}</strong> &bull; Total Cleared:{' '}
              <strong className="text-emerald-700 font-mono">KES {grandTotalCleared.toLocaleString()}</strong>
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-servora-core bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            {telemetry?.shiftCounts.closedReconciled || 0} Closed Shifts &bull; {telemetry?.shiftCounts.pendingActive || 0} Open
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-100 space-y-1">
            <div className="flex items-center gap-1.5 text-gray-500 font-bold text-[11px]">
              <DollarSign size={14} className="text-blue-600" />
              <span>Physical Till Cash</span>
            </div>
            <p className="text-base font-bold font-mono text-servora-navy">
              KES {telemetry ? telemetry.cashReconciliation.actualPhysicalCashKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-400 block font-mono">
              Expected: KES {telemetry ? telemetry.cashReconciliation.expectedDrawerCashKes.toLocaleString() : '0'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-100 space-y-1">
            <div className="flex items-center gap-1.5 text-gray-500 font-bold text-[11px]">
              <Smartphone size={14} className="text-green-600" />
              <span>M-Pesa C2B & STK</span>
            </div>
            <p className="text-base font-bold font-mono text-green-700">
              KES {telemetry ? telemetry.multiTenderBreakdown.mpesaClearedKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-400 block font-mono">
              {telemetry?.multiTenderBreakdown.mpesaVolumeCount || 0} Verified Callbacks
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-100 space-y-1">
            <div className="flex items-center gap-1.5 text-gray-500 font-bold text-[11px]">
              <CreditCard size={14} className="text-purple-600" />
              <span>Card Terminal (PDQ)</span>
            </div>
            <p className="text-base font-bold font-mono text-purple-700">
              KES {telemetry ? telemetry.multiTenderBreakdown.cardTerminalKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-400 block font-mono">Merchant Clearing Batch</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-100 space-y-1">
            <div className="flex items-center gap-1.5 text-gray-500 font-bold text-[11px]">
              <Building size={14} className="text-indigo-600" />
              <span>Bank Wire / Direct EFT</span>
            </div>
            <p className="text-base font-bold font-mono text-indigo-700">
              KES {telemetry ? telemetry.multiTenderBreakdown.bankTransferKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-400 block font-mono">Corporate Invoice Settlement</span>
          </div>
        </div>
      </div>

      {/* 4. SHIFT RECONCILIATION AUDIT LEDGER */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            {(['ALL', 'BALANCED', 'DISCREPANCY', 'PENDING_AUDIT'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === filter ? 'bg-white text-servora-navy shadow-xs' : 'text-gray-500 hover:text-black'
                }`}
              >
                {filter === 'ALL'
                  ? 'All Tills'
                  : filter === 'BALANCED'
                  ? 'Balanced'
                  : filter === 'DISCREPANCY'
                  ? 'Discrepancies'
                  : 'Pending Close'}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-gray-400">
            {records.length} Drawer Records Audited
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Till Shift & Register</th>
                <th className="py-2.5 px-3">Cashier Custodian</th>
                <th className="py-2.5 px-3 text-right">Float + Sales</th>
                <th className="py-2.5 px-3 text-right">Expected Drawer</th>
                <th className="py-2.5 px-3 text-right">Physical Count</th>
                <th className="py-2.5 px-3 text-right">Cash Variance</th>
                <th className="py-2.5 px-3">Audit Clearance</th>
                <th className="py-2.5 px-3">Supervisor Sign-Off</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400 italic">
                    <div className="max-w-md mx-auto space-y-2">
                      <Scale size={36} className="mx-auto opacity-20 text-servora-navy" />
                      <p className="font-bold text-servora-navy not-italic">No Reconciliation Shifts Found</p>
                      <p className="text-xs text-gray-500 not-italic">
                        No drawer sessions match the selected date and status filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const isBalanced = r.variance === 0;
                  const isShortage = r.variance !== null && r.variance < 0;
                  const isOverage = r.variance !== null && r.variance > 0;

                  return (
                    <tr key={r.shiftId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-servora-navy block">
                          Shift #{r.shiftId} {r.drawerCode ? `[${r.drawerCode}]` : ''}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {r.drawerName || r.branchName || 'Main Outlet'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-servora-navy">
                        {r.cashierName}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[11px]">
                        <div className="text-gray-600">Float: {r.openingFloat.toLocaleString()}</div>
                        <div className="text-emerald-700 font-bold">
                          Sales: +{r.posSalesDoneSoFar.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-core">
                        KES {r.expectedCash.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-purple-700">
                        {r.countedCash !== null ? `KES ${r.countedCash.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {r.variance !== null ? (
                          <span
                            className={`font-bold ${
                              isShortage ? 'text-rose-600' : isOverage ? 'text-amber-600' : 'text-emerald-700'
                            }`}
                          >
                            {r.variance > 0 ? `+KES ${r.variance.toLocaleString()}` : `KES ${r.variance.toLocaleString()}`}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-normal">Active Session</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {r.status === 'OPEN' ? (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            In Service
                          </span>
                        ) : isBalanced ? (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Balanced Zero Drift
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            Discrepancy Audit
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-gray-500 font-mono">
                        {r.supervisorName ? (
                          <span className="flex items-center gap-1 text-emerald-700 font-bold">
                            <ShieldCheck size={12} /> {r.supervisorName}
                          </span>
                        ) : (
                          <span className="text-gray-400">Pending Review</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {r.status === 'CLOSED' ? (
                          <button
                            onClick={() => handleOpenAuditModal(r)}
                            className="px-2.5 py-1 bg-slate-50 border border-gray-200 hover:bg-gray-100 font-bold rounded-lg transition-colors cursor-pointer text-[11px] text-servora-navy"
                          >
                            {r.isAuditSignedOff ? 'Audited ✓' : 'Review & Sign-Off'}
                          </button>
                        ) : (
                          <Link
                            href="/cash-management/shifts"
                            className="px-2.5 py-1 bg-blue-50 text-servora-core font-bold rounded-lg text-[11px] hover:bg-blue-100"
                          >
                            Close Till &rarr;
                          </Link>
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

      {/* 5. MODAL: SUPERVISOR DUAL-CUSTODY AUDIT SIGN-OFF */}
      {selectedShiftForAudit && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Supervisor Treasury Audit & Sign-Off</h3>
                <p className="text-[11px] text-gray-400">
                  Shift #{selectedShiftForAudit.shiftId} &bull; Custodian: {selectedShiftForAudit.cashierName}
                </p>
              </div>
              <button onClick={() => setSelectedShiftForAudit(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSignOffAudit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-100 font-mono space-y-1">
                <div className="flex justify-between text-gray-500">
                  <span>Opening Float + POS Sales:</span>
                  <span>
                    KES {(selectedShiftForAudit.openingFloat + selectedShiftForAudit.posSalesDoneSoFar).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Expected Register Balance:</span>
                  <span className="font-bold text-servora-navy">
                    KES {selectedShiftForAudit.expectedCash.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Counted Physical Cash:</span>
                  <span className="font-bold text-purple-700">
                    KES {selectedShiftForAudit.countedCash !== null ? selectedShiftForAudit.countedCash.toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1 text-gray-700 font-bold">
                  <span>Reported Variance:</span>
                  <span className={selectedShiftForAudit.variance && selectedShiftForAudit.variance < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    KES {selectedShiftForAudit.variance !== null ? selectedShiftForAudit.variance.toLocaleString() : '0'}
                  </span>
                </div>
              </div>

              {/* Show Cashier's Denominational Breakdown if recorded */}
              {selectedShiftForAudit.denominations &&
                Object.keys(selectedShiftForAudit.denominations).length > 0 && (
                  <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-servora-navy flex items-center gap-1">
                      <Coins size={12} className="text-servora-core" /> Recorded Note & Coin Tally
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                      {Object.entries(selectedShiftForAudit.denominations).map(([denom, qty]) => (
                        <div key={denom} className="bg-white px-2 py-1 rounded border border-gray-200 flex justify-between">
                          <span className="text-gray-500">{denom === 'coins' ? 'Coins' : `KES ${denom}`}:</span>
                          <span className="font-bold">{qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Actual Physical Cash Handed Over (KES) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-servora-navy focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Deposit Destination / Vault Ledger *
                </label>
                <select
                  value={clearingAccount}
                  onChange={(e) => setClearingAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
                >
                  <option value="Main Store Safe (Vault A)">Main Store Safe (Vault A)</option>
                  <option value="Night Drop Depository Safe">Night Drop Depository Safe</option>
                  <option value="Direct Bank Transit Carrier">Direct Bank Transit Carrier (CIT Bag)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Audit Verdict & Resolution *
                </label>
                <select
                  value={auditResolution}
                  onChange={(e) => setAuditResolution(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
                >
                  <option value="VERIFIED_BALANCED">Verified Balanced (Full Deposit Cleared)</option>
                  <option value="VARIANCE_ACCEPTED">Variance Accepted (Auto-Post GL Adjustment)</option>
                  <option value="DISPUTED_ESCALATED">Disputed & Escalated (Trigger Governance Alert)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Supervisor Audit Commentary
                </label>
                <textarea
                  rows={2}
                  value={auditorComments}
                  onChange={(e) => setAuditorComments(e.target.value)}
                  placeholder="Record verification notes, bag seals, or incident details..."
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedShiftForAudit(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !depositAmount}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Signing Off...' : 'Complete Audit Sign-Off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}