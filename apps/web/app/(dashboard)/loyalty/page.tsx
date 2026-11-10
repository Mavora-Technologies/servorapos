'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  TrendingDown,
  X,
  Phone,
  Mail,
  UserCheck,
  FileText,
  BadgeAlert,
  SlidersHorizontal,
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
  profileId: number | null;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerType: string;
  currentPoints: number;
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;
  tierName: string;
  enrolledAt: string;
}

interface LoyaltySummary {
  totalEnrolledMembers: number;
  totalPointsCirculation: number;
  totalLifetimeEarned: number;
  totalLifetimeRedeemed: number;
}

const REASON_CODES = [
  { code: 'SERVICE_RECOVERY', label: 'Service Recovery (Kitchen Delay / Dispute)', category: 'Operational Comp' },
  { code: 'VIP_COURTESY', label: 'VIP Courtesy / Management Goodwill', category: 'Executive Discretion' },
  { code: 'DISPUTE_RESOLUTION', label: 'Billing / Point Reconciliation', category: 'Accounting' },
  { code: 'PROMOTIONAL_ENROLLMENT', label: 'Promotional Campaign / Onboarding Bonus', category: 'Marketing' },
  { code: 'ANNIVERSARY_BONUS', label: 'Birthday / Patron Milestone Reward', category: 'Milestone' },
  { code: 'MANUAL_RECONCILIATION', label: 'Offline / Manual Shift Balancing', category: 'Reconciliation' },
  { code: 'POINTS_EXPIRY_OVERRIDE', label: 'Points Expiry Policy Override', category: 'Retention' },
  { code: 'FRAUD_PREVENTION_REVOKE', label: 'Erroneous / Fraudulent Point Revocation', category: 'Compliance' },
];

const TIER_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  'Platinum Elite': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Gold VIP': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Silver Member': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  'Base Member': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

