'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  ChevronRight,
  Building2,
  ChefHat,
  UserCheck,
  Utensils,
  Download,
  Flame,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface PerformanceData {
  summary: {
    totalProcessed: number;
    totalDishesPlated: number;
    cancelledTickets: number;
    avgPrepTimeMinutes: number;
    medianPrepTimeMinutes: number;
    avgCycleTimeMinutes: number;
    onTimeRatePercentage: number;
    delayedOrders: number;
  };
  stationBreakdown: {
    station: string;
    ticketsCount: number;
    dishesCount: number;
    avgPrepMins: number;
    targetSlaMins: number;
    onTimeRatePct: number;
    delayedCount: number;
  }[];
  channelBreakdown: {
    channel: string;
    ticketsCount: number;
    avgPrepMins: number;
    onTimeRatePct: number;
  }[];
  staffLeaderboard: {
    staffName: string;
    ticketsCompleted: number;
    dishesPrepared: number;
    avgPrepMins: number;
    onTimeRatePct: number;
  }[];
  hourlyRush: {
    hour: number;
    label: string;
    ticketsCount: number;
    dishesCount: number;
    avgPrepMins: number;
  }[];
  recentExecutions: {
    id: number;
    orderNumber: string;
    branchName: string;
    orderType: string;
    tableName: string | null;
    status: string;
    placedByName: string;
    completedByName: string;
    stations: string[];
    dishesCount: number;
    durationMins: number;
    cycleMins: number;
    targetSlaMins: number;
    isDelayed: boolean;
    updatedAt: string;
  }[];
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

export default function KitchenPerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Multi-Dimensional Analytics Filters
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [stationFilter, setStationFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchPerformance = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (branchFilter !== 'ALL') params.set('branchId', branchFilter);
      if (stationFilter !== 'ALL') params.set('station', stationFilter);
      if (channelFilter !== 'ALL') params.set('orderType', channelFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const [perfRes, branchRes, stationRes] = await Promise.all([
        fetchApi(`/api/v1/kitchen/performance?${params.toString()}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
        fetchApi('/api/v1/kitchen/stations-meta').catch(() => ({ data: [] })),
      ]);

      if (perfRes?.data) setData(perfRes.data);
      if (branchRes?.data && Array.isArray(branchRes.data)) setBranches(branchRes.data);
      if (stationRes?.data && Array.isArray(stationRes.data)) setStations(stationRes.data);
    } catch (error) {
      console.error('Failed to load kitchen performance analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter, stationFilter, channelFilter, startDate, endDate]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const handleExportReport = () => {
    if (!data) return;
    const rows = [
      ['STATION SLA & THROUGHPUT REPORT'],
      ['Station', 'Tickets', 'Dishes Plated', 'Avg Prep (Mins)', 'Target SLA (Mins)', 'On-Time %', 'SLA Breaches'],
      ...data.stationBreakdown.map((s) => [
        s.station,
        s.ticketsCount,
        s.dishesCount,
        s.avgPrepMins,
        s.targetSlaMins,
        `${s.onTimeRatePct}%`,
        s.delayedCount,
      ]),
      [],
      ['STAFF CULINARY EXECUTION'],
      ['Staff Member', 'Tickets Bumped', 'Dishes Prepared', 'Avg Prep (Mins)', 'SLA On-Time %'],
      ...data.staffLeaderboard.map((st) => [
        st.staffName,
        st.ticketsCompleted,
        st.dishesPrepared,
        st.avgPrepMins,
        `${st.onTimeRatePct}%`,
      ]),
    ];

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `servora-kds-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxHourlyTickets =
    data && data.hourlyRush.length > 0
      ? Math.max(...data.hourlyRush.map((h) => h.ticketsCount), 1)
      : 1;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE CULINARY PERFORMANCE HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/kitchen"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1"
            >
              Live KDS Monitor <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Culinary SLA &amp; Throughput</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Activity size={24} className="text-servora-core" /> Kitchen Performance &amp; SLA Analytics
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Station-level cook speed, median vs. mean prep latency, staff execution throughput, and peak rush telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          <button
            onClick={handleExportReport}
            disabled={!data || data.summary.totalProcessed === 0}
            className="px-3.5 py-2 bg-slate-100 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <Download size={14} className="text-servora-core" /> Export SLA Report
          </button>

          <button
            onClick={fetchPerformance}
            className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-servora-navy hover:bg-gray-50 transition-colors shadow-xs flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />{' '}
            Refresh Metrics
          </button>
        </div>
      </div>

      {/* 2. MULTI-DIMENSIONAL ANALYTICS FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Branch Kitchens ({branches.length})</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>

        <select
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Prep Stations</option>
          {stations.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Service Channels</option>
          <option value="Dine-In">Dine-In</option>
          <option value="Standard Dining Room">Standard Dining Room</option>
          <option value="Takeaway">Takeaway</option>
          <option value="Express Counter & Takeaway">Express Counter</option>
          <option value="Delivery">Delivery</option>
          <option value="Lounge & Bar Tabs">Lounge &amp; Bar Tabs</option>
        </select>

        <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1">
          <span className="text-[10px] font-bold uppercase text-gray-400">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-xs font-mono font-bold text-servora-navy focus:outline-none flex-1"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1 flex-1">
            <span className="text-[10px] font-bold uppercase text-gray-400">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-servora-navy focus:outline-none flex-1"
            />
          </div>
          {(branchFilter !== 'ALL' ||
            stationFilter !== 'ALL' ||
            channelFilter !== 'ALL' ||
            startDate ||
            endDate) && (
            <button
              onClick={() => {
                setBranchFilter('ALL');
                setStationFilter('ALL');
                setChannelFilter('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-[11px] cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex items-center justify-center h-48 text-xs text-servora-deepTeal animate-pulse">
          Aggregating culinary SLA &amp; throughput telemetry...
        </div>
      ) : !data ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
          No performance telemetry available for the selected filters.
        </div>
      ) : (
        <>
          {/* 3. EXECUTIVE KPI CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Avg / Median Cook Time
                </p>
                <h3 className="text-xl font-bold font-mono text-servora-navy mt-1">
                  {data.summary.avgPrepTimeMinutes}m{' '}
                  <span className="text-xs font-normal text-gray-500">
                    / {data.summary.medianPrepTimeMinutes}m med
                  </span>
                </h3>
                <span className="text-[11px] text-gray-500 font-medium block mt-1">
                  Total O2C cycle: {data.summary.avgCycleTimeMinutes}m
                </span>
              </div>
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-servora-core shrink-0">
                <Clock size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  SLA On-Time Fulfillment
                </p>
                <h3
                  className={`text-xl font-bold font-mono mt-1 ${
                    data.summary.onTimeRatePercentage >= 85
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {data.summary.onTimeRatePercentage}%
                </h3>
                <span className="text-[11px] text-servora-deepTeal font-medium mt-1 block">
                  Target Benchmark: &ge; 90%
                </span>
              </div>
              <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                <ShieldCheck size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Culinary Output Volume
                </p>
                <h3 className="text-xl font-bold font-mono text-servora-navy mt-1">
                  {data.summary.totalDishesPlated.toLocaleString()} Dishes
                </h3>
                <span className="text-[11px] text-gray-500 font-medium mt-1 block">
                  Across {data.summary.totalProcessed} tickets ({data.summary.cancelledTickets}{' '}
                  voided)
                </span>
              </div>
              <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                <BarChart3 size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  SLA Breaches (Overdue)
                </p>
                <h3
                  className={`text-xl font-bold font-mono mt-1 ${
                    data.summary.delayedOrders > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {data.summary.delayedOrders} Tickets
                </h3>
                <span className="text-[11px] text-gray-500 font-medium mt-1 block">
                  Exceeded item cook SLA
                </span>
              </div>
              <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle size={22} />
              </div>
            </div>
          </div>

          {/* 4. STATION SLA & CHANNEL THROUGHPUT MATRIX */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Station SLA Performance */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <span className="font-bold text-servora-navy text-sm flex items-center gap-1.5">
                  <Layers size={15} className="text-servora-core" /> Prep Station SLA &amp; Dish
                  Throughput
                </span>
                <span className="text-[11px] text-gray-400">
                  {data.stationBreakdown.length} Active Stations
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-gray-200 text-[10.5px] font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="p-3.5">Prep Station</th>
                      <th className="p-3.5 text-right">Tickets</th>
                      <th className="p-3.5 text-right">Dishes Plated</th>
                      <th className="p-3.5 text-right">Avg Prep / Target</th>
                      <th className="p-3.5 text-right">On-Time SLA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {data.stationBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400">
                          No station execution metrics recorded yet.
                        </td>
                      </tr>
                    ) : (
                      data.stationBreakdown.map((st) => (
                        <tr key={st.station} className="hover:bg-slate-50/60">
                          <td className="p-3.5 font-bold text-servora-navy">{st.station}</td>
                          <td className="p-3.5 text-right font-mono">{st.ticketsCount}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-servora-core">
                            {st.dishesCount}
                          </td>
                          <td className="p-3.5 text-right font-mono">
                            <strong>{st.avgPrepMins}m</strong>{' '}
                            <span className="text-gray-400">/ {st.targetSlaMins}m</span>
                          </td>
                          <td className="p-3.5 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                                st.onTimeRatePct >= 85
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {st.onTimeRatePct}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Service Channel Speed Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 font-bold text-servora-navy text-sm flex items-center gap-1.5">
                <Utensils size={15} className="text-servora-core" /> Speed by Service Channel
              </div>
              <div className="p-4 space-y-3 flex-1">
                {data.channelBreakdown.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">
                    No channel data recorded.
                  </p>
                ) : (
                  data.channelBreakdown.map((ch) => (
                    <div
                      key={ch.channel}
                      className="p-3 bg-slate-50 rounded-xl border border-gray-100 space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-servora-navy">{ch.channel}</span>
                        <span className="font-mono font-bold text-servora-core">
                          {ch.avgPrepMins}m avg
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-500">
                        <span>{ch.ticketsCount} completed orders</span>
                        <span className="font-mono font-semibold text-emerald-700">
                          {ch.onTimeRatePct}% on-time
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 5. STAFF CULINARY EXECUTION & HOURLY PEAK RUSH */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Staff Culinary Execution Throughput */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 font-bold text-servora-navy text-sm flex items-center gap-1.5">
                <ChefHat size={15} className="text-emerald-600" /> Staff Culinary Execution &amp;
                Bump Velocity
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-gray-200 text-[10.5px] font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="p-3.5">Team Member</th>
                      <th className="p-3.5 text-right">Tickets Bumped</th>
                      <th className="p-3.5 text-right">Dishes Plated</th>
                      <th className="p-3.5 text-right">Avg Prep</th>
                      <th className="p-3.5 text-right">SLA Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {data.staffLeaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400">
                          No staff execution logs available.
                        </td>
                      </tr>
                    ) : (
                      data.staffLeaderboard.map((st) => (
                        <tr key={st.staffName} className="hover:bg-slate-50/60">
                          <td className="p-3.5 font-bold text-servora-navy flex items-center gap-1.5">
                            <UserCheck size={13} className="text-servora-core shrink-0" />
                            <span>{st.staffName}</span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold">
                            {st.ticketsCompleted}
                          </td>
                          <td className="p-3.5 text-right font-mono">{st.dishesPrepared}</td>
                          <td className="p-3.5 text-right font-mono text-servora-core font-bold">
                            {st.avgPrepMins}m
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                            {st.onTimeRatePct}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hourly Peak Kitchen Rush Distribution */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 font-bold text-servora-navy text-sm flex items-center gap-1.5">
                <Flame size={15} className="text-amber-500" /> Hourly Kitchen Demand &amp; Rush
                Distribution
              </div>
              <div className="p-4 space-y-2.5 flex-1 overflow-y-auto max-h-72">
                {data.hourlyRush.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">
                    No hourly rush distribution recorded yet.
                  </p>
                ) : (
                  data.hourlyRush.map((h) => {
                    const widthPct = Math.max(8, Math.round((h.ticketsCount / maxHourlyTickets) * 100));
                    return (
                      <div key={h.hour} className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-servora-navy">{h.label}</span>
                          <span className="text-[11px] font-mono text-gray-500">
                            <strong>{h.ticketsCount}</strong> tickets ({h.dishesCount} dishes) &bull;{' '}
                            {h.avgPrepMins}m avg
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-servora-core rounded-full"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 6. RECENT ORDER EXECUTION SPEEDS TABLE */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <span className="font-bold text-servora-navy text-sm">
                Recent Order Execution Speeds &amp; Staff Custody
              </span>
              <Link
                href="/kitchen/history"
                className="text-xs font-bold text-servora-core hover:underline"
              >
                Full Execution Audit Log &rarr;
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-gray-200 text-[10.5px] font-bold text-gray-500 uppercase">
                  <tr>
                    <th className="p-3.5">Order &amp; Outlet</th>
                    <th className="p-3.5">Channel</th>
                    <th className="p-3.5">Stations</th>
                    <th className="p-3.5">Ordered By</th>
                    <th className="p-3.5">Completed By</th>
                    <th className="p-3.5">Prep / Target SLA</th>
                    <th className="p-3.5">SLA Status</th>
                    <th className="p-3.5">Completed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-medium text-servora-navy">
                  {data.recentExecutions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-gray-400">
                        No completed orders recorded yet.
                      </td>
                    </tr>
                  ) : (
                    data.recentExecutions.map((exec) => (
                      <tr key={exec.id} className="hover:bg-slate-50/60">
                        <td className="p-3.5">
                          <span className="font-bold font-mono block">{exec.orderNumber}</span>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Building2 size={10} /> {exec.branchName}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="bg-slate-100 text-servora-navy font-semibold px-2 py-0.5 rounded">
                            {exec.orderType}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {exec.stations.map((st) => (
                              <span
                                key={st}
                                className="px-1.5 py-0.2 bg-blue-50 text-servora-core border border-blue-100 rounded text-[9.5px] font-mono font-bold"
                              >
                                {st}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 font-semibold">{exec.placedByName}</td>
                        <td className="p-3.5 font-semibold text-emerald-800">
                          {exec.completedByName}
                        </td>
                        <td className="p-3.5 font-mono">
                          <strong className="text-servora-core">{exec.durationMins}m</strong>{' '}
                          <span className="text-gray-400">/ {exec.targetSlaMins}m</span>
                        </td>
                        <td className="p-3.5">
                          {!exec.isDelayed ? (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1">
                              <CheckCircle2 size={11} /> On-Time
                            </span>
                          ) : (
                            <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1">
                              <AlertTriangle size={11} /> Delayed SLA
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-gray-500 font-mono">
                          {new Date(exec.updatedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}