'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  TrendingUp,
  DollarSign,
  Users,
  Send,
  Plus,
  RefreshCw,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  Mail,
  MessageSquare,
  Sparkles,
  Calendar,
  Percent,
  Edit3,
  X,
  Radio,
  SlidersHorizontal,
  Bookmark,
  FileCode,
  Tag,
  LayoutDashboard,
  ArrowUpRight,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface CampaignItem {
  id: number;
  name: string;
  code: string;
  objective: string;
  channel: 'SMS' | 'EMAIL' | 'PUSH_NOTIFICATION' | 'OMNICHANNEL';
  targetSegment: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  budgetKes: number;
  attributedRevenueKes: number;
  promoCode: string | null;
  discountPercentage: number | null;
  messageContent: string;
  recipientsCount: number;
  deliveredCount: number;
  clickedCount: number;
  convertedCount: number;
  conversionRate: number;
  branchName: string;
  createdByName: string;
  createdAt: string;
}

interface CampaignTemplate {
  id: number;
  name: string;
  channel: 'SMS' | 'EMAIL' | 'PUSH_NOTIFICATION';
  objective: string;
  subjectLine: string | null;
  bodyTemplate: string;
  suggestedPromoPrefix: string | null;
  defaultDiscountPercentage: number | null;
}

interface CampaignMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudgetAllocated: number;
  totalAttributedRevenue: number;
  totalRecipientsEngaged: number;
  totalConversions: number;
  roasMultiplier: number;
}

const STATUS_CONFIG: Record<
  CampaignItem['status'],
  { label: string; bg: string; text: string; border: string }
