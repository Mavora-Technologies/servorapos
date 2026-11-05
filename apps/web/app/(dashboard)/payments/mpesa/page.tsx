'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
    Smartphone,
    Send,
    ArrowDownLeft,
    ArrowUpRight,
    RotateCcw,
    Search,
    Plus,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Building2,
    X,
    ChevronRight,
    DollarSign,
    FileText,
    TrendingUp,
    TrendingDown,
    Receipt,
    ShieldCheck,
    Check,
    AlertOctagon,
    RefreshCw,
    Ban
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface MpesaTransaction {
    id: number;
    transactionType: string;
    mpesaReceiptNumber: string | null;
    checkoutRequestId: string | null;
    conversationId: string | null;
    phoneNumber: string | null;
    accountReference: string;
    businessShortCode: string;
    amount: string;
    transactionDate: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
    resultCode: string | null;
    resultDesc: string | null;
    supplierName: string | null;
    invoiceNumber: string | null;
    orderId: number | null;
    paymentId: number | null;
    initiatedByEmail: string | null;
    notes: string | null;
    createdAt: string;
}

interface MpesaSummary {
    totalTransactions: number;
    totalC2BInflow: number;
    totalB2BOutflow: number;
    netPosition: number;
    pendingCount: number;
    failedCount: number;
}

interface OpenInvoiceOption {
    id: number;
    invoiceNumber: string;
    supplierName: string;
    totalAmount: string;
    paidAmount: string;
}

interface ActiveOrderOption {
    id: number;
    orderNumber: string;
    tableName?: string;
    totalAmount: string;
}

interface SupplierOption {
    id: number;
    name: string;
}

