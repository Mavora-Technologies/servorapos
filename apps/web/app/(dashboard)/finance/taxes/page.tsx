'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Landmark,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ChevronRight,
  QrCode,
  FileSpreadsheet,
  Cpu,
  Receipt,
  Settings,
  SlidersHorizontal,
  Building,
  RotateCw,
  Download,
  Plus,
  Search,
  CalendarClock,
  Eye,
  X,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface TaxTelemetry {
  period: {
    year: number;
    month: number;
    quarter: number;
    periodType: 'MONTH' | 'QUARTER' | 'YEAR';
    filingDeadlineDate: string;
  };
  salesOutputTax: {
    grossSalesKes: number;
    netTaxableSalesKes: number;
    outputVatKes: number;
    cateringLevyKes: number;
    serviceChargeKes: number;
    paidOrdersCount: number;
  };
  purchasesInputTax: {
    grossPurchasesKes: number;
    inputVatKes: number;
    invoicesCount: number;
  };
  netVatObligation: {
    netPayableVatKes: number;
    isCreditRefundable: boolean;
  };
  etimsTransmissionTelemetry: {
    totalReceipts: number;
    fiscalized: number;
    pending: number;
    failed: number;
    successRatePct: number;
  };
}

interface TaxSettings {
  id: number;
  taxPin: string | null;
  baseCurrency: string;
  vatRate: number;
  isVatInclusive: boolean;
  isCateringLevyEnabled: boolean;
  cateringLevyRate: number;
  isServiceChargeEnabled: boolean;
  serviceChargeRate: number;
  etimsEnvironment: 'SANDBOX' | 'PRODUCTION';
  autoFiscalizeOnPayment: boolean;
  etimsMiddleServerUrl: string | null;
  etimsDeviceSerial: string | null;
  etimsBranchCode: string;
}

interface TaxCode {
  id: number;
  code: string;
  name: string;
  rate: number;
  statutoryCode: string | null;
}

