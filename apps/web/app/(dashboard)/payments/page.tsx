'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  CreditCard, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Building2, 
  CheckCircle2, 
  Clock, 
  FileText, 
  AlertOctagon, 
  X, 
  RotateCcw, 
  ChevronRight, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Landmark, 
  Smartphone, 
  Wallet,
  Receipt,
  ShieldCheck,
  Check,
  AlertTriangle,
  Scale
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface PaymentRecord {
  id: number;
  paymentNumber: string;
  paymentFlow: 'OUTBOUND_AP' | 'INBOUND_AR';
  status: 'POSTED' | 'RECONCILED' | 'CANCELLED_REVERSED' | 'BOUNCED';
  paymentMethod: 'MPESA_B2B' | 'BANK_TRANSFER' | 'CHEQUE' | 'CASH_DRAWER' | 'CREDIT_CARD';
  clearingAccount: string;
  transactionReference: string | null;
  currency: string;
  amount: string;
  supplierId: number | null;
  supplierName: string | null;
  supplierInvoiceId: number | null;
  invoiceNumber: string | null;
  orderId: number | null;
  branchName: string | null;
  processedByEmail: string | null;
  isReversed: boolean;
  reversedPaymentId: number | null;
  reconciledAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface PaymentSummary {
  totalTransactions: number;
  totalOutboundAP: number;
  totalInboundAR: number;
  netTreasuryCashFlow: number;
  unreconciledCount: number;
}

interface OpenInvoiceOption {
  id: number;
  invoiceNumber: string;
  supplierName: string;
  totalAmount: string;
  paidAmount: string;
  balanceRemaining?: number;
}

interface SupplierOption {
  id: number;
  name: string;
}

const TREASURY_ACCOUNTS = [
  'M-Pesa B2B Corporate Paybill (55210)',
  'Equity Bank Operational Account (KES)',
  'KCB Bank Head Office Account',
  'NCBA Bank Multi-Currency Reserve',
  'Main Safe Petty Cash Drawer',
];

export default function PaymentsPage() {
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoiceOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [flowFilter, setFlowFilter] = useState<'ALL' | 'OUTBOUND_AP' | 'INBOUND_AR'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Inspect Modal
  const [activePayment, setActivePayment] = useState<PaymentRecord | null>(null);

  // New Payment Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [paymentFlow, setPaymentFlow] = useState<'OUTBOUND_AP' | 'INBOUND_AR'>('OUTBOUND_AP');
  const [paymentMethod, setPaymentMethod] = useState<PaymentRecord['paymentMethod']>('MPESA_B2B');
  const [clearingAccount, setClearingAccount] = useState(TREASURY_ACCOUNTS[0]);
  const [amount, setAmount] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Dedicated Enterprise Reconcile Modal State (Replaces prompt)
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [reconcilingPayment, setReconcilingPayment] = useState<PaymentRecord | null>(null);
  const [bankStatementRef, setBankStatementRef] = useState('');
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0]);
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);

  // Dedicated Storno Reversal Modal State (Replaces prompt)
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [reversingPayment, setReversingPayment] = useState<PaymentRecord | null>(null);
  const [reversalReasonCode, setReversalReasonCode] = useState('WRONG_BENEFICIARY_AMOUNT');
  const [reversalNotes, setReversalNotes] = useState('');
  const [isReversing, setIsReversing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pmtRes, invRes, supRes] = await Promise.all([
        fetchApi('/api/v1/payments'),
        fetchApi('/api/v1/purchasing/invoices').catch(() => ({ data: [] })),
        fetchApi('/api/v1/suppliers').catch(() => ({ data: [] })),
      ]);

      if (pmtRes?.data) {
        setPaymentsList(pmtRes.data.payments || []);
        setSummary(pmtRes.data.summary || null);
      }
      if (invRes?.data) {
        const rawInvoices = invRes.data.invoices || invRes.data || [];
        setOpenInvoices(rawInvoices.filter((i: any) => i.status !== 'PAID'));
      }
      if (supRes?.data) setSuppliers(supRes.data);
    } catch (err) {
      console.error('Failed to load payments ledger:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setPaymentFlow('OUTBOUND_AP');
    setPaymentMethod('MPESA_B2B');
    setClearingAccount(TREASURY_ACCOUNTS[0]);
    setAmount('');
    setTransactionRef('');
    setSelectedSupplierId(suppliers.length > 0 ? String(suppliers[0].id) : '');
    setSelectedInvoiceId('');
    setPaymentNotes('');
    setModalError(null);
    setIsNewModalOpen(true);
  };

  const handleInvoiceSelect = (invIdStr: string) => {
    setSelectedInvoiceId(invIdStr);
    const invoice = openInvoices.find((i) => String(i.id) === invIdStr);
    if (invoice) {
      const total = parseFloat(invoice.totalAmount) || 0;
      const paid = parseFloat(invoice.paidAmount) || 0;
      const balance = Math.max(0, total - paid);
      setAmount(String(balance));
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    try {
      await fetchApi('/api/v1/payments', {
        method: 'POST',
        body: JSON.stringify({
          paymentFlow,
          paymentMethod,
          clearingAccount,
          amount: parseFloat(amount),
          transactionReference: transactionRef.trim() || undefined,
          supplierId: selectedSupplierId ? parseInt(selectedSupplierId, 10) : undefined,
          supplierInvoiceId: selectedInvoiceId ? parseInt(selectedInvoiceId, 10) : undefined,
          notes: paymentNotes || undefined,
        }),
      });

      setIsNewModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to post payment transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Enterprise Reconciliation Dialog
  const openReconcileDialog = (p: PaymentRecord) => {
    setReconcilingPayment(p);
    setBankStatementRef(p.transactionReference ? `BNK-${p.transactionReference}` : `STMT-${Date.now().toString().slice(-4)}`);
    setStatementDate(new Date().toISOString().split('T')[0]);
    setReconcileNotes('');
    setIsReconcileModalOpen(true);
  };

  const handleConfirmReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcilingPayment) return;

    setIsReconciling(true);
    try {
      const fullReference = `${bankStatementRef.trim()} (Date: ${statementDate})${reconcileNotes ? ` - ${reconcileNotes}` : ''}`;
      await fetchApi(`/api/v1/payments/${reconcilingPayment.id}/reconcile`, {
        method: 'PATCH',
        body: JSON.stringify({ bankStatementRef: fullReference }),
      });

      setIsReconcileModalOpen(false);
      setReconcilingPayment(null);
      if (activePayment && activePayment.id === reconcilingPayment.id) {
        setActivePayment({ ...activePayment, status: 'RECONCILED', reconciledAt: new Date().toISOString() });
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reconcile payment');
    } finally {
      setIsReconciling(false);
    }
  };

  // Open Enterprise Storno Reversal Dialog
  const openReverseDialog = (p: PaymentRecord) => {
    setReversingPayment(p);
    setReversalReasonCode('WRONG_BENEFICIARY_AMOUNT');
    setReversalNotes('');
    setIsReverseModalOpen(true);
  };

  const handleConfirmReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingPayment) return;

    setIsReversing(true);
    try {
      const fullReason = `[${reversalReasonCode}] ${reversalNotes || 'Administrative Storno Reversal'}`.trim();
      await fetchApi(`/api/v1/payments/${reversingPayment.id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason: fullReason }),
      });

      setIsReverseModalOpen(false);
      setReversingPayment(null);
      setActivePayment(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reverse payment');
    } finally {
      setIsReversing(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return paymentsList.filter((p) => {
      const matchesSearch =
        p.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.clearingAccount.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFlow = flowFilter === 'ALL' || p.paymentFlow === flowFilter;
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

      return matchesSearch && matchesFlow && matchesStatus;
    });
  }, [paymentsList, searchTerm, flowFilter, statusFilter]);

  const getMethodIcon = (method: PaymentRecord['paymentMethod']) => {
    switch (method) {
      case 'MPESA_B2B':
        return <Smartphone size={13} className="text-emerald-600" />;
      case 'BANK_TRANSFER':
        return <Landmark size={13} className="text-blue-600" />;
      case 'CHEQUE':
        return <FileText size={13} className="text-purple-600" />;
      case 'CASH_DRAWER':
        return <Wallet size={13} className="text-amber-600" />;
      default:
        return <CreditCard size={13} className="text-gray-600" />;
    }
  };

  const getStatusBadge = (p: PaymentRecord) => {
    if (p.isReversed || p.status === 'CANCELLED_REVERSED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 line-through">
          <RotateCcw size={10} /> Reversed
        </span>
      );
    }
    switch (p.status) {
      case 'RECONCILED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={10} /> Bank Cleared
          </span>
        );
      case 'POSTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={10} /> Posted Unreconciled
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
            {p.status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-400">Finance & Treasury</span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-servora-navy">Payments Journal</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Payments & Treasury Operations</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Audit outbound supplier disbursements (AP), bank clearings, M-Pesa B2B channels, and cash ledger reconciliations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/payments/reconciliation"
            className="px-3.5 py-2.5 text-xs font-bold text-servora-core bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100 inline-flex items-center gap-1.5"
          >
            <Scale size={14} />
            Reconciliation Workbench
          </Link>
          <button
            onClick={openCreateModal}
            className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={15} /> Post Payment Document
          </button>
        </div>
      </div>

      {/* Treasury Telemetry Metrics */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Outbound AP Payouts</span>
              <h3 className="text-lg font-bold text-rose-700 mt-1">
                KES {summary.totalOutboundAP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-rose-600 font-medium">Disbursed to suppliers</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Inbound Receipts (AR)</span>
              <h3 className="text-lg font-bold text-emerald-700 mt-1">
                KES {summary.totalInboundAR.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-emerald-600 font-medium">Customer collections</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Net Cash Position</span>
              <h3 className={`text-lg font-bold mt-1 ${summary.netTreasuryCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                KES {summary.netTreasuryCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-servora-deepTeal font-medium">Treasury liquidity delta</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Pending Bank Clearing</span>
              <h3 className="text-lg font-bold text-amber-700 mt-1">{summary.unreconciledCount} Documents</h3>
              <span className="text-[11px] text-amber-600 font-medium">Awaiting bank statement</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search payment #, bank reference, M-Pesa code, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {[
            { id: 'ALL', label: 'All Payments' },
            { id: 'OUTBOUND_AP', label: 'Supplier Outflow (AP)' },
            { id: 'INBOUND_AR', label: 'Collections (AR)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFlowFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                flowFilter === tab.id ? 'bg-white shadow-xs text-servora-navy font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Connecting to enterprise treasury and banking journal...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No payment transaction records match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3.5 px-4">Document # & Date</th>
                  <th className="py-3.5 px-4">Flow & Direction</th>
                  <th className="py-3.5 px-4">Treasury Clearing Channel</th>
                  <th className="py-3.5 px-4">Transaction / Receipt Ref</th>
                  <th className="py-3.5 px-4">Counterparty / Invoice Ref</th>
                  <th className="py-3.5 px-4 text-right">Amount (KES)</th>
                  <th className="py-3.5 px-4">Clearing Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredPayments.map((p) => {
                  const amtNum = parseFloat(p.amount) || 0;
                  const isOutbound = p.paymentFlow === 'OUTBOUND_AP';

                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-slate-50/70 transition-colors ${
                        p.isReversed ? 'opacity-50 bg-gray-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold block text-servora-navy">{p.paymentNumber}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {isOutbound ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            <ArrowDownLeft size={11} /> Outbound AP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <ArrowUpRight size={11} /> Inbound AR
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium">
                          {getMethodIcon(p.paymentMethod)}
                          <span className="truncate max-w-[170px]">{p.clearingAccount}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-servora-navy text-[11px]">
                        {p.transactionReference || <span className="text-gray-400 font-normal italic">None Recorded</span>}
                      </td>

                      <td className="py-3.5 px-4">
                        {p.supplierName ? (
                          <div>
                            <span className="font-bold text-servora-navy block">{p.supplierName}</span>
                            {p.invoiceNumber && (
                              <span className="text-[10px] font-mono text-servora-core">Inv: {p.invoiceNumber}</span>
                            )}
                          </div>
                        ) : p.orderId ? (
                          <span className="font-mono text-blue-600">POS Order #{p.orderId}</span>
                        ) : (
                          <span className="text-gray-400 italic">Direct Cash Entry</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={isOutbound ? 'text-rose-700' : 'text-emerald-700'}>
                          {isOutbound ? '-' : '+'}KES {Math.abs(amtNum).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(p)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === 'POSTED' && !p.isReversed && (
                            <button
                              onClick={() => openReconcileDialog(p)}
                              className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors inline-flex items-center gap-1"
                              title="Reconcile to Bank"
                            >
                              <CheckCircle2 size={12} /> Clear
                            </button>
                          )}
                          <button
                            onClick={() => setActivePayment(p)}
                            className="px-2.5 py-1 text-xs font-semibold text-servora-core hover:bg-servora-pale rounded-lg transition-colors"
                          >
                            Inspect &rarr;
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT PAYMENT MODAL */}
      {activePayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-servora-navy">{activePayment.paymentNumber}</h3>
                  {getStatusBadge(activePayment)}
                </div>
                <p className="text-[11px] text-servora-deepTeal mt-0.5">
                  Flow: <strong>{activePayment.paymentFlow.replace('_', ' ')}</strong> | Channel: <strong>{activePayment.paymentMethod}</strong>
                </p>
              </div>
              <button onClick={() => setActivePayment(null)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            {/* Financial Details Box */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-gray-200 rounded-xl text-xs">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Disbursed Amount</span>
                <span className="font-mono font-bold text-base text-servora-navy">
                  KES {parseFloat(activePayment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Transaction Reference</span>
                <span className="font-mono font-bold text-sm text-servora-navy">
                  {activePayment.transactionReference || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Counterparty</span>
                <span className="font-semibold text-gray-800">
                  {activePayment.supplierName || 'Cash Collection'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Allocated Bill</span>
                <span className="font-mono font-bold text-servora-core">
                  {activePayment.invoiceNumber ? `Invoice #${activePayment.invoiceNumber}` : 'General Settlement'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-400">Clearing Treasury Channel:</span>
                <span className="font-semibold">{activePayment.clearingAccount}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-400">Processed By:</span>
                <span>{activePayment.processedByEmail || 'Treasury Officer'}</span>
              </div>
              {activePayment.reconciledAt && (
                <div className="flex justify-between border-b border-gray-100 pb-1.5 text-emerald-700 font-semibold">
                  <span>Reconciled to Bank Statement On:</span>
                  <span>{new Date(activePayment.reconciledAt).toLocaleDateString()}</span>
                </div>
              )}
              {activePayment.notes && (
                <div className="bg-gray-50 p-2.5 rounded-xl text-gray-500 text-[11px]">
                  <strong>Audit Notes:</strong> {activePayment.notes}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActivePayment(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {activePayment.status === 'POSTED' && !activePayment.isReversed && (
                  <button
                    onClick={() => {
                      const p = activePayment;
                      setActivePayment(null);
                      openReconcileDialog(p);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    <CheckCircle2 size={13} /> Reconcile to Bank
                  </button>
                )}

                {!activePayment.isReversed && (
                  <button
                    onClick={() => {
                      const p = activePayment;
                      setActivePayment(null);
                      openReverseDialog(p);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors"
                  >
                    <RotateCcw size={13} /> Compensating Storno Reversal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ENTERPRISE BANK RECONCILIATION MODAL (Replaces prompt()) */}
      {isReconcileModalOpen && reconcilingPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Landmark size={16} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-servora-navy">Bank Statement Clearance</h3>
                </div>
                <p className="text-[11px] text-servora-deepTeal">
                  Clear voucher <strong>{reconcilingPayment.paymentNumber}</strong> against bank ledger
                </p>
              </div>
              <button onClick={() => setIsReconcileModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            {/* Reconciliation Snapshot */}
            <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction Value:</span>
                <span className="font-mono font-bold text-servora-navy">
                  KES {parseFloat(reconcilingPayment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Clearing Channel:</span>
                <span className="font-medium text-gray-800">{reconcilingPayment.clearingAccount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">System Transaction Ref:</span>
                <span className="font-mono font-bold text-servora-core">
                  {reconcilingPayment.transactionReference || 'None Provided'}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmReconcile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">
                  Bank Statement Reference / RRN Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STMT-2026-NOV-04 or Bank Slip #9928"
                  value={bankStatementRef}
                  onChange={(e) => setBankStatementRef(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:border-servora-core focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">
                  Statement Value Date *
                </label>
                <input
                  type="date"
                  required
                  value={statementDate}
                  onChange={(e) => setStatementDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:border-servora-core focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">
                  Reconciliation Audit Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Confirmed on Equity Corporate Internet Banking"
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReconcileModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReconciling}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Check size={14} />
                  {isReconciling ? 'Reconciling...' : 'Confirm Bank Clearance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENTERPRISE STORNO REVERSAL MODAL (Replaces prompt()) */}
      {isReverseModalOpen && reversingPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <RotateCcw size={16} className="text-rose-600" />
                  <h3 className="text-sm font-bold text-servora-navy">Compensating Storno Reversal</h3>
                </div>
                <p className="text-[11px] text-servora-deepTeal">
                  Reverse payment <strong>{reversingPayment.paymentNumber}</strong> with full audit trail
                </p>
              </div>
              <button onClick={() => setIsReverseModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <AlertTriangle size={13} /> Irreversible Accounting Action
              </span>
              <p className="text-[11px]">
                A compensating opposite transaction will be generated in the material ledger and any linked Accounts Payable balance will be restored.
              </p>
            </div>

            <form onSubmit={handleConfirmReverse} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">
                  Reversal Classification Reason *
                </label>
                <select
                  value={reversalReasonCode}
                  onChange={(e) => setReversalReasonCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium focus:border-servora-core focus:outline-none"
                >
                  <option value="WRONG_BENEFICIARY_AMOUNT">Wrong Beneficiary or Amount Disbursed</option>
                  <option value="BOUNCED_TRANSACTION">Bounced Bank Wire / Rejected M-Pesa</option>
                  <option value="DUPLICATE_PAYMENT">Duplicate Payment Voucher Issued</option>
                  <option value="SUPPLIER_DISPUTE">Supplier Invoice Dispute / Bill Revoked</option>
                  <option value="FRAUD_PREVENTION">Security / Fraud Prevention Revocation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">
                  Audit Justification Details *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Provide detailed explanation for internal compliance review..."
                  value={reversalNotes}
                  onChange={(e) => setReversalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReverseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReversing}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  {isReversing ? 'Reversing...' : 'Post Storno Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST PAYMENT MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Post Treasury Payment Document</h3>
                <p className="text-[11px] text-servora-deepTeal">Record vendor disbursements (AP) or cash receipts (AR)</p>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-3.5">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Payment Flow *</label>
                  <select
                    value={paymentFlow}
                    onChange={(e) => {
                      setPaymentFlow(e.target.value as any);
                      setSelectedInvoiceId('');
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-bold"
                  >
                    <option value="OUTBOUND_AP">OUTBOUND AP: Supplier Payout (-)</option>
                    <option value="INBOUND_AR">INBOUND AR: Cash Collection (+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Disbursement Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="MPESA_B2B">M-Pesa B2B Paybill / Buy Goods</option>
                    <option value="BANK_TRANSFER">Bank EFT / RTGS Wire</option>
                    <option value="CHEQUE">Corporate Company Cheque</option>
                    <option value="CASH_DRAWER">Cash Drawer / Petty Cash</option>
                    <option value="CREDIT_CARD">Corporate Debit / Credit Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Treasury Clearing Account *</label>
                <select
                  value={clearingAccount}
                  onChange={(e) => setClearingAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                >
                  {TREASURY_ACCOUNTS.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Allocation if Outbound AP */}
              {paymentFlow === 'OUTBOUND_AP' && openInvoices.length > 0 && (
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
                  <label className="block text-[11px] font-bold text-servora-navy">
                    Allocate to Open Supplier Invoice (Optional)
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="">Unallocated supplier prepayment / on-account</option>
                    {openInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.supplierName} (Balance: KES {inv.balanceRemaining?.toLocaleString() || (parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount)).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Disbursement Amount (KES) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 45000.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">M-Pesa / Bank Wire Ref #</label>
                  <input
                    type="text"
                    placeholder="e.g. QK8912KL99"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono uppercase focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              {paymentFlow === 'OUTBOUND_AP' && (
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Beneficiary Purveyor</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Payment Purpose / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly dairy & meat purveyor settlement"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
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
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Posting Document...' : 'Commit Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}