'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
  Calendar,
  X,
  FileText,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ExportRecord {
  id: number;
  executionNumber: string;
  reportName: string;
  format: string;
  status: string;
  rowCount: number;
  executionDurationMs: number;
  fileUrl: string | null;
  errorMessage: string | null;
  requesterName: string | null;
  generatedAt: string;
  fileSizeKb: number;
  expiresAt: string;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

export default function DataExportsPage() {
  const [exportsList, setExportsList] = useState<ExportRecord[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Export Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportForm, setExportForm] = useState({
    domain: 'SALES_REVENUE' as 'SALES_REVENUE' | 'INVENTORY_VALUATION' | 'PAYMENTS_TREASURY' | 'WORKFORCE_HCM' | 'FOOD_COSTING' | 'AUDIT_LOGS',
    format: 'CSV' as 'CSV' | 'XLSX' | 'JSON',
    branchId: '',
    startDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    includeMetadata: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [expRes, branchRes] = await Promise.all([
        fetchApi('/api/v1/reports/exports'),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (expRes?.data) {
        setExportsList(expRes.data);
      }
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load data exports:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequestExport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setToastMessage(null);
      const res = await fetchApi('/api/v1/reports/exports/request', {
        method: 'POST',
        body: JSON.stringify({
          domain: exportForm.domain,
          format: exportForm.format,
          branchId: exportForm.branchId ? parseInt(exportForm.branchId, 10) : null,
          startDate: exportForm.startDate,
          endDate: exportForm.endDate,
          includeMetadata: exportForm.includeMetadata,
        }),
      });

      setIsModalOpen(false);
      setToastMessage({ text: res.message || 'Data export queued successfully.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Export request failed');
    } finally {
      setIsSubmitting(false);
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

  const handleDownload = async (fileUrl: string | null, refNum: string) => {
    if (!fileUrl) return;
    try {
      const token = getAuthToken();
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${apiBaseUrl}${fileUrl}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${refNum}-export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download file');
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
            <span className="text-xs font-bold text-servora-navy">Data Exports Center</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <HardDrive className="text-servora-core" size={22} />
            Enterprise Data Exports & File Center
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Request asynchronous bulk data packages, monitor storage retention policies (7-day window), and stream CSV/JSON files.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> Request Bulk Export
          </button>
          <button
            onClick={loadData}
            title="Refresh Queue"
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

      {/* 2. EXPORTS QUEUE LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-xs text-servora-navy uppercase tracking-wider">
              Asynchronous Export Queue ({exportsList.length} Packages)
            </h3>
            <p className="text-[10px] text-gray-400">Secure files available for 7 days post-generation</p>
          </div>
          <span className="text-xs font-mono font-bold text-servora-core">
            Retention Policy: 7 Days
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Export Reference</th>
                <th className="py-2.5 px-3">Package Description</th>
                <th className="py-2.5 px-3">Format</th>
                <th className="py-2.5 px-3 text-right">Rows</th>
                <th className="py-2.5 px-3 text-right">Size</th>
                <th className="py-2.5 px-3">Operator</th>
                <th className="py-2.5 px-3">Generated At</th>
                <th className="py-2.5 px-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exportsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 italic">
                    {isLoading ? 'Loading export queue...' : 'No bulk data packages generated yet. Click "Request Bulk Export".'}
                  </td>
                </tr>
              ) : (
                exportsList.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-servora-core whitespace-nowrap">
                      {exp.executionNumber}
                    </td>
                    <td className="py-3 px-3 font-bold text-servora-navy">
                      {exp.reportName}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-mono uppercase font-bold bg-blue-50 text-servora-core border border-blue-200">
                        {exp.format}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-700">
                      {exp.rowCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-500">
                      ~{exp.fileSizeKb} KB
                    </td>
                    <td className="py-3 px-3 text-gray-600">
                      {exp.requesterName || 'System Service'}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {new Date(exp.generatedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDownload(exp.fileUrl, exp.executionNumber)}
                        disabled={!exp.fileUrl}
                        className="px-3 py-1 bg-servora-core text-white rounded-lg font-bold text-[11px] hover:bg-blue-700 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Download size={11} /> Download
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL: REQUEST BULK DATA EXPORT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Request Asynchronous Data Export</h3>
                <p className="text-[11px] text-gray-400">Generate downloadable enterprise data packages</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestExport} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Target Domain *</label>
                <select
                  value={exportForm.domain}
                  onChange={(e) => setExportForm({ ...exportForm, domain: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                >
                  <option value="SALES_REVENUE">Sales Orders & Revenue</option>
                  <option value="INVENTORY_VALUATION">Inventory Asset Valuation</option>
                  <option value="PAYMENTS_TREASURY">Payments & Treasury Ledger</option>
                  <option value="WORKFORCE_HCM">Workforce HCM & Attendance</option>
                  <option value="FOOD_COSTING">Food Costing & BOM Margins</option>
                  <option value="AUDIT_LOGS">Compliance Audit Trail</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Format *</label>
                  <select
                    value={exportForm.format}
                    onChange={(e) => setExportForm({ ...exportForm, format: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="CSV">CSV Spreadsheet</option>
                    <option value="XLSX">Excel Workbook (.xlsx)</option>
                    <option value="JSON">Raw JSON</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Branch Scope</label>
                  <select
                    value={exportForm.branchId}
                    onChange={(e) => setExportForm({ ...exportForm, branchId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="">All Branch Locations</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Start Date</label>
                  <input
                    type="date"
                    value={exportForm.startDate}
                    onChange={(e) => setExportForm({ ...exportForm, startDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">End Date</label>
                  <input
                    type="date"
                    value={exportForm.endDate}
                    onChange={(e) => setExportForm({ ...exportForm, endDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="includeMetadata"
                  checked={exportForm.includeMetadata}
                  onChange={(e) => setExportForm({ ...exportForm, includeMetadata: e.target.checked })}
                  className="rounded text-servora-core focus:ring-servora-core"
                />
                <label htmlFor="includeMetadata" className="text-xs font-bold text-servora-navy">
                  Include KRA eTIMS & Audit Metadata Header
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Queueing Export...' : 'Queue Export'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}