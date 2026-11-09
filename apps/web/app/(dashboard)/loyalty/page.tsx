'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Award,
  Gift,
  Users,
  Star,
  Plus,
  RefreshCw,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  Coins,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface LoyaltyTier {
  tierId: number;
  name: string;
  minPoints: number;
  earningMultiplier: number;
  perks: string[];
  memberCount: number;
}

interface LoyaltyReward {
  id: number;
  name: string;
  description: string | null;
  pointsCost: number;
  rewardType: string;
  rewardValue: number;
}

interface LoyaltyMember {
  profileId: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  currentPoints: number;
  lifetimePointsRedeemed: number;
  lifetimePointsEarned: number;
  tierName: string | null;
}

interface LoyaltySummary {
  totalEnrolledMembers: number;
  totalPointsCirculation: number;
  totalLifetimeEarned: number;
  totalLifetimeRedeemed: number;
}

export default function LoyaltyPage() {
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Point Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    customerId: '',
    points: '100',
    transactionType: 'MANUAL_ADJUSTMENT' as any,
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const [overviewRes, membersRes] = await Promise.all([
        fetchApi('/api/v1/loyalty'),
        fetchApi(`/api/v1/loyalty/members?${params.toString()}`),
      ]);

      if (overviewRes?.data) {
        setSummary(overviewRes.data.summary);
        setTiers(overviewRes.data.tiers || []);
        setRewards(overviewRes.data.rewards || []);
      }
      if (membersRes?.data) {
        setMembers(membersRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load loyalty data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const res = await fetchApi('/api/v1/loyalty/points/adjust', {
        method: 'POST',
        body: JSON.stringify({
          customerId: parseInt(adjustForm.customerId, 10),
          points: parseInt(adjustForm.points, 10),
          transactionType: adjustForm.transactionType,
          description: adjustForm.description,
        }),
      });

      setIsAdjustModalOpen(false);
      setToastMessage({ text: res.message || 'Points adjusted successfully.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust points');
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
            <span className="text-xs font-bold text-servora-navy">Loyalty & Rewards</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Award className="text-servora-core" size={22} />
            Customer Loyalty & Incentive Engagement
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Manage membership tier ladders, point circulation, redemption catalogs, and patron point balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => {
              setAdjustForm({
                customerId: members[0] ? String(members[0].customerId) : '',
                points: '100',
                transactionType: 'MANUAL_ADJUSTMENT',
                description: 'Manager bonus points',
              });
              setIsAdjustModalOpen(true);
            }}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Coins size={14} /> Adjust Patron Points
          </button>
          <button
            onClick={loadData}
            title="Refresh Loyalty Ledger"
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

      {/* 2. LOYALTY PROGRAM METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Enrolled Members</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {summary ? summary.totalEnrolledMembers.toLocaleString() : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Active Accounts</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Points in Circulation</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              {summary ? summary.totalPointsCirculation.toLocaleString() : 0} pts
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Outstanding Liability</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Coins size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Lifetime Earned</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {summary ? summary.totalLifetimeEarned.toLocaleString() : 0} pts
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Total Rewards Accrued</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Lifetime Redeemed</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {summary ? summary.totalLifetimeRedeemed.toLocaleString() : 0} pts
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Claimed Value</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Gift size={18} />
          </div>
        </div>
      </div>

      {/* 3. TIER LADDER & REWARDS CATALOG */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Tier Ladder (6 Cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-2.5 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Membership Tier Ladder</h3>
              <p className="text-[10px] text-gray-400">Automatic progression based on lifetime points</p>
            </div>
            <Star size={16} className="text-servora-core" />
          </div>

          <div className="space-y-3">
            {tiers.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">No tiers configured.</p>
            ) : (
              tiers.map((tier) => (
                <div key={tier.tierId} className="p-3.5 bg-slate-50 border border-gray-100 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-servora-navy">{tier.name}</span>
                    <span className="font-mono text-xs font-bold text-servora-core bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                      {tier.earningMultiplier}x Multiplier
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-500 flex items-center justify-between">
                    <span>Threshold: <strong>{tier.minPoints.toLocaleString()} pts</strong></span>
                    <span>{tier.memberCount} active members</span>
                  </div>

                  {tier.perks.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {tier.perks.map((perk, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-white text-gray-600 border border-gray-200 rounded text-[10px] font-medium">
                          &bull; {perk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rewards Catalog (6 Cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-2.5 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Reward Redemption Catalog</h3>
              <p className="text-[10px] text-gray-400">Perks redeemable at POS checkout</p>
            </div>
            <Gift size={16} className="text-servora-core" />
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {rewards.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">No rewards in catalog.</p>
            ) : (
              rewards.map((rew) => (
                <div key={rew.id} className="p-3.5 bg-slate-50 border border-gray-100 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-servora-navy block">{rew.name}</span>
                    <span className="text-[11px] text-gray-500">{rew.description || 'Standard redemption item'}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 block">
                      {rew.pointsCost.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. MEMBER DIRECTORY TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-xs text-servora-navy uppercase tracking-wider">
              Enrolled Loyalty Members ({members.length})
            </h3>
            <p className="text-[10px] text-gray-400">Patron point balances and tier assignments</p>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              placeholder="Search member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 py-1 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core w-44 sm:w-64 font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Patron Name</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Membership Tier</th>
                <th className="py-2.5 px-3 text-right">Current Points</th>
                <th className="py-2.5 px-3 text-right">Lifetime Earned</th>
                <th className="py-2.5 px-3 text-right">Redeemed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 italic">
                    {isLoading ? 'Loading members...' : 'No loyalty members found.'}
                  </td>
                </tr>
              ) : (
                members.map((mem) => (
                  <tr key={mem.profileId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-servora-navy">
                      {mem.customerName}
                    </td>
                    <td className="py-3 px-3 text-gray-600">
                      <span className="font-mono">{mem.customerPhone}</span>
                      {mem.customerEmail && <span className="block text-[10px] text-gray-400">{mem.customerEmail}</span>}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-servora-core border border-blue-200 rounded text-[9.5px] font-mono font-bold uppercase">
                        {mem.tierName || 'Standard Member'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-600">
                      {mem.currentPoints.toLocaleString()} pts
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-700">
                      {mem.lifetimePointsEarned.toLocaleString()} pts
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-500">
                      {mem.lifetimePointsRedeemed.toLocaleString()} pts
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: ADJUST POINTS */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Adjust Patron Loyalty Points</h3>
                <p className="text-[11px] text-gray-400">Add or deduct points with audit logging</p>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustPoints} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Select Member *</label>
                <select
                  required
                  value={adjustForm.customerId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, customerId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                >
                  {members.map((m) => (
                    <option key={m.customerId} value={m.customerId}>
                      {m.customerName} ({m.customerPhone}) &mdash; Balance: {m.currentPoints} pts
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Points Delta (+ or -) *</label>
                  <input
                    type="number"
                    required
                    value={adjustForm.points}
                    onChange={(e) => setAdjustForm({ ...adjustForm, points: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Transaction Type</label>
                  <select
                    value={adjustForm.transactionType}
                    onChange={(e) => setAdjustForm({ ...adjustForm, transactionType: e.target.value as any })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
                    <option value="TIER_BONUS">Tier Bonus</option>
                    <option value="REDEEM_REWARD">Redeem Reward</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Audit Description / Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apology points for delayed order"
                  value={adjustForm.description}
                  onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
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
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}