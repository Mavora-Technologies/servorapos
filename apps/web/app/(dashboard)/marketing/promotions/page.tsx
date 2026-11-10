'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Tag,
  Megaphone,
  TrendingUp,
  Percent,
  DollarSign,
  Plus,
  RefreshCw,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles,
  Edit3,
  X,
  SlidersHorizontal,
  Flame,
  ShieldCheck,
  Check,
  Play,
  FileCode,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface PromoItem {
  id: number;
  campaignId: number | null;
  campaignName: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderSubtotalKes: number;
  maxDiscountCapKes: number | null;
  maxUsageCount: number;
  currentUsageCount: number;
  startDate: string | null;
  expiresAt: string | null;
  isActive: boolean;
  computedStatus: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'INACTIVE';
  createdAt: string;
}

interface PromoMetrics {
  totalPromotions: number;
  activePromotions: number;
  totalRedemptions: number;
  totalCapAllowance: number;
  burnRatePercent: number;
}

const STATUS_CONFIG: Record<
  PromoItem['computedStatus'],
  { label: string; bg: string; text: string; border: string }
> = {
  ACTIVE: { label: 'Active at POS', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  EXPIRED: { label: 'Expired', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
  EXHAUSTED: { label: 'Quota Exhausted', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  INACTIVE: { label: 'Disabled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

export default function MarketingPromotionsPage() {
  const [metrics, setMetrics] = useState<PromoMetrics | null>(null);
  const [promotions, setPromotions] = useState<PromoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [discountTypeFilter, setDiscountTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoItem | null>(null);
  const [promoForm, setPromoForm] = useState({
    code: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discountValue: 15,
    minOrderSubtotalKes: 1000,
    maxDiscountCapKes: '' as string | number,
    maxUsageCount: 150,
    startDate: new Date().toISOString().split('T')[0],
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulator Drawer State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simCode, setSimCode] = useState('');
  const [simSubtotal, setSimSubtotal] = useState('2500');
  const [simResult, setSimResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (discountTypeFilter !== 'ALL') params.set('discountType', discountTypeFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const [promosRes, metricsRes] = await Promise.all([
        fetchApi(`/api/v1/marketing/promotions?${params.toString()}`),
        fetchApi('/api/v1/marketing/promotions/metrics'),
      ]);

      if (promosRes?.data) setPromotions(promosRes.data);
      if (metricsRes?.data) setMetrics(metricsRes.data);
    } catch (err: any) {
      console.error('Failed to load promotional discount rules:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, discountTypeFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingPromo(null);
    const generatedSuffix = Math.floor(100 + Math.random() * 900);
    setPromoForm({
      code: `PERK15-${generatedSuffix}`,
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minOrderSubtotalKes: 1000,
      maxDiscountCapKes: 500,
      maxUsageCount: 100,
      startDate: new Date().toISOString().split('T')[0],
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PromoItem) => {
    setEditingPromo(item);
    setPromoForm({
      code: item.code,
      discountType: item.discountType,
      discountValue: item.discountValue,
      minOrderSubtotalKes: item.minOrderSubtotalKes,
      maxDiscountCapKes: item.maxDiscountCapKes || '',
      maxUsageCount: item.maxUsageCount,
      startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
      expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().split('T')[0] : '',
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.code.trim()) {
      alert('Promo code is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const payload = {
        code: promoForm.code.trim().toUpperCase(),
        discountType: promoForm.discountType,
        discountValue: Number(promoForm.discountValue),
        minOrderSubtotalKes: Number(promoForm.minOrderSubtotalKes) || 0,
        maxDiscountCapKes: promoForm.maxDiscountCapKes ? Number(promoForm.maxDiscountCapKes) : null,
        maxUsageCount: Number(promoForm.maxUsageCount) || 100,
        startDate: promoForm.startDate || null,
        expiresAt: promoForm.expiresAt || null,
        isActive: promoForm.isActive,
      };

      const url = editingPromo
        ? `/api/v1/marketing/promotions/${editingPromo.id}`
        : '/api/v1/marketing/promotions';
      const method = editingPromo ? 'PATCH' : 'POST';

      const res = await fetchApi(url, {
        method,
        body: JSON.stringify(payload),
      });

      setIsModalOpen(false);
      setToastMessage({ text: res.message || 'Promotion rule registered.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save promotion rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simCode.trim()) return;

    try {
      setIsSimulating(true);
      setSimResult(null);

      const res = await fetchApi('/api/v1/marketing/promotions/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: simCode.trim().toUpperCase(),
          subtotalKes: parseFloat(simSubtotal) || 0,
        }),
      });

      setSimResult(res.data);
    } catch (err: any) {
      setSimResult({ valid: false, message: err.message || 'Verification rejected by policy' });
    } finally {
      setIsSimulating(false);
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
              href="/marketing"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Marketing Hub <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Promo Codes & Discounts</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Tag className="text-servora-core" size={22} />
            Promotional Discounts, Vouchers & POS Rules
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Manage point-of-sale promo codes, discount percentage ceilings, minimum spend guardrails, and quota redemption burns.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => {
              setSimCode(promotions[0]?.code || 'VIP15-882');
              setIsSimulatorOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Play size={13} className="text-servora-core" />
            POS Simulator
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> New Promo Rule
          </button>

          <button
            onClick={loadData}
            title="Refresh Ledger"
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

      {/* 2. PROMOTIONS EXECUTIVE METRIC RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Promo Rules</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {metrics ? metrics.activePromotions : 0}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Redeemable at Checkout</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Tag size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Redemptions</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {metrics ? metrics.totalRedemptions.toLocaleString() : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Claims Settled at POS</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Quota Burn Rate</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {metrics ? `${metrics.burnRatePercent}%` : '0%'}
            </p>
            <span className="text-[10px] text-purple-600 font-medium">Of Authorized Allowance</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Flame size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Cap Authorized</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              {metrics ? metrics.totalCapAllowance.toLocaleString() : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Max Usage Ceilings</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
        </div>
      </div>

      {/* 3. SEARCH & CONTROLS TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={discountTypeFilter}
            onChange={(e) => setDiscountTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Discount Formulas</option>
            <option value="PERCENTAGE">Percentage Deduction (%)</option>
            <option value="FIXED_AMOUNT">Fixed Currency Value (KES)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Redemption States</option>
            <option value="ACTIVE">Active Only</option>
            <option value="EXPIRED">Expired</option>
            <option value="EXHAUSTED">Quota Exhausted</option>
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Search code or linked campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-servora-core w-44 sm:w-64"
          />
        </div>
      </div>

      {/* 4. PROMOTIONAL DIRECTORY TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Voucher Code</th>
                <th className="py-2.5 px-3">Discount Value</th>
                <th className="py-2.5 px-3">Spend Guardrails</th>
                <th className="py-2.5 px-3 text-center">Redemption Burn</th>
                <th className="py-2.5 px-3">Associated Campaign</th>
                <th className="py-2.5 px-3">Expiration</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 italic">
                    {isLoading ? 'Loading promotional rules...' : 'No promo discount codes found. Click "New Promo Rule".'}
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => {
                  const cfg = STATUS_CONFIG[promo.computedStatus] || STATUS_CONFIG.ACTIVE;
                  const ratio = Math.min(100, Math.round((promo.currentUsageCount / promo.maxUsageCount) * 100));

                  return (
                    <tr key={promo.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 block max-w-[140px] text-center">
                          {promo.code}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">
                          {promo.discountType === 'PERCENTAGE'
                            ? `${promo.discountValue}% Off`
                            : `KES ${promo.discountValue.toLocaleString()} Off`}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {promo.discountType === 'PERCENTAGE' ? 'Proportional Rate' : 'Direct Cash Credit'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        <span className="text-[11px] block">
                          Min Subtotal: <strong className="font-mono">KES {promo.minOrderSubtotalKes.toLocaleString()}</strong>
                        </span>
                        {promo.maxDiscountCapKes && (
                          <span className="text-[10px] text-gray-400 font-mono block">
                            Cap: KES {promo.maxDiscountCapKes.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center min-w-[130px]">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-mono text-gray-500">
                            <span>{promo.currentUsageCount}</span>
                            <span>{promo.maxUsageCount} max</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-servora-core h-full rounded-full transition-all"
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        <span className="font-bold text-servora-navy truncate block max-w-[160px]">
                          {promo.campaignName}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                        {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : 'No Expiry'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono uppercase font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(promo)}
                            className="p-1.5 text-gray-400 hover:text-servora-core transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                            title="Edit Promo Rule"
                          >
                            <Edit3 size={13} />
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

      {/* 5. MODAL: CREATE / EDIT PROMOTION RULE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingPromo ? `Edit Voucher Rule: ${editingPromo.code}` : 'Register Promotional Rule'}
                </h3>
                <p className="text-[11px] text-gray-400">Configure point-of-sale deduction and spend thresholds</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Unique Promo Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DINING20"
                  value={promoForm.code}
                  onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none focus:border-servora-core uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Discount Type *</label>
                  <select
                    value={promoForm.discountType}
                    onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Currency (KES)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Discount Value *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={promoForm.discountValue}
                    onChange={(e) => setPromoForm({ ...promoForm, discountValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Min. Subtotal Spend (KES)</label>
                  <input
                    type="number"
                    min="0"
                    value={promoForm.minOrderSubtotalKes}
                    onChange={(e) => setPromoForm({ ...promoForm, minOrderSubtotalKes: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Max Cap Ceiling (KES)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional max cap"
                    value={promoForm.maxDiscountCapKes}
                    onChange={(e) => setPromoForm({ ...promoForm, maxDiscountCapKes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Maximum Usage Allowance (Cap) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={promoForm.maxUsageCount}
                  onChange={(e) => setPromoForm({ ...promoForm, maxUsageCount: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Start Date</label>
                  <input
                    type="date"
                    value={promoForm.startDate}
                    onChange={(e) => setPromoForm({ ...promoForm, startDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={promoForm.expiresAt}
                    onChange={(e) => setPromoForm({ ...promoForm, expiresAt: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="promoActive"
                  checked={promoForm.isActive}
                  onChange={(e) => setPromoForm({ ...promoForm, isActive: e.target.checked })}
                  className="rounded text-servora-core focus:ring-servora-core"
                />
                <label htmlFor="promoActive" className="text-xs font-bold text-servora-navy cursor-pointer">
                  Available for Immediate Point-of-Sale Redemption
                </label>
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
                  {isSubmitting ? 'Saving...' : editingPromo ? 'Update Rule' : 'Authorize Promo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: POS VALIDATION SIMULATOR */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">POS Discount Verification Simulator</h3>
                <p className="text-[11px] text-gray-400">Validate real-time deduction eligibility before checkout</p>
              </div>
              <button onClick={() => setIsSimulatorOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSimulateValidation} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Voucher Code to Test *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PERK15-882"
                  value={simCode}
                  onChange={(e) => setSimCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Simulated Order Subtotal (KES) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={simSubtotal}
                  onChange={(e) => setSimSubtotal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSimulating}
                className="w-full py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSimulating ? 'Evaluating Policy...' : 'Verify Rule Policy'}
              </button>

              {simResult && (
                <div
                  className={`p-3.5 rounded-xl border space-y-1.5 ${
                    simResult.valid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {simResult.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{simResult.message}</span>
                  </div>

                  {simResult.valid && simResult.promo && (
                    <div className="text-[11px] space-y-0.5 pt-1 border-t border-emerald-200/60 font-mono">
                      <div className="flex justify-between">
                        <span>Authorized Code:</span>
                        <span className="font-bold">{simResult.promo.code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Calculated Deduction:</span>
                        <span className="font-bold">KES {simResult.promo.computedDeduction.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Net Payable:</span>
                        <span className="font-bold">
                          KES {(parseFloat(simSubtotal) - simResult.promo.computedDeduction).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}