interface FiscalInvoiceRecord {
  id: number;
  invoiceType: string;
  orderId: number;
  orderNumber: string | null;
  buyerKraPin: string | null;
  cuInvoiceNumber: string | null;
  sdcId: string | null;
  qrCodeUrl: string | null;
  fiscalStatus: 'PENDING' | 'FISCALIZED' | 'FAILED';
  retryCount: number;
  lastError: string | null;
  fiscalizedAt: string | null;
  createdAt: string;
  orderTotal: number;
  orderTax: number;
  orderLevy: number;
  branchName: string | null;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

export default function TaxesPage() {
  const currentYear = new Date().getFullYear();

  // Dynamic 11-year rolling statutory window (currentYear - 5 through currentYear + 5)
  const availableYears = useMemo(
    () => Array.from({ length: 11 }, (_, idx) => currentYear - 5 + idx),
    [currentYear]
  );

  const [telemetry, setTelemetry] = useState<TaxTelemetry | null>(null);
  const [settings, setSettings] = useState<TaxSettings | null>(null);
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [fiscalInvoices, setFiscalInvoices] = useState<FiscalInvoiceRecord[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [periodType, setPeriodType] = useState<'MONTH' | 'QUARTER' | 'YEAR'>('MONTH');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(
    Math.ceil((new Date().getMonth() + 1) / 3)
  );

  const [activeTab, setActiveTab] = useState<'LEDGER' | 'ETIMS_DEVICES' | 'SETTINGS'>('LEDGER');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');
  const [inspectedInvoice, setInspectedInvoice] = useState<FiscalInvoiceRecord | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Settings Edit State
  const [editTaxPin, setEditTaxPin] = useState('');
  const [editVatRate, setEditVatRate] = useState<number>(16.0);
  const [editCateringLevy, setEditCateringLevy] = useState<boolean>(true);
  const [editCateringRate, setEditCateringRate] = useState<number>(2.0);
  const [editEnvironment, setEditEnvironment] = useState<'SANDBOX' | 'PRODUCTION'>('SANDBOX');
  const [editDeviceSerial, setEditDeviceSerial] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // New Tax Code Modal State
  const [isAddCodeModalOpen, setIsAddCodeModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeRate, setNewCodeRate] = useState('16');
  const [newStatutoryCode, setNewStatutoryCode] = useState('B');
  const [isCreatingCode, setIsCreatingCode] = useState(false);

  const loadTaxData = useCallback(async () => {
    try {
      setIsLoading(true);
      const branchQuery = selectedBranchId !== 'ALL' ? `&branchId=${selectedBranchId}` : '';
      const searchQuery = invoiceSearch.trim() ? `&search=${encodeURIComponent(invoiceSearch.trim())}` : '';

      const [overviewRes, invoicesRes, branchRes] = await Promise.all([
        fetchApi(
          `/api/v1/finance/taxes/overview?periodType=${periodType}&year=${selectedYear}&month=${selectedMonth}&quarter=${selectedQuarter}${branchQuery}`
        ),
        fetchApi(
          `/api/v1/finance/taxes/invoices?status=${statusFilter}${branchQuery}${searchQuery}`
        ),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }

      if (overviewRes?.data) {
        setTelemetry(overviewRes.data.telemetry);
        setSettings(overviewRes.data.settings);
        setTaxCodes(overviewRes.data.taxCodes || []);

        if (overviewRes.data.settings) {
          setEditTaxPin(overviewRes.data.settings.taxPin || '');
          setEditVatRate(overviewRes.data.settings.vatRate ?? 16.0);
          setEditCateringLevy(overviewRes.data.settings.isCateringLevyEnabled ?? true);
          setEditCateringRate(overviewRes.data.settings.cateringLevyRate ?? 2.0);
          setEditEnvironment(overviewRes.data.settings.etimsEnvironment || 'SANDBOX');
          setEditDeviceSerial(overviewRes.data.settings.etimsDeviceSerial || '');
        }
      }

      if (invoicesRes?.data?.invoices) {
        setFiscalInvoices(invoicesRes.data.invoices);
      }
    } catch (err: any) {
      console.error('Failed to load tax telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, invoiceSearch, selectedBranchId, periodType, selectedYear, selectedMonth, selectedQuarter]);

  useEffect(() => {
    loadTaxData();
  }, [loadTaxData]);

  const handleSaveTaxSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      const res = await fetchApi('/api/v1/finance/taxes/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          taxPin: editTaxPin.trim() || undefined,
          vatRate: editVatRate,
          isCateringLevyEnabled: editCateringLevy,
          cateringLevyRate: editCateringRate,
          etimsEnvironment: editEnvironment,
          etimsDeviceSerial: editDeviceSerial.trim() || undefined,
        }),
      });

      setToastMessage({ text: res.message || 'Tax configuration updated.', type: 'success' });
      setTimeout(() => setToastMessage(null), 4000);
      loadTaxData();
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCreateTaxCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreatingCode(true);
      const res = await fetchApi('/api/v1/finance/taxes/codes', {
        method: 'POST',
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          name: newCodeName.trim(),
          rate: parseFloat(newCodeRate) || 0,
          statutoryCode: newStatutoryCode.trim() || undefined,
        }),
      });

      setIsAddCodeModalOpen(false);
      setNewCode('');
      setNewCodeName('');
      setNewCodeRate('16');
      setToastMessage({ text: res.message || 'Tax classification created.', type: 'success' });
      setTimeout(() => setToastMessage(null), 4000);
      loadTaxData();
    } catch (err: any) {
      alert(err.message || 'Failed to create tax code');
    } finally {
      setIsCreatingCode(false);
    }
  };

  const handleRetryFiscalization = async (id: number) => {
    try {
      const res = await fetchApi('/api/v1/finance/taxes/retry', {
        method: 'POST',
        body: JSON.stringify({ fiscalInvoiceId: id }),
      });
      setToastMessage({ text: res.message || 'Queued for retry.', type: 'success' });
      setTimeout(() => setToastMessage(null), 3000);
      loadTaxData();
    } catch (err: any) {
      alert(err.message || 'Retry failed');
    }
  };

