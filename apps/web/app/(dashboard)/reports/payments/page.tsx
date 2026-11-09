'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  RefreshCw,
  ChevronRight,
  Calendar,
  Search,
  ArrowUpDown,
  Building2,
  Wallet,
  ShieldCheck,
  Smartphone,
  Landmark,
  Layers,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface PaymentSummary {
  totalTransactions: number;
  totalInflowAR: number;
  totalOutflowAP: number;
  netCashFlow: number;
  reconciledAmount: number;
  unreconciledAmount: number;
  bouncedReversedAmount: number;
  bouncedReversedCount: number;
  reconciliationRatePercent: number;
}

interface ClearingAccountItem {
  accountName: string;
  transactionCount: number;
  inflow: number;
  outflow: number;
  netBalance: number;
}

interface TenderBreakdownItem {
  paymentMethod: string;
  transactionCount: number;
  totalCollected: number;
  totalDisbursed: number;
}

interface TimelinePoint {
  timeBucket: string;
  inflow: number;
  outflow: number;
  netCash: number;
  transactionCount: number;
}

interface LedgerTransaction {
  id: number;
  paymentNumber: string;
  paymentFlow: 'INBOUND_AR' | 'OUTBOUND_AP';
  status: 'POSTED' | 'RECONCILED' | 'CANCELLED_REVERSED' | 'BOUNCED';
  paymentMethod: string;
  clearingAccount: string;
  transactionReference: string;
  amount: number;
  currency: string;
  partyIdentifier: string;
  branchName: string;
  processedByName: string;
  isReversed: boolean;
  isReconciled: boolean;
  createdAt: string;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

const PALETTE = ['#0554F4', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#14B8A6'];

export default function PaymentReportsPage() {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [clearingAccounts, setClearingAccounts] = useState<ClearingAccountItem[]>([]);
  const [tenderBreakdown, setTenderBreakdown] = useState<TenderBreakdownItem[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [ledger, setLedger] = useState<LedgerTransaction[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Filters & Parameters
  const [paymentFlowFilter, setPaymentFlowFilter] = useState<'ALL' | 'INBOUND_AR' | 'OUTBOUND_AP'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyPreset = (preset: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH') => {
    setDatePreset(preset);
    const now = new Date();
    let s = new Date();
    let e = new Date();

    if (preset === 'TODAY') {
      s = now;
      e = now;
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay() || 7;
      s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
      e = new Date();
    } else if (preset === 'THIS_MONTH') {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = new Date();
    }

    setStartDate(s.toISOString().split('T')[0]);
    setEndDate(e.toISOString().split('T')[0]);
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const params = new URLSearchParams();
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (paymentFlowFilter !== 'ALL') params.set('paymentFlow', paymentFlowFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const [reportRes, branchRes] = await Promise.all([
        fetchApi(`/api/v1/reports/payments?${params.toString()}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (reportRes?.data) {
        setSummary(reportRes.data.summary);
        setClearingAccounts(reportRes.data.clearingAccounts || []);
        setTenderBreakdown(reportRes.data.tenderBreakdown || []);
        setTimeline(reportRes.data.timeline || []);
        setLedger(reportRes.data.ledger || []);
      }

      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load payment report:', err);
      setErrorMessage(err.message || 'Failed to aggregate payment telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, startDate, endDate, paymentFlowFilter, statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    const directKeys = ['token', 'accessToken', 'access_token', 'auth_token', 'authToken', 'jwt', 'servora_token'];
    for (const key of directKeys) {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (val && val.trim() !== '') return val.trim();
    }
    const jsonKeys = ['user', 'auth', 'session', 'servora_user', 'servora_auth'];
    for (const key of jsonKeys) {
      try {
        const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const candidate = parsed.token || parsed.accessToken || parsed.access_token || parsed.data?.token;
          if (candidate && typeof candidate === 'string') return candidate.trim();
        }
      } catch {
        // scan next
      }
    }
    const cookieMatch = document.cookie.match(/(?:^|;\s*)(?:token|accessToken|access_token|auth_token)\s*=\s*([^;]+)/);
    if (cookieMatch) return decodeURIComponent(cookieMatch[1]);
    return null;
  };

  const handleExport = async (exportType: 'LEDGER_TRANSACTIONS' | 'CLEARING_ACCOUNTS' | 'DAILY_TENDER_SUMMARY') => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      params.set('exportType', exportType);
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (paymentFlowFilter !== 'ALL') params.set('paymentFlow', paymentFlowFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const token = getAuthToken();
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${apiBaseUrl}/api/v1/reports/payments/export?${params.toString()}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-report-${exportType.toLowerCase()}-${startDate}-to-${endDate}.csv`;
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

  // Donut Arc Generator for Clearing Account Share
  const donutMetrics = useMemo(() => {
    const total = clearingAccounts.reduce((sum, c) => sum + Math.max(0, c.netBalance), 0) || 1;
    let accumulated = 0;
    const radius = 56;
    const circumference = 2 * Math.PI * radius;

    const arcs = clearingAccounts.map((account, idx) => {
      const positiveBal = Math.max(0, account.netBalance);
      const fraction = positiveBal / total;
      const strokeDasharray = `${fraction * circumference} ${circumference}`;
      const strokeDashoffset = -accumulated * circumference;
      accumulated += fraction;
      const color = PALETTE[idx % PALETTE.length];

      return {
        account,
        percentage: Math.round(fraction * 100),
        strokeDasharray,
        strokeDashoffset,
        color,
      };
    });

    return { total, arcs };
  }, [clearingAccounts]);

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
            <span className="text-xs font-bold text-servora-navy">Treasury & Settlements</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <CreditCard className="text-servora-core" size={22} />
            Payment Settlements & Treasury Cash Flow
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Audit inbound customer collections (AR), outbound supplier settlements (AP), clearing accounts, and reconciliation balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => handleExport('LEDGER_TRANSACTIONS')}
            disabled={isExporting}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Download size={13} />
            <span>{isExporting ? 'Exporting...' : 'Export Ledger (CSV)'}</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh Ledger"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. DATE PRESETS & BRANCH FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          {(['TODAY', 'THIS_WEEK', 'THIS_MONTH'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                datePreset === preset
                  ? 'bg-servora-navy text-white shadow-xs'
                  : 'bg-slate-50 text-servora-navy border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {preset.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
            <Calendar size={13} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDatePreset('CUSTOM');
                setStartDate(e.target.value);
              }}
              className="bg-transparent text-[11px] font-mono font-bold text-servora-navy focus:outline-none"
            />
            <span className="text-gray-400 font-mono">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDatePreset('CUSTOM');
                setEndDate(e.target.value);
              }}
              className="bg-transparent text-[11px] font-mono font-bold text-servora-navy focus:outline-none"
            />
          </div>

          <select
            value={paymentFlowFilter}
            onChange={(e) => setPaymentFlowFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="ALL">All Flows (AR + AP)</option>
            <option value="INBOUND_AR">Inbound Collections (AR)</option>
            <option value="OUTBOUND_AP">Disbursements & AP</option>
          </select>

          {branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
            >
              <option value="ALL">All Branch Locations</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 3. TREASURY FINANCIAL KPI RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Net Cash Flow</span>
          <p className="text-xl font-bold font-mono text-servora-navy mt-1">
            KES {summary ? summary.netCashFlow.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block flex items-center gap-0.5">
            <TrendingUp size={11} /> Collections &minus; Outflows
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Customer Inflow (AR)</span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
            KES {summary ? summary.totalInflowAR.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">{summary?.totalTransactions || 0} Settled Trans.</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Vendor Outflow (AP)</span>
          <p className="text-xl font-bold font-mono text-rose-700 mt-1">
            KES {summary ? summary.totalOutflowAP.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Supplier Disbursements</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Pending Float</span>
          <p className="text-xl font-bold font-mono text-amber-600 mt-1">
            KES {summary ? summary.unreconciledAmount.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Unreconciled Shift Cash</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Reconciliation Rate</span>
          <p className="text-xl font-bold font-mono text-indigo-700 mt-1">
            {summary ? `${summary.reconciliationRatePercent}%` : '100%'}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block flex items-center gap-0.5">
            <ShieldCheck size={11} /> Bank Matched
          </span>
        </div>
      </div>

      {/* 4. VISUAL CLEARING ACCOUNTS DONUT & VELOCITY TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Clearing Account Donut Distribution (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Treasury Clearing Accounts</h3>
              <p className="text-[10px] text-gray-400">Share of liquidity across banks and paybills</p>
            </div>
            <button
              onClick={() => handleExport('CLEARING_ACCOUNTS')}
              className="text-[10px] font-bold text-servora-core hover:underline cursor-pointer"
            >
              Export
            </button>
          </div>

          <div className="flex flex-col items-center justify-center pt-2">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90 transform">
                {donutMetrics.arcs.map((arc, idx) => (
                  <circle
                    key={idx}
                    cx="80"
                    cy="80"
                    r="56"
                    fill="transparent"
                    stroke={arc.color}
                    strokeWidth="18"
                    strokeDasharray={arc.strokeDasharray}
                    strokeDashoffset={arc.strokeDashoffset}
                    className="transition-all duration-500"
                  />
                ))}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[9px] uppercase font-bold text-gray-400">Net Treasury</span>
                <span className="font-mono font-bold text-xs text-servora-navy">
                  KES {summary ? summary.netCashFlow.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 w-full pt-4">
              {donutMetrics.arcs.map((arc, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50/70 border border-gray-100">
                  <div className="flex items-center gap-2 truncate max-w-[180px]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: arc.color }} />
                    <span className="truncate font-bold text-servora-navy text-[11px]">{arc.account.accountName}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-gray-500">{arc.percentage}%</span>
                    <span className="font-bold text-servora-navy">
                      KES {arc.account.netBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Method Breakdown & Cash Flow Velocity (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Settlement Channels & Tender Mix</h3>
              <p className="text-[10px] text-gray-400">Inbound receipts and outgoing settlements</p>
            </div>
            <button
              onClick={() => handleExport('DAILY_TENDER_SUMMARY')}
              className="text-[10px] font-bold text-servora-core hover:underline cursor-pointer"
            >
              Export Daily
            </button>
          </div>

          <div className="space-y-3">
            {tenderBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">No payment transactions recorded.</p>
            ) : (
              tenderBreakdown.map((t, idx) => {
                const totalIn = summary?.totalInflowAR || 1;
                const ratio = Math.min(100, Math.max(5, Math.round((t.totalCollected / totalIn) * 100)));

                return (
                  <div key={idx} className="p-3 bg-slate-50 border border-gray-100 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-servora-navy font-mono">{t.paymentMethod}</span>
                        <span className="text-[10px] text-gray-400 font-mono">({t.transactionCount} trans)</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-emerald-700 font-bold">
                          +KES {t.totalCollected.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        {t.totalDisbursed > 0 && (
                          <span className="text-rose-600 font-bold">
                            &minus;KES {t.totalDisbursed.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
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
      </div>

      {/* 5. AUDITABLE DETAILED TRANSACTION LEDGER */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-xs text-servora-navy uppercase tracking-wider">
              Treasury Settlement Ledger ({ledger.length} Transactions)
            </h3>
            <p className="text-[10px] text-gray-400">Verifiable transaction logs matching general clearing accounts</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="POSTED">Posted (Pending Recon)</option>
              <option value="RECONCILED">Reconciled</option>
              <option value="CANCELLED_REVERSED">Cancelled / Reversed</option>
              <option value="BOUNCED">Bounced</option>
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="Search reference #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core w-36 sm:w-48 font-medium"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Payment #</th>
                <th className="py-2.5 px-3">Flow</th>
                <th className="py-2.5 px-3">Method & Account</th>
                <th className="py-2.5 px-3">Transaction Ref</th>
                <th className="py-2.5 px-3">Party / Document</th>
                <th className="py-2.5 px-3 text-right">Amount (KES)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                    {isLoading ? 'Aggregating treasury transactions...' : 'No payment records found matching active filters.'}
                  </td>
                </tr>
              ) : (
                ledger.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-servora-core whitespace-nowrap">
                      {tx.paymentNumber}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase ${
                          tx.paymentFlow === 'INBOUND_AR'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {tx.paymentFlow === 'INBOUND_AR' ? 'AR Inflow' : 'AP Outflow'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-servora-navy block">{tx.paymentMethod}</span>
                      <span className="text-[10px] text-gray-400 truncate max-w-[160px] block">{tx.clearingAccount}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-700 font-bold whitespace-nowrap">
                      {tx.transactionReference}
                    </td>
                    <td className="py-3 px-3 text-gray-600 truncate max-w-[150px]">
                      {tx.partyIdentifier}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span className={tx.paymentFlow === 'INBOUND_AR' ? 'text-emerald-700' : 'text-rose-700'}>
                        {tx.paymentFlow === 'INBOUND_AR' ? '+' : '&minus;'}KES {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                          tx.status === 'RECONCILED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : tx.status === 'POSTED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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