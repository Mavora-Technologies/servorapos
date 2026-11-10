'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Star,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  UserCheck,
  Building2,
  Receipt,
  X,
  SlidersHorizontal,
  Flame,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface FeedbackItem {
  id: number;
  title: string;
  comments: string;
  rating: number;
  npsScore: number | null;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  feedbackCategory: string;
  channel: string;
  status: 'NEW' | 'UNDER_REVIEW' | 'ACTION_TAKEN' | 'RESOLVED' | 'CLOSED_DISMISSED';
  actionTaken: string | null;
  resolvedAt: string | null;
  createdAt: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  branchName: string;
  orderNumber: string | null;
  staffName: string;
}

interface FeedbackMetrics {
  totalSubmissions: number;
  avgRating: number;
  csatRate: number;
  npsIndex: number;
  pendingActions: number;
  resolvedCount: number;
  categoryBreakdown: { category: string; count: number; avgRating: number }[];
}

interface CustomerOption {
  id: number;
  name: string;
  phone: string;
}

const STATUS_BADGES: Record<FeedbackItem['status'], { label: string; bg: string; text: string; border: string }> = {
  NEW: { label: 'New Unread', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  UNDER_REVIEW: { label: 'Under Review', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  ACTION_TAKEN: { label: 'Action Taken', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  RESOLVED: { label: 'Resolved Closed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CLOSED_DISMISSED: { label: 'Dismissed', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
};

export default function CustomerFeedbackPage() {
  const [metrics, setMetrics] = useState<FeedbackMetrics | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Log Feedback Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logForm, setLogForm] = useState({
    customerId: '',
    rating: 5,
    feedbackCategory: 'FOOD_QUALITY',
    channel: 'TABLE_QR',
    title: '',
    comments: '',
  });

  // Triage / Resolution Drawer State
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [newStatus, setNewStatus] = useState<FeedbackItem['status']>('RESOLVED');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);

      const [feedbacksRes, metricsRes, custRes] = await Promise.all([
        fetchApi(`/api/v1/customers/feedback?${params.toString()}`),
        fetchApi('/api/v1/customers/feedback/metrics'),
        fetchApi('/api/v1/customers?limit=100').catch(() => ({ data: [] })),
      ]);

      if (feedbacksRes?.data) setFeedbacks(feedbacksRes.data);
      if (metricsRes?.data) setMetrics(metricsRes.data);
      if (custRes?.data && Array.isArray(custRes.data)) setCustomers(custRes.data);
    } catch (err: any) {
      console.error('Failed to load customer feedback suite:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logForm.customerId) {
      alert('Please select a customer.');
      return;
    }
    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const res = await fetchApi('/api/v1/customers/feedback', {
        method: 'POST',
        body: JSON.stringify({
          customerId: parseInt(logForm.customerId, 10),
          rating: Number(logForm.rating),
          feedbackCategory: logForm.feedbackCategory,
          channel: logForm.channel,
          title: logForm.title.trim(),
          comments: logForm.comments.trim(),
        }),
      });

      setIsLogModalOpen(false);
      setToastMessage({ text: res.message || 'Feedback logged.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const res = await fetchApi(`/api/v1/customers/feedback/${selectedFeedback.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          actionTaken: actionNotes.trim() || undefined,
        }),
      });

      setSelectedFeedback(null);
      setToastMessage({ text: res.message || 'Incident status updated.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update feedback status');
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
              href="/dashboard"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Enterprise Control <ChevronRight size={12} />
            </Link>
            <Link
              href="/customers"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              CRM Hub <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Voice of Customer & CSAT</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <MessageSquare className="text-servora-core" size={22} />
            Customer Voice, CSAT & Service Excellence
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Closed-loop feedback management, root-cause category sentiment, NPS index monitoring, and staff service attribution.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => {
              setLogForm({
                customerId: customers[0] ? String(customers[0].id) : '',
                rating: 5,
                feedbackCategory: 'FOOD_QUALITY',
                channel: 'TABLE_QR',
                title: '',
                comments: '',
              });
              setIsLogModalOpen(true);
            }}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> Log Experience Review
          </button>
          <button
            onClick={loadData}
            title="Refresh Feed"
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
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. CSAT / NPS METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">CSAT Score</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {metrics ? `${metrics.csatRate}%` : '100%'}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Positive Satisfaction Rate</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <ThumbsUp size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Net Promoter Index</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              +{metrics ? metrics.npsIndex : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">NPS Scale (-100 to +100)</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Sparkles size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Average Rating</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5 flex items-center gap-1">
              {metrics ? `${metrics.avgRating}` : '5.0'}
              <Star size={16} className="fill-amber-500 text-amber-500" />
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Across all channels</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Star size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Open Escalations</span>
            <p className="text-xl font-bold font-mono text-rose-600 mt-0.5">
              {metrics ? metrics.pendingActions : 0}
            </p>
            <span className="text-[10px] text-rose-600 font-medium">Requires Closed-Loop Action</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <AlertCircle size={18} />
          </div>
        </div>
      </div>

      {/* 3. CATEGORY BENCHMARKS */}
      {metrics && metrics.categoryBreakdown.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <span className="font-bold text-xs text-servora-navy uppercase tracking-wider block">
            Root-Cause Satisfaction by Operational Dimension
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {metrics.categoryBreakdown.map((cat, idx) => (
              <div key={idx} className="p-2.5 bg-slate-50 border border-gray-100 rounded-xl text-xs space-y-1">
                <span className="font-bold text-gray-700 block truncate text-[11px]">
                  {cat.category.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-[10px] font-mono">{cat.count} reviews</span>
                  <span className="font-bold font-mono text-servora-navy flex items-center gap-0.5">
                    ★ {cat.avgRating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. FILTERS & SEARCH TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All SLA Statuses</option>
            <option value="NEW">New (Unreviewed)</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="ACTION_TAKEN">Action Taken</option>
            <option value="RESOLVED">Resolved Closed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Operational Categories</option>
            <option value="FOOD_QUALITY">Food Quality & Taste</option>
            <option value="SERVICE_SPEED">Service Velocity</option>
            <option value="CLEANLINESS">Hygiene & Cleanliness</option>
            <option value="ORDER_ACCURACY">Order Accuracy</option>
            <option value="STAFF_COURTESY">Staff Hospitality</option>
            <option value="VALUE_PRICE">Value & Pricing</option>
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Search patron comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-servora-core w-44 sm:w-64"
          />
        </div>
      </div>

      {/* 5. FEEDBACK AUDIT LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Rating</th>
                <th className="py-2.5 px-3">Customer Review</th>
                <th className="py-2.5 px-3">Category & Channel</th>
                <th className="py-2.5 px-3">Attributed Staff</th>
                <th className="py-2.5 px-3">SLA Status</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3 text-right">Triage Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400 italic">
                    {isLoading ? 'Aggregating voice of customer feed...' : 'No feedback entries found matching your criteria.'}
                  </td>
                </tr>
              ) : (
                feedbacks.map((item) => {
                  const badge = STATUS_BADGES[item.status] || STATUS_BADGES.NEW;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              className={
                                star <= item.rating
                                  ? 'fill-amber-500 text-amber-500'
                                  : 'text-gray-200'
                              }
                            />
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{item.title}</span>
                        <p className="text-[11px] text-gray-600 line-clamp-1">{item.comments}</p>
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
                          Patron: {item.customerName} ({item.customerPhone})
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block text-[11px]">
                          {item.feedbackCategory.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{item.channel}</span>
                      </td>
                      <td className="py-3 px-3 text-gray-700">
                        {item.staffName}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedFeedback(item);
                            setNewStatus(item.status);
                            setActionNotes(item.actionTaken || '');
                          }}
                          className="px-2.5 py-1 bg-slate-50 border border-gray-200 hover:bg-gray-100 text-servora-navy font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                        >
                          Review & Triage
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL: LOG NEW FEEDBACK */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Log Customer Experience Review</h3>
                <p className="text-[11px] text-gray-400">Record direct patron survey responses</p>
              </div>
              <button onClick={() => setIsLogModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFeedback} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Customer Member *</label>
                <select
                  required
                  value={logForm.customerId}
                  onChange={(e) => setLogForm({ ...logForm, customerId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Rating (1 to 5 Stars) *</label>
                  <select
                    value={logForm.rating}
                    onChange={(e) => setLogForm({ ...logForm, rating: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="5">★★★★★ (5 Stars - Exceptional)</option>
                    <option value="4">★★★★☆ (4 Stars - Satisfied)</option>
                    <option value="3">★★★☆☆ (3 Stars - Neutral)</option>
                    <option value="2">★★☆☆☆ (2 Stars - Poor)</option>
                    <option value="1">★☆☆☆☆ (1 Star - Critical)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Feedback Category</label>
                  <select
                    value={logForm.feedbackCategory}
                    onChange={(e) => setLogForm({ ...logForm, feedbackCategory: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="FOOD_QUALITY">Food Quality & Taste</option>
                    <option value="SERVICE_SPEED">Service Velocity</option>
                    <option value="CLEANLINESS">Cleanliness & Hygiene</option>
                    <option value="ORDER_ACCURACY">Order Accuracy</option>
                    <option value="STAFF_COURTESY">Staff Hospitality</option>
                    <option value="VALUE_PRICE">Value & Pricing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Summary Headline *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Excellent service from waiter, steak cooked perfectly"
                  value={logForm.title}
                  onChange={(e) => setLogForm({ ...logForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Detailed Remarks *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter full transcript of customer feedback..."
                  value={logForm.comments}
                  onChange={(e) => setLogForm({ ...logForm, comments: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Save Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: TRIAGE & RESOLVE CLOSED-LOOP SLA */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Closed-Loop Incident Resolution</h3>
                <p className="text-[11px] text-gray-400">Record mitigation actions and close customer ticket</p>
              </div>
              <button onClick={() => setSelectedFeedback(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-gray-100 space-y-1 text-xs">
              <span className="font-bold text-servora-navy block">{selectedFeedback.title}</span>
              <p className="text-gray-600 text-[11px] leading-relaxed">&ldquo;{selectedFeedback.comments}&rdquo;</p>
              <div className="flex justify-between text-[10px] text-gray-400 font-mono pt-1">
                <span>{selectedFeedback.customerName}</span>
                <span>Rating: ★ {selectedFeedback.rating}</span>
              </div>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Lifecycle Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                >
                  <option value="NEW">New (Unreviewed)</option>
                  <option value="UNDER_REVIEW">Under Review / Investigating</option>
                  <option value="ACTION_TAKEN">Action Taken (Comp Offered / Staff Coached)</option>
                  <option value="RESOLVED">Resolved & Closed</option>
                  <option value="CLOSED_DISMISSED">Dismissed / Non-Actionable</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Mitigation Action / Resolution Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Spoke with patron, issued 150 loyalty points apology credit, kitchen station briefed."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Commit Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}