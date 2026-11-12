'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Plus,
  ChevronRight,
  Search,
  DollarSign,
  Users,
  Lock,
  Unlock,
  Coins,
  X,
  ArrowDownLeft,
  Calculator,
  UserCheck,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ShiftRecord {
  id: number;
  branchId: number;
  branchName: string;
  cashierId: number;
  cashierName: string;
  cashierEmail: string;
  cashierRole?: string;
  openingFloat: number;
  posSalesDoneSoFar: number;
  safeDropsTotal?: number;
  expectedCash: number;
  countedCash: number | null;
  variance: number | null;
  status: 'OPEN' | 'CLOSED';
  varianceNotes: string | null;
  openedAt: string;
  closedAt: string | null;
  closedByName: string | null;
}

interface ActiveShift {
  id: number;
  branchId: number;
  branchName: string;
  cashierId: number;
  openingFloat: number;
  inboundCashSales: number;
  safeDropsTotal: number;
  payoutsTotal: number;
  liveExpectedCash: number;
  status: 'OPEN';
  openedAt: string;
  drawerSession?: {
    id: number;
    drawerId: number;
    drawerName: string;
    drawerCode: string;
  } | null;
}

interface ShiftMetrics {
  totalShifts: number;
  activeOpenShifts: number;
  totalCashVolumeKes: number;
  totalNetVarianceKes: number;
  discrepancyCount: number;
}

interface StaffOption {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface DrawerOption {
  id: number;
  drawerCode: string;
  name: string;
  status: 'OPEN' | 'CLOSED';
  currentBalance: number;
}

interface RosterAssignment {
  id: number;
  userId: number;
  cashierName: string;
  cashDrawerId: number;
  drawerName: string;
  drawerCode: string;
  shiftType: 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT_CLOSING';
  allocatedFloat: number;
  status: string;
}

export default function CashShiftsPage() {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [metrics, setMetrics] = useState<ShiftMetrics | null>(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [drawers, setDrawers] = useState<DrawerOption[]>([]);
  const [todayAssignments, setTodayAssignments] = useState<RosterAssignment[]>([]);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedShiftForClose, setSelectedShiftForClose] = useState<ShiftRecord | ActiveShift | null>(null);
  const [selectedShiftForMovement, setSelectedShiftForMovement] = useState<ShiftRecord | ActiveShift | null>(null);

  // Open Shift Form State (Supports Manager Proxy Opening)
  const [selectedCashierId, setSelectedCashierId] = useState<string>('');
  const [selectedDrawerId, setSelectedDrawerId] = useState<string>('');
  const [shiftType, setShiftType] = useState<'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT_CLOSING'>('MORNING');
  const [openingFloatAmount, setOpeningFloatAmount] = useState<string>('5000');
  const [openShiftNotes, setOpenShiftNotes] = useState<string>('');

  // Safe Drop / Petty Cash Form State
  const [movementType, setMovementType] = useState<'SAFE_DROP' | 'PETTY_CASH_PAYOUT'>('SAFE_DROP');
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementReason, setMovementReason] = useState<string>('Mid-shift safe drop transfer');

  // Blind Closeout & Denominations State
  const [useDenominations, setUseDenominations] = useState<boolean>(true);
  const [denoms, setDenoms] = useState<Record<string, number>>({
    '1000': 0,
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    coins: 0,
  });
  const [manualCountedCash, setManualCountedCash] = useState<string>('');
  const [varianceReason, setVarianceReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const activeBranchId =
        typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;
      if (activeBranchId) params.set('branchId', activeBranchId);

      const branchQuery = activeBranchId ? `?branchId=${activeBranchId}` : '';

      const [shiftsRes, metricsRes, activeRes, setupRes] = await Promise.all([
        fetchApi(`/api/v1/cash-management/shifts?${params.toString()}`),
        fetchApi(`/api/v1/cash-management/shifts/metrics${branchQuery}`),
        fetchApi(`/api/v1/cash-management/shifts/active${branchQuery}`),
        fetchApi(`/api/v1/cash-management/shifts/setup${branchQuery}`),
      ]);

      if (shiftsRes?.data?.shifts) setShifts(shiftsRes.data.shifts);
      if (metricsRes?.data) setMetrics(metricsRes.data);
      if (activeRes?.data) setActiveShift(activeRes.data);
      else setActiveShift(null);

      if (setupRes?.data) {
        setStaffList(setupRes.data.staff || []);
        setDrawers(setupRes.data.drawers || []);
        setTodayAssignments(setupRes.data.todayAssignments || []);
      }
    } catch (err: any) {
      console.error('Failed to load cash shift telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculatedDenomTotal = useMemo(() => {
    return (
      (denoms['1000'] || 0) * 1000 +
      (denoms['500'] || 0) * 500 +
      (denoms['200'] || 0) * 200 +
      (denoms['100'] || 0) * 100 +
      (denoms['50'] || 0) * 50 +
      (denoms['coins'] || 0)
    );
  }, [denoms]);

