'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Gift,
  Award,
  Plus,
  RefreshCw,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Percent,
  DollarSign,
  UtensilsCrossed,
  Sparkles,
  ShieldCheck,
  Edit3,
  X,
  Check,
  Flame,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface RewardItem {
  id: number;
  name: string;
  description: string | null;
  pointsCost: number;
  rewardType: 'DISCOUNT_FIXED' | 'PERCENTAGE_OFF' | 'FREE_MENU_ITEM' | 'EXPERIENCE_PERK';
  rewardValue: number;
  maxDiscountCap: number | null;
  menuItemId: number | null;
  menuItemName: string | null;
  menuItemPrice: number | null;
  minTierId: number | null;
  minTierName: string;
  isActive: boolean;
  createdAt: string;
}

interface RewardsSummary {
  totalCatalogItems: number;
  activeRewards: number;
  avgPointsCost: number;
  totalRedemptionsCount: number;
  totalPointsBurned: number;
}

interface CustomerOption {
  id: number;
  name: string;
  phone: string;
  loyaltyPoints: number;
}

interface MenuItemOption {
  id: number;
  name: string;
  price: number;
}

interface TierOption {
  tierId: number;
  name: string;
}

const TYPE_CONFIG = {
  DISCOUNT_FIXED: { label: 'Fixed Voucher', icon: DollarSign, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  PERCENTAGE_OFF: { label: 'Percentage Off', icon: Percent, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  FREE_MENU_ITEM: { label: 'Free Item Comp', icon: UtensilsCrossed, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  EXPERIENCE_PERK: { label: 'VIP Experience', icon: Sparkles, color: 'text-amber-700 bg-amber-50 border-amber-200' },
};

export default function LoyaltyRewardsPage() {
  const [summary, setSummary] = useState<RewardsSummary | null>(null);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [menuItemsList, setMenuItemsList] = useState<MenuItemOption[]>([]);
  const [tiers, setTiers] = useState<TierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('TRUE');

  // Create / Edit Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    pointsCost: 250,
    rewardType: 'DISCOUNT_FIXED' as RewardItem['rewardType'],
    rewardValue: 200,
    maxDiscountCap: '' as string | number,
    menuItemId: '' as string | number,
    minTierId: '' as string | number,
    isActive: true,
  });

  // Burn / Redeem Modal State
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [selectedRewardToRedeem, setSelectedRewardToRedeem] = useState<RewardItem | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [redemptionNotes, setRedemptionNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (typeFilter !== 'ALL') params.set('rewardType', typeFilter);
      if (statusFilter !== 'ALL') params.set('isActive', statusFilter);

      const [rewardsRes, metricsRes, custRes, menuRes, tiersRes] = await Promise.all([
        fetchApi(`/api/v1/loyalty/rewards?${params.toString()}`),
        fetchApi('/api/v1/loyalty/rewards/metrics'),
        fetchApi('/api/v1/customers?limit=100').catch(() => ({ data: [] })),
        fetchApi('/api/v1/menu/items?limit=100').catch(() => ({ data: [] })),
        fetchApi('/api/v1/loyalty').catch(() => ({ data: { tiers: [] } })),
      ]);

      if (rewardsRes?.data) setRewards(rewardsRes.data);
      if (metricsRes?.data) setSummary(metricsRes.data);
      if (custRes?.data && Array.isArray(custRes.data)) setCustomers(custRes.data);
      if (menuRes?.data && Array.isArray(menuRes.data)) setMenuItemsList(menuRes.data);
      if (tiersRes?.data?.tiers) setTiers(tiersRes.data.tiers);
    } catch (err: any) {
      console.error('Failed to load rewards catalog:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, typeFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenPublish = (item?: RewardItem) => {
    if (item) {
      setEditingReward(item);
      setRewardForm({
        name: item.name,
        description: item.description || '',
        pointsCost: item.pointsCost,
        rewardType: item.rewardType,
        rewardValue: item.rewardValue,
        maxDiscountCap: item.maxDiscountCap || '',
        menuItemId: item.menuItemId || '',
        minTierId: item.minTierId || '',
        isActive: item.isActive,
      });
    } else {
      setEditingReward(null);
      setRewardForm({
        name: '',
        description: '',
        pointsCost: 300,
        rewardType: 'DISCOUNT_FIXED',
        rewardValue: 250,
        maxDiscountCap: '',
        menuItemId: '',
        minTierId: '',
        isActive: true,
      });
    }
    setIsPublishModalOpen(true);
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const payload = {
        name: rewardForm.name.trim(),
        description: rewardForm.description.trim() || undefined,
        pointsCost: Number(rewardForm.pointsCost),
        rewardType: rewardForm.rewardType,
        rewardValue: Number(rewardForm.rewardValue),
        maxDiscountCap: rewardForm.maxDiscountCap ? Number(rewardForm.maxDiscountCap) : null,
        menuItemId: rewardForm.menuItemId ? Number(rewardForm.menuItemId) : null,
        minTierId: rewardForm.minTierId ? Number(rewardForm.minTierId) : null,
        isActive: rewardForm.isActive,
      };

      const url = editingReward ? `/api/v1/loyalty/rewards/${editingReward.id}` : '/api/v1/loyalty/rewards';
      const method = editingReward ? 'PATCH' : 'POST';

      const res = await fetchApi(url, {
        method,
        body: JSON.stringify(payload),
      });

      setIsPublishModalOpen(false);
      setToastMessage({ text: res.message || 'Reward catalog updated.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save reward');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRedeem = (reward: RewardItem) => {
    setSelectedRewardToRedeem(reward);
    setSelectedCustomerId(customers[0] ? String(customers[0].id) : '');
    setRedemptionNotes('');
    setIsRedeemModalOpen(true);
  };

  const handleExecuteRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRewardToRedeem || !selectedCustomerId) return;

    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const res = await fetchApi('/api/v1/loyalty/rewards/redeem', {
        method: 'POST',
        body: JSON.stringify({
          customerId: parseInt(selectedCustomerId, 10),
          rewardId: selectedRewardToRedeem.id,
          notes: redemptionNotes.trim() || 'POS Front-Desk Redemption',
        }),
      });

      setIsRedeemModalOpen(false);
      setToastMessage({ text: res.message || 'Reward successfully claimed.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Redemption failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMemberProfile = customers.find((c) => String(c.id) === selectedCustomerId);
  const hasEnoughPoints = selectedRewardToRedeem && selectedMemberProfile
    ? selectedMemberProfile.loyaltyPoints >= selectedRewardToRedeem.pointsCost
    : false;

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
              href="/loyalty"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Loyalty Hub <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Reward Redemption Catalog</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Gift className="text-servora-core" size={22} />
            Perks, Vouchers & Reward Redemption Catalog
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Configure unit burn mechanics, fixed discount vouchers, complimentary menu items, and membership perks.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <Link
            href="/loyalty/transactions"
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <ShieldCheck size={14} className="text-servora-core" /> Redemption Ledger
          </Link>
          <button
            onClick={() => handleOpenPublish()}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> Publish Reward
          </button>
          <button
            onClick={loadData}
            title="Refresh Catalog"
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

      {/* 2. REWARDS EXECUTIVE METRIC RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Published Rewards</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {summary ? summary.activeRewards : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Active at POS Checkouts</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Gift size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Avg Point Burn Price</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              {summary ? summary.avgPointsCost.toLocaleString() : 0} pts
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Per Claim Threshold</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Coins size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Points Burned</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {summary ? summary.totalPointsBurned.toLocaleString() : 0} pts
            </p>
            <span className="text-[10px] text-purple-600 font-medium">Liability Settled</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Flame size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Redemptions Fulfilled</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {summary ? summary.totalRedemptionsCount.toLocaleString() : 0}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Patrons Rewarded</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award size={18} />
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Reward Types</option>
            <option value="DISCOUNT_FIXED">Fixed Amount Discount</option>
            <option value="PERCENTAGE_OFF">Percentage Discount</option>
            <option value="FREE_MENU_ITEM">Free Menu Item Comp</option>
            <option value="EXPERIENCE_PERK">VIP Experience & Perk</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="TRUE">Active Only</option>
            <option value="FALSE">Archived / Inactive</option>
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Search reward name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-servora-core w-44 sm:w-64"
          />
        </div>
      </div>

      {/* 4. REWARDS CATALOG GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-400 italic bg-white rounded-2xl border border-gray-200">
            {isLoading ? 'Loading catalog items...' : 'No reward items published. Click "Publish Reward" to create one.'}
          </div>
        ) : (
          rewards.map((reward) => {
            const cfg = TYPE_CONFIG[reward.rewardType] || TYPE_CONFIG.DISCOUNT_FIXED;
            const TypeIcon = cfg.icon;

            return (
              <div
                key={reward.id}
                className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="space-y-2.5">
                  <div className="flex justify-between items-start">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
                      <TypeIcon size={11} /> {cfg.label}
                    </span>
                    <span className="font-mono font-bold text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      {reward.pointsCost.toLocaleString()} pts
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-servora-navy">{reward.name}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {reward.description || 'Verified patron reward perk.'}
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-gray-100 text-[11px] space-y-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Monetary Value:</span>
                      <span className="font-mono font-bold text-servora-navy">
                        {reward.rewardType === 'PERCENTAGE_OFF'
                          ? `${reward.rewardValue}% Off`
                          : `KES ${reward.rewardValue.toLocaleString()}`}
                      </span>
                    </div>

                    {reward.menuItemName && (
                      <div className="flex justify-between text-gray-600">
                        <span>Comp Item:</span>
                        <span className="font-bold text-purple-700 truncate max-w-[140px]">{reward.menuItemName}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600">
                      <span>Eligibility Tier:</span>
                      <span className="font-bold text-servora-core">{reward.minTierName}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenPublish(reward)}
                    className="p-1.5 text-gray-400 hover:text-servora-core transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                    title="Edit Reward Configuration"
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    onClick={() => handleOpenRedeem(reward)}
                    className="px-3.5 py-1.5 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Coins size={12} /> Claim at POS
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. MODAL: PUBLISH OR EDIT REWARD SPECIFICATION */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingReward ? `Edit Reward: ${editingReward.name}` : 'Publish New Reward'}
                </h3>
                <p className="text-[11px] text-gray-400">Configure burn price, perk values, and tier constraints</p>
              </div>
              <button onClick={() => setIsPublishModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReward} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Reward Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KES 500 Food & Beverage Voucher"
                  value={rewardForm.name}
                  onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Reward Classification *</label>
                  <select
                    value={rewardForm.rewardType}
                    onChange={(e) => setRewardForm({ ...rewardForm, rewardType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="DISCOUNT_FIXED">Fixed Discount (KES)</option>
                    <option value="PERCENTAGE_OFF">Percentage Off (%)</option>
                    <option value="FREE_MENU_ITEM">Free Complimentary Item</option>
                    <option value="EXPERIENCE_PERK">VIP Experience / Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Points Cost (Burn Rate) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={rewardForm.pointsCost}
                    onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: Math.max(1, parseInt(e.target.value) || 0) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    {rewardForm.rewardType === 'PERCENTAGE_OFF' ? 'Discount Percentage (%) *' : 'Monetary Value (KES) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={rewardForm.rewardValue}
                    onChange={(e) => setRewardForm({ ...rewardForm, rewardValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Minimum Qualification Tier</label>
                  <select
                    value={rewardForm.minTierId}
                    onChange={(e) => setRewardForm({ ...rewardForm, minTierId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="">Open to All Members</option>
                    {tiers.map((t) => (
                      <option key={t.tierId} value={t.tierId}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {rewardForm.rewardType === 'FREE_MENU_ITEM' && (
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Linked Menu Item Comp</label>
                  <select
                    value={rewardForm.menuItemId}
                    onChange={(e) => setRewardForm({ ...rewardForm, menuItemId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="">Select Catalog Item...</option>
                    {menuItemsList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (KES {m.price})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Description Narrative</label>
                <textarea
                  rows={2}
                  placeholder="Terms, exclusions, or instructions..."
                  value={rewardForm.description}
                  onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rewardActive"
                  checked={rewardForm.isActive}
                  onChange={(e) => setRewardForm({ ...rewardForm, isActive: e.target.checked })}
                  className="rounded text-servora-core focus:ring-servora-core"
                />
                <label htmlFor="rewardActive" className="text-xs font-bold text-servora-navy cursor-pointer">
                  Available for Immediate Redemption at POS Terminals
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingReward ? 'Update Reward' : 'Publish Reward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: EXECUTE POINT BURN / REDEMPTION SIMULATOR */}
      {isRedeemModalOpen && selectedRewardToRedeem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Claim & Redeem Reward</h3>
                <p className="text-[11px] text-gray-400">Burn member loyalty points for checkout perks</p>
              </div>
              <button onClick={() => setIsRedeemModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteRedeem} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-gray-100 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-servora-navy">{selectedRewardToRedeem.name}</span>
                  <span className="font-mono font-bold text-amber-600">
                    {selectedRewardToRedeem.pointsCost.toLocaleString()} pts
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">
                  Value: KES {selectedRewardToRedeem.rewardValue.toLocaleString()} &bull; Min Tier: {selectedRewardToRedeem.minTierName}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Select Claiming Member *</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) &mdash; Balance: {c.loyaltyPoints.toLocaleString()} pts
                    </option>
                  ))}
                </select>
              </div>

              {selectedMemberProfile && (
                <div className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
                  hasEnoughPoints ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <span>Current Member Balance:</span>
                  <span className="font-mono font-bold">
                    {selectedMemberProfile.loyaltyPoints.toLocaleString()} pts
                    {hasEnoughPoints ? ' (Eligible)' : ' (Insufficient Points)'}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">POS / Order Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Applied against Order #ORD-1092"
                  value={redemptionNotes}
                  onChange={(e) => setRedemptionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRedeemModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !hasEnoughPoints}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Burn & Redeem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}