'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Landmark,
  DollarSign,
  TrendingUp,
  CreditCard,
  Receipt,
  Scale,
  SlidersHorizontal,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface FinanceOverviewData {
  period: string;
  financialSummary: {
    totalRevenueKes: number;
    totalCostOutflowKes: number;
    netOperatingMarginKes: number;
    marginPercentage: number;
    settledOrdersCount: number;
  };
  treasuryLiquidity: {
    cashDrawerFloatKes: number;
    activeDrawersCount: number;
    outstandingPayablesKes: number;
    pendingClaimsKes: number;
  };
  statutoryTaxOverview: {
    outputVatKes: number;
    inputVatCreditsKes: number;
    netVatPayableKes: number;
    cateringLevyKes: number;
    isRefundableCredit: boolean;
  };
  governanceQueue: {
    pendingExpenseClaims: number;
    pendingAdjustments: number;
    activeTillShifts: number;
    unbalancedShifts: number;
  };
}

interface TreasuryLedgerItem {
  id: number;
  paymentNumber: string;
  paymentFlow: string;
  status: string;
  paymentMethod: string;
  clearingAccount: string;
  transactionReference: string | null;
  amount: number;
  branchName?: string | null;
  createdAt: string;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

export default function FinanceHubPage() {
  const [data, setData] = useState<FinanceOverviewData | null>(null);
  const [recentLedger, setRecentLedger] = useState<TreasuryLedgerItem[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [period, setPeriod] = useState<'TODAY' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR'>('THIS_MONTH');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const branchParam = selectedBranchId !== 'ALL' ? `&branchId=${selectedBranchId}` : '';

      const [res, branchRes] = await Promise.all([
        fetchApi(`/api/v1/finance/overview?period=${period}${branchParam}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
      if (res?.data) {
        setData(res.data.overview);
        setRecentLedger(res.data.recentLedger || []);
      }
    } catch (err: any) {
      console.error('Failed to load finance overview:', err);
    } finally {
      setIsLoading(false);
    }
  }, [period, selectedBranchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = data?.financialSummary;
  const liquidity = data?.treasuryLiquidity;
  const tax = data?.statutoryTaxOverview;
  const queue = data?.governanceQueue;

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
            <span className="text-xs font-bold text-servora-navy">Financial Management & Treasury</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Landmark className="text-servora-core" size={24} />
            Executive Treasury & Financial Control Cockpit
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Real-time operating margins, multi-tender cash liquidity, accounts payable aging, and KRA eTIMS statutory compliance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-between xl:justify-end">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="ALL">All Branch Locations ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            {(['TODAY', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  period === p ? 'bg-white text-servora-navy shadow-xs' : 'text-gray-500 hover:text-black'
                }`}
              >
                {p === 'TODAY'
                  ? 'Today'
                  : p === 'THIS_MONTH'
                  ? 'This Month'
                  : p === 'THIS_QUARTER'
                  ? 'Quarter'
                  : 'This Year'}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            title="Refresh Ledger"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE LIQUIDITY & OPERATING MARGIN RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Operating Revenue</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              KES {summary ? summary.totalRevenueKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">
              {summary ? summary.settledOrdersCount : 0} Settled Dining Checks
            </span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Cost Outflows</span>
            <p className="text-xl font-bold font-mono text-rose-700 mt-0.5">
              KES {summary ? summary.totalCostOutflowKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Settled Bills & Disbursed Claims</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <ArrowDownRight size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Net Operating Margin</span>
            <p
              className={`text-xl font-bold font-mono mt-0.5 ${
                summary && summary.netOperatingMarginKes < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              KES {summary ? summary.netOperatingMarginKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] font-medium text-gray-500">
              {summary ? `${summary.marginPercentage}% Gross Margin` : '0%'}
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Open AP Obligations</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              KES {liquidity ? liquidity.outstandingPayablesKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-purple-600 font-medium">Committed Vendor Debt</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <CreditCard size={18} />
          </div>
        </div>
      </div>

      {/* 3. ENTERPRISE ACTIONABLE GOVERNANCE & FIDUCIARY QUEUE */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-servora-core" size={18} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-servora-navy">
              Fiduciary Control & Maker-Checker Queue
            </h3>
          </div>
          <span className="text-[11px] font-mono text-gray-400">Live Segregation-of-Duties Audit</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <Link
            href="/finance/expenses"
            className="p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-gray-200 rounded-xl transition-colors space-y-1 block"
          >
            <div className="flex justify-between items-center text-gray-500 font-bold text-[11px]">
              <span className="flex items-center gap-1.5">
                <Receipt size={13} className="text-blue-600" /> Pending Claims
              </span>
              <span className="font-mono text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded text-[10px]">
                {queue?.pendingExpenseClaims || 0}
              </span>
            </div>
            <p className="text-sm font-bold font-mono text-servora-navy">
              KES {liquidity ? liquidity.pendingClaimsKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-400 block">Requires supervisor approval</span>
          </Link>

          <Link
            href="/finance/adjustments"
            className="p-3.5 bg-slate-50 hover:bg-amber-50/50 border border-gray-200 rounded-xl transition-colors space-y-1 block"
          >
            <div className="flex justify-between items-center text-gray-500 font-bold text-[11px]">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal size={13} className="text-amber-600" /> Pending Adjustments
              </span>
              <span className="font-mono text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded text-[10px]">
                {queue?.pendingAdjustments || 0}
              </span>
            </div>
            <p className="text-sm font-bold font-mono text-servora-navy">
              {queue?.pendingAdjustments || 0} Vouchers
            </p>
            <span className="text-[10px] text-gray-400 block">Maker-Checker GL sign-off</span>
          </Link>

          <Link
            href="/cash-management/shifts"
            className="p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-gray-200 rounded-xl transition-colors space-y-1 block"
          >
            <div className="flex justify-between items-center text-gray-500 font-bold text-[11px]">
              <span className="flex items-center gap-1.5">
                <Wallet size={13} className="text-emerald-600" /> Active Cash Tills
              </span>
              <span className="font-mono text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded text-[10px]">
                {queue?.activeTillShifts || 0}
              </span>
            </div>
            <p className="text-sm font-bold font-mono text-servora-navy">
              KES {liquidity ? liquidity.cashDrawerFloatKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-gray-400 block">Drawers currently in service</span>
          </Link>

          <Link
            href="/cash-management/reconciliation"
            className="p-3.5 bg-slate-50 hover:bg-rose-50/50 border border-gray-200 rounded-xl transition-colors space-y-1 block"
          >
            <div className="flex justify-between items-center text-gray-500 font-bold text-[11px]">
              <span className="flex items-center gap-1.5">
                <Scale size={13} className="text-rose-600" /> Unbalanced Shifts
              </span>
              <span className="font-mono text-rose-700 bg-rose-100/70 px-1.5 py-0.2 rounded text-[10px]">
                {queue?.unbalancedShifts || 0}
              </span>
            </div>
            <p className="text-sm font-bold font-mono text-rose-700">
              {queue?.unbalancedShifts || 0} Discrepancies
            </p>
            <span className="text-[10px] text-gray-400 block">Variance audit required</span>
          </Link>
        </div>
      </div>

      {/* 4. MODULE NAVIGATION TILES & TAX POSITION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Module Fast Navigation */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-servora-navy">
            Enterprise Financial Core Modules
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <Link
              href="/finance/payables"
              className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-gray-100 rounded-xl transition-colors flex justify-between items-center group"
            >
              <div>
                <span className="font-bold text-servora-navy block group-hover:text-servora-core">
                  Accounts Payable (AP)
                </span>
                <span className="text-[11px] text-gray-400">Procure-to-pay 3-way match & vendor aging</span>
              </div>
              <ArrowUpRight size={16} className="text-gray-400 group-hover:text-servora-core transition-transform" />
            </Link>

            <Link
              href="/finance/expenses"
              className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-gray-100 rounded-xl transition-colors flex justify-between items-center group"
            >
              <div>
                <span className="font-bold text-servora-navy block group-hover:text-servora-core">
                  Corporate Expenses
                </span>
                <span className="text-[11px] text-gray-400">Employee claims, per diems & petty cash</span>
              </div>
              <ArrowUpRight size={16} className="text-gray-400 group-hover:text-servora-core transition-transform" />
            </Link>

            <Link
              href="/finance/taxes"
              className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-gray-100 rounded-xl transition-colors flex justify-between items-center group"
            >
              <div>
                <span className="font-bold text-servora-navy block group-hover:text-servora-core">
                  Taxes & KRA eTIMS
                </span>
                <span className="text-[11px] text-gray-400">Output/Input VAT returns & fiscal SDC devices</span>
              </div>
              <ArrowUpRight size={16} className="text-gray-400 group-hover:text-servora-core transition-transform" />
            </Link>

            <Link
              href="/finance/adjustments"
              className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-gray-100 rounded-xl transition-colors flex justify-between items-center group"
            >
              <div>
                <span className="font-bold text-servora-navy block group-hover:text-servora-core">
                  General Ledger Adjustments
                </span>
                <span className="text-[11px] text-gray-400">Till write-offs & Maker-Checker journals</span>
              </div>
              <ArrowUpRight size={16} className="text-gray-400 group-hover:text-servora-core transition-transform" />
            </Link>
          </div>
        </div>

        {/* Real-time VAT Position Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-servora-navy">KRA VAT Position</span>
              <span className="text-[10px] font-mono font-bold bg-blue-50 text-servora-core px-2 py-0.5 rounded border border-blue-200">
                VAT Act 2013
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-gray-600">
                <span>Output VAT (Sales):</span>
                <span className="font-bold text-servora-navy">
                  KES {tax ? tax.outputVatKes.toLocaleString() : '0'}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Input VAT (Credits):</span>
                <span className="text-purple-700">
                  - KES {tax ? tax.inputVatCreditsKes.toLocaleString() : '0'}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Catering Levy (2%):</span>
                <span className="text-amber-700">
                  KES {tax ? tax.cateringLevyKes.toLocaleString() : '0'}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-bold">
                <span className="text-servora-navy">Net Obligation:</span>
                <span className={tax && tax.netVatPayableKes < 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  KES {tax ? tax.netVatPayableKes.toLocaleString() : '0'}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/finance/taxes"
            className="w-full py-2 bg-slate-50 border border-gray-200 hover:bg-gray-100 rounded-xl text-center text-xs font-bold text-servora-navy block transition-colors"
          >
            Open Statutory Tax Filing
          </Link>
        </div>
      </div>

      {/* 5. RECENT TREASURY DISBURSEMENTS & PAYMENTS AUDIT TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-servora-navy">
            Recent Treasury Flows & Payments Ledger
          </span>
          <span className="text-[11px] font-mono text-gray-400">Audit Log ({recentLedger.length})</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Payment #</th>
                <th className="py-2.5 px-3">Flow</th>
                <th className="py-2.5 px-3">Method & Channel</th>
                <th className="py-2.5 px-3">Clearing Account</th>
                <th className="py-2.5 px-3">Branch</th>
                <th className="py-2.5 px-3">Reference #</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentLedger.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 italic">
                    <p className="font-bold text-servora-navy not-italic">No Treasury Payments on Record</p>
                    <p className="text-xs text-gray-500 not-italic">
                      New tenants start with an unpolluted zero-state. POS settlements, AP payments, and expense disbursements appear here automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                recentLedger.map((pmt) => (
                  <tr key={pmt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-servora-navy">{pmt.paymentNumber}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase ${
                          pmt.paymentFlow === 'INBOUND_AR'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {pmt.paymentFlow}
                      </span>
                    </td>
                    <td className="py-3 px-3">{pmt.paymentMethod.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-3 text-gray-600">{pmt.clearingAccount}</td>
                    <td className="py-3 px-3 text-gray-500">{pmt.branchName || 'All / Shared'}</td>
                    <td className="py-3 px-3 font-mono text-gray-500">{pmt.transactionReference || '—'}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                      KES {pmt.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {pmt.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-500">
                      {new Date(pmt.createdAt).toLocaleDateString()}
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