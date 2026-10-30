'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Clock, ChefHat, CheckCircle2, Check } from 'lucide-react';

interface OrderRecord {
  id: number;
  orderNumber: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  total: string;
  createdAt: string;
}

export default function OpenOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOpenOrders = async () => {
    try {
      const token = localStorage.getItem('servora_token');
      const res = await fetch('http://localhost:8000/api/v1/orders/open', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch open orders');
      const result = await res.json();
      setOrders(result.data);
    } catch (error) {
      console.error(error);
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
      const token = localStorage.getItem('servora_token');
      const res = await fetch(`http://localhost:8000/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'Completed' })
      });

      if (!res.ok) throw new Error('Failed to complete order');
      
      // Remove it from the local state immediately for a snappy UI
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error: any) {
      alert(error.message);
    }
  };

  const confirmedOrders = orders.filter(o => o.status === 'Confirmed');
  const preparingOrders = orders.filter(o => o.status === 'Preparing');
  const readyOrders = orders.filter(o => o.status === 'Ready');

  const OrderCard = ({ order }: { order: OrderRecord }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 relative overflow-hidden transition-all hover:shadow-md">
      {order.status === 'Ready' && (
        <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
      )}
      <div className="flex justify-between items-start">
        <div>
          <span className="font-bold text-servora-navy">{order.orderNumber}</span>
          <p className="text-xs text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleTimeString()}</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-1 rounded">
          {order.orderType}
        </span>
      </div>

      <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
        <span className="text-xs font-semibold text-servora-core">
          KES {parseFloat(order.total).toLocaleString()}
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          order.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {order.paymentStatus}
        </span>
      </div>

      {order.status === 'Ready' && (
        <button 
          onClick={() => handleCompleteOrder(order.id)}
          className="w-full mt-2 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <Check size={14} /> Mark Served / Dispatched
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-servora-navy">Open Orders</h1>
        <p className="text-servora-deepTeal text-xs mt-1">Live tracking for front-of-house staff and dispatch.</p>
      </div>

      {isLoading && orders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-servora-deepTeal text-sm">
          Loading active orders...
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 overflow-hidden">
          
          {/* Column 1: Confirmed (Waiting for Kitchen) */}
          <div className="flex flex-col bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-white shrink-0">
              <h3 className="text-sm font-bold text-servora-navy flex items-center gap-2">
                <ClipboardList size={16} className="text-gray-400" /> 
                Awaiting Kitchen ({confirmedOrders.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {confirmedOrders.map(order => <OrderCard key={order.id} order={order} />)}
              {confirmedOrders.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No orders waiting.</p>}
            </div>
          </div>

          {/* Column 2: Preparing */}
          <div className="flex flex-col bg-blue-50/30 rounded-2xl border border-blue-100 overflow-hidden">
            <div className="p-4 border-b border-blue-100 bg-white shrink-0">
              <h3 className="text-sm font-bold text-servora-navy flex items-center gap-2">
                <ChefHat size={16} className="text-blue-500" /> 
                Preparing ({preparingOrders.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {preparingOrders.map(order => <OrderCard key={order.id} order={order} />)}
              {preparingOrders.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No orders currently preparing.</p>}
            </div>
          </div>

          {/* Column 3: Ready */}
          <div className="flex flex-col bg-green-50/50 rounded-2xl border border-green-100 overflow-hidden">
            <div className="p-4 border-b border-green-100 bg-white shrink-0">
              <h3 className="text-sm font-bold text-servora-navy flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" /> 
                Ready to Serve ({readyOrders.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {readyOrders.map(order => <OrderCard key={order.id} order={order} />)}
              {readyOrders.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No orders ready.</p>}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}