export default function MpesaGatewayPage() {
    const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
    const [summary, setSummary] = useState<MpesaSummary | null>(null);
    const [openInvoices, setOpenInvoices] = useState<OpenInvoiceOption[]>([]);
    const [activeOrders, setActiveOrders] = useState<ActiveOrderOption[]>([]);
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    // Inspect Transaction Modal
    const [activeTx, setActiveTx] = useState<MpesaTransaction | null>(null);
    const [isQueryingStatus, setIsQueryingStatus] = useState(false);
    const [isCancellingPrompt, setIsCancellingPrompt] = useState(false);

    // STK Push Modal State
    const [isStkModalOpen, setIsStkModalOpen] = useState(false);
    const [stkReferenceSource, setStkReferenceSource] = useState<'POS_ORDER' | 'CUSTOM'>('CUSTOM');
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [stkPhone, setStkPhone] = useState('');
    const [stkAmount, setStkAmount] = useState('');
    const [stkAccountRef, setStkAccountRef] = useState('');
    const [stkNotes, setStkNotes] = useState('');
    const [isSendingStk, setIsSendingStk] = useState(false);

    // B2B Supplier Payout Modal State
    const [isB2BModalOpen, setIsB2BModalOpen] = useState(false);
    const [b2bShortCode, setB2BShortCode] = useState('');
    const [b2bReceiverType, setB2BReceiverType] = useState<'PAYBILL' | 'BUY_GOODS'>('PAYBILL');
    const [b2bAccountRef, setB2BAccountRef] = useState('');
    const [b2bAmount, setB2BAmount] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
    const [b2bNotes, setB2BNotes] = useState('');
    const [isSendingB2B, setIsSendingB2B] = useState(false);

    // Reversal Modal State
    const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
    const [reversingTx, setReversingTx] = useState<MpesaTransaction | null>(null);
    const [reversalReason, setReversalReason] = useState('WRONG_PAYBILL_ACCOUNT');
    const [isReversing, setIsReversing] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [txRes, invRes, supRes, ordRes] = await Promise.all([
                fetchApi('/api/v1/payments/mpesa/transactions'),
                fetchApi('/api/v1/purchasing/invoices').catch(() => ({ data: [] })),
                fetchApi('/api/v1/suppliers').catch(() => ({ data: [] })),
                // Update this path to the mounted route:
                fetchApi('/api/v1/payments/mpesa/active-orders').catch(() => ({ data: [] })),
            ]);

            if (txRes?.data) {
                setTransactions(txRes.data.transactions || []);
                setSummary(txRes.data.summary || null);
            }
            if (invRes?.data) {
                const rawInvoices = invRes.data.invoices || invRes.data || [];
                setOpenInvoices(rawInvoices.filter((i: any) => i.status !== 'PAID'));
            }
            if (supRes?.data) setSuppliers(supRes.data);
            if (ordRes?.data) setActiveOrders(ordRes.data);
        } catch (err) {
            console.error('Failed to load M-Pesa gateway:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Dynamic Account Reference Generation
    const openStkModal = () => {
        setStkPhone('');
        setStkAmount('');
        setSelectedOrderId('');
        setStkNotes('');

        // Default dynamically generated reference
        const dynamicRef = `REC-${Date.now().toString().slice(-6)}`;
        setStkAccountRef(dynamicRef);
        setStkReferenceSource('CUSTOM');
        setIsStkModalOpen(true);
    };

    const handleOrderSelect = (orderIdStr: string) => {
        setSelectedOrderId(orderIdStr);
        const ord = activeOrders.find((o) => String(o.id) === orderIdStr);
        if (ord) {
            setStkAccountRef(ord.orderNumber || `ORD-${ord.id}`);
            setStkAmount(String(parseFloat(ord.totalAmount) || ''));
            setStkNotes(`Settlement for order ${ord.orderNumber}${ord.tableName ? ` (${ord.tableName})` : ''}`);
        }
    };

    const handleInvoiceSelect = (invIdStr: string) => {
        setSelectedInvoiceId(invIdStr);
        const invoice = openInvoices.find((i) => String(i.id) === invIdStr);
        if (invoice) {
            const total = parseFloat(invoice.totalAmount) || 0;
            const paid = parseFloat(invoice.paidAmount) || 0;
            const balance = Math.max(0, total - paid);
            setB2BAmount(String(balance));
            setB2BAccountRef(invoice.invoiceNumber);
        }
    };

    const handleInitiateStk = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSendingStk(true);
        try {
            const res = await fetchApi('/api/v1/payments/mpesa/stk-push', {
                method: 'POST',
                body: JSON.stringify({
                    phoneNumber: stkPhone.trim(),
                    amount: parseFloat(stkAmount),
                    accountReference: stkAccountRef.trim(),
                    orderId: selectedOrderId ? parseInt(selectedOrderId, 10) : undefined,
                    notes: stkNotes || undefined,
                }),
            });

            alert(res.message || 'STK Push initiated successfully');
            setIsStkModalOpen(false);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to dispatch STK push');
        } finally {
            setIsSendingStk(false);
        }
    };

    const handleCheckStatus = async (txId: number) => {
        setIsQueryingStatus(true);
        try {
            const res = await fetchApi(`/api/v1/payments/mpesa/transactions/${txId}/query`);
            alert(res.message || 'Status verified');
            if (activeTx && res?.data) {
                setActiveTx(res.data);
            }
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to query status');
        } finally {
            setIsQueryingStatus(false);
        }
    };

    const handleCancelPrompt = async (txId: number) => {
        if (!confirm('Cancel this pending STK push prompt? The customer will not be billed.')) return;
        setIsCancellingPrompt(true);
        try {
            const res = await fetchApi(`/api/v1/payments/mpesa/transactions/${txId}/cancel`, {
                method: 'POST',
            });
            alert(res.message || 'Prompt cancelled');
            setActiveTx(null);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to cancel prompt');
        } finally {
            setIsCancellingPrompt(false);
        }
    };

    const handleInitiateB2B = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSendingB2B(true);
        try {
            const res = await fetchApi('/api/v1/payments/mpesa/b2b', {
                method: 'POST',
                body: JSON.stringify({
                    businessShortCode: b2bShortCode.trim(),
                    receiverType: b2bReceiverType,
                    accountReference: b2bAccountRef.trim(),
                    amount: parseFloat(b2bAmount),
                    supplierId: selectedSupplierId ? parseInt(selectedSupplierId, 10) : undefined,
                    supplierInvoiceId: selectedInvoiceId ? parseInt(selectedInvoiceId, 10) : undefined,
                    notes: b2bNotes || undefined,
                }),
            });

            alert(res.message || 'B2B payment sent successfully');
            setIsB2BModalOpen(false);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to dispatch B2B payout');
        } finally {
            setIsSendingB2B(false);
        }
    };

    const handleConfirmReverse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reversingTx) return;

        setIsReversing(true);
        try {
            await fetchApi(`/api/v1/payments/mpesa/transactions/${reversingTx.id}/reverse`, {
                method: 'POST',
                body: JSON.stringify({ reason: reversalReason }),
            });

            setIsReverseModalOpen(false);
            setReversingTx(null);
            setActiveTx(null);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to reverse M-Pesa transaction');
        } finally {
            setIsReversing(false);
        }
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter((t) => {
            const matchesSearch =
                (t.mpesaReceiptNumber && t.mpesaReceiptNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (t.phoneNumber && t.phoneNumber.includes(searchTerm)) ||
                t.accountReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.businessShortCode.includes(searchTerm) ||
                (t.supplierName && t.supplierName.toLowerCase().includes(searchTerm.toLowerCase()));

            let matchesType = true;
            if (typeFilter === 'C2B') {
                matchesType = t.transactionType.startsWith('C2B') || t.transactionType === 'STK_PUSH';
            } else if (typeFilter === 'B2B') {
                matchesType = t.transactionType.startsWith('B2B') || t.transactionType === 'B2C_PAYOUT';
            }

            const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [transactions, searchTerm, typeFilter, statusFilter]);

    const getStatusBadge = (status: MpesaTransaction['status']) => {
        switch (status) {
            case 'COMPLETED':
                return (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 size={11} /> SUCCESSFUL
                    </span>
                );
            case 'PENDING':
                return (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 animate-pulse">
                        <Clock size={11} /> AWAITING PIN
                    </span>
                );
            case 'FAILED':
                return (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        <AlertOctagon size={11} /> FAILED / TIMEOUT
                    </span>
                );
            case 'REVERSED':
                return (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md line-through">
                        <RotateCcw size={11} /> REVERSED
                    </span>
                );
            default:
                return (
                    <span className="text-[10.5px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {status}
                    </span>
                );
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
                        <span className="text-xs font-bold text-servora-navy">M-Pesa Treasury Gateway</span>
                    </div>
                    <h1 className="text-xl font-bold text-servora-navy">M-Pesa B2B / C2B Settlement Gateway</h1>
                    <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
                        Real-time Daraja API transaction telemetry: customer STK push prompts, supplier paybill disbursements, and automated clearing.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={openStkModal}
                        className="bg-emerald-600 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl hover:bg-emerald-700 shadow-xs transition-colors flex items-center gap-1.5"
                    >
                        <Smartphone size={14} /> Request STK Push (AR)
                    </button>
                    <button
                        onClick={() => setIsB2BModalOpen(true)}
                        className="bg-servora-core text-white text-xs font-bold px-3.5 py-2.5 rounded-xl hover:bg-blue-700 shadow-xs transition-colors flex items-center gap-1.5"
                    >
                        <Send size={14} /> Pay Supplier Paybill (AP)
                    </button>
                </div>
            </div>

            {/* Aggregate Telemetry Cards */}
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">M-Pesa Inflow (C2B / STK)</span>
                            <h3 className="text-lg font-bold text-emerald-700 mt-1">
                                KES {summary.totalC2BInflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h3>
                            <span className="text-[11px] text-emerald-600 font-medium">Customer collections</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">M-Pesa Outflow (B2B AP)</span>
                            <h3 className="text-lg font-bold text-rose-700 mt-1">
                                KES {summary.totalB2BOutflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h3>
                            <span className="text-[11px] text-rose-600 font-medium">Supplier paybill payouts</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <TrendingDown size={20} />
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Net Liquidity Position</span>
                            <h3 className={`text-lg font-bold mt-1 ${summary.netPosition >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                KES {summary.netPosition.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h3>
                            <span className="text-[11px] text-servora-deepTeal font-medium">Paybill float net balance</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Pending Push Prompts</span>
                            <h3 className="text-lg font-bold text-amber-700 mt-1">{summary.pendingCount} Trans</h3>
                            <span className="text-[11px] text-amber-600 font-medium">Awaiting customer PIN</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock size={20} />
                        </div>
                    </div>
                </div>
            )}

            {/* Query Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[280px]">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
                    <input
                        type="text"
                        placeholder="Search M-Pesa receipt # (e.g. QK8912KL99), phone, or shortcode..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                    />
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
                    {[
                        { id: 'ALL', label: 'All Transactions' },
                        { id: 'C2B', label: 'C2B / STK Inflow' },
                        { id: 'B2B', label: 'B2B Outflow' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setTypeFilter(tab.id)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${typeFilter === tab.id ? 'bg-white shadow-xs text-servora-navy font-bold' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* M-Pesa Gateway Ledger Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
                        Connecting to Safaricom Daraja M-Pesa gateway log...
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="p-12 text-center text-xs text-servora-deepTeal">
                        No M-Pesa transactions found matching filter criteria.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                                    <th className="py-3.5 px-4">Receipt # / Timestamp</th>
                                    <th className="py-3.5 px-4">Direction & Flow</th>
                                    <th className="py-3.5 px-4">Phone / ShortCode</th>
                                    <th className="py-3.5 px-4">Account Reference</th>
                                    <th className="py-3.5 px-4">Beneficiary / Order Ref</th>
                                    <th className="py-3.5 px-4 text-right">Amount (KES)</th>
                                    <th className="py-3.5 px-4">Gateway Status</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-servora-navy">
                                {filteredTransactions.map((tx) => {
                                    const amtNum = parseFloat(tx.amount) || 0;
                                    const isInbound = tx.transactionType.startsWith('C2B') || tx.transactionType === 'STK_PUSH';

                                    return (
                                        <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <span className="font-mono font-bold block text-servora-navy">
                                                    {tx.mpesaReceiptNumber || 'PENDING-CALLBACK'}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-mono">
                                                    {new Date(tx.transactionDate).toLocaleString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                {isInbound ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                        <ArrowUpRight size={11} /> C2B Inbound
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                                        <ArrowDownLeft size={11} /> B2B Outbound
                                                    </span>
                                                )}
                                                <span className="block text-[9.5px] text-gray-400 font-mono mt-0.5">
                                                    {tx.transactionType.replace('_', ' ')}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4 font-mono">
                                                {tx.phoneNumber ? (
                                                    <span className="font-bold text-gray-800">{tx.phoneNumber}</span>
                                                ) : (
                                                    <span className="text-gray-600">Paybill {tx.businessShortCode}</span>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 font-mono font-bold text-servora-navy text-[11px]">
                                                {tx.accountReference}
                                            </td>

                                            <td className="py-3.5 px-4">
                                                {tx.supplierName ? (
                                                    <div>
                                                        <span className="font-bold text-servora-navy block">{tx.supplierName}</span>
                                                        {tx.invoiceNumber && (
                                                            <span className="text-[10px] font-mono text-servora-core">Inv: {tx.invoiceNumber}</span>
                                                        )}
                                                    </div>
                                                ) : tx.orderId ? (
                                                    <span className="font-mono text-blue-600">POS Order #{tx.orderId}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">Direct Counter Checkout</span>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-right font-mono font-bold">
                                                <span className={isInbound ? 'text-emerald-700' : 'text-rose-700'}>
                                                    {isInbound ? '+' : '-'}KES {amtNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                {getStatusBadge(tx.status)}
                                            </td>

                                            <td className="py-3.5 px-4 text-right">
                                                <button
                                                    onClick={() => setActiveTx(tx)}
                                                    className="px-2.5 py-1 text-xs font-semibold text-servora-core hover:bg-servora-pale rounded-lg transition-colors"
                                                >
                                                    Inspect &rarr;
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

            {/* INSPECT TRANSACTION MODAL (WITH AWAITING PIN CONTROLS) */}
            {activeTx && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-servora-navy">
                                        {activeTx.mpesaReceiptNumber || 'M-Pesa Gateway Request'}
                                    </h3>
                                    {getStatusBadge(activeTx.status)}
                                </div>
                                <p className="text-[11px] text-servora-deepTeal mt-0.5">
                                    Type: <strong>{activeTx.transactionType.replace('_', ' ')}</strong> &bull; Shortcode: <strong>{activeTx.businessShortCode}</strong>
                                </p>
                            </div>
                            <button onClick={() => setActiveTx(null)} className="text-gray-400 hover:text-servora-navy">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Gateway Telemetry Grid */}
                        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-gray-200 rounded-xl text-xs">
                            <div>
                                <span className="text-gray-500 block text-[10px] uppercase font-bold">Transacted Amount</span>
                                <span className="font-mono font-bold text-base text-servora-navy">
                                    KES {parseFloat(activeTx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-[10px] uppercase font-bold">Party Reference</span>
                                <span className="font-mono font-bold text-sm text-servora-navy">
                                    {activeTx.phoneNumber || activeTx.businessShortCode}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-[10px] uppercase font-bold">Account Reference</span>
                                <span className="font-mono font-bold text-servora-core">
                                    {activeTx.accountReference}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-[10px] uppercase font-bold">Origin Purveyor</span>
                                <span className="font-semibold text-gray-800">
                                    {activeTx.supplierName || 'Customer / POS'}
                                </span>
                            </div>
                        </div>

                        {/* Daraja Callback Details */}
                        <div className="space-y-2 text-xs text-gray-600">
                            {activeTx.checkoutRequestId && (
                                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                                    <span className="text-gray-400">Checkout Request ID:</span>
                                    <span className="font-mono font-bold text-servora-navy">{activeTx.checkoutRequestId}</span>
                                </div>
                            )}
                            {activeTx.conversationId && (
                                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                                    <span className="text-gray-400">Conversation ID:</span>
                                    <span className="font-mono font-bold text-servora-navy">{activeTx.conversationId}</span>
                                </div>
                            )}
                            {activeTx.resultDesc && (
                                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                                    <span className="text-gray-400">Daraja Response:</span>
                                    <span className="font-semibold text-gray-800">{activeTx.resultDesc}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-b border-gray-100 pb-1.5">
                                <span className="text-gray-400">Initiated By:</span>
                                <span>{activeTx.initiatedByEmail || 'POS Checkout Automator'}</span>
                            </div>
                            {activeTx.notes && (
                                <div className="bg-gray-50 p-2.5 rounded-xl text-gray-500 text-[11px]">
                                    <strong>Audit Notes:</strong> {activeTx.notes}
                                </div>
                            )}
                        </div>

                        {/* RESOLUTION CONTROLS FOR AWAITING PIN / PENDING TRANSACTIONS */}
                        {activeTx.status === 'PENDING' && (
                            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-servora-navy">
                                    <Clock size={14} className="text-blue-600" />
                                    <span>Transaction Stalled / Awaiting Handset PIN</span>
                                </div>
                                <p className="text-[11px] text-gray-600">
                                    Query Safaricom gateway in real-time or void this prompt to release the customer ticket.
                                </p>
                                <div className="flex items-center gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => handleCheckStatus(activeTx.id)}
                                        disabled={isQueryingStatus}
                                        className="flex-1 py-1.5 px-3 bg-servora-core text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-1"
                                    >
                                        <RefreshCw size={12} className={isQueryingStatus ? 'animate-spin' : ''} />
                                        {isQueryingStatus ? 'Checking...' : 'Check Safaricom Status'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCancelPrompt(activeTx.id)}
                                        disabled={isCancellingPrompt}
                                        className="py-1.5 px-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors inline-flex items-center gap-1"
                                    >
                                        <Ban size={12} />
                                        Cancel Prompt
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Modal Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setActiveTx(null)}
                                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
                            >
                                Close
                            </button>

                            <div className="flex items-center gap-2">
                                {/* RETRY STK PROMPT IF FAILED OR TIMED OUT */}
                                {activeTx.status === 'FAILED' && activeTx.transactionType === 'STK_PUSH' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = activeTx;
                                            setActiveTx(null);
                                            // Pre-populate STK modal with previous details for instant re-dispatch
                                            setStkPhone(current.phoneNumber || '');
                                            setStkAmount(String(parseFloat(current.amount)));
                                            setStkAccountRef(current.accountReference);
                                            setSelectedOrderId(current.orderId ? String(current.orderId) : '');
                                            setStkReferenceSource(current.orderId ? 'POS_ORDER' : 'CUSTOM');
                                            setStkNotes(`Retry prompt for ${current.accountReference}`);
                                            setIsStkModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                                    >
                                        <Smartphone size={13} />
                                        Retry STK Prompt
                                    </button>
                                )}

                                {activeTx.status === 'COMPLETED' && (
                                    <button
                                        onClick={() => {
                                            const tx = activeTx;
                                            setActiveTx(null);
                                            setReversingTx(tx);
                                            setIsReverseModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors"
                                    >
                                        <RotateCcw size={13} /> Reversal Request
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* REQUEST STK PUSH MODAL (C2B WITH DYNAMIC REFERENCE) */}
            {isStkModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[88vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-servora-navy">Dispatch M-Pesa STK Push Prompt</h3>
                                <p className="text-[11px] text-servora-deepTeal">Pushes real-time USSD PIN prompt to customer handset</p>
                            </div>
                            <button onClick={() => setIsStkModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleInitiateStk} className="space-y-3.5">
                            {/* Reference Source Selector */}
                            <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-2">
                                <label className="block text-xs font-bold text-servora-navy">
                                    Account Reference Source *
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStkReferenceSource('POS_ORDER');
                                            if (activeOrders.length > 0) handleOrderSelect(String(activeOrders[0].id));
                                        }}
                                        className={`py-1.5 text-xs font-bold rounded-lg border transition-colors ${stkReferenceSource === 'POS_ORDER'
                                            ? 'bg-white text-servora-core border-servora-core shadow-xs'
                                            : 'text-gray-600 border-gray-200 hover:bg-white'
                                            }`}
                                    >
                                        Active POS Order
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStkReferenceSource('CUSTOM');
                                            setSelectedOrderId('');
                                            setStkAccountRef(`REC-${Date.now().toString().slice(-6)}`);
                                        }}
                                        className={`py-1.5 text-xs font-bold rounded-lg border transition-colors ${stkReferenceSource === 'CUSTOM'
                                            ? 'bg-white text-servora-core border-servora-core shadow-xs'
                                            : 'text-gray-600 border-gray-200 hover:bg-white'
                                            }`}
                                    >
                                        Direct Register Ref
                                    </button>
                                </div>

                                {stkReferenceSource === 'POS_ORDER' && (
                                    <div>
                                        <select
                                            value={selectedOrderId}
                                            onChange={(e) => handleOrderSelect(e.target.value)}
                                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-medium"
                                        >
                                            <option value="">Select active dining order...</option>
                                            {activeOrders.map((ord) => (
                                                <option key={ord.id} value={ord.id}>
                                                    Order {ord.orderNumber} {ord.tableName ? `(${ord.tableName})` : ''} — KES {parseFloat(ord.totalAmount).toLocaleString()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-servora-navy mb-1">Customer Phone Number *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="0712345678 or 254712345678"
                                    value={stkPhone}
                                    onChange={(e) => setStkPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:border-servora-core focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-servora-navy mb-1">Amount (KES) *</label>
                                    <input
                                        type="number"
                                        step="1"
                                        min="1"
                                        required
                                        placeholder="e.g. 1500"
                                        value={stkAmount}
                                        onChange={(e) => setStkAmount(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-servora-navy mb-1">Resolved Account Ref *</label>
                                    <input
                                        type="text"
                                        required
                                        value={stkAccountRef}
                                        onChange={(e) => setStkAccountRef(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:border-servora-core focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-servora-navy mb-1">Transaction Remarks</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Table Dining Settlement"
                                    value={stkNotes}
                                    onChange={(e) => setStkNotes(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsStkModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSendingStk}
                                    className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                                >
                                    <Smartphone size={13} />
                                    {isSendingStk ? 'Dispatching...' : 'Send STK Prompt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DISPATCH B2B PAYOUT MODAL (AP) */}
            {isB2BModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[88vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-servora-navy">Disburse M-Pesa B2B Working Capital</h3>
                                <p className="text-[11px] text-servora-deepTeal">Direct settlement to supplier Paybill or Buy Goods till</p>
                            </div>
                            <button onClick={() => setIsB2BModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleInitiateB2B} className="space-y-3.5">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-servora-navy mb-1">Receiver Account Type *</label>
                                    <select
                                        value={b2bReceiverType}
                                        onChange={(e) => setB2BReceiverType(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium"
                                    >
                                        <option value="PAYBILL">Business Paybill</option>
                                        <option value="BUY_GOODS">Merchant Buy Goods Till</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-servora-navy mb-1">Paybill / Till Number *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 522522 or 991200"
                                        value={b2bShortCode}
                                        onChange={(e) => setB2BShortCode(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold"
                                    />
                                </div>
                            </div>

                            {/* Allocate directly to Open AP Invoice */}
                            {openInvoices.length > 0 && (
                                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
                                    <label className="block text-[11px] font-bold text-servora-navy">
                                        Link to Open Supplier Invoice (Auto-fills Account & Amount)
                                    </label>
                                    <select
                                        value={selectedInvoiceId}
                                        onChange={(e) => handleInvoiceSelect(e.target.value)}
                                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white font-medium"
                                    >
                                        <option value="">Unassigned supplier disbursement</option>
                                        {openInvoices.map((inv) => (
                                            <option key={inv.id} value={inv.id}>
                                                {inv.invoiceNumber} — {inv.supplierName} (Balance: KES {(parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount)).toLocaleString()})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-servora-navy mb-1">Disbursement Amount (KES) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        required
                                        placeholder="e.g. 28500.00"
                                        value={b2bAmount}
                                        onChange={(e) => setB2BAmount(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold font-mono focus:border-servora-core focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-servora-navy mb-1">Account Reference / Acc No *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. INV-8812 or Vendor Acc #"
                                        value={b2bAccountRef}
                                        onChange={(e) => setB2BAccountRef(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-servora-navy mb-1">Beneficiary Purveyor</label>
                                <select
                                    value={selectedSupplierId}
                                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium"
                                >
                                    <option value="">Select supplier master...</option>
                                    {suppliers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-servora-navy mb-1">Disbursement Notes</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Brookside Dairy delivery settlement"
                                    value={b2bNotes}
                                    onChange={(e) => setB2BNotes(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsB2BModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSendingB2B}
                                    className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                                >
                                    <Send size={13} />
                                    {isSendingB2B ? 'Processing...' : 'Authorize B2B Payout'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* REVERSAL MODAL */}
            {isReverseModalOpen && reversingTx && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-servora-navy">Request M-Pesa Reversal</h3>
                                <p className="text-[11px] text-servora-deepTeal">
                                    Receipt: <strong>{reversingTx.mpesaReceiptNumber}</strong> (KES {parseFloat(reversingTx.amount).toLocaleString()})
                                </p>
                            </div>
                            <button onClick={() => setIsReverseModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmReverse} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-servora-navy mb-1">Reversal Audit Reason *</label>
                                <select
                                    value={reversalReason}
                                    onChange={(e) => setReversalReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium"
                                >
                                    <option value="WRONG_PAYBILL_ACCOUNT">Wrong Account / Paybill Number Entered</option>
                                    <option value="DUPLICATE_PAYMENT">Duplicate B2B Payout Authorized</option>
                                    <option value="SUPPLIER_REJECTED">Supplier Goods Rejected on Dock</option>
                                    <option value="FRAUDULENT_TRANSACTION">Disputed C2B Charge</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsReverseModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isReversing}
                                    className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                                >
                                    <RotateCcw size={13} />
                                    {isReversing ? 'Reversing...' : 'Confirm Reversal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}