  const handleExportItaxCsv = () => {
    if (!telemetry) return;

    const periodLabel =
      periodType === 'YEAR'
        ? `FY-${selectedYear}`
        : periodType === 'QUARTER'
        ? `${selectedYear}-Q${selectedQuarter}`
        : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

    const rows = [
      ['KRA Statutory VAT-3 & Tourism Levy Return Schedule', periodLabel],
      ['Taxpayer PIN', settings?.taxPin || 'NOT_REGISTERED'],
      ['Branch Scope', selectedBranchId === 'ALL' ? 'ALL_BRANCHES' : `BRANCH_${selectedBranchId}`],
      [],
      ['Section', 'Line Item', 'Amount (KES)'],
      ['1. Output Tax (Sales)', 'Gross Sales Billed', telemetry.salesOutputTax.grossSalesKes.toFixed(2)],
      ['1. Output Tax (Sales)', 'Net Taxable Sales Base', telemetry.salesOutputTax.netTaxableSalesKes.toFixed(2)],
      ['1. Output Tax (Sales)', 'Output VAT Collected (16%)', telemetry.salesOutputTax.outputVatKes.toFixed(2)],
      ['1. Output Tax (Sales)', 'Tourism & Catering Levy (2%)', telemetry.salesOutputTax.cateringLevyKes.toFixed(2)],
      ['2. Input Tax (Purchases)', 'Gross B2B Taxable Purchases', telemetry.purchasesInputTax.grossPurchasesKes.toFixed(2)],
      ['2. Input Tax (Purchases)', 'Deductible Input VAT', telemetry.purchasesInputTax.inputVatKes.toFixed(2)],
      ['3. Net Statutory Obligation', 'Net Payable VAT to KRA', telemetry.netVatObligation.netPayableVatKes.toFixed(2)],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KRA_VAT3_Return_${periodLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Enterprise Control <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Statutory Fiscal Compliance</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Landmark className="text-servora-core" size={24} />
            Statutory Tax Ledger & KRA eTIMS Fiscal Compliance
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Multi-period Output VAT and Catering Levy accounting, B2B Input Tax deductions, iTax VAT-3 export, and eTIMS OSCU receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-between xl:justify-end">
          {/* Branch Scope */}
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="ALL">All Branch Locations ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          {/* Filing Period Granularity */}
          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="MONTH">Monthly Return</option>
            <option value="QUARTER">Quarterly (Q1–Q4)</option>
            <option value="YEAR">Full Fiscal Year</option>
          </select>

          {periodType === 'MONTH' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2026, m - 1, 1).toLocaleString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
          )}

          {periodType === 'QUARTER' && (
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(Number(e.target.value))}
              className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
            >
              <option value={1}>Q1 (Jan – Mar)</option>
              <option value={2}>Q2 (Apr – Jun)</option>
              <option value={3}>Q3 (Jul – Sep)</option>
              <option value={4}>Q4 (Oct – Dec)</option>
            </select>
          )}

