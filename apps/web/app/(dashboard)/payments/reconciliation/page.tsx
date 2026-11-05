'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Landmark, 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight, 
  Search, 
  Clock, 
  AlertTriangle, 
  Plus, 
  X, 
  RotateCcw, 
  FileText, 
  Check, 
  DollarSign, 
  Sparkles, 
  RefreshCw, 
  Upload, 
  Smartphone,
  Wallet,
  ShieldCheck,
  Scale,
  Zap,
  SlidersHorizontal,
  FileSpreadsheet,
  Layers,
  FileCheck,
  Receipt
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface OpenPaymentItem {
  id: number;
  paymentNumber: string;
  paymentFlow: 'OUTBOUND_AP' | 'INBOUND_AR';
  paymentMethod: string;
  clearingAccount: string;
  transactionReference: string | null;
  amount: string;
  supplierName: string | null;
  invoiceNumber: string | null;
  createdAt: string;
}

interface OpenBankLineItem {
  id: number;
  bankStatementId: number;
  statementNumber: string;
  clearingAccount: string;
  lineDate: string;
  transactionReference: string | null;
  description: string;
  amount: string;
}

interface ReconciledPair {
  paymentId: number;
  paymentNumber: string;
  paymentFlow: string;
  amount: string;
  clearingAccount: string;
  transactionReference: string | null;
  reconciledAt: string;
  notes: string | null;
}

interface WorkbenchSummary {
  unreconciledBookPaymentsCount: number;
  unreconciledBookAmount: number;
  unreconciledBankLinesCount: number;
  unreconciledBankAmount: number;
  netDiscrepancy: number;
}

interface OpenInvoiceOption {
  id: number;
  invoiceNumber: string;
  supplierName: string;
  totalAmount: string;
  paidAmount: string;
}

const CLEARING_ACCOUNTS = [
  'ALL',
  'M-Pesa B2B Corporate Paybill (55210)',
  'Equity Bank Operational Account (KES)',
  'KCB Bank Head Office Account',
  'Main Safe Petty Cash Drawer',
];

