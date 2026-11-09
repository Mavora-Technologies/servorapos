'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  FileSpreadsheet,
  Calendar,
  Clock,
  Download,
  Play,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  ShieldCheck,
  Flame,
  Activity,
  Layers,
  Search,
  Plus,
  Trash2,
  Mail,
  Zap,
  X,
  SlidersHorizontal,
  FileText,
  Filter,
  Check,
  Send,
  PieChart as PieIcon,
  Cpu,
  Database,
  ArrowUpRight,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ReportDefinition {
  id: number;
  code: string;
  name: string;
  category: 'WORKFORCE_HCM' | 'REVENUE_SALES' | 'OPERATIONS_KDS' | 'COMPLIANCE_AUDIT';
  description: string;
  supportedFormats: ('CSV' | 'JSON' | 'PDF' | 'XLSX')[];
  parameterSchema: {
    requiresDateRange?: boolean;
    requiresBranch?: boolean;
  };
  isSystem: boolean;
  isActive: boolean;
}

interface ReportExecution {
  id: number;
  executionNumber: string;
  reportName: string;
  reportCode: string;
  category: string;
  branchName: string | null;
  requesterName: string | null;
  status: string;
  format: string;
  rowCount: number;
  executionDurationMs: number;
  generatedAt: string;
}

