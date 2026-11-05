'use client';

import { useState, useEffect } from 'react';
import { Globe, Clock, CheckCircle2, ShoppingBag, Truck, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api'; // Import centralized dynamic API helper

interface OnlineOrder {
  id: number;
  orderNumber: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  total: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  items: { id: number; quantity: number; name: string; unitPrice: string }[];
}

export default function OnlineOrdersPage() {
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchOnlineOrders = async () => {
    try {
      setIsLoading(true);
      // Fetch orders dynamically using fetchApi (handles base URL and auth headers)
      const result = await fetchApi('/api/v1/orders');
      
      // Filter for online/delivery/takeaway or pending fulfillment
      const activeOnline = result.data.filter((o: any) => 
        ['Delivery', 'Takeaway', 'Online'].includes(o.orderType) && 
        !['Completed', 'Cancelled'].includes(o.status)
      );
      setOrders(activeOnline);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlineOrders();
    const pollInterval = setInterval(fetchOnlineOrders, 10000); // Poll every 10s
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await fetchApi(`/api/v1/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      fetchOnlineOrders();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const getElapsedTime = (createdAt: string) => {
    const elapsedMs = currentTime.getTime() - new Date(createdAt).getTime();
    return Math.floor(elapsedMs / 60000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-servora-navy flex items-center gap-2">
            <Globe size={28} className="text-servora-core" /> Online Orders & Storefront
          </h1>
          <p className="text-servora-deepTeal text-xs mt-1">
            Manage incoming web, delivery, and digital store orders in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchOnlineOrders}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
            title="Refresh Orders"
          >
            <RefreshCw size={16} />
          </button>
          <div className="text-right text-sm font-semibold text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-6">
        {isLoading && orders.length === 0 ? (
          <div className="flex items-center justify-center h-full text-servora-deepTeal">Loading online orders...</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            <ShoppingBag size={48} className="mb-4 opacity-20 text-servora-core" />
            <p className="text-lg font-bold text-servora-navy">No Active Online Orders</p>
            <p className="text-sm mt-1">New web store or delivery orders will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map(order => {
              const elapsedMins = getElapsedTime(order.createdAt);
              const isDelayed = elapsedMins > 20;

              return (
                <div 
                  key={order.id} 
                  className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-3 bg-servora-navy text-white flex justify-between items-center">
                    <div>
                      <span className="font-bold text-lg tracking-wider">{order.orderNumber}</span>
                      {order.customerName && (
                        <p className="text-xs text-gray-300 mt-0.5">{order.customerName} ({order.customerPhone || 'No Phone'})</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded">
                        {order.orderType}
                      </span>
                      <div className="flex items-center gap-1 font-mono text-sm bg-white/10 px-2 py-1 rounded">
                        {isDelayed && <AlertCircle size={14} className="text-red-400" />}
                        <Clock size={14} />
                        {elapsedMins}m
                      </div>
                    </div>
                  </div>

                  {/* Body & Meta */}
                  <div className="p-4 flex-1 space-y-3">
                    <div className="flex justify-between text-xs font-medium text-gray-500 border-b border-gray-100 pb-2">
                      <span>Payment: <strong className={order.paymentStatus === 'Paid' ? 'text-green-600' : 'text-amber-600'}>{order.paymentStatus}</strong></span>
                      <span>Total: <strong className="text-servora-navy">KES {Number(order.total).toLocaleString()}</strong></span>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1.5">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-servora-navy">
                          <span><strong>{item.quantity}x</strong> {item.name}</span>
                          <span className="font-mono">KES {(Number(item.unitPrice) * Number(item.quantity)).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2 mt-auto">
                    {order.status === 'Confirmed' && (
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'Preparing')}
                        className="flex-1 py-2 bg-servora-core text-white font-bold rounded-lg text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                      >
                        Accept & Prepare
                      </button>
                    )}
                    {order.status === 'Preparing' && (
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'Ready')}
                        className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg text-xs hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 size={14} /> Mark Ready
                      </button>
                    )}
                    {order.status === 'Ready' && (
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'Completed')}
                        className="flex-1 py-2 bg-servora-navy text-white font-bold rounded-lg text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
                      >
                        <Truck size={14} /> Complete / Dispatched
                      </button>
                    )}
                    <button 
                      onClick={() => handleUpdateStatus(order.id, 'Cancelled')}
                      className="px-3 py-2 bg-white border border-gray-200 text-red-600 font-bold rounded-lg text-xs hover:bg-red-50 transition-colors"
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