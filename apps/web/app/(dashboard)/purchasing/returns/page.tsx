'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  RefreshCw, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  DollarSign, 
  ChevronRight, 
  Trash2, 
  Clock, 
  Building2, 
  FileText, 
  Truck, 
  Flame, 
  Snowflake, 
  ShieldAlert, 
  PackageX,
  CreditCard
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SupplierReturnHeader {
  id: number;
  returnNumber: string;
  debitNoteNumber: string | null;
  status: 'PENDING_DISPATCH' | 'DISPATCHED' | 'CREDITED' | 'REJECTED';
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  dispatchedAt: string | null;
  supplierId: number;
  supplierName: string;
  supplierKraPin: string | null;
  grnNumber: string | null;
  invoiceNumber: string | null;
  branchName: string | null;
  creatorEmail: string | null;
  notes: string | null;
  createdAt: string;
}

interface SupplierReturnItemLine {
  id: number;
  inventoryItemId: number;
  itemName: string;
  itemSku: string | null;
  itemUnit: string;
  quantity: string;
  unitCost: string;
  subtotal: string;
  reason: 'DEFECTIVE_SPOILED' | 'WRONG_ITEM' | 'BROKEN_PACKAGING' | 'TEMPERATURE_ABUSE' | 'OVER_DELIVERY';
  notes: string | null;
}

interface SupplierReturnDetail extends SupplierReturnHeader {
  supplierEmail: string | null;
  supplierPhone: string | null;
  items: SupplierReturnItemLine[];
}

interface ReturnsSummary {
  totalReturnsCount: number;
  totalCreditedAmount: number;
  pendingDispatchCount: number;
}

interface SupplierOption {
  id: number;
  name: string;
}

interface InventoryOption {
  id: number;
  name: string;
  unit: string;
  currentStock: string;
  costPrice: string;
}

