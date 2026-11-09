'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Building2,
  Users,
  AlertTriangle,
  X,
  Trash2,
  Edit2,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

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
}

interface ShiftTemplateOption {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  colorHex: string;
}

interface RosterEnvelope {
  shifts: ShiftItem[];
  staff: StaffOption[];
  branches: BranchOption[];
  templates: ShiftTemplateOption[];
}

function calculateShiftDurationHours(startTime: string, endTime: string, breakMinutes: number): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let startMins = startH * 60 + startM;
  let endMins = endH * 60 + endM;

  if (endMins < startMins) {
    endMins += 24 * 60; // Overnight shift
  }

  const netMins = Math.max(0, endMins - startMins - (breakMinutes || 0));
  return Number((netMins / 60).toFixed(1));
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function StaffSchedulesPage() {
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));
  const [rosterData, setRosterData] = useState<RosterEnvelope | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Modals
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
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
    role: 'WAITER',
    notes: '',
  });

  const weekStartStr = currentMonday.toISOString().split('T')[0];

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + i);
      return {
        dateStr: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isToday: d.toDateString() === new Date().toDateString(),
      };
    });
  }, [currentMonday]);

  const loadRoster = async () => {
    try {
      setIsLoading(true);
      const res = await fetchApi(
        `/api/v1/staff/schedules?weekStart=${weekStartStr}&branchId=${selectedBranchId}&role=${selectedRole}`
      );
      if (res?.data) {
        setRosterData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load roster:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, [weekStartStr, selectedBranchId, selectedRole]);

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

  const handleCurrentWeek = () => {
    setCurrentMonday(getMonday(new Date()));
  };

  const openCreateModal = (userId?: number, shiftDate?: string) => {
    setEditingShift(null);
    setFormError(null);

    const defaultStaff = rosterData?.staff.find((s) => s.id === userId) || rosterData?.staff[0];
    const defaultBranch =
      defaultStaff?.defaultBranchId && defaultStaff.defaultBranchId > 0
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
      role: defaultStaff?.role || 'WAITER',
      notes: '',
    });
    setIsShiftModalOpen(true);
  };

  const openEditModal = (shift: ShiftItem) => {
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
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      setIsSubmitting(true);
      if (editingShift) {
        await fetchApi(`/api/v1/staff/schedules/shifts/${editingShift.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            userId: parseInt(formData.userId, 10),
            branchId: parseInt(formData.branchId, 10),
            shiftDate: formData.shiftDate,
            startTime: formData.startTime,
            endTime: formData.endTime,
            breakMinutes: Number(formData.breakMinutes),
            role: formData.role,
            notes: formData.notes || null,
          }),
        });
      } else {
        await fetchApi('/api/v1/staff/schedules/shifts', {
          method: 'POST',
          body: JSON.stringify({
            userId: parseInt(formData.userId, 10),
            branchId: parseInt(formData.branchId, 10),
            shiftDate: formData.shiftDate,
            startTime: formData.startTime,
            endTime: formData.endTime,
            breakMinutes: Number(formData.breakMinutes),
            role: formData.role,
            notes: formData.notes || null,
          }),
        });
      }
      setIsShiftModalOpen(false);
      loadRoster();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save shift assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!editingShift) return;
    if (!confirm('Are you sure you want to delete this shift allocation?')) return;
    try {
      setIsSubmitting(true);
      await fetchApi(`/api/v1/staff/schedules/shifts/${editingShift.id}`, {
        method: 'DELETE',
      });
      setIsShiftModalOpen(false);
      loadRoster();
    } catch (err: any) {
      setFormError(err.message || 'Failed to delete shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishWeek = async () => {
    if (!confirm('Publish all draft shifts for this week? Assigned personnel will be notified.')) return;
    try {
      const res = await fetchApi('/api/v1/staff/schedules/publish-week', {
        method: 'POST',
        body: JSON.stringify({
          weekStart: weekStartStr,
          branchId: selectedBranchId !== 'ALL' ? parseInt(selectedBranchId, 10) : undefined,
        }),
      });
      alert(res?.message || 'Schedule published successfully');
      loadRoster();
    } catch (err: any) {
      alert(err.message || 'Failed to publish roster');
    }
  };

  const handleCopyPreviousWeek = async () => {
    const prevMonday = new Date(currentMonday);
    prevMonday.setDate(currentMonday.getDate() - 7);
    const prevStartStr = prevMonday.toISOString().split('T')[0];

    if (!confirm(`Duplicate roster allocations from previous week (${prevStartStr}) into this week?`)) return;

    try {
      const res = await fetchApi('/api/v1/staff/schedules/copy-week', {
        method: 'POST',
        body: JSON.stringify({
          fromWeekStart: prevStartStr,
          toWeekStart: weekStartStr,
          branchId: selectedBranchId !== 'ALL' ? parseInt(selectedBranchId, 10) : undefined,
        }),
      });
      alert(res?.message || 'Previous week roster replicated');
      loadRoster();
    } catch (err: any) {
      alert(err.message || 'Failed to copy previous week');
    }
  };

  // Group shifts by employee and calculate hours
  const staffRosterMatrix = useMemo(() => {
    if (!rosterData) return [];

    const activeStaff = rosterData.staff;
    const shifts = rosterData.shifts;

    return activeStaff.map((staff) => {
      const staffShifts = shifts.filter((s) => s.userId === staff.id);

      const daysMap: Record<string, ShiftItem[]> = {};
      weekDays.forEach((w) => {
        daysMap[w.dateStr] = [];
      });

      let totalWeekHours = 0;

      staffShifts.forEach((shift) => {
        if (daysMap[shift.shiftDate]) {
          daysMap[shift.shiftDate].push(shift);
          totalWeekHours += calculateShiftDurationHours(shift.startTime, shift.endTime, shift.breakMinutes);
        }
      });

      return {
        staff,
        days: daysMap,
        totalWeekHours: Number(totalWeekHours.toFixed(1)),
        isOvertime: totalWeekHours > 40,
      };
    });
  }, [rosterData, weekDays]);

  // Telemetry Summary
  const telemetry = useMemo(() => {
    const shifts = rosterData?.shifts || [];
    const totalScheduledHours = shifts.reduce((acc, s) => {
      return acc + calculateShiftDurationHours(s.startTime, s.endTime, s.breakMinutes);
    }, 0);

    const draftShifts = shifts.filter((s) => s.status === 'DRAFT').length;
    const publishedShifts = shifts.filter((s) => s.status === 'PUBLISHED').length;

    return {
      totalShifts: shifts.length,
      totalHours: Number(totalScheduledHours.toFixed(1)),
      draftShifts,
      publishedShifts,
    };
  }, [rosterData?.shifts]);

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
            <span className="text-xs font-bold text-servora-navy">Weekly Rota & Scheduling</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Workforce Shift Schedule & Rota Planner</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Plan operational coverage, monitor weekly overtime thresholds, and publish employee shift allocations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={handleCopyPreviousWeek}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Copy size={13} /> Copy Prior Week
          </button>
          <button
            onClick={handlePublishWeek}
            disabled={telemetry.draftShifts === 0}
            className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Send size={13} /> Publish Week ({telemetry.draftShifts} Drafts)
          </button>
          <button
            onClick={() => openCreateModal()}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Add Shift
          </button>
        </div>
      </div>

      {/* 2. ROTA TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Hours</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">{telemetry.totalHours} hrs</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Shifts</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">{telemetry.totalShifts}</p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <CalendarDays size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Published Shifts</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{telemetry.publishedShifts}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Unpublished Drafts</span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">{telemetry.draftShifts}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* 3. WEEK NAVIGATOR & FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        {/* Week Pager */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 bg-slate-50 border border-gray-200 rounded-lg hover:bg-gray-100 text-servora-navy cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleCurrentWeek}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs font-bold text-servora-navy hover:bg-gray-100 cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={handleNextWeek}
            className="p-1.5 bg-slate-50 border border-gray-200 rounded-lg hover:bg-gray-100 text-servora-navy cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
          <span className="text-xs font-bold text-servora-navy ml-2">
            Week of {currentMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Global Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {rosterData?.branches && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
            >
              <option value="ALL">All Branch Locations</option>
              {rosterData.branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={loadRoster}
            title="Refresh Rota"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
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
                  Staff Member & Role
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
                <th className="p-3 w-24 font-bold text-servora-navy text-right">Weekly Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffRosterMatrix.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 italic">
                    No active staff members available for scheduling.
                  </td>
                </tr>
              ) : (
                staffRosterMatrix.map(({ staff, days, totalWeekHours, isOvertime }) => (
                  <tr key={staff.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Employee Profile Column */}
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
                          <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                            {staff.role.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Day Cells */}
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
                              const hours = calculateShiftDurationHours(shift.startTime, shift.endTime, shift.breakMinutes);
                              return (
                                <button
                                  key={shift.id}
                                  onClick={() => openEditModal(shift)}
                                  className={`w-full text-left p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    isDraft
                                      ? 'bg-amber-50/60 border-dashed border-amber-300 text-amber-900 hover:bg-amber-100/70'
                                      : 'bg-blue-50/70 border-solid border-blue-200 text-servora-navy hover:bg-blue-100/70'
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-mono font-bold text-[10px]">
                                    <span>{shift.startTime} - {shift.endTime}</span>
                                    <span className="opacity-75">{hours}h</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] mt-0.5">
                                    <span className="font-semibold truncate">{shift.branchCode}</span>
                                    <span className="uppercase text-[8.5px] font-bold opacity-70">
                                      {isDraft ? 'Draft' : 'Live'}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}

                            {/* Quick Add Shift button inside cell */}
                            <button
                              onClick={() => openCreateModal(staff.id, w.dateStr)}
                              className="opacity-0 group-hover:opacity-100 w-full py-1 text-[10px] font-bold text-gray-400 hover:text-servora-core border border-dashed border-gray-200 hover:border-servora-core rounded-lg transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                            >
                              <Plus size={11} /> Add
                            </button>
                          </div>
                        </td>
                      );
                    })}

                    {/* Total Hours Column */}
                    <td className="p-3 text-right border-l border-gray-200 font-mono">
                      <span className={`font-bold block ${isOvertime ? 'text-rose-600' : 'text-servora-navy'}`}>
                        {totalWeekHours} hrs
                      </span>
                      {isOvertime && (
                        <span className="text-[9px] text-rose-500 font-sans font-bold flex items-center justify-end gap-0.5 mt-0.5">
                          <AlertTriangle size={9} /> Overtime
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: ALLOCATE / EDIT SHIFT */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingShift ? 'Edit Shift Allocation' : 'Allocate New Shift'}
                </h3>
                <p className="text-[11px] text-gray-400">Configure timing, operating branch, and role</p>
              </div>
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {formError}
              </div>
            )}

            {/* Quick Shift Templates */}
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
                      {tpl.name} ({tpl.startTime} - {tpl.endTime})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Staff Member *</label>
                <select
                  required
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  <option value="">Select Employee...</option>
                  {rosterData?.staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Operating Branch *</label>
                  <select
                    required
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="">Select Location...</option>
                    {rosterData?.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Shift Date *</label>
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Break (Mins)</label>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={formData.breakMinutes}
                    onChange={(e) => setFormData({ ...formData, breakMinutes: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Operational Role Clearance</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Notes / Instructions</label>
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
                    onClick={handleDeleteShift}
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
    </div>
  );
}