// apps/web/app/(dashboard)/staff/commissions/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  BadgePercent,
  ChevronRight,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  Wallet,
  ShieldCheck,
  Send,
  Layers,
  Power,
  Trash2,
  WifiOff,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import { fetchApi, ApiError } from '@/lib/api';

interface CommissionTierRule {
  minAmount: number;
  maxAmount: number | null;
  ratePercent: number;
}

interface CommissionPlan {
  id: number;
  name: string;
  description: string | null;
  branchId: number | null;
  branchName: string | null;
  targetRole: string | null;
  targetUserId: number | null;
  attributionMode: 'WAITER_ONLY' | 'CASHIER_ONLY' | 'COALESCE_WAITER_CASHIER';
  productScope: 'ALL_ITEMS' | 'CATEGORY' | 'MENU_ITEM';
  menuCategoryId: number | null;
  menuItemId: number | null;
  basisType: 'NET_SALES' | 'GROSS_SALES' | 'GROSS_MARGIN' | 'ITEM_QUANTITY';
  rateType: 'FLAT_PERCENTAGE' | 'FLAT_PER_UNIT' | 'TIERED_ACCELERATOR';
  flatRate: string;
  tiers: CommissionTierRule[];
  minQualifyingSales: string;
  maxPayoutCap: string | null;
  clawbackOnRefund: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

interface PreviewCommissionLine {
  userId: number;
  employeeName: string;
  employeeRole: string;
  branchId: number | null;
  branchName: string;
  planId: number;
  planName: string;
  ordersCount: number;
  qualifyingUnits: number;
  qualifyingSales: number;
  effectiveRateLabel: string;
  grossCommission: number;
  clawbackAmount: number;
  netCommission: number;
}

interface CommissionPayoutRun {
  id: number;
  runNumber: string;
  branchId: number | null;
  periodStart: string;
  periodEnd: string;
  currency: string;
  employeeCount: number;
  totalQualifyingSales: string;
  totalGrossCommission: string;
  totalClawbacks: string;
  netPayableAmount: string;
  status: 'DRAFT' | 'APPROVED' | 'PAID' | 'VOIDED';
  createdById: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

interface RoleOption {
  id: number;
  name: string;
  slug: string;
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function StaffCommissionsPage() {
  const [activeTab, setActiveTab] = useState<'PREVIEW' | 'PLANS' | 'RUNS'>('PREVIEW');
  const [plans, setPlans] = useState<CommissionPlan[]>([]);
  const [previewLines, setPreviewLines] = useState<PreviewCommissionLine[]>([]);
  const [payoutRuns, setPayoutRuns] = useState<CommissionPayoutRun[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [currency, setCurrency] = useState('KES');

  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // RBAC state
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [userPermissions, setUserPermissions] = useState<string[] | undefined>(undefined);

  // Filters
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [periodStart, setPeriodStart] = useState(() =>
    formatLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const [periodEnd, setPeriodEnd] = useState(() => formatLocalDate(new Date()));

  // Modals
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [settleTargetRun, setSettleTargetRun] = useState<CommissionPayoutRun | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Plan Form State
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    branchId: '',
    targetRole: 'ALL',
    attributionMode: 'COALESCE_WAITER_CASHIER' as CommissionPlan['attributionMode'],
    productScope: 'ALL_ITEMS' as CommissionPlan['productScope'],
    basisType: 'NET_SALES' as CommissionPlan['basisType'],
    rateType: 'FLAT_PERCENTAGE' as CommissionPlan['rateType'],
    flatRate: 2.5,
    tiers: [
      { minAmount: 0, maxAmount: 100000, ratePercent: 2 },
      { minAmount: 100000, maxAmount: null, ratePercent: 4 },
    ] as CommissionTierRule[],
    minQualifyingSales: 0,
    maxPayoutCap: '',
    clawbackOnRefund: true,
    effectiveFrom: formatLocalDate(new Date()),
  });

  // Generate Run Notes
  const [runNotes, setRunNotes] = useState('');

  // Settle Run Form
  const [settleForm, setSettleForm] = useState({
    paymentMethod: 'MPESA_B2C' as
      | 'MPESA_B2C'
      | 'BANK_TRANSFER'
      | 'PAYROLL_CONSOLIDATION'
      | 'CASH_DRAWER',
    paymentReference: '',
    notes: '',
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

  const canManagePlans = useMemo(() => {
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return true;
    return Boolean(userPermissions?.includes('*') || userPermissions?.includes('staff.manage'));
  }, [userPermissions, userRole]);

  const canSettlePayouts = useMemo(() => {
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return true;
    return Boolean(
      userPermissions?.includes('*') || userPermissions?.includes('payments.reconcile')
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

      const branchQuery = branchFilter !== 'ALL' ? `branchId=${branchFilter}` : '';
      const previewParams = new URLSearchParams({ periodStart, periodEnd });
      if (branchFilter !== 'ALL') previewParams.set('branchId', branchFilter);

      const [plansRes, previewRes, runsRes, branchRes, staffRes] = await Promise.all([
        fetchApi(`/api/v1/staff/commissions/plans${branchQuery ? `?${branchQuery}` : ''}`),
        fetchApi(`/api/v1/staff/commissions/preview?${previewParams.toString()}`),
        fetchApi(`/api/v1/staff/commissions/runs${branchQuery ? `?${branchQuery}` : ''}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
        fetchApi('/api/v1/staff').catch(() => ({ data: { roles: [] } })),
      ]);

      if (plansRes?.data) setPlans(plansRes.data);
      if (previewRes?.data) {
        setPreviewLines(previewRes.data.lines || []);
        if (previewRes.data.currency) setCurrency(previewRes.data.currency);
      }
      if (runsRes?.data) setPayoutRuns(runsRes.data);
      if (Array.isArray(branchRes?.data)) setBranches(branchRes.data);
      if (Array.isArray(staffRes?.data?.roles)) setRoles(staffRes.data.roles);
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.isNetworkError || err.status === 0)) {
        setIsOnline(false);
        return;
      }
      setPageError(err instanceof Error ? err.message : 'Failed to load commissions console.');
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter, periodStart, periodEnd]);

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

  const summary = useMemo(() => {
    const activePlansCount = plans.filter((p) => p.isActive).length;
    const totalAccrued = previewLines.reduce((s, l) => s + l.netCommission, 0);
    const totalClawbacks = previewLines.reduce((s, l) => s + l.clawbackAmount, 0);
    const pendingRunsCount = payoutRuns.filter(
      (r) => r.status === 'DRAFT' || r.status === 'APPROVED'
    ).length;

    return {
      activePlansCount,
      totalAccrued: Number(totalAccrued.toFixed(2)),
      totalClawbacks: Number(totalClawbacks.toFixed(2)),
      pendingRunsCount,
    };
  }, [plans, previewLines, payoutRuns]);

  const handleExportPreviewCsv = () => {
    const headers = [
      'Employee',
      'Role',
      'Branch',
      'Commission Plan',
      'Orders',
      `Qualifying Sales (${currency})`,
      'Rate Applied',
      `Gross Commission (${currency})`,
      `Refund Clawback (${currency})`,
      `Net Payable (${currency})`,
    ];
    const rows = previewLines.map((l) => [
      `"${l.employeeName}"`,
      l.employeeRole,
      `"${l.branchName}"`,
      `"${l.planName}"`,
      l.ordersCount,
      l.qualifyingSales,
      `"${l.effectiveRateLabel}"`,
      l.grossCommission,
      l.clawbackAmount,
      l.netCommission,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `servora-commissions-${periodStart}-to-${periodEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      setIsSubmitting(true);
      await fetchApi('/api/v1/staff/commissions/plans', {
        method: 'POST',
        body: JSON.stringify({
          name: planForm.name,
          description: planForm.description.trim() || null,
          branchId: planForm.branchId ? parseInt(planForm.branchId, 10) : null,
          targetRole: planForm.targetRole !== 'ALL' ? planForm.targetRole : null,
          attributionMode: planForm.attributionMode,
          productScope: planForm.productScope,
          basisType: planForm.basisType,
          rateType: planForm.rateType,
          flatRate: Number(planForm.flatRate) || 0,
          tiers: planForm.rateType === 'TIERED_ACCELERATOR' ? planForm.tiers : [],
          minQualifyingSales: Number(planForm.minQualifyingSales) || 0,
          maxPayoutCap: planForm.maxPayoutCap ? Number(planForm.maxPayoutCap) : null,
          clawbackOnRefund: planForm.clawbackOnRefund,
          effectiveFrom: planForm.effectiveFrom,
          isActive: true,
        }),
      });
      setIsPlanModalOpen(false);
      setStatusBanner(`Commission plan "${planForm.name}" created.`);
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to create commission plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePlanActive = async (plan: CommissionPlan) => {
    setPageError(null);
    try {
      await fetchApi(`/api/v1/staff/commissions/plans/${plan.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      setStatusBanner(`Plan "${plan.name}" ${plan.isActive ? 'paused' : 'activated'}.`);
      await loadData();
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to update plan status.');
    }
  };

  const handleGenerateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      setIsSubmitting(true);
      const res = await fetchApi('/api/v1/staff/commissions/runs', {
        method: 'POST',
        body: JSON.stringify({
          periodStart,
          periodEnd,
          branchId: branchFilter !== 'ALL' ? parseInt(branchFilter, 10) : null,
          notes: runNotes.trim() || null,
        }),
      });
      setIsGenerateModalOpen(false);
      setRunNotes('');
      setActiveTab('RUNS');
      setStatusBanner(res?.message || 'Commission payout run generated.');
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to generate payout run.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveRun = async (run: CommissionPayoutRun) => {
    setPageError(null);
    try {
      const res = await fetchApi(`/api/v1/staff/commissions/runs/${run.id}/approve`, {
        method: 'POST',
      });
      setStatusBanner(res?.message || `Run ${run.runNumber} approved.`);
      await loadData();
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to approve commission run.');
    }
  };

  const handleSettleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleTargetRun) return;
    setModalError(null);
    try {
      setIsSubmitting(true);
      const res = await fetchApi(`/api/v1/staff/commissions/runs/${settleTargetRun.id}/settle`, {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod: settleForm.paymentMethod,
          paymentReference: settleForm.paymentReference.trim(),
          notes: settleForm.notes.trim() || undefined,
        }),
      });
      setSettleTargetRun(null);
      setSettleForm({ paymentMethod: 'MPESA_B2C', paymentReference: '', notes: '' });
      setStatusBanner(res?.message || 'Commission run disbursed.');
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to settle commission run.');
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
              href="/staff/performance"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Performance Tower <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">
              Sales Commissions &amp; Incentives
            </span>
            {!isOnline && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                <WifiOff size={10} /> Offline
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-servora-navy">
            Workforce Commissions &amp; Incentive Settlement
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Net-of-tax commission rules, tiered quota accelerators, automatic refund clawbacks, and maker-checker payout runs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={handleExportPreviewCsv}
            disabled={previewLines.length === 0}
            className="px-3 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download size={13} /> Export CSV
          </button>
          {canManagePlans && (
            <button
              type="button"
              disabled={!isOnline}
              onClick={() => {
                setModalError(null);
                setIsPlanModalOpen(true);
              }}
              className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus size={14} /> New Commission Plan
            </button>
          )}
          <button
            type="button"
            disabled={isLoading || !isOnline}
            onClick={loadData}
            title="Refresh Commissions"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy cursor-pointer disabled:opacity-50"
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

      {/* 2. KPI SUMMARY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Live Accrued Payable
            </span>
            <p className="text-xl font-bold font-mono text-servora-core mt-0.5 truncate">
              {currency} {summary.totalAccrued.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Wallet size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Refund Clawbacks
            </span>
            <p className="text-xl font-bold font-mono text-rose-600 mt-0.5 truncate">
              -{currency} {summary.totalClawbacks.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Active Incentive Plans
            </span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {summary.activePlansCount}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <BadgePercent size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Pending Payout Runs
            </span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">
              {summary.pendingRunsCount}
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <FileCheck2 size={18} />
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE TABS & PERIOD / BRANCH CONTROLS */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-gray-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('PREVIEW')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'PREVIEW'
                  ? 'bg-servora-navy text-white shadow-xs'
                  : 'bg-slate-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Sparkles size={13} /> Live Accruals ({previewLines.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PLANS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'PLANS'
                  ? 'bg-servora-navy text-white shadow-xs'
                  : 'bg-slate-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Layers size={13} /> Commission Plans ({plans.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('RUNS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'RUNS'
                  ? 'bg-servora-navy text-white shadow-xs'
                  : 'bg-slate-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShieldCheck size={13} /> Payout Runs ({payoutRuns.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {branches.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
                <Building2 size={13} className="text-servora-core shrink-0" />
                <select
                  aria-label="Filter by branch"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Authorized Outlets ({branches.length})</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1 rounded-xl text-xs">
              <Calendar size={13} className="text-servora-core" />
              <input
                type="date"
                aria-label="Period start"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="bg-transparent font-mono text-xs focus:outline-none"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                aria-label="Period end"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="bg-transparent font-mono text-xs focus:outline-none"
              />
            </div>

            {activeTab === 'PREVIEW' && canManagePlans && previewLines.length > 0 && (
              <button
                type="button"
                disabled={!isOnline}
                onClick={() => {
                  setModalError(null);
                  setIsGenerateModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send size={12} /> Lock Payout Run
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: LIVE ACCRUALS PREVIEW */}
        {activeTab === 'PREVIEW' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Associate</th>
                  <th className="py-2.5 px-3">Commission Plan</th>
                  <th className="py-2.5 px-3 text-right">Orders</th>
                  <th className="py-2.5 px-3 text-right">Qualifying Basis</th>
                  <th className="py-2.5 px-3">Applied Rate</th>
                  <th className="py-2.5 px-3 text-right">Gross Comm.</th>
                  <th className="py-2.5 px-3 text-right">Clawback</th>
                  <th className="py-2.5 px-3 text-right">Net Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewLines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-400 italic">
                      {isLoading
                        ? 'Computing live net-of-tax commission accruals...'
                        : 'No qualifying commission earnings in this period. Create an active Commission Plan to begin tracking.'}
                    </td>
                  </tr>
                ) : (
                  previewLines.map((line) => (
                    <tr
                      key={`${line.userId}-${line.planId}`}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">
                          {line.employeeName}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">
                          {line.employeeRole.replace(/_/g, ' ')} &bull; {line.branchName}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-gray-700">{line.planName}</td>
                      <td className="py-3 px-3 text-right font-mono">{line.ordersCount}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-servora-navy">
                        {currency} {line.qualifyingSales.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-servora-core border border-blue-200 rounded text-[10px] font-mono font-bold">
                          {line.effectiveRateLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-700">
                        {currency} {line.grossCommission.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">
                        {line.clawbackAmount > 0
                          ? `-${currency} ${line.clawbackAmount.toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {currency} {line.netCommission.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: COMMISSION PLANS */}
        {activeTab === 'PLANS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Plan Name &amp; Scope</th>
                  <th className="py-2.5 px-3">Eligibility</th>
                  <th className="py-2.5 px-3">Basis &amp; Rate Rule</th>
                  <th className="py-2.5 px-3 text-right">Min Hurdle / Cap</th>
                  <th className="py-2.5 px-3">Clawback</th>
                  <th className="py-2.5 px-3">Status</th>
                  {canManagePlans && <th className="py-2.5 px-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManagePlans ? 7 : 6}
                      className="py-10 text-center text-gray-400 italic"
                    >
                      No commission plans configured yet. Click &quot;New Commission Plan&quot; to set up an incentive rule.
                    </td>
                  </tr>
                ) : (
                  plans.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{p.name}</span>
                        <span className="text-[10px] text-gray-400">
                          {p.branchName || 'All Branches'} &bull; {p.productScope.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-servora-navy rounded text-[10px] font-bold uppercase">
                          {p.targetRole || 'All Roles'}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          {p.attributionMode.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className="font-bold text-servora-core block">
                          {p.rateType === 'TIERED_ACCELERATOR'
                            ? `${p.tiers.length} Tiers`
                            : p.rateType === 'FLAT_PER_UNIT'
                              ? `${currency} ${Number(p.flatRate)} / unit`
                              : `${Number(p.flatRate)}%`}
                        </span>
                        <span className="text-[10px] text-gray-500 font-sans">
                          on {p.basisType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[11px]">
                        <span className="block text-gray-700">
                          Min: {currency} {Number(p.minQualifyingSales).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Cap: {p.maxPayoutCap ? `${currency} ${Number(p.maxPayoutCap).toLocaleString()}` : 'Uncapped'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.clawbackOnRefund
                              ? 'bg-blue-50 text-servora-core'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {p.clawbackOnRefund ? 'Auto Clawback' : 'No Clawback'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      {canManagePlans && (
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            disabled={!isOnline}
                            onClick={() => handleTogglePlanActive(p)}
                            title={p.isActive ? 'Pause Plan' : 'Activate Plan'}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-servora-core hover:bg-blue-50 cursor-pointer disabled:opacity-40"
                          >
                            <Power size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: PAYOUT RUNS (MAKER-CHECKER) */}
        {activeTab === 'RUNS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Run Reference</th>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3 text-right">Associates</th>
                  <th className="py-2.5 px-3 text-right">Qualifying Sales</th>
                  <th className="py-2.5 px-3 text-right">Net Payable</th>
                  <th className="py-2.5 px-3">Status / Settlement</th>
                  <th className="py-2.5 px-3 text-right">Workflow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payoutRuns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400 italic">
                      No commission payout runs generated yet.
                    </td>
                  </tr>
                ) : (
                  payoutRuns.map((run) => {
                    const isSelfMaker =
                      run.createdById === currentUserId &&
                      userRole !== 'ADMIN' &&
                      userRole !== 'SUPER_ADMIN';

                    return (
                      <tr key={run.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-servora-navy">
                          {run.runNumber}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-gray-600">
                          {run.periodStart} &ndash; {run.periodEnd}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {run.employeeCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-gray-700">
                          {run.currency} {Number(run.totalQualifyingSales).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          {run.currency} {Number(run.netPayableAmount).toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          {run.status === 'PAID' ? (
                            <div>
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                                Paid ({run.paymentMethod})
                              </span>
                              {run.paymentReference && (
                                <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
                                  Ref: {run.paymentReference}
                                </span>
                              )}
                            </div>
                          ) : run.status === 'APPROVED' ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-servora-core border border-blue-200 rounded text-[10px] font-bold">
                              Approved (Ready to Pay)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                              Draft (Awaiting Approval)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {run.status === 'DRAFT' && canManagePlans && (
                            <button
                              type="button"
                              disabled={!isOnline || isSelfMaker}
                              title={
                                isSelfMaker
                                  ? 'Maker-checker: another supervisor must approve'
                                  : 'Approve commission run'
                              }
                              onClick={() => handleApproveRun(run)}
                              className="px-2.5 py-1 bg-servora-core text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer disabled:opacity-40"
                            >
                              Approve Run
                            </button>
                          )}
                          {run.status === 'APPROVED' && canSettlePayouts && (
                            <button
                              type="button"
                              disabled={!isOnline}
                              onClick={() => {
                                setModalError(null);
                                setSettleTargetRun(run);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer disabled:opacity-40"
                            >
                              Settle &amp; Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. MODAL: CREATE COMMISSION PLAN */}
      {isPlanModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Create Commission Plan</h3>
                <p className="text-[11px] text-gray-400">
                  Configure net-of-tax commission rates, quota hurdles, and refund clawbacks
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
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

            <form onSubmit={handleCreatePlan} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Plan Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dining Server 2.5% Net Sales Incentive"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Branch Scope
                  </label>
                  <select
                    value={planForm.branchId}
                    onChange={(e) => setPlanForm({ ...planForm, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold cursor-pointer"
                  >
                    <option value="">All Branches (Tenant-Wide)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Eligible Role
                  </label>
                  <select
                    value={planForm.targetRole}
                    onChange={(e) => setPlanForm({ ...planForm, targetRole: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold cursor-pointer"
                  >
                    <option value="ALL">All Roles</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.slug}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Calculation Basis *
                  </label>
                  <select
                    value={planForm.basisType}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        basisType: e.target.value as CommissionPlan['basisType'],
                      })
                    }
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold cursor-pointer"
                  >
                    <option value="NET_SALES">Net Sales (Excl. VAT)</option>
                    <option value="GROSS_SALES">Gross Sales</option>
                    <option value="GROSS_MARGIN">Gross Margin</option>
                    <option value="ITEM_QUANTITY">Item Quantity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Rate Structure *
                  </label>
                  <select
                    value={planForm.rateType}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        rateType: e.target.value as CommissionPlan['rateType'],
                      })
                    }
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold cursor-pointer"
                  >
                    <option value="FLAT_PERCENTAGE">Flat Percentage (%)</option>
                    <option value="FLAT_PER_UNIT">Fixed Per Unit</option>
                    <option value="TIERED_ACCELERATOR">Tiered Accelerator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Effective From *
                  </label>
                  <input
                    type="date"
                    required
                    value={planForm.effectiveFrom}
                    onChange={(e) => setPlanForm({ ...planForm, effectiveFrom: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {planForm.rateType !== 'TIERED_ACCELERATOR' ? (
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-servora-navy mb-1">
                      {planForm.rateType === 'FLAT_PER_UNIT'
                        ? `Amount (${currency}/unit) *`
                        : 'Commission Rate (%) *'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      required
                      value={planForm.flatRate}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, flatRate: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-servora-navy mb-1">
                      Min Quota Hurdle ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={planForm.minQualifyingSales}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, minQualifyingSales: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-servora-navy mb-1">
                      Max Payout Cap ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Uncapped"
                      value={planForm.maxPayoutCap}
                      onChange={(e) => setPlanForm({ ...planForm, maxPayoutCap: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-servora-navy">Tiered Accelerator Brackets</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPlanForm((prev) => ({
                          ...prev,
                          tiers: [
                            ...prev.tiers,
                            { minAmount: 0, maxAmount: null, ratePercent: 5 },
                          ],
                        }))
                      }
                      className="text-[11px] font-bold text-servora-core hover:underline cursor-pointer"
                    >
                      + Add Tier
                    </button>
                  </div>
                  {planForm.tiers.map((tier, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                      <input
                        type="number"
                        min={0}
                        placeholder="Min"
                        value={tier.minAmount}
                        onChange={(e) => {
                          const next = [...planForm.tiers];
                          next[idx] = { ...next[idx], minAmount: Number(e.target.value) };
                          setPlanForm({ ...planForm, tiers: next });
                        }}
                        className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono"
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Max (blank=∞)"
                        value={tier.maxAmount ?? ''}
                        onChange={(e) => {
                          const next = [...planForm.tiers];
                          next[idx] = {
                            ...next[idx],
                            maxAmount: e.target.value === '' ? null : Number(e.target.value),
                          };
                          setPlanForm({ ...planForm, tiers: next });
                        }}
                        className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono"
                      />
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={100}
                        placeholder="Rate %"
                        value={tier.ratePercent}
                        onChange={(e) => {
                          const next = [...planForm.tiers];
                          next[idx] = { ...next[idx], ratePercent: Number(e.target.value) };
                          setPlanForm({ ...planForm, tiers: next });
                        }}
                        className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPlanForm({
                            ...planForm,
                            tiers: planForm.tiers.filter((_, i) => i !== idx),
                          })
                        }
                        className="p-1.5 text-gray-400 hover:text-rose-600 cursor-pointer justify-self-end"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={planForm.clawbackOnRefund}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, clawbackOnRefund: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="font-semibold text-servora-navy">
                  Automatically claw back commission on refunded customer orders
                </span>
              </label>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Commission Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: GENERATE PAYOUT RUN */}
      {isGenerateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <h3 className="text-sm font-bold text-servora-navy">Lock Commission Payout Run</h3>
            <p className="text-xs text-gray-600">
              Snapshot <strong>{previewLines.length}</strong> commission line(s) totaling{' '}
              <strong className="font-mono text-emerald-700">
                {currency} {summary.totalAccrued.toLocaleString()}
              </strong>{' '}
              for period <strong className="font-mono">{periodStart}</strong> to{' '}
              <strong className="font-mono">{periodEnd}</strong> as a Draft payout run.
            </p>
            {modalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {modalError}
              </div>
            )}
            <form onSubmit={handleGenerateRun} className="space-y-3 text-xs">
              <input
                type="text"
                placeholder="Optional payroll cycle note (e.g. November 2026 Incentives)"
                value={runNotes}
                onChange={(e) => setRunNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Locking...' : 'Create Draft Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: SETTLE & DISBURSE APPROVED RUN */}
      {settleTargetRun && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  Settle Commission Run ({settleTargetRun.runNumber})
                </h3>
                <p className="text-[11px] text-gray-400">
                  Net Payable: {settleTargetRun.currency}{' '}
                  {Number(settleTargetRun.netPayableAmount).toLocaleString()} to{' '}
                  {settleTargetRun.employeeCount} associate(s)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettleTargetRun(null)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSettleRun} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Disbursement Channel *
                </label>
                <select
                  value={settleForm.paymentMethod}
                  onChange={(e) =>
                    setSettleForm({
                      ...settleForm,
                      paymentMethod: e.target.value as typeof settleForm.paymentMethod,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold cursor-pointer"
                >
                  <option value="MPESA_B2C">M-Pesa B2C Bulk Payout</option>
                  <option value="BANK_TRANSFER">Bank EFT / RTGS Transfer</option>
                  <option value="PAYROLL_CONSOLIDATION">Payroll Consolidation (PAYE)</option>
                  <option value="CASH_DRAWER">Petty Cash / Safe Disbursement</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Payment Reference / Batch Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MPESA-B2C-99410 or PAYROLL-NOV-2026"
                  value={settleForm.paymentReference}
                  onChange={(e) =>
                    setSettleForm({ ...settleForm, paymentReference: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleTargetRun(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Settling...' : 'Confirm Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}