'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  SlidersHorizontal,
  DollarSign,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  ShieldCheck,
  Building,
  User,
  X,
  CreditCard,
  FileText,
  BadgeAlert,
  ThumbsUp,
  ThumbsDown,
  ArrowRightLeft,
  FileCheck2,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface AdjustmentRecord {
  id: number;
  adjustmentNumber: string;
  adjustmentType: string;
  amount: number;
  currency: string;
  adjustmentDirection: 'DEBIT' | 'CREDIT';
  debitGlAccount: string;
  creditGlAccount: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'POSTED';
  reasonCode: string;
  justificationNotes: string;
  rejectionReason: string | null;
  shiftId: number | null;
  createdAt: string;
  approvedAt: string | null;
  postedAt: string | null;
  branchName: string | null;
  createdByName: string;
  createdByEmail: string;
  approverName: string | null;
  attributedStaffName: string | null;
}

interface AdjustmentMetrics {
  totalCount: number;
  pendingCount: number;
  pendingAmountKes: number;
  approvedPostedKes: number;
  rejectedCount: number;
  tillWriteOffsKes: number;
}

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>([]);
  const [metrics, setMetrics] = useState<AdjustmentMetrics | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Adjustment Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<string>('TILL_VARIANCE_WRITE_OFF');
  const [amount, setAmount] = useState<string>('');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [debitGlAccount, setDebitGlAccount] = useState<string>('5210 - Cash Over/Short Expense');
  const [creditGlAccount, setCreditGlAccount] = useState<string>('1010 - Main Till Cash');
  const [reasonCode, setReasonCode] = useState<string>('DRAWER_DISCREPANCY');
  const [justificationNotes, setJustificationNotes] = useState<string>('');
  const [shiftIdInput, setShiftIdInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review Modal (Maker-Checker)
  const [selectedAdjustmentForReview, setSelectedAdjustmentForReview] = useState<AdjustmentRecord | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<string>('');

  const loadAdjustmentsData = useCallback(async () => {
    try {
      setIsLoading(true);
      const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;

      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('adjustmentType', typeFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (activeBranchId) params.set('branchId', activeBranchId);

      const [adjRes, metricsRes] = await Promise.all([
        fetchApi(`/api/v1/finance/adjustments?${params.toString()}`),
        fetchApi(`/api/v1/finance/adjustments/metrics${activeBranchId ? `?branchId=${activeBranchId}` : ''}`),
      ]);

      if (adjRes?.data?.adjustments) setAdjustments(adjRes.data.adjustments);
      if (metricsRes?.data) setMetrics(metricsRes.data);
    } catch (err: any) {
      console.error('Failed to load adjustments ledger:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    loadAdjustmentsData();
  }, [loadAdjustmentsData]);

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;

      const res = await fetchApi('/api/v1/finance/adjustments', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId ? parseInt(activeBranchId, 10) : null,
          adjustmentType,
          shiftId: shiftIdInput ? parseInt(shiftIdInput, 10) : null,
          amount: parseFloat(amount) || 0,
          adjustmentDirection,
          debitGlAccount,
          creditGlAccount,
          reasonCode,
          justificationNotes: justificationNotes.trim(),
        }),
      });

      setIsCreateModalOpen(false);
      setAmount('');
      setJustificationNotes('');
      setShiftIdInput('');
      setToastMessage({ text: res.message || 'Adjustment voucher submitted for Maker-Checker review.', type: 'success' });
      setTimeout(() => setToastMessage(null), 4000);
      loadAdjustmentsData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewAction = async (action: 'APPROVE' | 'REJECT' | 'POST') => {
    if (!selectedAdjustmentForReview) return;
    try {
      setIsSubmitting(true);
      const res = await fetchApi(`/api/v1/finance/adjustments/${selectedAdjustmentForReview.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          rejectionReason: action === 'REJECT' ? rejectionNotes.trim() : undefined,
        }),
      });

      setSelectedAdjustmentForReview(null);
      setRejectionNotes('');
      setToastMessage({ text: res.message || `Adjustment ${action} completed.`, type: 'success' });
      setTimeout(() => setToastMessage(null), 4000);
      loadAdjustmentsData();
    } catch (err: any) {
      alert(err.message || 'Review action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1 w-max"><Clock size={11} /> Pending Review</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1 w-max"><ThumbsUp size={11} /> Approved</span>;
      case 'POSTED':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1 w-max"><CheckCircle2 size={11} /> Posted to GL</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1 w-max"><ThumbsDown size={11} /> Declined</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-bold text-[10px] uppercase">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard" className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors">
              Enterprise Control <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Financial Corrections & Governance</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <SlidersHorizontal className="text-servora-core" size={24} />
            Financial Adjustments, GL Entries & Maker-Checker Audit
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Workday-grade two-person integrity control: Till over/short write-offs, staff payroll deductions, tip pool reconciliations, and general ledger journal reversals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> New Adjustment Voucher
          </button>
          <button
            onClick={loadAdjustmentsData}
            title="Refresh Ledger"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. MAKER-CHECKER FINANCIAL METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pending Checker Sign-Off</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              KES {metrics ? metrics.pendingAmountKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">{metrics?.pendingCount || 0} Adjustments Awaiting Review</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Approved & Posted to GL</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              KES {metrics ? metrics.approvedPostedKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Reconciled Ledger Balance</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileCheck2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Till Variance Write-Offs</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              KES {metrics ? metrics.tillWriteOffsKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-purple-600 font-medium">Cash Drawer Discrepancies</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <ArrowRightLeft size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Declined Adjustments</span>
            <p className="text-xl font-bold font-mono text-rose-700 mt-0.5">
              {metrics ? metrics.rejectedCount : 0} Vouchers
            </p>
            <span className="text-[10px] text-rose-600 font-medium">Segregation of Duties Enforced</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <BadgeAlert size={18} />
          </div>
        </div>
      </div>

      {/* 3. WORKDAY MAKER-CHECKER LEDGER & FILTER CONTROLS */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl font-bold">
              {(['ALL', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    statusFilter === st ? 'bg-white text-servora-navy shadow-xs' : 'text-gray-500 hover:text-black'
                  }`}
                >
                  {st === 'ALL'
                    ? 'All Entries'
                    : st === 'PENDING_APPROVAL'
                    ? 'Awaiting Sign-Off'
                    : st === 'APPROVED'
                    ? 'Approved'
                    : st === 'POSTED'
                    ? 'Posted'
                    : 'Declined'}
                </button>
              ))}
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Adjustment Categories</option>
              <option value="TILL_VARIANCE_WRITE_OFF">Till Variance Write-Off</option>
              <option value="PAYROLL_LABOR_DEDUCTION">Staff Payroll Deduction</option>
              <option value="TIP_POOL_CORRECTION">Tip Pool Distribution Adjustment</option>
              <option value="BANK_RECON_VARIANCE">Bank Statement Drift</option>
              <option value="VENDOR_AP_CREDIT">Vendor AP Debit Adjustment</option>
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              placeholder="Search voucher #, reason, or GL code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-servora-core w-48 sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Voucher #</th>
                <th className="py-2.5 px-3">Category & Reason</th>
                <th className="py-2.5 px-3">Maker (Author)</th>
                <th className="py-2.5 px-3">Debit GL / Credit GL</th>
                <th className="py-2.5 px-3 text-right">Adjustment Amount</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Checker (Approver)</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 italic">
                    <div className="max-w-md mx-auto space-y-2">
                      <SlidersHorizontal size={36} className="mx-auto opacity-20 text-servora-navy" />
                      <p className="font-bold text-servora-navy not-italic">No Adjustment Vouchers Recorded</p>
                      <p className="text-xs text-gray-500 not-italic">
                        New tenants start with an empty GL adjustment book. Click <strong>New Adjustment Voucher</strong> to propose a write-off or balance correction.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-servora-navy block">{adj.adjustmentNumber}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(adj.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-servora-navy block">{adj.adjustmentType.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{adj.reasonCode.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-servora-navy block">{adj.createdByName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{adj.branchName || 'Main Outlet'}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      <span className="text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200 block w-max mb-0.5">
                        Dr: {adj.debitGlAccount}
                      </span>
                      <span className="text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200 block w-max">
                        Cr: {adj.creditGlAccount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                      KES {adj.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">{getStatusBadge(adj.status)}</td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {adj.approverName ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <ShieldCheck size={12} /> {adj.approverName}
                        </span>
                      ) : (
                        <span className="text-gray-400">Awaiting Sign-off</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {adj.status === 'PENDING_APPROVAL' || adj.status === 'APPROVED' ? (
                        <button
                          onClick={() => setSelectedAdjustmentForReview(adj)}
                          className="px-2.5 py-1 bg-slate-50 border border-gray-200 hover:bg-gray-100 font-bold rounded-lg transition-colors text-[11px] text-servora-navy cursor-pointer"
                        >
                          Review Voucher
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-gray-400">Locked</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL: CREATE ADJUSTMENT VOUCHER (MAKER) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Propose Financial Adjustment Voucher</h3>
                <p className="text-[11px] text-gray-400">Maker-Checker GL Journal Adjustment</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Adjustment Type *</label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="TILL_VARIANCE_WRITE_OFF">Till Variance Write-Off</option>
                    <option value="PAYROLL_LABOR_DEDUCTION">Staff Payroll Clawback</option>
                    <option value="TIP_POOL_CORRECTION">Tip Pool Distribution Adjustment</option>
                    <option value="BANK_RECON_VARIANCE">Bank Reconciliation Drift</option>
                    <option value="VENDOR_AP_CREDIT">Vendor AP Debit Adjustment</option>
                    <option value="GUEST_AR_WRITE_DOWN">Guest Credit Write-Down</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Reason Code *</label>
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="DRAWER_DISCREPANCY">Drawer Cash Discrepancy</option>
                    <option value="COUNTERFEIT_NOTE">Counterfeit Note Confiscation</option>
                    <option value="UNRESOLVED_DRIFT">Unresolved Shift Drift</option>
                    <option value="BANK_FEE_CORRECTION">Bank Processing Fee Variance</option>
                    <option value="TRANSACTION_CORRECTION">Pos System Rounding Discrepancy</option>
                    <option value="STAFF_SHORTAGE_RECOVERY">Staff Shift Shortage Recovery</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Adjustment Amount (KES) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-servora-navy focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Linked Till Shift ID (Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 14"
                    value={shiftIdInput}
                    onChange={(e) => setShiftIdInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Debit General Ledger Account *</label>
                  <input
                    type="text"
                    required
                    value={debitGlAccount}
                    onChange={(e) => setDebitGlAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Credit General Ledger Account *</label>
                  <input
                    type="text"
                    required
                    value={creditGlAccount}
                    onChange={(e) => setCreditGlAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Audit Justification & Remarks *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detail the root cause of the variance and operational verification completed..."
                  value={justificationNotes}
                  onChange={(e) => setJustificationNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !amount || !justificationNotes}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Voucher for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: CHECKER AUDIT & POSTING COCKPIT */}
      {selectedAdjustmentForReview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Maker-Checker Sign-Off</h3>
                <p className="text-[11px] text-gray-400">Voucher: {selectedAdjustmentForReview.adjustmentNumber}</p>
              </div>
              <button onClick={() => setSelectedAdjustmentForReview(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-100 font-mono text-xs space-y-1.5">
              <div className="flex justify-between text-gray-500">
                <span>Maker (Author):</span>
                <span className="font-bold text-servora-navy">{selectedAdjustmentForReview.createdByName}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Category:</span>
                <span className="font-bold text-purple-700">{selectedAdjustmentForReview.adjustmentType.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Debit GL:</span>
                <span>{selectedAdjustmentForReview.debitGlAccount}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Credit GL:</span>
                <span>{selectedAdjustmentForReview.creditGlAccount}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-servora-navy">
                <span>Impact Amount:</span>
                <span className="text-sm text-rose-700">KES {selectedAdjustmentForReview.amount.toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-gray-600 font-sans pt-1 border-t border-gray-200">
                <strong>Justification:</strong> {selectedAdjustmentForReview.justificationNotes}
              </div>
            </div>

            {selectedAdjustmentForReview.status === 'PENDING_APPROVAL' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Decline Justification (If Rejecting Entry)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Incomplete supporting receipts, incorrect GL allocation..."
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleReviewAction('REJECT')}
                    className="flex-1 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Decline Adjustment
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleReviewAction('APPROVE')}
                    className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                  >
                    Approve Entry
                  </button>
                </div>
              </div>
            ) : selectedAdjustmentForReview.status === 'APPROVED' ? (
              <div className="space-y-3 text-xs">
                <p className="text-gray-500">
                  This voucher has been verified by controller{' '}
                  <strong className="text-servora-navy">{selectedAdjustmentForReview.approverName || 'Checker'}</strong> and is ready for final GL journal posting.
                </p>

                <button
                  disabled={isSubmitting}
                  onClick={() => handleReviewAction('POST')}
                  className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting...' : 'Post Entry to General Ledger'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}