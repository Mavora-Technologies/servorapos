'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Receipt,
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
  ExternalLink,
  X,
  CreditCard,
  FileText,
  BadgeAlert,
  ThumbsUp,
  ThumbsDown,
  ArrowUpRight,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ExpenseRecord {
  id: number;
  voucherNumber: string;
  expenseType: string;
  expenseDate: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  merchantTaxPin: string | null;
  receiptNumber: string | null;
  receiptAttachmentUrl: string | null;
  description: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID_DISBURSED';
  rejectionReason: string | null;
  paymentReference: string | null;
  categoryName: string;
  categoryCode: string;
  glAccountCode: string;
  claimantName: string;
  claimantEmail: string;
  branchName: string | null;
  approverName: string | null;
}

interface ExpenseCategory {
  id: number;
  code: string;
  name: string;
  glAccountCode: string;
  requiresReceipt: boolean;
  maxSingleLimit: string;
}

interface ExpenseMetrics {
  totalExpensesCount: number;
  pendingApprovalCount: number;
  pendingAmountKes: number;
  approvedPendingDisbursementKes: number;
  totalDisbursedPaidKes: number;
  rejectedCount: number;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [metrics, setMetrics] = useState<ExpenseMetrics | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Expense Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [taxAmount, setTaxAmount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH_DRAWER');
  const [payeeName, setPayeeName] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [merchantTaxPin, setMerchantTaxPin] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audit Approval Modal
  const [selectedExpenseForAudit, setSelectedExpenseForAudit] = useState<ExpenseRecord | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<string>('');
  const [disbursementRef, setDisbursementRef] = useState<string>('');

  const loadExpensesData = useCallback(async () => {
    try {
      setIsLoading(true);
      const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;

      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (activeBranchId) params.set('branchId', activeBranchId);

      const [expensesRes, metricsRes, categoriesRes] = await Promise.all([
        fetchApi(`/api/v1/finance/expenses?${params.toString()}`),
        fetchApi(`/api/v1/finance/expenses/metrics${activeBranchId ? `?branchId=${activeBranchId}` : ''}`),
        fetchApi('/api/v1/finance/expenses/categories'),
      ]);

      if (expensesRes?.data?.expenses) setExpenses(expensesRes.data.expenses);
      if (metricsRes?.data) setMetrics(metricsRes.data);
      if (categoriesRes?.data) {
        setCategories(categoriesRes.data);
        if (!selectedCategory && categoriesRes.data.length > 0) {
          setSelectedCategory(String(categoriesRes.data[0].id));
        }
      }
    } catch (err: any) {
      console.error('Failed to load expense ledger:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, selectedCategory]);

  useEffect(() => {
    loadExpensesData();
  }, [loadExpensesData]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;

      const res = await fetchApi('/api/v1/finance/expenses', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId ? parseInt(activeBranchId, 10) : null,
          categoryId: parseInt(selectedCategory, 10),
          expenseDate,
          amount: parseFloat(amount) || 0,
          taxAmount: parseFloat(taxAmount) || 0,
          paymentMethod,
          payeeName: payeeName.trim() || undefined,
          receiptNumber: receiptNumber.trim() || undefined,
          merchantTaxPin: merchantTaxPin.trim() || undefined,
          description: description.trim(),
        }),
      });

      setIsCreateModalOpen(false);
      setAmount('');
      setDescription('');
      setPayeeName('');
      setReceiptNumber('');
      setToastMessage({ text: res.message || 'Expense voucher submitted.', type: 'success' });
      setTimeout(() => setToastMessage(null), 4000);
      loadExpensesData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit expense voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (status: 'APPROVED' | 'REJECTED' | 'PAID_DISBURSED') => {
    if (!selectedExpenseForAudit) return;
    try {
      setIsSubmitting(true);
      const res = await fetchApi(`/api/v1/finance/expenses/${selectedExpenseForAudit.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          rejectionReason: status === 'REJECTED' ? rejectionNotes.trim() : undefined,
          paymentReference: status === 'PAID_DISBURSED' ? disbursementRef.trim() : undefined,
        }),
      });

      setSelectedExpenseForAudit(null);
      setRejectionNotes('');
      setDisbursementRef('');
      setToastMessage({ text: res.message || `Expense updated to ${status}.`, type: 'success' });
      setTimeout(() => setToastMessage(null), 4000);
      loadExpensesData();
    } catch (err: any) {
      alert(err.message || 'Failed to update expense approval status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1 w-max"><Clock size={11} /> Pending Review</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1 w-max"><ThumbsUp size={11} /> Approved (Ready for Pay)</span>;
      case 'PAID_DISBURSED':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1 w-max"><CheckCircle2 size={11} /> Disbursed</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1 w-max"><ThumbsDown size={11} /> Rejected</span>;
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
            <span className="text-xs font-bold text-servora-navy">Financial Accounting & Disbursements</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Receipt className="text-servora-core" size={24} />
            Corporate Expense Management & Employee Claims
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Workday-grade multi-tier review, GL account coding, KRA ETR receipt compliance, and automated payroll/petty cash disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> New Expense Voucher
          </button>
          <button
            onClick={loadExpensesData}
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

      {/* 2. CORPORATE TREASURY EXPENSE METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pending Review</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              KES {metrics ? metrics.pendingAmountKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">{metrics?.pendingApprovalCount || 0} Claims in Approval Queue</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Approved for Payout</span>
            <p className="text-xl font-bold font-mono text-blue-700 mt-0.5">
              KES {metrics ? metrics.approvedPendingDisbursementKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Ready for Cashier / B2C Pay</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <CreditCard size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Disbursed (Settled)</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              KES {metrics ? metrics.totalDisbursedPaidKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Cleared from General Ledger</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Rejected Claims</span>
            <p className="text-xl font-bold font-mono text-rose-700 mt-0.5">
              {metrics ? metrics.rejectedCount : 0} Claims
            </p>
            <span className="text-[10px] text-rose-600 font-medium">Failed Policy Verification</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <BadgeAlert size={18} />
          </div>
        </div>
      </div>

      {/* 3. WORKDAY EXPENSE LEDGER & FILTERS */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl font-bold">
            {(['ALL', 'SUBMITTED', 'APPROVED', 'PAID_DISBURSED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-white text-servora-navy shadow-xs' : 'text-gray-500 hover:text-black'
                }`}
              >
                {st === 'ALL'
                  ? 'All Claims'
                  : st === 'SUBMITTED'
                  ? 'Pending Review'
                  : st === 'APPROVED'
                  ? 'Approved'
                  : st === 'PAID_DISBURSED'
                  ? 'Disbursed'
                  : 'Declined'}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              placeholder="Search voucher, payee, or description..."
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
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Claimant / Staff</th>
                <th className="py-2.5 px-3">Category & GL Account</th>
                <th className="py-2.5 px-3">Description & Payee</th>
                <th className="py-2.5 px-3 text-right">Subtotal</th>
                <th className="py-2.5 px-3 text-right">Tax (VAT)</th>
                <th className="py-2.5 px-3 text-right">Total Payable</th>
                <th className="py-2.5 px-3">Lifecycle Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400 italic">
                    <div className="max-w-md mx-auto space-y-2">
                      <Receipt size={36} className="mx-auto opacity-20 text-servora-navy" />
                      <p className="font-bold text-servora-navy not-italic">No Expense Claims Recorded</p>
                      <p className="text-xs text-gray-500 not-italic">
                        New tenants start with zero synthetic entries. Click <strong>New Expense Voucher</strong> to submit an operational disbursement.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-servora-navy">{exp.voucherNumber}</td>
                    <td className="py-3 px-3 font-mono text-gray-600">{exp.expenseDate}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-servora-navy block">{exp.claimantName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{exp.branchName || 'Main Outlet'}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-servora-navy block">{exp.categoryName}</span>
                      <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                        GL: {exp.glAccountCode}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <p className="truncate font-medium text-gray-700">{exp.description}</p>
                      {exp.receiptNumber && (
                        <span className="text-[10px] text-gray-400 font-mono block">ETR/Rec: {exp.receiptNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-600">KES {exp.amount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-gray-500">KES {exp.taxAmount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                      KES {exp.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">{getStatusBadge(exp.status)}</td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {exp.status === 'SUBMITTED' || exp.status === 'APPROVED' ? (
                        <button
                          onClick={() => setSelectedExpenseForAudit(exp)}
                          className="px-2.5 py-1 bg-slate-50 border border-gray-200 hover:bg-gray-100 font-bold rounded-lg transition-colors text-[11px] text-servora-navy cursor-pointer"
                        >
                          Review & Action
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-mono">Archived</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL: SUBMIT NEW EXPENSE CLAIM */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">New Corporate Expense Voucher</h3>
                <p className="text-[11px] text-gray-400">Submit employee reimbursement or petty cash disbursement</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Expense Category *</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (GL: {c.glAccountCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Base Amount (KES) *</label>
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">VAT / Tax Portion (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-gray-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Settlement Tender *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="CASH_DRAWER">Cash Drawer / Safe Drop</option>
                    <option value="MPESA_B2C">M-Pesa Direct Disbursement</option>
                    <option value="BANK_WIRE">Bank EFT / Wire</option>
                    <option value="PETTY_CASH">Petty Cash Vault</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Payee / Merchant Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Kenya Power, Local Supermarket"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">ETR / Receipt Number</label>
                  <input
                    type="text"
                    placeholder="e.g. REC-99214"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Merchant KRA Tax PIN</label>
                  <input
                    type="text"
                    placeholder="e.g. P051234567X"
                    value={merchantTaxPin}
                    onChange={(e) => setMerchantTaxPin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Detailed Business Purpose *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="State the justification, operational department, and reason for this expenditure..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  disabled={isSubmitting || !amount || !description}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Voucher for Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: SUPERVISOR AUDIT & DISBURSEMENT COCKPIT */}
      {selectedExpenseForAudit && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Audit Expense Claim</h3>
                <p className="text-[11px] text-gray-400">Voucher: {selectedExpenseForAudit.voucherNumber}</p>
              </div>
              <button onClick={() => setSelectedExpenseForAudit(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-100 font-mono text-xs space-y-1.5">
              <div className="flex justify-between text-gray-500">
                <span>Claimant:</span>
                <span className="font-bold text-servora-navy">{selectedExpenseForAudit.claimantName}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Category / GL:</span>
                <span className="font-bold text-purple-700">{selectedExpenseForAudit.categoryName} ({selectedExpenseForAudit.glAccountCode})</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Base Amount:</span>
                <span>KES {selectedExpenseForAudit.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>VAT / Tax Portion:</span>
                <span>KES {selectedExpenseForAudit.taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-servora-navy">
                <span>Total Payable:</span>
                <span className="text-sm text-emerald-700">KES {selectedExpenseForAudit.totalAmount.toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-gray-600 font-sans pt-1 border-t border-gray-200">
                <strong>Justification:</strong> {selectedExpenseForAudit.description}
              </div>
            </div>

            {selectedExpenseForAudit.status === 'SUBMITTED' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Rejection Notes (If Declining Claim)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Non-compliant receipt, limit exceeded..."
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleUpdateStatus('REJECTED')}
                    className="flex-1 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Decline Claim
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleUpdateStatus('APPROVED')}
                    className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                  >
                    Approve for Payout
                  </button>
                </div>
              </div>
            ) : selectedExpenseForAudit.status === 'APPROVED' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Disbursement Reference (M-Pesa / Cheque #) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MPESA-QKL291882 / CHQ-0021"
                    value={disbursementRef}
                    onChange={(e) => setDisbursementRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <button
                  disabled={isSubmitting || !disbursementRef}
                  onClick={() => handleUpdateStatus('PAID_DISBURSED')}
                  className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Cash / Digital Disbursement'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}