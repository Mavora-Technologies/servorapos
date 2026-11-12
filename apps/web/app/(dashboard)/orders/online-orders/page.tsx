'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Globe,
  Clock,
  CheckCircle2,
  ShoppingBag,
  Truck,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Search,
  Building2,
  ChefHat,
  TrendingUp,
  User,
  Phone,
  Plus,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface OnlineOrderItem {
  id: number;
  quantity: number;
  name: string;
  unitPrice: string;
  totalPrice?: string;
  notes?: string | null;
}

interface OnlineOrder {
  id: number;
  branchId: number | null;
  branchName: string | null;
  orderNumber: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  total: string;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  createdAt: string;
  items: OnlineOrderItem[];
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

export default function OnlineOrdersPage() {
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Multi-Dimensional Filters
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchOnlineOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const branchParam = branchFilter !== 'ALL' ? `?branchId=${branchFilter}` : '';
      const [result, branchRes] = await Promise.all([
        fetchApi(`/api/v1/orders/online${branchParam}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (result?.data) setOrders(result.data);
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
      setNowTick(Date.now());
    } catch (error) {
      console.error('Failed to fetch online storefront orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter]);

  useEffect(() => {
    fetchOnlineOrders();
    const pollInterval = setInterval(fetchOnlineOrders, 10000);
    const clockInterval = setInterval(() => setNowTick(Date.now()), 30000);
    return () => {
      clearInterval(pollInterval);
      clearInterval(clockInterval);
    };
  }, [fetchOnlineOrders]);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await fetchApi(`/api/v1/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (newStatus === 'Completed' || newStatus === 'Cancelled') {
        setOrders((prev) => prev.filter((o) => o.id !== id));
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
        );
      }
    } catch (error: any) {
      alert(error.message || 'Failed to update order status');
    }
  };

  const getElapsedTime = (createdAt: string) => {
    return Math.max(0, Math.floor((nowTick - new Date(createdAt).getTime()) / 60000));
  };

  // Telemetry Metrics
  const metrics = useMemo(() => {
    const newCount = orders.filter((o) =>
      ['Confirmed', 'Sent-To-Kitchen'].includes(o.status)
    ).length;
    const preparingCount = orders.filter((o) => o.status === 'Preparing').length;
    const readyCount = orders.filter((o) =>
      ['Ready', 'Dispatched'].includes(o.status)
    ).length;
    const activeRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    return { newCount, preparingCount, readyCount, activeRevenue };
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (channelFilter !== 'ALL') {
        if (!o.orderType.toLowerCase().includes(channelFilter.toLowerCase())) return false;
      }
      if (stageFilter !== 'ALL') {
        if (stageFilter === 'NEW' && !['Confirmed', 'Sent-To-Kitchen'].includes(o.status)) {
          return false;
        }
        if (stageFilter === 'PREPARING' && o.status !== 'Preparing') return false;
        if (stageFilter === 'READY' && !['Ready', 'Dispatched'].includes(o.status)) return false;
      }
      if (paymentFilter !== 'ALL' && o.paymentStatus.toUpperCase() !== paymentFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchOrder = o.orderNumber.toLowerCase().includes(q);
        const matchCust = o.customerName?.toLowerCase().includes(q);
        const matchPhone = o.customerPhone?.includes(searchQuery);
        if (!matchOrder && !matchCust && !matchPhone) return false;
      }
      return true;
    });
  }, [orders, channelFilter, stageFilter, paymentFilter, searchQuery]);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] space-y-5 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs shrink-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/orders"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1"
            >
              Order-to-Cash & Sales <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Digital & Off-Premise Storefront</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Globe size={24} className="text-servora-core" /> Online Orders & Digital Storefront
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Real-time intake, kitchen preparation, and last-mile fulfillment across web storefront, takeaway, and 3PL channels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
          <Link
            href="/pos"
            className="bg-servora-core text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus size={14} /> New Digital Ticket
          </Link>
          <div className="text-xs font-mono font-bold text-gray-500 bg-slate-50 px-3 py-2 rounded-xl border border-gray-200">
            {new Date(nowTick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button
            onClick={fetchOnlineOrders}
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl text-servora-navy hover:bg-gray-100 transition-colors shadow-xs cursor-pointer"
            title="Refresh Online Orders"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 2. TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 shrink-0">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Incoming Queue</span>
            <h3 className="text-lg font-bold font-mono text-servora-navy mt-0.5">{metrics.newCount} New</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
            <ShoppingBag size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">In Kitchen Prep</span>
            <h3 className="text-lg font-bold font-mono text-amber-700 mt-0.5">{metrics.preparingCount} Cooking</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ChefHat size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Ready / Dispatched</span>
            <h3 className="text-lg font-bold font-mono text-emerald-700 mt-0.5">{metrics.readyCount} Outbound</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Truck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Active Pipeline Value</span>
            <h3 className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
              KES {metrics.activeRevenue.toLocaleString()}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* 3. MULTI-DIMENSIONAL FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs shrink-0 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {(
            [
              { id: 'ALL', label: `All Active (${orders.length})` },
              { id: 'NEW', label: `Incoming (${metrics.newCount})` },
              { id: 'PREPARING', label: `Preparing (${metrics.preparingCount})` },
              { id: 'READY', label: `Ready / Outbound (${metrics.readyCount})` },
            ] as const
          ).map((st) => (
            <button
              key={st.id}
              onClick={() => setStageFilter(st.id)}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                stageFilter === st.id
                  ? 'bg-white text-servora-navy shadow-xs'
                  : 'text-gray-500 hover:text-servora-navy'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            <option value="ALL">All Digital Channels</option>
            <option value="Delivery">Delivery &amp; 3PL</option>
            <option value="Takeaway">Takeaway &amp; Express</option>
            <option value="Online">Web Storefront</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Settlements</option>
            <option value="PAID">Pre-Paid Online</option>
            <option value="PENDING">Pay on Delivery/Pickup</option>
          </select>

          <div className="relative flex-1 sm:w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Order #, Name, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
            />
          </div>
        </div>
      </div>

      {/* 4. ORDERS GRID */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-6">
        {isLoading && orders.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-servora-deepTeal animate-pulse">
            Loading online storefront orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 p-12">
            <ShoppingBag size={42} className="mb-3 opacity-20 text-servora-core" />
            <p className="text-sm font-bold text-servora-navy">No Active Digital or Off-Premise Orders</p>
            <p className="text-xs mt-1 text-gray-500">
              Incoming web storefront, takeaway, and delivery orders will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const elapsedMins = getElapsedTime(order.createdAt);
              const isDelayed = elapsedMins > 20;
              const isIncoming = ['Confirmed', 'Sent-To-Kitchen'].includes(order.status);

              return (
                <div
                  key={order.id}
                  className={`flex flex-col bg-white rounded-2xl border shadow-xs overflow-hidden ${
                    isDelayed ? 'border-rose-300' : 'border-gray-200'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-3.5 bg-servora-navy text-white flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <span className="font-bold font-mono text-base tracking-wider block">
                        {order.orderNumber}
                      </span>
                      <p className="text-[11px] text-gray-300 mt-0.5 flex items-center gap-1 truncate">
                        <User size={11} /> {order.customerName || 'Guest Customer'}
                        {order.customerPhone ? ` (${order.customerPhone})` : ''}
                      </p>
                      {order.branchName && (
                        <p className="text-[10px] text-blue-200 mt-0.5 flex items-center gap-1">
                          <Building2 size={10} /> {order.branchName}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-bold uppercase bg-white/15 px-2 py-0.5 rounded">
                        {order.orderType}
                      </span>
                      <div
                        className={`flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded ${
                          isDelayed ? 'bg-rose-500/30 text-rose-200 font-bold' : 'bg-white/10'
                        }`}
                      >
                        {isDelayed && <AlertTriangle size={12} />}
                        <Clock size={12} />
                        {elapsedMins}m
                      </div>
                    </div>
                  </div>

                  {/* Body & Line Items */}
                  <div className="p-4 flex-1 space-y-3">
                    <div className="flex justify-between items-center text-xs font-medium text-gray-500 border-b border-gray-100 pb-2">
                      <span>
                        Payment:{' '}
                        <strong
                          className={
                            order.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'
                          }
                        >
                          {order.paymentStatus}
                        </strong>
                      </span>
                      <span className="font-mono">
                        Total:{' '}
                        <strong className="text-servora-navy">
                          KES {Number(order.total).toLocaleString()}
                        </strong>
                      </span>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1.5">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-xs text-servora-navy">
                            <span>
                              <strong>{item.quantity}x</strong> {item.name}
                            </span>
                            <span className="font-mono text-gray-600">
                              KES {(Number(item.unitPrice) * Number(item.quantity)).toLocaleString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 italic">No itemized dishes attached.</p>
                      )}
                    </div>

                    {order.notes && (
                      <div className="p-2 bg-amber-50/60 border border-amber-100 rounded-lg text-[11px] text-amber-900">
                        {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Action Footer */}
                  <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2 mt-auto">
                    {isIncoming && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'Preparing')}
                        className="flex-1 py-2 bg-servora-core text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ChefHat size={14} /> Accept &amp; Prepare
                      </button>
                    )}
                    {order.status === 'Preparing' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'Ready')}
                        className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={14} /> Mark Ready
                      </button>
                    )}
                    {(order.status === 'Ready' || order.status === 'Dispatched') && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'Completed')}
                        className="flex-1 py-2 bg-servora-navy text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Truck size={14} /> Complete / Dispatched
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'Cancelled')}
                      className="px-3 py-2 bg-white border border-gray-200 text-rose-600 font-bold rounded-xl text-xs hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Cancel Order"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}