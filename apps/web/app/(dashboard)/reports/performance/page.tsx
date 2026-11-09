'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Award,
  TrendingUp,
  Clock,
  DollarSign,
  Download,
  RefreshCw,
  ChevronRight,
  Calendar,
  Search,
  Star,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Activity,
  Layers,
  ArrowUpDown,
  Building2,
  Sparkles,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface StaffPerformanceRecord {
  userId: number;
  name: string;
  email: string;
  role: string;
  branchName: string;
  grossSales: number;
  completedOrders: number;
  voidCount: number;
  avgTicket: number;
  totalHours: number;
  overtimeHours: number;
  shiftsLogged: number;
  attendanceScore: number;
  rating: number;
  salesTarget: number;
  salesPerHour: number;
  targetAttainmentPercent: number;
  performanceTier: 'TOP_TIER' | 'MEETING_TARGET' | 'UNDERPERFORMING';
}

interface PerformanceSummary {
  totalStaffCount: number;
  totalSalesGenerated: number;
  totalHoursLogged: number;
  laborRevenuePerHour: number;
  avgAttendanceScore: number;
  avgAppraisalRating: number;
  topRevenueProducer: string;
}

interface DepartmentBenchmark {
  role: string;
  headcount: number;
  totalSales: number;
  avgSalesPerEmployee: number;
  laborEfficiency: number;
  avgRating: number;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

const TIER_CONFIG = {
  TOP_TIER: { label: 'Top Performer', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: Star },
  MEETING_TARGET: { label: 'Meeting Target', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: UserCheck },
  UNDERPERFORMING: { label: 'Development Focus', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', icon: AlertTriangle },
};

export default function PerformanceReportsPage() {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [items, setItems] = useState<StaffPerformanceRecord[]>([]);
  const [departmentBenchmarks, setDepartmentBenchmarks] = useState<DepartmentBenchmark[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Filters & Sorters
  const [performanceTierFilter, setPerformanceTierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'SALES' | 'TICKETS' | 'HOURS_WORKED' | 'RATING' | 'VOIDS' | 'NAME'>('SALES');

  const [datePreset, setDatePreset] = useState<'THIS_MONTH' | 'LAST_30_DAYS'>('THIS_MONTH');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const params = new URLSearchParams();
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (performanceTierFilter !== 'ALL') params.set('performanceTier', performanceTierFilter);
      params.set('sortBy', sortBy);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const [reportRes, branchRes] = await Promise.all([
        fetchApi(`/api/v1/reports/performance?${params.toString()}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (reportRes?.data) {
        setSummary(reportRes.data.summary);
        setItems(reportRes.data.items || []);
        setDepartmentBenchmarks(reportRes.data.departmentBenchmarks || []);
      }

      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load performance report:', err);
      setErrorMessage(err.message || 'Failed to aggregate workforce analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, startDate, endDate, performanceTierFilter, sortBy, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    const directKeys = ['token', 'accessToken', 'access_token', 'auth_token', 'authToken', 'jwt', 'servora_token'];
    for (const key of directKeys) {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (val && val.trim() !== '') return val.trim();
    }
    const jsonKeys = ['user', 'auth', 'session', 'servora_user', 'servora_auth'];
    for (const key of jsonKeys) {
      try {
        const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const candidate = parsed.token || parsed.accessToken || parsed.access_token || parsed.data?.token;
          if (candidate && typeof candidate === 'string') return candidate.trim();
        }
      } catch {
        // scan next
      }
    }
    const cookieMatch = document.cookie.match(/(?:^|;\s*)(?:token|accessToken|access_token|auth_token)\s*=\s*([^;]+)/);
    if (cookieMatch) return decodeURIComponent(cookieMatch[1]);
    return null;
  };

  const handleExport = async (exportType: 'STAFF_LEAGUE_TABLE' | 'ROLE_BENCHMARKS') => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      params.set('exportType', exportType);
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (performanceTierFilter !== 'ALL') params.set('performanceTier', performanceTierFilter);

      const token = getAuthToken();
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${apiBaseUrl}/api/v1/reports/performance/export?${params.toString()}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workforce-performance-${exportType.toLowerCase()}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

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
            <Link
              href="/reports"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Reporting Hub <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Workforce & Talent Analytics</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Users className="text-servora-core" size={22} />
            Employee Performance & Labor Productivity
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Audit individual revenue productivity, labor efficiency per hour, time & attendance punctuality, and appraisal ratings.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => handleExport('STAFF_LEAGUE_TABLE')}
            disabled={isExporting}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Download size={13} />
            <span>{isExporting ? 'Exporting...' : 'Export League (CSV)'}</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh Performance Report"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. DATE PRESETS & BRANCH FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
            <Calendar size={13} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-[11px] font-mono font-bold text-servora-navy focus:outline-none"
            />
            <span className="text-gray-400 font-mono">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-[11px] font-mono font-bold text-servora-navy focus:outline-none"
            />
          </div>

          <select
            value={performanceTierFilter}
            onChange={(e) => setPerformanceTierFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Performance Tiers</option>
            <option value="TOP_TIER">Top Performers</option>
            <option value="MEETING_TARGET">Meeting Target</option>
            <option value="UNDERPERFORMING">Development Focus</option>
          </select>

          {branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Branch Outlets</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 3. WORKFORCE EXECUTIVE KPI RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Labor Sales Produced</span>
          <p className="text-xl font-bold font-mono text-servora-navy mt-1">
            KES {summary ? summary.totalSalesGenerated.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">{summary?.totalStaffCount || 0} Active Staff Members</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Total Hours Logged</span>
          <p className="text-xl font-bold font-mono text-servora-core mt-1">
            {summary ? summary.totalHoursLogged.toLocaleString() : '0'} Hrs
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Clocked Shift Work</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Labor Efficiency</span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
            KES {summary ? summary.laborRevenuePerHour.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}/hr
          </p>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Revenue per Labor Hour</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Attendance Score</span>
          <p className="text-xl font-bold font-mono text-indigo-700 mt-1">
            {summary ? `${summary.avgAttendanceScore}%` : '100%'}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block flex items-center gap-0.5">
            <ShieldCheck size={11} /> Shift Compliance
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Appraisal Rating</span>
          <p className="text-xl font-bold font-mono text-amber-600 mt-1 flex items-center gap-1">
            {summary ? `${summary.avgAppraisalRating}` : '4.0'}
            <Star size={16} className="fill-amber-500 text-amber-500" />
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Scale: 1.0 &ndash; 5.0</span>
        </div>
      </div>

      {/* 4. DEPARTMENT BENCHMARKS & LEADER TILE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Top Performer Spotlight (4 Cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="border-b border-gray-100 pb-2.5 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Top Sales Producer</h3>
              <p className="text-[10px] text-gray-400">Leading operator by closed revenue</p>
            </div>
            <Award size={18} className="text-servora-core" />
          </div>

          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-servora-core text-white flex items-center justify-center font-bold text-lg font-mono">
              {summary?.topRevenueProducer?.[0] || '★'}
            </div>
            <div>
              <h4 className="font-bold text-sm text-servora-navy">{summary?.topRevenueProducer || 'N/A'}</h4>
              <span className="text-[10px] text-servora-core font-bold uppercase font-mono">Primary Performer</span>
            </div>
          </div>

          <div className="text-xs text-gray-500 leading-relaxed pt-1">
            Recognized based on combined closed order velocity, low void frequency, and time-and-attendance reliability.
          </div>
        </div>

        {/* Role Group Productivity (8 Cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-2.5 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Role Group Productivity Benchmarks</h3>
              <p className="text-[10px] text-gray-400">Revenue generation & labor efficiency grouped by operational role</p>
            </div>
            <button
              onClick={() => handleExport('ROLE_BENCHMARKS')}
              className="text-[10px] font-bold text-servora-core hover:underline cursor-pointer"
            >
              Export Benchmarks
            </button>
          </div>

          <div className="space-y-3">
            {departmentBenchmarks.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">No role benchmark data available.</p>
            ) : (
              departmentBenchmarks.map((dept, idx) => {
                const maxSales = departmentBenchmarks[0]?.totalSales || 1;
                const ratio = Math.min(100, Math.max(10, Math.round((dept.totalSales / maxSales) * 100)));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-servora-navy">
                        <span>{dept.role}</span>
                        <span className="text-[10px] font-normal text-gray-400 font-mono">
                          ({dept.headcount} staff &bull; KES {dept.laborEfficiency.toLocaleString()}/hr)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-mono">
                          ★ {dept.avgRating}
                        </span>
                        <span className="font-mono font-bold text-servora-navy text-[11px]">
                          KES {dept.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-servora-core h-full rounded-full transition-all duration-500"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. MASTER STAFF LEAGUE TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-xs text-servora-navy uppercase tracking-wider">
              Staff Productivity & Attendance League Table ({items.length} Staff)
            </h3>
            <p className="text-[10px] text-gray-400">Auditable operational performance, efficiency indices, and compliance</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="SALES">Highest Sales Produced</option>
              <option value="TICKETS">Orders Fulfilled</option>
              <option value="HOURS_WORKED">Hours Worked</option>
              <option value="RATING">Appraisal Rating</option>
              <option value="VOIDS">Void Incidents</option>
              <option value="NAME">Sort by Name</option>
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core w-36 sm:w-48 font-medium"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Role & Branch</th>
                <th className="py-2.5 px-3 text-right">Sales Produced</th>
                <th className="py-2.5 px-3 text-right">Orders</th>
                <th className="py-2.5 px-3 text-right">Avg Ticket</th>
                <th className="py-2.5 px-3 text-right">Hours Clocked</th>
                <th className="py-2.5 px-3 text-right">Revenue/Hr</th>
                <th className="py-2.5 px-3 text-center">Attendance %</th>
                <th className="py-2.5 px-3 text-center">Rating</th>
                <th className="py-2.5 px-3 text-center">Talent Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400 italic">
                    {isLoading ? 'Aggregating employee performance metrics...' : 'No staff performance records found matching criteria.'}
                  </td>
                </tr>
              ) : (
                items.map((staff) => {
                  const tier = TIER_CONFIG[staff.performanceTier];
                  const TierIcon = tier.icon;
                  return (
                    <tr key={staff.userId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{staff.name}</span>
                        <span className="font-mono text-[10px] text-gray-400">{staff.email}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-gray-700 block">{staff.role}</span>
                        <span className="text-[10px] text-gray-400">{staff.branchName}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-core">
                        KES {staff.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-gray-700">
                        {staff.completedOrders.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-600">
                        KES {staff.avgTicket.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-700">
                        {staff.totalHours.toFixed(1)} hrs
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        KES {staff.salesPerHour.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span className={staff.attendanceScore < 85 ? 'text-rose-600' : 'text-gray-700'}>
                          {staff.attendanceScore}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-0.5 font-bold font-mono text-amber-600">
                          ★ {staff.rating.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${tier.bg} ${tier.text}`}>
                          <TierIcon size={10} />
                          {tier.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}