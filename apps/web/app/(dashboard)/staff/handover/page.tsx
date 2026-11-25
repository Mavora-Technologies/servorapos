// apps/web/app/(dashboard)/staff/handover/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  CheckSquare,
  Square,
  X,
  Eye,
  Check,
  WifiOff,
  Sparkles,
  Flag,
  ArrowRight,
  Scale,
} from 'lucide-react';
import { fetchApi, ApiError } from '@/lib/api';

interface HandoverRecord {
  id: number;
  branchId: number;
  branchName: string;
  branchCode: string;
  handoverScope: 'BRANCH_WIDE' | 'TILL_CUSTODY';
  cashierShiftId: number | null;
  cashDrawerId: number | null;
  drawerName: string | null;
  drawerCode: string | null;
  linkedAdjustmentId: number | null;
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
  status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'DISPUTED' | 'RESOLVED';
  outgoingSignedAt: string;
  incomingSignedAt: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  outgoingManagerId: number;
  outgoingManagerName: string;
  outgoingManagerRole?: string;
  incomingManagerId: number | null;
  incomingManagerName: string | null;
  createdAt: string;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

interface BranchLiveContext {
  targetDate: string;
  currency: string;
  treasury: {
    totalShifts: number;
    openShifts: number;
    closedShifts: number;
    openDrawersCount: number;
    openingFloat: number;
    expectedCash: number;
    countedCash: number;
    variance: number;
  };
  shifts: Array<{
    id: number;
    cashierId: number;
    cashierName: string;
    cashierRole: string;
    drawerId: number | null;
    status: string;
    openingFloat: number;
    expectedCash: number;
    countedCash: number;
    variance: number;
    openedAt: string;
  }>;
  drawers: Array<{
    id: number;
    drawerCode: string;
    name: string;
    status: string;
    currentBalance: number;
  }>;
  eligibleIncomingManagers: Array<{
    id: number;
    fullName: string;
    role: string;
  }>;
  operations: {
    openKitchenTickets: number;
    onDutyStaffCount: number;
    items86ed: Array<{ name: string; reason: string | null }>;
  };
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DEFAULT_CHECKLIST = [
  { id: '1', text: 'Cash Drawer Float reconciled with Z-Report', completed: false },
  { id: '2', text: 'All KDS kitchen tickets completed and closed', completed: false },
  { id: '3', text: 'Walk-in chiller and freezer temperatures logged', completed: false },
  { id: '4', text: 'Safe locked and physical keys transferred', completed: false },
];

export default function StaffHandoverPage() {
  const [handovers, setHandovers] = useState<HandoverRecord[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [userPermissions, setUserPermissions] = useState<string[] | undefined>(undefined);
  const [currency, setCurrency] = useState('KES');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & Live Context
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [branchContext, setBranchContext] = useState<BranchLiveContext | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [viewingHandover, setViewingHandover] = useState<HandoverRecord | null>(null);
  const [ackNotes, setAckNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showDisputeInput, setShowDisputeInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Create Form State
  const [formData, setFormData] = useState({
    branchId: '',
    handoverScope: 'BRANCH_WIDE' as 'BRANCH_WIDE' | 'TILL_CUSTODY',
    cashierShiftId: '',
    cashDrawerId: '',
    incomingManagerId: '',
    shiftType: 'MORNING' as HandoverRecord['shiftType'],
    handoverDate: formatLocalDate(new Date()),
    openingFloat: '0',
    closingCash: '0',
    cashVariance: '0',
    cashStatus: 'BALANCED' as HandoverRecord['cashStatus'],
    operationalIncidents: '',
    inventoryKitchenNotes: '',
    hardwareMaintenanceNotes: '',
    guestExperienceNotes: '',
    checklistItems: DEFAULT_CHECKLIST,
  });

  useEffect(() => {
    try {
      const cached = localStorage.getItem('servora_cached_workspace');
      if (cached) {
        const parsed = JSON.parse(cached);
        setCurrentUserId(parsed?.user?.id ?? null);
        setUserRole(parsed?.user?.role);
        setUserPermissions(parsed?.user?.permissions);
        if (parsed?.business?.currency) setCurrency(parsed.business.currency);
      }
    } catch {
      // Ignore malformed cache
    }
  }, []);

  const canResolveDisputes = useMemo(() => {
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return true;
    return Boolean(
      userPermissions?.includes('*') ||
        userPermissions?.includes('cash.reconcile') ||
        userPermissions?.includes('staff.manage')
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
      if (shiftFilter !== 'ALL') params.set('shiftType', shiftFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const [handoverRes, branchRes] = await Promise.all([
        fetchApi(`/api/v1/staff/handover?${params.toString()}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (handoverRes?.data) setHandovers(handoverRes.data);
      if (branchRes?.data && Array.isArray(branchRes.data)) setBranches(branchRes.data);
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.isNetworkError || err.status === 0)) {
        setIsOnline(false);
        return;
      }
      setPageError(err instanceof Error ? err.message : 'Failed to load handover logbook.');
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter, shiftFilter, statusFilter]);

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

  const fetchBranchLiveContext = useCallback(async (branchIdStr: string, dateStr: string) => {
    if (!branchIdStr || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      setBranchContext(null);
      return;
    }

    try {
      setIsLoadingContext(true);
      const res = await fetchApi(
        `/api/v1/staff/handover/context?branchId=${branchIdStr}&date=${dateStr}`
      );
      if (res?.data) {
        setBranchContext(res.data);
        if (res.data.currency) setCurrency(res.data.currency);
      }
    } catch {
      setBranchContext(null);
    } finally {
      setIsLoadingContext(false);
    }
  }, []);

  const applySelectedShiftFinancials = (shiftIdStr: string) => {
    const match = branchContext?.shifts.find((s) => String(s.id) === shiftIdStr);
    if (!match) {
      setFormData((prev) => ({ ...prev, cashierShiftId: shiftIdStr }));
      return;
    }

    const diff = match.variance;
    let cashStatus: HandoverRecord['cashStatus'] = 'BALANCED';
    if (diff < -5) cashStatus = 'DISCREPANCY_SHORT';
    else if (diff > 5) cashStatus = 'DISCREPANCY_OVER';

    setFormData((prev) => ({
      ...prev,
      cashierShiftId: shiftIdStr,
      cashDrawerId: match.drawerId ? String(match.drawerId) : prev.cashDrawerId,
      openingFloat: String(match.openingFloat),
      closingCash: String(match.countedCash),
      cashVariance: String(diff),
      cashStatus,
    }));
  };

  const applyLiveContextToForm = (ctx: BranchLiveContext) => {
    const diff = ctx.treasury.variance;
    let cashStatus: HandoverRecord['cashStatus'] = 'BALANCED';
    if (diff < -5) cashStatus = 'DISCREPANCY_SHORT';
    else if (diff > 5) cashStatus = 'DISCREPANCY_OVER';

    const items86Summary =
      ctx.operations.items86ed.length > 0
        ? `86ed Items: ${ctx.operations.items86ed
            .map((i) => (i.reason ? `${i.name} (${i.reason})` : i.name))
            .join(', ')}`
        : '';

    setFormData((prev) => ({
      ...prev,
      openingFloat: String(ctx.treasury.openingFloat),
      closingCash: String(ctx.treasury.countedCash),
      cashVariance: String(diff),
      cashStatus,
      inventoryKitchenNotes: prev.inventoryKitchenNotes || items86Summary,
    }));
  };

  const telemetry = useMemo(
    () => ({
      totalLogs: handovers.length,
      pendingAcknowledgment: handovers.filter((h) => h.status === 'SUBMITTED').length,
      balancedLogs: handovers.filter((h) => h.cashStatus === 'BALANCED').length,
      discrepancyOrDisputed: handovers.filter(
        (h) => h.cashStatus !== 'BALANCED' || h.status === 'DISPUTED'
      ).length,
    }),
    [handovers]
  );

  const filteredHandovers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return handovers;
    return handovers.filter(
      (h) =>
        h.outgoingManagerName.toLowerCase().includes(q) ||
        (h.incomingManagerName && h.incomingManagerName.toLowerCase().includes(q)) ||
        h.branchName.toLowerCase().includes(q) ||
        (h.drawerName && h.drawerName.toLowerCase().includes(q)) ||
        (h.operationalIncidents && h.operationalIncidents.toLowerCase().includes(q))
    );
  }, [handovers, searchQuery]);

  const openCreateModal = () => {
    setModalError(null);
    const activeBranchId =
      branchFilter !== 'ALL'
        ? branchFilter
        : typeof window !== 'undefined' && localStorage.getItem('servora_active_branch_id')
          ? String(localStorage.getItem('servora_active_branch_id'))
          : branches[0]?.id
            ? String(branches[0].id)
            : '';

    const validDefaultBranch = branches.some((b) => String(b.id) === activeBranchId)
      ? activeBranchId
      : branches[0]?.id
        ? String(branches[0].id)
        : '';

    const todayStr = formatLocalDate(new Date());

    setFormData({
      branchId: validDefaultBranch,
      handoverScope: 'TILL_CUSTODY',
      cashierShiftId: '',
      cashDrawerId: '',
      incomingManagerId: '',
      shiftType: 'MORNING',
      handoverDate: todayStr,
      openingFloat: '0',
      closingCash: '0',
      cashVariance: '0',
      cashStatus: 'BALANCED',
      operationalIncidents: '',
      inventoryKitchenNotes: '',
      hardwareMaintenanceNotes: '',
      guestExperienceNotes: '',
      checklistItems: DEFAULT_CHECKLIST.map((item) => ({ ...item })),
    });
    setIsCreateModalOpen(true);

    if (validDefaultBranch) {
      void fetchBranchLiveContext(validDefaultBranch, todayStr);
    }
  };

  const handleCashChange = (closing: string, opening: string) => {
    const openNum = parseFloat(opening) || 0;
    const closeNum = parseFloat(closing) || 0;

    const selectedShift =
      formData.handoverScope === 'TILL_CUSTODY' && formData.cashierShiftId
        ? branchContext?.shifts.find((s) => String(s.id) === formData.cashierShiftId)
        : null;

    const expectedRef = selectedShift
      ? selectedShift.expectedCash
      : branchContext?.treasury.expectedCash
        ? branchContext.treasury.expectedCash
        : openNum;

    const diff = Number((closeNum - expectedRef).toFixed(2));

    let status: HandoverRecord['cashStatus'] = 'BALANCED';
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
          handoverScope: formData.handoverScope,
          cashierShiftId:
            formData.handoverScope === 'TILL_CUSTODY' && formData.cashierShiftId
              ? parseInt(formData.cashierShiftId, 10)
              : null,
          cashDrawerId:
            formData.handoverScope === 'TILL_CUSTODY' && formData.cashDrawerId
              ? parseInt(formData.cashDrawerId, 10)
              : null,
          incomingManagerId: formData.incomingManagerId
            ? parseInt(formData.incomingManagerId, 10)
            : null,
          shiftType: formData.shiftType,
          handoverDate: formData.handoverDate,
          openingFloat: parseFloat(formData.openingFloat) || 0,
          closingCash: parseFloat(formData.closingCash) || 0,
          cashVariance: parseFloat(formData.cashVariance) || 0,
          cashStatus: formData.cashStatus,
          operationalIncidents: formData.operationalIncidents.trim() || null,
          inventoryKitchenNotes: formData.inventoryKitchenNotes.trim() || null,
          hardwareMaintenanceNotes: formData.hardwareMaintenanceNotes.trim() || null,
          guestExperienceNotes: formData.guestExperienceNotes.trim() || null,
          checklistItems: formData.checklistItems,
          status: 'SUBMITTED',
        }),
      });
      setIsCreateModalOpen(false);
      setStatusBanner(
        'Shift handover submitted. The incoming supervisor has been notified to countersign.'
      );
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to submit shift handover.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!viewingHandover) return;
    setModalError(null);
    try {
      setIsSubmitting(true);
      const res = await fetchApi(`/api/v1/staff/handover/${viewingHandover.id}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify({ notes: ackNotes.trim() || undefined }),
      });
      const updated: HandoverRecord = {
        ...viewingHandover,
        status: 'ACKNOWLEDGED',
        linkedAdjustmentId: res?.data?.linkedAdjustmentId ?? viewingHandover.linkedAdjustmentId,
      };
      setViewingHandover(updated);
      setAckNotes('');
      setStatusBanner(
        updated.linkedAdjustmentId
          ? `Handover #${viewingHandover.id} countersigned. GL Variance Voucher #${updated.linkedAdjustmentId} routed to Finance.`
          : `Handover #${viewingHandover.id} countersigned and locked.`
      );
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to acknowledge handover.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingHandover) return;
    setModalError(null);
    try {
      setIsSubmitting(true);
      await fetchApi(`/api/v1/staff/handover/${viewingHandover.id}/dispute`, {
        method: 'POST',
        body: JSON.stringify({ reason: disputeReason.trim() }),
      });
      setViewingHandover(null);
      setDisputeReason('');
      setShowDisputeInput(false);
      setStatusBanner(`Handover #${viewingHandover.id} disputed and escalated for audit.`);
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to dispute handover.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingHandover) return;
    setModalError(null);
    try {
      setIsSubmitting(true);
      await fetchApi(`/api/v1/staff/handover/${viewingHandover.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          resolutionNotes: resolutionNotes.trim(),
          postGlAdjustment: true,
        }),
      });
      setViewingHandover(null);
      setResolutionNotes('');
      setStatusBanner(`Handover #${viewingHandover.id} dispute resolved and closed.`);
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to resolve dispute.');
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
              Shift Handover &amp; Till Custody Logbook
            </span>
            {!isOnline && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                <WifiOff size={10} /> Offline
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Manager Shift Handover Console</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Chain-of-custody transfers linked to live cashier shifts, physical tills, dual-signature sign-off, and GL variance escalation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            disabled={!isOnline}
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus size={14} /> Submit Handover
          </button>
          <button
            type="button"
            disabled={isLoading || !isOnline}
            onClick={loadData}
            title="Refresh Logbook"
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

      {/* 2. HANDOVER TELEMETRY TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Total Shift Logs
            </span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {telemetry.totalLogs}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <ClipboardList size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Pending Sign-Off
            </span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">
              {telemetry.pendingAcknowledgment}
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Balanced Tills
            </span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {telemetry.balancedLogs}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Variances / Disputes
            </span>
            <p className="text-xl font-bold font-mono text-rose-600 mt-0.5">
              {telemetry.discrepancyOrDisputed}
            </p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* 3. LOGBOOK FEED & FILTERS */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={14}
            />
            <input
              type="text"
              placeholder="Search manager, drawer, branch..."
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
            <option value="MORNING">Morning Shift</option>
            <option value="MIDDAY">Midday Shift</option>
            <option value="EVENING">Evening Shift</option>
            <option value="NIGHT_CLOSING">Night Closing</option>
          </select>

          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Pending Sign-Off</option>
            <option value="ACKNOWLEDGED">Countersigned</option>
            <option value="DISPUTED">Disputed</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        {/* 4. MASTER HANDOVER TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Date &amp; Shift</th>
                <th className="py-2.5 px-3">Branch &amp; Till / Shift Anchor</th>
                <th className="py-2.5 px-3">Outgoing Custodian</th>
                <th className="py-2.5 px-3">Incoming Custodian</th>
                <th className="py-2.5 px-3">Cash &amp; Variance</th>
                <th className="py-2.5 px-3">Workflow Status</th>
                <th className="py-2.5 px-3 text-right">Next Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHandovers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                    {isLoading
                      ? 'Loading shift handover logbook...'
                      : 'No shift handover reports match the active filter criteria.'}
                  </td>
                </tr>
              ) : (
                filteredHandovers.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-servora-navy block">
                        {new Date(h.handoverDate).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] font-mono uppercase text-servora-core font-bold">
                        {h.shiftType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-semibold text-servora-navy">
                        <Building2 size={12} className="text-gray-400 shrink-0" />
                        <span>{h.branchName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                        {h.handoverScope === 'TILL_CUSTODY'
                          ? `${h.drawerName || 'Till'}${h.drawerCode ? ` [${h.drawerCode}]` : ''}${h.cashierShiftId ? ` • Shift #${h.cashierShiftId}` : ''}`
                          : 'Branch-Wide Duty Handover'}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-bold text-servora-navy block">
                        {h.outgoingManagerName}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Signed{' '}
                        {new Date(h.outgoingSignedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {h.incomingManagerName ? (
                        <div>
                          <span
                            className={`font-bold block ${
                              h.status === 'DISPUTED' ? 'text-rose-700' : 'text-emerald-800'
                            }`}
                          >
                            {h.incomingManagerName}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {h.incomingSignedAt
                              ? `${h.status === 'DISPUTED' ? 'Disputed ' : 'Signed '}${new Date(
                                  h.incomingSignedAt
                                ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : 'Designated Receiver'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-700 font-medium text-[11px] italic">
                          Any Branch Manager
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
                            {currency} {Number(h.cashVariance).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 block mt-0.5">
                        Counted: {currency} {Number(h.closingCash).toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {h.status === 'ACKNOWLEDGED' ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                          <ShieldCheck size={11} /> Countersigned
                        </span>
                      ) : h.status === 'RESOLVED' ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-servora-core border border-blue-200 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                          <CheckCircle2 size={10} /> Resolved
                        </span>
                      ) : h.status === 'DISPUTED' ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                          <Flag size={10} /> Disputed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold text-[10px]">
                          Awaiting Sign-Off
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setModalError(null);
                          setAckNotes('');
                          setDisputeReason('');
                          setResolutionNotes('');
                          setShowDisputeInput(false);
                          setViewingHandover(h);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer ${
                          h.status === 'SUBMITTED' && currentUserId !== h.outgoingManagerId
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : h.status === 'DISPUTED' && canResolveDisputes
                              ? 'bg-rose-600 text-white hover:bg-rose-700'
                              : 'bg-slate-50 text-servora-navy hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <Eye size={12} />
                        {h.status === 'SUBMITTED' && currentUserId !== h.outgoingManagerId
                          ? 'Review & Sign'
                          : h.status === 'DISPUTED' && canResolveDisputes
                            ? 'Resolve Dispute'
                            : 'View Log'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: SUBMIT SHIFT HANDOVER (LINKED TO TILL, SHIFT & INCOMING MANAGER) */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  Submit Manager / Till Shift Handover
                </h3>
                <p className="text-[11px] text-gray-400">
                  Anchor handover to a specific cash shift/till or full branch rotation
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

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Handover Scope Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, handoverScope: 'TILL_CUSTODY' }))}
                  className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    formData.handoverScope === 'TILL_CUSTODY'
                      ? 'bg-white text-servora-navy shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  Specific Till / Cashier Shift
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      handoverScope: 'BRANCH_WIDE',
                      cashierShiftId: '',
                      cashDrawerId: '',
                    }))
                  }
                  className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    formData.handoverScope === 'BRANCH_WIDE'
                      ? 'bg-white text-servora-navy shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  Branch-Wide Duty Handover
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Operating Branch *
                  </label>
                  <select
                    required
                    value={formData.branchId}
                    onChange={(e) => {
                      const nextBranch = e.target.value;
                      setFormData({
                        ...formData,
                        branchId: nextBranch,
                        cashierShiftId: '',
                        cashDrawerId: '',
                        incomingManagerId: '',
                      });
                      void fetchBranchLiveContext(nextBranch, formData.handoverDate);
                    }}
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
                    Shift Rotation *
                  </label>
                  <select
                    value={formData.shiftType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shiftType: e.target.value as HandoverRecord['shiftType'],
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
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Handover Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.handoverDate}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      setFormData({ ...formData, handoverDate: nextDate });
                      if (formData.branchId) {
                        void fetchBranchLiveContext(formData.branchId, nextDate);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              {/* Till / Shift + Incoming Manager Anchors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {formData.handoverScope === 'TILL_CUSTODY' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-servora-navy mb-1">
                        Cashier Shift *
                      </label>
                      <select
                        value={formData.cashierShiftId}
                        onChange={(e) => applySelectedShiftFinancials(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                      >
                        <option value="">Select Cashier Shift...</option>
                        {(branchContext?.shifts ?? []).map((s) => (
                          <option key={s.id} value={s.id}>
                            Shift #{s.id} • {s.cashierName} ({s.status})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-servora-navy mb-1">
                        Physical Cash Drawer *
                      </label>
                      <select
                        value={formData.cashDrawerId}
                        onChange={(e) =>
                          setFormData({ ...formData, cashDrawerId: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                      >
                        <option value="">Select Till Drawer...</option>
                        {(branchContext?.drawers ?? []).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} [{d.drawerCode}]
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className={formData.handoverScope === 'BRANCH_WIDE' ? 'sm:col-span-3' : ''}>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Designated Incoming Manager (Notified)
                  </label>
                  <select
                    value={formData.incomingManagerId}
                    onChange={(e) =>
                      setFormData({ ...formData, incomingManagerId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="">Any Cleared Branch Manager</option>
                    {(branchContext?.eligibleIncomingManagers ?? [])
                      .filter((u) => u.id !== currentUserId)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Live Branch Treasury & Operations Snapshot */}
              {branchContext && (
                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-servora-navy flex items-center gap-1.5 text-[11px]">
                      <Sparkles size={13} className="text-servora-core" />
                      Live Branch Snapshot ({branchContext.targetDate})
                    </span>
                    <button
                      type="button"
                      onClick={() => applyLiveContextToForm(branchContext)}
                      className="px-2.5 py-1 bg-servora-core text-white rounded-lg text-[10.5px] font-bold hover:bg-blue-700 cursor-pointer"
                    >
                      Auto-Fill Branch Totals &amp; 86ed
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <span className="text-[9.5px] text-gray-400 font-sans block">Shifts Today</span>
                      <strong className="text-servora-navy">
                        {branchContext.treasury.closedShifts} Closed / {branchContext.treasury.openShifts} Open
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <span className="text-[9.5px] text-gray-400 font-sans block">Expected Cash</span>
                      <strong className="text-servora-core">
                        {currency} {branchContext.treasury.expectedCash.toLocaleString()}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <span className="text-[9.5px] text-gray-400 font-sans block">Open KDS Tickets</span>
                      <strong className="text-amber-700">
                        {branchContext.operations.openKitchenTickets} Tickets
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <span className="text-[9.5px] text-gray-400 font-sans block">Staff On Duty</span>
                      <strong className="text-emerald-700">
                        {branchContext.operations.onDutyStaffCount} Clocked In
                      </strong>
                    </div>
                  </div>
                </div>
              )}
              {isLoadingContext && (
                <p className="text-[11px] text-servora-deepTeal animate-pulse">
                  Loading live branch shifts, drawers &amp; kitchen telemetry...
                </p>
              )}

              {/* Cash Reconciliation Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2.5">
                <span className="font-bold text-servora-navy flex items-center gap-1.5 text-xs">
                  <Wallet size={14} className="text-servora-core" /> Cash Drawer &amp; Till Handover
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      Opening Float ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.openingFloat}
                      onChange={(e) => handleCashChange(formData.closingCash, e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      Counted Closing Cash ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.closingCash}
                      onChange={(e) => handleCashChange(e.target.value, formData.openingFloat)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      Calculated Variance
                    </label>
                    <div className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs flex items-center justify-between">
                      <span
                        className={
                          formData.cashStatus === 'BALANCED'
                            ? 'text-emerald-700'
                            : 'text-rose-600'
                        }
                      >
                        {formData.cashVariance}
                      </span>
                      <span className="text-[9.5px] uppercase font-bold text-gray-400">
                        {formData.cashStatus.replace('DISCREPANCY_', '')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operational Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Operational Incidents
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Refunds, rush bottlenecks, staff issues"
                    value={formData.operationalIncidents}
                    onChange={(e) =>
                      setFormData({ ...formData, operationalIncidents: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Guest Experience &amp; VIP Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VIP bookings, complaints, follow-ups"
                    value={formData.guestExperienceNotes}
                    onChange={(e) =>
                      setFormData({ ...formData, guestExperienceNotes: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Kitchen &amp; Inventory 86ed List
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Out of stock dishes, prep shortages"
                    value={formData.inventoryKitchenNotes}
                    onChange={(e) =>
                      setFormData({ ...formData, inventoryKitchenNotes: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Hardware &amp; Facility Health
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Printers, chillers, POS terminals, network"
                    value={formData.hardwareMaintenanceNotes}
                    onChange={(e) =>
                      setFormData({ ...formData, hardwareMaintenanceNotes: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              {/* Shift Turnover Checklist */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <span className="font-bold text-servora-navy text-xs block">
                  Duty Manager Transition Checklist
                </span>
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
                  disabled={isSubmitting || !formData.branchId}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Signing & Submitting...' : 'Sign & Submit Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: VIEW HANDOVER, NEXT COURSE OF ACTION & RESOLUTION */}
      {viewingHandover && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-servora-core bg-blue-50 px-2 py-0.5 rounded-md">
                  {viewingHandover.shiftType.replace(/_/g, ' ')} &bull; {viewingHandover.branchName}
                  {viewingHandover.drawerCode ? ` • ${viewingHandover.drawerCode}` : ''}
                  {viewingHandover.cashierShiftId ? ` • Shift #${viewingHandover.cashierShiftId}` : ''}
                </span>
                <h3 className="text-base font-bold text-servora-navy mt-1">
                  Shift Handover Log (#{viewingHandover.id})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingHandover(null)}
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

            {/* Chain of Custody Bar */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-gray-200 rounded-xl text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">
                  Outgoing Custodian
                </span>
                <span className="font-bold text-servora-navy block">
                  {viewingHandover.outgoingManagerName}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {new Date(viewingHandover.outgoingSignedAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">
                  Incoming Custodian
                </span>
                {viewingHandover.incomingManagerName ? (
                  <>
                    <span
                      className={`font-bold block ${
                        viewingHandover.status === 'DISPUTED'
                          ? 'text-rose-700'
                          : 'text-emerald-800'
                      }`}
                    >
                      {viewingHandover.incomingManagerName}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {viewingHandover.incomingSignedAt
                        ? new Date(viewingHandover.incomingSignedAt).toLocaleString()
                        : 'Awaiting Countersignature'}
                    </span>
                  </>
                ) : (
                  <span className="text-amber-700 font-bold text-xs italic block mt-1">
                    Pending Countersignature
                  </span>
                )}
              </div>
            </div>

            {/* Cash Variance Summary */}
            <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-servora-navy flex items-center justify-between">
                <span>Till &amp; Cash Handover:</span>
                <span
                  className={`font-mono font-bold ${
                    viewingHandover.cashStatus === 'BALANCED'
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  Variance: {currency} {Number(viewingHandover.cashVariance).toLocaleString()} (
                  {viewingHandover.cashStatus})
                </span>
              </span>
              <div className="flex justify-between text-[11px] text-gray-600 font-mono">
                <span>
                  Opening Float: {currency} {Number(viewingHandover.openingFloat).toLocaleString()}
                </span>
                <span>
                  Closing Counted: {currency} {Number(viewingHandover.closingCash).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Operational Notes */}
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-servora-navy block text-[11px] mb-0.5">
                  Operational Incidents:
                </span>
                <p className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-700 whitespace-pre-line">
                  {viewingHandover.operationalIncidents || 'No incidents reported.'}
                </p>
              </div>
              {viewingHandover.guestExperienceNotes && (
                <div>
                  <span className="font-bold text-servora-navy block text-[11px] mb-0.5">
                    Guest Experience &amp; VIP Notes:
                  </span>
                  <p className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-700">
                    {viewingHandover.guestExperienceNotes}
                  </p>
                </div>
              )}
              {viewingHandover.inventoryKitchenNotes && (
                <div>
                  <span className="font-bold text-servora-navy block text-[11px] mb-0.5">
                    Kitchen &amp; Inventory 86ed:
                  </span>
                  <p className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-700">
                    {viewingHandover.inventoryKitchenNotes}
                  </p>
                </div>
              )}
              {viewingHandover.hardwareMaintenanceNotes && (
                <div>
                  <span className="font-bold text-servora-navy block text-[11px] mb-0.5">
                    Hardware &amp; Facility Health:
                  </span>
                  <p className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-700">
                    {viewingHandover.hardwareMaintenanceNotes}
                  </p>
                </div>
              )}
              {viewingHandover.resolutionNotes && (
                <div>
                  <span className="font-bold text-servora-core block text-[11px] mb-0.5">
                    Governance Dispute Resolution:
                  </span>
                  <p className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-servora-navy">
                    {viewingHandover.resolutionNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Checklist */}
            {viewingHandover.checklistItems.length > 0 && (
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-1.5 text-xs">
                <span className="font-bold text-servora-navy block text-[11px]">
                  Turnover Checklist:
                </span>
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

            {/* NEXT COURSE OF ACTION PANEL */}
            {viewingHandover.status === 'SUBMITTED' &&
              currentUserId !== viewingHandover.outgoingManagerId && (
                <div className="pt-2 border-t border-gray-100 space-y-2.5 text-xs">
                  {showDisputeInput ? (
                    <form onSubmit={handleDisputeSubmit} className="space-y-2">
                      <label className="block text-[11px] font-bold text-rose-700">
                        Dispute Justification (Escalates to GM / Finance) *
                      </label>
                      <textarea
                        required
                        minLength={5}
                        rows={2}
                        placeholder="Explain cash shortage, unclosed tickets, or missing keys..."
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl focus:outline-none focus:border-rose-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowDisputeInput(false)}
                          className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                        >
                          {isSubmitting ? 'Escalating...' : 'Confirm Dispute'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Optional incoming manager countersignature note..."
                        value={ackNotes}
                        onChange={(e) => setAckNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowDisputeInput(true)}
                          disabled={!isOnline}
                          className="px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded-xl hover:bg-rose-100 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Flag size={13} /> Dispute
                        </button>
                        <button
                          type="button"
                          onClick={handleAcknowledge}
                          disabled={isSubmitting || !isOnline}
                          className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Check size={14} />
                          {isSubmitting ? 'Signing...' : 'Countersign & Assume Custody'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

            {viewingHandover.status === 'DISPUTED' && canResolveDisputes && (
              <form
                onSubmit={handleResolveDispute}
                className="pt-2 border-t border-gray-100 space-y-2.5 text-xs"
              >
                <label className="block text-[11px] font-bold text-servora-navy">
                  Governance Resolution Verdict (Closes Dispute &amp; Posts GL Variance if Needed) *
                </label>
                <textarea
                  required
                  minLength={5}
                  rows={2}
                  placeholder="Record audit findings, safe recount verification, or disciplinary action..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !isOnline}
                  className="w-full py-2 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Resolving...' : 'Resolve & Close Dispute'}
                </button>
              </form>
            )}

            {(viewingHandover.status === 'ACKNOWLEDGED' ||
              viewingHandover.status === 'RESOLVED') && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  Custody Transfer Complete — Next Operational Actions
                </span>
                <div className="flex flex-wrap gap-2">
                  {viewingHandover.linkedAdjustmentId && (
                    <Link
                      href="/finance/adjustments"
                      className="px-3 py-1.5 bg-white border border-emerald-300 text-servora-navy rounded-lg font-bold inline-flex items-center gap-1 hover:bg-emerald-50"
                    >
                      Review GL Adjustment #{viewingHandover.linkedAdjustmentId}{' '}
                      <ArrowRight size={12} />
                    </Link>
                  )}
                  <Link
                    href="/cash-management/reconciliation"
                    className="px-3 py-1.5 bg-white border border-gray-200 text-servora-navy rounded-lg font-bold inline-flex items-center gap-1 hover:bg-gray-50"
                  >
                    <Scale size={12} /> EOD Z-Report
                  </Link>
                  <Link
                    href="/cash-management/shifts"
                    className="px-3 py-1.5 bg-white border border-gray-200 text-servora-navy rounded-lg font-bold inline-flex items-center gap-1 hover:bg-gray-50"
                  >
                    <Wallet size={12} /> Manage Cashier Shifts
                  </Link>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingHandover(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}