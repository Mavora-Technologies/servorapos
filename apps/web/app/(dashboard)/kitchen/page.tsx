'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  PlayCircle,
  Flame,
  RefreshCw,
  Building2,
  Utensils,
  ChevronRight,
  AlertTriangle,
  CheckSquare,
  Square,
  Search,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface KitchenItem {
  id: number;
  quantity: number;
  name: string;
  station: string;
  kitchenStatus: 'New' | 'Preparing' | 'Ready';
  prepTimeMinutes?: number;
  notes?: string | null;
  modifiers?: { name: string }[];
}

interface KitchenTicket {
  id: number;
  branchId: number | null;
  branchName: string | null;
  orderNumber: string;
  orderType: string;
  tableName?: string | null;
  customerName?: string | null;
  notes?: string | null;
  status: 'Confirmed' | 'Preparing';
  paymentStatus: string;
  createdAt: string;
  items: KitchenItem[];
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

interface KitchenPerformance {
  summary: {
    totalProcessed: number;
    avgPrepTimeMinutes: number;
    onTimeRatePercentage: number;
    delayedOrders: number;
  };
}

export default function KitchenDisplayPage() {
  const [stations, setStations] = useState<string[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [perfStats, setPerfStats] = useState<KitchenPerformance | null>(null);

  const [activeStation, setActiveStation] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [stageFilter, setStageFilter] = useState<'ALL' | 'Confirmed' | 'Preparing'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const fetchKitchenTelemetry = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (activeStation !== 'ALL') params.set('station', activeStation);
      if (branchFilter !== 'ALL') params.set('branchId', branchFilter);

      const branchQuery = branchFilter !== 'ALL' ? `?branchId=${branchFilter}` : '';

      const [ticketsRes, stationsRes, branchesRes, perfRes] = await Promise.all([
        fetchApi(`/api/v1/kitchen/tickets?${params.toString()}`),
        fetchApi('/api/v1/kitchen/stations-meta').catch(() => ({ data: [] })),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
        fetchApi(`/api/v1/kitchen/performance${branchQuery}`).catch(() => ({ data: null })),
      ]);

      if (ticketsRes?.data) setTickets(ticketsRes.data);
      if (stationsRes?.data && Array.isArray(stationsRes.data)) setStations(stationsRes.data);
      if (branchesRes?.data && Array.isArray(branchesRes.data)) setBranches(branchesRes.data);
      if (perfRes?.data) setPerfStats(perfRes.data);
      setNowTick(Date.now());
    } catch (error) {
      console.error('Failed to synchronize KDS telemetry:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeStation, branchFilter]);

  useEffect(() => {
    fetchKitchenTelemetry();
    const pollInterval = setInterval(fetchKitchenTelemetry, 10000);
    const clockInterval = setInterval(() => setNowTick(Date.now()), 30000);
    return () => {
      clearInterval(pollInterval);
      clearInterval(clockInterval);
    };
  }, [fetchKitchenTelemetry]);

  const handleUpdateTicketStatus = async (id: number, newStatus: string) => {
    try {
      await fetchApi(`/api/v1/kitchen/tickets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (newStatus === 'Ready' || newStatus === 'Cancelled') {
        setTickets((prev) => prev.filter((t) => t.id !== id));
      } else {
        setTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: newStatus as any } : t))
        );
      }
    } catch (error: any) {
      alert(error.message || 'Failed to update ticket status');
    }
  };

  const handleToggleLineItemReady = async (ticketId: number, item: KitchenItem) => {
    const nextItemStatus = item.kitchenStatus === 'Ready' ? 'Preparing' : 'Ready';
    try {
      await fetchApi(`/api/v1/kitchen/items/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ kitchenStatus: nextItemStatus }),
      });

      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                items: t.items.map((i) =>
                  i.id === item.id ? { ...i, kitchenStatus: nextItemStatus } : i
                ),
              }
            : t
        )
      );
    } catch (err: any) {
      console.error('Failed to toggle item status:', err);
    }
  };

  const getElapsedTime = (createdAt: string) => {
    return Math.max(0, Math.floor((nowTick - new Date(createdAt).getTime()) / 60000));
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (stageFilter !== 'ALL' && t.status !== stageFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchOrder = t.orderNumber.toLowerCase().includes(q);
        const matchTable = t.tableName?.toLowerCase().includes(q);
        const matchDish = t.items.some((i) => i.name.toLowerCase().includes(q));
        if (!matchOrder && !matchTable && !matchDish) return false;
      }
      return true;
    });
  }, [tickets, stageFilter, searchQuery]);

  const kdsMetrics = useMemo(() => {
    const queuedCount = tickets.filter((t) => t.status === 'Confirmed').length;
    const cookingCount = tickets.filter((t) => t.status === 'Preparing').length;
    const slaBreaches = tickets.filter((t) => getElapsedTime(t.createdAt) > 12).length;
    return { queuedCount, cookingCount, slaBreaches };
  }, [tickets, nowTick]);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] space-y-4 font-sans">
      {/* 1. EXECUTIVE KDS COMMAND HEADER */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs shrink-0 space-y-3">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Link
                href="/orders/open"
                className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1"
              >
                FOH Dispatch <ChevronRight size={12} />
              </Link>
              <span className="text-xs font-bold text-servora-navy">Culinary Execution & KDS</span>
            </div>
            <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
              <ChefHat size={24} className="text-servora-core" /> Kitchen Display & Station Monitor
            </h1>
          </div>

          {/* Dynamic Station Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-between xl:justify-end">
            <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
              <button
                onClick={() => setActiveStation('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeStation === 'ALL'
                    ? 'bg-servora-navy text-white shadow-xs'
                    : 'text-gray-600 hover:text-servora-navy'
                }`}
              >
                All Expediter Queue ({tickets.length})
              </button>
              {stations.map((st) => (
                <button
                  key={st}
                  onClick={() => setActiveStation(st)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    activeStation === st
                      ? 'bg-servora-navy text-white shadow-xs'
                      : 'text-gray-600 hover:text-servora-navy'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              onClick={fetchKitchenTelemetry}
              title="Refresh KDS Queue"
              className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
            </button>
          </div>
        </div>

        {/* Multi-Branch, Stage & Search Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-gray-100 text-xs">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search order #, table, or dish..."
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
            <option value="ALL">All Branch Kitchens ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Kitchen Stages</option>
            <option value="Confirmed">New / Queued ({kdsMetrics.queuedCount})</option>
            <option value="Preparing">Cooking / In Prep ({kdsMetrics.cookingCount})</option>
          </select>
        </div>
      </div>

      {/* 2. KDS SLA TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">New Queue</span>
            <p className="text-base font-bold font-mono text-servora-navy mt-0.5">{kdsMetrics.queuedCount} Tickets</p>
          </div>
          <div className="p-2 bg-slate-100 text-servora-navy rounded-xl">
            <Clock size={16} />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Active Fire / Prep</span>
            <p className="text-base font-bold font-mono text-servora-core mt-0.5">{kdsMetrics.cookingCount} Cooking</p>
          </div>
          <div className="p-2 bg-blue-50 text-servora-core rounded-xl">
            <ChefHat size={16} />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">SLA Warnings (&gt;12m)</span>
            <p
              className={`text-base font-bold font-mono mt-0.5 ${
                kdsMetrics.slaBreaches > 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {kdsMetrics.slaBreaches} Delayed
            </p>
          </div>
          <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={16} />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Avg Ticket Prep</span>
            <p className="text-base font-bold font-mono text-emerald-700 mt-0.5">
              {perfStats?.summary.avgPrepTimeMinutes || 0} mins
            </p>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={16} />
          </div>
        </div>
      </div>

      {/* 3. TICKET GRID */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-6">
        {isLoading && tickets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-servora-deepTeal animate-pulse">
            Loading live kitchen queue...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300 p-12">
            <CheckCircle2 size={48} className="mb-3 opacity-20 text-emerald-500" />
            <p className="text-base font-bold text-servora-navy">Station Clear!</p>
            <p className="text-xs mt-1 text-gray-500">No active tickets waiting in this queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredTickets.map((ticket) => {
              const elapsedMins = getElapsedTime(ticket.createdAt);
              const isDelayed = elapsedMins > 12;

              return (
                <div
                  key={ticket.id}
                  className={`flex flex-col rounded-2xl border shadow-xs overflow-hidden transition-all ${
                    ticket.status === 'Preparing'
                      ? 'bg-blue-50/20 border-blue-200'
                      : isDelayed
                      ? 'bg-rose-50/20 border-rose-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  {/* Ticket Header */}
                  <div
                    className={`p-3.5 border-b flex justify-between items-start text-white ${
                      ticket.status === 'Preparing'
                        ? 'bg-servora-core'
                        : isDelayed
                        ? 'bg-rose-600'
                        : 'bg-servora-navy'
                    }`}
                  >
                    <div>
                      <div className="font-bold font-mono text-base tracking-wider flex items-center gap-1.5">
                        {ticket.orderNumber}
                        {isDelayed && <Flame size={15} className="text-yellow-300 animate-bounce" />}
                      </div>
                      <div className="text-[11px] text-white/80 flex items-center gap-1.5 mt-0.5">
                        <Utensils size={11} />
                        <span className="font-semibold">{ticket.tableName || ticket.orderType}</span>
                      </div>
                      {ticket.branchName && (
                        <div className="text-[10px] text-white/70 flex items-center gap-1 mt-0.5">
                          <Building2 size={10} /> {ticket.branchName}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded">
                        {ticket.orderType}
                      </span>
                      <div className="flex items-center gap-1 font-mono text-xs bg-black/20 px-2 py-0.5 rounded">
                        <Clock size={12} />
                        {elapsedMins}m
                      </div>
                    </div>
                  </div>

                  {/* Interactive Line-Item Prep Checklist */}
                  <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5">
                    {ticket.notes && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-semibold text-amber-900">
                        Note: {ticket.notes}
                      </div>
                    )}

                    <ul className="space-y-2">
                      {ticket.items.map((item) => {
                        const isItemReady = item.kitchenStatus === 'Ready';
                        return (
                          <li
                            key={item.id}
                            onClick={() => handleToggleLineItemReady(ticket.id, item)}
                            className={`flex items-start justify-between p-2 rounded-xl border cursor-pointer transition-colors ${
                              isItemReady
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 line-through opacity-75'
                                : 'bg-slate-50/60 border-gray-100 text-servora-navy hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              {isItemReady ? (
                                <CheckSquare size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                              ) : (
                                <Square size={15} className="text-gray-400 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <div className="text-xs font-bold leading-snug">
                                  <span className="font-mono text-servora-core mr-1">
                                    {item.quantity}x
                                  </span>
                                  {item.name}
                                </div>
                                {item.modifiers && item.modifiers.length > 0 && (
                                  <p className="text-[10px] text-gray-500 mt-0.5">
                                    {item.modifiers.map((m) => m.name).join(', ')}
                                  </p>
                                )}
                                {item.notes && (
                                  <p className="text-[10px] font-semibold text-amber-700 mt-0.5">
                                    * {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="text-[9.5px] font-mono text-gray-500 uppercase bg-white px-1.5 py-0.5 rounded border border-gray-200 shrink-0 ml-2">
                              {item.station}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 bg-gray-50 border-t border-gray-100 mt-auto">
                    {ticket.status === 'Confirmed' ? (
                      <button
                        onClick={() => handleUpdateTicketStatus(ticket.id, 'Preparing')}
                        className="w-full py-2.5 bg-white border-2 border-servora-core text-servora-core font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
                      >
                        <PlayCircle size={15} /> Fire Ticket &amp; Start Prep
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateTicketStatus(ticket.id, 'Ready')}
                        className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-xs hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
                      >
                        <CheckCircle2 size={15} /> Bump Ticket Ready
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}