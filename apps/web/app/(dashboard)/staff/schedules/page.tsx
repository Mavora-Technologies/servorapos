// apps/web/app/(dashboard)/staff/schedules/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Send,
  Copy,
  Clock,
  AlertTriangle,
  X,
  Trash2,
  CheckCircle2,
  Wallet,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { fetchApi, ApiError } from '@/lib/api';

interface ShiftItem {
  id: number;
  shiftDate: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  role: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CONFIRMED' | 'CANCELLED';
  hourlyWage: string;
  notes: string | null;
  templateId: number | null;
  branchId: number;
  branchName: string;
  branchCode: string;
  userId: number;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
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
  isMainBranch?: boolean;
}

interface RoleOption {
  id: number;
  name: string;
  slug: string;
}

interface ShiftTemplateOption {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  colorHex: string;
  branchId: number | null;
}

interface RosterEnvelope {
  shifts: ShiftItem[];
  staff: StaffOption[];
  branches: BranchOption[];
  templates: ShiftTemplateOption[];
  roles: RoleOption[];
  laborPolicy: {
    currency: string;
    standardWorkWeekHours: number;
    overtimeMultiplier: number;
  };
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateShiftDurationHours(
  startTime: string,
  endTime: string,
  breakMinutes: number
): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMins = startH * 60 + startM;
  let endMins = endH * 60 + endM;

  if (endMins <= startMins) {
    endMins += 24 * 60; // Overnight shift
  }

  const netMins = Math.max(0, endMins - startMins - (breakMinutes || 0));
  return Number((netMins / 60).toFixed(1));
}

