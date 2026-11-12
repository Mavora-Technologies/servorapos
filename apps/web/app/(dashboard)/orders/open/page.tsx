'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Clock,
  ChefHat,
  CheckCircle2,
  Check,
  ChevronRight,
  Utensils,
  Search,
  RefreshCw,
  ArrowRight,
  Building2,
  Eye,
  X,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface OpenOrderRecord {
  id: number;
  branchId: number | null;
  branchName: string | null;
  cashierName: string | null;
  orderNumber: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  tableName?: string;
  customerName?: string;
  customerPhone?: string;
  total: string;
  itemsCount?: number;
  createdAt: string;
}

interface OrderDetail extends OpenOrderRecord {
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

export default function OpenOrdersPage() {
  const [orders, setOrders] = useState<OpenOrderRecord[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Multi-Dimensional Filters
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Line-Item Inspection Modal
  const [inspectedOrder, setInspectedOrder] = useState<OrderDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchOpenOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const branchParam = branchFilter !== 'ALL' ? `?branchId=${branchFilter}` : '';
      const [result, branchRes] = await Promise.all([
        fetchApi(`/api/v1/orders/open${branchParam}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (result?.data) setOrders(result.data);
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
      setNowTick(Date.now());
    } catch (error) {
      console.error('Failed to fetch open orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter]);

  useEffect(() => {
    fetchOpenOrders();
    const pollInterval = setInterval(fetchOpenOrders, 10000);
    const clockInterval = setInterval(() => setNowTick(Date.now()), 30000);
    return () => {
      clearInterval(pollInterval);
      clearInterval(clockInterval);
    };
  }, [fetchOpenOrders]);

  const handleAdvanceStatus = async (orderId: number, nextStatus: string) => {
    try {
      await fetchApi(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });

      if (nextStatus === 'Completed' || nextStatus === 'Cancelled') {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        if (inspectedOrder?.id === orderId) setInspectedOrder(null);
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
        if (inspectedOrder?.id === orderId) {
          setInspectedOrder((prev) => (prev ? { ...prev, status: nextStatus } : null));
        }
      }
    } catch (error: any) {
      alert(error.message || 'Failed to update order status');
    }
  };

  const handleInspectTicket = async (order: OpenOrderRecord) => {
    setInspectedOrder({ ...order, items: [] });
    setIsLoadingDetail(true);
    try {
      const res = await fetchApi(`/api/v1/orders/${order.id}`);
      if (res?.data) {
        setInspectedOrder(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch order lines:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (channelFilter !== 'ALL' && o.orderType !== channelFilter) return false;
      if (paymentFilter !== 'ALL' && o.paymentStatus.toUpperCase() !== paymentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchOrder = o.orderNumber.toLowerCase().includes(q);
        const matchTable = o.tableName?.toLowerCase().includes(q);
        const matchCust = o.customerName?.toLowerCase().includes(q);
        if (!matchOrder && !matchTable && !matchCust) return false;
      }
      return true;
    });
  }, [orders, channelFilter, paymentFilter, searchQuery]);

  const confirmedOrders = filteredOrders.filter(
    (o) => o.status === 'Confirmed' || o.status === 'Sent-To-Kitchen'
  );
  const preparingOrders = filteredOrders.filter((o) => o.status === 'Preparing');
  const readyOrders = filteredOrders.filter((o) => o.status === 'Ready');

  const getElapsedMinutes = (createdAt: string) => {
    const diffMs = Math.max(0, nowTick - new Date(createdAt).getTime());
    return Math.floor(diffMs / 60000);
  };

  const OrderCard = ({ order }: { order: OpenOrderRecord }) => {
    const elapsedMins = getElapsedMinutes(order.createdAt);
    const isUrgent = elapsedMins >= 25 && order.status !== 'Ready';
    const isWarning = elapsedMins >= 15 && elapsedMins < 25 && order.status !== 'Ready';

    return (
      <div
        className={`bg-white p-4 rounded-2xl border shadow-xs space-y-3 relative overflow-hidden transition-all hover:shadow-md ${
          isUrgent
            ? 'border-rose-300'
            : isWarning
            ? 'border-amber-300'
            : 'border-gray-200'
        }`}
      >
        {order.status === 'Ready' && (
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
        )}
        {isUrgent && <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />}

        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-servora-navy text-sm font-mono">
                {order.orderNumber}
              </span>
              {order.itemsCount !== undefined && order.itemsCount > 0 && (
                <span className="text-[10px] font-mono font-bold bg-blue-50 text-servora-core px-1.5 py-0.2 rounded">
                  {order.itemsCount} items
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
              <Utensils size={11} className="text-servora-core" />
              <span className="font-bold text-servora-navy">
                {order.tableName || order.orderType}
              </span>
              <span>&bull;</span>
              <span>
                {new Date(order.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {order.branchName && (
              <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                <Building2 size={10} /> {order.branchName}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                isUrgent
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : isWarning
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-slate-100 text-gray-600'
              }`}
            >
              {isUrgent && <AlertTriangle size={10} />}
              <Clock size={10} /> {elapsedMins}m
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
              {order.orderType}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="font-mono font-bold text-servora-core">
            KES {parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                order.paymentStatus === 'Paid'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {order.paymentStatus}
            </span>
            <button
              onClick={() => handleInspectTicket(order)}
              title="Inspect Ticket Items"
              className="p-1 bg-slate-50 border border-gray-200 rounded-lg text-gray-600 hover:text-servora-core cursor-pointer"
            >
              <Eye size={12} />
            </button>
          </div>
        </div>

        {/* Stage Transition Action Button */}
        {(order.status === 'Confirmed' || order.status === 'Sent-To-Kitchen') && (
          <button
            onClick={() => handleAdvanceStatus(order.id, 'Preparing')}
            className="w-full py-2 bg-servora-core hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <ChefHat size={14} /> Start Preparing <ArrowRight size={13} />
          </button>
        )}

        {order.status === 'Preparing' && (
          <button
            onClick={() => handleAdvanceStatus(order.id, 'Ready')}
            className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <CheckCircle2 size={14} /> Mark Ready for Expediter <ArrowRight size={13} />
          </button>
        )}

        {order.status === 'Ready' && (
          <button
            onClick={() => handleAdvanceStatus(order.id, 'Completed')}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Check size={15} /> Mark Served & Dispatched
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] font-sans">
      {/* Top Banner & Multi-Dimensional Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs shrink-0 space-y-3">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Link
                href="/orders"
                className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1"
              >
                Order Management <ChevronRight size={12} />
              </Link>
              <span className="text-xs font-bold text-servora-navy">Live Open Kitchen & FOH Queue</span>
            </div>
            <h1 className="text-lg font-bold text-servora-navy">
              Kitchen & FOH Live Dispatch Kanban ({filteredOrders.length} Active Tickets)
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            <Link
              href="/pos"
              className="px-3 py-1.5 bg-servora-core text-white text-xs font-bold rounded-xl hover:bg-blue-700 flex items-center gap-1 shadow-xs"
            >
              <Plus size={13} /> New Ticket
            </Link>
            <Link
              href="/orders"
              className="px-3 py-1.5 bg-slate-100 text-servora-navy text-xs font-bold rounded-xl hover:bg-gray-200"
            >
              Full Order Ledger &rarr;
            </Link>
            <button
              onClick={fetchOpenOrders}
              title="Refresh Board"
              className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy cursor-pointer"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-gray-100 text-xs">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search order #, table, guest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
            />
          </div>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Branch Locations ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Service Channels</option>
            <option value="Dine-In">Dine-In</option>
            <option value="Standard Dining Room">Standard Dining Room</option>
            <option value="Takeaway">Takeaway</option>
            <option value="Express Counter & Takeaway">Express Counter</option>
            <option value="Delivery">Delivery</option>
            <option value="Bar-Tab">Bar-Tab</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">Paid / Settled</option>
            <option value="PENDING">Pending Settlement</option>
          </select>
        </div>
      </div>

      {/* Kanban Board Container */}
      {isLoading && orders.length === 0 ? (
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex items-center justify-center text-xs text-servora-deepTeal animate-pulse">
          Synchronizing live kitchen queue...
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
          {/* Column 1: Confirmed / Awaiting Kitchen */}
          <div className="flex flex-col bg-slate-50/70 rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-gray-200/80 bg-white shrink-0 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-servora-navy flex items-center gap-2">
                <ClipboardList size={15} className="text-gray-400" />
                Awaiting Kitchen
              </h3>
              <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-0.5 rounded-lg font-mono">
                {confirmedOrders.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {confirmedOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
              {confirmedOrders.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-xs italic">
                  No orders waiting in queue.
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Preparing */}
          <div className="flex flex-col bg-blue-50/40 rounded-2xl border border-blue-100 overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-blue-100 bg-white shrink-0 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-servora-core flex items-center gap-2">
                <ChefHat size={15} className="text-servora-core" />
                Preparing in Kitchen
              </h3>
              <span className="bg-blue-100 text-servora-core text-xs font-bold px-2.5 py-0.5 rounded-lg font-mono">
                {preparingOrders.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {preparingOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
              {preparingOrders.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-xs italic">
                  No orders currently preparing.
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Ready to Serve */}
          <div className="flex flex-col bg-emerald-50/40 rounded-2xl border border-emerald-100 overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-emerald-100 bg-white shrink-0 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600" />
                Ready to Serve / Dispatch
              </h3>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-lg font-mono">
                {readyOrders.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {readyOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
              {readyOrders.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-xs italic">
                  No orders ready at this time.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ticket Line-Item Inspection Modal */}
      {inspectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy font-mono">
                  {inspectedOrder.orderNumber}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {inspectedOrder.tableName || inspectedOrder.orderType} &bull;{' '}
                  {inspectedOrder.branchName || 'Main Outlet'}
                </p>
              </div>
              <button
                onClick={() => setInspectedOrder(null)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-servora-navy block">Kitchen Prep Line Items:</span>
              {isLoadingDetail ? (
                <div className="p-4 text-center text-gray-400 animate-pulse">
                  Loading dishes...
                </div>
              ) : inspectedOrder.items.length > 0 ? (
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {inspectedOrder.items.map((line) => (
                    <div key={line.id} className="p-2.5 flex justify-between items-center">
                      <span className="font-bold text-servora-navy">
                        {Number(line.quantity)}x {line.itemName || `Item #${line.menuItemId}`}
                      </span>
                      <span className="font-mono font-bold">
                        KES {Number(line.totalPrice).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 italic">No line items recorded.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setInspectedOrder(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
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