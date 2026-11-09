'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  BadgePercent,
  SlidersHorizontal,
  X,
  CreditCard,
  UserCheck,
  Power,
  RotateCcw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface CashierAssignmentRecord {
  id: number;
  branchId: number;
  branchName: string;
  branchCode: string;
  cashDrawerId: number;
  drawerName: string;
  userId: number;
  cashierName: string;
  cashierEmail: string;
  cashierRole: string;
  assignedByUserId: number;
  supervisorName: string;
  assignmentDate: string;
  shiftType: 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT_CLOSING';
  status: 'ASSIGNED' | 'ACTIVE' | 'RELEASED' | 'REVOKED';
  allocatedFloat: string;
  maxCashLimit: string;
  allowRefunds: boolean;
  allowDrawerPop: boolean;
  allowManualDiscount: boolean;
  maxDiscountPercent: number;
  activatedAt: string | null;
  closedAt: string | null;
  handoverNotes: string | null;
  createdAt: string;
}

interface DrawerOption {
  id: number;
  name: string;
  branchId: number;
  isActive: boolean;
}

interface StaffOption {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  defaultBranchId: number | null;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

export default function CashierAssignmentsPage() {
  const [assignments, setAssignments] = useState<CashierAssignmentRecord[]>([]);
  const [drawers, setDrawers] = useState<DrawerOption[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<CashierAssignmentRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    branchId: '',
    cashDrawerId: '',
    userId: '',
    assignmentDate: new Date().toISOString().split('T')[0],
    shiftType: 'MORNING' as 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT_CLOSING',
    allocatedFloat: 5000,
    maxCashLimit: 50000,
    allowRefunds: false,
    allowDrawerPop: true,
    allowManualDiscount: false,
    maxDiscountPercent: 10,
    handoverNotes: '',
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [assignRes, contextRes, branchRes] = await Promise.all([
        fetchApi('/api/v1/staff/cashier-assignments'),
        fetchApi('/api/v1/staff/cashier-assignments/context'),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (assignRes?.data) setAssignments(assignRes.data);
      if (contextRes?.data?.drawers) setDrawers(contextRes.data.drawers);
      if (contextRes?.data?.staff) setStaffList(contextRes.data.staff);
      if (branchRes?.data && Array.isArray(branchRes.data)) setBranches(branchRes.data);
    } catch (err: any) {
      console.error('Failed to load cashier assignments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const telemetry = useMemo(() => {
    const totalAssigned = assignments.length;
    const activeCustodians = assignments.filter((a) => a.status === 'ACTIVE').length;
    const totalEntrustedFloat = assignments
      .filter((a) => a.status === 'ASSIGNED' || a.status === 'ACTIVE')
      .reduce((acc, a) => acc + parseFloat(a.allocatedFloat || '0'), 0);
    const elevatedRefundClearances = assignments.filter((a) => a.allowRefunds && (a.status === 'ASSIGNED' || a.status === 'ACTIVE')).length;

    return {
      totalAssigned,
      activeCustodians,
      totalEntrustedFloat: Number(totalEntrustedFloat.toFixed(2)),
      elevatedRefundClearances,
    };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchesBranch = branchFilter === 'ALL' || String(a.branchId) === branchFilter;
      const matchesShift = shiftFilter === 'ALL' || a.shiftType === shiftFilter;
      const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        a.cashierName.toLowerCase().includes(q) ||
        a.drawerName.toLowerCase().includes(q) ||
        a.branchName.toLowerCase().includes(q) ||
        a.supervisorName.toLowerCase().includes(q);

      return matchesBranch && matchesShift && matchesStatus && matchesQuery;
    });
  }, [assignments, branchFilter, shiftFilter, statusFilter, searchQuery]);

  const openCreateModal = () => {
    setModalError(null);
    const initialBranchId = branches[0]?.id ? String(branches[0].id) : '';
    setFormData({
      branchId: initialBranchId,
      cashDrawerId: drawers[0]?.id ? String(drawers[0].id) : '',
      userId: staffList[0]?.id ? String(staffList[0].id) : '',
      assignmentDate: new Date().toISOString().split('T')[0],
      shiftType: 'MORNING',
      allocatedFloat: 5000,
      maxCashLimit: 50000,
      allowRefunds: false,
      allowDrawerPop: true,
      allowManualDiscount: false,
      maxDiscountPercent: 10,
      handoverNotes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      setIsSubmitting(true);
      await fetchApi('/api/v1/staff/cashier-assignments', {
        method: 'POST',
        body: JSON.stringify({
          branchId: parseInt(formData.branchId, 10),
          cashDrawerId: parseInt(formData.cashDrawerId, 10),
          userId: parseInt(formData.userId, 10),
          assignmentDate: formData.assignmentDate,
          shiftType: formData.shiftType,
          allocatedFloat: Number(formData.allocatedFloat),
          maxCashLimit: Number(formData.maxCashLimit),
          allowRefunds: formData.allowRefunds,
          allowDrawerPop: formData.allowDrawerPop,
          allowManualDiscount: formData.allowManualDiscount,
          maxDiscountPercent: formData.allowManualDiscount ? Number(formData.maxDiscountPercent) : 0,
          handoverNotes: formData.handoverNotes || null,
        }),
      });
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to establish cashier custody');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusTransition = async (id: number, nextStatus: 'ACTIVE' | 'RELEASED') => {
    try {
      await fetchApi(`/api/v1/staff/cashier-assignments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to transition custody status');
    }
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeTarget) return;
    try {
      setIsSubmitting(true);
      await fetchApi(`/api/v1/staff/cashier-assignments/${revokeTarget.id}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason: revokeReason }),
      });
      setRevokeTarget(null);
      setRevokeReason('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke custody');
    } finally {
      setIsSubmitting(false);
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
            <span className="text-xs font-bold text-servora-navy">Cashier Custody & Till Authorization</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Cash Drawer Custodians & Terminal Allocations</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Assign designated staff custodians to physical POS registers, configure cash drop limits, and grant refund/discount authorities.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Assign Custodian
          </button>
          <button
            onClick={loadData}
            title="Refresh Ledger"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 2. CUSTODIAL FIDUCIARY TELEMETRY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Custodians</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {telemetry.activeCustodians} Tills Open
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Entrusted Float</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              KES {telemetry.totalEntrustedFloat.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Wallet size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Refund Authorized</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {telemetry.elevatedRefundClearances} Cashiers
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <RotateCcw size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Allocations</span>
            <p className="text-xl font-bold font-mono text-gray-700 mt-0.5">{telemetry.totalAssigned}</p>
          </div>
          <div className="p-2.5 bg-gray-100 text-gray-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTERS */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search cashier, drawer, supervisor..."
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
              <option value="ALL">All Branch Outlets</option>
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
            <option value="MORNING">Morning</option>
            <option value="MIDDAY">Midday</option>
            <option value="EVENING">Evening</option>
            <option value="NIGHT_CLOSING">Night Closing</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="ALL">All Custody States</option>
            <option value="ASSIGNED">Assigned (Ready)</option>
            <option value="ACTIVE">Active (In Use)</option>
            <option value="RELEASED">Released (Closed)</option>
            <option value="REVOKED">Revoked (Suspended)</option>
          </select>
        </div>

        {/* 4. MASTER LEDGER TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Date & Shift</th>
                <th className="py-2.5 px-3">Terminal & Drawer</th>
                <th className="py-2.5 px-3">Assigned Cashier Custodian</th>
                <th className="py-2.5 px-3">Opening Float / Limit</th>
                <th className="py-2.5 px-3">Discretionary Clearances</th>
                <th className="py-2.5 px-3">Authorizing Supervisor</th>
                <th className="py-2.5 px-3">Custody State</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400 italic">
                    No cashier drawer custody allocations found.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <div>
                        <span className="font-bold text-servora-navy block">{new Date(rec.assignmentDate).toLocaleDateString()}</span>
                        <span className="text-[10px] font-mono uppercase text-servora-core font-bold">
                          {rec.shiftType.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-bold text-servora-navy">
                        <Wallet size={13} className="text-gray-400 shrink-0" />
                        <span>{rec.drawerName}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 block">{rec.branchName}</span>
                    </td>

                    <td className="py-3 px-3">
                      <div>
                        <span className="font-bold text-servora-navy block">{rec.cashierName}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">
                          {rec.cashierRole.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px]">
                      <div>
                        <span className="font-bold text-servora-navy block">
                          Float: KES {parseFloat(rec.allocatedFloat).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-500 block">
                          Drop Cap: KES {parseFloat(rec.maxCashLimit).toLocaleString()}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {rec.allowRefunds ? (
                          <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9.5px] font-bold">
                            Refunds
                          </span>
                        ) : null}
                        {rec.allowManualDiscount ? (
                          <span className="px-1.5 py-0.2 bg-blue-50 text-servora-core border border-blue-200 rounded text-[9.5px] font-bold">
                            Disc ≤{rec.maxDiscountPercent}%
                          </span>
                        ) : null}
                        {rec.allowDrawerPop ? (
                          <span className="px-1.5 py-0.2 bg-slate-100 text-gray-700 border border-gray-200 rounded text-[9.5px]">
                            Pop Till
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-medium text-gray-700 block">{rec.supervisorName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {rec.status === 'ACTIVE' ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                        </span>
                      ) : rec.status === 'ASSIGNED' ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-servora-core border border-blue-200 rounded-md font-bold text-[10px]">
                          Assigned
                        </span>
                      ) : rec.status === 'RELEASED' ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-gray-600 rounded-md font-bold text-[10px]">
                          Released
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-bold text-[10px]">
                          Revoked
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {rec.status === 'ASSIGNED' && (
                          <button
                            onClick={() => handleStatusTransition(rec.id, 'ACTIVE')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Open Till
                          </button>
                        )}
                        {rec.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleStatusTransition(rec.id, 'RELEASED')}
                            className="px-2 py-1 bg-slate-50 hover:bg-gray-100 text-servora-navy border border-gray-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Release
                          </button>
                        )}
                        {rec.status !== 'REVOKED' && rec.status !== 'RELEASED' && (
                          <button
                            onClick={() => setRevokeTarget(rec)}
                            title="Revoke Cashier Drawer Access"
                            className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Power size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: ALLOCATE CASHIER CUSTODY */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Assign Cash Drawer Custody</h3>
                <p className="text-[11px] text-gray-400">Entrust opening float and configure transaction permissions</p>
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

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Physical Cash Drawer *</label>
                  <select
                    required
                    value={formData.cashDrawerId}
                    onChange={(e) => setFormData({ ...formData, cashDrawerId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="">Select Drawer Register...</option>
                    {drawers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Cashier Custodian *</label>
                  <select
                    required
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="">Select Staff Member...</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.role.replace('_', ' ')})
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
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Assignment Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.assignmentDate}
                    onChange={(e) => setFormData({ ...formData, assignmentDate: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Opening Float (KES)</label>
                  <input
                    type="number"
                    step="500"
                    min={0}
                    value={formData.allocatedFloat}
                    onChange={(e) => setFormData({ ...formData, allocatedFloat: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Max Till Limit (KES)</label>
                  <input
                    type="number"
                    step="1000"
                    min={1000}
                    value={formData.maxCashLimit}
                    onChange={(e) => setFormData({ ...formData, maxCashLimit: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              {/* Transaction Clearances */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <span className="font-bold text-servora-navy text-xs block">Operational Clearances at Terminal</span>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowDrawerPop}
                      onChange={(e) => setFormData({ ...formData, allowDrawerPop: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-[11px] text-gray-700">Open Till (No Sale)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowRefunds}
                      onChange={(e) => setFormData({ ...formData, allowRefunds: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-[11px] text-gray-700">Process Refunds</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowManualDiscount}
                      onChange={(e) => setFormData({ ...formData, allowManualDiscount: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-[11px] text-gray-700">Item Discounts</span>
                  </label>
                </div>
                {formData.allowManualDiscount && (
                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Max Discretionary Discount:</span>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={formData.maxDiscountPercent}
                        onChange={(e) => setFormData({ ...formData, maxDiscountPercent: Number(e.target.value) })}
                        className="w-16 px-2 py-1 bg-white border border-gray-200 rounded font-bold text-right text-xs"
                      />
                      <span>%</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Supervisor Notes / Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Verified 5,000 KES opening float with shift supervisor"
                  value={formData.handoverNotes}
                  onChange={(e) => setFormData({ ...formData, handoverNotes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
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
                  {isSubmitting ? 'Assigning...' : 'Assign Custody'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: EMERGENCY REVOKE CUSTODY */}
      {revokeTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-rose-700">Revoke Cashier Custody</h3>
                <p className="text-[11px] text-gray-400">Lock drawer terminal for {revokeTarget.cashierName}</p>
              </div>
              <button onClick={() => setRevokeTarget(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRevokeSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Reason for Revocation *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State reason for revoking cash drawer custody (e.g. till discrepancy audit or unexpected shift leave)"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRevokeTarget(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || revokeReason.trim().length < 3}
                  className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}