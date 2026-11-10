'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Building,
  Plus,
  RefreshCw,
  Search,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  FileText,
  BadgeAlert,
  Coins,
  Send,
  X,
  FileCheck2,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface PayableRecord {
  id: number;
  invoiceNumber: string;
  internalRef: string;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'DISPUTED';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  invoiceDate: string;
  dueDate: string;
  notes: string | null;
  supplierId: number;
  supplierName: string;
  supplierKraPin: string | null;
  supplierPaymentTerms: string;
  poNumber: string | null;
  grnNumber: string | null;
  branchName: string | null;
  createdByName: string | null;
}

interface PayablesTelemetry {
  totalInvoicesCount: number;
  unpaidInvoicesCount: number;
  totalOutstandingKes: number;
  totalPaidDisbursedKes: number;
  agingBrackets: {
    currentDueKes: number;
    overdue30Kes: number;
    overdue60Kes: number;
    overdue90PlusKes: number;
  };
}

interface SupplierOption {
  id: number;
  name: string;
  kraPin: string | null;
  paymentTerms: string;
}

export default function PayablesPage() {
  const [invoices, setInvoices] = useState<PayableRecord[]>([]);
  const [telemetry, setTelemetry] = useState<PayablesTelemetry | null>(null);
  const [suppliersList, setSuppliersList] = useState<SupplierOption[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [agingFilter, setAgingFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Disbursement Modal
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<PayableRecord | null>(null);
  const [disbursementAmount, setDisbursementAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'MPESA_B2B' | 'BANK_TRANSFER' | 'CHEQUE' | 'CASH_DRAWER'>('MPESA_B2B');
  const [clearingAccount, setClearingAccount] = useState<string>('Safaricom B2B Paybill 55210');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Vendor Bill Modal
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [billInvoiceNumber, setBillInvoiceNumber] = useState<string>('');
  const [billSubtotal, setBillSubtotal] = useState<string>('');
  const [billTaxAmount, setBillTaxAmount] = useState<string>('0');
  const [billInvoiceDate, setBillInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [billDueDate, setBillDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [billNotes, setBillNotes] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;

      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (agingFilter !== 'ALL') params.set('agingBucket', agingFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (activeBranchId) params.set('branchId', activeBranchId);

      const [listRes, telemetryRes, suppliersRes] = await Promise.all([
        fetchApi(`/api/v1/finance/payables?${params.toString()}`),
        fetchApi(`/api/v1/finance/payables/metrics${activeBranchId ? `?branchId=${activeBranchId}` : ''}`),
        fetchApi('/api/v1/suppliers'),
      ]);

      if (listRes?.data?.invoices) setInvoices(listRes.data.invoices);
      if (telemetryRes?.data) setTelemetry(telemetryRes.data);
      if (suppliersRes?.data) {
        setSuppliersList(suppliersRes.data);
        if (!selectedSupplierId && suppliersRes.data.length > 0) {
          setSelectedSupplierId(String(suppliersRes.data[0].id));
        }
      }
    } catch (err: any) {
      console.error('Failed to load accounts payable ledger:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, agingFilter, searchQuery, selectedSupplierId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDisbursementModal = (inv: PayableRecord) => {
    setSelectedInvoiceForPay(inv);
    setDisbursementAmount(String(inv.remainingAmount));
    setTransactionRef('');
    setPaymentNotes('');
  };

  const handleDisbursementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPay) return;

    try {
      setIsSubmitting(true);
      const res = await fetchApi('/api/v1/finance/payables/disburse', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: selectedInvoiceForPay.id,
          paymentAmount: parseFloat(disbursementAmount) || 0,
          paymentMethod,
          clearingAccount,
          transactionReference: transactionRef.trim(),
          notes: paymentNotes.trim() || undefined,
        }),
      });

      setSelectedInvoiceForPay(null);
      setToastMessage({ text: res.message || 'Payment voucher disbursed.', type: 'success' });
      setTimeout(() => setToastMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Disbursement submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;

      const res = await fetchApi('/api/v1/finance/payables/bills', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId ? parseInt(activeBranchId, 10) : null,
          supplierId: parseInt(selectedSupplierId, 10),
          invoiceNumber: billInvoiceNumber.trim(),
          subtotal: parseFloat(billSubtotal) || 0,
          taxAmount: parseFloat(billTaxAmount) || 0,
          invoiceDate: billInvoiceDate,
          dueDate: billDueDate,
          notes: billNotes.trim() || undefined,
        }),
      });

      setIsBillModalOpen(false);
      setBillInvoiceNumber('');
      setBillSubtotal('');
      setBillNotes('');
      setToastMessage({ text: res.message || 'Vendor invoice registered.', type: 'success' });
      setTimeout(() => setToastMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create supplier invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'UNPAID':
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1 w-max"><AlertTriangle size={11} /> Unpaid</span>;
      case 'PARTIALLY_PAID':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1 w-max"><Clock size={11} /> Partially Settled</span>;
      case 'PAID':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1 w-max"><CheckCircle2 size={11} /> Settled (Paid)</span>;
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
            <span className="text-xs font-bold text-servora-navy">Treasury & Accounts Payable</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <CreditCard className="text-servora-core" size={24} />
            Supplier Payables, Bill Matching & AP Aging Ledger
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Workday/NetSuite P2P matching: 3-way reconciliation linking Purchase Orders (PO), GRNs, and vendor tax invoices with B2B M-Pesa disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => setIsBillModalOpen(true)}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> Enter Vendor Bill
          </button>
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
        <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. ENTERPRISE ACCOUNTS PAYABLE AGING SUMMARY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Open Payables</span>
            <p className="text-xl font-bold font-mono text-rose-700 mt-0.5">
              KES {telemetry ? telemetry.totalOutstandingKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">
              {telemetry?.unpaidInvoicesCount || 0} Bills Pending Settlement
            </span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <Coins size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Current (Not Overdue)</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              KES {telemetry ? telemetry.agingBrackets.currentDueKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Within Credit Terms</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Aging: 1-30 Days Past Due</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              KES {telemetry ? telemetry.agingBrackets.overdue30Kes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-amber-600 font-medium">Immediate Queue</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Critical: &gt;60 Days Overdue</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              KES {telemetry ? (telemetry.agingBrackets.overdue60Kes + telemetry.agingBrackets.overdue90PlusKes).toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-purple-600 font-medium">Vendor Credit Hold Hazard</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <BadgeAlert size={18} />
          </div>
        </div>
      </div>

      {/* 3. AGING BRACKET QUICK FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl font-bold">
            {(['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-white text-servora-navy shadow-xs' : 'text-gray-500 hover:text-black'
                }`}
              >
                {st === 'ALL' ? 'All Invoices' : st === 'UNPAID' ? 'Unpaid' : st === 'PARTIALLY_PAID' ? 'Partial' : 'Paid'}
              </button>
            ))}
          </div>

          <select
            value={agingFilter}
            onChange={(e) => setAgingFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Aging Horizons</option>
            <option value="CURRENT">Current (Within Term)</option>
            <option value="PAST_DUE_30">Past Due (1 - 30 Days)</option>
            <option value="PAST_DUE_60">Past Due (31 - 60 Days)</option>
            <option value="PAST_DUE_90_PLUS">Past Due (&gt; 60 Days Critical)</option>
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Search vendor, PIN, or bill number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-servora-core w-48 sm:w-64"
          />
        </div>
      </div>

      {/* 4. ACCOUNTS PAYABLE BILLS DIRECTORY */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Bill / Ref #</th>
                <th className="py-2.5 px-3">Supplier Name & KRA PIN</th>
                <th className="py-2.5 px-3">3-Way Match (PO / GRN)</th>
                <th className="py-2.5 px-3">Invoice Date</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-right">Bill Total</th>
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-right">Balance Due</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400 italic">
                    <div className="max-w-md mx-auto space-y-2">
                      <CreditCard size={36} className="mx-auto opacity-20 text-servora-navy" />
                      <p className="font-bold text-servora-navy not-italic">No Supplier Invoices on Record</p>
                      <p className="text-xs text-gray-500 not-italic">
                        New tenants start with an empty payables ledger. Click <strong>Enter Vendor Bill</strong> to record your first purveyor invoice.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isOverdue = new Date(inv.dueDate) < new Date() && inv.remainingAmount > 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-servora-navy block">{inv.invoiceNumber}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{inv.internalRef}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{inv.supplierName}</span>
                        {inv.supplierKraPin && (
                          <span className="text-[10px] text-gray-500 font-mono">PIN: {inv.supplierKraPin}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {inv.poNumber ? (
                          <span className="text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200 block w-max mb-0.5">
                            PO: {inv.poNumber}
                          </span>
                        ) : (
                          <span className="text-gray-400">Direct Bill</span>
                        )}
                        {inv.grnNumber && (
                          <span className="text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200 block w-max">
                            GRN: {inv.grnNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-600">
                        {new Date(inv.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-gray-600'}>
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                        KES {inv.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700">
                        KES {inv.paidAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className={inv.remainingAmount > 0 ? 'text-rose-600' : 'text-gray-400'}>
                          KES {inv.remainingAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(inv.status)}</td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {inv.remainingAmount > 0 ? (
                          <button
                            onClick={() => handleOpenDisbursementModal(inv)}
                            className="px-2.5 py-1 bg-servora-core text-white hover:bg-blue-700 font-bold rounded-lg transition-colors text-[11px] shadow-xs cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <Send size={11} /> Disburse Payment
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-emerald-700 font-bold flex items-center justify-end gap-1">
                            <CheckCircle2 size={13} /> Cleared
                          </span>
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

      {/* 5. MODAL: ENTER NEW VENDOR BILL */}
      {isBillModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Register Supplier Invoice (Bill)</h3>
                <p className="text-[11px] text-gray-400">Record purveyor invoice matching procurement terms</p>
              </div>
              <button onClick={() => setIsBillModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBill} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Select Purveyor / Supplier *</label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                >
                  {suppliersList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.kraPin ? `(PIN: ${s.kraPin})` : ''} &bull; Terms: {s.paymentTerms}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Vendor Invoice # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-90214-B"
                    value={billInvoiceNumber}
                    onChange={(e) => setBillInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Subtotal (KES) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={billSubtotal}
                    onChange={(e) => setBillSubtotal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">VAT Amount (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={billTaxAmount}
                    onChange={(e) => setBillTaxAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Bill Date *</label>
                  <input
                    type="date"
                    required
                    value={billInvoiceDate}
                    onChange={(e) => setBillInvoiceDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={billDueDate}
                    onChange={(e) => setBillDueDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Accounting Notes</label>
                <textarea
                  rows={2}
                  placeholder="Record delivery terms, invoice remarks, or intake receipts..."
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsBillModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !billInvoiceNumber || !billSubtotal}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting...' : 'Save & Post Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: OUTBOUND TREASURY DISBURSEMENT */}
      {selectedInvoiceForPay && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Outbound AP Payment Disbursement</h3>
                <p className="text-[11px] text-gray-400">Bill: {selectedInvoiceForPay.invoiceNumber} &bull; Supplier: {selectedInvoiceForPay.supplierName}</p>
              </div>
              <button onClick={() => setSelectedInvoiceForPay(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDisbursementSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-100 font-mono space-y-1">
                <div className="flex justify-between text-gray-500">
                  <span>Bill Total:</span>
                  <span className="font-bold text-servora-navy">KES {selectedInvoiceForPay.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Previously Cleared:</span>
                  <span className="text-emerald-700 font-bold">KES {selectedInvoiceForPay.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1 text-gray-700 font-bold">
                  <span>Remaining Due:</span>
                  <span className="text-rose-600">KES {selectedInvoiceForPay.remainingAmount.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Payment Amount to Disburse (KES) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={selectedInvoiceForPay.remainingAmount}
                  value={disbursementAmount}
                  onChange={(e) => setDisbursementAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-sm text-servora-navy focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="MPESA_B2B">M-Pesa B2B Paybill</option>
                    <option value="BANK_TRANSFER">Bank Wire / RTGS</option>
                    <option value="CHEQUE">Corporate Cheque</option>
                    <option value="CASH_DRAWER">Cash Safe Drop</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Transaction Ref / Slip # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. QK8912KL99 / CHQ-1049"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Disbursement Clearing Account *</label>
                <select
                  value={clearingAccount}
                  onChange={(e) => setClearingAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                >
                  <option value="Safaricom B2B Paybill 55210">Safaricom B2B Paybill 55210</option>
                  <option value="KCB Operating Account (KES)">KCB Operating Account (KES)</option>
                  <option value="Equity Corporate Clearing">Equity Corporate Clearing</option>
                  <option value="Main Store Vault (Safe A)">Main Store Vault (Safe A)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Disbursement Notes</label>
                <textarea
                  rows={2}
                  placeholder="Record receipt, supplier acknowledgment, or settlement notes..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPay(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !disbursementAmount || !transactionRef}
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting...' : 'Confirm Outbound Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}