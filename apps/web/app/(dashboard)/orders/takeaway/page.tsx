'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Check, 
  AlertCircle, 
  Search, 
  ChevronRight, 
  TrendingUp, 
  ShieldCheck, 
  User, 
  Phone, 
  Receipt,
  Printer,
  X
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface OrderRecord {
  id: number;
  orderNumber: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  customerName?: string;
  customerPhone?: string;
  subtotal?: string;
  tax?: string;
  total: string;
  createdAt: string;
}

type TakeawayTab = 'Active' | 'Ready' | 'Completed';

export default function TakeawayPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TakeawayTab>('Active');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order for Enterprise Inspection Modal
  const [inspectOrder, setInspectOrder] = useState<OrderRecord | null>(null);

  const fetchTakeawayOrders = async () => {
    try {
      setIsLoading(true);
      const result = await fetchApi('/api/v1/orders/takeaway');
      if (result?.data) {
        setOrders(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch enterprise takeaway orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for updates every 10 seconds to keep kitchen sync in real-time
  useEffect(() => {
    fetchTakeawayOrders();
    const interval = setInterval(fetchTakeawayOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleHandOffOrder = async (orderId: number) => {
    try {
      await fetchApi(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Completed' }),
      });
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Completed' } : o));
      if (inspectOrder?.id === orderId) {
        setInspectOrder(null);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to complete order hand-off');
    }
  };

  // Enterprise Telemetry Metrics
  const metrics = useMemo(() => {
    const activeQueue = orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled').length;
    const readyForPickup = orders.filter(o => o.status === 'Ready').length;
    const completedToday = orders.filter(o => o.status === 'Completed').length;
    const grossVolume = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    return { activeQueue, readyForPickup, completedToday, grossVolume };
  }, [orders]);

  // Filter logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      let matchesTab = true;
      if (activeTab === 'Active') {
        matchesTab = ['Confirmed', 'Sent-To-Kitchen', 'Preparing'].includes(order.status);
      } else if (activeTab === 'Ready') {
        matchesTab = order.status === 'Ready';
      } else if (activeTab === 'Completed') {
        matchesTab = ['Completed', 'Cancelled'].includes(order.status);
      }
      
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (order.customerPhone && order.customerPhone.includes(searchQuery));

      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, searchQuery]);

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)]">
      
      {/* Top Banner Navigation */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-400">Quick-Service & Takeaway Control Tower</span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-servora-navy">Pickup Counter Hub</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <ShoppingBag className="text-servora-core" size={22} /> Takeaway & Grab-and-Go Fulfillment
          </h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Monitor QSR prep queues, verify payment settlements, and execute rapid customer hand-offs.
          </p>
        </div>

        <button 
          onClick={fetchTakeawayOrders}
          className="bg-white border border-gray-200 text-servora-navy text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors shadow-xs"
        >
          Refresh Pickup Queue
        </button>
      </div>

      {/* Telemetry Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Active Prep Queue</span>
            <h3 className="text-base font-bold text-servora-navy mt-0.5">{metrics.activeQueue} Tickets</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Ready for Hand-off</span>
            <h3 className="text-base font-bold text-emerald-700 mt-0.5">{metrics.readyForPickup} Ready</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Fulfilled Today</span>
            <h3 className="text-base font-bold text-servora-navy mt-0.5">{metrics.completedToday} Handed Off</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-gray-700 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Gross Takeaway Value</span>
            <h3 className="text-base font-bold text-emerald-700 mt-0.5">KES {metrics.grossVolume.toLocaleString()}</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* Control Tower Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl w-full sm:w-auto overflow-x-auto">
          {(['Active', 'Ready', 'Completed'] as TakeawayTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-white shadow-xs text-servora-navy' 
                  : 'text-gray-500 hover:text-servora-navy'
              }`}
            >
              {tab === 'Active' && `Awaiting Kitchen Prep`}
              {tab === 'Ready' && `Ready for Pickup (${orders.filter(o => o.status === 'Ready').length})`}
              {tab === 'Completed' && `Fulfilled History`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input 
            type="text" 
            placeholder="Search Order # or Customer..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-servora-core/20 focus:border-servora-core transition-all"
          />
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
            <p className="text-sm font-bold text-servora-navy">No {activeTab.toLowerCase()} takeaway tickets found</p>
            <p className="text-xs text-gray-500 mt-1">Orders placed as 'Takeaway' on the POS terminal will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-6">
            {filteredOrders.map(order => {
              const isReady = order.status === 'Ready';
              const isCompleted = order.status === 'Completed';

              return (
                <div 
                  key={order.id} 
                  className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col shadow-xs ${
                    isReady ? 'border-emerald-300 ring-2 ring-emerald-50' : 'border-gray-100'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-100 flex justify-between items-start bg-slate-50/60">
                    <div>
                      <h3 className="font-bold font-mono text-sm text-servora-navy tracking-tight">{order.orderNumber}</h3>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5 font-medium">
                        <Clock size={11} /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-servora-core">KES {parseFloat(order.total).toLocaleString()}</div>
                      <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                        order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 space-y-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block">Customer Details</span>
                      <div className="font-bold text-servora-navy flex items-center gap-1.5">
                        <User size={13} className="text-servora-core" /> {order.customerName || 'Walk-in Customer'}
                      </div>
                      {order.customerPhone && (
                        <div className="text-gray-500 font-mono flex items-center gap-1.5">
                          <Phone size={13} className="text-gray-400" /> {order.customerPhone}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 pt-1 border-t border-gray-100">
                      <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block">Kitchen Status</span>
                      <span className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg text-[11px] ${
                        isReady 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : isCompleted 
                          ? 'bg-gray-100 text-gray-600' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {isReady ? <CheckCircle2 size={13} /> : isCompleted ? <Check size={13} /> : <Clock size={13} />}
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-3 bg-gray-50 border-t border-gray-100 mt-auto flex gap-2">
                    <button
                      onClick={() => setInspectOrder(order)}
                      className="flex-1 py-2 bg-white border border-gray-200 text-servora-navy font-bold rounded-xl hover:bg-gray-100 transition-colors text-xs"
                    >
                      Inspect Ticket
                    </button>

                    {isReady && order.paymentStatus === 'Paid' && (
                      <button 
                        onClick={() => handleHandOffOrder(order.id)}
                        className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs hover:bg-emerald-700 transition-colors text-xs flex items-center justify-center gap-1.5"
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

      {/* INSPECT ORDER MODAL */}
      {inspectOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-servora-navy">{inspectOrder.orderNumber}</h3>
                <p className="text-[11px] text-servora-deepTeal">Takeaway & Quick-Service Ticket Audit</p>
              </div>
              <button onClick={() => setInspectOrder(null)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <span className="font-bold text-servora-navy">{inspectOrder.customerName || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone:</span>
                <span className="font-mono font-medium">{inspectOrder.customerPhone || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Status:</span>
                <span className="font-bold text-emerald-700">{inspectOrder.paymentStatus}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-sm">
                <span>Total Amount:</span>
                <span className="font-mono text-servora-core">KES {parseFloat(inspectOrder.total).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setInspectOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Close
              </button>
              {inspectOrder.status === 'Ready' && inspectOrder.paymentStatus === 'Paid' && (
                <button
                  type="button"
                  onClick={() => handleHandOffOrder(inspectOrder.id)}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
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