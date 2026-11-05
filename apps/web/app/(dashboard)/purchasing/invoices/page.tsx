'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Receipt, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  DollarSign, 
  ChevronRight, 
  Trash2,
  AlertOctagon,
  AlertTriangle,
  FileCheck,
  PackageCheck,
  Sparkles
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SupplierInvoiceHeader {
  id: number;
  invoiceNumber: string;
  internalRef: string;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'DISPUTED';
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount: string;
  balanceRemaining?: number;
  isOverdue?: boolean;
  invoiceDate: string;
  dueDate: string;
  supplierId: number;
  supplierName: string;
  supplierKraPin: string | null;
  poNumber: string | null;
  grnNumber: string | null;
  branchName: string | null;
  createdAt: string;
}

interface SupplierInvoiceDetail extends SupplierInvoiceHeader {
  supplierEmail: string | null;
  supplierPhone: string | null;
  notes: string | null;
  items: {
    id: number;
    itemName: string;
    itemSku: string | null;
    itemUnit: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
    subtotal: string;
  }[];
}

interface SummaryAP {
  totalInvoicesCount: number;
  totalOutstandingAP: number;
  totalPaidYTD: number;
  overdueCount: number;
}

interface SupplierOption {
  id: number;
  name: string;
  paymentTerms: string;
  leadTimeDays: number;
}

interface InventoryOption {
  id: number;
  name: string;
  unit: string;
  costPrice: string;
}

interface UninvoicedGRNOption {
  id: number;
  grnNumber: string;
  supplierDeliveryNote: string | null;
  receivedDate: string;
  supplierId: number;
  supplierName: string;
  paymentTerms: string;
  poNumber: string;
  branchName: string | null;
}

