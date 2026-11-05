'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Building2, 
  CheckCircle2, 
  Clock, 
  FileText, 
  X, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Landmark, 
  Smartphone, 
  Wallet,
  Receipt,
  Scale
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface RefundRecord {
  id: number;
  refundNumber: string;
  refundFlow: 'AR_CUSTOMER_REFUND' | 'AP_VENDOR_REFUND';
  status: 'APPROVED' | 'PROCESSED' | 'CANCELLED';
  refundMethod: string;
  clearingAccount: string;
  transactionReference: string | null;
  amount: string;
  restockItems: boolean;
  reasonCode: string;
  orderId: number | null;
  supplierId: number | null;
  supplierName: string | null;
  branchName: string | null;
  processedByEmail: string | null;
  notes: string | null;
  createdAt: string;
}

interface RefundSummary {
  totalRefundsCount: number;
  totalCustomerRefunds: number;
  totalVendorRefunds: number;
  netRefundOutflow: number;
}

interface SupplierOption {
  id: number;
  name: string;
}

const TREASURY_ACCOUNTS = [
  'M-Pesa B2B Corporate Paybill (55210)',
  'Equity Bank Operational Account (KES)',
  'KCB Bank Head Office Account',
  'Main Safe Petty Cash Drawer',
];

const REASON_CODES = [
  { id: 'DEFECTIVE_GOODS', label: 'Defective or Damaged Goods' },
  { id: 'CUSTOMER_CANCELLATION', label: 'Customer Order Cancellation' },
  { id: 'PRICING_DISPUTE', label: 'Pricing Discrepancy / Overcharge' },
  { id: 'WRONG_ITEM_DELIVERED', label: 'Incorrect Item / Wrong Specifications' },
  { id: 'DUPLICATE_CHARGE', label: 'Duplicate Settlement Charge' },
];

