'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  CheckCircle,
  Search,
  X,
  ChefHat,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Download,
  SlidersHorizontal,
  Building2,
  Receipt,
  RotateCcw,
  UserCheck,
  QrCode,
  Plus,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface OrderRecord {
  id: number;
  branchId: number | null;
  branchName: string | null;
  cashierId: number | null;
  cashierName: string | null;
  orderNumber: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  tableName?: string;
  customerName?: string;
  customerPhone?: string;
  buyerKraPin?: string;
  subtotal: string;
  discountTotal?: string;
  tax: string;
  cateringLevy?: string;
  total: string;
  paymentMethod?: string | null;
  cuInvoiceNumber?: string | null;
  createdAt: string;
}

interface OrderDetail extends OrderRecord {
  serviceCharge?: string;
  amountPaid?: string;
  notes?: string;
  fiscalStatus?: string | null;
  items: {
    id: number;
    menuItemId: number;
    itemName: string | null;
    sku: string | null;
    quantity: string;
    unitPrice: string;
    totalPrice: string;
    notes: string | null;
  }[];
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Advanced Multi-Dimensional Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [onlyB2bKraPin, setOnlyB2bKraPin] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(true);

  // Inspect Modal State
  const [activeOrder, setActiveOrder] = useState<OrderDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (branchFilter !== 'ALL') params.set('branchId', branchFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (channelFilter !== 'ALL') params.set('orderType', channelFilter);
      if (paymentStatusFilter !== 'ALL') params.set('paymentStatus', paymentStatusFilter);
      if (paymentMethodFilter !== 'ALL') params.set('paymentMethod', paymentMethodFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (minAmount) params.set('minAmount', minAmount);
      if (maxAmount) params.set('maxAmount', maxAmount);
      if (onlyB2bKraPin) params.set('hasKraPin', 'true');
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const [result, branchRes] = await Promise.all([
        fetchApi(`/api/v1/orders?${params.toString()}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (result?.data) setOrders(result.data);
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders ledger:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    branchFilter,
    statusFilter,
    channelFilter,
    paymentStatusFilter,
    paymentMethodFilter,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    onlyB2bKraPin,
    searchTerm,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setBranchFilter('ALL');
    setChannelFilter('ALL');
    setPaymentStatusFilter('ALL');
    setPaymentMethodFilter('ALL');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setOnlyB2bKraPin(false);
  };

  const handleInspectOrder = async (order: OrderRecord) => {
    setActiveOrder({ ...order, items: [] });
    setIsLoadingDetail(true);
    try {
      const res = await fetchApi(`/api/v1/orders/${order.id}`);
      if (res?.data) {
        setActiveOrder(res.data);
      }
    } catch (err) {
      console.error('Failed to load order line items:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleUpdateStatus = async (orderId: number, nextStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await fetchApi(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setActiveOrder(null);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const summaryMetrics = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'Cancelled');
    const totalCount = orders.length;
    const activeCount = orders.filter(
      (o) => o.status !== 'Completed' && o.status !== 'Cancelled'
    ).length;
    const grossRevenue = validOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const totalVat = validOrders.reduce((sum, o) => sum + (parseFloat(o.tax) || 0), 0);
    const avgTicket = validOrders.length > 0 ? grossRevenue / validOrders.length : 0;
    return { totalCount, activeCount, grossRevenue, totalVat, avgTicket };
  }, [orders]);

  const handleExportCsv = () => {
    const headers = [
      'Order Number',
      'Date',
      'Branch',
      'Channel',
      'Table/Location',
      'Customer',
      'Buyer KRA PIN',
      'Cashier',
      'Fulfillment Status',
      'Payment Status',
      'Tender Method',
      'Net Subtotal (KES)',
      'VAT (KES)',
      'Gross Total (KES)',
      'eTIMS CU #',
    ];

    const rows = orders.map((o) => [
      o.orderNumber,
      new Date(o.createdAt).toISOString(),
      o.branchName || 'Main Outlet',
      o.orderType,
      o.tableName || 'Counter',
      o.customerName || 'Walk-in',
      o.buyerKraPin || '',
      o.cashierName || 'Staff',
      o.status,
      o.paymentStatus,
      o.paymentMethod || 'N/A',
      o.subtotal,
      o.tax,
      o.total,
      o.cuInvoiceNumber || '',
    ]);

    const csv =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `Servora_O2C_Orders_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Sent-To-Kitchen':
      case 'Confirmed':
        return 'bg-blue-50 text-servora-core border-blue-200';
      case 'Preparing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Ready':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Completed':
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const activeFiltersCount = [
    branchFilter !== 'ALL',
    channelFilter !== 'ALL',
    paymentStatusFilter !== 'ALL',
    paymentMethodFilter !== 'ALL',
    Boolean(startDate),
    Boolean(endDate),
    Boolean(minAmount),
    Boolean(maxAmount),
    onlyB2bKraPin,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Order-to-Cash & Sales <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Order Management Ledger</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Enterprise Order-to-Cash Ledger</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Multi-branch fulfillment tracking, tender settlement audit, itemized BOM drill-downs, and KRA eTIMS fiscal records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          <Link
            href="/pos"
            className="bg-servora-core text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus size={14} /> New POS Ticket
          </Link>

          <button
            onClick={handleExportCsv}
            disabled={orders.length === 0}
            className="bg-servora-navy text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-slate-800 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <Download size={13} /> Export CSV
          </button>

          <button
            onClick={fetchOrders}
            title="Refresh Ledger"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 2. TELEMETRY METRICS RIBBON */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Filtered Tickets</span>
            <h3 className="text-lg font-bold font-mono text-servora-navy mt-0.5">
              {summaryMetrics.totalCount} Orders
            </h3>
            <span className="text-[10px] text-servora-deepTeal font-medium">
              Avg Ticket: KES {summaryMetrics.avgTicket.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
            <FileText size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Active Kitchen Queue</span>
            <h3 className="text-lg font-bold font-mono text-amber-700 mt-0.5">
              {summaryMetrics.activeCount} In Progress
            </h3>
            <span className="text-[10px] text-amber-600 font-medium">Confirmed, Preparing & Ready</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ChefHat size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Gross Turnover</span>
            <h3 className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
              KES {summaryMetrics.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-emerald-600 font-medium">Excludes cancelled orders</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Output VAT (16%)</span>
            <h3 className="text-lg font-bold font-mono text-purple-700 mt-0.5">
              KES {summaryMetrics.totalVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-purple-600 font-medium">KRA Statutory Liability</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Receipt size={18} />
          </div>
        </div>
      </div>

      {/* 3. MULTI-DIMENSIONAL QUERY & FILTER PANEL */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search order #, customer, phone, table, or KRA PIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-gray-200 rounded-xl focus:border-servora-core focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {['ALL', 'Confirmed', 'Sent-To-Kitchen', 'Preparing', 'Ready', 'Completed', 'Cancelled'].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === status
                      ? 'bg-white shadow-xs text-servora-navy font-bold'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {status === 'ALL' ? 'All Statuses' : status}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal size={13} className="text-servora-core" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 bg-servora-core text-white rounded-full text-[10px]">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible Corporate Faceted Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
            {/* Branch Outlet */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                Branch Outlet
              </label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Locations ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Service Channel */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                Service Channel
              </label>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Channels</option>
                <option value="Dine-In">Dine-In</option>
                <option value="Standard Dining Room">Standard Dining Room</option>
                <option value="Takeaway">Takeaway</option>
                <option value="Express Counter & Takeaway">Express Counter</option>
                <option value="Delivery">Delivery</option>
                <option value="Bar-Tab">Bar-Tab</option>
              </select>
            </div>

            {/* Payment Settlement Status */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Settlements</option>
                <option value="Paid">Paid / Settled</option>
                <option value="Pending">Pending Payment</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>

            {/* Tender Method */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                Tender Method
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Tenders</option>
                <option value="CASH_DRAWER">Cash Drawer</option>
                <option value="MPESA_B2B">M-Pesa STK / C2B</option>
                <option value="CREDIT_CARD">Card Terminal (PDQ)</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                Date Window
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-[11px] focus:outline-none"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-[11px] focus:outline-none"
                />
              </div>
            </div>

            {/* Ticket Amount & B2B Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                Ticket Range & B2B
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Min KES"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-[11px] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setOnlyB2bKraPin(!onlyB2bKraPin)}
                  title="Filter Corporate B2B Orders with Buyer KRA PIN"
                  className={`px-2 py-1.5 rounded-xl font-mono font-bold text-[10px] border shrink-0 cursor-pointer ${
                    onlyB2bKraPin
                      ? 'bg-blue-50 border-servora-core text-servora-core'
                      : 'bg-slate-50 border-gray-200 text-gray-500'
                  }`}
                >
                  PIN
                </button>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    title="Reset All Filters"
                    className="p-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-100 cursor-pointer shrink-0"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. ORDERS LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal animate-pulse">
            Connecting to enterprise order-to-cash ledger...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No order records match your search filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-200 text-[10px] font-bold">
                  <th className="py-3 px-4">Order # & Location</th>
                  <th className="py-3 px-4">Branch & Custodian</th>
                  <th className="py-3 px-4">Channel / Customer</th>
                  <th className="py-3 px-4">Fulfillment</th>
                  <th className="py-3 px-4">Settlement & eTIMS</th>
                  <th className="py-3 px-4 text-right">Total (KES)</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {orders.map((order) => {
                  const totalNum = parseFloat(order.total) || 0;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold block text-servora-navy">
                          {order.orderNumber}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {order.tableName || 'Counter POS'} &bull;{' '}
                          {new Date(order.createdAt).toLocaleDateString()}{' '}
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-700 flex items-center gap-1">
                          <Building2 size={11} className="text-gray-400" />
                          {order.branchName || 'Main Outlet'}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <UserCheck size={10} /> {order.cashierName || 'POS Cashier'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-700 block">{order.orderType}</span>
                        <span className="text-[10px] text-gray-400 block">
                          {order.customerName || 'Walk-in Guest'}
                          {order.buyerKraPin ? ` • PIN: ${order.buyerKraPin}` : ''}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          <Clock size={11} /> {order.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold w-max border ${
                              order.paymentStatus === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <CheckCircle size={11} /> {order.paymentStatus}
                            {order.paymentMethod ? ` (${order.paymentMethod.replace(/_/g, ' ')})` : ''}
                          </span>
                          {order.cuInvoiceNumber && (
                            <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                              <QrCode size={10} className="text-servora-core" /> {order.cuInvoiceNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-servora-navy">
                        KES {totalNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleInspectOrder(order)}
                          className="px-3 py-1.5 text-xs font-semibold text-servora-core hover:bg-blue-50 rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer"
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

      {/* 5. INSPECT ORDER & LINE-ITEM DRILL-DOWN MODAL */}
      {activeOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy font-mono">{activeOrder.orderNumber}</h3>
                <p className="text-[11px] text-servora-deepTeal mt-0.5">
                  {activeOrder.branchName || 'Main Outlet'} &bull; Channel:{' '}
                  <strong>{activeOrder.orderType}</strong> &bull; Location:{' '}
                  <strong>{activeOrder.tableName || 'Counter'}</strong>
                </p>
              </div>
              <button
                onClick={() => setActiveOrder(null)}
                className="text-gray-400 hover:text-servora-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-gray-200 rounded-xl text-xs">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Grand Total</span>
                <span className="font-mono font-bold text-base text-servora-navy">
                  KES {parseFloat(activeOrder.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Payment Settlement</span>
                <span className="font-bold text-emerald-700 text-sm">
                  {activeOrder.paymentStatus}{' '}
                  {activeOrder.paymentMethod ? `(${activeOrder.paymentMethod.replace(/_/g, ' ')})` : ''}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">VAT & Levy</span>
                <span className="font-mono font-semibold text-gray-800">
                  VAT: KES {parseFloat(activeOrder.tax || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Customer / KRA PIN</span>
                <span className="font-semibold text-gray-800 truncate block">
                  {activeOrder.buyerKraPin || activeOrder.customerName || 'Walk-in'}
                </span>
              </div>
            </div>

            {/* Itemized Order Lines */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-servora-navy block">Ordered Line Items:</span>
              {isLoadingDetail ? (
                <div className="p-4 text-center text-xs text-gray-400 animate-pulse">
                  Loading line items...
                </div>
              ) : activeOrder.items && activeOrder.items.length > 0 ? (
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 text-xs">
                  {activeOrder.items.map((line) => (
                    <div key={line.id} className="p-2.5 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-servora-navy">
                          {Number(line.quantity)}x {line.itemName || `Menu Item #${line.menuItemId}`}
                        </span>
                        {line.sku && (
                          <span className="text-[10px] font-mono text-gray-400 block">SKU: {line.sku}</span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-servora-navy">
                        KES {Number(line.totalPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No itemized lines recorded.</p>
              )}
            </div>

            {/* Status Advancement Workflow */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-servora-navy block">Advance Fulfillment Status:</span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {['Sent-To-Kitchen', 'Preparing', 'Ready', 'Completed', 'Cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(activeOrder.id, st)}
                    disabled={isUpdatingStatus || activeOrder.status === st}
                    className={`py-2 px-2.5 rounded-xl font-bold border transition-colors cursor-pointer ${
                      activeOrder.status === st
                        ? 'bg-servora-navy text-white border-servora-navy'
                        : st === 'Cancelled'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}