// apps/web/app/(dashboard)/settings/audit-logs/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Search,
  Download,
  RefreshCw,
  ChevronRight,
  Eye,
  X,
  Clock,
  Layers,
  User,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Database,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface AuditLogRecord {
  id: number;
  tenantId: number;
  branchId: number | null;
  branchName: string | null;
  branchCode: string | null;
  userId: number | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface TelemetryData {
  totalEvents: number;
  eventsLast24Hours: number;
  activeActors: number;
  moduleBreakdown: { module: string; count: number }[];
}

interface FilterOptions {
  modules: string[];
  actions: string[];
  entityTypes: string[];
  actors: { id: number; name: string; email: string }[];
}

interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

const MODULE_BADGE_COLORS: Record<string, string> = {
  AUTH: 'bg-purple-50 text-purple-700 border-purple-200',
  SECURITY: 'bg-rose-50 text-rose-700 border-rose-200',
  POS: 'bg-blue-50 text-servora-core border-blue-200',
  FINANCE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TREASURY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INVENTORY: 'bg-amber-50 text-amber-800 border-amber-200',
  MENU: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  WORKFORCE_HCM: 'bg-cyan-50 text-cyan-800 border-cyan-200',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    modules: [],
    actions: [],
    entityTypes: [],
    actors: [],
  });
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  // Feedback States
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedActorId, setSelectedActorId] = useState('ALL');
  const [selectedEntityType, setSelectedEntityType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const buildFilterParams = useCallback(
    (extra?: Record<string, string>) => {
      const params = new URLSearchParams(extra);
      if (search.trim()) params.set('search', search.trim());
      if (selectedModule !== 'ALL') params.set('module', selectedModule);
      if (selectedAction !== 'ALL') params.set('action', selectedAction);
      if (selectedActorId !== 'ALL') params.set('userId', selectedActorId);
      if (selectedEntityType !== 'ALL') params.set('entityType', selectedEntityType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      return params;
    },
    [
      search,
      selectedModule,
      selectedAction,
      selectedActorId,
      selectedEntityType,
      startDate,
      endDate,
    ]
  );

  const loadFilterOptionsAndTelemetry = useCallback(async () => {
    const [telResult, optResult] = await Promise.allSettled([
      fetchApi('/api/v1/settings/audit-logs/telemetry'),
      fetchApi('/api/v1/settings/audit-logs/filter-options'),
    ]);

    if (telResult.status === 'fulfilled' && telResult.value?.data) {
      setTelemetry(telResult.value.data);
    }
    if (optResult.status === 'fulfilled' && optResult.value?.data) {
      setFilterOptions(optResult.value.data);
    }
  }, []);

  const loadLogs = useCallback(
    async (targetPage = 1) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const params = buildFilterParams({
          page: String(targetPage),
          limit: String(pagination.limit),
        });

        const res = await fetchApi(`/api/v1/settings/audit-logs?${params.toString()}`);
        if (Array.isArray(res?.data)) {
          setLogs(res.data);
          if (res.pagination) {
            setPagination(res.pagination);
          }
        } else {
          setLogs([]);
          setLoadError('Unexpected response structure received from audit logs API.');
        }
      } catch (err: unknown) {
        setLogs([]);
        setLoadError(getErrorMessage(err, 'Failed to load compliance audit ledger.'));
      } finally {
        setIsLoading(false);
      }
    },
    [buildFilterParams, pagination.limit]
  );

  useEffect(() => {
    loadFilterOptionsAndTelemetry();
  }, [loadFilterOptionsAndTelemetry]);

  useEffect(() => {
    loadLogs(1);
  }, [
    selectedModule,
    selectedAction,
    selectedActorId,
    selectedEntityType,
    startDate,
    endDate,
    loadLogs,
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs(1);
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedModule !== 'ALL' ||
    selectedAction !== 'ALL' ||
    selectedActorId !== 'ALL' ||
    selectedEntityType !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  const handleClearFilters = () => {
    setSearch('');
    setSelectedModule('ALL');
    setSelectedAction('ALL');
    setSelectedActorId('ALL');
    setSelectedEntityType('ALL');
    setStartDate('');
    setEndDate('');
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (isExporting) return;
    setIsExporting(true);
    setActionError(null);
    setStatusBanner(null);

    try {
      const params = buildFilterParams({ format });
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('servora_token') || localStorage.getItem('token') || ''
          : '';

      const response = await fetch(
        `${apiBase}/api/v1/settings/audit-logs/export?${params.toString()}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Export failed with HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatusBanner(`Exported compliance audit log (${format.toUpperCase()}).`);
      loadFilterOptionsAndTelemetry();
      loadLogs(pagination.page);
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to export audit logs.'));
    } finally {
      setIsExporting(false);
    }
  };

  const diffKeys = useMemo(() => {
    if (!selectedLog) return [];
    const prev = selectedLog.previousValues || {};
    const next = selectedLog.newValues || {};
    return Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]));
  }, [selectedLog]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Feedback Banners */}
      {statusBanner && (
        <div
          role="status"
          className="p-3.5 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            aria-label="Dismiss notification"
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border bg-rose-50 border-rose-200 text-rose-900 text-xs font-semibold flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
            className="text-rose-700 hover:text-rose-950"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 1. EXECUTIVE HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core inline-flex items-center gap-1 transition-colors"
            >
              Enterprise Control <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Security &amp; Compliance</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <ShieldCheck className="text-servora-core" size={22} />
            Enterprise Audit Logs &amp; Compliance Ledger
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Immutable, append-only verification trail capturing user logins and all system mutations across POS, inventory, finance, and settings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileCode size={13} /> JSON
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              loadLogs(pagination.page);
              loadFilterOptionsAndTelemetry();
            }}
            disabled={isLoading}
            title="Refresh Ledger"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 2. COMPLIANCE TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Total Audit Events
            </span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {telemetry ? telemetry.totalEvents.toLocaleString() : '—'}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Database size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Events (24 Hours)
            </span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {telemetry ? telemetry.eventsLast24Hours.toLocaleString() : '—'}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Active Operators
            </span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {telemetry ? telemetry.activeActors : '—'}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <User size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Primary Module
            </span>
            <p className="text-sm font-bold font-mono text-servora-navy mt-1 truncate max-w-[130px]">
              {telemetry?.moduleBreakdown[0]?.module || 'N/A'}
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Layers size={18} />
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC QUERY & FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[210px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={14}
            />
            <input
              type="text"
              aria-label="Search audit events"
              placeholder="Search action, entity ID, actor, IP, or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
            />
          </div>

          <select
            aria-label="Filter by module"
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="ALL">All Modules</option>
            {filterOptions.modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by action"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer max-w-[180px]"
          >
            <option value="ALL">All Actions</option>
            {filterOptions.actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by entity type"
            value={selectedEntityType}
            onChange={(e) => setSelectedEntityType(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer max-w-[160px]"
          >
            <option value="ALL">All Entities</option>
            {filterOptions.entityTypes.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by operator"
            value={selectedActorId}
            onChange={(e) => setSelectedActorId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer max-w-[170px]"
          >
            <option value="ALL">All Operators</option>
            {filterOptions.actors.map((actor) => (
              <option key={actor.id} value={String(actor.id)}>
                {actor.name || actor.email}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2 py-1 rounded-xl">
            <Calendar size={13} className="text-gray-400" />
            <input
              type="date"
              aria-label="Start date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-[11px] font-mono text-servora-navy focus:outline-none"
              title="Start Date"
            />
            <span className="text-gray-400 text-xs">-</span>
            <input
              type="date"
              aria-label="End date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-[11px] font-mono text-servora-navy focus:outline-none"
              title="End Date"
            />
          </div>

          <button
            type="submit"
            className="px-3.5 py-1.5 bg-servora-core text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Search
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </form>
      </div>

      {/* 4. MASTER AUDIT LOG TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        {loadError ? (
          <div role="alert" className="p-12 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={20} />
            </div>
            <p className="text-xs font-bold text-rose-800">{loadError}</p>
            <button
              type="button"
              onClick={() => loadLogs(1)}
              className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
            >
              Retry Request
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th scope="col" className="py-2.5 px-3">Timestamp</th>
                  <th scope="col" className="py-2.5 px-3">Module</th>
                  <th scope="col" className="py-2.5 px-3">Action</th>
                  <th scope="col" className="py-2.5 px-3">Entity Target</th>
                  <th scope="col" className="py-2.5 px-3">Actor / Operator</th>
                  <th scope="col" className="py-2.5 px-3">Branch Location</th>
                  <th scope="col" className="py-2.5 px-3">IP Address</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      {isLoading
                        ? 'Loading compliance ledger...'
                        : 'No audit events found matching the active criteria.'}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const badgeCls =
                      MODULE_BADGE_COLORS[log.module] ||
                      'bg-blue-50 text-servora-core border-blue-200';
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('en-KE', {
                            dateStyle: 'medium',
                            timeStyle: 'medium',
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold font-mono border ${badgeCls}`}
                          >
                            {log.module}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-servora-navy">
                          {log.action}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono text-[11px]">
                            <span className="text-gray-500 font-medium">{log.entityType}: </span>
                            <span className="font-bold text-servora-navy">{log.entityId}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {log.actorName || log.actorEmail ? (
                            <div>
                              <span className="font-bold text-servora-navy block">
                                {log.actorName || log.actorEmail}
                              </span>
                              {log.actorEmail && (
                                <span className="text-[10px] text-gray-400 font-mono block">
                                  {log.actorEmail}
                                  {log.actorRole ? ` • ${log.actorRole}` : ''}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono text-gray-400 text-[11px]">
                              System / Cron
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-700">
                          {log.branchName
                            ? `${log.branchName}${log.branchCode ? ` (${log.branchCode})` : ''}`
                            : '—'}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-gray-500">
                          {log.ipAddress || '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="px-2 py-1 bg-slate-50 hover:bg-gray-100 text-servora-navy border border-gray-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={12} /> Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-3 border-t border-gray-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-500">
          <span>
            Showing page {pagination.page} of {pagination.totalPages} (
            {pagination.total.toLocaleString()} total recorded actions)
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => loadLogs(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg font-bold disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 font-mono font-bold text-servora-navy">{pagination.page}</span>
            <button
              type="button"
              onClick={() => loadLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg font-bold disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* 5. INSPECT AUDIT DETAIL & PAYLOAD DIFF MODAL */}
      {selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-detail-title"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold font-mono bg-blue-50 text-servora-core border border-blue-200">
                    {selectedLog.module}
                  </span>
                  <h2 id="audit-detail-title" className="font-mono text-xs font-bold text-servora-navy">
                    {selectedLog.action}
                  </h2>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Audit Record #{selectedLog.id} &bull;{' '}
                  {new Date(selectedLog.createdAt).toISOString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                aria-label="Close audit detail"
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Context Card */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Actor</span>
                <span className="font-bold text-servora-navy block">
                  {selectedLog.actorName || 'System Service'}
                </span>
                <span className="text-gray-500 text-[10px]">
                  {selectedLog.actorEmail || 'Internal'}
                  {selectedLog.actorRole ? ` (${selectedLog.actorRole})` : ''}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">
                  Target Entity
                </span>
                <span className="font-bold text-servora-navy block">{selectedLog.entityType}</span>
                <span className="text-gray-500 text-[10px]">ID: {selectedLog.entityId}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">
                  Branch Location
                </span>
                <span className="font-bold text-servora-navy block">
                  {selectedLog.branchName
                    ? `${selectedLog.branchName}${selectedLog.branchCode ? ` (${selectedLog.branchCode})` : ''}`
                    : 'Global / Tenant-Wide'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">
                  Client IP Address
                </span>
                <span className="font-bold text-servora-navy block">
                  {selectedLog.ipAddress || 'Not Captured'}
                </span>
              </div>
            </div>

            {/* Audit Reason Narrative */}
            {selectedLog.reason && (
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl text-xs">
                <span className="font-bold text-servora-navy block text-[11px] mb-0.5">
                  Operator Audit Narrative / Endpoint:
                </span>
                <p className="text-gray-700 leading-relaxed font-sans">{selectedLog.reason}</p>
              </div>
            )}

            {/* Side-by-side Payload Diff Viewer */}
            <div>
              <span className="font-bold text-servora-navy text-xs mb-2 flex items-center gap-1.5">
                <Lock size={13} className="text-servora-core" /> Mutation Differential (State
                Changes)
              </span>

              {diffKeys.length === 0 ? (
                <p className="text-xs text-gray-400 italic p-3 bg-slate-50 rounded-xl text-center">
                  No payload snapshot recorded for this event.
                </p>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                  <div className="grid grid-cols-12 bg-slate-100 font-bold p-2 text-[10px] uppercase text-gray-500 tracking-wider">
                    <div className="col-span-4">Attribute</div>
                    <div className="col-span-4 text-rose-700">Previous Value</div>
                    <div className="col-span-4 text-emerald-700">New Value</div>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto font-mono text-[11px]">
                    {diffKeys.map((key) => {
                      const prevVal = selectedLog.previousValues
                        ? selectedLog.previousValues[key]
                        : undefined;
                      const nextVal = selectedLog.newValues
                        ? selectedLog.newValues[key]
                        : undefined;
                      const isChanged = JSON.stringify(prevVal) !== JSON.stringify(nextVal);

                      return (
                        <div
                          key={key}
                          className={`grid grid-cols-12 p-2 ${isChanged ? 'bg-amber-50/30' : ''}`}
                        >
                          <div
                            className="col-span-4 font-bold text-servora-navy truncate pr-2"
                            title={key}
                          >
                            {key}
                          </div>
                          <div className="col-span-4 text-rose-600 break-words pr-2">
                            {prevVal !== undefined ? JSON.stringify(prevVal) : '—'}
                          </div>
                          <div className="col-span-4 text-emerald-600 break-words">
                            {nextVal !== undefined ? JSON.stringify(nextVal) : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer text-xs"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}