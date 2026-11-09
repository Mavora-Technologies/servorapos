'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Star,
  Trophy,
  TrendingUp,
  UserCheck,
  Users,
  ShieldCheck,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Target,
  FileText,
  AlertCircle,
  Eye,
  X,
  Flame,
  Award,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface PerformanceReview {
  id: number;
  userId: number;
  employeeName: string;
  employeeRole: string;
  employeeEmail: string;
  reviewerId: number;
  reviewerName: string;
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
  branchName: string;
  totalSales: number;
  completedOrders: number;
  averageTicketValue: number;
  attendanceScore: number;
}

export default function StaffPerformancePage() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [telemetryList, setTelemetryList] = useState<LiveStaffTelemetry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'LEADERBOARD' | 'REVIEWS'>('LEADERBOARD');
  const [searchQuery, setSearchQuery] = useState('');
  const [cycleFilter, setCycleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingReview, setViewingReview] = useState<PerformanceReview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    userId: '',
    reviewCycle: 'MONTHLY' as 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'ANNUAL',
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    overallRating: 4.5,
    salesTarget: 100000,
    totalSalesGenerated: 95000,
    averageTicketValue: 2450,
    speedOfServiceMinutes: 12,
    attendanceScorePercent: 98,
    voidRefundCount: 1,
    tipPoolAllocated: 4500,
    competencies: [
      { category: 'Guest Service & Hospitaliy', rating: 5, comments: 'Consistent positive dining feedback' },
      { category: 'Punctuality & Shift Attendance', rating: 4, comments: 'On time for all morning rosters' },
      { category: 'Menu Upselling & Check Size', rating: 4, comments: 'Strong pairing suggestions for beverages' },
      { category: 'Teamwork & Kitchen Coordination', rating: 5, comments: 'Exceptional communication during peak hours' },
    ],
    goals: [
      { id: '1', title: 'Complete eTIMS fiscal invoice certification', targetDate: '2026-12-01', completed: false },
      { id: '2', title: 'Achieve 3,000 KES average check on dinner tables', targetDate: '2026-11-30', completed: true },
    ],
    managerFeedback: '',
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [reviewsRes, telemetryRes] = await Promise.all([
        fetchApi('/api/v1/staff/performance'),
        fetchApi('/api/v1/staff/performance/telemetry'),
      ]);

      if (reviewsRes?.data) setReviews(reviewsRes.data);
      if (telemetryRes?.data) setTelemetryList(telemetryRes.data);
    } catch (err: any) {
      console.error('Failed to load performance metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metrics = useMemo(() => {
    const totalAppraisals = reviews.length;
    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + parseFloat(r.overallRating), 0) / reviews.length).toFixed(1)
        : '4.2';

    const totalSalesVol = telemetryList.reduce((acc, t) => acc + t.totalSales, 0);
    const avgAttendance =
      telemetryList.length > 0
        ? Math.round(telemetryList.reduce((acc, t) => acc + t.attendanceScore, 0) / telemetryList.length)
        : 95;

    return {
      totalAppraisals,
      avgRating,
      totalSalesVol,
      avgAttendance,
    };
  }, [reviews, telemetryList]);

  const filteredTelemetry = useMemo(() => {
    return telemetryList
      .filter((t) => {
        const q = searchQuery.toLowerCase().trim();
        return !q || t.employeeName.toLowerCase().includes(q) || t.role.toLowerCase().includes(q) || t.branchName.toLowerCase().includes(q);
      })
      .sort((a, b) => b.totalSales - a.totalSales);
  }, [telemetryList, searchQuery]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesCycle = cycleFilter === 'ALL' || r.reviewCycle === cycleFilter;
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        r.employeeName.toLowerCase().includes(q) ||
        r.reviewerName.toLowerCase().includes(q) ||
        r.employeeRole.toLowerCase().includes(q);

      return matchesCycle && matchesStatus && matchesQuery;
    });
  }, [reviews, cycleFilter, statusFilter, searchQuery]);

  const openCreateModal = (user?: LiveStaffTelemetry) => {
    setModalError(null);
    setFormData({
      userId: user ? String(user.userId) : telemetryList[0] ? String(telemetryList[0].userId) : '',
      reviewCycle: 'MONTHLY',
      periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0],
      overallRating: 4.5,
      salesTarget: 100000,
      totalSalesGenerated: user ? user.totalSales : 95000,
      averageTicketValue: user ? user.averageTicketValue : 2450,
      speedOfServiceMinutes: 12,
      attendanceScorePercent: user ? user.attendanceScore : 98,
      voidRefundCount: 1,
      tipPoolAllocated: 4500,
      competencies: [
        { category: 'Guest Service & Hospitality', rating: 5, comments: 'Consistent positive feedback from diners' },
        { category: 'Punctuality & Shift Attendance', rating: 4, comments: 'On time across scheduled shifts' },
        { category: 'Menu Upselling & Check Velocity', rating: 4, comments: 'Proactively offers beverage & side add-ons' },
        { category: 'Teamwork & KDS Expediter SLA', rating: 5, comments: 'Smooth collaboration with culinary leads' },
      ],
      goals: [
        { id: '1', title: 'Complete eTIMS fiscal invoice certification', targetDate: '2026-12-01', completed: false },
        { id: '2', title: 'Maintain average check value above 2,500 KES', targetDate: '2026-11-30', completed: true },
      ],
      managerFeedback: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleRatingChange = (catIdx: number, rating: number) => {
    setFormData((prev) => {
      const updated = [...prev.competencies];
      updated[catIdx].rating = rating;
      const avg = Number((updated.reduce((acc, c) => acc + c.rating, 0) / updated.length).toFixed(2));
      return { ...prev, competencies: updated, overallRating: avg };
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      setIsSubmitting(true);
      await fetchApi('/api/v1/staff/performance', {
        method: 'POST',
        body: JSON.stringify({
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
          managerFeedback: formData.managerFeedback,
          status: 'SUBMITTED',
        }),
      });
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to submit appraisal');
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
            <span className="text-xs font-bold text-servora-navy">Talent & Workforce Performance</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Workforce Performance & KPI Evaluation Tower</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Monitor real-time sales throughput, average check sizes, speed-of-service SLA, and conduct structured periodic appraisals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => openCreateModal()}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> New Appraisal
          </button>
          <button
            onClick={loadData}
            title="Refresh Performance Telemetry"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 2. TALENT TELEMETRY TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Team Score Rating</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5 flex items-center gap-1">
              <Star size={17} className="text-amber-500 fill-amber-400" />
              {metrics.avgRating} <span className="text-xs text-gray-400 font-sans font-normal">/ 5.0</span>
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Award size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Associate Sales Total</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              KES {metrics.totalSalesVol.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Attendance Index</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {metrics.avgAttendance}% Reliable
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Formal Appraisals</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">{metrics.totalAppraisals}</p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <FileText size={18} />
          </div>
        </div>
      </div>

      {/* 3. FUNCTIONAL TABS & SEARCH */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('LEADERBOARD')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'LEADERBOARD'
                  ? 'bg-servora-navy text-white shadow-xs'
                  : 'bg-slate-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Trophy size={13} className="text-amber-400" />
              Live Sales & Efficiency Leaderboard
            </button>
            <button
              onClick={() => setActiveTab('REVIEWS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'REVIEWS'
                  ? 'bg-servora-navy text-white shadow-xs'
                  : 'bg-slate-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText size={13} />
              Formal Appraisal Records ({reviews.length})
            </button>
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search associate or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
            />
          </div>
        </div>

        {/* 4. LEADERBOARD VIEW */}
        {activeTab === 'LEADERBOARD' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Rank & Associate</th>
                  <th className="py-2.5 px-3">Operational Role</th>
                  <th className="py-2.5 px-3">Base Branch</th>
                  <th className="py-2.5 px-3">Gross Sales Generated</th>
                  <th className="py-2.5 px-3">Checks Fulfilled</th>
                  <th className="py-2.5 px-3">Avg Check Value</th>
                  <th className="py-2.5 px-3">Attendance Reliability</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTelemetry.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400 italic">
                      No operational sales telemetry recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredTelemetry.map((item, idx) => (
                    <tr key={item.userId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
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
                          <span className="font-bold text-servora-navy block">{item.employeeName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-slate-100 text-servora-navy border border-gray-200">
                          {item.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-gray-700 font-medium">{item.branchName}</td>

                      <td className="py-3 px-3 font-mono font-bold text-servora-core text-xs">
                        KES {item.totalSales.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 font-mono font-semibold text-servora-navy">
                        {item.completedOrders} orders
                      </td>

                      <td className="py-3 px-3 font-mono text-gray-600">
                        KES {item.averageTicketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${
                                item.attendanceScore >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${item.attendanceScore}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-gray-600 font-bold">{item.attendanceScore}%</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => openCreateModal(item)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-servora-core border border-gray-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Target size={12} /> Evaluate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* 5. FORMAL APPRAISAL RECORDS VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Associate</th>
                  <th className="py-2.5 px-3">Cycle & Period</th>
                  <th className="py-2.5 px-3">Overall Rating</th>
                  <th className="py-2.5 px-3">Sales Target Attainment</th>
                  <th className="py-2.5 px-3">Reviewer (Manager)</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                      No formal review records match the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredReviews.map((rev) => (
                    <tr key={rev.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{rev.employeeName}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">
                          {rev.employeeRole.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.2 bg-blue-50 text-servora-core border border-blue-200 rounded text-[9.5px] font-bold uppercase">
                          {rev.reviewCycle}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                          {new Date(rev.periodStart).toLocaleDateString()} - {new Date(rev.periodEnd).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <span className="inline-flex items-center gap-1 font-bold text-servora-navy bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Star size={11} className="text-amber-500 fill-amber-400" />
                          {rev.overallRating}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        <div>
                          <span className="font-bold text-servora-navy block">
                            KES {parseFloat(rev.totalSalesGenerated).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            Target: KES {parseFloat(rev.salesTarget).toLocaleString()}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-gray-700 font-medium">
                        {rev.reviewerName}
                      </td>

                      <td className="py-3 px-3">
                        {rev.status === 'ACKNOWLEDGED' || rev.status === 'FINALIZED' ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                            <ShieldCheck size={11} /> Acknowledged
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold text-[10px]">
                            Pending Sign-off
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setViewingReview(rev)}
                          className="px-2.5 py-1 bg-slate-50 text-servora-navy hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={12} /> View File
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. MODAL: COMPOSE PERFORMANCE APPRAISAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Conduct Staff Performance Appraisal</h3>
                <p className="text-[11px] text-gray-400">Evaluate competencies, align sales targets, and assign SMART development goals</p>
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

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Employee *</label>
                  <select
                    required
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Cycle *</label>
                  <select
                    value={formData.reviewCycle}
                    onChange={(e) => setFormData({ ...formData, reviewCycle: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="MONTHLY">Monthly Review</option>
                    <option value="QUARTERLY">Quarterly Appraisal</option>
                    <option value="BIANNUAL">Biannual Review</option>
                    <option value="ANNUAL">Annual Performance Review</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Overall Rating (1 - 5)</label>
                  <div className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-sm text-servora-navy flex items-center justify-between">
                    <span>{formData.overallRating} / 5.0</span>
                    <Star size={15} className="text-amber-500 fill-amber-400" />
                  </div>
                </div>
              </div>

              {/* Operational Targets vs Achieved */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2.5">
                <span className="font-bold text-servora-navy flex items-center gap-1.5 text-xs">
                  <Target size={14} className="text-servora-core" /> Sales Target & Service Metrics
                </span>
                <div className="grid grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Target Sales (KES)</label>
                    <input
                      type="number"
                      value={formData.salesTarget}
                      onChange={(e) => setFormData({ ...formData, salesTarget: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Achieved Sales (KES)</label>
                    <input
                      type="number"
                      value={formData.totalSalesGenerated}
                      onChange={(e) => setFormData({ ...formData, totalSalesGenerated: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Avg Check (KES)</label>
                    <input
                      type="number"
                      value={formData.averageTicketValue}
                      onChange={(e) => setFormData({ ...formData, averageTicketValue: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Tip Allocation (KES)</label>
                    <input
                      type="number"
                      value={formData.tipPoolAllocated}
                      onChange={(e) => setFormData({ ...formData, tipPoolAllocated: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Competencies 5-Star Scoring */}
              <div className="space-y-2">
                <span className="font-bold text-servora-navy block text-xs">Competency Scoring Matrix</span>
                <div className="space-y-2">
                  {formData.competencies.map((comp, idx) => (
                    <div key={comp.category} className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl flex items-center justify-between">
                      <span className="font-medium text-servora-navy text-xs">{comp.category}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRatingChange(idx, star)}
                            className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star
                              size={15}
                              className={star <= comp.rating ? 'text-amber-500 fill-amber-400' : 'text-gray-300'}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Manager Appraisal Feedback & Coaching Notes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summarize strengths, customer feedback, operational reliability, and coaching recommendations"
                  value={formData.managerFeedback}
                  onChange={(e) => setFormData({ ...formData, managerFeedback: e.target.value })}
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
                  {isSubmitting ? 'Submitting...' : 'Authorize & Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: DETAILED APPRAISAL FILE VIEWER */}
      {viewingReview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-servora-core bg-blue-50 px-2 py-0.5 rounded-md">
                  {viewingReview.reviewCycle} Appraisal File
                </span>
                <h3 className="text-base font-bold text-servora-navy mt-1">
                  {viewingReview.employeeName} ({viewingReview.employeeRole})
                </h3>
              </div>
              <button onClick={() => setViewingReview(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Score & Attainment Header */}
            <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50 border border-gray-200 rounded-xl text-center text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Score</span>
                <span className="font-mono font-bold text-base text-servora-navy flex items-center justify-center gap-1 mt-0.5">
                  <Star size={14} className="text-amber-500 fill-amber-400" />
                  {viewingReview.overallRating}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Sales Volume</span>
                <span className="font-mono font-bold text-xs text-servora-core block mt-1">
                  KES {parseFloat(viewingReview.totalSalesGenerated).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Attendance</span>
                <span className="font-mono font-bold text-xs text-emerald-700 block mt-1">
                  {viewingReview.attendanceScorePercent}%
                </span>
              </div>
            </div>

            {/* Competency Ratings */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-servora-navy block text-[11px]">Competency Assessment Breakdown:</span>
              {viewingReview.competencies.map((comp) => (
                <div key={comp.category} className="p-2 bg-slate-50 border border-gray-200 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-gray-700">{comp.category}</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={12}
                        className={star <= comp.rating ? 'text-amber-500 fill-amber-400' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Goals */}
            {viewingReview.goals.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-servora-navy block text-[11px]">Development Goals:</span>
                {viewingReview.goals.map((g) => (
                  <div key={g.id} className="p-2 bg-slate-50 border border-gray-200 rounded-lg flex items-center justify-between">
                    <span className="font-medium text-gray-700">{g.title}</span>
                    <span className="font-mono text-[10px] text-gray-400">{g.targetDate}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Feedback */}
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-servora-navy block text-[11px] mb-0.5">Manager Feedback ({viewingReview.reviewerName}):</span>
                <p className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-700 leading-relaxed">
                  {viewingReview.managerFeedback}
                </p>
              </div>
              {viewingReview.employeeFeedback && (
                <div>
                  <span className="font-bold text-emerald-800 block text-[11px] mb-0.5">Associate Acknowledgment Remarks:</span>
                  <p className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 leading-relaxed">
                    {viewingReview.employeeFeedback}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingReview(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer text-xs"
              >
                Close File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}