export default function RefundsPage() {
  const [refundsList, setRefundsList] = useState<RefundRecord[]>([]);
  const [summary, setSummary] = useState<RefundSummary | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [flowFilter, setFlowFilter] = useState<'ALL' | 'AR_CUSTOMER_REFUND' | 'AP_VENDOR_REFUND'>('ALL');

  // Inspect Modal
  const [activeRefund, setActiveRefund] = useState<RefundRecord | null>(null);

  // New Refund Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refundFlow, setRefundFlow] = useState<'AR_CUSTOMER_REFUND' | 'AP_VENDOR_REFUND'>('AR_CUSTOMER_REFUND');
  const [refundMethod, setRefundMethod] = useState<'MPESA_REFUND' | 'BANK_WIRE' | 'CASH_DRAWER'>('MPESA_REFUND');
  const [clearingAccount, setClearingAccount] = useState(TREASURY_ACCOUNTS[0]);
  const [amount, setAmount] = useState('');
  const [reasonCode, setReasonCode] = useState(REASON_CODES[0].id);
  const [restockItems, setRestockItems] = useState(true);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [refRes, supRes] = await Promise.all([
        fetchApi('/api/v1/payments/refunds'),
        fetchApi('/api/v1/suppliers').catch(() => ({ data: [] })),
      ]);

      if (refRes?.data) {
        setRefundsList(refRes.data.refunds || []);
        setSummary(refRes.data.summary || null);
      }
      if (supRes?.data) setSuppliers(supRes.data);
    } catch (err) {
      console.error('Failed to load refunds ledger:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setRefundFlow('AR_CUSTOMER_REFUND');
    setRefundMethod('MPESA_REFUND');
    setClearingAccount(TREASURY_ACCOUNTS[0]);
    setAmount('');
    setReasonCode(REASON_CODES[0].id);
    setRestockItems(true);
    setSelectedSupplierId(suppliers.length > 0 ? String(suppliers[0].id) : '');
    setTransactionRef('');
    setRefundNotes('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    try {
      await fetchApi('/api/v1/payments/refunds', {
        method: 'POST',
        body: JSON.stringify({
          refundFlow,
          refundMethod,
          clearingAccount,
          amount: parseFloat(amount),
          restockItems,
          reasonCode,
          supplierId: refundFlow === 'AP_VENDOR_REFUND' && selectedSupplierId ? parseInt(selectedSupplierId, 10) : undefined,
          transactionReference: transactionRef.trim() || undefined,
          notes: refundNotes || undefined,
        }),
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to post refund credit memo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRefunds = useMemo(() => {
    return refundsList.filter((r) => {
      const matchesSearch =
        r.refundNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.reasonCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.transactionReference && r.transactionReference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.supplierName && r.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        r.clearingAccount.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFlow = flowFilter === 'ALL' || r.refundFlow === flowFilter;

      return matchesSearch && matchesFlow;
    });
  }, [refundsList, searchTerm, flowFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-400">Finance & Treasury</span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-servora-navy">Refunds & Credit Memos</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Refunds & Returns Management</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Audit customer order refunds (AR), vendor credit memo collections (AP), and inventory restock reconciliations.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> Issue Refund / Credit Memo
        </button>
      </div>

      {/* Telemetry Metrics */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Customer Refunds (AR)</span>
              <h3 className="text-lg font-bold text-rose-700 mt-1">
                KES {summary.totalCustomerRefunds.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-rose-600 font-medium">Returned POS orders</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Vendor Credit Memos (AP)</span>
              <h3 className="text-lg font-bold text-emerald-700 mt-1">
                KES {summary.totalVendorRefunds.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-emerald-600 font-medium">Collected from suppliers</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Net Refund Outflow</span>
              <h3 className={`text-lg font-bold mt-1 ${summary.netRefundOutflow >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                KES {summary.netRefundOutflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-servora-deepTeal font-medium">Treasury impact delta</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
              <Scale size={20} />
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
            placeholder="Search refund #, reason code, transaction reference, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {[
            { id: 'ALL', label: 'All Refunds' },
            { id: 'AR_CUSTOMER_REFUND', label: 'Customer Refunds (AR)' },
            { id: 'AP_VENDOR_REFUND', label: 'Vendor Credit Memos (AP)' },
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

      {/* Refunds Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Connecting to enterprise refunds and credit memo journal...
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No refund records match your search filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3.5 px-4">Refund Document # & Date</th>
                  <th className="py-3.5 px-4">Direction & Type</th>
                  <th className="py-3.5 px-4">Reason Classification</th>
                  <th className="py-3.5 px-4">Clearing Channel</th>
                  <th className="py-3.5 px-4">Counterparty</th>
                  <th className="py-3.5 px-4 text-right">Amount (KES)</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredRefunds.map((r) => {
                  const amtNum = parseFloat(r.amount) || 0;
                  const isAR = r.refundFlow === 'AR_CUSTOMER_REFUND';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold block text-servora-navy">{r.refundNumber}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {isAR ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            <ArrowDownLeft size={11} /> AR Customer Refund
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <ArrowUpRight size={11} /> AP Vendor Credit
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-gray-800">
                        {r.reasonCode}
                      </td>

                      <td className="py-3.5 px-4 text-gray-600 truncate max-w-[180px]">
                        {r.clearingAccount}
                      </td>

                      <td className="py-3.5 px-4">
                        {r.supplierName ? (
                          <span className="font-bold text-servora-navy">{r.supplierName}</span>
                        ) : (
                          <span className="text-gray-400 italic">Walk-in POS Customer</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={isAR ? 'text-rose-700' : 'text-emerald-700'}>
                          KES {amtNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setActiveRefund(r)}
                          className="px-2.5 py-1 text-xs font-semibold text-servora-core hover:bg-servora-pale rounded-lg transition-colors"
                        >
                          Inspect &rarr;
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

      {/* INSPECT REFUND MODAL */}
      {activeRefund && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">{activeRefund.refundNumber}</h3>
                <p className="text-[11px] text-servora-deepTeal mt-0.5">
                  Flow: <strong>{activeRefund.refundFlow.replace('_', ' ')}</strong> | Method: <strong>{activeRefund.refundMethod}</strong>
                </p>
              </div>
              <button onClick={() => setActiveRefund(null)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-gray-200 rounded-xl text-xs">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Refund Amount</span>
                <span className="font-mono font-bold text-base text-servora-navy">
                  KES {parseFloat(activeRefund.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Reason Code</span>
                <span className="font-bold text-servora-core text-sm">
                  {activeRefund.reasonCode}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Restock Items</span>
                <span className="font-semibold text-gray-800">
                  {activeRefund.restockItems ? 'Yes (Returned to Stock)' : 'No (Scrap / Waste)'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Clearing Channel</span>
                <span className="font-semibold text-gray-800 truncate block">
                  {activeRefund.clearingAccount}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              {activeRefund.transactionReference && (
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-400">Transaction Reference:</span>
                  <span className="font-mono font-bold text-servora-navy">{activeRefund.transactionReference}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-400">Processed By:</span>
                <span>{activeRefund.processedByEmail || 'Treasury Officer'}</span>
              </div>
              {activeRefund.notes && (
                <div className="bg-gray-50 p-2.5 rounded-xl text-gray-500 text-[11px]">
                  <strong>Audit Notes:</strong> {activeRefund.notes}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveRefund(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POST REFUND MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Post Refund / Credit Memo Document</h3>
                <p className="text-[11px] text-servora-deepTeal">Issue customer refund or log vendor credit memo</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRefund} className="space-y-3.5">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Refund Flow *</label>
                  <select
                    value={refundFlow}
                    onChange={(e) => setRefundFlow(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-bold"
                  >
                    <option value="AR_CUSTOMER_REFUND">AR Customer Refund (-)</option>
                    <option value="AP_VENDOR_REFUND">AP Vendor Credit Memo (+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Disbursement Method *</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium"
                  >
                    <option value="MPESA_REFUND">M-Pesa Mobile Money Reversal</option>
                    <option value="BANK_WIRE">Bank EFT / Wire Transfer</option>
                    <option value="CASH_DRAWER">Cash Drawer / Safe Payout</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Treasury Clearing Account *</label>
                <select
                  value={clearingAccount}
                  onChange={(e) => setClearingAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium"
                >
                  {TREASURY_ACCOUNTS.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Refund Amount (KES) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 1500.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold font-mono focus:border-servora-core focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Reason Code *</label>
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium"
                  >
                    {REASON_CODES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {refundFlow === 'AP_VENDOR_REFUND' && (
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Vendor / Purveyor *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium"
                  >
                    <option value="">Select supplier master...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-gray-200 rounded-xl">
                <input
                  type="checkbox"
                  id="restock"
                  checked={restockItems}
                  onChange={(e) => setRestockItems(e.target.checked)}
                  className="w-4 h-4 text-servora-core rounded border-gray-300 focus:ring-servora-core"
                />
                <label htmlFor="restock" className="text-xs font-bold text-servora-navy cursor-pointer">
                  Re-integrate returned items back into live inventory stock
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Bank / M-Pesa Wire Reference #</label>
                <input
                  type="text"
                  placeholder="e.g. QK8912KL99"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono uppercase focus:border-servora-core focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Audit Justification Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Customer returned meal due to incorrect order specification"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting Document...' : 'Commit Credit Memo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}