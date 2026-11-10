'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Sparkles,
  Percent,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Tag,
  Radio,
  Mail,
  MessageSquare,
  Gift,
  Target,
  BarChart3,
  Flame,
  Award,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface MarketingHubData {
  kpis: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalBudget: number;
    attributedRevenue: number;
    roas: number;
    avgConversionRate: number;
    totalDispatched: number;
    totalConverted: number;
  };
  channels: {
    channel: 'SMS' | 'EMAIL' | 'PUSH_NOTIFICATION' | 'OMNICHANNEL';
    campaignCount: number;
    attributedRevenue: number;
    convertedCount: number;
  }[];
  audienceSegments: {
    totalAudience: number;
    vipMembers: number;
    highSpenders: number;
    corporateAccounts: number;
    lapsedCustomers: number;
  };
  activePromos: {
    id: number;
    code: string;
    discountType: string;
    discountValue: number;
    maxUsageCount: number;
    currentUsageCount: number;
    expiresAt: string | null;
  }[];
  recentCampaigns: {
    id: number;
    name: string;
    code: string;
    channel: string;
    targetSegment: string;
    status: string;
    budgetKes: number;
    attributedRevenueKes: number;
    deliveredCount: number;
    convertedCount: number;
    createdAt: string;
  }[];
}

const CHANNEL_ICONS = {
  SMS: MessageSquare,
  EMAIL: Mail,
  PUSH_NOTIFICATION: Radio,
  OMNICHANNEL: Megaphone,
};

