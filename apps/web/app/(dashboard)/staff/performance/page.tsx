// apps/web/app/(dashboard)/staff/performance/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Star,
  Trophy,
  TrendingUp,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  Target,
  FileText,
  Eye,
  X,
  Award,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  Trash2,
  Lock,
  Check,
  Edit2,
  Download,
  Building2,
  Calendar,
  RotateCcw,
  Send,
  Zap,
  Scale,
  CheckSquare,
  Square,
} from 'lucide-react';
import { fetchApi, ApiError } from '@/lib/api';

interface PerformanceReview {
  id: number;
  userId: number;
  employeeName: string;
  employeeRole: string;
  employeeEmail: string;
  branchId: number | null;
  branchName: string | null;
  reviewerId: number | null;
  reviewerName: string | null;
  reviewCycle: 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'ANNUAL';
  periodStart: string;
  periodEnd: string;
  overallRating: string;
  totalSalesGenerated: string;
  salesTarget: string;
  averageTicketValue: string;
  speedOfServiceMinutes: string;
  attendanceScorePercent: number;
  voidRefundCount: number;
  tipPoolAllocated: string;
  competencies: { category: string; rating: number; comments: string }[];
  goals: { id: string; title: string; targetDate: string; completed: boolean }[];
  managerFeedback: string | null;
  employeeFeedback: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'FINALIZED';
  acknowledgedAt: string | null;
  createdAt: string;
}

interface LiveStaffTelemetry {
  userId: number;
  employeeName: string;
  role: string;
  branchId: number | null;
  branchName: string;
  branchCode: string;
  totalSales: number;
  discountTotal: number;
  discountRatePct: number;
  completedOrders: number;
  averageTicketValue: number;
  voidRefundCount: number;
  netCashVariance: number;
  closedTillShifts: number;
  attendanceScore: number | null;
  shiftsWorked: number;
  hoursWorked: number;
  overtimeHours: number;
  salesPerLaborHour: number;
  csatRating: number | null;
  csatCount: number;
}

interface BranchProductivityRow {
  branchId: number;
  branchName: string;
  branchCode: string;
  headcount: number;
  totalSales: number;
  totalOrders: number;
  totalHoursWorked: number;
  totalOvertimeHours: number;
  salesPerLaborHour: number;
  netCashVariance: number;
  voidRefundCount: number;
  avgCsat: number | null;
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

type PeriodPreset =
  | 'TODAY'
  | '7DAYS'
  | '30DAYS'
  | 'MONTH'
  | 'LAST_MONTH'
  | 'QUARTER'
  | 'YEAR'
  | 'CUSTOM';

type SortKey = 'SALES' | 'SPLH' | 'ATV' | 'ATTENDANCE' | 'VOIDS' | 'VARIANCE';

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DEFAULT_COMPETENCY_CATEGORIES = [
  'Guest Service & Hospitality',
  'Punctuality & Shift Attendance',
  'Menu Upselling & Check Velocity',
  'Teamwork & KDS Coordination',
];

export default function StaffPerformancePage() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [telemetryList, setTelemetryList] = useState<LiveStaffTelemetry[]>([]);
  const [branchProductivity, setBranchProductivity] = useState<BranchProductivityRow[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [currency, setCurrency] = useState('KES');

  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // RBAC & current operator context
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [userPermissions, setUserPermissions] = useState<string[] | undefined>(undefined);

  // Tabs & Corporate Filters
  const [activeTab, setActiveTab] = useState<'LEADERBOARD' | 'BRANCHES' | 'REVIEWS'>('LEADERBOARD');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30DAYS');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('SALES');
  const [searchQuery, setSearchQuery] = useState('');
  const [cycleFilter, setCycleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [minRatingFilter, setMinRatingFilter] = useState('ALL');

  // Modals
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [viewingReview, setViewingReview] = useState<PerformanceReview | null>(null);
  const [deleteDraftTarget, setDeleteDraftTarget] = useState<PerformanceReview | null>(null);
  const [ackFeedback, setAckFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // New SMART Goal inline draft
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDate, setNewGoalDate] = useState(formatLocalDate(new Date()));

  // Appraisal Form State
  const [formData, setFormData] = useState({
    userId: '',
    reviewCycle: 'MONTHLY' as PerformanceReview['reviewCycle'],
    periodStart: formatLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    periodEnd: formatLocalDate(new Date()),
    overallRating: 3.0,
    salesTarget: 0,
    totalSalesGenerated: 0,
    averageTicketValue: 0,
    speedOfServiceMinutes: 0,
    attendanceScorePercent: 100,
    voidRefundCount: 0,
    tipPoolAllocated: 0,
    competencies: DEFAULT_COMPETENCY_CATEGORIES.map((category) => ({
      category,
      rating: 3,
      comments: '',
    })),
    goals: [] as Array<{ id: string; title: string; targetDate: string; completed: boolean }>,
    managerFeedback: '',
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

  const canManageAppraisals = useMemo(() => {
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return true;
    return Boolean(
      userPermissions?.includes('*') ||
        userPermissions?.includes('staff.manage') ||
        userPermissions?.includes('reports.view')
    );
  }, [userPermissions, userRole]);

  const computePeriodBounds = useCallback(() => {
    const now = new Date();
    if (periodPreset === 'CUSTOM' && customStartDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate || formatLocalDate(now),
      };
    }

    const end = formatLocalDate(now);
    let start: Date;
    let endDateStr = end;

    switch (periodPreset) {
      case 'TODAY':
        start = new Date(now);
        break;
      case '7DAYS':
        start = new Date(now);
        start.setDate(now.getDate() - 6);
        break;
      case 'MONTH':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'LAST_MONTH':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDateStr = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      case 'QUARTER': {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), qMonth, 1);
        break;
      }
      case 'YEAR':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(now);
        start.setDate(now.getDate() - 29);
        break;
    }

    return { startDate: formatLocalDate(start), endDate: endDateStr };
  }, [periodPreset, customStartDate, customEndDate]);

  const loadData = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setIsLoading(false);
      return;
    }
    if (periodPreset === 'CUSTOM' && !customStartDate) return;