export default function SupplierInvoicesPage() {
  const [invoices, setInvoices] = useState<SupplierInvoiceHeader[]>([]);
  const [summary, setSummary] = useState<SummaryAP | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryOption[]>([]);
  const [uninvoicedGRNs, setUninvoicedGRNs] = useState<UninvoicedGRNOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Detail Modal
  const [activeInvoice, setActiveInvoice] = useState<SupplierInvoiceDetail | null>(null);

  // Record Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'MPESA_B2B' | 'BANK_TRANSFER' | 'CHEQUE'>('MPESA_B2B');
  const [paymentRef, setPaymentRef] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Creation Modal State & Mode
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'FROM_GRN' | 'MANUAL'>('FROM_GRN');
  const [selectedGrnId, setSelectedGrnId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [linkedPoId, setLinkedPoId] = useState<number | null>(null);
  const [linkedGrnId, setLinkedGrnId] = useState<number | null>(null);

  const [invoiceItems, setInvoiceItems] = useState<{
    inventoryItemId: number;
    itemName?: string;
    itemUnit?: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingGRNDraft, setIsLoadingGRNDraft] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invRes, supRes, itemsRes, grnRes] = await Promise.all([
        fetchApi('/api/v1/purchasing/invoices'),
        fetchApi('/api/v1/suppliers').catch(() => ({ data: [] })),
        fetchApi('/api/v1/inventory'),
        fetchApi('/api/v1/purchasing/invoices/uninvoiced-grns').catch(() => ({ data: [] })),
      ]);

      if (invRes?.data) {
        setInvoices(invRes.data.invoices || []);
        setSummary(invRes.data.summary || null);
      }
      if (supRes?.data) {
        setSuppliers(supRes.data);
        if (supRes.data.length > 0) setSelectedSupplierId(String(supRes.data[0].id));
      }
      if (itemsRes?.data) setInventoryList(itemsRes.data);
      if (grnRes?.data) setUninvoicedGRNs(grnRes.data);
    } catch (err) {
      console.error('Failed to load supplier invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openInvoiceDetails = async (id: number) => {
    try {
      const res = await fetchApi(`/api/v1/purchasing/invoices/${id}`);
      if (res?.data) {
        setActiveInvoice(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load invoice details');
    }
  };

  const handleSelectGRN = async (grnId: string) => {
    setSelectedGrnId(grnId);
    if (!grnId) return;

    setIsLoadingGRNDraft(true);
    setModalError(null);
    try {
      const res = await fetchApi(`/api/v1/purchasing/invoices/from-grn/${grnId}`);
      if (res?.data) {
        const d = res.data;
        setSelectedSupplierId(String(d.supplierId));
        setInvoiceNumber(d.invoiceNumber);
        setDueDate(d.dueDate);
        setLinkedPoId(d.purchaseOrderId);
        setLinkedGrnId(d.goodsReceivedNoteId);
        setInvoiceNotes(`Auto-generated via 3-way match from ${d.grnNumber}`);
        setInvoiceItems(
          d.items.map((i: any) => ({
            inventoryItemId: i.inventoryItemId,
            itemName: i.itemName,
            itemUnit: i.itemUnit,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate,
          }))
        );
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to extract draft items from GRN');
    } finally {
      setIsLoadingGRNDraft(false);
    }
  };

  const resetCreateModal = () => {
    setSelectedGrnId('');
    setInvoiceNumber('');
    setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setInvoiceNotes('');
    setLinkedPoId(null);
    setLinkedGrnId(null);
    setModalError(null);

    if (uninvoicedGRNs.length > 0) {
      setCreateMode('FROM_GRN');
      handleSelectGRN(String(uninvoicedGRNs[0].id));
    } else {
      setCreateMode('MANUAL');
      setInvoiceItems([]);
    }
    setIsNewModalOpen(true);
  };

  const handleAddItem = () => {
    if (inventoryList.length === 0) return;
    const first = inventoryList[0];
    setInvoiceItems([
      ...invoiceItems,
      {
        inventoryItemId: first.id,
        itemName: first.name,
        itemUnit: first.unit,
        quantity: 20,
        unitPrice: parseFloat(first.costPrice) || 0,
        taxRate: 16,
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== idx));
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invoiceItems.length === 0) {
      alert('Please add or import at least one line item into the invoice');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    const payload = {
      supplierId: parseInt(selectedSupplierId, 10),
      purchaseOrderId: linkedPoId || undefined,
      goodsReceivedNoteId: linkedGrnId || undefined,
      invoiceNumber,
      dueDate: new Date(dueDate).toISOString(),
      notes: invoiceNotes || undefined,
      items: invoiceItems.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
      })),
    };

    try {
      await fetchApi('/api/v1/purchasing/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsNewModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to register invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) return;

    setIsPaying(true);
    try {
      await fetchApi(`/api/v1/purchasing/invoices/${activeInvoice.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          paymentMethod,
          transactionReference: paymentRef || undefined,
        }),
      });

      setIsPayModalOpen(false);
      setActiveInvoice(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setIsPaying(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.internalRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.supplierName.toLowerCase().includes(searchTerm.toLowerCase());

      const total = parseFloat(inv.totalAmount) || 0;
      const paid = parseFloat(inv.paidAmount) || 0;
      const balance = inv.balanceRemaining ?? Math.max(0, total - paid);
      const isOverdue = inv.isOverdue ?? (balance > 0 && new Date(inv.dueDate) < new Date());

      let matchesStatus = true;
      if (statusFilter === 'UNPAID') matchesStatus = inv.status === 'UNPAID';
      else if (statusFilter === 'PAID') matchesStatus = inv.status === 'PAID';
      else if (statusFilter === 'OVERDUE') matchesStatus = isOverdue;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const activeBalanceRemaining = useMemo(() => {
    if (!activeInvoice) return 0;
    if (activeInvoice.balanceRemaining !== undefined) return activeInvoice.balanceRemaining;
    const total = parseFloat(activeInvoice.totalAmount) || 0;
    const paid = parseFloat(activeInvoice.paidAmount) || 0;
    return Math.max(0, total - paid);
  }, [activeInvoice]);

  const getStatusBadge = (inv: SupplierInvoiceHeader) => {
    const total = parseFloat(inv.totalAmount) || 0;
    const paid = parseFloat(inv.paidAmount) || 0;
    const balance = inv.balanceRemaining ?? Math.max(0, total - paid);
    const isOverdue = inv.isOverdue ?? (balance > 0 && new Date(inv.dueDate) < new Date());

    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
          <AlertOctagon size={11} /> Overdue
        </span>
      );
    }
    switch (inv.status) {
      case 'UNPAID':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} /> Awaiting Settlement
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <DollarSign size={11} /> Partial Payment
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} /> Paid / Settled
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
            {inv.status}
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
            <span className="text-xs font-bold text-servora-navy">Supplier Invoices (A/P)</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Accounts Payable & Supplier Invoices</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Automated 3-way matching across POs, loading dock GRNs, and purveyor bills with KRA VAT accounting.
          </p>
        </div>

        <button
          onClick={resetCreateModal}
          className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> Inward Bill / Auto-Match GRN
        </button>
      </div>

      {/* Aggregate Telemetry Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Total Outstanding AP</span>
              <h3 className="text-lg font-bold text-rose-700 mt-1">
                KES {(summary.totalOutstandingAP || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-rose-600 font-medium">Pending vendor payouts</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Overdue Bills</span>
              <h3 className="text-lg font-bold text-amber-700 mt-1">{summary.overdueCount || 0} Invoices</h3>
              <span className="text-[11px] text-amber-600 font-medium">Past credit terms</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Settled Payouts YTD</span>
              <h3 className="text-lg font-bold text-emerald-700 mt-1">
                KES {(summary.totalPaidYTD || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-emerald-600 font-medium">Disbursed via B2B/Bank</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Uninvoiced GRNs</span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">{uninvoicedGRNs.length} Received</h3>
              <span className="text-[11px] text-servora-deepTeal font-medium">Ready for 1-click billing</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
              <PackageCheck size={20} />
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
            placeholder="Search vendor invoice #, internal ref, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {['ALL', 'UNPAID', 'OVERDUE', 'PAID'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === st ? 'bg-white shadow-xs text-servora-navy font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {st === 'ALL' ? 'All Invoices' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Connecting to accounts payable and fiscal ledger...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No supplier invoices match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3.5 px-4">Vendor Invoice #</th>
                  <th className="py-3.5 px-4">Internal Ref</th>
                  <th className="py-3.5 px-4">Supplier Purveyor</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Tax (VAT 16%)</th>
                  <th className="py-3.5 px-4 text-right">Invoice Total</th>
                  <th className="py-3.5 px-4 text-right">Balance Due</th>
                  <th className="py-3.5 px-4">Payment Due Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredInvoices.map((inv) => {
                  const total = parseFloat(inv.totalAmount) || 0;
                  const paid = parseFloat(inv.paidAmount) || 0;
                  const balance = inv.balanceRemaining ?? Math.max(0, total - paid);
                  const isOverdue = inv.isOverdue ?? (balance > 0 && new Date(inv.dueDate) < new Date());

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-servora-navy font-mono">
                        {inv.invoiceNumber}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {inv.grnNumber && (
                            <span className="text-[9.5px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              {inv.grnNumber}
                            </span>
                          )}
                          {inv.poNumber && (
                            <span className="text-[9.5px] font-mono text-servora-core bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                              {inv.poNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-gray-500 text-[11px]">
                        {inv.internalRef}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-servora-navy block">{inv.supplierName}</span>
                        {inv.supplierKraPin && (
                          <span className="text-[10px] text-gray-400 font-mono">PIN: {inv.supplierKraPin}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(inv)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-gray-500">
                        KES {(parseFloat(inv.taxAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-servora-navy">
                        KES {(parseFloat(inv.totalAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={balance > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                          KES {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-gray-600'}>
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openInvoiceDetails(inv.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-servora-pale text-servora-core rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors"
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

      {/* INSPECT & RECONCILE MODAL */}
      {activeInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-servora-navy">Invoice: {activeInvoice.invoiceNumber}</h3>
                  {getStatusBadge(activeInvoice)}
                </div>
                <p className="text-[11px] text-servora-deepTeal mt-0.5">
                  Internal Ref: <strong>{activeInvoice.internalRef}</strong> | Vendor: <strong>{activeInvoice.supplierName}</strong>
                </p>
              </div>
              <button onClick={() => setActiveInvoice(null)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            {/* Line Items Sheet */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                Billed Items ({activeInvoice.items?.length || 0})
              </span>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="p-3">Item SKU</th>
                      <th className="p-3 text-right">Billed Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">VAT Rate</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeInvoice.items?.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-servora-navy">
                          {line.itemName}
                          <span className="block text-[10px] text-gray-400 font-mono">{line.itemSku || 'NO-SKU'}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-servora-navy">
                          {(parseFloat(line.quantity) || 0).toLocaleString()} {line.itemUnit}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-600">
                          KES {(parseFloat(line.unitPrice) || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-500">
                          {line.taxRate}%
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-servora-navy">
                          KES {(parseFloat(line.subtotal) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                <span className="font-mono">
                  KES {(parseFloat(activeInvoice.subtotal) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>KRA VAT (16%):</span>
                <span className="font-mono">
                  KES {(parseFloat(activeInvoice.taxAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Total Invoiced:</span>
                <span className="font-mono font-bold text-servora-navy">
                  KES {(parseFloat(activeInvoice.totalAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Amount Settled to Date:</span>
                <span className="font-mono text-emerald-700 font-bold">
                  KES {(parseFloat(activeInvoice.paidAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-servora-navy border-t border-gray-200 pt-2">
                <span>Remaining Payable Balance:</span>
                <span className="font-mono text-rose-700">
                  KES {activeBalanceRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveInvoice(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Close
              </button>

              {activeBalanceRemaining > 0 && (
                <button
                  onClick={() => {
                    setPaymentAmount(String(activeBalanceRemaining));
                    setPaymentRef('');
                    setIsPayModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <DollarSign size={14} /> Record AP Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isPayModalOpen && activeInvoice && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Disburse AP Payment</h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Settlement for {activeInvoice.invoiceNumber} ({activeInvoice.supplierName})
                </p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Payment Amount (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={activeBalanceRemaining}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:border-servora-core focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Disbursement Channel *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                >
                  <option value="MPESA_B2B">M-Pesa B2B Paybill / Buy Goods</option>
                  <option value="BANK_TRANSFER">EFT / RTGS Bank Transfer</option>
                  <option value="CHEQUE">Corporate Company Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Transaction Ref / Receipt Code</label>
                <input
                  type="text"
                  placeholder="e.g. QK8912KL99 / CHQ-10091"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono uppercase focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isPaying ? 'Recording...' : 'Confirm Disbursement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE INVOICE MODAL (3-WAY MATCH OR MANUAL) */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Inward Supplier Bill & 3-Way Match</h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Link physical loading dock verification directly to Accounts Payable liability
                </p>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            {/* Selection Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <button
                type="button"
                onClick={() => {
                  setCreateMode('FROM_GRN');
                  if (uninvoicedGRNs.length > 0) handleSelectGRN(String(uninvoicedGRNs[0].id));
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  createMode === 'FROM_GRN'
                    ? 'bg-servora-pale text-servora-core border border-servora-core/30'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Sparkles size={13} />
                <span>Auto-Match from Verified GRN ({uninvoicedGRNs.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateMode('MANUAL');
                  setSelectedGrnId('');
                  setLinkedPoId(null);
                  setLinkedGrnId(null);
                  setInvoiceItems([]);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  createMode === 'MANUAL'
                    ? 'bg-servora-pale text-servora-core border border-servora-core/30'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Manual Entry
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {modalError}
                </div>
              )}

              {createMode === 'FROM_GRN' && (
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-servora-navy">
                    Select Dock Delivery (GRN) to Match *
                  </label>
                  {uninvoicedGRNs.length === 0 ? (
                    <p className="text-xs text-servora-deepTeal">
                      All dock receipts have already been matched to an invoice. Switch to Manual Entry if needed.
                    </p>
                  ) : (
                    <select
                      value={selectedGrnId}
                      onChange={(e) => handleSelectGRN(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                    >
                      {uninvoicedGRNs.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.grnNumber} — {g.supplierName} ({g.poNumber}) [DN: {g.supplierDeliveryNote || 'N/A'}]
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Select Purveyor *</label>
                  <select
                    disabled={createMode === 'FROM_GRN'}
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium disabled:bg-gray-50"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Vendor Invoice # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-99021"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Payment Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-servora-navy">
                    Billed Line Items {isLoadingGRNDraft && '(Importing from dock manifest...)'}
                  </span>
                  {createMode === 'MANUAL' && (
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-xs font-semibold text-servora-core hover:underline flex items-center gap-1"
                    >
                      <Plus size={13} /> Add Line Item
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {invoiceItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-gray-200">
                      {createMode === 'FROM_GRN' ? (
                        <div className="flex-1 text-xs font-semibold text-servora-navy px-2">
                          {item.itemName} <span className="text-gray-400 font-normal">({item.itemUnit})</span>
                        </div>
                      ) : (
                        <select
                          value={item.inventoryItemId}
                          onChange={(e) => {
                            const updated = [...invoiceItems];
                            const selectedId = parseInt(e.target.value, 10);
                            const matched = inventoryList.find((i) => i.id === selectedId);
                            updated[idx].inventoryItemId = selectedId;
                            if (matched) {
                              updated[idx].unitPrice = parseFloat(matched.costPrice) || 0;
                              updated[idx].itemName = matched.name;
                              updated[idx].itemUnit = matched.unit;
                            }
                            setInvoiceItems(updated);
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium"
                        >
                          {inventoryList.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.name} ({inv.unit})
                            </option>
                          ))}
                        </select>
                      )}

                      <div className="w-20">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          required
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...invoiceItems];
                            updated[idx].quantity = parseFloat(e.target.value) || 0;
                            setInvoiceItems(updated);
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-center font-bold"
                        />
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="Price"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const updated = [...invoiceItems];
                            updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                            setInvoiceItems(updated);
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-center font-mono"
                        />
                      </div>

                      {createMode === 'MANUAL' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Billing Notes / 3-Way Match Audit</label>
                <input
                  type="text"
                  placeholder="e.g. Matched with GRN-2026-001 delivery note and signed by head chef"
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
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
                  disabled={isSubmitting || (createMode === 'FROM_GRN' && uninvoicedGRNs.length === 0)}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Posting...' : 'Save & Post Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}