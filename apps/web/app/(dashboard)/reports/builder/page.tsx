'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Layers,
  Sparkles,
  SlidersHorizontal,
  Play,
  Save,
  Download,
  RefreshCw,
  ChevronRight,
  Plus,
  Trash2,
  Database,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Columns,
  Filter,
  ArrowUpDown,
  BookOpen,
  X,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

type SubjectArea =
  | 'ORDERS_REVENUE'
  | 'INVENTORY_STOCK'
  | 'PAYMENTS_SETTLEMENTS'
  | 'WORKFORCE_ATTENDANCE'
  | 'MENU_PRODUCT_SALES';

interface FieldMetadata {
  key: string;
  label: string;
  dataType: 'STRING' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN';
  allowedAggregations: ('NONE' | 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX')[];
}

interface DatasetMetadata {
  key: SubjectArea;
  label: string;
  description: string;
  fields: FieldMetadata[];
}

interface SelectedField {
  fieldKey: string;
  customLabel?: string;
  aggregation: 'NONE' | 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  sortOrder: 'ASC' | 'DESC' | 'NONE';
}

interface FilterCriterion {
  fieldKey: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'IS_NOT_NULL';
  value: string;
}

interface PreviewResult {
  columns: { key: string; label: string; dataType: string; aggregation: string }[];
  rows: Record<string, any>[];
  rowCount: number;
  executionDurationMs: number;
}

export default function CustomReportBuilderPage() {
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectArea>('ORDERS_REVENUE');
  const [selectedFields, setSelectedFields] = useState<SelectedField[]>([]);
  const [filters, setFilters] = useState<FilterCriterion[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [recordLimit, setRecordLimit] = useState(100);

  // Preview & Execution State
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isRunningPreview, setIsRunningPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: '',
    category: 'REVENUE_SALES' as 'WORKFORCE_HCM' | 'REVENUE_SALES' | 'OPERATIONS_KDS' | 'COMPLIANCE_AUDIT',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load available datasets
  const loadMetadata = async () => {
    try {
      setIsLoadingMetadata(true);
      const res = await fetchApi('/api/v1/reports/builder/datasets');
      if (res?.data && Array.isArray(res.data)) {
        setDatasets(res.data);
        // Initialize default fields for the active subject
        const active = res.data.find((d: DatasetMetadata) => d.key === 'ORDERS_REVENUE');
        if (active) {
          setSelectedFields(
            active.fields.slice(0, 5).map((f: FieldMetadata) => ({
              fieldKey: f.key,
              customLabel: f.label,
              aggregation: 'NONE',
              sortOrder: 'NONE',
            }))
          );
        }
      }
    } catch (err: any) {
      console.error('Failed to load dataset metadata:', err);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.key === selectedSubject);
  }, [datasets, selectedSubject]);

  const handleSubjectChange = (newSubject: SubjectArea) => {
    setSelectedSubject(newSubject);
    const meta = datasets.find((d) => d.key === newSubject);
    if (meta) {
      setSelectedFields(
        meta.fields.slice(0, 5).map((f) => ({
          fieldKey: f.key,
          customLabel: f.label,
          aggregation: 'NONE',
          sortOrder: 'NONE',
        }))
      );
    }
    setFilters([]);
    setPreviewResult(null);
  };

  const toggleFieldSelection = (fieldKey: string) => {
    const exists = selectedFields.some((f) => f.fieldKey === fieldKey);
    if (exists) {
      if (selectedFields.length <= 1) {
        alert('Report must project at least one column.');
        return;
      }
      setSelectedFields(selectedFields.filter((f) => f.fieldKey !== fieldKey));
    } else {
      const meta = activeDataset?.fields.find((f) => f.key === fieldKey);
      setSelectedFields([
        ...selectedFields,
        {
          fieldKey,
          customLabel: meta?.label || fieldKey,
          aggregation: 'NONE',
          sortOrder: 'NONE',
        },
      ]);
    }
  };

  const addFilterRow = () => {
    if (!activeDataset || activeDataset.fields.length === 0) return;
    setFilters([
      ...filters,
      {
        fieldKey: activeDataset.fields[0].key,
        operator: 'EQUALS',
        value: '',
      },
    ]);
  };

  const removeFilterRow = (index: number) => {
    setFilters(filters.filter((_, idx) => idx !== index));
  };

  const handleRunPreview = async () => {
    if (selectedFields.length === 0) {
      alert('Select at least one column to project.');
      return;
    }
    try {
      setIsRunningPreview(true);
      setToastMessage(null);

      const res = await fetchApi('/api/v1/reports/builder/preview', {
        method: 'POST',
        body: JSON.stringify({
          subjectArea: selectedSubject,
          selectedFields,
          filters,
          dateRange,
          limit: recordLimit,
        }),
      });

      if (res?.data) {
        setPreviewResult(res.data);
        setToastMessage({ text: res.message || 'Report computed successfully.', type: 'success' });
      }
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Failed to compute report query.', type: 'error' });
    } finally {
      setIsRunningPreview(false);
    }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetchApi('/api/v1/reports/builder/save', {
        method: 'POST',
        body: JSON.stringify({
          name: saveForm.name,
          description: saveForm.description,
          category: saveForm.category,
          config: {
            subjectArea: selectedSubject,
            selectedFields,
            filters,
            dateRange,
            limit: recordLimit,
          },
        }),
      });

      setIsSaveModalOpen(false);
      setToastMessage({ text: res.message || 'Custom report template saved.', type: 'success' });
    } catch (err: any) {
      alert(err.message || 'Failed to save report definition');
    } finally {
      setIsSaving(false);
    }
  };

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    const directKeys = ['token', 'accessToken', 'access_token', 'auth_token', 'authToken', 'jwt', 'servora_token'];
    for (const key of directKeys) {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (val && val.trim() !== '') return val.trim();
    }
    return null;
  };

  const handleExport = async (format: 'CSV' | 'JSON') => {
    try {
      setIsExporting(format === 'CSV');
      const token = getAuthToken();
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${apiBaseUrl}/api/v1/reports/builder/export`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          subjectArea: selectedSubject,
          selectedFields,
          filters,
          dateRange,
          limit: 1000,
          format,
          reportName: `custom-${selectedSubject.toLowerCase()}`,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to export custom report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `custom-report-${Date.now()}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
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
            <Link
              href="/reports"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Reporting Hub <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Custom Report Builder</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <SlidersHorizontal className="text-servora-core" size={22} />
            SuiteAnalytics Custom Report Builder
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Assemble dynamic multi-domain datasets, choose projection columns, apply predicate filters, and save reusable templates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => {
              setSaveForm({
                name: `Custom ${activeDataset?.label || 'Report'}`,
                description: `Created on ${new Date().toLocaleDateString()}`,
                category: 'REVENUE_SALES',
              });
              setIsSaveModalOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Save size={13} className="text-servora-core" />
            <span>Save Template</span>
          </button>
          <button
            onClick={handleRunPreview}
            disabled={isRunningPreview}
            className="px-4 py-2 bg-servora-core text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Play size={13} className={isRunningPreview ? 'animate-spin' : ''} />
            <span>{isRunningPreview ? 'Executing Query...' : 'Run Query'}</span>
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

      {/* 2. STEP 1: CHOOSE DATASET SUBJECT AREA */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="border-b border-gray-100 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-servora-core text-white text-[11px] font-bold flex items-center justify-center font-mono">
              1
            </span>
            <h3 className="font-bold text-sm text-servora-navy">Select Primary Dataset Domain</h3>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">Workday Prism Data Entities</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {datasets.map((dataset) => {
            const isSelected = selectedSubject === dataset.key;
            return (
              <div
                key={dataset.key}
                onClick={() => handleSubjectChange(dataset.key)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-servora-core bg-blue-50/60 ring-1 ring-servora-core/30 shadow-xs'
                    : 'border-gray-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-servora-navy truncate">{dataset.label}</span>
                  {isSelected && <CheckCircle2 size={14} className="text-servora-core" />}
                </div>
                <p className="text-[10.5px] text-gray-500 line-clamp-2 leading-relaxed">
                  {dataset.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. STEP 2: FIELD SELECTION & ALIASING */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-servora-core text-white text-[11px] font-bold flex items-center justify-center font-mono">
              2
            </span>
            <h3 className="font-bold text-sm text-servora-navy">
              Select Projection Columns & Aliases ({selectedFields.length} Chosen)
            </h3>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">Toggle Fields Below</span>
        </div>

        {/* Available Fields Pills */}
        <div className="flex flex-wrap gap-1.5">
          {activeDataset?.fields.map((f) => {
            const isSelected = selectedFields.some((sf) => sf.fieldKey === f.key);
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => toggleFieldSelection(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-servora-navy text-white shadow-xs'
                    : 'bg-slate-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{f.label}</span>
                <span className="text-[9px] font-mono opacity-60">({f.dataType})</span>
              </button>
            );
          })}
        </div>

        {/* Selected Field Aliasing & Aggregations Matrix */}
        {selectedFields.length > 0 && (
          <div className="border border-gray-100 rounded-xl overflow-hidden mt-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                  <th className="py-2 px-3">Field Key</th>
                  <th className="py-2 px-3">Custom Display Alias</th>
                  <th className="py-2 px-3">Mathematical Aggregation</th>
                  <th className="py-2 px-3 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedFields.map((field, idx) => {
                  const meta = activeDataset?.fields.find((f) => f.key === field.fieldKey);
                  return (
                    <tr key={field.fieldKey} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono text-[11px] font-bold text-servora-navy">
                        {field.fieldKey}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={field.customLabel || ''}
                          onChange={(e) => {
                            const updated = [...selectedFields];
                            updated[idx].customLabel = e.target.value;
                            setSelectedFields(updated);
                          }}
                          className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium w-full max-w-[200px] focus:outline-none focus:border-servora-core"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={field.aggregation}
                          onChange={(e) => {
                            const updated = [...selectedFields];
                            updated[idx].aggregation = e.target.value as any;
                            setSelectedFields(updated);
                          }}
                          className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
                        >
                          {meta?.allowedAggregations.map((agg) => (
                            <option key={agg} value={agg}>
                              {agg}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleFieldSelection(field.fieldKey)}
                          className="text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
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

      {/* 4. STEP 3: PREDICATE FILTER BUILDER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-servora-core text-white text-[11px] font-bold flex items-center justify-center font-mono">
              3
            </span>
            <h3 className="font-bold text-sm text-servora-navy">Filter Predicates & Date Boundary</h3>
          </div>
          <button
            type="button"
            onClick={addFilterRow}
            className="px-3 py-1 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} /> Add Condition
          </button>
        </div>

        {/* Date Window & Row Ceiling */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-servora-navy mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-servora-navy mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-servora-navy mb-1">Max Row Ceiling</label>
            <select
              value={recordLimit}
              onChange={(e) => setRecordLimit(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
            >
              <option value="50">50 Rows</option>
              <option value="100">100 Rows</option>
              <option value="250">250 Rows</option>
              <option value="500">500 Rows</option>
              <option value="1000">1000 Rows</option>
            </select>
          </div>
        </div>

        {/* Dynamic Condition Rows */}
        {filters.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            {filters.map((fil, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={fil.fieldKey}
                  onChange={(e) => {
                    const updated = [...filters];
                    updated[idx].fieldKey = e.target.value;
                    setFilters(updated);
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
                >
                  {activeDataset?.fields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>

                <select
                  value={fil.operator}
                  onChange={(e) => {
                    const updated = [...filters];
                    updated[idx].operator = e.target.value as any;
                    setFilters(updated);
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
                >
                  <option value="EQUALS">Equals</option>
                  <option value="NOT_EQUALS">Not Equals</option>
                  <option value="CONTAINS">Contains Text</option>
                  <option value="GREATER_THAN">Greater Than</option>
                  <option value="LESS_THAN">Less Than</option>
                  <option value="IS_NOT_NULL">Has Value</option>
                </select>

                {fil.operator !== 'IS_NOT_NULL' && (
                  <input
                    type="text"
                    placeholder="Comparison value..."
                    value={fil.value}
                    onChange={(e) => {
                      const updated = [...filters];
                      updated[idx].value = e.target.value;
                      setFilters(updated);
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-servora-core"
                  />
                )}

                <button
                  type="button"
                  onClick={() => removeFilterRow(idx)}
                  className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. STEP 4: REAL-TIME DATA PREVIEW GRID */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-2">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-servora-core text-white text-[11px] font-bold flex items-center justify-center font-mono">
              4
            </span>
            <h3 className="font-bold text-xs text-servora-navy uppercase tracking-wider">
              Output Preview {previewResult ? `(${previewResult.rowCount} Records)` : ''}
            </h3>
            {previewResult && (
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                Latency: {previewResult.executionDurationMs} ms
              </span>
            )}
          </div>

          {previewResult && previewResult.rows.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleExport('CSV')}
                disabled={isExporting}
                className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Download size={12} /> CSV
              </button>
              <button
                onClick={() => handleExport('JSON')}
                disabled={isExporting}
                className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Download size={12} /> JSON
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto max-h-[520px]">
          {!previewResult ? (
            <div className="py-20 text-center text-gray-400 space-y-2 text-xs">
              <FileSpreadsheet size={32} className="mx-auto opacity-30 text-servora-navy" />
              <p className="font-bold text-servora-navy text-sm">No Query Executed</p>
              <p>Configure your dataset columns and click <strong>Run Query</strong> above to stream records.</p>
            </div>
          ) : previewResult.rows.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-xs italic">
              Query returned zero records matching your filters.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50 sticky top-0">
                  {previewResult.columns.map((col) => (
                    <th key={col.key} className="py-2.5 px-3 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewResult.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    {previewResult.columns.map((col) => (
                      <td key={col.key} className="py-2.5 px-3 font-mono text-[11px] text-gray-700 whitespace-nowrap">
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

      {/* 6. MODAL: SAVE AS CUSTOM TEMPLATE */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Save as Reusable Custom Template</h3>
                <p className="text-[11px] text-gray-400">Stores field definitions and predicates for recurring execution</p>
              </div>
              <button onClick={() => setIsSaveModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReport} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Report Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Cashier Variance Audit"
                  value={saveForm.name}
                  onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Category Classification</label>
                <select
                  value={saveForm.category}
                  onChange={(e) => setSaveForm({ ...saveForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                >
                  <option value="REVENUE_SALES">Sales & Revenue</option>
                  <option value="WORKFORCE_HCM">Workforce HCM</option>
                  <option value="OPERATIONS_KDS">Operations & Kitchen</option>
                  <option value="COMPLIANCE_AUDIT">Compliance & Audit</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief summary of purpose and methodology..."
                  value={saveForm.description}
                  onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save to Template Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}