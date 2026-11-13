'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  History,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronRight,
  Building2,
  UserCheck,
  ChefHat,
  AlertTriangle,
  Download,
  Eye,
  X,
  Utensils,
  Timer,
  ShieldCheck,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface HistoryItemLine {
  id: number;
  quantity: number;
  name: string;
  station: string;
  targetPrepMins: number;
  notes?: string | null;
}

interface AuditStep {
  action: string;
  reason: string | null;
  actorName: string;
  actorRole: string;
  timestamp: string;
}

interface HistoryTicket {
  id: number;
  branchId: number | null;
  branchName: string;
  orderNumber: string;
  orderType: string;
  tableName: string | null;
  customerName: string | null;
  status: string;
  paymentStatus: string;
  total: number;
  placedByName: string;
  placedByRole: string;
  completedByName: string;
  completedByRole: string;
  createdAt: string;
  firedAt: string | null;
  readyAt: string;
  completedAt: string;
  prepDurationMinutes: number;
  totalCycleMinutes: number;
  targetSlaMinutes: number;
  isDelayed: boolean;
  stationsInvolved: string[];
  items: HistoryItemLine[];
  auditTimeline: AuditStep[];
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

export default function KitchenHistoryPage() {
  const [history, setHistory] = useState<HistoryTicket[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Multi-Dimensional Audit Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [stationFilter, setStationFilter] = useState('ALL');
  const [slaFilter, setSlaFilter] = useState<'ALL' | 'ON_TIME' | 'DELAYED'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Custody & Timeline Drill-Down Modal
  const [inspectedTicket, setInspectedTicket] = useState<HistoryTicket | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (branchFilter !== 'ALL') params.set('branchId', branchFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (channelFilter !== 'ALL') params.set('orderType', channelFilter);
      if (stationFilter !== 'ALL') params.set('station', stationFilter);
      if (slaFilter !== 'ALL') params.set('slaStatus', slaFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const [histRes, branchRes, stationRes] = await Promise.all([
        fetchApi(`/api/v1/kitchen/history?${params.toString()}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
        fetchApi('/api/v1/kitchen/stations-meta').catch(() => ({ data: [] })),
      ]);

      if (histRes?.data) setHistory(histRes.data);
      if (branchRes?.data && Array.isArray(branchRes.data)) setBranches(branchRes.data);
      if (stationRes?.data && Array.isArray(stationRes.data)) setStations(stationRes.data);
    } catch (error) {
      console.error('Failed to load kitchen execution history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    branchFilter,
    statusFilter,
    channelFilter,
    stationFilter,
    slaFilter,
    startDate,
    endDate,
    searchQuery,
  ]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchHistory();
    }, 250);
    return () => clearTimeout(debounce);
  }, [fetchHistory]);

  const metrics = useMemo(() => {
    const valid = history.filter((t) => t.status !== 'Cancelled');
    const cancelledCount = history.filter((t) => t.status === 'Cancelled').length;
    const onTimeCount = valid.filter((t) => !t.isDelayed).length;
    const delayedCount = valid.filter((t) => t.isDelayed).length;

    const avgPrepMins =
      valid.length > 0
        ? Math.round(valid.reduce((s, t) => s + t.prepDurationMinutes, 0) / valid.length)
        : 0;
    const avgCycleMins =
      valid.length > 0
        ? Math.round(valid.reduce((s, t) => s + t.totalCycleMinutes, 0) / valid.length)
        : 0;
    const slaCompliancePct =
      valid.length > 0 ? Math.round((onTimeCount / valid.length) * 100) : 100;

    return {
      totalCount: history.length,
      cancelledCount,
      delayedCount,
      avgPrepMins,
      avgCycleMins,
      slaCompliancePct,
    };
  }, [history]);

  const handleExportCsv = () => {
    if (history.length === 0) return;
    const headers = [
      'Order Number',
      'Branch',
      'Channel',
      'Table/Location',
      'Status',
      'Placed By',
      'Completed By',
      'Stations',
      'Prep Duration (Mins)',
      'Total Cycle (Mins)',
      'Target SLA (Mins)',
      'SLA Compliance',
      'Ordered At',
      'Completed At',
      'Items',
    ];

    const rows = history.map((t) => [
      t.orderNumber,
      t.branchName,
      t.orderType,
      t.tableName || '',
      t.status,
      `${t.placedByName} (${t.placedByRole})`,
      `${t.completedByName} (${t.completedByRole})`,
      t.stationsInvolved.join(' | '),
      t.prepDurationMinutes,
      t.totalCycleMinutes,
      t.targetSlaMinutes,
      t.status === 'Cancelled' ? 'VOIDED' : t.isDelayed ? 'SLA_BREACH' : 'ON_TIME',
      new Date(t.createdAt).toISOString(),
      new Date(t.completedAt).toISOString(),
      t.items.map((i) => `${i.quantity}x ${i.name}`).join('; '),
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `servora-kds-execution-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setBranchFilter('ALL');
    setStatusFilter('ALL');
    setChannelFilter('ALL');
    setStationFilter('ALL');
    setSlaFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] space-y-4 font-sans">
      {/* 1. EXECUTIVE KDS AUDIT HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs shrink-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/kitchen"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1"
            >
              Live KDS Monitor <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Culinary Execution &amp; SLA Audit</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <History size={24} className="text-servora-core" /> Kitchen Execution History &amp; Custody Log
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            End-to-end traceability of who placed each ticket, which prep stations executed it, cook-to-bump durations, and SLA adherence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          <button
            onClick={handleExportCsv}
            disabled={history.length === 0}
            className="px-3.5 py-2 bg-slate-100 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <Download size={14} className="text-servora-core" /> Export Audit CSV
          </button>

          <button
            onClick={fetchHistory}
            title="Refresh Execution History"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 2. CULINARY PERFORMANCE & SLA TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 shrink-0">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Audited Tickets</span>
            <p className="text-lg font-bold font-mono text-servora-navy mt-0.5">
              {metrics.totalCount} Orders
            </p>
            <span className="text-[10px] text-gray-500">
              {metrics.cancelledCount} cancelled / voided
            </span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <History size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Avg Kitchen Cook Time</span>
            <p className="text-lg font-bold font-mono text-servora-core mt-0.5">
              {metrics.avgPrepMins} mins
            </p>
            <span className="text-[10px] text-gray-500">
              Total O2C cycle: {metrics.avgCycleMins}m
            </span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Timer size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">SLA On-Time Rate</span>
            <p
              className={`text-lg font-bold font-mono mt-0.5 ${metrics.slaCompliancePct >= 85 ? 'text-emerald-700' : 'text-amber-700'
                }`}
            >
              {metrics.slaCompliancePct}%
            </p>
            <span className="text-[10px] text-gray-500">
              {metrics.delayedCount} SLA breaches
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">SLA Overdue Tickets</span>
            <p
              className={`text-lg font-bold font-mono mt-0.5 ${metrics.delayedCount > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
            >
              {metrics.delayedCount} Delayed
            </p>
            <span className="text-[10px] text-gray-500">Exceeded station target</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* 3. MULTI-DIMENSIONAL FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs shrink-0 space-y-2.5 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={14}
            />
            <input
              type="text"
              placeholder="Search order #, table, staff, dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
            />
          </div>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Branch Outlets ({branches.length})</option>
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Terminal States</option>
            <option value="Completed">Completed / Dispatched</option>
            <option value="Ready">Ready on Pass</option>
            <option value="Served">Served at Table</option>
            <option value="Cancelled">Cancelled / Voided</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-gray-100">
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

          <select
            value={slaFilter}
            onChange={(e) => setSlaFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All SLA Outcomes</option>
            <option value="ON_TIME">Within Target SLA (On-Time)</option>
            <option value="DELAYED">SLA Breach (Delayed)</option>
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
            {(searchQuery ||
              branchFilter !== 'ALL' ||
              statusFilter !== 'ALL' ||
              channelFilter !== 'ALL' ||
              stationFilter !== 'ALL' ||
              slaFilter !== 'ALL' ||
              startDate ||
              endDate) && (
                <button
                  onClick={resetFilters}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-[11px] cursor-pointer"
                >
                  Reset
                </button>
              )}
          </div>
        </div>
      </div>

      {/* 4. EXECUTION AUDIT LEDGER TABLE */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
        {isLoading && history.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-servora-deepTeal animate-pulse">
            Loading culinary execution &amp; custody audit log...
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
            <History size={48} className="mb-3 opacity-20 text-servora-core" />
            <p className="text-base font-bold text-servora-navy">No Kitchen Execution Records Found</p>
            <p className="text-xs mt-1 text-gray-500">
              Completed, bumped, or cancelled tickets matching your filters will appear here.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 border-b border-gray-200 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider z-10">
                <tr>
                  <th className="p-3.5">Ticket &amp; Outlet</th>
                  <th className="p-3.5">Channel / Table</th>
                  <th className="p-3.5">Ordered By (FOH)</th>
                  <th className="p-3.5">Prepared &amp; Bumped By (BOH)</th>
                  <th className="p-3.5">Stations &amp; Dishes</th>
                  <th className="p-3.5">Prep &amp; Cycle Time</th>
                  <th className="p-3.5">State</th>
                  <th className="p-3.5 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {history.map((ticket) => {
                  const isSuccessState = ['Completed', 'Ready', 'Served'].includes(ticket.status);

                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-blue-50/30 transition-colors align-top"
                    >
                      {/* Ticket & Outlet */}
                      <td className="p-3.5">
                        <span className="font-bold font-mono text-servora-navy block">
                          {ticket.orderNumber}
                        </span>
                        <span className="text-[10.5px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Building2 size={10} /> {ticket.branchName}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
                          {new Date(ticket.createdAt).toLocaleDateString()} &bull;{' '}
                          {new Date(ticket.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Channel / Table */}
                      <td className="p-3.5">
                        <span className="text-[10.5px] font-bold bg-slate-100 text-servora-navy px-2 py-0.5 rounded-md inline-block">
                          {ticket.orderType}
                        </span>
                        {ticket.tableName && (
                          <span className="text-[11px] text-gray-600 flex items-center gap-1 mt-1 font-medium">
                            <Utensils size={10} className="text-servora-core" /> {ticket.tableName}
                          </span>
                        )}
                      </td>

                      {/* Ordered By (FOH) */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 font-bold text-servora-navy">
                          <UserCheck size={13} className="text-servora-core shrink-0" />
                          <span>{ticket.placedByName}</span>
                        </div>
                      </td>

                      {/* Prepared & Bumped By (BOH) */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 font-bold text-servora-navy">
                          <ChefHat size={13} className="text-emerald-600 shrink-0" />
                          <span>{ticket.completedByName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
                          {new Date(ticket.completedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Stations & Dishes */}
                      <td className="p-3.5 max-w-xs">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {ticket.stationsInvolved.map((st) => (
                            <span
                              key={st}
                              className="px-1.5 py-0.2 bg-blue-50 text-servora-core border border-blue-100 rounded text-[9.5px] font-mono font-bold"
                            >
                              {st}
                            </span>
                          ))}
                        </div>
                        <p className="text-gray-600 text-[11px] line-clamp-2">
                          {ticket.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                      </td>

                      {/* Prep & Cycle Time vs SLA */}
                      <td className="p-3.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${ticket.status === 'Cancelled'
                              ? 'bg-gray-100 text-gray-500'
                              : ticket.isDelayed
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                          >
                            Prep: {ticket.prepDurationMinutes}m
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 block mt-1">
                          Total: {ticket.totalCycleMinutes}m (SLA: {ticket.targetSlaMinutes}m)
                        </span>
                      </td>

                      {/* State */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isSuccessState
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                        >
                          {isSuccessState ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          {ticket.status}
                        </span>
                      </td>

                      {/* Timeline Drill-Down */}
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setInspectedTicket(ticket)}
                          title="Inspect Full Custody & SLA Timeline"
                          className="p-1.5 bg-slate-50 border border-gray-200 rounded-lg text-servora-navy hover:text-servora-core hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. CUSTODY & EXECUTION TIMELINE DRILL-DOWN MODAL */}
      {inspectedTicket && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-servora-navy">
                  {inspectedTicket.orderNumber} &bull; Execution Audit Trail
                </h3>
                <p className="text-[11px] text-gray-500">
                  {inspectedTicket.branchName} &bull; {inspectedTicket.orderType}{' '}
                  {inspectedTicket.tableName ? `(${inspectedTicket.tableName})` : ''}
                </p>
              </div>
              <button
                onClick={() => setInspectedTicket(null)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Staff Custody & Timing Summary */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-gray-200 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400 block">
                  Ordered By (FOH)
                </span>
                <span className="font-bold text-servora-navy block mt-0.5">
                  {inspectedTicket.placedByName}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400 block">
                  Prepared &amp; Bumped By (BOH)
                </span>
                <span className="font-bold text-emerald-700 block mt-0.5">
                  {inspectedTicket.completedByName}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400 block">
                  Completed By (BOH)
                </span>
                <span className="font-bold text-emerald-700 block mt-0.5">
                  {inspectedTicket.completedByName}
                </span>
                <span className="text-[10px] font-mono text-gray-500">
                  {inspectedTicket.completedByRole}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">
                  Kitchen Prep Time
                </span>
                <span className="font-mono font-bold text-servora-core">
                  {inspectedTicket.prepDurationMinutes} mins (Target: {inspectedTicket.targetSlaMinutes}m)
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">
                  Total Fulfillment Cycle
                </span>
                <span className="font-mono font-bold text-servora-navy">
                  {inspectedTicket.totalCycleMinutes} mins
                </span>
              </div>
            </div>

            {/* Itemized Dishes & Station Routing */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-servora-navy block">Prepared Line Items:</span>
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                {inspectedTicket.items.map((line) => (
                  <div key={line.id} className="p-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-servora-navy">
                        {line.quantity}x {line.name}
                      </span>
                      {line.notes && (
                        <span className="text-[10.5px] text-amber-700 block">
                          Note: {line.notes}
                        </span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 bg-blue-50 text-servora-core rounded font-mono text-[10px] font-bold">
                      {line.station}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Immutable Audit Event Timeline */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-servora-navy block">
                Immutable System &amp; KDS Event Log:
              </span>
              {inspectedTicket.auditTimeline.length > 0 ? (
                <div className="space-y-2 border-l-2 border-servora-core/30 pl-3 ml-1">
                  {inspectedTicket.auditTimeline.map((ev, idx) => (
                    <div key={idx} className="text-[11px]">
                      <div className="flex justify-between font-bold text-servora-navy">
                        <span>{ev.action.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-gray-400">
                          {new Date(ev.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      {ev.reason && <p className="text-gray-600">{ev.reason}</p>}
                      <span className="text-[10px] text-gray-400 font-mono">
                        By {ev.actorName} ({ev.actorRole})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic">
                  Order created at {new Date(inspectedTicket.createdAt).toLocaleString()} and finalized at{' '}
                  {new Date(inspectedTicket.completedAt).toLocaleString()}.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setInspectedTicket(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}