    try {
      setIsLoading(true);
      setPageError(null);

      const { startDate, endDate } = computePeriodBounds();
      const telParams = new URLSearchParams({ startDate, endDate });
      const revParams = new URLSearchParams();

      if (branchFilter !== 'ALL') {
        telParams.set('branchId', branchFilter);
        revParams.set('branchId', branchFilter);
      }
      if (roleFilter !== 'ALL') {
        telParams.set('role', roleFilter);
        revParams.set('role', roleFilter);
      }
      if (cycleFilter !== 'ALL') revParams.set('cycle', cycleFilter);
      if (statusFilter !== 'ALL') revParams.set('status', statusFilter);
      if (minRatingFilter !== 'ALL') revParams.set('minRating', minRatingFilter);

      const [reviewsRes, telemetryRes] = await Promise.all([
        fetchApi(`/api/v1/staff/performance?${revParams.toString()}`),
        fetchApi(`/api/v1/staff/performance/telemetry?${telParams.toString()}`),
      ]);

      if (reviewsRes?.data) setReviews(reviewsRes.data);
      if (telemetryRes?.data) {
        setTelemetryList(telemetryRes.data.telemetry || []);
        setBranchProductivity(telemetryRes.data.branchProductivity || []);
        if (Array.isArray(telemetryRes.data.branches)) setBranches(telemetryRes.data.branches);
        if (Array.isArray(telemetryRes.data.roles)) setRoles(telemetryRes.data.roles);
        if (telemetryRes.data.currency) setCurrency(telemetryRes.data.currency);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.isNetworkError || err.status === 0)) {
        setIsOnline(false);
        return;
      }
      setPageError(err instanceof Error ? err.message : 'Failed to load performance telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [
    branchFilter,
    roleFilter,
    cycleFilter,
    statusFilter,
    minRatingFilter,
    periodPreset,
    customStartDate,
    computePeriodBounds,
  ]);

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

  const hasActiveFilters =
    branchFilter !== 'ALL' ||
    roleFilter !== 'ALL' ||
    periodPreset !== '30DAYS' ||
    cycleFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    minRatingFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setBranchFilter('ALL');
    setRoleFilter('ALL');
    setPeriodPreset('30DAYS');
    setCustomStartDate('');
    setCustomEndDate('');
    setCycleFilter('ALL');
    setStatusFilter('ALL');
    setMinRatingFilter('ALL');
    setSearchQuery('');
    setSortBy('SALES');
  };

  // 360° Executive Metrics
  const metrics = useMemo(() => {
    const totalSalesVol = telemetryList.reduce((acc, t) => acc + t.totalSales, 0);
    const totalHours = telemetryList.reduce((acc, t) => acc + t.hoursWorked, 0);
    const overallSplh = totalHours > 0 ? Number((totalSalesVol / totalHours).toFixed(0)) : 0;
    const totalCashVariance = telemetryList.reduce((acc, t) => acc + t.netCashVariance, 0);
    const totalVoidsRefunds = telemetryList.reduce((acc, t) => acc + t.voidRefundCount, 0);
    const avgRating =
      reviews.length > 0
        ? (
            reviews.reduce((acc, r) => acc + parseFloat(r.overallRating || '0'), 0) /
            reviews.length
          ).toFixed(1)
        : null;

    const withAttendance = telemetryList.filter((t) => t.attendanceScore !== null);
    const avgAttendance =
      withAttendance.length > 0
        ? Math.round(
            withAttendance.reduce((acc, t) => acc + (t.attendanceScore ?? 0), 0) /
              withAttendance.length
          )
        : null;

    return {
      totalAppraisals: reviews.length,
      avgRating,
      totalSalesVol,
      overallSplh,
      totalCashVariance: Number(totalCashVariance.toFixed(2)),
      totalVoidsRefunds,
      avgAttendance,
    };
  }, [reviews, telemetryList]);

  const filteredTelemetry = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = telemetryList.filter(
      (t) =>
        !q ||
        t.employeeName.toLowerCase().includes(q) ||
        t.role.toLowerCase().includes(q) ||
        t.branchName.toLowerCase().includes(q)
    );

    return list.sort((a, b) => {
      switch (sortBy) {
        case 'SPLH':
          return b.salesPerLaborHour - a.salesPerLaborHour;
        case 'ATV':
          return b.averageTicketValue - a.averageTicketValue;
        case 'ATTENDANCE':
          return (b.attendanceScore ?? -1) - (a.attendanceScore ?? -1);
        case 'VOIDS':
          return b.voidRefundCount - a.voidRefundCount;
        case 'VARIANCE':
          return Math.abs(b.netCashVariance) - Math.abs(a.netCashVariance);
        default:
          return b.totalSales - a.totalSales;
      }
    });
  }, [telemetryList, searchQuery, sortBy]);

  const filteredReviews = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return reviews.filter(
      (r) =>
        !q ||
        r.employeeName.toLowerCase().includes(q) ||
        (r.reviewerName && r.reviewerName.toLowerCase().includes(q)) ||
        r.employeeRole.toLowerCase().includes(q)
    );
  }, [reviews, searchQuery]);

  const topChartData = useMemo(
    () =>
      filteredTelemetry.slice(0, 8).map((t) => ({
        name: t.employeeName.split(' ')[0],
        sales: t.totalSales,
        splh: t.salesPerLaborHour,
      })),
    [filteredTelemetry]
  );

  // CSV Export (Board / HR Report)
  const handleExportCsv = () => {
    const headers = [
      'Employee',
      'Role',
      'Branch',
      `Sales (${currency})`,
      'Orders',
      `Avg Ticket (${currency})`,
      `SPLH (${currency}/hr)`,
      'Discount %',
      'Voids & Refunds',
      `Net Cash Variance (${currency})`,
      'Hours Worked',
      'Overtime Hrs',
      'Attendance %',
      'Guest CSAT',
    ];

    const rows = filteredTelemetry.map((t) => [
      `"${t.employeeName}"`,
      t.role,
      `"${t.branchName}"`,
      t.totalSales,
      t.completedOrders,
      t.averageTicketValue,
      t.salesPerLaborHour,
      t.discountRatePct,
      t.voidRefundCount,
      t.netCashVariance,
      t.hoursWorked,
      t.overtimeHours,
      t.attendanceScore ?? 'N/A',
      t.csatRating ?? 'N/A',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `servora-workforce-360-${formatLocalDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CRUD Modal Openers
  const openCreateModal = (emp?: LiveStaffTelemetry) => {
    setEditingReviewId(null);
    setModalError(null);
    setNewGoalTitle('');
    setNewGoalDate(formatLocalDate(new Date()));
    const { startDate, endDate } = computePeriodBounds();
    const target =
      emp || telemetryList.find((t) => t.userId !== currentUserId) || telemetryList[0];

    setFormData({
      userId: target ? String(target.userId) : '',
      reviewCycle: 'MONTHLY',
      periodStart: startDate,
      periodEnd: endDate,
      overallRating: 3.0,
      salesTarget: 0,
      totalSalesGenerated: target ? target.totalSales : 0,
      averageTicketValue: target ? target.averageTicketValue : 0,
      speedOfServiceMinutes: 0,
      attendanceScorePercent: target?.attendanceScore ?? 100,
      voidRefundCount: target ? target.voidRefundCount : 0,
      tipPoolAllocated: 0,
      competencies: DEFAULT_COMPETENCY_CATEGORIES.map((category) => ({
        category,
        rating: 3,
        comments: '',
      })),
      goals: [],
      managerFeedback: '',
    });
    setIsEditorModalOpen(true);
  };

  const openEditModal = (rev: PerformanceReview) => {
    setEditingReviewId(rev.id);
    setModalError(null);
    setNewGoalTitle('');
    setNewGoalDate(formatLocalDate(new Date()));
    setFormData({
      userId: String(rev.userId),
      reviewCycle: rev.reviewCycle,
      periodStart: rev.periodStart,
      periodEnd: rev.periodEnd,
      overallRating: parseFloat(rev.overallRating) || 3,
      salesTarget: parseFloat(rev.salesTarget) || 0,
      totalSalesGenerated: parseFloat(rev.totalSalesGenerated) || 0,
      averageTicketValue: parseFloat(rev.averageTicketValue) || 0,
      speedOfServiceMinutes: parseFloat(rev.speedOfServiceMinutes) || 0,
      attendanceScorePercent: rev.attendanceScorePercent,
      voidRefundCount: rev.voidRefundCount,
      tipPoolAllocated: parseFloat(rev.tipPoolAllocated) || 0,
      competencies:
        rev.competencies.length > 0
          ? rev.competencies.map((c) => ({ ...c }))
          : DEFAULT_COMPETENCY_CATEGORIES.map((category) => ({
              category,
              rating: 3,
              comments: '',
            })),
      goals: rev.goals.map((g) => ({ ...g })),
      managerFeedback: rev.managerFeedback || '',
    });
    setViewingReview(null);
    setIsEditorModalOpen(true);
  };

  const handleEmployeeSelectChange = (nextId: string) => {
    const match = telemetryList.find((t) => String(t.userId) === nextId);
    setFormData((prev) => ({
      ...prev,
      userId: nextId,
      totalSalesGenerated: match ? match.totalSales : 0,
      averageTicketValue: match ? match.averageTicketValue : 0,
      attendanceScorePercent: match?.attendanceScore ?? 100,
      voidRefundCount: match ? match.voidRefundCount : 0,
    }));
  };

  const handleRatingChange = (catIdx: number, rating: number) => {
    setFormData((prev) => {
      const updated = prev.competencies.map((c, i) => (i === catIdx ? { ...c, rating } : c));
      const avg = Number(
        (updated.reduce((acc, c) => acc + c.rating, 0) / updated.length).toFixed(2)
      );
      return { ...prev, competencies: updated, overallRating: avg };
    });
  };

  const handleCompetencyCommentChange = (catIdx: number, comments: string) => {
    setFormData((prev) => ({
      ...prev,
      competencies: prev.competencies.map((c, i) => (i === catIdx ? { ...c, comments } : c)),
    }));
  };

  const handleAddGoal = () => {
    if (!newGoalTitle.trim()) return;
    setFormData((prev) => ({
      ...prev,
      goals: [
        ...prev.goals,
        {
          id: String(Date.now()),
          title: newGoalTitle.trim(),
          targetDate: newGoalDate,
          completed: false,
        },
      ],
    }));
    setNewGoalTitle('');
  };

  const handleRemoveGoal = (goalId: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== goalId),
    }));
  };

  const handleSaveAppraisal = async (targetStatus: 'DRAFT' | 'SUBMITTED') => {
    setModalError(null);
    try {
      setIsSubmitting(true);
      const payload = {
        userId: parseInt(formData.userId, 10),
        reviewCycle: formData.reviewCycle,
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
        overallRating: Number(formData.overallRating),
        totalSalesGenerated: Number(formData.totalSalesGenerated),
        salesTarget: Number(formData.salesTarget),
        averageTicketValue: Number(formData.averageTicketValue),
        speedOfServiceMinutes: Number(formData.speedOfServiceMinutes),
        attendanceScorePercent: Number(formData.attendanceScorePercent),
        voidRefundCount: Number(formData.voidRefundCount),
        tipPoolAllocated: Number(formData.tipPoolAllocated),
        competencies: formData.competencies,
        goals: formData.goals,
        managerFeedback: formData.managerFeedback.trim() || null,
        status: targetStatus,
      };

      if (editingReviewId) {
        await fetchApi(`/api/v1/staff/performance/${editingReviewId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setStatusBanner(
          targetStatus === 'DRAFT'
            ? 'Appraisal draft updated.'
            : 'Appraisal updated and submitted to associate.'
        );
      } else {
        await fetchApi('/api/v1/staff/performance', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setStatusBanner(
          targetStatus === 'DRAFT'
            ? 'Appraisal saved as Draft.'
            : 'Appraisal submitted. Associate has been notified.'
        );
      }

      setIsEditorModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to save appraisal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleGoalInViewer = async (goalId: string) => {
    if (!viewingReview || viewingReview.status === 'FINALIZED' || !canManageAppraisals) return;
    const nextGoals = viewingReview.goals.map((g) =>
      g.id === goalId ? { ...g, completed: !g.completed } : g
    );
    try {
      await fetchApi(`/api/v1/staff/performance/${viewingReview.id}`, {
        method: 'PUT',
        body: JSON.stringify({ goals: nextGoals }),
      });
      setViewingReview({ ...viewingReview, goals: nextGoals });
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to update goal status.');
    }
  };

  const handleDeleteDraft = async () => {
    if (!deleteDraftTarget) return;
    try {
      setIsSubmitting(true);
      await fetchApi(`/api/v1/staff/performance/${deleteDraftTarget.id}`, {
        method: 'DELETE',
      });
      setDeleteDraftTarget(null);
      setViewingReview(null);
      setStatusBanner('Draft appraisal permanently deleted.');
      await loadData();
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to delete draft appraisal.');
      setDeleteDraftTarget(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcknowledgeReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingReview) return;
    setModalError(null);
    try {
      setIsSubmitting(true);
      await fetchApi(`/api/v1/staff/performance/${viewingReview.id}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify({ employeeFeedback: ackFeedback.trim() || undefined }),
      });
      setViewingReview(null);
      setAckFeedback('');
      setStatusBanner('Appraisal digitally acknowledged and archived.');
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to acknowledge appraisal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeReview = async () => {
    if (!viewingReview) return;
    setModalError(null);
    try {
      setIsSubmitting(true);
      await fetchApi(`/api/v1/staff/performance/${viewingReview.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'FINALIZED' }),
      });
      setViewingReview(null);
      setStatusBanner(`Appraisal #${viewingReview.id} finalized and locked to employee file.`);
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to finalize appraisal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/staff"
                className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
              >
                Staff Directory <ChevronRight size={12} />
              </Link>
              <span className="text-xs font-bold text-servora-navy">
                360° Workforce &amp; Operations Performance
              </span>
              {!isOnline && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  <WifiOff size={10} /> Offline
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-servora-navy">
              Workforce Performance &amp; KPI Evaluation Tower
            </h1>
            <p className="text-xs text-servora-deepTeal mt-0.5">
              360° operational telemetry uniting POS sales, SPLH, cash till discipline, voids, attendance, guest CSAT, and HCM appraisals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredTelemetry.length === 0}
              className="px-3 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download size={13} /> Export CSV
            </button>
            {canManageAppraisals && (
              <button
                type="button"
                disabled={!isOnline || telemetryList.length === 0}
                onClick={() => openCreateModal()}
                className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus size={14} /> New Appraisal
              </button>
            )}
            <button
              type="button"
              disabled={isLoading || !isOnline}
              onClick={loadData}
              title="Refresh Telemetry"
              className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
            </button>
          </div>
        </div>

        {/* ADVANCED CORPORATE FILTER BAR */}
        <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] sm:max-w-[220px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={14}
            />
            <input
              type="text"
              placeholder="Search associate, role, branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
            />
          </div>

          {branches.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
              <Building2 size={13} className="text-servora-core shrink-0" />
              <select
                aria-label="Filter by branch"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Authorized Branches ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {roles.length > 0 && (
            <select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Functional Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
            <Calendar size={13} className="text-servora-core shrink-0" />
            <select
              aria-label="Filter by duration"
              value={periodPreset}
              onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
              className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="TODAY">Today</option>
              <option value="7DAYS">Past 7 Days</option>
              <option value="30DAYS">Past 30 Days</option>
              <option value="MONTH">This Month (MTD)</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="QUARTER">This Quarter (QTD)</option>
              <option value="YEAR">This Year (YTD)</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {periodPreset === 'CUSTOM' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1 rounded-xl text-xs">
              <input
                type="date"
                aria-label="Start date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent font-mono text-xs focus:outline-none"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                aria-label="End date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent font-mono text-xs focus:outline-none"
              />
            </div>
          )}

          {activeTab === 'LEADERBOARD' && (
            <select
              aria-label="Sort leaderboard"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="px-2.5 py-1.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs font-bold text-servora-core focus:outline-none cursor-pointer"
            >
              <option value="SALES">Rank by: Gross Sales</option>
              <option value="SPLH">Rank by: Sales / Labor Hour</option>
              <option value="ATV">Rank by: Avg Ticket Value</option>
              <option value="ATTENDANCE">Rank by: Attendance %</option>
              <option value="VOIDS">Rank by: Highest Voids/Refunds</option>
              <option value="VARIANCE">Rank by: Largest Cash Drift</option>
            </select>
          )}

          {activeTab === 'REVIEWS' && (
            <>
              <select
                aria-label="Filter by cycle"
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Cycles</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="BIANNUAL">Biannual</option>
                <option value="ANNUAL">Annual</option>
              </select>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Pending Sign-Off</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="FINALIZED">Finalized</option>
              </select>
              <select
                aria-label="Filter by min rating"
                value={minRatingFilter}
                onChange={(e) => setMinRatingFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
              >
                <option value="ALL">Any Rating</option>
                <option value="4.5">4.5+ Stars (Top)</option>
                <option value="4">4.0+ Stars</option>
                <option value="3">3.0+ Stars</option>
              </select>
            </>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
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

      {/* 2. 360° EXECUTIVE KPI RIBBON */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Attributed Sales
            </span>
            <p className="text-lg font-bold font-mono text-servora-navy mt-0.5 truncate">
              {currency} {metrics.totalSalesVol.toLocaleString()}
            </p>
          </div>
          <div className="p-2 bg-blue-50 text-servora-core rounded-xl">
            <TrendingUp size={16} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Sales / Labor Hr
            </span>
            <p className="text-lg font-bold font-mono text-servora-core mt-0.5 truncate">
              {currency} {metrics.overallSplh.toLocaleString()}
            </p>
          </div>
          <div className="p-2 bg-blue-50 text-servora-core rounded-xl">
            <Zap size={16} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Net Cash Drift
            </span>
            <p
              className={`text-lg font-bold font-mono mt-0.5 truncate ${
                metrics.totalCashVariance < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {currency} {metrics.totalCashVariance.toLocaleString()}
            </p>
          </div>
          <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
            <Scale size={16} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Punctuality
            </span>
            <p className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
              {metrics.avgAttendance !== null ? `${metrics.avgAttendance}%` : '—'}
            </p>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={16} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Voids &amp; Refunds
            </span>
            <p className="text-lg font-bold font-mono text-amber-700 mt-0.5">
              {metrics.totalVoidsRefunds}
            </p>
          </div>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle size={16} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Appraisal Avg
            </span>
            <p className="text-lg font-bold font-mono text-servora-navy mt-0.5 flex items-center gap-1">
              <Star size={15} className="text-amber-500 fill-amber-400" />
              {metrics.avgRating ?? '—'}
            </p>
          </div>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <Award size={16} />
          </div>
        </div>
      </div>

      {/* 3. TOP PERFORMERS VISUAL CHART (WHEN DATA EXISTS) */}
      {activeTab === 'LEADERBOARD' && topChartData.some((d) => d.sales > 0) && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-servora-navy">
                Top Associates Revenue Contribution ({currency})
              </h2>
              <p className="text-[11px] text-gray-400">
                Live attributed POS sales across selected period &amp; branch scope
              </p>
            </div>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickFormatter={(v) => `${Number(v).toLocaleString()}`}
                />
                <Tooltip
                  formatter={(val: unknown) => [
                    `${currency} ${Number(val).toLocaleString()}`,
                    'Gross Sales',
                  ]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="sales" fill="#0554F4" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. MAIN WORKSPACE TABS & TABLES */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('LEADERBOARD')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LEADERBOARD'
                ? 'bg-servora-navy text-white shadow-xs'
                : 'bg-slate-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Trophy size={13} className="text-amber-400" />
            360° Associate Leaderboard ({filteredTelemetry.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BRANCHES')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'BRANCHES'
                ? 'bg-servora-navy text-white shadow-xs'
                : 'bg-slate-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Building2 size={13} />
            Branch Productivity Matrix ({branchProductivity.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REVIEWS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'REVIEWS'
                ? 'bg-servora-navy text-white shadow-xs'
                : 'bg-slate-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText size={13} />
            Formal Appraisals ({filteredReviews.length})
          </button>
        </div>

        {/* TAB 1: 360° ASSOCIATE LEADERBOARD */}
        {activeTab === 'LEADERBOARD' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Rank &amp; Associate</th>
                  <th className="py-2.5 px-3">Role &amp; Outlet</th>
                  <th className="py-2.5 px-3 text-right">POS Sales / ATV</th>
                  <th className="py-2.5 px-3 text-right">SPLH</th>
                  <th className="py-2.5 px-3 text-right">Disc % / Voids</th>
                  <th className="py-2.5 px-3 text-right">Cash Drift</th>
                  <th className="py-2.5 px-3">Attendance &amp; Hrs</th>
                  <th className="py-2.5 px-3">CSAT</th>
                  {canManageAppraisals && <th className="py-2.5 px-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTelemetry.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManageAppraisals ? 9 : 8}
                      className="py-8 text-center text-gray-400 italic"
                    >
                      {isLoading
                        ? 'Aggregating 360° workforce KPIs...'
                        : 'No active associates match the active filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredTelemetry.map((item, idx) => (
                    <tr key={item.userId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg font-mono font-bold text-[10px] flex items-center justify-center shrink-0 ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : idx === 1
                                  ? 'bg-slate-200 text-slate-800'
                                  : idx === 2
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-slate-50 text-gray-500'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-bold text-servora-navy">{item.employeeName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-slate-100 text-servora-navy border border-gray-200">
                          {item.role.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          {item.branchName}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        <span className="font-bold text-servora-core block">
                          {currency} {item.totalSales.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {item.completedOrders} ord &bull; ATV {item.averageTicketValue.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                        {item.salesPerLaborHour > 0
                          ? `${currency} ${item.salesPerLaborHour.toLocaleString()}/h`
                          : '—'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        <span
                          className={`block font-bold ${
                            item.discountRatePct > 10 ? 'text-rose-600' : 'text-gray-700'
                          }`}
                        >
                          {item.discountRatePct}% disc
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {item.voidRefundCount} voids/ref
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        {item.closedTillShifts > 0 ? (
                          <span
                            className={`font-bold ${
                              item.netCashVariance < 0
                                ? 'text-rose-600'
                                : item.netCashVariance > 0
                                  ? 'text-amber-600'
                                  : 'text-emerald-700'
                            }`}
                          >
                            {currency} {item.netCashVariance.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {item.attendanceScore !== null ? (
                          <div>
                            <span className="font-mono font-bold text-emerald-700 block">
                              {item.attendanceScore}% ({item.hoursWorked}h)
                            </span>
                            {item.overtimeHours > 0 && (
                              <span className="text-[10px] font-mono text-rose-600 font-bold">
                                +{item.overtimeHours}h OT
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No punches</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {item.csatRating !== null ? (
                          <span className="inline-flex items-center gap-1 font-bold text-servora-navy">
                            <Star size={11} className="text-amber-500 fill-amber-400" />
                            {item.csatRating}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {canManageAppraisals && (
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            disabled={!isOnline}
                            onClick={() => openCreateModal(item)}
                            className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-servora-core border border-gray-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Target size={12} /> Evaluate
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

        {/* TAB 2: BRANCH PRODUCTIVITY MATRIX */}
        {activeTab === 'BRANCHES' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Branch Outlet</th>
                  <th className="py-2.5 px-3 text-right">Headcount</th>
                  <th className="py-2.5 px-3 text-right">Gross Sales</th>
                  <th className="py-2.5 px-3 text-right">Orders</th>
                  <th className="py-2.5 px-3 text-right">Labor Hours (OT)</th>
                  <th className="py-2.5 px-3 text-right">Branch SPLH</th>
                  <th className="py-2.5 px-3 text-right">Net Cash Drift</th>
                  <th className="py-2.5 px-3 text-right">Guest CSAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {branchProductivity.map((b) => (
                  <tr
                    key={b.branchId}
                    onClick={() => {
                      setBranchFilter(String(b.branchId));
                      setActiveTab('LEADERBOARD');
                    }}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3">
                      <span className="font-bold text-servora-navy block">{b.branchName}</span>
                      <span className="text-[10px] font-mono text-gray-400">{b.branchCode}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                      {b.headcount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-servora-core">
                      {currency} {b.totalSales.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{b.totalOrders}</td>
                    <td className="py-3 px-3 text-right font-mono">
                      {b.totalHoursWorked}h{' '}
                      {b.totalOvertimeHours > 0 && (
                        <span className="text-rose-600 font-bold">(+{b.totalOvertimeHours}h)</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {b.salesPerLaborHour > 0
                        ? `${currency} ${b.salesPerLaborHour.toLocaleString()}/h`
                        : '—'}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono font-bold ${
                        b.netCashVariance < 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {currency} {b.netCashVariance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {b.avgCsat !== null ? `${b.avgCsat} / 5` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: FORMAL APPRAISAL RECORDS (FULL CRUD) */}
        {activeTab === 'REVIEWS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Associate</th>
                  <th className="py-2.5 px-3">Cycle &amp; Period</th>
                  <th className="py-2.5 px-3">Rating</th>
                  <th className="py-2.5 px-3">Sales vs Target</th>
                  <th className="py-2.5 px-3">Reviewer</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                      No formal appraisal records match the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredReviews.map((rev) => (
                    <tr key={rev.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">
                          {rev.employeeName}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">
                          {rev.employeeRole.replace(/_/g, ' ')}
                          {rev.branchName ? ` • ${rev.branchName}` : ''}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.2 bg-blue-50 text-servora-core border border-blue-200 rounded text-[9.5px] font-bold uppercase">
                          {rev.reviewCycle}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                          {rev.periodStart} &ndash; {rev.periodEnd}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <span className="inline-flex items-center gap-1 font-bold text-servora-navy bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Star size={11} className="text-amber-500 fill-amber-400" />
                          {rev.overallRating}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className="font-bold text-servora-navy block">
                          {currency} {parseFloat(rev.totalSalesGenerated).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          Target: {currency} {parseFloat(rev.salesTarget).toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-gray-700 font-medium">
                        {rev.reviewerName || 'Manager'}
                      </td>

                      <td className="py-3 px-3">
                        {rev.status === 'FINALIZED' ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-servora-core border border-blue-200 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                            <Lock size={10} /> Finalized
                          </span>
                        ) : rev.status === 'ACKNOWLEDGED' ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                            <ShieldCheck size={11} /> Acknowledged
                          </span>
                        ) : rev.status === 'DRAFT' ? (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-md font-bold text-[10px]">
                            Draft
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold text-[10px]">
                            Pending Sign-Off
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setModalError(null);
                              setAckFeedback('');
                              setViewingReview(rev);
                            }}
                            className="p-1.5 bg-slate-50 text-servora-navy hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                            title="View Appraisal File"
                          >
                            <Eye size={13} />
                          </button>
                          {canManageAppraisals && rev.status !== 'FINALIZED' && (
                            <button
                              type="button"
                              disabled={!isOnline}
                              onClick={() => openEditModal(rev)}
                              className="p-1.5 bg-slate-50 text-servora-core hover:bg-blue-50 border border-gray-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Edit Appraisal"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {canManageAppraisals && rev.status === 'DRAFT' && (
                            <button
                              type="button"
                              disabled={!isOnline}
                              onClick={() => setDeleteDraftTarget(rev)}
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete Draft"
                            >
                              <Trash2 size={13} />
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
        )}
      </div>

      {/* 5. MODAL: CREATE / EDIT APPRAISAL */}
      {isEditorModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingReviewId
                    ? `Edit Appraisal (#${editingReviewId})`
                    : 'Conduct Staff Performance Appraisal'}
                </h3>
                <p className="text-[11px] text-gray-400">
                  Save as Draft for internal review or Submit to notify the associate
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorModalOpen(false)}
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

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Associate *
                  </label>
                  <select
                    required
                    disabled={editingReviewId !== null}
                    value={formData.userId}
                    onChange={(e) => handleEmployeeSelectChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer disabled:opacity-60"
                  >
                    <option value="">Select Associate...</option>
                    {telemetryList.map((s) => (
                      <option key={s.userId} value={s.userId}>
                        {s.employeeName} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Review Cycle *
                  </label>
                  <select
                    value={formData.reviewCycle}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reviewCycle: e.target.value as PerformanceReview['reviewCycle'],
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="MONTHLY">Monthly Review</option>
                    <option value="QUARTERLY">Quarterly Appraisal</option>
                    <option value="BIANNUAL">Biannual Review</option>
                    <option value="ANNUAL">Annual Performance Review</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Overall Rating
                  </label>
                  <div className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-sm text-servora-navy flex items-center justify-between">
                    <span>{formData.overallRating} / 5.0</span>
                    <Star size={15} className="text-amber-500 fill-amber-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Period Start *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.periodStart}
                    onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Period End *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.periodEnd}
                    onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Operational KPIs */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2.5">
                <span className="font-bold text-servora-navy flex items-center gap-1.5 text-xs">
                  <Target size={14} className="text-servora-core" /> Sales &amp; Operational KPIs
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      Target Sales ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.salesTarget}
                      onChange={(e) =>
                        setFormData({ ...formData, salesTarget: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      Achieved Sales ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.totalSalesGenerated}
                      onChange={(e) =>
                        setFormData({ ...formData, totalSalesGenerated: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      Avg Check ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.averageTicketValue}
                      onChange={(e) =>
                        setFormData({ ...formData, averageTicketValue: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      Tip Allocation ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.tipPoolAllocated}
                      onChange={(e) =>
                        setFormData({ ...formData, tipPoolAllocated: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Competencies with Notes */}
              <div className="space-y-2">
                <span className="font-bold text-servora-navy block text-xs">
                  Competency Scoring Matrix
                </span>
                <div className="space-y-2">
                  {formData.competencies.map((comp, idx) => (
                    <div
                      key={comp.category}
                      className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-servora-navy text-xs">
                          {comp.category}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleRatingChange(idx, star)}
                              className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                            >
                              <Star
                                size={15}
                                className={
                                  star <= comp.rating
                                    ? 'text-amber-500 fill-amber-400'
                                    : 'text-gray-300'
                                }
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Optional competency note..."
                        value={comp.comments}
                        onChange={(e) => handleCompetencyCommentChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[11px]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic SMART Goals */}
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-2">
                <span className="font-bold text-servora-navy block text-xs">
                  SMART Development Goals
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Complete eTIMS fiscal training"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                  />
                  <input
                    type="date"
                    value={newGoalDate}
                    onChange={(e) => setNewGoalDate(e.target.value)}
                    className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddGoal}
                    className="px-3 py-1.5 bg-servora-navy text-white font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                {formData.goals.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {formData.goals.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-gray-200"
                      >
                        <span className="font-medium text-servora-navy">{g.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-gray-400">
                            {g.targetDate}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGoal(g.id)}
                            className="text-gray-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Manager Feedback &amp; Coaching Plan
                </label>
                <textarea
                  rows={3}
                  placeholder="Summarize strengths, operational reliability, and coaching recommendations"
                  value={formData.managerFeedback}
                  onChange={(e) => setFormData({ ...formData, managerFeedback: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !formData.userId}
                  onClick={() => handleSaveAppraisal('DRAFT')}
                  className="flex-1 py-2.5 bg-slate-100 text-servora-navy border border-gray-200 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !formData.userId}
                  onClick={() => handleSaveAppraisal('SUBMITTED')}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send size={13} />
                  {isSubmitting ? 'Saving...' : 'Submit to Associate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: DETAILED APPRAISAL FILE, LIVE GOAL TOGGLES, ACKNOWLEDGMENT & FINALIZATION */}
      {viewingReview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-servora-core bg-blue-50 px-2 py-0.5 rounded-md">
                  {viewingReview.reviewCycle} Appraisal File &bull; {viewingReview.status}
                </span>
                <h3 className="text-base font-bold text-servora-navy mt-1">
                  {viewingReview.employeeName} ({viewingReview.employeeRole})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingReview(null)}
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

            <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50 border border-gray-200 rounded-xl text-center text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Score</span>
                <span className="font-mono font-bold text-base text-servora-navy flex items-center justify-center gap-1 mt-0.5">
                  <Star size={14} className="text-amber-500 fill-amber-400" />
                  {viewingReview.overallRating}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">
                  Sales Volume
                </span>
                <span className="font-mono font-bold text-xs text-servora-core block mt-1">
                  {currency} {parseFloat(viewingReview.totalSalesGenerated).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">
                  Attendance
                </span>
                <span className="font-mono font-bold text-xs text-emerald-700 block mt-1">
                  {viewingReview.attendanceScorePercent}%
                </span>
              </div>
            </div>

            {viewingReview.competencies.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-servora-navy block text-[11px]">
                  Competency Assessment Breakdown:
                </span>
                {viewingReview.competencies.map((comp) => (
                  <div
                    key={comp.category}
                    className="p-2 bg-slate-50 border border-gray-200 rounded-lg space-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{comp.category}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={
                              star <= comp.rating
                                ? 'text-amber-500 fill-amber-400'
                                : 'text-gray-300'
                            }
                          />
                        ))}
                      </div>
                    </div>
                    {comp.comments && (
                      <p className="text-[11px] text-gray-500 italic">{comp.comments}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {viewingReview.goals.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-servora-navy block text-[11px]">
                  SMART Development Goals:
                </span>
                {viewingReview.goals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    disabled={!canManageAppraisals || viewingReview.status === 'FINALIZED'}
                    onClick={() => handleToggleGoalInViewer(g.id)}
                    className="w-full p-2 bg-slate-50 border border-gray-200 rounded-lg flex items-center justify-between text-left hover:bg-gray-100/70 disabled:cursor-default cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium text-gray-700">
                      {g.completed ? (
                        <CheckSquare size={14} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Square size={14} className="text-gray-400 shrink-0" />
                      )}
                      <span className={g.completed ? 'line-through text-gray-400' : ''}>
                        {g.title}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-gray-400">{g.targetDate}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-servora-navy block text-[11px] mb-0.5">
                  Manager Feedback ({viewingReview.reviewerName || 'Manager'}):
                </span>
                <p className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-700 leading-relaxed">
                  {viewingReview.managerFeedback || 'No written feedback recorded.'}
                </p>
              </div>
              {viewingReview.employeeFeedback && (
                <div>
                  <span className="font-bold text-emerald-800 block text-[11px] mb-0.5">
                    Associate Acknowledgment Remarks:
                  </span>
                  <p className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 leading-relaxed">
                    {viewingReview.employeeFeedback}
                  </p>
                </div>
              )}
            </div>

            {/* Employee Self-Acknowledgment */}
            {viewingReview.status === 'SUBMITTED' && currentUserId === viewingReview.userId && (
              <form
                onSubmit={handleAcknowledgeReview}
                className="pt-2 border-t border-gray-100 space-y-2 text-xs"
              >
                <label className="block text-[11px] font-bold text-servora-navy">
                  Associate Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Add your comments before digitally acknowledging..."
                  value={ackFeedback}
                  onChange={(e) => setAckFeedback(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !isOnline}
                  className="w-full py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check size={14} />
                  {isSubmitting ? 'Signing...' : 'Acknowledge & Sign Appraisal'}
                </button>
              </form>
            )}

            {/* Manager Actions */}
            <div className="pt-3 border-t border-gray-100 flex flex-wrap justify-between gap-2 text-xs">
              <div className="flex gap-2">
                {canManageAppraisals && viewingReview.status !== 'FINALIZED' && (
                  <button
                    type="button"
                    onClick={() => openEditModal(viewingReview)}
                    className="px-3.5 py-2 bg-slate-100 text-servora-navy font-bold rounded-xl hover:bg-gray-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                )}
                {canManageAppraisals && viewingReview.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => setDeleteDraftTarget(viewingReview)}
                    className="px-3.5 py-2 bg-rose-50 text-rose-700 font-bold rounded-xl hover:bg-rose-100 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} /> Delete Draft
                  </button>
                )}
                {canManageAppraisals && viewingReview.status === 'ACKNOWLEDGED' && (
                  <button
                    type="button"
                    disabled={isSubmitting || !isOnline}
                    onClick={handleFinalizeReview}
                    className="px-3.5 py-2 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Lock size={13} /> Finalize &amp; Lock
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewingReview(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Close File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: DELETE DRAFT CONFIRMATION */}
      {deleteDraftTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <h3 className="text-sm font-bold text-rose-700">Delete Draft Appraisal?</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              This draft appraisal for <strong>{deleteDraftTarget.employeeName}</strong> (
              {deleteDraftTarget.reviewCycle}) will be permanently removed.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteDraftTarget(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDraft}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}