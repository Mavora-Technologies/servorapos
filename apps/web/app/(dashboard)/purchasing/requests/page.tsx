'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  FileText, 
  DollarSign, 
  Building2, 
  Trash2, 
  X,
  User,
  ArrowRight,
  ShieldCheck,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface PurchaseRequestHeader {
  id: number;
  requestNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_PO';
  priority: 'LOW' | 'NORMAL' | 'URGENT';
  department: string;
  estimatedTotal: string;
  branchName: string | null;
  requesterEmail: string | null;
  notes: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface PurchaseRequestItemLine {
  id: number;
  inventoryItemId: number;
  itemName: string;
  itemSku: string | null;
  itemUnit: string;
  itemCategory: string;
  currentStock: string;
  minThreshold: string;
  requestedQuantity: string;
  estimatedUnitCost: string;
  subtotal: string;
  notes: string | null;
}

interface PurchaseRequestDetail extends PurchaseRequestHeader {
  items: PurchaseRequestItemLine[];
}

interface InventoryOption {
  id: number;
  name: string;
  unit: string;
  costPrice: string;
  currentStock: string;
}

export default function PurchaseRequestsPage() {
  const [requests, setRequests] = useState<PurchaseRequestHeader[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Inspection Drawer Modal
  const [activeRequest, setActiveRequest] = useState<PurchaseRequestDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // New PR Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [department, setDepartment] = useState('KITCHEN');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'URGENT'>('NORMAL');
  const [notes, setNotes] = useState('');
  const [requestItems, setRequestItems] = useState<{ inventoryItemId: number; requestedQuantity: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prRes, invRes] = await Promise.all([
        fetchApi('/api/v1/purchasing/requests'),
        fetchApi('/api/v1/inventory'),
      ]);

      if (prRes?.data) setRequests(prRes.data);
      if (invRes?.data) setInventoryList(invRes.data);
    } catch (err) {
      console.error('Failed to load purchase requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openPRDetails = async (id: number) => {
    setIsDetailLoading(true);
    try {
      const res = await fetchApi(`/api/v1/purchasing/requests/${id}`);
      if (res?.data) {
        setActiveRequest(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load requisition details');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleReviewAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (!activeRequest) return;
    const rejectionReason = status === 'REJECTED' 
      ? prompt('Please enter the reason for rejecting this requisition:') || 'Budget / stock limit'
      : undefined;

    try {
      await fetchApi(`/api/v1/purchasing/requests/${activeRequest.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, rejectionReason }),
      });

      setActiveRequest(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to review requisition');
    }
  };

  const handleConvertToPO = async () => {
    if (!activeRequest) return;
    setIsConverting(true);
    try {
      const res = await fetchApi(`/api/v1/purchasing/requests/${activeRequest.id}/convert-to-po`, {
        method: 'POST',
      });
      alert(res.message || 'Purchase Orders generated successfully!');
      setActiveRequest(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to convert requisition into Purchase Orders');
    } finally {
      setIsConverting(false);
    }
  };

  const handleAddItemToPR = () => {
    if (inventoryList.length === 0) return;
    setRequestItems([
      ...requestItems,
      { inventoryItemId: inventoryList[0].id, requestedQuantity: 10 },
    ]);
  };

  const handleRemoveItemFromPR = (idx: number) => {
    setRequestItems(requestItems.filter((_, i) => i !== idx));
  };

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestItems.length === 0) {
      alert('Please add at least one ingredient to the request');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      await fetchApi('/api/v1/purchasing/requests', {
        method: 'POST',
        body: JSON.stringify({
          department,
          priority,
          notes: notes || undefined,
          items: requestItems,
        }),
      });

      setIsNewModalOpen(false);
      setRequestItems([]);
      setNotes('');
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create requisition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        r.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.requesterEmail && r.requesterEmail.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [requests, searchTerm, statusFilter, priorityFilter]);

  const getStatusBadge = (status: PurchaseRequestHeader['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} /> Pending Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={11} /> Rejected
          </span>
        );
      case 'CONVERTED_TO_PO':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <FileText size={11} /> Converted to PO
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (p: PurchaseRequestHeader['priority']) => {
    switch (p) {
      case 'URGENT':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
            Urgent
          </span>
        );
      case 'NORMAL':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-gray-700">
            Normal
          </span>
        );
      case 'LOW':
        return (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gray-50 text-gray-500">
            Low
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
            <span className="text-xs font-bold text-servora-navy">Internal Requisitions</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Purchase Requests & Kitchen Orders</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Internal ingredient requisitions submitted by section chefs, baristas, and floor supervisors for managerial sign-off.
          </p>
        </div>

        <button
          onClick={() => {
            handleAddItemToPR();
            setIsNewModalOpen(true);
          }}
          className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> Submit Requisition
        </button>
      </div>

      {/* Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search by PR #, department, or requester..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white font-medium"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent Only</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status filter */}
          <div className="flex items-center gap-1 p-1 bg-gray-50 border border-gray-100 rounded-xl">
            {['ALL', 'PENDING', 'APPROVED', 'CONVERTED_TO_PO', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === st ? 'bg-white shadow-xs text-servora-navy font-bold' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'CONVERTED_TO_PO' ? 'Ordered' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Loading internal purchase requisitions...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No purchase requisitions match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3.5 px-4">Requisition #</th>
                  <th className="py-3.5 px-4">Department / Outlet</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4 text-right">Estimated Commitment</th>
                  <th className="py-3.5 px-4">Approval Status</th>
                  <th className="py-3.5 px-4">Submitted By</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-servora-navy font-mono">
                      {r.requestNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-servora-navy block">{r.department}</span>
                      <span className="text-[10px] text-gray-400 font-sans">{r.branchName || 'Main Kitchen'}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      {getPriorityBadge(r.priority)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-servora-navy">
                      KES {(parseFloat(r.estimatedTotal) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(r.status)}
                    </td>

                    <td className="py-3.5 px-4 text-servora-deepTeal">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <User size={12} className="text-gray-400" />
                        {r.requesterEmail || 'Staff'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openPRDetails(r.id)}
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

      {/* INSPECT, APPROVAL & PO CONVERSION MODAL */}
      {activeRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-servora-navy">{activeRequest.requestNumber}</h3>
                  {getStatusBadge(activeRequest.status)}
                  {getPriorityBadge(activeRequest.priority)}
                </div>
                <p className="text-[11px] text-servora-deepTeal mt-0.5">
                  Dept: <strong>{activeRequest.department}</strong> | Submitted by: {activeRequest.requesterEmail || 'Staff'}
                </p>
              </div>
              <button onClick={() => setActiveRequest(null)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            {/* Line Items Sheet */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                Requisitioned Inventory Items ({activeRequest.items.length})
              </span>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="p-3">Ingredient SKU</th>
                      <th className="p-3 text-right">Current On-Hand</th>
                      <th className="p-3 text-right">Requested Qty</th>
                      <th className="p-3 text-right">Est. Unit Cost</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeRequest.items.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-servora-navy">
                          {line.itemName}
                          <span className="block text-[10px] text-gray-400 font-mono">{line.itemSku || 'NO-SKU'}</span>
                        </td>
                        <td className="p-3 text-right font-mono text-gray-500">
                          {(parseFloat(line.currentStock) || 0).toLocaleString()} {line.itemUnit}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-servora-core">
                          {(parseFloat(line.requestedQuantity) || 0).toLocaleString()} {line.itemUnit}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-600">
                          KES {(parseFloat(line.estimatedUnitCost) || 0).toFixed(2)}
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

            {/* Total Summary */}
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs font-bold">
              <span className="text-gray-600">Estimated Total Commitment:</span>
              <span className="text-base text-servora-navy font-mono">
                KES {(parseFloat(activeRequest.estimatedTotal) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {activeRequest.notes && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl">
                <strong>Requester Notes:</strong> {activeRequest.notes}
              </div>
            )}

            {activeRequest.rejectionReason && (
              <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                <strong>Rejection Reason:</strong> {activeRequest.rejectionReason}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveRequest(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {activeRequest.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleReviewAction('REJECTED')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors"
                    >
                      <XCircle size={14} /> Decline
                    </button>
                    <button
                      onClick={() => handleReviewAction('APPROVED')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      <CheckCircle2 size={14} /> Approve Requisition
                    </button>
                  </>
                )}

                {activeRequest.status === 'APPROVED' && (
                  <button
                    disabled={isConverting}
                    onClick={handleConvertToPO}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
                  >
                    <Sparkles size={14} />
                    <span>{isConverting ? 'Generating POs...' : 'Convert to Supplier PO(s) \u2192'}</span>
                  </button>
                )}

                {activeRequest.status === 'CONVERTED_TO_PO' && (
                  <Link
                    href="/purchasing/orders"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-servora-navy rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    <FileText size={14} /> View Commercial Purchase Orders &rarr;
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE REQUISITION MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Submit Internal Purchase Requisition</h3>
                <p className="text-[11px] text-servora-deepTeal">Section order for storekeeper or chef approval</p>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePR} className="space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Target Department *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="KITCHEN">Main Kitchen Line</option>
                    <option value="BAR">Bar & Beverage Station</option>
                    <option value="PASTRY">Bakery & Pastry Station</option>
                    <option value="FLOOR">Floor & Dining Operations</option>
                    <option value="MAINTENANCE">Maintenance & Facilities</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Urgency Priority *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="NORMAL">Normal Replenishment</option>
                    <option value="URGENT">Urgent (Stockout Risk)</option>
                    <option value="LOW">Low Priority (Buffer)</option>
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-servora-navy">Requested Ingredients</span>
                  <button
                    type="button"
                    onClick={handleAddItemToPR}
                    className="text-xs font-semibold text-servora-core hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {requestItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-gray-200">
                      <select
                        value={item.inventoryItemId}
                        onChange={(e) => {
                          const updated = [...requestItems];
                          updated[idx].inventoryItemId = parseInt(e.target.value, 10);
                          setRequestItems(updated);
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                      >
                        {inventoryList.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} (KES {(parseFloat(inv.costPrice) || 0).toFixed(0)}/{inv.unit})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        required
                        placeholder="Qty"
                        value={item.requestedQuantity}
                        onChange={(e) => {
                          const updated = [...requestItems];
                          updated[idx].requestedQuantity = parseFloat(e.target.value) || 0;
                          setRequestItems(updated);
                        }}
                        className="w-24 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-center font-bold"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveItemFromPR(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Requisition Justification / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Extra dairy & butter required for Saturday private dinner catering"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  {isSubmitting ? 'Submitting...' : 'Send for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}