export default function StaffSchedulesPage() {
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));
  const [rosterData, setRosterData] = useState<RosterEnvelope | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // RBAC state
  const [userPermissions, setUserPermissions] = useState<string[] | undefined>(undefined);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Modals
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'PUBLISH' | 'COPY' | 'DELETE' | null>(null);
  const [editingShift, setEditingShift] = useState<ShiftItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Shift Form Data
  const [formData, setFormData] = useState({
    userId: '',
    branchId: '',
    shiftDate: '',
    startTime: '08:00',
    endTime: '16:30',
    breakMinutes: 30,
    role: '',
    hourlyWage: '0',
    templateId: '',
    notes: '',
  });

  // Template Form Data
  const [templateForm, setTemplateForm] = useState({
    name: '',
    startTime: '07:00',
    endTime: '15:30',
    breakMinutes: 30,
    colorHex: '#0554F4',
    branchId: '',
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

  const canManageStaff = useMemo(() => {
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return true;
    return Boolean(userPermissions?.includes('*') || userPermissions?.includes('staff.manage'));
  }, [userPermissions, userRole]);

  const weekStartStr = useMemo(() => formatLocalDate(currentMonday), [currentMonday]);

  const weekDays = useMemo(() => {
    const todayStr = formatLocalDate(new Date());
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + i);
      const dateStr = formatLocalDate(d);
      return {
        dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isToday: dateStr === todayStr,
      };
    });
  }, [currentMonday]);

  const loadRoster = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setPageError(null);
      const params = new URLSearchParams({
        weekStart: weekStartStr,
        branchId: selectedBranchId,
        role: selectedRole,
      });

      const res = await fetchApi(`/api/v1/staff/schedules?${params.toString()}`);
      if (res?.data) {
        setRosterData(res.data);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.isNetworkError || err.status === 0)) {
        setIsOnline(false);
        return;
      }
      setPageError(err instanceof Error ? err.message : 'Failed to load weekly roster.');
    } finally {
      setIsLoading(false);
    }
  }, [weekStartStr, selectedBranchId, selectedRole]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const onOnline = () => {
      setIsOnline(true);
      void loadRoster();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [loadRoster]);

  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(currentMonday.getDate() - 7);
    setCurrentMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(currentMonday.getDate() + 7);
    setCurrentMonday(next);
  };

  const handleCurrentWeek = () => setCurrentMonday(getMonday(new Date()));

  const openCreateModal = (userId?: number, shiftDate?: string) => {
    if (!canManageStaff) return;
    setEditingShift(null);
    setFormError(null);

    const defaultStaff = rosterData?.staff.find((s) => s.id === userId) || rosterData?.staff[0];
    const defaultBranch =
      selectedBranchId !== 'ALL'
        ? selectedBranchId
        : defaultStaff?.defaultBranchId
          ? String(defaultStaff.defaultBranchId)
          : rosterData?.branches[0]?.id
            ? String(rosterData.branches[0].id)
            : '';

    setFormData({
      userId: userId ? String(userId) : defaultStaff ? String(defaultStaff.id) : '',
      branchId: defaultBranch,
      shiftDate: shiftDate || weekDays[0].dateStr,
      startTime: '08:00',
      endTime: '16:30',
      breakMinutes: 30,
      role: defaultStaff?.role || rosterData?.roles?.[0]?.slug || '',
      hourlyWage: '0',
      templateId: '',
      notes: '',
    });
    setIsShiftModalOpen(true);
  };

  const openEditModal = (shift: ShiftItem) => {
    if (!canManageStaff) return;
    setEditingShift(shift);
    setFormError(null);
    setFormData({
      userId: String(shift.userId),
      branchId: String(shift.branchId),
      shiftDate: shift.shiftDate,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakMinutes: shift.breakMinutes,
      role: shift.role,
      hourlyWage: shift.hourlyWage || '0',
      templateId: shift.templateId ? String(shift.templateId) : '',
      notes: shift.notes || '',
    });
    setIsShiftModalOpen(true);
  };

  const handleApplyTemplate = (template: ShiftTemplateOption) => {
    setFormData((prev) => ({
      ...prev,
      startTime: template.startTime,
      endTime: template.endTime,
      breakMinutes: template.breakMinutes,
      templateId: String(template.id),
    }));
  };

  const handleSubmitShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      setIsSubmitting(true);
      const body = {
        userId: parseInt(formData.userId, 10),
        branchId: parseInt(formData.branchId, 10),
        shiftDate: formData.shiftDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        breakMinutes: Number(formData.breakMinutes),
        role: formData.role,
        hourlyWage: Number(formData.hourlyWage) || 0,
        templateId: formData.templateId ? parseInt(formData.templateId, 10) : null,
        notes: formData.notes.trim() || null,
      };

      if (editingShift) {
        await fetchApi(`/api/v1/staff/schedules/shifts/${editingShift.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        setStatusBanner('Shift allocation updated.');
      } else {
        await fetchApi('/api/v1/staff/schedules/shifts', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setStatusBanner('New shift allocated as Draft.');
      }

      setIsShiftModalOpen(false);
      await loadRoster();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save shift allocation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      setIsSubmitting(true);
      const res = await fetchApi('/api/v1/staff/schedules/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: templateForm.name,
          startTime: templateForm.startTime,
          endTime: templateForm.endTime,
          breakMinutes: Number(templateForm.breakMinutes),
          colorHex: templateForm.colorHex,
          branchId: templateForm.branchId ? parseInt(templateForm.branchId, 10) : null,
        }),
      });
      setIsTemplateModalOpen(false);
      setTemplateForm({
        name: '',
        startTime: '07:00',
        endTime: '15:30',
        breakMinutes: 30,
        colorHex: '#0554F4',
        branchId: '',
      });
      setStatusBanner(res?.message || 'Shift template saved.');
      await loadRoster();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create shift template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setFormError(null);
    try {
      setIsSubmitting(true);

      if (confirmAction === 'DELETE' && editingShift) {
        await fetchApi(`/api/v1/staff/schedules/shifts/${editingShift.id}`, {
          method: 'DELETE',
        });
        setIsShiftModalOpen(false);
        setStatusBanner('Shift allocation removed.');
      } else if (confirmAction === 'PUBLISH') {
        const res = await fetchApi('/api/v1/staff/schedules/publish-week', {
          method: 'POST',
          body: JSON.stringify({
            weekStart: weekStartStr,
            branchId: selectedBranchId !== 'ALL' ? parseInt(selectedBranchId, 10) : undefined,
          }),
        });
        setStatusBanner(res?.message || 'Weekly schedule published.');
      } else if (confirmAction === 'COPY') {
        const prevMonday = new Date(currentMonday);
        prevMonday.setDate(currentMonday.getDate() - 7);
        const res = await fetchApi('/api/v1/staff/schedules/copy-week', {
          method: 'POST',
          body: JSON.stringify({
            fromWeekStart: formatLocalDate(prevMonday),
            toWeekStart: weekStartStr,
            branchId: selectedBranchId !== 'ALL' ? parseInt(selectedBranchId, 10) : undefined,
          }),
        });
        setStatusBanner(res?.message || 'Previous week roster copied.');
      }

      setConfirmAction(null);
      await loadRoster();
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Operation failed.');
      setConfirmAction(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const standardWorkWeekHours = rosterData?.laborPolicy.standardWorkWeekHours ?? 40;
  const overtimeMultiplier = rosterData?.laborPolicy.overtimeMultiplier ?? 1.5;
  const currency = rosterData?.laborPolicy.currency ?? 'KES';

  // Group shifts by employee and calculate regular/overtime hours + estimated labor cost
  const staffRosterMatrix = useMemo(() => {
    if (!rosterData) return [];

    return rosterData.staff.map((staff) => {
      const staffShifts = rosterData.shifts.filter((s) => s.userId === staff.id);

      const daysMap: Record<string, ShiftItem[]> = {};
      weekDays.forEach((w) => {
        daysMap[w.dateStr] = [];
      });

      let totalWeekHours = 0;
      let weightedHourlySum = 0;

      staffShifts.forEach((shift) => {
        if (daysMap[shift.shiftDate]) {
          daysMap[shift.shiftDate].push(shift);
          const hrs = calculateShiftDurationHours(
            shift.startTime,
            shift.endTime,
            shift.breakMinutes
          );
          const wage = parseFloat(shift.hourlyWage) || 0;
          totalWeekHours += hrs;
          weightedHourlySum += hrs * wage;
        }
      });

      const overtimeHours = Math.max(0, totalWeekHours - standardWorkWeekHours);
      const avgWage = totalWeekHours > 0 ? weightedHourlySum / totalWeekHours : 0;
      const estimatedCost =
        weightedHourlySum + overtimeHours * avgWage * Math.max(0, overtimeMultiplier - 1);

      return {
        staff,
        days: daysMap,
        totalWeekHours: Number(totalWeekHours.toFixed(1)),
        overtimeHours: Number(overtimeHours.toFixed(1)),
        estimatedCost: Number(estimatedCost.toFixed(0)),
        isOvertime: totalWeekHours > standardWorkWeekHours,
      };
    });
  }, [rosterData, weekDays, standardWorkWeekHours, overtimeMultiplier]);

  const telemetry = useMemo(() => {
    const shifts = rosterData?.shifts || [];
    const totalHours = staffRosterMatrix.reduce((sum, r) => sum + r.totalWeekHours, 0);
    const totalLaborCost = staffRosterMatrix.reduce((sum, r) => sum + r.estimatedCost, 0);
    const overtimeStaffCount = staffRosterMatrix.filter((r) => r.isOvertime).length;

    return {
      totalShifts: shifts.length,
      totalHours: Number(totalHours.toFixed(1)),
      totalLaborCost,
      overtimeStaffCount,
      draftShifts: shifts.filter((s) => s.status === 'DRAFT').length,
      publishedShifts: shifts.filter((s) => s.status === 'PUBLISHED' || s.status === 'CONFIRMED')
        .length,
    };
  }, [rosterData?.shifts, staffRosterMatrix]);

  const authorizedBranches = rosterData?.branches ?? [];

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
            <span className="text-xs font-bold text-servora-navy">Weekly Rota &amp; Scheduling</span>
            {!isOnline && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                <WifiOff size={10} /> Offline
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-servora-navy">
            Workforce Shift Schedule &amp; Rota Planner
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Plan multi-outlet coverage, track {standardWorkWeekHours}h overtime thresholds, and publish shift allocations.
          </p>
        </div>

        {canManageStaff && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setIsTemplateModalOpen(true);
              }}
              disabled={!isOnline}
              className="px-3 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={13} className="text-servora-core" /> New Pattern
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction('COPY')}
              disabled={!isOnline}
              className="px-3 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Copy size={13} /> Copy Prior Week
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction('PUBLISH')}
              disabled={telemetry.draftShifts === 0 || !isOnline}
              className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Send size={13} /> Publish ({telemetry.draftShifts})
            </button>
            <button
              type="button"
              onClick={() => openCreateModal()}
              disabled={!isOnline}
              className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus size={14} /> Add Shift
            </button>
          </div>
        )}
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

      {/* 2. ROTA TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Scheduled Hours
            </span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {telemetry.totalHours} hrs
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Est. Labor Budget
            </span>
            <p className="text-lg font-bold font-mono text-servora-navy mt-0.5 truncate">
              {currency} {telemetry.totalLaborCost.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Wallet size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Total Shifts
            </span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {telemetry.totalShifts}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <CalendarDays size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Published Live
            </span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {telemetry.publishedShifts}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between col-span-2 lg:col-span-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Drafts / OT Alerts
            </span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">
              {telemetry.draftShifts}{' '}
              <span className="text-xs text-rose-600">({telemetry.overtimeStaffCount} OT)</span>
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* 3. WEEK NAVIGATOR & FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevWeek}
            aria-label="Previous week"
            className="p-1.5 bg-slate-50 border border-gray-200 rounded-lg hover:bg-gray-100 text-servora-navy cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={handleCurrentWeek}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs font-bold text-servora-navy hover:bg-gray-100 cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleNextWeek}
            aria-label="Next week"
            className="p-1.5 bg-slate-50 border border-gray-200 rounded-lg hover:bg-gray-100 text-servora-navy cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
          <span className="text-xs font-bold text-servora-navy ml-2">
            Week of{' '}
            {currentMonday.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {authorizedBranches.length > 1 && (
            <select
              aria-label="Filter roster by branch"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
            >
              <option value="ALL">All Authorized Outlets ({authorizedBranches.length})</option>
              {authorizedBranches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}

          {rosterData?.roles && rosterData.roles.length > 0 && (
            <select
              aria-label="Filter roster by role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
            >
              <option value="ALL">All Functional Roles</option>
              {rosterData.roles.map((r) => (
                <option key={r.id} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={loadRoster}
            disabled={isLoading || !isOnline}
            title="Refresh Rota"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 4. WEEKLY ROTA CALENDAR MATRIX */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-gray-200 text-left">
                <th className="p-3 w-56 font-bold text-servora-navy border-r border-gray-200">
                  Staff Member &amp; Role
                </th>
                {weekDays.map((w) => (
                  <th
                    key={w.dateStr}
                    className={`p-3 min-w-[130px] font-bold border-r border-gray-200 ${
                      w.isToday ? 'bg-blue-50/50 text-servora-core' : 'text-servora-navy'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{w.dayName}</span>
                      <span className="text-[10px] font-mono opacity-60">{w.displayDate}</span>
                    </div>
                  </th>
                ))}
                <th className="p-3 w-28 font-bold text-servora-navy text-right">Weekly Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffRosterMatrix.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 italic">
                    {isLoading
                      ? 'Loading weekly shift roster...'
                      : 'No active staff members found for the selected outlet and role.'}
                  </td>
                </tr>
              ) : (
                staffRosterMatrix.map(
                  ({ staff, days, totalWeekHours, overtimeHours, estimatedCost, isOvertime }) => (
                    <tr key={staff.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-3 border-r border-gray-200 bg-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-servora-core/10 text-servora-core font-bold flex items-center justify-center shrink-0 text-xs">
                            {staff.firstName[0]}
                            {staff.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-servora-navy block truncate">
                              {staff.firstName} {staff.lastName}
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase font-semibold block truncate">
                              {staff.role.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {weekDays.map((w) => {
                        const dayShifts = days[w.dateStr] || [];
                        return (
                          <td
                            key={w.dateStr}
                            className={`p-2 border-r border-gray-100 align-top transition-colors group relative ${
                              w.isToday ? 'bg-blue-50/15' : ''
                            }`}
                          >
                            <div className="space-y-1.5 min-h-[64px]">
                              {dayShifts.map((shift) => {
                                const isDraft = shift.status === 'DRAFT';
                                const hours = calculateShiftDurationHours(
                                  shift.startTime,
                                  shift.endTime,
                                  shift.breakMinutes
                                );
                                return (
                                  <button
                                    key={shift.id}
                                    type="button"
                                    onClick={() => openEditModal(shift)}
                                    disabled={!canManageStaff}
                                    className={`w-full text-left p-1.5 rounded-lg border transition-all ${
                                      canManageStaff ? 'cursor-pointer' : 'cursor-default'
                                    } ${
                                      isDraft
                                        ? 'bg-amber-50/60 border-dashed border-amber-300 text-amber-900 hover:bg-amber-100/70'
                                        : 'bg-blue-50/70 border-solid border-blue-200 text-servora-navy hover:bg-blue-100/70'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between font-mono font-bold text-[10px]">
                                      <span>
                                        {shift.startTime}–{shift.endTime}
                                      </span>
                                      <span className="opacity-75">{hours}h</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[9px] mt-0.5">
                                      <span className="font-semibold truncate">
                                        {shift.branchCode}
                                      </span>
                                      <span className="uppercase text-[8.5px] font-bold opacity-70">
                                        {isDraft ? 'Draft' : 'Live'}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}

                              {canManageStaff && isOnline && (
                                <button
                                  type="button"
                                  onClick={() => openCreateModal(staff.id, w.dateStr)}
                                  className="opacity-0 group-hover:opacity-100 w-full py-1 text-[10px] font-bold text-gray-400 hover:text-servora-core border border-dashed border-gray-200 hover:border-servora-core rounded-lg transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                                >
                                  <Plus size={11} /> Add
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      <td className="p-3 text-right border-l border-gray-200 font-mono">
                        <span
                          className={`font-bold block ${
                            isOvertime ? 'text-rose-600' : 'text-servora-navy'
                          }`}
                        >
                          {totalWeekHours} hrs
                        </span>
                        {estimatedCost > 0 && (
                          <span className="text-[10px] text-gray-500 block">
                            {currency} {estimatedCost.toLocaleString()}
                          </span>
                        )}
                        {isOvertime && (
                          <span className="text-[9px] text-rose-500 font-sans font-bold flex items-center justify-end gap-0.5 mt-0.5">
                            <AlertTriangle size={9} /> +{overtimeHours}h OT
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: ALLOCATE / EDIT SHIFT */}
      {isShiftModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingShift ? 'Edit Shift Allocation' : 'Allocate New Shift'}
                </h3>
                <p className="text-[11px] text-gray-400">
                  Configure timing, outlet, role clearance, and hourly rate
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
              >
                {formError}
              </div>
            )}

            {rosterData?.templates && rosterData.templates.length > 0 && !editingShift && (
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Preset Shift Patterns
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {rosterData.templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="px-2.5 py-1 bg-slate-50 border border-gray-200 hover:border-servora-core rounded-lg text-[10.5px] font-medium text-servora-navy transition-colors cursor-pointer"
                    >
                      {tpl.name} ({tpl.startTime}–{tpl.endTime})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitShift} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Staff Member *
                </label>
                <select
                  required
                  value={formData.userId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    const chosen = rosterData?.staff.find((s) => String(s.id) === nextId);
                    setFormData((prev) => ({
                      ...prev,
                      userId: nextId,
                      role: chosen?.role || prev.role,
                    }));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  <option value="">Select Employee...</option>
                  {rosterData?.staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.role.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Operating Branch *
                  </label>
                  <select
                    required
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="">Select Location...</option>
                    {authorizedBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Shift Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.shiftDate}
                    onChange={(e) => setFormData({ ...formData, shiftDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Break (Mins)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={formData.breakMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, breakMinutes: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Shift Role *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    {rosterData?.roles.map((r) => (
                      <option key={r.id} value={r.slug}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Hourly Rate ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formData.hourlyWage}
                    onChange={(e) => setFormData({ ...formData, hourlyWage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Notes / Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lead morning inventory intake"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                {editingShift && (
                  <button
                    type="button"
                    onClick={() => setConfirmAction('DELETE')}
                    className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
                    title="Delete Shift"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: CREATE SHIFT PATTERN TEMPLATE */}
      {isTemplateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Create Shift Pattern</h3>
                <p className="text-[11px] text-gray-400">
                  Save a reusable shift timing preset for fast rostering
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTemplate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Pattern Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Opening, Evening Closing"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Start *
                  </label>
                  <input
                    type="time"
                    required
                    value={templateForm.startTime}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, startTime: e.target.value })
                    }
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    End *
                  </label>
                  <input
                    type="time"
                    required
                    value={templateForm.endTime}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, endTime: e.target.value })
                    }
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Break (m)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={templateForm.breakMinutes}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, breakMinutes: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Branch Scope (Optional)
                </label>
                <select
                  value={templateForm.branchId}
                  onChange={(e) => setTemplateForm({ ...templateForm, branchId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold cursor-pointer"
                >
                  <option value="">All Branches (Tenant-Wide)</option>
                  {authorizedBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Pattern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. CONFIRMATION MODAL (PUBLISH / COPY / DELETE) */}
      {confirmAction && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <h3 className="text-sm font-bold text-servora-navy">
              {confirmAction === 'PUBLISH'
                ? `Publish ${telemetry.draftShifts} Draft Shift(s)?`
                : confirmAction === 'COPY'
                  ? 'Copy Prior Week Roster?'
                  : 'Delete Shift Allocation?'}
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              {confirmAction === 'PUBLISH'
                ? 'All unpublished draft shifts in this view will become live and visible to assigned staff.'
                : confirmAction === 'COPY'
                  ? 'Active shifts from the previous week will be replicated as Drafts into this week. Existing conflicting shifts will be skipped automatically.'
                  : 'This shift allocation will be permanently removed from the weekly rota.'}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isSubmitting}
                className={`flex-1 py-2 text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer ${
                  confirmAction === 'DELETE'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmAction === 'PUBLISH'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-servora-core hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}