interface ReportSchedule {
  id: number;
  title: string;
  reportName: string;
  reportCode: string;
  frequency: string;
  deliveryChannel: string;
  recipients: string[];
  format: string;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

interface TelemetryData {
  totalReportsGenerated: number;
  successfulRuns: number;
  activeSchedules: number;
  avgDurationMs: number;
  totalRowsExported: number;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  WORKFORCE_HCM: Users,
  REVENUE_SALES: BarChart3,
  OPERATIONS_KDS: Flame,
  COMPLIANCE_AUDIT: ShieldCheck,
};

const CATEGORY_COLORS: Record<string, string> = {
  WORKFORCE_HCM: '#9333EA',
  REVENUE_SALES: '#0554F4',
  OPERATIONS_KDS: '#F97316',
  COMPLIANCE_AUDIT: '#10B981',
};

export default function ReportsPage() {
  const [definitions, setDefinitions] = useState<ReportDefinition[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [executions, setExecutions] = useState<ReportExecution[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'EXECUTIONS' | 'SCHEDULES'>('CATALOG');

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Active Report Generation Workspace
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [runParams, setRunParams] = useState({
    branchId: '',
    format: 'CSV' as 'CSV' | 'JSON' | 'PDF' | 'XLSX',
    startDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Generated Dataset State
  const [reportResult, setReportResult] = useState<{
    columns: { key: string; label: string }[];
    rows: Record<string, any>[];
    executionNumber: string;
  } | null>(null);

  const [previewFilter, setPreviewFilter] = useState('');

  // New Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    reportDefinitionId: '',
    branchId: '',
    title: '',
    frequency: 'WEEKLY' as 'DAILY' | 'WEEKLY' | 'MONTHLY',
    deliveryChannel: 'EMAIL' as 'EMAIL' | 'WEBHOOK',
    recipients: '',
    format: 'CSV' as 'CSV' | 'JSON',
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [catalogRes, branchRes, execRes] = await Promise.all([
        fetchApi('/api/v1/reports'),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
        fetchApi('/api/v1/reports/executions').catch(() => ({ data: [] })),
      ]);

      if (catalogRes?.data) {
        setDefinitions(catalogRes.data.definitions || []);
        setTelemetry(catalogRes.data.telemetry || null);
        setSchedules(catalogRes.data.schedules || []);
        if (catalogRes.data.definitions?.length > 0 && !selectedReport) {
          setSelectedReport(catalogRes.data.definitions[0]);
        }
      }
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
      if (execRes?.data && Array.isArray(execRes.data)) {
        setExecutions(execRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load reporting suite:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedReport]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDefinitions = useMemo(() => {
    return definitions.filter((def) => {
      const matchesSearch =
        def.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        def.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        def.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || def.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [definitions, searchQuery, selectedCategory]);

  const filteredPreviewRows = useMemo(() => {
    if (!reportResult || !reportResult.rows) return [];
    if (!previewFilter.trim()) return reportResult.rows;
    const q = previewFilter.toLowerCase();
    return reportResult.rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [reportResult, previewFilter]);

  // Category Distribution Counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: definitions.length };
    definitions.forEach((d) => {
      counts[d.category] = (counts[d.category] || 0) + 1;
    });
    return counts;
  }, [definitions]);

  const handleRunReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    try {
      setIsExecuting(true);
      setToastMessage(null);
      const res = await fetchApi('/api/v1/reports/run', {
        method: 'POST',
        body: JSON.stringify({
          reportCode: selectedReport.code,
          branchId: runParams.branchId ? parseInt(runParams.branchId, 10) : null,
          format: runParams.format,
          startDate: runParams.startDate,
          endDate: runParams.endDate,
        }),
      });

      if (res?.data) {
        setReportResult({
          columns: res.data.columns,
          rows: res.data.rows,
          executionNumber: res.data.execution.executionNumber,
        });
        setToastMessage({ text: res.message || 'Report generated successfully.', type: 'success' });
        loadData();
      }
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Report generation failed.', type: 'error' });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDownloadClient = (format: 'CSV' | 'JSON') => {
    if (!reportResult || reportResult.rows.length === 0) return;

    let blob: Blob;
    let fileName = `${selectedReport?.code || 'report'}-${reportResult.executionNumber}`;

    if (format === 'JSON') {
      blob = new Blob([JSON.stringify(reportResult.rows, null, 2)], { type: 'application/json' });
      fileName += '.json';
    } else {
      const headerRow = reportResult.columns.map((c) => `"${c.label}"`).join(',');
      const dataRows = reportResult.rows.map((row) =>
        reportResult.columns
          .map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`)
          .join(',')
      );
      blob = new Blob([[headerRow, ...dataRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
      fileName += '.csv';
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const recipientList = scheduleForm.recipients
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      await fetchApi('/api/v1/reports/schedules', {
        method: 'POST',
        body: JSON.stringify({
          reportDefinitionId: parseInt(scheduleForm.reportDefinitionId, 10),
          branchId: scheduleForm.branchId ? parseInt(scheduleForm.branchId, 10) : null,
          title: scheduleForm.title,
          frequency: scheduleForm.frequency,
          deliveryChannel: scheduleForm.deliveryChannel,
          recipients: recipientList,
          format: scheduleForm.format,
          isActive: true,
        }),
      });

      setIsScheduleModalOpen(false);
      setToastMessage({ text: 'Automated report distribution schedule created.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create schedule');
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!confirm('Remove this automated report schedule?')) return;
    try {
      await fetchApi(`/api/v1/reports/schedules/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete schedule');
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
            <span className="text-xs font-bold text-servora-navy">SuiteAnalytics Hub</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <BarChart3 className="text-servora-core" size={22} />
            Enterprise Reports & Analytics Engine
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Query across workforce HCM, revenue velocity, culinary SLA throughput, and statutory audit ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => {
              setScheduleForm({
                reportDefinitionId: definitions[0]?.id ? String(definitions[0].id) : '',
                branchId: '',
                title: '',
                frequency: 'WEEKLY',
                deliveryChannel: 'EMAIL',
                recipients: '',
                format: 'CSV',
              });
              setIsScheduleModalOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Clock size={14} className="text-servora-core" /> Schedule Automated Report
          </button>
          <button
            onClick={loadData}
            title="Refresh Reporting Suite"
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

      {/* 2. ANALYTICS TELEMETRY RIBBON (High-Density Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Executions</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {telemetry ? telemetry.totalReportsGenerated.toLocaleString() : 0}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">
              {telemetry ? telemetry.successfulRuns : 0} Completed
            </span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <BarChart3 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Schedules</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {telemetry ? telemetry.activeSchedules : 0} Jobs
            </p>
            <span className="text-[10px] text-gray-400 font-medium">Autonomous Push</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Avg Compute Latency</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {telemetry ? `${telemetry.avgDurationMs} ms` : '—'}
            </p>
            <span className="text-[10px] text-gray-400 font-medium">Query Engine Speed</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Cpu size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Records Exported</span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">
              {telemetry ? telemetry.totalRowsExported.toLocaleString() : 0}
            </p>
            <span className="text-[10px] text-gray-400 font-medium">Data Pipeline Volume</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Database size={18} />
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('CATALOG')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'CATALOG'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
          }`}
        >
          <BarChart3 size={14} />
          <span>Report Catalog & Runner ({definitions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EXECUTIONS')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'EXECUTIONS'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
          }`}
        >
          <Activity size={14} />
          <span>Execution Ledger ({executions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SCHEDULES')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'SCHEDULES'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
          }`}
        >
          <Clock size={14} />
          <span>Automated Schedules ({schedules.length})</span>
        </button>
      </div>

      {/* 4. TAB 1: ADVANCED REPORT CATALOG & WORKSPACE RUNNER */}
      {activeTab === 'CATALOG' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Filterable Reports Directory (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3.5">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="font-bold text-xs text-servora-navy uppercase tracking-wider">
                Report Catalog ({filteredDefinitions.length})
              </span>
              <span className="text-[10px] text-gray-400">SuiteAnalytics Model</span>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="Search templates or metrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1 text-[10px] font-bold">
              {[
                { id: 'ALL', label: 'All Modules' },
                { id: 'REVENUE_SALES', label: 'Sales & Revenue' },
                { id: 'WORKFORCE_HCM', label: 'Workforce HCM' },
                { id: 'OPERATIONS_KDS', label: 'Kitchen & KDS' },
                { id: 'COMPLIANCE_AUDIT', label: 'Audit Ledger' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-servora-core text-white shadow-xs'
                      : 'bg-slate-50 text-gray-600 hover:bg-slate-100 border border-gray-200'
                  }`}
                >
                  {cat.label} ({categoryCounts[cat.id] || 0})
                </button>
              ))}
            </div>

            {/* Template Cards List */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {filteredDefinitions.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-8 text-center">
                  No reporting definitions found matching your filters.
                </p>
              ) : (
                filteredDefinitions.map((def) => {
                  const Icon = CATEGORY_ICONS[def.category] || BarChart3;
                  const isSelected = selectedReport?.id === def.id;

                  return (
                    <div
                      key={def.id}
                      onClick={() => {
                        setSelectedReport(def);
                        setReportResult(null);
                        setPreviewFilter('');
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-servora-core bg-blue-50/60 ring-1 ring-servora-core/30'
                          : 'border-gray-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[def.category]}15`,
                            color: CATEGORY_COLORS[def.category],
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-bold text-xs text-servora-navy truncate">{def.name}</h4>
                            <span className="text-[9px] font-mono font-bold uppercase text-servora-core bg-blue-50 px-1 py-0.2 rounded">
                              {def.category.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                            {def.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Execution Parameters & Live Grid (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Run Query Configuration Box */}
            {selectedReport && (
              <form onSubmit={handleRunReport} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4 text-xs">
                <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-servora-navy">{selectedReport.name}</h3>
                    <span className="text-[10px] font-mono text-gray-400">Identifier: {selectedReport.code}</span>
                  </div>
                  <button
                    type="submit"
                    disabled={isExecuting}
                    className="px-4 py-2 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Play size={13} className={isExecuting ? 'animate-spin' : ''} />
                    <span>{isExecuting ? 'Computing Query...' : 'Run Query'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Branch Scope</label>
                    <select
                      value={runParams.branchId}
                      onChange={(e) => setRunParams({ ...runParams, branchId: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                    >
                      <option value="">All Locations</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Start Date</label>
                    <input
                      type="date"
                      value={runParams.startDate}
                      onChange={(e) => setRunParams({ ...runParams, startDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-servora-navy mb-1">End Date</label>
                    <input
                      type="date"
                      value={runParams.endDate}
                      onChange={(e) => setRunParams({ ...runParams, endDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Export Format</label>
                    <select
                      value={runParams.format}
                      onChange={(e) => setRunParams({ ...runParams, format: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                    >
                      {selectedReport.supportedFormats.map((fmt) => (
                        <option key={fmt} value={fmt}>
                          {fmt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </form>
            )}

            {/* Results Grid Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-2 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-servora-navy uppercase tracking-wider">
                    Data Grid Preview {reportResult ? `(${filteredPreviewRows.length} of ${reportResult.rows.length} Rows)` : ''}
                  </span>
                  {reportResult && (
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      Ref: {reportResult.executionNumber}
                    </span>
                  )}
                </div>

                {reportResult && reportResult.rows.length > 0 && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Filter preview..."
                      value={previewFilter}
                      onChange={(e) => setPreviewFilter(e.target.value)}
                      className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:border-servora-core w-32 sm:w-44"
                    />
                    <button
                      onClick={() => handleDownloadClient('CSV')}
                      className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Download size={12} /> CSV
                    </button>
                    <button
                      onClick={() => handleDownloadClient('JSON')}
                      className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Download size={12} /> JSON
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                {!reportResult ? (
                  <div className="py-20 text-center text-gray-400 space-y-2 text-xs">
                    <FileSpreadsheet size={32} className="mx-auto opacity-30 text-servora-navy" />
                    <p className="font-bold text-servora-navy text-sm">No Report Generated Yet</p>
                    <p>Select your operational parameters above and click <strong>Run Query</strong> to execute.</p>
                  </div>
                ) : filteredPreviewRows.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 text-xs italic">
                    Query returned zero records matching your active filters.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50 sticky top-0">
                        {reportResult.columns.map((c) => (
                          <th key={c.key} className="py-2.5 px-3 whitespace-nowrap">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredPreviewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          {reportResult.columns.map((c) => (
                            <td key={c.key} className="py-2.5 px-3 font-mono text-[11px] text-gray-700 whitespace-nowrap">
                              {String(row[c.key] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 2: EXECUTION AUDIT LEDGER */}
      {activeTab === 'EXECUTIONS' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-xs text-servora-navy uppercase tracking-wider">
                Execution History & Background Runs
              </h3>
              <p className="text-[11px] text-gray-400">Detailed audit log of generated query runs</p>
            </div>
            <span className="text-xs font-mono font-bold text-servora-core">
              {executions.length} Total Runs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Execution ID</th>
                  <th className="py-2.5 px-3">Report Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Operator</th>
                  <th className="py-2.5 px-3">Rows</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                      No report executions logged.
                    </td>
                  </tr>
                ) : (
                  executions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-servora-core">
                        {exec.executionNumber}
                      </td>
                      <td className="py-3 px-3 font-bold text-servora-navy">
                        {exec.reportName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[9.5px] font-mono uppercase font-bold bg-blue-50 text-servora-core border border-blue-200">
                          {exec.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {exec.requesterName || 'System Service'}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-700">
                        {exec.rowCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-600">
                        {exec.executionDurationMs} ms
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                        {new Date(exec.generatedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {exec.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB 3: AUTOMATED RECURRING SCHEDULES */}
      {activeTab === 'SCHEDULES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.length === 0 ? (
              <div className="col-span-full p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center text-xs text-gray-400 italic">
                No recurring report schedules configured. Click &ldquo;Schedule Automated Report&rdquo; to automate delivery.
              </div>
            ) : (
              schedules.map((sch) => (
                <div key={sch.id} className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-servora-navy">{sch.title}</h4>
                        <span className="text-[10px] font-mono text-gray-400">{sch.reportName}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-50 text-servora-core border border-blue-200 rounded text-[9.5px] font-bold uppercase font-mono">
                        {sch.frequency}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 space-y-1 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Mail size={13} className="text-gray-400 shrink-0" />
                        <span className="truncate">{sch.recipients.join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <FileSpreadsheet size={13} className="text-gray-400 shrink-0" />
                        <span>Format: {sch.format}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-gray-400">
                      Next Run: {sch.nextRunAt ? new Date(sch.nextRunAt).toLocaleDateString() : 'Pending'}
                    </span>
                    <button
                      onClick={() => handleDeleteSchedule(sch.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 7. MODAL: CREATE RECURRING SCHEDULE */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Schedule Automated Report</h3>
                <p className="text-[11px] text-gray-400">Automate periodic compilation and distribution</p>
              </div>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Schedule Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Executive Audit"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Target Report *</label>
                <select
                  required
                  value={scheduleForm.reportDefinitionId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, reportDefinitionId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  {definitions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.category.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Frequency *</label>
                  <select
                    value={scheduleForm.frequency}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Format</label>
                  <select
                    value={scheduleForm.format}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, format: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="CSV">CSV Spreadsheet</option>
                    <option value="JSON">Raw JSON</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Recipient Emails (Comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="manager@company.com, audit@company.com"
                  value={scheduleForm.recipients}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, recipients: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                >
                  Activate Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}