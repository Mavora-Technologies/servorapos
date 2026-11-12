'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  Check,
  Search,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  User,
  Phone,
  X,
  RefreshCw,
  Building2,
  ChefHat,
  ArrowRight,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface TakeawayOrderRecord {
  id: number;
  branchId: number | null;
  branchName: string | null;
  cashierName: string | null;
  orderNumber: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  customerName?: string;
  customerPhone?: string;
  buyerKraPin?: string;
  subtotal?: string;
  tax?: string;
  total: string;
  itemsCount?: number;
  createdAt: string;
}

interface TakeawayOrderDetail extends TakeawayOrderRecord {
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

type TakeawayTab = 'Active' | 'Ready' | 'Completed';

export default function TakeawayPage() {
  const [orders, setOrders] = useState<TakeawayOrderRecord[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const [activeTab, setActiveTab] = useState<TakeawayTab>('Active');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order for Enterprise Inspection Modal
  const [inspectOrder, setInspectOrder] = useState<TakeawayOrderDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchTakeawayOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const branchParam = branchFilter !== 'ALL' ? `?branchId=${branchFilter}` : '';
      const [result, branchRes] = await Promise.all([
        fetchApi(`/api/v1/orders/takeaway${branchParam}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (result?.data) setOrders(result.data);
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
      setNowTick(Date.now());
    } catch (error) {
      console.error('Failed to fetch enterprise takeaway orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter]);

  useEffect(() => {
    fetchTakeawayOrders();
    const interval = setInterval(fetchTakeawayOrders, 10000);
    const clock = setInterval(() => setNowTick(Date.now()), 30000);
    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, [fetchTakeawayOrders]);

  const handleAdvanceStage = async (orderId: number, nextStatus: string) => {
    try {
      await fetchApi(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      if (inspectOrder?.id === orderId) {
        if (nextStatus === 'Completed') {
          setInspectOrder(null);
        } else {
          setInspectOrder((prev) => (prev ? { ...prev, status: nextStatus } : null));
        }
      }
    } catch (error: any) {
      alert(error.message || 'Failed to update takeaway order status');
    }
  };

  const handleInspectTicket = async (order: TakeawayOrderRecord) => {
    setInspectOrder({ ...order, items: [] });
    setIsLoadingDetail(true);
    try {
      const res = await fetchApi(`/api/v1/orders/${order.id}`);
      if (res?.data) {
        setInspectOrder(res.data);
      }
    } catch (err) {
      console.error('Failed to load takeaway line items:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Enterprise Telemetry Metrics
  const metrics = useMemo(() => {
    const activeQueue = orders.filter((o) =>
      ['Confirmed', 'Sent-To-Kitchen', 'Preparing'].includes(o.status)
    ).length;
    const readyForPickup = orders.filter((o) => o.status === 'Ready').length;
    const completedToday = orders.filter((o) => o.status === 'Completed').length;
    const grossVolume = orders
      .filter((o) => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    return { activeQueue, readyForPickup, completedToday, grossVolume };
  }, [orders]);

  // Filter logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      let matchesTab = true;
      if (activeTab === 'Active') {
        matchesTab = ['Confirmed', 'Sent-To-Kitchen', 'Preparing'].includes(order.status);
      } else if (activeTab === 'Ready') {
        matchesTab = order.status === 'Ready';
      } else if (activeTab === 'Completed') {
        matchesTab = ['Completed', 'Cancelled'].includes(order.status);
      }

      if (paymentFilter !== 'ALL' && order.paymentStatus.toUpperCase() !== paymentFilter) {
        return false;
      }

      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (order.customerPhone && order.customerPhone.includes(searchQuery));

      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, paymentFilter, searchQuery]);

  const getElapsedMinutes = (createdAt: string) => {
    return Math.max(0, Math.floor((nowTick - new Date(createdAt).getTime()) / 60000));
  };

  return (
    <div className="space-y-5 flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] font-sans">
      {/* Top Banner Navigation */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs shrink-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/orders"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1"
            >
              Order-to-Cash & Sales <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Pickup Counter Hub</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <ShoppingBag className="text-servora-core" size={22} /> Takeaway & Express Counter Fulfillment
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Monitor QSR prep queues, verify packed items & tender settlements, and execute rapid customer hand-offs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          <Link
            href="/pos"
            className="bg-servora-core text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus size={14} /> New Takeaway Order
          </Link>
          <button
            onClick={fetchTakeawayOrders}
            title="Refresh Pickup Queue"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* Telemetry Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 shrink-0">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Active Prep Queue</span>
            <h3 className="text-lg font-bold font-mono text-servora-navy mt-0.5">{metrics.activeQueue} Tickets</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Ready for Hand-off</span>
            <h3 className="text-lg font-bold font-mono text-emerald-700 mt-0.5">{metrics.readyForPickup} Ready</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Fulfilled History</span>
            <h3 className="text-lg font-bold font-mono text-servora-navy mt-0.5">{metrics.completedToday} Handed Off</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-gray-700 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Gross Takeaway Value</span>
            <h3 className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
              KES {metrics.grossVolume.toLocaleString()}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* Control Tower Tabs & Multi-Dimensional Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs shrink-0 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {(['Active', 'Ready', 'Completed'] as TakeawayTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab
                  ? 'bg-white shadow-xs text-servora-navy'
                  : 'text-gray-500 hover:text-servora-navy'
              }`}
            >
              {tab === 'Active' && `Awaiting Kitchen Prep (${metrics.activeQueue})`}
              {tab === 'Ready' && `Ready for Pickup (${metrics.readyForPickup})`}
              {tab === 'Completed' && `Fulfilled History`}
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
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Settlements</option>
            <option value="PAID">Paid / Settled</option>
            <option value="PENDING">Pay at Counter</option>
          </select>

          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search Order #, Name, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core transition-all"
            />
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading && orders.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-servora-deepTeal animate-pulse">
            Loading takeaway counter queue...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 p-12">
            <ShoppingBag size={42} className="mb-3 opacity-20 text-servora-navy" />
            <p className="text-sm font-bold text-servora-navy">
              No {activeTab.toLowerCase()} takeaway tickets found
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Orders placed under &apos;Express Counter &amp; Takeaway&apos; or &apos;Takeaway&apos; on the POS terminal appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-6">
            {filteredOrders.map((order) => {
              const isReady = order.status === 'Ready';
              const isCompleted = order.status === 'Completed';
              const elapsedMins = getElapsedMinutes(order.createdAt);
              const isDelayed = elapsedMins >= 15 && !isReady && !isCompleted;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col shadow-xs ${
                    isReady
                      ? 'border-emerald-300 ring-2 ring-emerald-50'
                      : isDelayed
                      ? 'border-amber-300'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-100 flex justify-between items-start bg-slate-50/60">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold font-mono text-sm text-servora-navy tracking-tight">
                          {order.orderNumber}
                        </h3>
                        {order.itemsCount !== undefined && order.itemsCount > 0 && (
                          <span className="text-[10px] font-mono font-bold bg-blue-50 text-servora-core px-1.5 py-0.2 rounded">
                            {order.itemsCount} items
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5 font-medium">
                        <Clock size={11} />{' '}
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        ({elapsedMins}m ago)
                      </p>
                      {order.branchName && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Building2 size={10} /> {order.branchName}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-servora-core">
                        KES {parseFloat(order.total).toLocaleString()}
                      </div>
                      <span
                        className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                          order.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 space-y-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block">
                        Customer Details
                      </span>
                      <div className="font-bold text-servora-navy flex items-center gap-1.5">
                        <User size={13} className="text-servora-core" />{' '}
                        {order.customerName || 'Walk-in Customer'}
                      </div>
                      {order.customerPhone && (
                        <div className="text-gray-500 font-mono flex items-center gap-1.5">
                          <Phone size={13} className="text-gray-400" /> {order.customerPhone}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 pt-1 border-t border-gray-100">
                      <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block">
                        Fulfillment Stage
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg text-[11px] ${
                          isReady
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isCompleted
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {isDelayed && <AlertTriangle size={12} className="text-amber-600" />}
                        {isReady ? (
                          <CheckCircle2 size={13} />
                        ) : isCompleted ? (
                          <Check size={13} />
                        ) : (
                          <Clock size={13} />
                        )}
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-3 bg-gray-50 border-t border-gray-100 mt-auto flex gap-2">
                    <button
                      onClick={() => handleInspectTicket(order)}
                      className="flex-1 py-2 bg-white border border-gray-200 text-servora-navy font-bold rounded-xl hover:bg-gray-100 transition-colors text-xs cursor-pointer"
                    >
                      Inspect Ticket
                    </button>

                    {(order.status === 'Confirmed' || order.status === 'Sent-To-Kitchen') && (
                      <button
                        onClick={() => handleAdvanceStage(order.id, 'Preparing')}
                        className="flex-1 py-2 bg-servora-core text-white font-bold rounded-xl shadow-xs hover:bg-blue-700 transition-colors text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ChefHat size={13} /> Start Prep
                      </button>
                    )}

                    {order.status === 'Preparing' && (
                      <button
                        onClick={() => handleAdvanceStage(order.id, 'Ready')}
                        className="flex-1 py-2 bg-amber-600 text-white font-bold rounded-xl shadow-xs hover:bg-amber-700 transition-colors text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Mark Ready <ArrowRight size={12} />
                      </button>
                    )}

                    {isReady && (
                      <button
                        onClick={() => handleAdvanceStage(order.id, 'Completed')}
                        className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs hover:bg-emerald-700 transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShoppingBag size={13} /> Hand Off
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* INSPECT ORDER & LINE ITEMS MODAL */}
      {inspectOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-servora-navy">
                  {inspectOrder.orderNumber}
                </h3>
                <p className="text-[11px] text-servora-deepTeal">
                  {inspectOrder.orderType} &bull; {inspectOrder.branchName || 'Main Outlet'}
                </p>
              </div>
              <button
                onClick={() => setInspectOrder(null)}
                className="text-gray-400 hover:text-servora-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <span className="font-bold text-servora-navy">
                  {inspectOrder.customerName || 'Walk-in'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone:</span>
                <span className="font-mono font-medium">
                  {inspectOrder.customerPhone || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Status:</span>
                <span className="font-bold text-emerald-700">{inspectOrder.paymentStatus}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-sm">
                <span>Total Amount:</span>
                <span className="font-mono text-servora-core">
                  KES {parseFloat(inspectOrder.total).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Packed Line Items Verification */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-servora-navy block">Packed Items Verification:</span>
              {isLoadingDetail ? (
                <div className="p-4 text-center text-gray-400 animate-pulse">
                  Loading packed items...
                </div>
              ) : inspectOrder.items.length > 0 ? (
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {inspectOrder.items.map((line) => (
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

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setInspectOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl cursor-pointer"
              >
                Close
              </button>
              {inspectOrder.status === 'Ready' && (
                <button
                  type="button"
                  onClick={() => handleAdvanceStage(inspectOrder.id, 'Completed')}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
                >
                  Confirm Customer Hand-off
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}