export default function SupplierReturnsPage() {
  const [returns, setReturns] = useState<SupplierReturnHeader[]>([]);
  const [summary, setSummary] = useState<ReturnsSummary | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Detail Modal
  const [activeReturn, setActiveReturn] = useState<SupplierReturnDetail | null>(null);

  // New Return Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [debitNoteNumber, setDebitNoteNumber] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnItems, setReturnItems] = useState<{
    inventoryItemId: number;
    quantity: number;
    unitCost: number;
    reason: SupplierReturnItemLine['reason'];
  }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [retRes, supRes, invRes] = await Promise.all([
        fetchApi('/api/v1/purchasing/returns'),
        fetchApi('/api/v1/suppliers').catch(() => ({ data: [] })),
        fetchApi('/api/v1/inventory'),
      ]);

      if (retRes?.data) {
        setReturns(retRes.data.returns || []);
        setSummary(retRes.data.summary || null);
      }
      if (supRes?.data) {
        setSuppliers(supRes.data);
        if (supRes.data.length > 0) setSelectedSupplierId(String(supRes.data[0].id));
      }
      if (invRes?.data) setInventoryList(invRes.data);
    } catch (err) {
      console.error('Failed to load supplier returns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openReturnDetails = async (id: number) => {
    try {
      const res = await fetchApi(`/api/v1/purchasing/returns/${id}`);
      if (res?.data) {
        setActiveReturn(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load return details');
    }
  };

  const handleAddItem = () => {
    if (inventoryList.length === 0) return;
    const first = inventoryList[0];
    setReturnItems([
      ...returnItems,
      {
        inventoryItemId: first.id,
        quantity: 5,
        unitCost: parseFloat(first.costPrice) || 0,
        reason: 'DEFECTIVE_SPOILED',
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== idx));
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (returnItems.length === 0) {
      alert('Please add at least one line item to return');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      await fetchApi('/api/v1/purchasing/returns', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: parseInt(selectedSupplierId, 10),
          debitNoteNumber: debitNoteNumber || undefined,
          notes: returnNotes || undefined,
          items: returnItems,
        }),
      });

      setIsNewModalOpen(false);
      setReturnItems([]);
      setDebitNoteNumber('');
      setReturnNotes('');
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to process return');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (status: 'DISPATCHED' | 'CREDITED' | 'REJECTED') => {
    if (!activeReturn) return;
    try {
      await fetchApi(`/api/v1/purchasing/returns/${activeReturn.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setActiveReturn(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update return status');
    }
  };

  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const matchesSearch =
        r.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.debitNoteNumber && r.debitNoteNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        r.supplierName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [returns, searchTerm, statusFilter]);

  const getReasonBadge = (reason: SupplierReturnItemLine['reason']) => {
    switch (reason) {
      case 'DEFECTIVE_SPOILED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            <PackageX size={11} /> Defective / Spoiled
          </span>
        );
      case 'TEMPERATURE_ABUSE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
            <Snowflake size={11} /> Cold-Chain Breached
          </span>
        );
      case 'WRONG_ITEM':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle size={11} /> Wrong Specification
          </span>
        );
      case 'BROKEN_PACKAGING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
            <ShieldAlert size={11} /> Compromised Seal
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
            {reason.replace('_', ' ')}
          </span>
        );
    }
  };

  const getStatusBadge = (status: SupplierReturnHeader['status']) => {
    switch (status) {
      case 'PENDING_DISPATCH':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} /> Staged at Dock
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <Truck size={11} /> In Transit to Purveyor
          </span>
        );
      case 'CREDITED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} /> Debit Note Credited
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle size={11} /> Purveyor Disputed
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
            <span className="text-xs font-semibold text-gray-400">Purchasing</span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-servora-navy">Supplier Returns & Debit Notes</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Supplier Returns & Debit Notes</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Process outbound rejections for spoiled consignments, temperature abuse, and damaged seals with credit ledger adjustments.
          </p>
        </div>

        <button
          onClick={() => {
            handleAddItem();
            setIsNewModalOpen(true);
          }}
          className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> Raise Return Manifest
        </button>
      </div>

      {/* Aggregate Telemetry Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Debit Credit Valuation</span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">
                KES {summary.totalCreditedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-emerald-600 font-medium">Recovered vendor liabilities</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Staged for Purveyor</span>
              <h3 className="text-lg font-bold text-amber-700 mt-1">{summary.pendingDispatchCount} Manifests</h3>
              <span className="text-[11px] text-amber-600 font-medium">Awaiting driver pickup</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Total Return Files</span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">{summary.totalReturnsCount} Records</h3>
              <span className="text-[11px] text-servora-deepTeal font-medium">Historical audit trail</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
              <RefreshCw size={20} />
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
            placeholder="Search return #, debit note #, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {['ALL', 'PENDING_DISPATCH', 'DISPATCHED', 'CREDITED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === st ? 'bg-white shadow-xs text-servora-navy font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {st === 'ALL' ? 'All Returns' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Returns Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Connecting to supplier returns and debit note registry...
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No supplier return manifests match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3.5 px-4">Return Manifest #</th>
                  <th className="py-3.5 px-4">Debit Note #</th>
                  <th className="py-3.5 px-4">Supplier Purveyor</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Tax (VAT 16%)</th>
                  <th className="py-3.5 px-4 text-right">Debit Valuation</th>
                  <th className="py-3.5 px-4">Origin GRN</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-servora-navy font-mono">
                      {r.returnNumber}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-gray-500 font-bold">
                      {r.debitNoteNumber || '-'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-servora-navy block">{r.supplierName}</span>
                      {r.supplierKraPin && (
                        <span className="text-[10px] text-gray-400 font-mono">PIN: {r.supplierKraPin}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(r.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-gray-500">
                      KES {parseFloat(r.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-700">
                      KES {parseFloat(r.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600">
                      {r.grnNumber || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openReturnDetails(r.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-servora-pale text-servora-core rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors"
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT & RECONCILE MODAL */}
      {activeReturn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-servora-navy">{activeReturn.returnNumber}</h3>
                  {getStatusBadge(activeReturn.status)}
                </div>
                <p className="text-[11px] text-servora-deepTeal mt-0.5">
                  Purveyor: <strong>{activeReturn.supplierName}</strong> {activeReturn.debitNoteNumber ? `| Debit Note: ${activeReturn.debitNoteNumber}` : ''}
                </p>
              </div>
              <button onClick={() => setActiveReturn(null)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            {/* Returned Line Items Manifest */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                Outbound Returned Items ({activeReturn.items.length})
              </span>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="p-3">Ingredient</th>
                      <th className="p-3 text-right">Return Qty</th>
                      <th className="p-3 text-right">Unit Cost</th>
                      <th className="p-3 text-right">Subtotal</th>
                      <th className="p-3">Rejection Vector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeReturn.items.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-servora-navy">
                          {line.itemName}
                          <span className="block text-[10px] text-gray-400 font-mono">{line.itemSku || 'NO-SKU'}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-700">
                          {parseFloat(line.quantity).toLocaleString()} {line.itemUnit}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-600">
                          KES {parseFloat(line.unitCost).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-servora-navy">
                          KES {parseFloat(line.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3">
                          {getReasonBadge(line.reason)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Status Box */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Taxable Net:</span>
                <span className="font-mono">KES {parseFloat(activeReturn.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Recoverable VAT (16%):</span>
                <span className="font-mono">KES {parseFloat(activeReturn.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-servora-navy border-t border-gray-200 pt-2">
                <span>Total Debit Note Value:</span>
                <span className="font-mono text-rose-700">KES {parseFloat(activeReturn.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveReturn(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {activeReturn.status === 'PENDING_DISPATCH' && (
                  <button
                    onClick={() => handleUpdateStatus('DISPATCHED')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    <Truck size={14} /> Dispatch Out of Loading Dock
                  </button>
                )}

                {activeReturn.status === 'DISPATCHED' && (
                  <button
                    onClick={() => handleUpdateStatus('CREDITED')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <CheckCircle2 size={14} /> Confirm Purveyor Credit Note
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE RETURN MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Raise Supplier Return (Debit Note)</h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Deducts items from kitchen stock and records accounts payable debit adjustment
                </p>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReturn} className="space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Target Purveyor *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Vendor Debit Note Ref # (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. DN-2026-901"
                    value={debitNoteNumber}
                    onChange={(e) => setDebitNoteNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-servora-navy">Returned Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-servora-core hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {returnItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-gray-200">
                      <select
                        value={item.inventoryItemId}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          const selectedId = parseInt(e.target.value, 10);
                          const matched = inventoryList.find((i) => i.id === selectedId);
                          updated[idx].inventoryItemId = selectedId;
                          if (matched) updated[idx].unitCost = parseFloat(matched.costPrice) || 0;
                          setReturnItems(updated);
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium w-full sm:w-auto"
                      >
                        {inventoryList.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} (On hand: {parseFloat(inv.currentStock).toLocaleString()} {inv.unit})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          required
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...returnItems];
                            updated[idx].quantity = parseFloat(e.target.value) || 0;
                            setReturnItems(updated);
                          }}
                          className="w-20 px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-center font-bold"
                        />

                        <select
                          value={item.reason}
                          onChange={(e) => {
                            const updated = [...returnItems];
                            updated[idx].reason = e.target.value as any;
                            setReturnItems(updated);
                          }}
                          className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium"
                        >
                          <option value="DEFECTIVE_SPOILED">Spoiled / Rotten</option>
                          <option value="TEMPERATURE_ABUSE">Cold-Chain Breached</option>
                          <option value="WRONG_ITEM">Wrong Item Spec</option>
                          <option value="BROKEN_PACKAGING">Damaged Packaging</option>
                          <option value="OVER_DELIVERY">Excess Over-Delivery</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Return Justification / Rejection Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Milk crates delivered at 12.8°C with blown seals, rejected by receiving chef"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
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
                  className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Posting...' : 'Confirm Return & Deduct Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}