export default function MarketingHubPage() {
  const [data, setData] = useState<MarketingHubData | null>(null);
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | 'YTD'>('30D');
  const [isLoading, setIsLoading] = useState(true);

  const loadHubData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchApi(`/api/v1/marketing/hub/overview?timeRange=${timeRange}`);
      if (res?.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load marketing command hub:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadHubData();
  }, [loadHubData]);

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
            <span className="text-xs font-bold text-servora-navy">Marketing Command Center</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Megaphone className="text-servora-core" size={22} />
            Growth Marketing, Campaigns & Audience Outreach
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Cross-channel campaign governance, promo code liability tracking, audience segmentation, and revenue attribution.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* Timeframe Presets */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
            {(['7D', '30D', '90D', 'YTD'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-white text-servora-navy shadow-xs'
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <Link
            href="/marketing/campaigns"
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} /> Launch Campaign
          </Link>

          <button
            onClick={loadHubData}
            title="Refresh Command Hub"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE REVENUE & ROAS KPI RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Attributed Revenue</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              KES {data ? data.kpis.attributedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Closed Order Attribution</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Ad Spend</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              KES {data ? data.kpis.totalBudget.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Broadcast & Outreach Budget</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Megaphone size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">ROAS Multiple</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {data ? `${data.kpis.roas}x` : '0x'}
            </p>
            <span className="text-[10px] text-purple-600 font-medium">Return on Ad Spend</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Conversion Rate</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              {data ? `${data.kpis.avgConversionRate}%` : '0%'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Delivered to Checkouts</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Sparkles size={18} />
          </div>
        </div>
      </div>

      {/* 3. AUDIENCE SEGMENTATION RADAR */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
          <div>
            <h3 className="font-bold text-sm text-servora-navy flex items-center gap-1.5">
              <Target size={16} className="text-servora-core" /> Audience Segmentation & Target Groups
            </h3>
            <p className="text-[10px] text-gray-400">Total reachable audience: {data?.audienceSegments.totalAudience || 0} customer profiles</p>
          </div>
          <Link
            href="/customers"
            className="text-xs font-bold text-servora-core hover:underline flex items-center gap-1"
          >
            Customer CRM Directory <ArrowUpRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 bg-slate-50 border border-gray-100 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 inline-block">
              VIP Tier Members
            </span>
            <p className="text-xl font-bold font-mono text-servora-navy">
              {data ? data.audienceSegments.vipMembers : 0}
            </p>
            <span className="text-[10px] text-gray-400 block">&gt;= 500 Loyalty Points</span>
          </div>

          <div className="p-3.5 bg-slate-50 border border-gray-100 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
              Top 20% High Spenders
            </span>
            <p className="text-xl font-bold font-mono text-servora-navy">
              {data ? data.audienceSegments.highSpenders : 0}
            </p>
            <span className="text-[10px] text-gray-400 block">&gt;= KES 10,000 Lifetime Spend</span>
          </div>

          <div className="p-3.5 bg-slate-50 border border-gray-100 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 inline-block">
              Corporate Accounts
            </span>
            <p className="text-xl font-bold font-mono text-servora-navy">
              {data ? data.audienceSegments.corporateAccounts : 0}
            </p>
            <span className="text-[10px] text-gray-400 block">KRA eTIMS Tax Accounts</span>
          </div>

          <div className="p-3.5 bg-slate-50 border border-gray-100 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
              Lapsed Patrons
            </span>
            <p className="text-xl font-bold font-mono text-servora-navy">
              {data ? data.audienceSegments.lapsedCustomers : 0}
            </p>
            <span className="text-[10px] text-gray-400 block">No visit in 45+ days</span>
          </div>
        </div>
      </div>

      {/* 4. CROSS-CHANNEL ATTRIBUTION & FINANCIAL PROMO CODE MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Channel Revenue Attribution (6 Cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-2.5 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-servora-navy flex items-center gap-1.5">
                <BarChart3 size={16} className="text-servora-core" /> Cross-Channel Revenue Attribution
              </h3>
              <p className="text-[10px] text-gray-400">Performance comparison across dispatch channels</p>
            </div>
          </div>

          <div className="space-y-3">
            {!data || data.channels.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">No channel distribution recorded for this period.</p>
            ) : (
              data.channels.map((chan) => {
                const ChannelIcon = CHANNEL_ICONS[chan.channel] || Megaphone;
                const maxRevenue = data.channels[0]?.attributedRevenue || 1;
                const ratio = Math.min(100, Math.max(10, Math.round((chan.attributedRevenue / maxRevenue) * 100)));

                return (
                  <div key={chan.channel} className="space-y-1 p-3 bg-slate-50 border border-gray-100 rounded-xl">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-servora-navy">
                        <ChannelIcon size={13} className="text-servora-core" />
                        <span>{chan.channel}</span>
                        <span className="text-[10px] font-normal text-gray-400 font-mono">
                          ({chan.campaignCount} campaigns &bull; {chan.convertedCount} conversions)
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700 text-[11px]">
                        KES {chan.attributedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
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

        {/* Active Promotional Code Liabilities (6 Cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-2.5 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-servora-navy flex items-center gap-1.5">
                <Tag size={16} className="text-servora-core" /> Active POS Promo Code Rules
              </h3>
              <p className="text-[10px] text-gray-400">Financial discount liability & usage constraints</p>
            </div>
            <Link
              href="/loyalty/rewards"
              className="text-xs font-bold text-servora-core hover:underline flex items-center gap-1"
            >
              Rewards Catalog <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {!data || data.activePromos.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">No active promotional discount codes configured.</p>
            ) : (
              data.activePromos.map((promo) => (
                <div key={promo.id} className="p-3 bg-slate-50 border border-gray-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {promo.code}
                    </span>
                    <span className="text-[11px] text-gray-600 block mt-1">
                      {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% Off` : `KES ${promo.discountValue} Off`}
                    </span>
                  </div>

                  <div className="text-right font-mono text-[11px]">
                    <span className="font-bold text-servora-navy block">
                      {promo.currentUsageCount} / {promo.maxUsageCount} Used
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Expires: {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. RECENT CAMPAIGNS DIRECTORY LINK */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-xs text-servora-navy uppercase tracking-wider">
              Recent Marketing Broadcasts
            </h3>
            <p className="text-[10px] text-gray-400">Live feed of deployed customer communications</p>
          </div>
          <Link
            href="/marketing/campaigns"
            className="text-xs font-bold text-servora-core hover:underline flex items-center gap-1"
          >
            Manage All Campaigns <ArrowUpRight size={12} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Campaign</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3">Audience Segment</th>
                <th className="py-2.5 px-3 text-right">Budget</th>
                <th className="py-2.5 px-3 text-right">Attributed Revenue</th>
                <th className="py-2.5 px-3 text-center">Conversions</th>
                <th className="py-2.5 px-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!data || data.recentCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 italic">
                    {isLoading ? 'Loading command feed...' : 'No campaigns launched in this timeframe.'}
                  </td>
                </tr>
              ) : (
                data.recentCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-servora-navy block">{camp.name}</span>
                      <span className="text-[10px] font-mono text-gray-400">{camp.code}</span>
                    </td>
                    <td className="py-3 px-3 font-bold text-gray-700">
                      {camp.channel}
                    </td>
                    <td className="py-3 px-3 text-gray-600 font-mono text-[11px]">
                      {camp.targetSegment.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-700">
                      KES {camp.budgetKes.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      KES {camp.attributedRevenueKes.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-servora-navy">
                      {camp.convertedCount} of {camp.deliveredCount}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {new Date(camp.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}