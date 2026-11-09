'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Clock,
  UserCheck,
  Users,
  CheckCircle2,
  AlertTriangle,
  Building2,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Check,
  X,
  KeyRound,
  ShieldCheck,
  ChevronRight,
  LogOut,
  SlidersHorizontal,
  FileCheck2,
  Flame,
  Calendar,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface AttendanceRecord {
  id: number;
  userId: number;
  employeeName: string;
  employeeRole: string;
  employeeEmail: string;
  branchId: number;
  branchName: string;
  branchCode: string;
  scheduleId: number | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  clockInAt: string;
  clockOutAt: string | null;
  clockInMethod: string;
  clockOutMethod: string | null;
  breakMinutes: number;
  totalDurationMinutes: number;
  regularHours: string;
  overtimeHours: string;
  status: 'ON_DUTY' | 'COMPLETED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  verificationStatus: string;
  notes: string | null;
  approvedAt: string | null;
}

interface LiveDutyEmployee {
  id: number;
  userId: number;
  employeeName: string;
  employeeRole: string;
  employeeEmail: string;
  branchId: number;
  branchName: string;
  branchCode: string;
  clockInAt: string;
  clockInMethod: string;
  deviceInfo: string;
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

export default function StaffAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [liveDuty, setLiveDuty] = useState<LiveDutyEmployee[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<'TIMESHEET' | 'LIVE_DUTY'>('TIMESHEET');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);

  // Modals
  const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
  const [clockOutTarget, setClockOutTarget] = useState<{ id: number; name: string } | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Clock In Form
  const [clockInForm, setClockInForm] = useState({
    userId: '',
    branchId: '',
    pin: '',
  });

  // Clock Out Form
  const [clockOutForm, setClockOutForm] = useState({
    breakMinutes: 30,
    pin: '',
    notes: '',
  });

  // Manual Adjustment Form
  const [adjustForm, setAdjustForm] = useState({
    userId: '',
    branchId: '',
    clockInAt: '',
    clockOutAt: '',
    breakMinutes: 30,
    notes: '',
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [attRes, liveRes, staffRes, branchRes] = await Promise.all([
        fetchApi('/api/v1/staff/attendance'),
        fetchApi('/api/v1/staff/attendance/live-duty'),
        fetchApi('/api/v1/staff').catch(() => ({ data: { staff: [] } })),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (attRes?.data) setRecords(attRes.data);
      if (liveRes?.data) setLiveDuty(liveRes.data);
      if (staffRes?.data?.staff) setStaffList(staffRes.data.staff);
      if (branchRes?.data && Array.isArray(branchRes.data)) setBranches(branchRes.data);
    } catch (err: any) {
      console.error('Failed to load attendance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const telemetry = useMemo(() => {
    const totalOnDuty = liveDuty.length;
    const completedToday = records.filter((r) => r.status === 'COMPLETED' || r.status === 'APPROVED').length;
    const totalHours = records.reduce((acc, r) => acc + (r.totalDurationMinutes || 0) / 60, 0);
    const overtimeHours = records.reduce((acc, r) => acc + parseFloat(r.overtimeHours || '0'), 0);
    const pendingApproval = records.filter((r) => r.status === 'COMPLETED').length;

    return {
      totalOnDuty,
      completedToday,
      totalHours: Number(totalHours.toFixed(1)),
      overtimeHours: Number(overtimeHours.toFixed(1)),
      pendingApproval,
    };
  }, [liveDuty, records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesBranch = branchFilter === 'ALL' || String(r.branchId) === branchFilter;
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeEmail.toLowerCase().includes(q) ||
        r.branchName.toLowerCase().includes(q);

      return matchesBranch && matchesStatus && matchesQuery;
    });
  }, [records, branchFilter, statusFilter, searchQuery]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRecords(filteredRecords.map((r) => r.id));
    } else {
      setSelectedRecords([]);
    }
  };

