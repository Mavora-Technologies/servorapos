'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  ChevronRight,
  Calendar,
  Search,
  AlertTriangle,
  Filter,
  ShieldCheck,
  FileSpreadsheet,
  ArrowUpDown,
  UserCheck,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface LoyaltyTransactionRecord {
  id: number;
  entryType: 'ACCRUAL_PURCHASE' | 'REDEMPTION_VOUCHER' | 'MANUAL_ADJUSTMENT' | 'EXPIRY_DEDUCTION' | 'TIER_BONUS';
  pointsDelta: number;
  monetaryValueKes: number;
  balanceBefore: number;
  balanceAfter: number;
  channel: string;
  auditReference: string | null;
  notes: string | null;
  createdAt: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  orderNumber: string | null;
  rewardName: string | null;
  branchName: string;
  processedByName: string;
}

interface LoyaltyTxSummary {
  totalLedgerEntries: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  netPointsDelta: number;
  totalMonetaryEquivalentKes: number;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

const TYPE_CONFIG = {
  ACCRUAL_PURCHASE: { label: 'Earn (Purchase)', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  REDEMPTION_VOUCHER: { label: 'Redeem (Voucher)', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
  MANUAL_ADJUSTMENT: { label: 'Manual Adjustment', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  TIER_BONUS: { label: 'Tier Bonus', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
  EXPIRY_DEDUCTION: { label: 'Expiry Deduction', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
};

export default function LoyaltyTransactionsPage() {
  const [summary, setSummary] = useState<LoyaltyTxSummary | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransactionRecord[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Filters & State
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'CREATED_AT' | 'POINTS' | 'VALUE'>('CREATED_AT');

  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const params = new URLSearchParams();
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (entryTypeFilter !== 'ALL') params.set('entryType', entryTypeFilter);
      params.set('sortBy', sortBy);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const [reportRes, branchRes] = await Promise.all([
        fetchApi(`/api/v1/loyalty/transactions?${params.toString()}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (reportRes?.data) {
        setSummary(reportRes.data.summary);
        setTransactions(reportRes.data.transactions || []);
      }

      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load loyalty transaction audit:', err);
      setErrorMessage(err.message || 'Failed to aggregate loyalty ledger telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, startDate, endDate, entryTypeFilter, sortBy, searchQuery]);

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
    return null;
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (entryTypeFilter !== 'ALL') params.set('entryType', entryTypeFilter);

      const token = getAuthToken();
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${apiBaseUrl}/api/v1/loyalty/transactions/export?${params.toString()}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loyalty-transactions-${Date.now()}.csv`;
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
              href="/loyalty"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Loyalty Hub <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Transaction Audit Ledger</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Coins className="text-servora-core" size={22} />
            Loyalty Point Ledger & Transaction Audit
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Immutable audit trail of point accruals, reward redemptions, monetary equivalents, and operator adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Download size={13} />
            <span>{isExporting ? 'Exporting...' : 'Export Audit (CSV)'}</span>
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
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
            <Calendar size={13} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-[11px] font-mono font-bold text-servora-navy focus:outline-none"
            />
            <span className="text-gray-400 font-mono">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-[11px] font-mono font-bold text-servora-navy focus:outline-none"
            />
          </div>

          <select
            value={entryTypeFilter}
            onChange={(e) => setEntryTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Entry Types</option>
            <option value="ACCRUAL_PURCHASE">Accrual (Purchase)</option>
            <option value="REDEMPTION_VOUCHER">Redemption (Voucher)</option>
            <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
            <option value="TIER_BONUS">Tier Bonus</option>
          </select>

          {branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Branch Terminals</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 3. EXECUTIVE LEDGER KPI RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Audit Entries</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {summary ? summary.totalLedgerEntries.toLocaleString() : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Logged Transactions</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Coins size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Points Issued</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              +{summary ? summary.totalPointsIssued.toLocaleString() : 0} pts
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Accruals & Bonuses</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Points Redeemed</span>
            <p className="text-xl font-bold font-mono text-rose-700 mt-0.5">
              &minus;{summary ? summary.totalPointsRedeemed.toLocaleString() : 0} pts
            </p>
            <span className="text-[10px] text-rose-600 font-medium">Redemptions Burned</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <TrendingDown size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Monetary Value Equiv.</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              KES {summary ? summary.totalMonetaryEquivalentKes.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Discount Liability</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
        </div>
      </div>

      {/* 4. IMMUTABLE LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-xs text-servora-navy uppercase tracking-wider">
              Loyalty Transaction Ledger ({transactions.length} Records)
            </h3>
            <p className="text-[10px] text-gray-400">Verifiable chronological point movements</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="CREATED_AT">Sort by Timestamp</option>
              <option value="POINTS">Sort by Points Delta</option>
              <option value="VALUE">Sort by Monetary Value</option>
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="Search reference..."
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
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Audit Ref #</th>
                <th className="py-2.5 px-3">Patron Member</th>
                <th className="py-2.5 px-3">Entry Type</th>
                <th className="py-2.5 px-3 text-right">Points Delta</th>
                <th className="py-2.5 px-3 text-right">Balance After</th>
                <th className="py-2.5 px-3">Description / Order</th>
                <th className="py-2.5 px-3">Terminal Branch</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 italic">
                    {isLoading ? 'Loading ledger records...' : 'No loyalty transactions found matching criteria.'}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const cfg = TYPE_CONFIG[tx.entryType] || TYPE_CONFIG.MANUAL_ADJUSTMENT;
                  const isPositive = tx.pointsDelta > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-servora-core whitespace-nowrap">
                        {tx.auditReference || `TRX-${tx.id}`}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{tx.customerName}</span>
                        <span className="font-mono text-[10px] text-gray-400">{tx.customerPhone}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono uppercase font-bold border ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isPositive ? `+${tx.pointsDelta}` : tx.pointsDelta} pts
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                        {tx.balanceAfter.toLocaleString()} pts
                      </td>
                      <td className="py-3 px-3 text-gray-600 truncate max-w-[180px]">
                        {tx.notes || tx.orderNumber ? `Order #${tx.orderNumber}` : 'Direct adjustment'}
                      </td>
                      <td className="py-3 px-3 text-gray-500">
                        {tx.branchName}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}