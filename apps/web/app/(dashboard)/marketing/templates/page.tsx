'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  FileCode,
  Megaphone,
  Plus,
  RefreshCw,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  Mail,
  MessageSquare,
  Radio,
  Sparkles,
  Tag,
  Edit3,
  Trash2,
  X,
  Copy,
  Eye,
  SlidersHorizontal,
  BookmarkCheck,
  Send,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface TemplateItem {
  id: number;
  name: string;
  channel: 'SMS' | 'EMAIL' | 'PUSH_NOTIFICATION' | 'WHATSAPP';
  objective: string;
  subjectLine: string | null;
  bodyTemplate: string;
  suggestedPromoPrefix: string | null;
  defaultDiscountPercentage: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CHANNEL_BADGES = {
  SMS: { icon: MessageSquare, label: 'SMS Cellular', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  EMAIL: { icon: Mail, label: 'HTML Email', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  PUSH_NOTIFICATION: { icon: Radio, label: 'Mobile Push', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  WHATSAPP: { icon: MessageSquare, label: 'WhatsApp API', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const MERGE_TAG_ITEMS = [
  { tag: '{{customer.firstName}}', sample: 'Sarah', desc: 'Patron First Name' },
  { tag: '{{customer.loyaltyPoints}}', sample: '450', desc: 'Active Points Balance' },
  { tag: '{{branch.name}}', sample: 'Kilimani Bistro Hub', desc: 'Current Location' },
  { tag: '{{promo.code}}', sample: 'VIP15-882', desc: 'Dynamic Promo Code' },
  { tag: '{{promo.discountPercent}}', sample: '15', desc: 'Discount Percentage' },
];

export default function MarketingTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [objectiveFilter, setObjectiveFilter] = useState<string>('ALL');

  // Preview Drawer State
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    channel: 'SMS' as TemplateItem['channel'],
    objective: 'REVENUE_GROWTH',
    subjectLine: '',
    bodyTemplate: '',
    suggestedPromoPrefix: 'PERK',
    defaultDiscountPercentage: 10,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bodyInputRef = useRef<HTMLTextAreaElement | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (channelFilter !== 'ALL') params.set('channel', channelFilter);
      if (objectiveFilter !== 'ALL') params.set('objective', objectiveFilter);

      const res = await fetchApi(`/api/v1/marketing/templates?${params.toString()}`);
      if (res?.data) {
        setTemplates(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load marketing templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, channelFilter, objectiveFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      channel: 'SMS',
      objective: 'REVENUE_GROWTH',
      subjectLine: '',
      bodyTemplate: '',
      suggestedPromoPrefix: 'PERK',
      defaultDiscountPercentage: 10,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: TemplateItem) => {
    setEditingTemplate(item);
    setTemplateForm({
      name: item.name,
      channel: item.channel,
      objective: item.objective,
      subjectLine: item.subjectLine || '',
      bodyTemplate: item.bodyTemplate,
      suggestedPromoPrefix: item.suggestedPromoPrefix || 'PERK',
      defaultDiscountPercentage: item.defaultDiscountPercentage || 10,
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  };

  const handleInsertTag = (tag: string) => {
    const textarea = bodyInputRef.current;
    if (!textarea) {
      setTemplateForm((prev) => ({ ...prev, bodyTemplate: prev.bodyTemplate + tag }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = templateForm.bodyTemplate;
    const updated = current.substring(0, start) + tag + current.substring(end);

    setTemplateForm((prev) => ({ ...prev, bodyTemplate: updated }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name.trim() || !templateForm.bodyTemplate.trim()) {
      alert('Template title and body are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const url = editingTemplate
        ? `/api/v1/marketing/templates/${editingTemplate.id}`
        : '/api/v1/marketing/templates';
      const method = editingTemplate ? 'PATCH' : 'POST';

      const res = await fetchApi(url, {
        method,
        body: JSON.stringify(templateForm),
      });

      setIsModalOpen(false);
      setToastMessage({ text: res.message || 'Template saved successfully.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (item: TemplateItem) => {
    if (!confirm(`Permanently remove template "${item.name}" from registry?`)) return;
    try {
      const res = await fetchApi(`/api/v1/marketing/templates/${item.id}`, { method: 'DELETE' });
      setToastMessage({ text: res.message || 'Template removed.', type: 'success' });
      if (previewTemplate?.id === item.id) setPreviewTemplate(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete template');
    }
  };

  const renderSimulatedPreview = (text: string) => {
    return text
      .replace(/\{\{customer\.firstName\}\}/g, 'Sarah')
      .replace(/\{\{customer\.loyaltyPoints\}\}/g, '450')
      .replace(/\{\{branch\.name\}\}/g, 'Kilimani Bistro Hub')
      .replace(/\{\{promo\.code\}\}/g, 'VIP15-882')
      .replace(/\{\{promo\.discountPercent\}\}/g, '15');
  };

  const charCount = templateForm.bodyTemplate.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

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
              href="/marketing"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Marketing Hub <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Template Studio</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <FileCode className="text-servora-core" size={22} />
            Marketing Message Templates & Merge Copy
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Governed communication templates, dynamic personalization tags, character count enforcement, and promotional rule definitions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <Link
            href="/marketing/campaigns"
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Megaphone size={14} className="text-servora-core" />
            Campaign Registry
          </Link>
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> Create Template
          </button>
          <button
            onClick={loadData}
            title="Refresh Studio"
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

      {/* 2. REPOSITORY METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Published Templates</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">{templates.length}</p>
            <span className="text-[10px] text-gray-500 font-medium">Reusable Copy Assets</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <BookmarkCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">SMS Cellular</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {templates.filter((t) => t.channel === 'SMS').length}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">GSM Telecom Copy</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <MessageSquare size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">HTML Email</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {templates.filter((t) => t.channel === 'EMAIL').length}
            </p>
            <span className="text-[10px] text-purple-600 font-medium">Email Letterhead Copy</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Mail size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Status</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              {templates.filter((t) => t.isActive).length}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Verified for Launch</span>
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
            <option value="SMS">SMS Cellular Copy</option>
            <option value="EMAIL">HTML Email Copy</option>
            <option value="PUSH_NOTIFICATION">Mobile Push</option>
            <option value="WHATSAPP">WhatsApp API</option>
          </select>

          <select
            value={objectiveFilter}
            onChange={(e) => setObjectiveFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Objectives</option>
            <option value="REVENUE_GROWTH">Revenue Growth</option>
            <option value="CUSTOMER_RETENTION">Customer Retention</option>
            <option value="LOYALTY_ACCRUAL">Loyalty Accrual</option>
            <option value="BRAND_AWARENESS">Brand Awareness</option>
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Search templates or copy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-servora-core w-44 sm:w-64"
          />
        </div>
      </div>

      {/* 4. TEMPLATE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-400 italic bg-white rounded-2xl border border-gray-200">
            {isLoading ? 'Loading template library...' : 'No templates found. Click "Create Template" to publish copy.'}
          </div>
        ) : (
          templates.map((tmpl) => {
            const channelBadge = CHANNEL_BADGES[tmpl.channel] || CHANNEL_BADGES.SMS;
            const ChannelIcon = channelBadge.icon;

            return (
              <div
                key={tmpl.id}
                className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="space-y-2.5">
                  <div className="flex justify-between items-start">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${channelBadge.bg}`}>
                      <ChannelIcon size={11} /> {channelBadge.label}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">
                      {tmpl.objective.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-servora-navy">{tmpl.name}</h3>
                    {tmpl.subjectLine && (
                      <p className="text-[11px] font-medium text-servora-core mt-0.5 truncate">
                        Subject: {tmpl.subjectLine}
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 border border-gray-100 rounded-xl text-xs font-mono text-gray-600 line-clamp-3 leading-relaxed">
                    {tmpl.bodyTemplate}
                  </div>

                  {tmpl.suggestedPromoPrefix && (
                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                      <span>Promo Rule:</span>
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {tmpl.suggestedPromoPrefix} ({tmpl.defaultDiscountPercentage}% Off)
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewTemplate(tmpl)}
                      className="p-1.5 text-gray-400 hover:text-servora-core transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                      title="Preview Simulated Copy"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(tmpl)}
                      className="p-1.5 text-gray-400 hover:text-servora-core transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                      title="Edit Template"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(tmpl)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                      title="Delete Template"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <Link
                    href={`/marketing/campaigns`}
                    className="px-3 py-1 bg-servora-core text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1"
                  >
                    <Send size={11} /> Use in Campaign
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. MODAL: CREATE / EDIT TEMPLATE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingTemplate ? `Edit Template: ${editingTemplate.name}` : 'Publish Marketing Template'}
                </h3>
                <p className="text-[11px] text-gray-400">Establish reusable copy with dynamic merge tags</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Template Asset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Member Milestone Promotion"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Target Channel *</label>
                  <select
                    value={templateForm.channel}
                    onChange={(e) => setTemplateForm({ ...templateForm, channel: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="SMS">SMS Cellular Text</option>
                    <option value="EMAIL">HTML Email Message</option>
                    <option value="PUSH_NOTIFICATION">Mobile Push</option>
                    <option value="WHATSAPP">WhatsApp API</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Marketing Objective *</label>
                  <select
                    value={templateForm.objective}
                    onChange={(e) => setTemplateForm({ ...templateForm, objective: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="REVENUE_GROWTH">Revenue Growth</option>
                    <option value="CUSTOMER_RETENTION">Customer Retention</option>
                    <option value="LOYALTY_ACCRUAL">Loyalty Accrual</option>
                    <option value="BRAND_AWARENESS">Brand Awareness</option>
                  </select>
                </div>
              </div>

              {templateForm.channel === 'EMAIL' && (
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Default Subject Line</label>
                  <input
                    type="text"
                    placeholder="Exclusive Tasting Menu Invitation"
                    value={templateForm.subjectLine}
                    onChange={(e) => setTemplateForm({ ...templateForm, subjectLine: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Suggested Promo Prefix</label>
                  <input
                    type="text"
                    placeholder="VIPTIER"
                    value={templateForm.suggestedPromoPrefix}
                    onChange={(e) => setTemplateForm({ ...templateForm, suggestedPromoPrefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Default Discount Value (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={templateForm.defaultDiscountPercentage}
                    onChange={(e) => setTemplateForm({ ...templateForm, defaultDiscountPercentage: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Merge Tag Pills Toolbar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-servora-navy">Body Copy & Merge Tags *</label>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {charCount} chars &bull; {smsSegments} SMS Segment{smsSegments > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-1.5">
                  <span className="text-[10px] text-gray-400 self-center mr-1">Insert Merge Tag:</span>
                  {MERGE_TAG_ITEMS.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => handleInsertTag(t.tag)}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-servora-navy rounded border border-gray-200 text-[10px] font-mono cursor-pointer transition-colors"
                      title={t.desc}
                    >
                      {t.tag}
                    </button>
                  ))}
                </div>

                <textarea
                  ref={bodyInputRef}
                  rows={4}
                  required
                  placeholder="Enter message body with merge tags..."
                  value={templateForm.bodyTemplate}
                  onChange={(e) => setTemplateForm({ ...templateForm, bodyTemplate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none text-xs font-mono"
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
                  {isSubmitting ? 'Saving...' : editingTemplate ? 'Update Template' : 'Publish Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: LIVE PREVIEW SIMULATOR */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Simulated Customer Experience</h3>
                <p className="text-[11px] text-gray-400">Live interpolation preview of personalized variables</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold uppercase text-gray-400">Raw Parameter Template:</span>
                <p className="font-mono text-[11px] text-gray-600">{previewTemplate.bodyTemplate}</p>
              </div>

              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-servora-core flex items-center gap-1">
                  <Sparkles size={11} /> Resolved Output (Sarah Mwangi)
                </span>
                <p className="font-medium text-servora-navy text-[12px] leading-relaxed whitespace-pre-wrap">
                  {renderSimulatedPreview(previewTemplate.bodyTemplate)}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="w-full py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}