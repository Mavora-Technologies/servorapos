'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  ChevronRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Clock,
  ShieldCheck,
  Search,
  Wallet,
  AlertCircle,
  FileText,
  UserCheck,
  CheckSquare,
  Square,
  X,
  Eye,
  Check,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface HandoverRecord {
  id: number;
  branchId: number;
  branchName: string;
  branchCode: string;
  shiftType: 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT_CLOSING';
  handoverDate: string;
  cashStatus: 'BALANCED' | 'DISCREPANCY_SHORT' | 'DISCREPANCY_OVER';
  openingFloat: string;
  closingCash: string;
  cashVariance: string;
  operationalIncidents: string | null;
  inventoryKitchenNotes: string | null;
  hardwareMaintenanceNotes: string | null;
  guestExperienceNotes: string | null;
  checklistItems: { id: string; text: string; completed: boolean }[];
  status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'DISPUTED';
  outgoingSignedAt: string;
  incomingSignedAt: string | null;
  outgoingManagerId: number;
  outgoingManagerName: string;
  incomingManagerId: number | null;
  incomingManagerName: string | null;
  createdAt: string;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

export default function StaffHandoverPage() {
  const [handovers, setHandovers] = useState<HandoverRecord[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingHandover, setViewingHandover] = useState<HandoverRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    branchId: '',
    shiftType: 'MORNING' as 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT_CLOSING',
    handoverDate: new Date().toISOString().split('T')[0],
    openingFloat: '5000',
    closingCash: '5000',
    cashVariance: '0',
    cashStatus: 'BALANCED' as 'BALANCED' | 'DISCREPANCY_SHORT' | 'DISCREPANCY_OVER',
    operationalIncidents: '',
    inventoryKitchenNotes: '',
    hardwareMaintenanceNotes: '',
    guestExperienceNotes: '',
    checklistItems: [
      { id: '1', text: 'Cash Drawer Float reconciled with Z-Report', completed: true },
      { id: '2', text: 'All KDS kitchen tickets completed and closed', completed: true },
      { id: '3', text: 'Walk-in chiller and freezer temperatures logged', completed: true },
      { id: '4', text: 'Safe locked and physical keys transferred', completed: true },
    ],
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [handoverRes, branchRes] = await Promise.all([
        fetchApi('/api/v1/staff/handover'),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (handoverRes?.data) setHandovers(handoverRes.data);
      if (branchRes?.data && Array.isArray(branchRes.data)) setBranches(branchRes.data);
    } catch (err: any) {
      console.error('Failed to load handover logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const telemetry = useMemo(() => {
    const totalLogs = handovers.length;
    const pendingAcknowledgment = handovers.filter((h) => h.status === 'SUBMITTED').length;
    const balancedLogs = handovers.filter((h) => h.cashStatus === 'BALANCED').length;
    const discrepancyLogs = handovers.filter((h) => h.cashStatus !== 'BALANCED').length;

    return {
      totalLogs,
      pendingAcknowledgment,
      balancedLogs,
      discrepancyLogs,
    };
  }, [handovers]);

  const filteredHandovers = useMemo(() => {
    return handovers.filter((h) => {
      const matchesBranch = branchFilter === 'ALL' || String(h.branchId) === branchFilter;
      const matchesShift = shiftFilter === 'ALL' || h.shiftType === shiftFilter;
      const matchesStatus = statusFilter === 'ALL' || h.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        h.outgoingManagerName.toLowerCase().includes(q) ||
        (h.incomingManagerName && h.incomingManagerName.toLowerCase().includes(q)) ||
        h.branchName.toLowerCase().includes(q) ||
        (h.operationalIncidents && h.operationalIncidents.toLowerCase().includes(q));

      return matchesBranch && matchesShift && matchesStatus && matchesQuery;
    });
  }, [handovers, branchFilter, shiftFilter, statusFilter, searchQuery]);

  const openCreateModal = () => {
    setModalError(null);
    setFormData({
      branchId: branches[0]?.id ? String(branches[0].id) : '',
      shiftType: 'MORNING',
      handoverDate: new Date().toISOString().split('T')[0],
      openingFloat: '5000',
      closingCash: '5000',
      cashVariance: '0',
      cashStatus: 'BALANCED',
      operationalIncidents: '',
      inventoryKitchenNotes: '',
      hardwareMaintenanceNotes: '',
      guestExperienceNotes: '',
      checklistItems: [
        { id: '1', text: 'Cash Drawer Float reconciled with Z-Report', completed: true },
        { id: '2', text: 'All KDS kitchen tickets completed and closed', completed: true },
        { id: '3', text: 'Walk-in chiller and freezer temperatures logged', completed: true },
        { id: '4', text: 'Safe locked and physical keys transferred', completed: true },
      ],
    });
    setIsCreateModalOpen(true);
  };

  const handleCashChange = (closing: string, opening: string) => {
    const openNum = parseFloat(opening) || 0;
    const closeNum = parseFloat(closing) || 0;
    const diff = closeNum - openNum;

    let status: 'BALANCED' | 'DISCREPANCY_SHORT' | 'DISCREPANCY_OVER' = 'BALANCED';
    if (diff < -5) status = 'DISCREPANCY_SHORT';
    else if (diff > 5) status = 'DISCREPANCY_OVER';

    setFormData((prev) => ({
      ...prev,
      openingFloat: opening,
      closingCash: closing,
      cashVariance: String(diff),
      cashStatus: status,
    }));
  };

  const toggleChecklist = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      setIsSubmitting(true);
      await fetchApi('/api/v1/staff/handover', {
        method: 'POST',
        body: JSON.stringify({
          branchId: parseInt(formData.branchId, 10),
          shiftType: formData.shiftType,
          handoverDate: formData.handoverDate,
          openingFloat: parseFloat(formData.openingFloat),
          closingCash: parseFloat(formData.closingCash),
          cashVariance: parseFloat(formData.cashVariance),
          cashStatus: formData.cashStatus,
          operationalIncidents: formData.operationalIncidents || null,
          inventoryKitchenNotes: formData.inventoryKitchenNotes || null,
          hardwareMaintenanceNotes: formData.hardwareMaintenanceNotes || null,
          guestExperienceNotes: formData.guestExperienceNotes || null,
          checklistItems: formData.checklistItems,
          status: 'SUBMITTED',
        }),
      });
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to submit shift handover');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    if (!confirm('Acknowledge and countersign this shift handover as the incoming Duty Manager?')) return;
    try {
      await fetchApi(`/api/v1/staff/handover/${id}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      alert('Shift handover acknowledged.');
      setViewingHandover(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge handover');
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/staff"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Staff Directory <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Shift Handover & Operations Logbook</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Manager Shift Handover Console</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Log shift changeovers, track drawer reconciliations, record culinary/hardware incidents, and countersign operational transfers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Submit Handover
          </button>
          <button
            onClick={loadData}
            title="Refresh Logbook"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 2. HANDOVER TELEMETRY TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Shift Logs</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">{telemetry.totalLogs}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <ClipboardList size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pending Sign-off</span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">{telemetry.pendingAcknowledgment}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Balanced Tills</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{telemetry.balancedLogs}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cash Discrepancies</span>
            <p className="text-xl font-bold font-mono text-rose-600 mt-0.5">{telemetry.discrepancyLogs}</p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* 3. LOGBOOK FEED & SEARCH */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search Duty Manager, notes, branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
            />
          </div>

          {branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
            >
              <option value="ALL">All Outlets</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}

          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="ALL">All Shifts</option>
            <option value="MORNING">Morning Shift</option>
            <option value="MIDDAY">Midday Shift</option>
            <option value="EVENING">Evening Shift</option>
            <option value="NIGHT_CLOSING">Night Closing</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Pending Acknowledgment</option>
            <option value="ACKNOWLEDGED">Acknowledged & Signed</option>
          </select>
        </div>

        {/* 4. MASTER HANDOVER TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Date & Shift</th>
                <th className="py-2.5 px-3">Branch Outlet</th>
                <th className="py-2.5 px-3">Outgoing Duty Manager</th>
                <th className="py-2.5 px-3">Incoming Duty Manager</th>
                <th className="py-2.5 px-3">Cash Float & Variance</th>
                <th className="py-2.5 px-3">Shift Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHandovers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                    No shift handover reports match the active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredHandovers.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <div>
                        <span className="font-bold text-servora-navy block">{new Date(h.handoverDate).toLocaleDateString()}</span>
                        <span className="text-[10px] font-mono uppercase text-servora-core font-bold">
                          {h.shiftType.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-medium text-gray-700">
                        <Building2 size={13} className="text-gray-400 shrink-0" />
                        <span>{h.branchName}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div>
                        <span className="font-bold text-servora-navy block">{h.outgoingManagerName}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          Signed {new Date(h.outgoingSignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {h.incomingManagerName ? (
                        <div>
                          <span className="font-bold text-emerald-800 block">{h.incomingManagerName}</span>
                          <span className="text-[10px] text-emerald-600 font-mono">
                            Acked {new Date(h.incomingSignedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-700 font-medium text-[11px] italic">
                          Awaiting Incoming Sign-off
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        {h.cashStatus === 'BALANCED' ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold text-[10px]">
                            Balanced
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold text-[10px] flex items-center gap-1">
                            <AlertTriangle size={10} />
                            Diff: {h.cashVariance}
                          </span>
                        )}
                        <span className="text-gray-500 font-mono">Float: {h.openingFloat}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {h.status === 'ACKNOWLEDGED' ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                          <ShieldCheck size={11} /> Countersigned
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold text-[10px]">
                          Pending Review
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setViewingHandover(h)}
                        className="px-2.5 py-1 bg-slate-50 text-servora-navy hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={12} /> View Log
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: DRAFT & SUBMIT SHIFT HANDOVER */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Submit Manager Shift Handover</h3>
                <p className="text-[11px] text-gray-400">Reconcile cash till, document incidents, and hand over tasks</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Operating Branch *</label>
                  <select
                    required
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="">Select Branch...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Shift Type *</label>
                  <select
                    value={formData.shiftType}
                    onChange={(e) => setFormData({ ...formData, shiftType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="MORNING">Morning Shift</option>
                    <option value="MIDDAY">Midday Shift</option>
                    <option value="EVENING">Evening Shift</option>
                    <option value="NIGHT_CLOSING">Night Closing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Handover Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.handoverDate}
                    onChange={(e) => setFormData({ ...formData, handoverDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              {/* Cash Reconciliation Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2.5">
                <span className="font-bold text-servora-navy flex items-center gap-1.5 text-xs">
                  <Wallet size={14} className="text-servora-core" /> Cash Drawer & Till Handover
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Opening Float (KES)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.openingFloat}
                      onChange={(e) => handleCashChange(formData.closingCash, e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Counted Closing Cash (KES)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.closingCash}
                      onChange={(e) => handleCashChange(e.target.value, formData.openingFloat)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Calculated Variance</label>
                    <div className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs flex items-center justify-between">
                      <span className={formData.cashStatus === 'BALANCED' ? 'text-emerald-700' : 'text-rose-600'}>
                        {formData.cashVariance}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-gray-400">{formData.cashStatus}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Operational Sections */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Operational Incidents & Guest Feedback</label>
                  <textarea
                    rows={2}
                    placeholder="Document any guest complaints, refunds, peak rush observations, or staff issues"
                    value={formData.operationalIncidents}
                    onChange={(e) => setFormData({ ...formData, operationalIncidents: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Kitchen & Inventory 86ed List</label>
                    <textarea
                      rows={2}
                      placeholder="Out of stock dishes, prep shortages, wastage noted"
                      value={formData.inventoryKitchenNotes}
                      onChange={(e) => setFormData({ ...formData, inventoryKitchenNotes: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Hardware & Facility Health</label>
                    <textarea
                      rows={2}
                      placeholder="Receipt printers, chiller temps, POS terminals, internet offline"
                      value={formData.hardwareMaintenanceNotes}
                      onChange={(e) => setFormData({ ...formData, hardwareMaintenanceNotes: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                    />
                  </div>
                </div>
              </div>

              {/* Shift Turnover Checklist */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <span className="font-bold text-servora-navy text-xs block">Duty Manager Transition Checklist</span>
                <div className="space-y-1.5">
                  {formData.checklistItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleChecklist(item.id)}
                      className="flex items-center gap-2 text-xs text-servora-navy hover:text-servora-core text-left cursor-pointer"
                    >
                      {item.completed ? (
                        <CheckSquare size={14} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Square size={14} className="text-gray-400 shrink-0" />
                      )}
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Signing & Submitting...' : 'Sign & Submit Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: VIEW HANDOVER REPORT & INCOMING ACKNOWLEDGMENT */}
      {viewingHandover && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-servora-core bg-blue-50 px-2 py-0.5 rounded-md">
                  {viewingHandover.shiftType.replace('_', ' ')} • {viewingHandover.branchName}
                </span>
                <h3 className="text-base font-bold text-servora-navy mt-1">
                  Shift Handover Log (#{viewingHandover.id})
                </h3>
              </div>
              <button onClick={() => setViewingHandover(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Audit Status Bar */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-gray-200 rounded-xl text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Outgoing Duty Manager</span>
                <span className="font-bold text-servora-navy block">{viewingHandover.outgoingManagerName}</span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {new Date(viewingHandover.outgoingSignedAt).toLocaleDateString()}{' '}
                  {new Date(viewingHandover.outgoingSignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Incoming Duty Manager</span>
                {viewingHandover.incomingManagerName ? (
                  <>
                    <span className="font-bold text-emerald-800 block">{viewingHandover.incomingManagerName}</span>
                    <span className="text-[10px] text-emerald-600 font-mono">
                      {new Date(viewingHandover.incomingSignedAt!).toLocaleDateString()}{' '}
                      {new Date(viewingHandover.incomingSignedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <span className="text-amber-700 font-bold text-xs italic block mt-1">Pending Countersignature</span>
                )}
              </div>
            </div>

            {/* Cash Variance */}
            <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-servora-navy flex items-center justify-between">
                <span>Till & Cash Handover:</span>
                <span className={`font-mono font-bold ${viewingHandover.cashStatus === 'BALANCED' ? 'text-emerald-700' : 'text-rose-600'}`}>
                  Variance: {viewingHandover.cashVariance} KES ({viewingHandover.cashStatus})
                </span>
              </span>
              <div className="flex justify-between text-[11px] text-gray-600 font-mono">
                <span>Opening Float: {viewingHandover.openingFloat} KES</span>
                <span>Closing Counted: {viewingHandover.closingCash} KES</span>
              </div>
            </div>

            {/* Operational Notes */}
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-servora-navy block text-[11px] mb-0.5">Operational Incidents:</span>
                <p className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-700 leading-relaxed">
                  {viewingHandover.operationalIncidents || 'No incidents reported.'}
                </p>
              </div>

              {viewingHandover.inventoryKitchenNotes && (
                <div>
                  <span className="font-bold text-servora-navy block text-[11px] mb-0.5">Kitchen & Inventory 86ed:</span>
                  <p className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-700 leading-relaxed">
                    {viewingHandover.inventoryKitchenNotes}
                  </p>
                </div>
              )}

              {viewingHandover.hardwareMaintenanceNotes && (
                <div>
                  <span className="font-bold text-servora-navy block text-[11px] mb-0.5">Hardware & Facility Health:</span>
                  <p className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-700 leading-relaxed">
                    {viewingHandover.hardwareMaintenanceNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Checklist */}
            {viewingHandover.checklistItems.length > 0 && (
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-1.5 text-xs">
                <span className="font-bold text-servora-navy block text-[11px]">Turnover Checklist:</span>
                {viewingHandover.checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-gray-700">
                    {item.completed ? (
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle size={13} className="text-gray-400 shrink-0" />
                    )}
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex gap-2">
              <button
                type="button"
                onClick={() => setViewingHandover(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer text-xs"
              >
                Close
              </button>
              {viewingHandover.status !== 'ACKNOWLEDGED' && (
                <button
                  type="button"
                  onClick={() => handleAcknowledge(viewingHandover.id)}
                  className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  <Check size={14} /> Countersign & Acknowledge Shift
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}