export default function LoyaltyPage() {
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('ALL');

  // Point Adjustment Governance Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    customerId: '',
    action: 'CREDIT' as 'CREDIT' | 'DEBIT',
    points: 100,
    reasonCode: 'SERVICE_RECOVERY',
    notes: '',
    referenceNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Tier Modal
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [tierForm, setTierForm] = useState({
    name: '',
    minPoints: '500',
    earningMultiplier: '1.25',
    perks: 'Priority Seating, 10% Birthday Discount',
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedTierFilter !== 'ALL') params.set('tierId', selectedTierFilter);

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
      console.error('Failed to load loyalty telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedTierFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAdjust = (defaultCustomerId?: number) => {
    setAdjustForm({
      customerId: defaultCustomerId ? String(defaultCustomerId) : members[0] ? String(members[0].customerId) : '',
      action: 'CREDIT',
      points: 100,
      reasonCode: 'SERVICE_RECOVERY',
      notes: '',
      referenceNumber: '',
    });
    setIsAdjustModalOpen(true);
  };

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.customerId) {
      alert('Please select a customer.');
      return;
    }
    if (!adjustForm.notes.trim()) {
      alert('A justification note is required for regulatory audit compliance.');
      return;
    }

    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const res = await fetchApi('/api/v1/loyalty/points/adjust', {
        method: 'POST',
        body: JSON.stringify({
          customerId: parseInt(adjustForm.customerId, 10),
          action: adjustForm.action,
          points: Math.abs(Number(adjustForm.points)),
          reasonCode: adjustForm.reasonCode,
          notes: adjustForm.notes.trim(),
          referenceNumber: adjustForm.referenceNumber.trim() || undefined,
        }),
      });

      setIsAdjustModalOpen(false);
      setToastMessage({ text: res.message || 'Loyalty ledger updated successfully.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust points');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const perksArray = tierForm.perks.split(',').map((p) => p.trim()).filter(Boolean);

      const res = await fetchApi('/api/v1/loyalty/tiers', {
        method: 'POST',
        body: JSON.stringify({
          name: tierForm.name,
          minPoints: parseInt(tierForm.minPoints, 10),
          earningMultiplier: parseFloat(tierForm.earningMultiplier),
          perks: perksArray,
        }),
      });

      setIsTierModalOpen(false);
      setToastMessage({ text: res.message || 'Loyalty tier configured.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create tier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextTierRequirement = (currentPoints: number) => {
    const higherTiers = tiers.filter((t) => t.minPoints > currentPoints).sort((a, b) => a.minPoints - b.minPoints);
    if (higherTiers.length === 0) return { name: 'Top Tier Reached', needed: 0, percent: 100 };
    const next = higherTiers[0];
    const needed = next.minPoints - currentPoints;
    const percent = Math.min(100, Math.round((currentPoints / next.minPoints) * 100));
    return { name: next.name, needed, percent };
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
            Customer Loyalty & Incentive Management
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Governed tier progression, point issuance liabilities, catalog redemption, and compliance ledger audits.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <Link
            href="/loyalty/transactions"
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <ShieldCheck size={14} className="text-servora-core" /> Transaction Audit Log
          </Link>
          <button
            onClick={() => handleOpenAdjust()}
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

      {/* 2. LOYALTY METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Enrolled Patrons</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {summary ? summary.totalEnrolledMembers.toLocaleString() : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Customer Membership Base</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Circulation Liability</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              {summary ? summary.totalPointsCirculation.toLocaleString() : 0} pts
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Unredeemed Points</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Coins size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Lifetime Points Earned</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              +{summary ? summary.totalLifetimeEarned.toLocaleString() : 0} pts
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Total Rewards Accrued</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Points Redeemed</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              &minus;{summary ? summary.totalLifetimeRedeemed.toLocaleString() : 0} pts
            </p>
            <span className="text-[10px] text-purple-600 font-medium">Value Burned at POS</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Gift size={18} />
          </div>
        </div>
      </div>

      {/* 3. TIER LADDER & REWARDS CATALOG */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Tier Ladder */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-2.5 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Membership Tier Ladder</h3>
              <p className="text-[10px] text-gray-400">Automated rank promotion based on lifetime points</p>
            </div>
            <button
              onClick={() => setIsTierModalOpen(true)}
              className="text-[11px] font-bold text-servora-core hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> Add Tier
            </button>
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
                      {tier.earningMultiplier}x Points Multiplier
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-500 flex items-center justify-between">
                    <span>Threshold: <strong>{tier.minPoints.toLocaleString()} pts</strong></span>
                    <span>{tier.memberCount} active patrons</span>
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

        {/* Rewards Catalog */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-2.5 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Reward Redemption Catalog</h3>
              <p className="text-[10px] text-gray-400">Perks available for redemption at checkout</p>
            </div>
            <Gift size={16} className="text-servora-core" />
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {rewards.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">No rewards published in catalog.</p>
            ) : (
              rewards.map((rew) => (
                <div key={rew.id} className="p-3.5 bg-slate-50 border border-gray-100 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-servora-navy block">{rew.name}</span>
                    <span className="text-[11px] text-gray-500">{rew.description || 'Verified redemption benefit'}</span>
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
              Enrolled Loyalty Patrons ({members.length})
            </h3>
            <p className="text-[10px] text-gray-400">Real-time point balances, tier advancement gauges, and spend activity</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedTierFilter}
              onChange={(e) => setSelectedTierFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Tiers</option>
              {tiers.map((t) => (
                <option key={t.tierId} value={String(t.tierId)}>
                  {t.name}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="Search patron..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core w-44 sm:w-60 font-medium"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Patron Member</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Current Tier</th>
                <th className="py-2.5 px-3 text-right">Available Points</th>
                <th className="py-2.5 px-3 text-right">Lifetime Earned</th>
                <th className="py-2.5 px-3 text-right">Redeemed</th>
                <th className="py-2.5 px-3">Tier Advancement Progress</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                    {isLoading ? 'Aggregating member accounts...' : 'No loyalty members found.'}
                  </td>
                </tr>
              ) : (
                members.map((mem) => {
                  const badge = TIER_BADGES[mem.tierName] || TIER_BADGES['Base Member'];
                  const nextTier = nextTierRequirement(mem.currentPoints);

                  return (
                    <tr key={mem.customerId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{mem.customerName}</span>
                        <span className="text-[10px] font-mono text-gray-400">ID: #{mem.customerId}</span>
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone size={10} className="text-gray-400" /> {mem.customerPhone}
                        </div>
                        {mem.customerEmail && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Mail size={10} /> {mem.customerEmail}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {mem.tierName}
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
                      <td className="py-3 px-3 min-w-[160px]">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium">
                            <span>{nextTier.name}</span>
                            <span className="font-mono">{nextTier.percent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-servora-core h-full rounded-full transition-all" style={{ width: `${nextTier.percent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenAdjust(mem.customerId)}
                          className="px-2.5 py-1 bg-slate-50 border border-gray-200 hover:bg-gray-100 text-servora-navy font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                        >
                          Adjust
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

      {/* 5. MODAL: GOVERNED AUDIT POINT ADJUSTMENT */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Adjust Patron Loyalty Points</h3>
                <p className="text-[11px] text-gray-400">Enterprise audit trail & governed reason categorization</p>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustPoints} className="space-y-3.5 text-xs">
              {/* Select Patron */}
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Target Member Account *</label>
                <select
                  required
                  value={adjustForm.customerId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, customerId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                >
                  {members.map((m) => (
                    <option key={m.customerId} value={m.customerId}>
                      {m.customerName} ({m.customerPhone}) &mdash; Available: {m.currentPoints.toLocaleString()} pts
                    </option>
                  ))}
                </select>
              </div>

              {/* Action (Credit/Debit) & Points */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Action Direction *</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAdjustForm({ ...adjustForm, action: 'CREDIT' })}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        adjustForm.action === 'CREDIT'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-black'
                      }`}
                    >
                      <Plus size={12} /> Credit (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustForm({ ...adjustForm, action: 'DEBIT' })}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        adjustForm.action === 'DEBIT'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-black'
                      }`}
                    >
                      <TrendingDown size={12} /> Debit (&minus;)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Point Magnitude *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustForm.points}
                    onChange={(e) => setAdjustForm({ ...adjustForm, points: Math.max(1, parseInt(e.target.value) || 0) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              {/* Reason Code Dropdown (Enterprise Standard) */}
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Governed Reason Code *</label>
                <select
                  required
                  value={adjustForm.reasonCode}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reasonCode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  {REASON_CODES.map((rc) => (
                    <option key={rc.code} value={rc.code}>
                      [{rc.category}] {rc.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference Document / Ticket # */}
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Reference Identifier <span className="text-gray-400 font-normal">(Optional Order # / Ticket #)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ORD-2026-8819 or TICKET-409"
                  value={adjustForm.referenceNumber}
                  onChange={(e) => setAdjustForm({ ...adjustForm, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                />
              </div>

              {/* Mandatory Justification Notes */}
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Auditor Justification Note *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Provide precise operational reasoning for audit trail..."
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core text-xs font-medium"
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
                  {isSubmitting ? 'Recording Ledger...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: CONFIGURE NEW TIER */}
      {isTierModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Configure Loyalty Tier</h3>
                <p className="text-[11px] text-gray-400">Establish qualification threshold and points multiplier</p>
              </div>
              <button onClick={() => setIsTierModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTier} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Tier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diamond Executive"
                  value={tierForm.name}
                  onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Points Threshold *</label>
                  <input
                    type="number"
                    required
                    value={tierForm.minPoints}
                    onChange={(e) => setTierForm({ ...tierForm, minPoints: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Earning Multiplier *</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={tierForm.earningMultiplier}
                    onChange={(e) => setTierForm({ ...tierForm, earningMultiplier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Perks (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="Free Delivery, Valet Parking, Dedicated Concierge"
                  value={tierForm.perks}
                  onChange={(e) => setTierForm({ ...tierForm, perks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTierModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Create Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}