export default function BankReconciliationPage() {
  const [openPayments, setOpenPayments] = useState<OpenPaymentItem[]>([]);
  const [openBankLines, setOpenBankLines] = useState<OpenBankLineItem[]>([]);
  const [reconciledHistory, setReconciledHistory] = useState<ReconciledPair[]>([]);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoiceOption[]>([]);
  const [summary, setSummary] = useState<WorkbenchSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs: Active Matching vs History
  const [activeTab, setActiveTab] = useState<'MATCHING' | 'HISTORY'>('MATCHING');

  // Filters & Account Selector
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Selection states
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [selectedBankLineId, setSelectedBankLineId] = useState<number | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isAutoMatching, setIsAutoMatching] = useState(false);

  // Direct Bank Line Clearance Action Sheet Modal
  const [activeBankLineModal, setActiveBankLineModal] = useState<OpenBankLineItem | null>(null);
  const [lineClearanceMode, setLineClearanceMode] = useState<'EXPENSE' | 'INVOICE'>('EXPENSE');
  const [expenseCategory, setExpenseCategory] = useState<'BANK_FEES_COMMISSIONS' | 'INTEREST_EXPENSE' | 'WITHHOLDING_TAX' | 'GENERAL_EXPENSE'>('BANK_FEES_COMMISSIONS');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [clearanceNotes, setClearanceNotes] = useState('');
  const [isClearingLine, setIsClearingLine] = useState(false);

  // Clean Production Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [statementAccount, setStatementAccount] = useState(CLEARING_ACCOUNTS[1]);
  const [statementNumber, setStatementNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0]);
  const [csvPasteText, setCsvPasteText] = useState('');
  const [linesPayload, setLinesPayload] = useState<{
    lineDate: string;
    transactionReference: string;
    description: string;
    amount: number;
  }[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const query = selectedAccount !== 'ALL' ? `?clearingAccount=${encodeURIComponent(selectedAccount)}` : '';
      const [wbRes, invRes] = await Promise.all([
        fetchApi(`/api/v1/payments/reconciliation/workbench${query}`),
        fetchApi('/api/v1/purchasing/invoices').catch(() => ({ data: [] })),
      ]);

      if (wbRes?.data) {
        setOpenPayments(wbRes.data.openPayments || []);
        setOpenBankLines(wbRes.data.openBankLines || []);
        setReconciledHistory(wbRes.data.reconciledHistory || []);
        setSummary(wbRes.data.summary || null);
      }
      if (invRes?.data) {
        const rawInvoices = invRes.data.invoices || invRes.data || [];
        setOpenInvoices(rawInvoices.filter((i: any) => i.status !== 'PAID'));
      }
    } catch (err) {
      console.error('Failed to load reconciliation workbench:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedAccount]);

  const selectedPayment = useMemo(() => {
    return openPayments.find((p) => p.id === selectedPaymentId) || null;
  }, [openPayments, selectedPaymentId]);

  const selectedBankLine = useMemo(() => {
    return openBankLines.find((l) => l.id === selectedBankLineId) || null;
  }, [openBankLines, selectedBankLineId]);

  const selectedVariance = useMemo(() => {
    if (!selectedPayment || !selectedBankLine) return null;
    const pmtAmt = parseFloat(selectedPayment.amount);
    const lineAmt = Math.abs(parseFloat(selectedBankLine.amount));
    return Number((pmtAmt - lineAmt).toFixed(2));
  }, [selectedPayment, selectedBankLine]);

  // Confidence algorithm
  const getMatchConfidence = (p: OpenPaymentItem, l: OpenBankLineItem) => {
    const pmtAmt = parseFloat(p.amount);
    const lineAmt = Math.abs(parseFloat(l.amount));
    const refMatch = p.transactionReference && l.transactionReference && 
      p.transactionReference.trim().toLowerCase() === l.transactionReference.trim().toLowerCase();
    const amtMatch = Math.abs(pmtAmt - lineAmt) < 0.01;

    if (refMatch && amtMatch) return { label: '100% Exact Match', color: 'emerald' };
    if (refMatch) return { label: 'Reference Match', color: 'blue' };
    if (amtMatch) return { label: 'Amount Match', color: 'amber' };
    return null;
  };

  // 1. Two-Sided Match Action
  const handleMatch = async () => {
    if (!selectedPaymentId || !selectedBankLineId) {
      alert('Please select both one Book Payment and one matching Bank Statement Line.');
      return;
    }

    setIsMatching(true);
    try {
      await fetchApi('/api/v1/payments/reconciliation/match', {
        method: 'POST',
        body: JSON.stringify({
          statementLineId: selectedBankLineId,
          paymentId: selectedPaymentId,
        }),
      });

      setSelectedPaymentId(null);
      setSelectedBankLineId(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to match and reconcile pair');
    } finally {
      setIsMatching(false);
    }
  };

  // 2. 1-Click Auto Match Action
  const handleAutoMatch = async () => {
    setIsAutoMatching(true);
    try {
      const res = await fetchApi('/api/v1/payments/reconciliation/auto-match', {
        method: 'POST',
        body: JSON.stringify({
          clearingAccount: selectedAccount,
        }),
      });

      alert(res.message || 'Auto-matching finished');
      setSelectedPaymentId(null);
      setSelectedBankLineId(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Auto-match run failed');
    } finally {
      setIsAutoMatching(false);
    }
  };

  // 3. Unmatched Bank Line Direct Resolution Action
  const handleClearDirectBankLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBankLineModal) return;

    setIsClearingLine(true);
    try {
      if (lineClearanceMode === 'EXPENSE') {
        await fetchApi('/api/v1/payments/reconciliation/clear-expense', {
          method: 'POST',
          body: JSON.stringify({
            statementLineId: activeBankLineModal.id,
            expenseCategory,
            notes: clearanceNotes || undefined,
          }),
        });
      } else {
        if (!selectedInvoiceId) {
          alert('Please select a target supplier invoice to clear');
          setIsClearingLine(false);
          return;
        }
        await fetchApi('/api/v1/payments/reconciliation/clear-invoice', {
          method: 'POST',
          body: JSON.stringify({
            statementLineId: activeBankLineModal.id,
            supplierInvoiceId: parseInt(selectedInvoiceId, 10),
            notes: clearanceNotes || undefined,
          }),
        });
      }

      setActiveBankLineModal(null);
      setClearanceNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to clear bank statement line');
    } finally {
      setIsClearingLine(false);
    }
  };

  // 4. Rollback
  const handleUnreconcile = async (paymentId: number) => {
    if (!confirm('Rollback reconciliation status for this transaction and restore both sides to open pending?')) {
      return;
    }

    try {
      await fetchApi(`/api/v1/payments/reconciliation/unreconcile/${paymentId}`, {
        method: 'POST',
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to unreconcile transaction');
    }
  };

  // Clean Line Add (No Hardcoded Mock Data)
  const handleAddStatementLine = () => {
    setLinesPayload([
      ...linesPayload,
      {
        lineDate: new Date().toISOString().split('T')[0],
        transactionReference: '',
        description: '',
        amount: 0,
      },
    ]);
  };

  // Fast CSV Parser
  const handleParseCsv = () => {
    if (!csvPasteText.trim()) return;
    const lines = csvPasteText.trim().split('\n');
    const parsed: typeof linesPayload = [];

    lines.forEach((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length >= 3) {
        const lineDate = cols[0] || new Date().toISOString().split('T')[0];
        const transactionReference = cols[1] || '';
        const description = cols[2] || 'Bank Transaction';
        const amount = parseFloat(cols[3] || cols[2]) || 0;
        parsed.push({ lineDate, transactionReference, description, amount });
      }
    });

    if (parsed.length > 0) {
      setLinesPayload([...linesPayload, ...parsed]);
      setCsvPasteText('');
    } else {
      alert('Ensure CSV format is: YYYY-MM-DD, Reference, Description, Amount');
    }
  };

  const handleImportStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (linesPayload.length === 0) {
      alert('Please add at least one statement line or parse a CSV file');
      return;
    }

    setIsImporting(true);
    try {
      await fetchApi('/api/v1/payments/reconciliation/statement', {
        method: 'POST',
        body: JSON.stringify({
          clearingAccount: statementAccount,
          statementNumber: statementNumber.trim(),
          openingBalance: parseFloat(openingBalance || '0'),
          closingBalance: parseFloat(closingBalance || '0'),
          statementDate: new Date(statementDate).toISOString(),
          lines: linesPayload,
        }),
      });

      setIsImportModalOpen(false);
      setLinesPayload([]);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to import bank statement');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/payments"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Payments Journal <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Bank Reconciliation Workbench (FEBAN)</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Two-Sided Bank Statement Reconciliation</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Pair ERP book payments against bank statement feeds, resolve fee discrepancies, and clear unrecorded bank debits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoMatch}
            disabled={isAutoMatching || openPayments.length === 0}
            className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3.5 py-2.5 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <Zap size={14} className="text-emerald-600" />
            {isAutoMatching ? 'Evaluating...' : '1-Click Auto Match'}
          </button>

          <button
            onClick={() => {
              setStatementNumber(`BST-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
              setOpeningBalance('');
              setClosingBalance('');
              setLinesPayload([]); // Starts with clean 0 lines, no hardcoded values
              setIsImportModalOpen(true);
            }}
            className="bg-servora-core text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-blue-700 shadow-xs transition-colors flex items-center gap-2"
          >
            <Upload size={14} /> Import Statement Feed
          </button>
        </div>
      </div>

      {/* Aggregate Telemetry Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Unreconciled Book Ledger</span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">
                {summary.unreconciledBookPaymentsCount} Payments
              </h3>
              <span className="text-[11px] text-servora-core font-mono font-semibold">
                KES {summary.unreconciledBookAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
              <FileText size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Unmatched Bank Statement Feed</span>
              <h3 className="text-lg font-bold text-amber-700 mt-1">
                {summary.unreconciledBankLinesCount} Lines
              </h3>
              <span className="text-[11px] text-amber-600 font-mono font-semibold">
                KES {Math.abs(summary.unreconciledBankAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Landmark size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Reconciliation Variance</span>
              <h3 className={`text-lg font-bold mt-1 ${summary.netDiscrepancy === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                KES {summary.netDiscrepancy.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-gray-500 font-medium">
                {summary.netDiscrepancy === 0 ? 'Fully balanced in treasury' : 'Net unallocated discrepancy'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Controls & Mode Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-servora-navy">Clearing Channel:</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white font-medium text-servora-navy"
            >
              {CLEARING_ACCOUNTS.map((acc) => (
                <option key={acc} value={acc}>
                  {acc === 'ALL' ? 'All Treasury Channels' : acc}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 p-1 bg-gray-50 border border-gray-100 rounded-xl">
            <button
              onClick={() => setActiveTab('MATCHING')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'MATCHING' ? 'bg-white shadow-xs text-servora-navy' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Two-Sided Matching
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'HISTORY' ? 'bg-white shadow-xs text-servora-navy' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Cleared History ({reconciledHistory.length})
            </button>
          </div>
        </div>

        {/* Selected Pair Match Action */}
        {activeTab === 'MATCHING' && (
          <div className="flex items-center gap-2">
            {selectedVariance !== null && (
              <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                selectedVariance === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                Variance: KES {selectedVariance.toFixed(2)}
              </div>
            )}
            <button
              onClick={handleMatch}
              disabled={!selectedPaymentId || !selectedBankLineId || isMatching}
              className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              <Sparkles size={14} />
              {isMatching ? 'Reconciling...' : 'Confirm Match & Clear'}
            </button>
          </div>
        )}
      </div>

      {/* TWO-SIDED WORKBENCH */}
      {activeTab === 'MATCHING' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SIDE 1: ERP BOOK PAYMENTS */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-servora-navy block">ERP Ledger Payments (Book)</span>
                <span className="text-[10px] text-gray-500">Unreconciled internal postings</span>
              </div>
              <span className="text-xs font-bold font-mono text-servora-core">{openPayments.length} Pending</span>
            </div>

            <div className="p-3 divide-y divide-gray-100 overflow-y-auto max-h-[550px] space-y-1">
              {openPayments.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-400">All ERP book payments are bank reconciled.</div>
              ) : (
                openPayments.map((p) => {
                  const isSelected = selectedPaymentId === p.id;
                  const matchPill = selectedBankLine ? getMatchConfidence(p, selectedBankLine) : null;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPaymentId(isSelected ? null : p.id)}
                      className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'bg-blue-50/80 border-2 border-servora-core shadow-xs' 
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-servora-navy">{p.paymentNumber}</span>
                          <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            {p.paymentMethod}
                          </span>
                          {matchPill && (
                            <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {matchPill.label}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-600 block">
                          {p.supplierName ? `${p.supplierName} (${p.invoiceNumber || 'Prepay'})` : 'Cash Ledger Flow'}
                        </span>
                        {p.transactionReference && (
                          <span className="text-[10px] font-mono font-bold text-servora-core block">
                            Ref: {p.transactionReference}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-servora-navy block">
                          KES {parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SIDE 2: BANK STATEMENT FEED */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-servora-navy block">Bank Statement Feed (Actual)</span>
                <span className="text-[10px] text-gray-500">Click a line to pair, write off fee, or clear to invoice</span>
              </div>
              <span className="text-xs font-bold font-mono text-amber-700">{openBankLines.length} Pending</span>
            </div>

            <div className="p-3 divide-y divide-gray-100 overflow-y-auto max-h-[550px] space-y-1">
              {openBankLines.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-400">
                  No bank lines pending. Import a statement feed to match.
                </div>
              ) : (
                openBankLines.map((line) => {
                  const isSelected = selectedBankLineId === line.id;
                  const matchPill = selectedPayment ? getMatchConfidence(selectedPayment, line) : null;

                  return (
                    <div
                      key={line.id}
                      className={`p-3 rounded-xl transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-amber-50/80 border-2 border-amber-500 shadow-xs' 
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div 
                        onClick={() => setSelectedBankLineId(isSelected ? null : line.id)}
                        className="space-y-1 cursor-pointer flex-1 mr-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-gray-800">{line.description}</span>
                          {matchPill && (
                            <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {matchPill.label}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 block font-mono">
                          {line.statementNumber} &bull; {line.clearingAccount}
                        </span>
                        {line.transactionReference && (
                          <span className="text-[10px] font-mono text-amber-700 font-bold block">
                            Ref: {line.transactionReference}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="font-mono font-bold text-xs text-servora-navy block">
                            KES {Math.abs(parseFloat(line.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(line.lineDate).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Direct Resolution Action Trigger */}
                        <button
                          onClick={() => setActiveBankLineModal(line)}
                          className="px-2 py-1 text-[11px] font-bold text-servora-core hover:bg-blue-50 rounded-lg border border-gray-200 transition-colors"
                          title="Clear line as expense or link to supplier bill"
                        >
                          Resolve &rarr;
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: CLEARED AUDIT LOG */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-servora-navy">Cleared Bank Pairs ({reconciledHistory.length})</span>
            <span className="text-[11px] text-gray-400">Audit-locked payments with statement clearing stamps</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3 px-4">Payment #</th>
                  <th className="py-3 px-4">Flow</th>
                  <th className="py-3 px-4">Clearing Account</th>
                  <th className="py-3 px-4">Bank / Statement Ref</th>
                  <th className="py-3 px-4 text-right">Cleared Amount</th>
                  <th className="py-3 px-4">Reconciled At</th>
                  <th className="py-3 px-4 text-right">Rollback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {reconciledHistory.map((item) => (
                  <tr key={item.paymentId} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-servora-navy">{item.paymentNumber}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        {item.paymentFlow.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{item.clearingAccount}</td>
                    <td className="py-3 px-4 font-mono font-bold text-servora-core text-[11px]">
                      {item.transactionReference || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      KES {parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                      {item.reconciledAt ? new Date(item.reconciledAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleUnreconcile(item.paymentId)}
                        className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center gap-1"
                        title="Unlink pair and restore to pending"
                      >
                        <RotateCcw size={11} /> Unlink
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RESOLVE UNMATCHED BANK LINE ACTION SHEET MODAL */}
      {activeBankLineModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Resolve Unmatched Bank Line</h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Post to general ledger expense or allocate directly to open AP invoice
                </p>
              </div>
              <button onClick={() => setActiveBankLineModal(null)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            {/* Line Information Card */}
            <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction Description:</span>
                <span className="font-semibold text-gray-800">{activeBankLineModal.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Statement Amount:</span>
                <span className="font-mono font-bold text-servora-navy">
                  KES {Math.abs(parseFloat(activeBankLineModal.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bank Reference:</span>
                <span className="font-mono text-amber-700 font-bold">
                  {activeBankLineModal.transactionReference || 'None'}
                </span>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setLineClearanceMode('EXPENSE')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  lineClearanceMode === 'EXPENSE' ? 'bg-white shadow-xs text-servora-navy' : 'text-gray-500'
                }`}
              >
                Direct Bank Fee / Tax
              </button>
              <button
                type="button"
                onClick={() => setLineClearanceMode('INVOICE')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  lineClearanceMode === 'INVOICE' ? 'bg-white shadow-xs text-servora-navy' : 'text-gray-500'
                }`}
              >
                Match to Vendor Invoice
              </button>
            </div>

            <form onSubmit={handleClearDirectBankLine} className="space-y-3.5">
              {lineClearanceMode === 'EXPENSE' ? (
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">P&L Expense Category *</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium"
                  >
                    <option value="BANK_FEES_COMMISSIONS">Bank Service Charges & Transaction Levies</option>
                    <option value="INTEREST_EXPENSE">Overdraft / Financing Interest</option>
                    <option value="WITHHOLDING_TAX">Withholding Tax Remittance (KRA)</option>
                    <option value="GENERAL_EXPENSE">General Operating Expense</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Open Supplier Invoice *</label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium"
                  >
                    <option value="">Select open invoice to clear...</option>
                    {openInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.supplierName} (Total: KES {parseFloat(inv.totalAmount).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Auditor Reconciliation Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly maintenance fee cleared"
                  value={clearanceNotes}
                  onChange={(e) => setClearanceNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveBankLineModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isClearingLine}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-xs disabled:opacity-50"
                >
                  {isClearingLine ? 'Clearing...' : 'Clear & Reconcile Line'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLEAN PRODUCTION IMPORT BANK STATEMENT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Import Bank Statement Feed</h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Upload CSV bank feed or enter actual statement lines
                </p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleImportStatement} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Target Clearing Channel *</label>
                  <select
                    value={statementAccount}
                    onChange={(e) => setStatementAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium"
                  >
                    {CLEARING_ACCOUNTS.filter((a) => a !== 'ALL').map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Statement Reference # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STMT-2026-NOV-04"
                    value={statementNumber}
                    onChange={(e) => setStatementNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Opening Balance (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Closing Balance (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Statement Date</label>
                  <input
                    type="date"
                    value={statementDate}
                    onChange={(e) => setStatementDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Fast CSV Paste Parser Box */}
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-servora-navy">
                    Quick CSV Feed Parser (Date, Ref, Description, Amount)
                  </span>
                  <button
                    type="button"
                    onClick={handleParseCsv}
                    className="text-xs font-bold text-servora-core hover:underline inline-flex items-center gap-1"
                  >
                    <Sparkles size={12} /> Parse Lines
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="2026-11-04, QK8912KL99, Brookside Dairies Supplier Payout, -28500"
                  value={csvPasteText}
                  onChange={(e) => setCsvPasteText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono bg-white"
                />
              </div>

              {/* Lines Input Manifest */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-servora-navy">Statement Transaction Lines ({linesPayload.length})</span>
                  <button
                    type="button"
                    onClick={handleAddStatementLine}
                    className="text-xs font-semibold text-servora-core hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Line Manually
                  </button>
                </div>

                {linesPayload.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                    No statement lines added yet. Paste a CSV above or click &quot;Add Line Manually&quot;.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {linesPayload.map((line, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-gray-200 text-xs">
                        <input
                          type="text"
                          placeholder="Ref code"
                          value={line.transactionReference}
                          onChange={(e) => {
                            const updated = [...linesPayload];
                            updated[idx].transactionReference = e.target.value;
                            setLinesPayload(updated);
                          }}
                          className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg bg-white font-mono font-bold"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Description"
                          value={line.description}
                          onChange={(e) => {
                            const updated = [...linesPayload];
                            updated[idx].description = e.target.value;
                            setLinesPayload(updated);
                          }}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg bg-white"
                        />
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Amount"
                          value={line.amount || ''}
                          onChange={(e) => {
                            const updated = [...linesPayload];
                            updated[idx].amount = parseFloat(e.target.value) || 0;
                            setLinesPayload(updated);
                          }}
                          className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-right font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => setLinesPayload(linesPayload.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-rose-600 p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting || linesPayload.length === 0}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50"
                >
                  {isImporting ? 'Importing...' : 'Commit Statement Feed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}