> = {
  ACTIVE: { label: 'Broadcasting', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  SCHEDULED: { label: 'Scheduled', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  DRAFT: { label: 'Draft Mode', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  COMPLETED: { label: 'Completed', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  PAUSED: { label: 'Suspended', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

const CHANNEL_ICONS = {
  SMS: MessageSquare,
  EMAIL: Mail,
  PUSH_NOTIFICATION: Radio,
  OMNICHANNEL: Megaphone,
};

const AVAILABLE_MERGE_TAGS = [
  { tag: '{{customer.firstName}}', label: 'First Name' },
  { tag: '{{customer.loyaltyPoints}}', label: 'Point Balance' },
  { tag: '{{branch.name}}', label: 'Branch Name' },
  { tag: '{{promo.code}}', label: 'Promo Code' },
  { tag: '{{promo.discountPercent}}', label: 'Discount %' },
];

export default function MarketingCampaignsPage() {
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignItem | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    objective: 'REVENUE_GROWTH' as any,
    channel: 'SMS' as any,
    targetSegment: 'ALL_CUSTOMERS' as any,
    budgetKes: 0,
    promoCode: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discountValue: 10,
    maxUsageCount: 100,
    messageContent: '',
    status: 'ACTIVE' as any,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messageTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (channelFilter !== 'ALL') params.set('channel', channelFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const [campaignsRes, metricsRes, templatesRes] = await Promise.all([
        fetchApi(`/api/v1/marketing/campaigns?${params.toString()}`),
        fetchApi('/api/v1/marketing/campaigns/metrics'),
        fetchApi('/api/v1/marketing/campaigns/templates').catch(() => ({ data: [] })),
      ]);

      if (campaignsRes?.data) setCampaigns(campaignsRes.data);
      if (metricsRes?.data) setMetrics(metricsRes.data);
      if (templatesRes?.data) setTemplates(templatesRes.data);
    } catch (err: any) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, channelFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectTemplate = (templateIdStr: string) => {
    setSelectedTemplateId(templateIdStr);
    const tmpl = templates.find((t) => String(t.id) === templateIdStr);
    if (!tmpl) return;

    const discount = tmpl.defaultDiscountPercentage || 10;
    const prefix = tmpl.suggestedPromoPrefix || 'PROMO';
    const generatedCode = `${prefix}${discount}-${Math.floor(100 + Math.random() * 900)}`;

    const populatedBody = tmpl.bodyTemplate
      .replace(/\{\{customer\.firstName\}\}/g, 'Valued Guest')
      .replace(/\{\{customer\.loyaltyPoints\}\}/g, '250')
      .replace(/\{\{branch\.name\}\}/g, 'Our Main Restaurant')
      .replace(/\{\{promo\.code\}\}/g, generatedCode)
      .replace(/\{\{promo\.discountPercent\}\}/g, String(discount));

    setCampaignForm((prev) => ({
      ...prev,
      name: `${tmpl.name} - ${new Date().toLocaleDateString()}`,
      objective: tmpl.objective,
      channel: tmpl.channel,
      promoCode: generatedCode,
      discountValue: discount,
      messageContent: populatedBody,
    }));
  };

  const handleInsertMergeTag = (tag: string) => {
    const textarea = messageTextareaRef.current;
    if (!textarea) {
      setCampaignForm((prev) => ({ ...prev, messageContent: prev.messageContent + tag }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = campaignForm.messageContent;
    const updated = current.substring(0, start) + tag + current.substring(end);

    setCampaignForm((prev) => ({ ...prev, messageContent: updated }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleOpenCreate = () => {
    setEditingCampaign(null);
    setSelectedTemplateId('');
    setCampaignForm({
      name: '',
      objective: 'REVENUE_GROWTH',
      channel: 'SMS',
      targetSegment: 'ALL_CUSTOMERS',
      budgetKes: 0,
      promoCode: '',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      maxUsageCount: 100,
      messageContent: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.name.trim() || !campaignForm.messageContent.trim()) {
      alert('Campaign name and message content are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const url = editingCampaign
        ? `/api/v1/marketing/campaigns/${editingCampaign.id}`
        : '/api/v1/marketing/campaigns';
      const method = editingCampaign ? 'PATCH' : 'POST';

      const res = await fetchApi(url, {
        method,
        body: JSON.stringify({
          ...campaignForm,
          budgetKes: Number(campaignForm.budgetKes) || 0,
          discountValue: Number(campaignForm.discountValue) || 0,
          maxUsageCount: Number(campaignForm.maxUsageCount) || 100,
        }),
      });

      setIsModalOpen(false);
      setToastMessage({ text: res.message || 'Campaign deployed successfully.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async (campaign: CampaignItem) => {
    if (!confirm(`Broadcast campaign "${campaign.name}" to audience?`)) return;
    try {
      const res = await fetchApi(`/api/v1/marketing/campaigns/${campaign.id}/dispatch`, {
        method: 'POST',
      });
      setToastMessage({ text: res.message || 'Broadcast triggered.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Dispatch failed');
    }
  };

  const charCount = campaignForm.messageContent.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER WITH DIRECT LINKS */}
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
              href="/marketing"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Marketing Hub <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Campaigns & Outreach</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Megaphone className="text-servora-core" size={22} />
            Omnichannel Marketing Campaigns & Outreach
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Automated SMS & email broadcasting, dynamic merge-tag templates, audience segmentation, and Return on Ad Spend (ROAS) analytics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <Link
            href="/marketing"
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <LayoutDashboard size={14} className="text-servora-core" />
            Marketing Hub
          </Link>

          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> Launch Campaign
          </button>

          <button
            onClick={loadData}
            title="Refresh Registry"
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

      {/* 2. MARKETING EXECUTIVE METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Attributed Revenue</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              KES {metrics ? metrics.totalAttributedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Attributed Sales Volume</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Spend / Budget</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              KES {metrics ? metrics.totalBudgetAllocated.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Campaign Ad Spend</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Megaphone size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Return on Ad Spend (ROAS)</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {metrics ? `${metrics.roasMultiplier}x` : '0x'}
            </p>
            <span className="text-[10px] text-purple-600 font-medium">Revenue Multiplier</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Conversions</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              {metrics ? metrics.totalConversions.toLocaleString() : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Redemptions Claimed</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Sparkles size={18} />
          </div>
        </div>
      </div>

      {/* 3. SEARCH & CONTROLS TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Delivery Channels</option>
            <option value="SMS">SMS Cellular Broadcast</option>
            <option value="EMAIL">Email Marketing</option>
            <option value="PUSH_NOTIFICATION">Mobile Push</option>
            <option value="OMNICHANNEL">Omnichannel</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Lifecycle States</option>
            <option value="ACTIVE">Active Broadcasts</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="DRAFT">Drafts</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Search campaigns or promo codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-servora-core w-44 sm:w-64"
          />
        </div>
      </div>

      {/* 4. CAMPAIGN DIRECTORY LEDGER */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Campaign Profile</th>
                <th className="py-2.5 px-3">Channel & Segment</th>
                <th className="py-2.5 px-3">Offer / Promo</th>
                <th className="py-2.5 px-3 text-right">Budget</th>
                <th className="py-2.5 px-3 text-right">Attributed Revenue</th>
                <th className="py-2.5 px-3 text-center">Conversion Funnel</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 italic">
                    {isLoading ? 'Loading active campaigns...' : 'No campaigns launched. Click "Launch Campaign" to create one.'}
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => {
                  const ChannelIcon = CHANNEL_ICONS[camp.channel] || Megaphone;
                  const statusBadge = STATUS_CONFIG[camp.status] || STATUS_CONFIG.DRAFT;

                  return (
                    <tr key={camp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{camp.name}</span>
                        <span className="text-[10px] font-mono text-gray-400">Ref: {camp.code}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 font-bold text-servora-navy">
                          <ChannelIcon size={12} className="text-servora-core" />
                          <span>{camp.channel}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 block font-mono">
                          {camp.targetSegment.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {camp.promoCode ? (
                          <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 block max-w-[140px] text-center">
                            {camp.promoCode} {camp.discountPercentage ? `(${camp.discountPercentage}% Off)` : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono text-[11px]">Direct Message</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-700">
                        KES {camp.budgetKes.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        KES {camp.attributedRevenueKes.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-servora-navy block">
                          {camp.convertedCount} of {camp.deliveredCount}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-medium">
                          {camp.conversionRate}% CVR
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[9.5px] font-mono uppercase font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDispatch(camp)}
                            className="px-2.5 py-1 bg-servora-core text-white font-bold text-[11px] rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Trigger Real-time Dispatch"
                          >
                            <Send size={11} /> Broadcast
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: LAUNCH NEW CAMPAIGN WITH TEMPLATES */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Configure Marketing Campaign</h3>
                <p className="text-[11px] text-gray-400">Load approved templates or create customized dynamic copy</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-3.5 text-xs">
              {/* Template Quick Loader */}
              {templates.length > 0 && (
                <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-1.5">
                  <label className="block text-[11px] font-bold text-servora-navy flex items-center gap-1">
                    <Bookmark size={12} className="text-servora-core" />
                    Load Pre-Approved Marketing Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-bold text-servora-navy focus:outline-none cursor-pointer"
                  >
                    <option value="">Choose a Template (Optional)...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        [{t.channel}] {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Member Dinner Experience"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Outreach Channel *</label>
                  <select
                    value={campaignForm.channel}
                    onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="SMS">SMS Text Message</option>
                    <option value="EMAIL">Email Marketing</option>
                    <option value="PUSH_NOTIFICATION">Mobile Push</option>
                    <option value="OMNICHANNEL">Omnichannel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Target Audience *</label>
                  <select
                    value={campaignForm.targetSegment}
                    onChange={(e) => setCampaignForm({ ...campaignForm, targetSegment: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL_CUSTOMERS">All Enrolled Customers</option>
                    <option value="VIP_MEMBERS">VIP Tier Members</option>
                    <option value="LAPSED_CUSTOMERS">Lapsed (No visit in 30 days)</option>
                    <option value="HIGH_SPENDERS">Top 20% High Spenders</option>
                    <option value="CORPORATE">Corporate Accounts</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Financial Promotion Rules */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <span className="text-[11px] font-bold text-servora-navy block flex items-center gap-1">
                  <Tag size={12} className="text-servora-core" />
                  Point-of-Sale Promotion Rule
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Promo Code</label>
                    <input
                      type="text"
                      placeholder="e.g. VIP-409"
                      value={campaignForm.promoCode}
                      onChange={(e) => setCampaignForm({ ...campaignForm, promoCode: e.target.value.toUpperCase() })}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold focus:outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Discount % / KES</label>
                    <input
                      type="number"
                      min="0"
                      value={campaignForm.discountValue}
                      onChange={(e) => setCampaignForm({ ...campaignForm, discountValue: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Budget (KES)</label>
                    <input
                      type="number"
                      min="0"
                      value={campaignForm.budgetKes}
                      onChange={(e) => setCampaignForm({ ...campaignForm, budgetKes: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Message Payload and Tag Injector */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-servora-navy">Message Content Payload *</label>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {charCount} chars &bull; {smsSegments} SMS Segment{smsSegments > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-1.5">
                  <span className="text-[10px] text-gray-400 self-center mr-1">Insert Merge Tag:</span>
                  {AVAILABLE_MERGE_TAGS.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => handleInsertMergeTag(t.tag)}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-servora-navy rounded border border-gray-200 text-[10px] font-mono cursor-pointer transition-colors"
                    >
                      {t.tag}
                    </button>
                  ))}
                </div>

                <textarea
                  ref={messageTextareaRef}
                  rows={3}
                  required
                  placeholder="Enter message text with merge tags (e.g., {{customer.firstName}}, {{promo.code}})..."
                  value={campaignForm.messageContent}
                  onChange={(e) => setCampaignForm({ ...campaignForm, messageContent: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Deploy Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}