  const toggleSelectRecord = (id: number) => {
    setSelectedRecords((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      setIsSubmitting(true);
      await fetchApi('/api/v1/staff/attendance/clock-in', {
        method: 'POST',
        body: JSON.stringify({
          userId: parseInt(clockInForm.userId, 10),
          branchId: parseInt(clockInForm.branchId, 10),
          pin: clockInForm.pin ? clockInForm.pin.trim() : undefined,
          method: clockInForm.pin ? 'PIN' : 'PORTAL',
        }),
      });
      setIsClockInModalOpen(false);
      setClockInForm({ userId: '', branchId: '', pin: '' });
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Clock-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clockOutTarget) return;
    setModalError(null);
    try {
      setIsSubmitting(true);
      await fetchApi('/api/v1/staff/attendance/clock-out', {
        method: 'POST',
        body: JSON.stringify({
          attendanceId: clockOutTarget.id,
          breakMinutes: Number(clockOutForm.breakMinutes),
          pin: clockOutForm.pin ? clockOutForm.pin.trim() : undefined,
          method: clockOutForm.pin ? 'PIN' : 'PORTAL',
          notes: clockOutForm.notes || undefined,
        }),
      });
      setClockOutTarget(null);
      setClockOutForm({ breakMinutes: 30, pin: '', notes: '' });
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Clock-out failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      setIsSubmitting(true);
      await fetchApi('/api/v1/staff/attendance/adjust', {
        method: 'POST',
        body: JSON.stringify({
          userId: parseInt(adjustForm.userId, 10),
          branchId: parseInt(adjustForm.branchId, 10),
          clockInAt: new Date(adjustForm.clockInAt).toISOString(),
          clockOutAt: new Date(adjustForm.clockOutAt).toISOString(),
          breakMinutes: Number(adjustForm.breakMinutes),
          notes: adjustForm.notes,
        }),
      });
      setIsAdjustModalOpen(false);
      setAdjustForm({ userId: '', branchId: '', clockInAt: '', clockOutAt: '', breakMinutes: 30, notes: '' });
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Manual adjustment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedRecords.length === 0) return;
    if (!confirm(`Approve ${selectedRecords.length} timesheet records for payroll processing?`)) return;

    try {
      const res = await fetchApi('/api/v1/staff/attendance/approve', {
        method: 'POST',
        body: JSON.stringify({ recordIds: selectedRecords }),
      });
      alert(res?.message || 'Timesheets approved successfully');
      setSelectedRecords([]);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve records');
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
              Workforce Directory <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Time & Attendance</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Workforce Attendance & Time Card Ledger</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Audit live on-duty staff, verify shift punctuality, calculate overtime, and authorize timesheets for payroll.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => {
              setModalError(null);
              setIsAdjustModalOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal size={14} className="text-servora-core" />
            <span>Manual Time Card</span>
          </button>
          <button
            onClick={() => {
              setModalError(null);
              setIsClockInModalOpen(true);
            }}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Clock size={14} /> Terminal Clock-In
          </button>
          <button
            onClick={loadData}
            title="Refresh Attendance"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 2. TIME & LABOR TELEMETRY TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">On Duty Right Now</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {telemetry.totalOnDuty} Staff
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Hours Tracked</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">{telemetry.totalHours} hrs</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Overtime Accumulated</span>
            <p className="text-xl font-bold font-mono text-rose-600 mt-0.5 flex items-center gap-1">
              <Flame size={15} />
              {telemetry.overtimeHours} hrs
            </p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Completed Shifts</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">{telemetry.completedToday}</p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pending Review</span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">{telemetry.pendingApproval}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <FileCheck2 size={18} />
          </div>
        </div>
      </div>

      {/* 3. FUNCTIONAL TABS & FILTERS */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('TIMESHEET')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'TIMESHEET'
                  ? 'bg-servora-navy text-white shadow-xs'
                  : 'bg-slate-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Timesheet Ledger ({records.length})
            </button>
            <button
              onClick={() => setActiveTab('LIVE_DUTY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'LIVE_DUTY'
                  ? 'bg-servora-navy text-white shadow-xs'
                  : 'bg-slate-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Floor Duty ({liveDuty.length})
            </button>
          </div>

          {activeTab === 'TIMESHEET' && selectedRecords.length > 0 && (
            <button
              onClick={handleBatchApprove}
              className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={13} />
              Approve Selected ({selectedRecords.length})
            </button>
          )}
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Filter employee or branch..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ON_DUTY">On Duty</option>
            <option value="COMPLETED">Completed</option>
            <option value="APPROVED">Approved</option>
          </select>
        </div>

        {/* 4. MASTER DATA TABLES */}
        {activeTab === 'LIVE_DUTY' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Active Employee</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Stationed Branch</th>
                  <th className="py-2.5 px-3">Clock-In Timestamp</th>
                  <th className="py-2.5 px-3">Punch Method</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {liveDuty.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                      No personnel currently clocked in on duty.
                    </td>
                  </tr>
                ) : (
                  liveDuty.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-bold text-servora-navy flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{emp.employeeName}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-slate-100 text-servora-navy border border-gray-200">
                          {emp.employeeRole.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-700 font-medium">
                        {emp.branchName} ({emp.branchCode})
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-servora-navy">
                        {new Date(emp.clockInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-servora-core border border-blue-200 rounded-md text-[10px] font-bold uppercase">
                          {emp.clockInMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setModalError(null);
                            setClockOutTarget({ id: emp.id, name: emp.employeeName });
                          }}
                          className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <LogOut size={12} /> Clock Out
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3 w-8">
                    <input type="checkbox" onChange={handleSelectAll} className="rounded cursor-pointer" />
                  </th>
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Shift Date & Branch</th>
                  <th className="py-2.5 px-3">In / Out Timestamps</th>
                  <th className="py-2.5 px-3">Break</th>
                  <th className="py-2.5 px-3">Duration (Reg / OT)</th>
                  <th className="py-2.5 px-3">Punctuality Verification</th>
                  <th className="py-2.5 px-3">Audit State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400 italic">
                      No time-card records match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => {
                    const isSelected = selectedRecords.includes(rec.id);
                    return (
                      <tr key={rec.id} className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRecord(rec.id)}
                            className="rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div>
                            <span className="font-bold text-servora-navy block">{rec.employeeName}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-semibold">
                              {rec.employeeRole.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div>
                            <span className="font-medium text-servora-navy block">
                              {new Date(rec.clockInAt).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-gray-400 block">{rec.branchName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          <div>
                            <span className="text-emerald-700 font-bold">
                              In: {new Date(rec.clockInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-gray-500 block">
                              Out: {rec.clockOutAt ? new Date(rec.clockOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '— (Active)'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-600">
                          {rec.breakMinutes} mins
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <div>
                            <span className="font-bold text-servora-navy">
                              {Number((rec.totalDurationMinutes / 60).toFixed(1))} hrs
                            </span>
                            {parseFloat(rec.overtimeHours) > 0 && (
                              <span className="text-[10px] font-bold text-rose-600 block">
                                +{rec.overtimeHours}h OT
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {rec.verificationStatus === 'LATE_ARRIVAL' ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold inline-flex items-center gap-1">
                              <AlertTriangle size={10} /> Late Arrival
                            </span>
                          ) : rec.verificationStatus === 'MANUAL_ADJUSTMENT' ? (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[10px] font-bold">
                              Manual Audit
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 size={10} /> Verified
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {rec.status === 'APPROVED' ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold inline-flex items-center gap-1">
                              <ShieldCheck size={11} /> Approved
                            </span>
                          ) : rec.status === 'ON_DUTY' ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-servora-core border border-blue-200 rounded-md text-[10px] font-bold inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-servora-core animate-pulse" /> On Duty
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold">
                              Pending Review
                            </span>
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

      {/* 5. MODAL: TERMINAL FAST CLOCK-IN */}
      {isClockInModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Fast Terminal Clock-In</h3>
                <p className="text-[11px] text-gray-400">Record duty shift authentication</p>
              </div>
              <button onClick={() => setIsClockInModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleClockInSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Employee Profile *</label>
                <select
                  required
                  value={clockInForm.userId}
                  onChange={(e) => {
                    const uId = e.target.value;
                    const match = staffList.find((s) => String(s.id) === uId);
                    setClockInForm({
                      ...clockInForm,
                      userId: uId,
                      branchId: match?.defaultBranchId ? String(match.defaultBranchId) : clockInForm.branchId,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  <option value="">Select Employee...</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Operating Branch *</label>
                <select
                  required
                  value={clockInForm.branchId}
                  onChange={(e) => setClockInForm({ ...clockInForm, branchId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  <option value="">Select Location...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">POS PIN (Optional)</label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="••••"
                  value={clockInForm.pin}
                  onChange={(e) => setClockInForm({ ...clockInForm, pin: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center tracking-[0.3em] font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsClockInModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Verifying...' : 'Clock In Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: CLOCK-OUT & BREAK CONFIRMATION */}
      {clockOutTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Clock-Out Confirmation</h3>
                <p className="text-[11px] text-gray-400">Complete shift for {clockOutTarget.name}</p>
              </div>
              <button onClick={() => setClockOutTarget(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleClockOutSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Break Time Taken (Minutes)</label>
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={clockOutForm.breakMinutes}
                  onChange={(e) => setClockOutForm({ ...clockOutForm, breakMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Verify POS PIN (Optional)</label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="••••"
                  value={clockOutForm.pin}
                  onChange={(e) => setClockOutForm({ ...clockOutForm, pin: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center tracking-[0.3em] font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setClockOutTarget(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Clock Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: MANUAL TIME-CARD ADJUSTMENT (MANAGER AUDIT) */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Manual Time Card Regularization</h3>
                <p className="text-[11px] text-gray-400">Enterprise manager audit authorization</p>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Employee *</label>
                <select
                  required
                  value={adjustForm.userId}
                  onChange={(e) => {
                    const uId = e.target.value;
                    const match = staffList.find((s) => String(s.id) === uId);
                    setAdjustForm({
                      ...adjustForm,
                      userId: uId,
                      branchId: match?.defaultBranchId ? String(match.defaultBranchId) : adjustForm.branchId,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  <option value="">Select Employee...</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Operating Branch *</label>
                <select
                  required
                  value={adjustForm.branchId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, branchId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  <option value="">Select Location...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Clock In *</label>
                  <input
                    type="datetime-local"
                    required
                    value={adjustForm.clockInAt}
                    onChange={(e) => setAdjustForm({ ...adjustForm, clockInAt: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-[11px] focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Clock Out *</label>
                  <input
                    type="datetime-local"
                    required
                    value={adjustForm.clockOutAt}
                    onChange={(e) => setAdjustForm({ ...adjustForm, clockOutAt: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-[11px] focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Break Deducted (Mins)</label>
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={adjustForm.breakMinutes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, breakMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Mandatory Audit Note *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="State reason for manual time adjustment (e.g. biometric terminal offline during morning shift)"
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Authorize Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}