  const handleOpenModalTrigger = (presetAssignment?: RosterAssignment) => {
    const closedDrawers = drawers.filter((d) => d.status === 'CLOSED');
    if (presetAssignment) {
      setSelectedCashierId(String(presetAssignment.userId));
      setSelectedDrawerId(String(presetAssignment.cashDrawerId));
      setShiftType(presetAssignment.shiftType);
      setOpeningFloatAmount(String(presetAssignment.allocatedFloat || 5000));
    } else {
      setSelectedCashierId('');
      setSelectedDrawerId(closedDrawers[0] ? String(closedDrawers[0].id) : '');
      setShiftType('MORNING');
      setOpeningFloatAmount('5000');
    }
    setOpenShiftNotes('');
    setIsOpenModalOpen(true);
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const activeBranchId =
        typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;
      const branchId = activeBranchId ? parseInt(activeBranchId, 10) : 1;

      const res = await fetchApi('/api/v1/cash-management/shifts/open', {
        method: 'POST',
        body: JSON.stringify({
          branchId,
          cashierId: selectedCashierId ? parseInt(selectedCashierId, 10) : undefined,
          cashDrawerId: selectedDrawerId ? parseInt(selectedDrawerId, 10) : undefined,
          shiftType,
          openingFloat: parseFloat(openingFloatAmount) || 0,
          notes: openShiftNotes.trim() || undefined,
        }),
      });

      setIsOpenModalOpen(false);
      setToastMessage({ text: res.message || 'Shift opened successfully.', type: 'success' });
      setTimeout(() => setToastMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to open shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCashMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftForMovement) return;

    try {
      setIsSubmitting(true);
      const res = await fetchApi('/api/v1/cash-management/shifts/cash-movement', {
        method: 'POST',
        body: JSON.stringify({
          shiftId: selectedShiftForMovement.id,
          movementType,
          amount: parseFloat(movementAmount) || 0,
          reason: movementReason.trim(),
        }),
      });

      setIsMovementModalOpen(false);
      setMovementAmount('');
      setToastMessage({ text: res.message || 'Cash movement recorded.', type: 'success' });
      setTimeout(() => setToastMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record cash movement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftForClose) return;

    const finalCounted = useDenominations
      ? calculatedDenomTotal
      : parseFloat(manualCountedCash) || 0;

    try {
      setIsSubmitting(true);
      const res = await fetchApi('/api/v1/cash-management/shifts/close', {
        method: 'POST',
        body: JSON.stringify({
          shiftId: selectedShiftForClose.id,
          countedCash: finalCounted,
          denominations: useDenominations ? denoms : undefined,
          varianceNotes: varianceReason.trim() || undefined,
        }),
      });

      setIsCloseModalOpen(false);
      setSelectedShiftForClose(null);
      setManualCountedCash('');
      setDenoms({ '1000': 0, '500': 0, '200': 0, '100': 0, '50': 0, coins: 0 });
      setVarianceReason('');
      setToastMessage({ text: res.message || 'Shift reconciled and closed.', type: 'success' });
      setTimeout(() => setToastMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to close shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter out roster assignments that already have an OPEN shift today
  const openCashierIds = useMemo(
    () => new Set(shifts.filter((s) => s.status === 'OPEN').map((s) => s.cashierId)),
    [shifts]
  );
  const pendingRosterAssignments = useMemo(
    () => todayAssignments.filter((a) => !openCashierIds.has(a.userId)),
    [todayAssignments, openCashierIds]
  );

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Enterprise Control <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Treasury & Workforce Custody</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Wallet className="text-servora-core" size={24} />
            Cashier Shift & Drawer Settlement Cockpit
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Multi-cashier POS custody, roster-linked drawer allocation, mid-shift safe drops, and blind Z-report closeouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => handleOpenModalTrigger()}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> Open Cashier Shift
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
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. ENTERPRISE FIDUCIARY METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Sessions</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {metrics ? metrics.activeOpenShifts : 0}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Concurrent Open Shifts</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Unlock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reconciled Cash</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              KES {metrics ? metrics.totalCashVolumeKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Settled to Main Safe</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Net Drift Variance</span>
            <p
              className={`text-xl font-bold font-mono mt-0.5 ${
                metrics && metrics.totalNetVarianceKes < 0 ? 'text-rose-600' : 'text-servora-navy'
              }`}
            >
              KES {metrics ? metrics.totalNetVarianceKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-400 font-medium">Cumulative Over/Short</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Coins size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Audited Breaches</span>
            <p className="text-xl font-bold font-mono text-rose-700 mt-0.5">
              {metrics ? metrics.discrepancyCount : 0}
            </p>
            <span className="text-[10px] text-rose-600 font-medium">&gt; KES 50 Tolerance</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert size={18} />
          </div>
        </div>
      </div>

      {/* 3. SCHEDULED CUSTODIAN ASSIGNMENTS QUEUE (IF ROSTERED STAFF HAVEN'T OPENED YET) */}
      {pendingRosterAssignments.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-servora-navy flex items-center gap-1.5">
              <UserCheck size={14} className="text-servora-core" />
              Scheduled Custodian Assignments Ready for Activation ({pendingRosterAssignments.length})
            </span>
            <Link
              href="/staff/cashier-assignments"
              className="text-[11px] font-bold text-servora-core hover:underline"
            >
              Manage Roster Custody &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {pendingRosterAssignments.map((a) => (
              <div
                key={a.id}
                className="p-3 bg-slate-50 border border-gray-200 rounded-xl flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-servora-navy block">{a.cashierName}</span>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {a.drawerName} [{a.drawerCode}] &bull; {a.shiftType}
                  </span>
                </div>
                <button
                  onClick={() => handleOpenModalTrigger(a)}
                  className="px-2.5 py-1.5 bg-servora-core text-white font-bold rounded-lg text-[11px] hover:bg-blue-700 cursor-pointer shrink-0"
                >
                  Activate (KES {a.allocatedFloat.toLocaleString()})
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ACTIVE SHIFT COCKPIT (IF CURRENT USER HAS AN OPEN SHIFT) */}
      {activeShift && (
        <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/40 p-5 rounded-2xl border border-blue-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">
                <Clock size={10} /> Your Active Session
              </span>
              {activeShift.drawerSession && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-servora-navy border border-gray-200">
                  {activeShift.drawerSession.drawerName} [{activeShift.drawerSession.drawerCode}]
                </span>
              )}
              <span className="text-xs font-mono text-gray-500">
                Opened {new Date(activeShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h3 className="text-base font-bold text-servora-navy">
              Shift #{activeShift.id} &bull; {activeShift.branchName || 'Main Outlet'}
            </h3>
            <p className="text-xs text-gray-600">
              Float: <strong className="font-mono text-servora-navy">KES {activeShift.openingFloat.toLocaleString()}</strong> | Cash Sales:{' '}
              <strong className="font-mono text-emerald-700">+KES {activeShift.inboundCashSales.toLocaleString()}</strong> | Safe Drops:{' '}
              <strong className="font-mono text-amber-700">-KES {(activeShift.safeDropsTotal + activeShift.payoutsTotal).toLocaleString()}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="text-right mr-2">
              <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Live Expected Balance</span>
              <span className="text-lg font-bold font-mono text-servora-core">
                KES {activeShift.liveExpectedCash.toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedShiftForMovement(activeShift);
                setMovementType('SAFE_DROP');
                setMovementReason('Mid-shift safe drop transfer');
                setIsMovementModalOpen(true);
              }}
              className="px-3.5 py-2 bg-white border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors shadow-xs cursor-pointer flex items-center gap-1"
            >
              <ArrowDownLeft size={14} className="text-amber-600" /> Safe Drop / Payout
            </button>
            <button
              onClick={() => {
                setSelectedShiftForClose(activeShift);
                setIsCloseModalOpen(true);
              }}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
            >
              Reconcile & Close Shift
            </button>
          </div>
        </div>
      )}

      {/* 5. MULTI-CASHIER SHIFTS DIRECTORY & AUDIT TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            {(['ALL', 'OPEN', 'CLOSED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-white text-servora-navy shadow-xs' : 'text-gray-500 hover:text-black'
                }`}
              >
                {st === 'ALL' ? 'All Shifts' : st === 'OPEN' ? 'In Service (Open)' : 'Reconciled (Closed)'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search cashier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
              />
            </div>
            <span className="text-xs font-mono text-gray-400">
              {shifts.length} Recorded Shifts
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Shift ID</th>
                <th className="py-2.5 px-3">Cashier Custodian</th>
                <th className="py-2.5 px-3">Branch Outlet</th>
                <th className="py-2.5 px-3 text-right">Opening Float</th>
                <th className="py-2.5 px-3 text-right">POS Sales So Far</th>
                <th className="py-2.5 px-3 text-right">Expected Cash</th>
                <th className="py-2.5 px-3 text-right">Counted Cash</th>
                <th className="py-2.5 px-3 text-right">Variance</th>
                <th className="py-2.5 px-3">Audit Status</th>
                <th className="py-2.5 px-3">Timeline & Sign-off</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400 italic">
                    <div className="max-w-md mx-auto space-y-2">
                      <Wallet size={36} className="mx-auto opacity-20 text-servora-navy" />
                      <p className="font-bold text-servora-navy not-italic">No Cash Shifts Recorded</p>
                      <p className="text-xs text-gray-500 not-italic">
                        Click <strong>Open Cashier Shift</strong> above to assign a cashier and cash drawer register.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                shifts.map((s) => {
                  const isBalanced = s.variance === 0;
                  const isShortage = s.variance !== null && s.variance < 0;
                  const isOverage = s.variance !== null && s.variance > 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-servora-navy">#{s.id}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{s.cashierName}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {s.cashierRole || 'STAFF'} &bull; {s.cashierEmail}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 font-medium">{s.branchName || 'Main Outlet'}</td>
                      <td className="py-3 px-3 text-right font-mono text-gray-700">
                        KES {s.openingFloat.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        +KES {(s.posSalesDoneSoFar || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-core">
                        KES {s.expectedCash.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-purple-700">
                        {s.countedCash !== null ? `KES ${s.countedCash.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {s.variance !== null ? (
                          <span
                            className={`font-bold ${
                              isShortage ? 'text-rose-600' : isOverage ? 'text-amber-600' : 'text-emerald-700'
                            }`}
                          >
                            {s.variance > 0 ? `+KES ${s.variance.toLocaleString()}` : `KES ${s.variance.toLocaleString()}`}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-normal">Pending Drop</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {s.status === 'OPEN' ? (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            Active (Open)
                          </span>
                        ) : isBalanced ? (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Balanced
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            Discrepancy
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-gray-500 font-mono">
                        <div>In: {new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        {s.closedAt && (
                          <div className="text-[10px] text-gray-400">
                            Closed by: {s.closedByName || 'Supervisor'}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {s.status === 'OPEN' && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedShiftForMovement(s);
                                setMovementType('SAFE_DROP');
                                setMovementReason('Mid-shift safe drop transfer');
                                setIsMovementModalOpen(true);
                              }}
                              className="px-2 py-1 bg-slate-50 border border-gray-200 hover:bg-amber-50 hover:text-amber-800 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                              title="Record Safe Drop or Payout"
                            >
                              Drop
                            </button>
                            <button
                              onClick={() => {
                                setSelectedShiftForClose(s);
                                setIsCloseModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-50 border border-gray-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                            >
                              Close
                            </button>
                          </div>
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

      {/* 6. MODAL: OPEN CASHIER SHIFT (MULTI-STAFF & DRAWER ASSIGNMENT) */}
      {isOpenModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Open Cashier Shift Session</h3>
                <p className="text-[11px] text-gray-400">Assign staff custodian, cash drawer & starting float</p>
              </div>
              <button onClick={() => setIsOpenModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Cashier Custodian (Leave blank for yourself)
                </label>
                <select
                  value={selectedCashierId}
                  onChange={(e) => setSelectedCashierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-medium text-servora-navy focus:outline-none focus:border-servora-core"
                >
                  <option value="">Myself (Current Authenticated Session)</option>
                  {staffList
                    .filter((u) => !openCashierIds.has(u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Cash Drawer Register
                  </label>
                  <select
                    value={selectedDrawerId}
                    onChange={(e) => setSelectedDrawerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-medium text-servora-navy focus:outline-none focus:border-servora-core"
                  >
                    <option value="">No Physical Drawer</option>
                    {drawers
                      .filter((d) => d.status === 'CLOSED')
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} [{d.drawerCode}]
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Shift Rotation *
                  </label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none focus:border-servora-core"
                  >
                    <option value="MORNING">Morning Shift</option>
                    <option value="MIDDAY">Midday Shift</option>
                    <option value="EVENING">Evening Shift</option>
                    <option value="NIGHT_CLOSING">Night Closing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Starting Cash Float (KES) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="50"
                  value={openingFloatAmount}
                  onChange={(e) => setOpeningFloatAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-sm text-servora-navy focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Handover / Float Verification Notes
                </label>
                <input
                  type="text"
                  value={openShiftNotes}
                  onChange={(e) => setOpenShiftNotes(e.target.value)}
                  placeholder="e.g. Verified KES 5,000 change denominations"
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Starting...' : 'Confirm & Open Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: SAFE DROP & PETTY CASH PAYOUT */}
      {isMovementModalOpen && selectedShiftForMovement && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Mid-Shift Treasury Movement</h3>
                <p className="text-[11px] text-gray-400">Shift #{selectedShiftForMovement.id} Safe Drop or Payout</p>
              </div>
              <button onClick={() => setIsMovementModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCashMovementSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMovementType('SAFE_DROP');
                    setMovementReason('Mid-shift safe drop transfer');
                  }}
                  className={`py-2 px-3 rounded-xl font-bold border text-center cursor-pointer ${
                    movementType === 'SAFE_DROP'
                      ? 'bg-blue-50 border-servora-core text-servora-core'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  Safe Drop Transfer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMovementType('PETTY_CASH_PAYOUT');
                    setMovementReason('Supplier COD / petty cash payout');
                  }}
                  className={`py-2 px-3 rounded-xl font-bold border text-center cursor-pointer ${
                    movementType === 'PETTY_CASH_PAYOUT'
                      ? 'bg-amber-50 border-amber-500 text-amber-800'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  Petty Cash Payout
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Amount (KES) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-sm text-servora-navy focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Audit Justification / Voucher Ref *
                </label>
                <input
                  type="text"
                  required
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !movementAmount}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: BLIND CASH DRAWER CLOSEOUT WITH DENOMINATIONAL CALCULATOR */}
      {isCloseModalOpen && selectedShiftForClose && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Blind Reconciliation & Closeout</h3>
                <p className="text-[11px] text-gray-400">Shift #{selectedShiftForClose.id} Final Settlement</p>
              </div>
              <button onClick={() => setIsCloseModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-3.5 text-xs">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1 text-[11px]">
                  <ShieldAlert size={13} /> Blind Balancing Protocol
                </span>
                <p className="text-[10px] text-amber-800 leading-relaxed">
                  Count all physical currency in the register. Expected system balance is hidden until submission to prevent adjustment bias.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-servora-navy uppercase">Counting Mode</span>
                <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setUseDenominations(true)}
                    className={`px-2.5 py-1 rounded-md cursor-pointer ${
                      useDenominations ? 'bg-white text-servora-navy shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    KES Denominations
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseDenominations(false)}
                    className={`px-2.5 py-1 rounded-md cursor-pointer ${
                      !useDenominations ? 'bg-white text-servora-navy shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    Direct Total
                  </button>
                </div>
              </div>

              {useDenominations ? (
                <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: '1000', label: 'KES 1,000 Notes' },
                      { key: '500', label: 'KES 500 Notes' },
                      { key: '200', label: 'KES 200 Notes' },
                      { key: '100', label: 'KES 100 Notes' },
                      { key: '50', label: 'KES 50 Notes' },
                      { key: 'coins', label: 'Coins Total (KES)' },
                    ].map((d) => (
                      <div key={d.key} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                        <span className="font-medium text-gray-700 text-[11px]">{d.label}</span>
                        <input
                          type="number"
                          min="0"
                          value={denoms[d.key] || ''}
                          onChange={(e) =>
                            setDenoms({ ...denoms, [d.key]: parseInt(e.target.value, 10) || 0 })
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-right font-mono font-bold"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 font-bold">
                    <span className="text-servora-navy">Counted Physical Total:</span>
                    <span className="font-mono text-sm text-purple-700">
                      KES {calculatedDenomTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Total Physical Cash Counted (KES) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={manualCountedCash}
                    onChange={(e) => setManualCountedCash(e.target.value)}
                    placeholder="Count and enter total cash"
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-sm text-purple-700 focus:outline-none focus:border-servora-core"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Variance Explanatory Notes (If Applicable)
                </label>
                <textarea
                  rows={2}
                  value={varianceReason}
                  onChange={(e) => setVarianceReason(e.target.value)}
                  placeholder="State reason for known discrepancies, coin shortages, or damaged notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (!useDenominations && !manualCountedCash)}
                  className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  <Calculator size={14} />
                  {isSubmitting ? 'Balancing...' : 'Submit & Close Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}