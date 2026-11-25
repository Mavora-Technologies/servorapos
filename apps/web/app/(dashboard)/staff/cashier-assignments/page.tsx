// apps/web/app/(dashboard)/staff/cashier-assignments/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  UserCheck,
  Power,
  RotateCcw,
  WifiOff,
  ArrowRight,
} from 'lucide-react';
import { fetchApi, ApiError } from '@/lib/api';

interface CashierAssignmentRecord {
  id: number;
  branchId: number;
  branchName: string;
  branchCode: string;
  cashDrawerId: number;
  drawerName: string;
  drawerCode: string;
  drawerStatus: string;
  userId: number;
  cashierName: string;
  cashierEmail: string;
  cashierRole: string;
  assignedByUserId: number | null;
  supervisorName: string | null;
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
  drawerCode: string;
  name: string;
  branchId: number | null;
  status: string;
}

interface StaffOption {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  defaultBranchId: number | null;
  assignedBranchIds: number[];
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CashierAssignmentsPage() {
  const [assignments, setAssignments] = useState<CashierAssignmentRecord[]>([]);
  const [drawers, setDrawers] = useState<DrawerOption[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [currency, setCurrency] = useState('KES');
  const [defaultMaxCashLimit, setDefaultMaxCashLimit] = useState(50000);

  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // RBAC state
  const [userPermissions, setUserPermissions] = useState<string[] | undefined>(undefined);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);

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
    assignmentDate: formatLocalDate(new Date()),
    shiftType: 'MORNING' as CashierAssignmentRecord['shiftType'],
    allocatedFloat: 0,
    maxCashLimit: 50000,
    allowRefunds: false,
    allowDrawerPop: true,
    allowManualDiscount: false,
    maxDiscountPercent: 10,
    handoverNotes: '',
  });

  useEffect(() => {
    try {
      const cached = localStorage.getItem('servora_cached_workspace');
      if (cached) {
        const parsed = JSON.parse(cached);
        setUserPermissions(parsed?.user?.permissions);
        setUserRole(parsed?.user?.role);
      }
    } catch {
      // Ignore malformed cache
    }
  }, []);

  const canManageCustody = useMemo(() => {
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return true;
    return Boolean(
      userPermissions?.includes('*') ||
        userPermissions?.includes('staff.manage') ||
        userPermissions?.includes('cash.reconcile')
    );
  }, [userPermissions, userRole]);

  const loadData = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setPageError(null);

      const params = new URLSearchParams();
      if (branchFilter !== 'ALL') params.set('branchId', branchFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const [assignRes, contextRes] = await Promise.all([
        fetchApi(`/api/v1/staff/cashier-assignments?${params.toString()}`),
        fetchApi('/api/v1/staff/cashier-assignments/context'),
      ]);

      if (assignRes?.data) setAssignments(assignRes.data);
      if (contextRes?.data) {
        if (Array.isArray(contextRes.data.branches)) setBranches(contextRes.data.branches);
        if (Array.isArray(contextRes.data.drawers)) setDrawers(contextRes.data.drawers);
        if (Array.isArray(contextRes.data.staff)) setStaffList(contextRes.data.staff);
        if (contextRes.data.treasuryPolicy) {
          setCurrency(contextRes.data.treasuryPolicy.currency || 'KES');
          setDefaultMaxCashLimit(contextRes.data.treasuryPolicy.maxDrawerCashThreshold || 50000);
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.isNetworkError || err.status === 0)) {
        setIsOnline(false);
        return;
      }
      setPageError(err instanceof Error ? err.message : 'Failed to load cashier assignments.');
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const onOnline = () => {
      setIsOnline(true);
      void loadData();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [loadData]);

  // Branch-scoped drawers & staff for the Create Modal
  const eligibleDrawersForModal = useMemo(() => {
    if (!formData.branchId) return drawers;
    const targetBranch = Number(formData.branchId);
    return drawers.filter((d) => d.branchId === null || d.branchId === targetBranch);
  }, [drawers, formData.branchId]);

  const eligibleStaffForModal = useMemo(() => {
    if (!formData.branchId) return staffList;
    const targetBranch = Number(formData.branchId);
    return staffList.filter((s) => s.assignedBranchIds.includes(targetBranch));
  }, [staffList, formData.branchId]);

  const telemetry = useMemo(() => {
    const totalAssigned = assignments.length;
    const activeCustodians = assignments.filter((a) => a.status === 'ACTIVE').length;
    const totalEntrustedFloat = assignments
      .filter((a) => a.status === 'ASSIGNED' || a.status === 'ACTIVE')
      .reduce((acc, a) => acc + parseFloat(a.allocatedFloat || '0'), 0);
    const elevatedRefundClearances = assignments.filter(
      (a) => a.allowRefunds && (a.status === 'ASSIGNED' || a.status === 'ACTIVE')
    ).length;

    return {
      totalAssigned,
      activeCustodians,
      totalEntrustedFloat: Number(totalEntrustedFloat.toFixed(2)),
      elevatedRefundClearances,
    };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchesShift = shiftFilter === 'ALL' || a.shiftType === shiftFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        a.cashierName.toLowerCase().includes(q) ||
        a.drawerName.toLowerCase().includes(q) ||
        a.drawerCode.toLowerCase().includes(q) ||
        a.branchName.toLowerCase().includes(q) ||
        (a.supervisorName && a.supervisorName.toLowerCase().includes(q));

      return matchesShift && matchesQuery;
    });
  }, [assignments, shiftFilter, searchQuery]);

  const openCreateModal = () => {
    setModalError(null);
    const defaultBranch =
      branchFilter !== 'ALL'
        ? branchFilter
        : branches[0]?.id
          ? String(branches[0].id)
          : '';
    const branchNum = Number(defaultBranch);
    const matchingDrawers = defaultBranch
      ? drawers.filter((d) => d.branchId === null || d.branchId === branchNum)
      : drawers;
    const matchingStaff = defaultBranch
      ? staffList.filter((s) => s.assignedBranchIds.includes(branchNum))
      : staffList;

    setFormData({
      branchId: defaultBranch,
      cashDrawerId: matchingDrawers[0]?.id ? String(matchingDrawers[0].id) : '',
      userId: matchingStaff[0]?.id ? String(matchingStaff[0].id) : '',
      assignmentDate: formatLocalDate(new Date()),
      shiftType: 'MORNING',
      allocatedFloat: 0,
      maxCashLimit: defaultMaxCashLimit,
      allowRefunds: false,
      allowDrawerPop: true,
      allowManualDiscount: false,
      maxDiscountPercent: 10,
      handoverNotes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleModalBranchChange = (nextBranchId: string) => {
    const branchNum = Number(nextBranchId);
    const nextDrawers = drawers.filter((d) => d.branchId === null || d.branchId === branchNum);
    const nextStaff = staffList.filter((s) => s.assignedBranchIds.includes(branchNum));
    setFormData((prev) => ({
      ...prev,
      branchId: nextBranchId,
      cashDrawerId: nextDrawers[0]?.id ? String(nextDrawers[0].id) : '',
      userId: nextStaff[0]?.id ? String(nextStaff[0].id) : '',
    }));
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
          maxDiscountPercent: formData.allowManualDiscount
            ? Number(formData.maxDiscountPercent)
            : 0,
          handoverNotes: formData.handoverNotes.trim() || null,
        }),
      });
      setIsCreateModalOpen(false);
      setStatusBanner('Cash drawer custody assigned successfully.');
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to establish cashier custody.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusTransition = async (id: number, nextStatus: 'ACTIVE' | 'RELEASED') => {
    setPageError(null);
    try {
      const res = await fetchApi(`/api/v1/staff/cashier-assignments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      setStatusBanner(res?.message || `Custody status transitioned to ${nextStatus}.`);
      await loadData();
    } catch (err: unknown) {
      setPageError(
        err instanceof Error ? err.message : 'Failed to transition custody status.'
      );
    }
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeTarget) return;
    setModalError(null);
    try {
      setIsSubmitting(true);
      const res = await fetchApi(`/api/v1/staff/cashier-assignments/${revokeTarget.id}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason: revokeReason.trim() }),
      });
      setRevokeTarget(null);
      setRevokeReason('');
      setStatusBanner(res?.message || 'Cash drawer custody revoked.');
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to revoke custody.');
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
            <span className="text-xs font-bold text-servora-navy">
              Cashier Custody &amp; Till Authorization
            </span>
            {!isOnline && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                <WifiOff size={10} /> Offline
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-servora-navy">
            Cash Drawer Custodians &amp; Terminal Allocations
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Assign branch-cleared staff to physical POS registers, sync live shift floats, and govern refund/discount ceilings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Link
            href="/cash-management/shifts"
            className="px-3 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1"
          >
            <span>Cashier Shifts</span>
            <ArrowRight size={12} />
          </Link>
          {canManageCustody && (
            <button
              type="button"
              disabled={!isOnline}
              onClick={openCreateModal}
              className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus size={14} /> Assign Custodian
            </button>
          )}
          <button
            type="button"
            disabled={isLoading || !isOnline}
            onClick={loadData}
            title="Refresh Ledger"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* INLINE BANNERS */}
      {statusBanner && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {pageError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 bg-rose-50 border border-rose-200 text-rose-900 px-4 py-2.5 rounded-xl text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-rose-600 shrink-0" />
            <span>{pageError}</span>
          </div>
          <button
            type="button"
            onClick={() => setPageError(null)}
            className="text-rose-700 hover:text-rose-950 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. CUSTODIAL FIDUCIARY TELEMETRY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Active Custodians
            </span>
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Entrusted Float
            </span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {currency} {telemetry.totalEntrustedFloat.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Wallet size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Refund Authorized
            </span>
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Total Allocations
            </span>
            <p className="text-xl font-bold font-mono text-gray-700 mt-0.5">
              {telemetry.totalAssigned}
            </p>
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
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={14}
            />
            <input
              type="text"
              placeholder="Search cashier, drawer code, supervisor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
            />
          </div>

          {branches.length > 1 && (
            <select
              aria-label="Filter by branch"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
            >
              <option value="ALL">All Authorized Outlets ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}

          <select
            aria-label="Filter by shift"
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
            aria-label="Filter by custody state"
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
                <th className="py-2.5 px-3">Date &amp; Shift</th>
                <th className="py-2.5 px-3">Terminal &amp; Drawer</th>
                <th className="py-2.5 px-3">Assigned Custodian</th>
                <th className="py-2.5 px-3">Opening Float / Drop Cap</th>
                <th className="py-2.5 px-3">Discretionary Clearances</th>
                <th className="py-2.5 px-3">Supervisor</th>
                <th className="py-2.5 px-3">Custody State</th>
                {canManageCustody && <th className="py-2.5 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManageCustody ? 8 : 7}
                    className="py-8 text-center text-gray-400 italic"
                  >
                    {isLoading
                      ? 'Loading cashier custody ledger...'
                      : 'No cashier drawer custody allocations found.'}
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-servora-navy block">
                        {new Date(rec.assignmentDate).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] font-mono uppercase text-servora-core font-bold">
                        {rec.shiftType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-bold text-servora-navy">
                        <Wallet size={13} className="text-gray-400 shrink-0" />
                        <span>{rec.drawerName}</span>
                        <span className="text-[10px] font-mono text-gray-400">
                          [{rec.drawerCode}]
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 block">{rec.branchName}</span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-bold text-servora-navy block">{rec.cashierName}</span>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">
                        {rec.cashierRole.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px]">
                      <span className="font-bold text-servora-navy block">
                        Float: {currency} {parseFloat(rec.allocatedFloat).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-500 block">
                        Drop Cap: {currency} {parseFloat(rec.maxCashLimit).toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {rec.allowRefunds && (
                          <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9.5px] font-bold">
                            Refunds
                          </span>
                        )}
                        {rec.allowManualDiscount && (
                          <span className="px-1.5 py-0.2 bg-blue-50 text-servora-core border border-blue-200 rounded text-[9.5px] font-bold">
                            Disc ≤{rec.maxDiscountPercent}%
                          </span>
                        )}
                        {rec.allowDrawerPop && (
                          <span className="px-1.5 py-0.2 bg-slate-100 text-gray-700 border border-gray-200 rounded text-[9.5px]">
                            Pop Till
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-medium text-gray-700 block">
                        {rec.supervisorName || 'System'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(rec.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {rec.status === 'ACTIVE' ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{' '}
                          Active
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

                    {canManageCustody && (
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {rec.status === 'ASSIGNED' && (
                            <button
                              type="button"
                              disabled={!isOnline}
                              onClick={() => handleStatusTransition(rec.id, 'ACTIVE')}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Open Till
                            </button>
                          )}
                          {rec.status === 'ACTIVE' && (
                            <button
                              type="button"
                              disabled={!isOnline}
                              onClick={() => handleStatusTransition(rec.id, 'RELEASED')}
                              className="px-2 py-1 bg-slate-50 hover:bg-gray-100 text-servora-navy border border-gray-200 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Release
                            </button>
                          )}
                          {rec.status !== 'REVOKED' && rec.status !== 'RELEASED' && (
                            <button
                              type="button"
                              disabled={!isOnline}
                              onClick={() => {
                                setModalError(null);
                                setRevokeReason('');
                                setRevokeTarget(rec);
                              }}
                              title="Emergency Revoke Cashier Drawer Access"
                              className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Power size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: ALLOCATE CASHIER CUSTODY */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Assign Cash Drawer Custody</h3>
                <p className="text-[11px] text-gray-400">
                  Scoped to drawers and staff cleared for the selected outlet
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Operating Branch *
                  </label>
                  <select
                    required
                    value={formData.branchId}
                    onChange={(e) => handleModalBranchChange(e.target.value)}
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Physical Cash Drawer *
                  </label>
                  <select
                    required
                    value={formData.cashDrawerId}
                    onChange={(e) => setFormData({ ...formData, cashDrawerId: e.target.value })}
                    disabled={eligibleDrawersForModal.length === 0}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer disabled:opacity-60"
                  >
                    {eligibleDrawersForModal.length === 0 ? (
                      <option value="">No drawers in this branch</option>
                    ) : (
                      eligibleDrawersForModal.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} [{d.drawerCode}]
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Cashier Custodian *
                  </label>
                  <select
                    required
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    disabled={eligibleStaffForModal.length === 0}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer disabled:opacity-60"
                  >
                    {eligibleStaffForModal.length === 0 ? (
                      <option value="">No cleared staff in branch</option>
                    ) : (
                      eligibleStaffForModal.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} ({s.role.replace(/_/g, ' ')})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Shift Type *
                  </label>
                  <select
                    value={formData.shiftType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shiftType: e.target.value as CashierAssignmentRecord['shiftType'],
                      })
                    }
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Assignment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.assignmentDate}
                    onChange={(e) => setFormData({ ...formData, assignmentDate: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Opening Float ({currency})
                  </label>
                  <input
                    type="number"
                    step="100"
                    min={0}
                    value={formData.allocatedFloat}
                    onChange={(e) =>
                      setFormData({ ...formData, allocatedFloat: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Max Till Limit ({currency})
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min={1000}
                    value={formData.maxCashLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, maxCashLimit: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              {/* Transaction Clearances */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <span className="font-bold text-servora-navy text-xs block">
                  Operational Clearances at Terminal
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowDrawerPop}
                      onChange={(e) =>
                        setFormData({ ...formData, allowDrawerPop: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-[11px] text-gray-700">Open Till (No Sale)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowRefunds}
                      onChange={(e) =>
                        setFormData({ ...formData, allowRefunds: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-[11px] text-gray-700">Process Refunds</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowManualDiscount}
                      onChange={(e) =>
                        setFormData({ ...formData, allowManualDiscount: e.target.checked })
                      }
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
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maxDiscountPercent: Number(e.target.value),
                          })
                        }
                        className="w-16 px-2 py-1 bg-white border border-gray-200 rounded font-bold text-right text-xs"
                      />
                      <span>%</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Supervisor Notes / Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified opening float with shift supervisor"
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
                  disabled={
                    isSubmitting || !formData.branchId || !formData.cashDrawerId || !formData.userId
                  }
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
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-rose-700">Revoke Cashier Custody</h3>
                <p className="text-[11px] text-gray-400">
                  Lock drawer terminal for {revokeTarget.cashierName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div
                role="alert"
                className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleRevokeSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Reason for Revocation *
                </label>
                <textarea
                  required
                  minLength={3}
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