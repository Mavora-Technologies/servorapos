'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  BookmarkCheck,
  Search,
  Filter,
  Plus,
  Play,
  Clock,
  Download,
  Trash2,
  Edit3,
  Calendar,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Activity,
  SlidersHorizontal,
  ExternalLink,
  Users,
  BarChart3,
  Flame,
  ShieldCheck,
  Check,
  X,
  LayoutGrid,
  List,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SavedReportItem {
  id: number;
  code: string;
  name: string;
  category: 'WORKFORCE_HCM' | 'REVENUE_SALES' | 'OPERATIONS_KDS' | 'COMPLIANCE_AUDIT';
  description: string;
  supportedFormats: ('CSV' | 'JSON' | 'PDF' | 'XLSX')[];
  parameterSchema: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  executionCount: number;
  lastRunAt: string | null;
  lastStatus: string | null;
  scheduleCount: number;
  activeScheduleCount: number;
  isScheduled: boolean;
}

interface SummaryData {
  totalSavedReports: number;
  activeReports: number;
  scheduledReports: number;
  totalExecutions: number;
}

const CATEGORY_ICONS: Record<string, any> = {
  WORKFORCE_HCM: Users,
  REVENUE_SALES: BarChart3,
  OPERATIONS_KDS: Flame,
  COMPLIANCE_AUDIT: ShieldCheck,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  WORKFORCE_HCM: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  REVENUE_SALES: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  OPERATIONS_KDS: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  COMPLIANCE_AUDIT: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

export default function SavedReportsPage() {
  const [reports, setReports] = useState<SavedReportItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [scheduledFilter, setScheduledFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('TABLE');
  const [sortBy, setSortBy] = useState<'CREATED_AT' | 'NAME' | 'EXECUTION_COUNT' | 'LAST_RUN'>('CREATED_AT');

  // Quick Run / Execution Panel
  const [runningReport, setRunningReport] = useState<SavedReportItem | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<{
    columns: { key: string; label: string }[];
    rows: Record<string, any>[];
    executionNumber: string;
  } | null>(null);

  // Edit Metadata Modal
  const [editingReport, setEditingReport] = useState<SavedReportItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: 'REVENUE_SALES' as any,
    isActive: true,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
      if (scheduledFilter !== 'ALL') params.set('isScheduled', scheduledFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('sortBy', sortBy);

      const res = await fetchApi(`/api/v1/reports/saved?${params.toString()}`);
      if (res?.data) {
        setReports(res.data);
        setSummary(res.summary || null);
      }
    } catch (err: any) {
      console.error('Failed to load saved reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, scheduledFilter, searchQuery, sortBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunReport = async (report: SavedReportItem) => {
    setRunningReport(report);
    setRunResult(null);
    setIsRunning(true);
    try {
      const res = await fetchApi(`/api/v1/reports/saved/${report.id}/run`, {
        method: 'POST',
        body: JSON.stringify({ format: 'CSV' }),
      });

      if (res?.data) {
        setRunResult({
          columns: res.data.columns,
          rows: res.data.rows,
          executionNumber: res.data.execution.executionNumber,
        });
        setToastMessage({ text: res.message || `Executed ${report.name}`, type: 'success' });
        loadData();
      }
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Execution failed', type: 'error' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleDeleteReport = async (report: SavedReportItem) => {
    if (!confirm(`Are you sure you want to permanently delete custom report "${report.name}"?`)) {
      return;
    }
    try {
      const res = await fetchApi(`/api/v1/reports/saved/${report.id}`, { method: 'DELETE' });
      setToastMessage({ text: res.message || 'Report deleted', type: 'success' });
      if (runningReport?.id === report.id) {
        setRunningReport(null);
        setRunResult(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete report');
    }
  };

  const handleOpenEdit = (report: SavedReportItem) => {
    setEditingReport(report);
    setEditForm({
      name: report.name,
      description: report.description,
      category: report.category,
      isActive: report.isActive,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    try {
      setIsUpdating(true);
      const res = await fetchApi(`/api/v1/reports/saved/${editingReport.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });

      setEditingReport(null);
      setToastMessage({ text: res.message || 'Report updated', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadPreview = (format: 'CSV' | 'JSON') => {
    if (!runResult || runResult.rows.length === 0) return;

    let blob: Blob;
    let fileName = `${runningReport?.code || 'custom-report'}-${runResult.executionNumber}`;

    if (format === 'JSON') {
      blob = new Blob([JSON.stringify(runResult.rows, null, 2)], { type: 'application/json' });
      fileName += '.json';
    } else {
      const headerRow = runResult.columns.map((c) => `"${c.label}"`).join(',');
      const dataRows = runResult.rows.map((row) =>
        runResult.columns
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
              href="/reports"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Reporting Hub <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Saved Reports Library</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <BookmarkCheck className="text-servora-core" size={22} />
            Saved Reports & Analytics Catalog
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Manage custom queries, automated distribution schedules, execution frequencies, and quick export routines.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <Link
            href="/reports/builder"
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} /> Create Custom Report
          </Link>
          <button
            onClick={loadData}
            title="Refresh Library"
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

      {/* 2. REPOSITORY METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Custom Reports</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {summary ? summary.totalSavedReports : reports.length}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Tenant Custom Library</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <BookmarkCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Scheduled Jobs</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {summary ? summary.scheduledReports : 0}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Automated Push</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Executions</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {summary ? summary.totalExecutions.toLocaleString() : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Historical Runs</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Activity size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Status</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {summary ? summary.activeReports : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Ready to Execute</span>
          </div>
          <div className="p-2.5 bg-slate-50 text-servora-navy rounded-xl">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      {/* 3. SEARCH & CONTROLS TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="REVENUE_SALES">Sales & Revenue</option>
            <option value="WORKFORCE_HCM">Workforce HCM</option>
            <option value="OPERATIONS_KDS">Operations & KDS</option>
            <option value="COMPLIANCE_AUDIT">Compliance & Audit</option>
          </select>

          {/* Schedule Status Filter */}
          <select
            value={scheduledFilter}
            onChange={(e) => setScheduledFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Delivery States</option>
            <option value="YES">Automated Schedule Active</option>
            <option value="NO">Ad-Hoc / Unscheduled</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="CREATED_AT">Newest Created</option>
            <option value="NAME">Report Name (A-Z)</option>
            <option value="EXECUTION_COUNT">Most Frequently Run</option>
            <option value="LAST_RUN">Recently Executed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              placeholder="Search saved reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-servora-core w-40 sm:w-56"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-slate-50">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 transition-colors cursor-pointer ${
                viewMode === 'TABLE' ? 'bg-servora-navy text-white' : 'text-gray-500 hover:text-black'
              }`}
              title="Table View"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              className={`p-1.5 transition-colors cursor-pointer ${
                viewMode === 'CARDS' ? 'bg-servora-navy text-white' : 'text-gray-500 hover:text-black'
              }`}
              title="Cards View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN REPORTS DIRECTORY (TABLE OR CARDS) */}
      {viewMode === 'TABLE' ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                  <th className="py-2.5 px-3">Report Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Schedule</th>
                  <th className="py-2.5 px-3 text-right">Executions</th>
                  <th className="py-2.5 px-3">Last Executed</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-400 italic">
                      {isLoading ? 'Loading custom report catalog...' : 'No saved reports found. Create one via Custom Report Builder.'}
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => {
                    const Icon = CATEGORY_ICONS[report.category] || BarChart3;
                    const catStyle = CATEGORY_COLORS[report.category] || CATEGORY_COLORS.REVENUE_SALES;

                    return (
                      <tr key={report.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${catStyle.bg} ${catStyle.text}`}>
                              <Icon size={16} />
                            </div>
                            <div>
                              <span className="font-bold text-servora-navy block">{report.name}</span>
                              <span className="text-[11px] text-gray-400 line-clamp-1">{report.description}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono uppercase font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                            {report.category.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {report.isScheduled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Clock size={10} /> Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">Ad-Hoc</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                          {report.executionCount}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                          {report.lastRunAt ? new Date(report.lastRunAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleRunReport(report)}
                              className="px-2.5 py-1 bg-servora-core text-white rounded-lg font-bold text-[11px] hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Play size={11} /> Run
                            </button>
                            <button
                              onClick={() => handleOpenEdit(report)}
                              className="p-1.5 text-gray-400 hover:text-servora-core transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                              title="Edit Metadata"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteReport(report)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                              title="Delete Report"
                            >
                              <Trash2 size={13} />
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
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.length === 0 ? (
            <div className="col-span-full py-16 text-center text-gray-400 italic bg-white rounded-2xl border border-gray-200">
              No custom reports found.
            </div>
          ) : (
            reports.map((report) => {
              const Icon = CATEGORY_ICONS[report.category] || BarChart3;
              const catStyle = CATEGORY_COLORS[report.category] || CATEGORY_COLORS.REVENUE_SALES;

              return (
                <div key={report.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${catStyle.bg} ${catStyle.text}`}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-servora-navy">{report.name}</h4>
                          <span className="text-[10px] font-mono text-gray-400">ID: {report.code}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                        {report.category.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                      {report.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <div className="text-gray-400 font-mono text-[10px]">
                      Runs: {report.executionCount} &bull; {report.isScheduled ? 'Scheduled' : 'Ad-Hoc'}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRunReport(report)}
                        className="px-2.5 py-1 bg-servora-core text-white rounded-lg font-bold text-[11px] hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Play size={10} /> Run
                      </button>
                      <button
                        onClick={() => handleOpenEdit(report)}
                        className="p-1.5 text-gray-400 hover:text-black cursor-pointer"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. QUICK EXECUTION PREVIEW DRAWER / PANEL */}
      {runningReport && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-servora-navy uppercase tracking-wider">
                  Live Execution: {runningReport.name}
                </span>
                {runResult && (
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                    Ref: {runResult.executionNumber} ({runResult.rows.length} Rows)
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-400 font-mono">Code: {runningReport.code}</span>
            </div>

            <div className="flex items-center gap-2">
              {runResult && runResult.rows.length > 0 && (
                <>
                  <button
                    onClick={() => handleDownloadPreview('CSV')}
                    className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={12} /> CSV
                  </button>
                  <button
                    onClick={() => handleDownloadPreview('JSON')}
                    className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={12} /> JSON
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setRunningReport(null);
                  setRunResult(null);
                }}
                className="p-1 text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            {isRunning ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                <RefreshCw size={24} className="mx-auto animate-spin text-servora-core mb-2" />
                Executing query against live warehouse...
              </div>
            ) : !runResult ? (
              <div className="py-8 text-center text-gray-400 text-xs italic">
                Ready to stream records.
              </div>
            ) : runResult.rows.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs italic">
                Query executed successfully but returned zero rows.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50 sticky top-0">
                    {runResult.columns.map((col) => (
                      <th key={col.key} className="py-2 px-3 whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {runResult.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      {runResult.columns.map((col) => (
                        <td key={col.key} className="py-2 px-3 font-mono text-[11px] text-gray-700 whitespace-nowrap">
                          {String(row[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 6. EDIT METADATA MODAL */}
      {editingReport && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Edit Report Definition</h3>
                <p className="text-[11px] text-gray-400">Update title, purpose narrative, and category</p>
              </div>
              <button onClick={() => setEditingReport(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Report Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Category Classification</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                >
                  <option value="REVENUE_SALES">Sales & Revenue</option>
                  <option value="WORKFORCE_HCM">Workforce HCM</option>
                  <option value="OPERATIONS_KDS">Operations & KDS</option>
                  <option value="COMPLIANCE_AUDIT">Compliance & Audit</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Description Narrative</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded text-servora-core focus:ring-servora-core"
                />
                <label htmlFor="isActive" className="text-xs font-bold text-servora-navy">
                  Active in Tenant Directory
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Update Definition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}