          {/* Rolling 11-Year Statutory Retention Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                FY {y}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportItaxCsv}
            disabled={!telemetry}
            className="px-3 py-2 bg-servora-navy text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40"
          >
            <Download size={13} /> Export iTax CSV
          </button>

          <button
            onClick={loadTaxData}
            title="Refresh Tax Ledger"
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

      {/* 2. STATUTORY TAX LIABILITY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Output VAT (Sales)</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              KES {telemetry ? telemetry.salesOutputTax.outputVatKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">
              From {telemetry?.salesOutputTax.paidOrdersCount || 0} Settled Checks
            </span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Receipt size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Input VAT (Deductions)</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              KES {telemetry ? telemetry.purchasesInputTax.inputVatKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-purple-600 font-medium">
              From {telemetry?.purchasesInputTax.invoicesCount || 0} Vendor Tax Bills
            </span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <FileSpreadsheet size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Net Payable VAT</span>
            <p
              className={`text-xl font-bold font-mono mt-0.5 ${
                telemetry && telemetry.netVatObligation.netPayableVatKes < 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              KES {telemetry ? telemetry.netVatObligation.netPayableVatKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] font-medium text-gray-500">
              {telemetry?.netVatObligation.isCreditRefundable ? 'Refundable Credit' : 'Statutory KRA Liability'}
            </span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <Landmark size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Catering Levy (2%)</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              KES {telemetry ? telemetry.salesOutputTax.cateringLevyKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-amber-600 font-medium">Tourism Fund Assessment</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Building size={18} />
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION TABS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl font-bold">
          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LEDGER' ? 'bg-white text-servora-navy shadow-xs' : 'text-gray-500 hover:text-black'
            }`}
          >
            <Receipt size={13} className="text-servora-core" />
            <span>Statutory VAT Return Reconciliation</span>
          </button>

          <button
            onClick={() => setActiveTab('ETIMS_DEVICES')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ETIMS_DEVICES' ? 'bg-white text-servora-navy shadow-xs' : 'text-gray-500 hover:text-black'
            }`}
          >
            <Cpu size={13} className="text-purple-600" />
            <span>eTIMS Electronic Transmission Feed ({fiscalInvoices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'SETTINGS' ? 'bg-white text-servora-navy shadow-xs' : 'text-gray-500 hover:text-black'
            }`}
          >
            <Settings size={13} className="text-emerald-600" />
            <span>Tax Codes & KRA Device Settings</span>
          </button>
        </div>

        {activeTab === 'ETIMS_DEVICES' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Order #, CU #, Buyer PIN..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Fiscal Statuses</option>
              <option value="FISCALIZED">Fiscalized</option>
              <option value="PENDING">Pending Queue</option>
              <option value="FAILED">Failed / Timeout</option>
            </select>
          </div>
        )}
      </div>

      {/* 4. TAB 1: STATUTORY VAT & LEVY COMPUTATION */}
      {activeTab === 'LEDGER' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-4 p-5">
          <div className="border-b border-gray-100 pb-3 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-servora-navy">
                KRA Statutory Return Audit & Balancing Computation
              </h3>
              <p className="text-[11px] text-gray-400">
                Period:{' '}
                <strong className="text-servora-navy font-mono">
                  {periodType === 'YEAR'
                    ? `FY ${selectedYear}`
                    : periodType === 'QUARTER'
                    ? `Q${selectedQuarter} ${selectedYear}`
                    : `${selectedMonth}/${selectedYear}`}
                </strong>{' '}
                &bull; Business PIN:{' '}
                <strong className="text-servora-navy font-mono">{settings?.taxPin || 'Not Registered'}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {telemetry?.period.filingDeadlineDate && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-1">
                  <CalendarClock size={13} /> Due: {telemetry.period.filingDeadlineDate}
                </span>
              )}
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-blue-50 text-servora-core border border-blue-200 rounded-lg">
                VAT Act 2013 & Tourism Act
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Output Tax Side */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100 space-y-2.5">
              <span className="font-bold text-xs text-servora-navy block uppercase tracking-wider">
                1. Output Tax Liability (Sales)
              </span>
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Gross Sales Billed:</span>
                  <span className="font-bold text-servora-navy">
                    KES {telemetry ? telemetry.salesOutputTax.grossSalesKes.toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Net Taxable Base:</span>
                  <span>KES {telemetry ? telemetry.salesOutputTax.netTaxableSalesKes.toLocaleString() : '0'}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Standard {settings?.vatRate ?? 16}% Output VAT:</span>
                  <span className="font-bold text-blue-700">
                    KES {telemetry ? telemetry.salesOutputTax.outputVatKes.toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Catering Training Levy ({settings?.cateringLevyRate ?? 2}%):</span>
                  <span className="text-amber-700">
                    KES {telemetry ? telemetry.salesOutputTax.cateringLevyKes.toLocaleString() : '0'}
                  </span>
                </div>
              </div>
            </div>

            {/* Input Tax Side */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100 space-y-2.5">
              <span className="font-bold text-xs text-servora-navy block uppercase tracking-wider">
                2. Input Tax Deductions (B2B Purchases)
              </span>
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Total Taxable Purchases:</span>
                  <span className="font-bold text-servora-navy">
                    KES {telemetry ? telemetry.purchasesInputTax.grossPurchasesKes.toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Deductible Input VAT:</span>
                  <span className="font-bold text-purple-700">
                    - KES {telemetry ? telemetry.purchasesInputTax.inputVatKes.toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 border-t border-gray-200 pt-1">
                  <span>Net Tax Payable to KRA:</span>
                  <span
                    className={`font-bold ${
                      telemetry && telemetry.netVatObligation.netPayableVatKes < 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    KES {telemetry ? telemetry.netVatObligation.netPayableVatKes.toLocaleString() : '0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 2: E-TIMS REAL-TIME INVOICES FEED */}
      {activeTab === 'ETIMS_DEVICES' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                  <th className="py-2.5 px-3">Fiscal Receipt ID</th>
                  <th className="py-2.5 px-3">Order #</th>
                  <th className="py-2.5 px-3">Control Unit (SDC Serial)</th>
                  <th className="py-2.5 px-3">Buyer PIN</th>
                  <th className="py-2.5 px-3 text-right">Order Gross</th>
                  <th className="py-2.5 px-3 text-right">Tax (VAT)</th>
                  <th className="py-2.5 px-3">Fiscalization Status</th>
                  <th className="py-2.5 px-3">CU Invoice #</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fiscalInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-gray-400 italic">
                      <div className="max-w-md mx-auto space-y-2">
                        <QrCode size={36} className="mx-auto opacity-20 text-servora-navy" />
                        <p className="font-bold text-servora-navy not-italic">No Fiscal Receipts Registered</p>
                        <p className="text-xs text-gray-500 not-italic">
                          Customer checks settled at POS terminals are automatically signed and transmitted to the KRA OSCU engine in real-time.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  fiscalInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-servora-navy">#{inv.id}</td>
                      <td className="py-3 px-3 font-mono font-medium text-servora-navy">
                        {inv.orderNumber || `Order #${inv.orderId}`}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-600">{inv.sdcId || 'OSCU-DEVICE-VIRTUAL'}</td>
                      <td className="py-3 px-3 font-mono text-gray-600">{inv.buyerKraPin || 'Consumer'}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                        KES {inv.orderTotal.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-600">
                        KES {inv.orderTax.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        {inv.fiscalStatus === 'FISCALIZED' ? (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                            <CheckCircle2 size={11} /> Fiscalized
                          </span>
                        ) : inv.fiscalStatus === 'FAILED' ? (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-max">
                            <AlertTriangle size={11} /> Transmission Failed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-max">
                            <Clock size={11} /> Queue Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-500">
                        {inv.cuInvoiceNumber || 'Pending Hash'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => setInspectedInvoice(inv)}
                          className="px-2 py-1 bg-slate-50 border border-gray-200 hover:bg-gray-100 rounded-lg text-[11px] font-bold text-servora-navy cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye size={11} /> Inspect
                        </button>
                        {inv.fiscalStatus === 'FAILED' && (
                          <button
                            onClick={() => handleRetryFiscalization(inv.id)}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold rounded-lg transition-colors text-[11px] cursor-pointer inline-flex items-center gap-1"
                          >
                            <RotateCw size={11} /> Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB 3: TAX CODES & DEVICE PARAMETERS */}
      {activeTab === 'SETTINGS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-servora-navy flex items-center gap-2">
              <Settings size={16} className="text-servora-core" />
              Tenant Tax Rates & KRA eTIMS Parameters
            </h3>

            <form onSubmit={handleSaveTaxSettings} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Company KRA Tax PIN *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. P051234567X"
                  value={editTaxPin}
                  onChange={(e) => setEditTaxPin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-servora-navy focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Standard VAT Rate (%) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={editVatRate}
                    onChange={(e) => setEditVatRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Catering Levy (%) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={editCateringRate}
                    onChange={(e) => setEditCateringRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">eTIMS Environment *</label>
                  <select
                    value={editEnvironment}
                    onChange={(e) => setEditEnvironment(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="SANDBOX">Sandbox (KRA Test Gateway)</option>
                    <option value="PRODUCTION">Production (Live KRA SDC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Control Unit Serial / SDC ID</label>
                  <input
                    type="text"
                    placeholder="e.g. OSCU-SDC-2026-001"
                    value={editDeviceSerial}
                    onChange={(e) => setEditDeviceSerial(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingSettings ? 'Saving...' : 'Update Statutory Tax Settings'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-servora-navy flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-servora-core" />
                Active Tax Codes & Classifications
              </h3>
              <button
                onClick={() => setIsAddCodeModalOpen(true)}
                className="px-2.5 py-1.5 bg-servora-core text-white rounded-lg text-[11px] font-bold hover:bg-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> Add Tax Code
              </button>
            </div>
            <p className="text-xs text-gray-500">System tax codes assigned to menu items and purchasing categories.</p>

            {taxCodes.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
                No custom statutory tax codes configured yet. Click <strong>Add Tax Code</strong> to register KRA tax classifications (e.g. VAT-16, ZERO-0, EXEMPT).
              </div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {taxCodes.map((tc) => (
                  <div key={tc.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-servora-navy block">{tc.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Code: {tc.code} &bull; KRA Classification: {tc.statutoryCode || 'None'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-servora-core bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {tc.rate}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. MODAL: ADD TAX CLASSIFICATION CODE */}
      {isAddCodeModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Register Statutory Tax Code</h3>
                <p className="text-[11px] text-gray-400">Define KRA eTIMS tax classification rate</p>
              </div>
              <button onClick={() => setIsAddCodeModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTaxCode} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Tax Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VAT-16"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold uppercase focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Rate (%) *</label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min="0"
                    max="100"
                    value={newCodeRate}
                    onChange={(e) => setNewCodeRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Description / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Rate (16% VAT)"
                  value={newCodeName}
                  onChange={(e) => setNewCodeName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">KRA eTIMS Classification Code</label>
                <select
                  value={newStatutoryCode}
                  onChange={(e) => setNewStatutoryCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none"
                >
                  <option value="B">B — Standard Rated (16%)</option>
                  <option value="A">A — Zero Rated (0%)</option>
                  <option value="E">E — Exempt Goods & Services</option>
                  <option value="LEVY">LEVY — Tourism & Catering Levy (2%)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCodeModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCode}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingCode ? 'Saving...' : 'Save Tax Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: E-TIMS FISCAL RECEIPT INSPECTOR */}
      {inspectedInvoice && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">KRA eTIMS Fiscal Certificate</h3>
                <p className="text-[11px] text-gray-400">
                  Receipt #{inspectedInvoice.id} &bull; {inspectedInvoice.orderNumber}
                </p>
              </div>
              <button onClick={() => setInspectedInvoice(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">CU Invoice #:</span>
                <span className="font-bold text-servora-navy">{inspectedInvoice.cuInvoiceNumber || 'PENDING'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SDC Serial ID:</span>
                <span>{inspectedInvoice.sdcId || 'OSCU-SCU-2026-NBO'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Buyer KRA PIN:</span>
                <span>{inspectedInvoice.buyerKraPin || 'B2C Walk-In'}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1.5">
                <span className="text-gray-500">Gross Amount:</span>
                <span className="font-bold">KES {inspectedInvoice.orderTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Output VAT (16%):</span>
                <span className="font-bold text-blue-700">KES {inspectedInvoice.orderTax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Catering Levy (2%):</span>
                <span className="font-bold text-amber-700">KES {inspectedInvoice.orderLevy.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedInvoice(null)}
                className="px-4 py-2 bg-servora-navy text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}