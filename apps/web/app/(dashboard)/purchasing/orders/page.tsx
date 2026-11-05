'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Building2, 
  Send, 
  Inbox, 
  ChevronRight, 
  Trash2,
  Calendar,
  CreditCard,
  DollarSign,
  Printer
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface PurchaseOrderHeader {
  id: number;
  poNumber: string;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
  supplierId: number;
  supplierName: string;
  branchName: string | null;
  paymentTerms: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  deliveryExpectedDate: string | null;
  issuedAt: string | null;
  createdAt: string;
  creatorEmail: string | null;
}

interface PurchaseOrderItemLine {
  id: number;
  inventoryItemId: number;
  itemName: string;
  itemSku: string | null;
  itemUnit: string;
  quantityOrdered: string;
  quantityReceived: string;
  unitCost: string;
  taxRate: string;
  subtotal: string;
}

interface PurchaseOrderDetail extends PurchaseOrderHeader {
  supplierEmail?: string | null;
  supplierPhone?: string | null;
  supplierAddress?: string | null;
  notes?: string | null;
  items: PurchaseOrderItemLine[];
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

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrderHeader[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Detail Modal
  const [activeOrder, setActiveOrder] = useState<PurchaseOrderDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // New PO Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('NET_30');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [orderItems, setOrderItems] = useState<{
    inventoryItemId: number;
    quantityOrdered: number;
    unitCost: number;
    taxRate: number;
  }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordersRes, supRes, invRes] = await Promise.all([
        fetchApi('/api/v1/purchasing/orders'),
        fetchApi('/api/v1/suppliers').catch(() => ({ data: [] })),
        fetchApi('/api/v1/inventory'),
      ]);

      if (ordersRes?.data) setOrders(ordersRes.data);
      if (supRes?.data) {
        setSuppliers(supRes.data);
        if (supRes.data.length > 0) {
          setSelectedSupplierId(String(supRes.data[0].id));
          setPaymentTerms(supRes.data[0].paymentTerms || 'NET_30');
        }
      }
      if (invRes?.data) setInventoryList(invRes.data);
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openOrderDetails = async (id: number) => {
    setIsDetailLoading(true);
    try {
      const res = await fetchApi(`/api/v1/purchasing/orders/${id}`);
      if (res?.data) {
        setActiveOrder(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load purchase order details');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSupplierChange = (supId: string) => {
    setSelectedSupplierId(supId);
    const sup = suppliers.find((s) => String(s.id) === supId);
    if (sup) {
      setPaymentTerms(sup.paymentTerms || 'NET_30');
      const expectedDays = sup.leadTimeDays || 2;
      const calculatedDate = new Date(Date.now() + expectedDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      setDeliveryDate(calculatedDate);
    }
  };

  const handleAddItem = () => {
    if (inventoryList.length === 0) return;
    const firstItem = inventoryList[0];
    setOrderItems([
      ...orderItems,
      {
        inventoryItemId: firstItem.id,
        quantityOrdered: 20,
        unitCost: parseFloat(firstItem.costPrice) || 0,
        taxRate: 16,
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== idx));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      alert('Please add at least one line item to the order');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      await fetchApi('/api/v1/purchasing/orders', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: parseInt(selectedSupplierId, 10),
          paymentTerms,
          deliveryExpectedDate: deliveryDate ? new Date(deliveryDate).toISOString() : undefined,
          notes: poNotes || undefined,
          items: orderItems,
        }),
      });

      setIsNewModalOpen(false);
      setOrderItems([]);
      setPoNotes('');
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (status: 'ISSUED' | 'CANCELLED') => {
    if (!activeOrder) return;
    if (status === 'ISSUED' && !confirm(`Issue ${activeOrder.poNumber} to ${activeOrder.supplierName}? This locks unit costs and signals expected delivery.`)) {
      return;
    }

    try {
      await fetchApi(`/api/v1/purchasing/orders/${activeOrder.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setActiveOrder(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.supplierName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const getStatusBadge = (status: PurchaseOrderHeader['status']) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
            <Clock size={11} /> Draft PO
          </span>
        );
      case 'ISSUED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <Send size={11} /> Sent to Vendor
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <Inbox size={11} /> Partial Inward
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} /> Fully Received
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle size={11} /> Cancelled
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
            <span className="text-xs font-bold text-servora-navy">Purchase Orders</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Vendor Purchase Orders & Contracts</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Issue contractual POs to wholesale purveyors, trace VAT tax compliance, and track delivery intake schedules.
          </p>
        </div>

        <button
          onClick={() => {
            handleAddItem();
            setIsNewModalOpen(true);
          }}
          className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> Raise Purchase Order
        </button>
      </div>

      {/* Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search PO # or supplier name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {['ALL', 'DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === st ? 'bg-white shadow-xs text-servora-navy font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {st === 'ALL' ? 'All Orders' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Connecting to procurement and purchase order registry...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No purchase orders found matching your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3.5 px-4">PO Number</th>
                  <th className="py-3.5 px-4">Supplier Purveyor</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Tax (VAT 16%)</th>
                  <th className="py-3.5 px-4 text-right">Total (KES)</th>
                  <th className="py-3.5 px-4">Expected Delivery</th>
                  <th className="py-3.5 px-4">Date Raised</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-servora-navy font-mono">
                      {o.poNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-servora-navy block">{o.supplierName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{o.paymentTerms.replace('_', ' ')}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(o.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-gray-500">
                      KES {parseFloat(o.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-servora-navy">
                      KES {parseFloat(o.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-gray-600 font-mono text-[11px]">
                      {o.deliveryExpectedDate ? new Date(o.deliveryExpectedDate).toLocaleDateString() : '-'}
                    </td>

                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openOrderDetails(o.id)}
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

      {/* INSPECT & TRANSMIT MODAL */}
      {activeOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-servora-navy">{activeOrder.poNumber}</h3>
                  {getStatusBadge(activeOrder.status)}
                </div>
                <p className="text-[11px] text-servora-deepTeal mt-0.5">
                  Supplier: <strong>{activeOrder.supplierName}</strong> | Terms: {activeOrder.paymentTerms}
                </p>
              </div>
              <button onClick={() => setActiveOrder(null)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            {/* Line Items Sheet */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                Contract Line Items ({activeOrder.items.length})
              </span>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="p-3">Item SKU</th>
                      <th className="p-3 text-right">Ordered Qty</th>
                      <th className="p-3 text-right">Received Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeOrder.items.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-servora-navy">
                          {line.itemName}
                          <span className="block text-[10px] text-gray-400 font-mono">{line.itemSku || 'NO-SKU'}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-servora-navy">
                          {parseFloat(line.quantityOrdered).toLocaleString()} {line.itemUnit}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700 font-bold">
                          {parseFloat(line.quantityReceived).toLocaleString()} {line.itemUnit}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-600">
                          KES {parseFloat(line.unitCost).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-servora-navy">
                          KES {parseFloat(line.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Net Subtotal:</span>
                <span className="font-mono">KES {parseFloat(activeOrder.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>VAT (16%):</span>
                <span className="font-mono">KES {parseFloat(activeOrder.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-servora-navy border-t border-gray-200 pt-1.5">
                <span>Total Commitment:</span>
                <span className="font-mono text-servora-core">KES {parseFloat(activeOrder.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {activeOrder.status === 'DRAFT' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus('CANCELLED')}
                      className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      Cancel PO
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('ISSUED')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                    >
                      <Send size={14} /> Transmit & Issue to Supplier
                    </button>
                  </>
                )}

                {activeOrder.status === 'ISSUED' && (
                  <Link
                    href={`/purchasing/receiving?poId=${activeOrder.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <Inbox size={14} /> Intake Delivery (GRN) &rarr;
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PURCHASE ORDER MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Raise External Purchase Order</h3>
                <p className="text-[11px] text-servora-deepTeal">Create binding wholesale commitment with purveyor</p>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Select Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => handleSupplierChange(e.target.value)}
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
                  <label className="block text-xs font-bold text-servora-navy mb-1">Credit Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="NET_30">Net 30 Days</option>
                    <option value="NET_14">Net 14 Days</option>
                    <option value="NET_7">Net 7 Days</option>
                    <option value="COD">Cash on Delivery</option>
                    <option value="PREPAID">Prepaid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-servora-navy">Order Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-servora-core hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-gray-200">
                      <select
                        value={item.inventoryItemId}
                        onChange={(e) => {
                          const updated = [...orderItems];
                          const selectedId = parseInt(e.target.value, 10);
                          const matched = inventoryList.find((i) => i.id === selectedId);
                          updated[idx].inventoryItemId = selectedId;
                          if (matched) updated[idx].unitCost = parseFloat(matched.costPrice) || 0;
                          setOrderItems(updated);
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium"
                      >
                        {inventoryList.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} ({inv.unit})
                          </option>
                        ))}
                      </select>

                      <div className="w-20">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          required
                          placeholder="Qty"
                          value={item.quantityOrdered}
                          onChange={(e) => {
                            const updated = [...orderItems];
                            updated[idx].quantityOrdered = parseFloat(e.target.value) || 0;
                            setOrderItems(updated);
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
                          value={item.unitCost}
                          onChange={(e) => {
                            const updated = [...orderItems];
                            updated[idx].unitCost = parseFloat(e.target.value) || 0;
                            setOrderItems(updated);
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-center font-mono"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Purveyor Delivery Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Deliver to rear loading bay before 10:00 AM"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
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
                  {isSubmitting ? 'Creating PO...' : 'Create Draft Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}