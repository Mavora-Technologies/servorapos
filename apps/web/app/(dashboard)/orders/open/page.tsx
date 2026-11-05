'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ClipboardList, Clock, ChefHat, CheckCircle2, Check, ChevronRight, Utensils } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface OrderRecord {
  id: number;
  orderNumber: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  tableName?: string;
  customerName?: string;
  total: string;
  createdAt: string;
}

export default function OpenOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOpenOrders = async () => {
    try {
      setIsLoading(true);
      const result = await fetchApi('/api/v1/orders/open');
      if (result?.data) {
        setOrders(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch open orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for updates every 10 seconds
  useEffect(() => {
    fetchOpenOrders();
    const interval = setInterval(fetchOpenOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCompleteOrder = async (orderId: number) => {
    try {
      await fetchApi(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Completed' }),
      });
      
      // Remove it from the local state immediately for a snappy UI
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error: any) {
      alert(error.message || 'Failed to complete order');
    }
  };

  const confirmedOrders = orders.filter(o => o.status === 'Confirmed' || o.status === 'Sent-To-Kitchen');
  const preparingOrders = orders.filter(o => o.status === 'Preparing');
  const readyOrders = orders.filter(o => o.status === 'Ready');

  const OrderCard = ({ order }: { order: OrderRecord }) => (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3 relative overflow-hidden transition-all hover:shadow-md">
      {order.status === 'Ready' && (
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
      )}
      
      <div className="flex justify-between items-start">
        <div>
          <span className="font-bold text-servora-navy text-sm font-mono">{order.orderNumber}</span>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
            <Utensils size={11} className="text-servora-core" />
            <span className="font-medium text-servora-navy">{order.tableName || order.orderType}</span>
            <span>&bull;</span>
            <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
          {order.orderType}
        </span>
      </div>

      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
        <span className="font-mono font-bold text-servora-core">
          KES {parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
          order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {order.paymentStatus}
        </span>
      </div>

      {order.status === 'Ready' && (
        <button 
          onClick={() => handleCompleteOrder(order.id)}
          className="w-full mt-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
        >
          <Check size={15} /> Mark Served & Dispatched
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)]">
      
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-400">Kitchen Display System (KDS)</span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-servora-navy">Live Open Orders</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Kitchen & FOH Live Kanban Pipeline</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Real-time fulfillment tracking for culinary staff, expediters, and front-of-house service.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchOpenOrders} 
            className="bg-white border border-gray-200 text-servora-navy text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors shadow-xs"
          >
            Refresh Board
          </button>
        </div>
      </div>

      {/* Kanban Board Container */}
      {isLoading && orders.length === 0 ? (
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-xs text-servora-deepTeal animate-pulse">
          Synchronizing live kitchen queue...
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 overflow-hidden">
          
          {/* Column 1: Confirmed / Awaiting Kitchen */}
          <div className="flex flex-col bg-slate-50/70 rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-200/80 bg-white shrink-0 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-servora-navy flex items-center gap-2">
                <ClipboardList size={15} className="text-gray-400" /> 
                Awaiting Kitchen
              </h3>
              <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                {confirmedOrders.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {confirmedOrders.map(order => <OrderCard key={order.id} order={order} />)}
              {confirmedOrders.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-xs italic">
                  No orders waiting in queue.
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Preparing */}
          <div className="flex flex-col bg-blue-50/40 rounded-2xl border border-blue-100 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-blue-100 bg-white shrink-0 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-servora-core flex items-center gap-2">
                <ChefHat size={15} className="text-servora-core" /> 
                Preparing in Kitchen
              </h3>
              <span className="bg-blue-100 text-servora-core text-xs font-bold px-2.5 py-0.5 rounded-lg">
                {preparingOrders.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {preparingOrders.map(order => <OrderCard key={order.id} order={order} />)}
              {preparingOrders.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-xs italic">
                  No orders currently preparing.
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Ready to Serve */}
          <div className="flex flex-col bg-emerald-50/40 rounded-2xl border border-emerald-100 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-emerald-100 bg-white shrink-0 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600" /> 
                Ready to Serve / Dispatch
              </h3>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                {readyOrders.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {readyOrders.map(order => <OrderCard key={order.id} order={order} />)}
              {readyOrders.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-xs italic">
                  No orders ready at this time.
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}