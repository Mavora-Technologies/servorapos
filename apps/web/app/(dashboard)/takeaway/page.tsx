'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Clock, CheckCircle2, Check, AlertCircle, Search } from 'lucide-react';

interface OrderRecord {
  id: number;
  orderNumber: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  total: string;
  createdAt: string;
}

export default function TakeawayPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Active' | 'Completed'>('Active');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTakeawayOrders = async () => {
    try {
      const token = localStorage.getItem('servora_token');
      const res = await fetch('http://localhost:8000/api/v1/orders/takeaway', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch takeaway orders');
      const result = await res.json();
      setOrders(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for updates every 10 seconds to keep kitchen status in sync
  useEffect(() => {
    fetchTakeawayOrders();
    const interval = setInterval(fetchTakeawayOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleHandOffOrder = async (orderId: number) => {
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
      
      // Update local state instantly
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Completed' } : o));
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Filter logic
  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === 'Active' 
      ? order.status !== 'Completed' && order.status !== 'Cancelled'
      : order.status === 'Completed' || order.status === 'Cancelled';
      
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      
      {/* Header & Tabs */}
      <div className="shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-servora-navy flex items-center gap-2">
              <ShoppingBag className="text-servora-core" size={24} /> Takeaway & Pickups
            </h1>
            <p className="text-servora-deepTeal text-xs mt-1">Manage grab-and-go orders, payment collection, and customer hand-offs.</p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Order No..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-servora-core/20 focus:border-servora-core transition-all"
            />
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-200 pb-px">
          {(['Active', 'Completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-servora-core text-servora-core' 
                  : 'border-transparent text-gray-500 hover:text-servora-navy hover:border-gray-300'
              }`}
            >
              {tab === 'Active' ? 'Active Pickups' : 'Past Orders'}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading && orders.length === 0 ? (
          <div className="h-full flex items-center justify-center text-servora-deepTeal text-sm">Loading takeaways...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 p-8">
            <ShoppingBag size={48} className="mb-4 opacity-20" />
            <p className="text-base font-medium text-servora-navy">No {activeTab.toLowerCase()} takeaway orders found</p>
            <p className="text-xs mt-1">Orders placed as 'Takeaway' on the POS will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-6">
            {filteredOrders.map(order => (
              <div 
                key={order.id} 
                className={`bg-white rounded-xl border transition-all overflow-hidden flex flex-col ${
                  order.status === 'Ready' && activeTab === 'Active' 
                    ? 'border-green-200 shadow-md ring-1 ring-green-100' 
                    : 'border-gray-200 shadow-sm'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                  <div>
                    <h3 className="font-bold text-lg text-servora-navy tracking-tight">{order.orderNumber}</h3>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock size={12} /> {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-servora-core">KES {parseFloat(order.total).toLocaleString()}</div>
                    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Card Body - Kitchen Status */}
                <div className="p-4 flex-1">
                  <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Kitchen Status</div>
                  
                  <div className="flex items-center gap-3">
                    {order.status === 'Confirmed' && (
                      <span className="flex items-center gap-1.5 text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                        <Clock size={16} /> Awaiting Prep
                      </span>
                    )}
                    {order.status === 'Preparing' && (
                      <span className="flex items-center gap-1.5 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        <AlertCircle size={16} className="animate-pulse" /> Preparing
                      </span>
                    )}
                    {order.status === 'Ready' && (
                      <span className="flex items-center gap-1.5 text-sm font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                        <CheckCircle2 size={16} /> Ready for Pickup
                      </span>
                    )}
                    {order.status === 'Completed' && (
                      <span className="flex items-center gap-1.5 text-sm font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                        <Check size={16} /> Handed Off
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer - Actions */}
                {activeTab === 'Active' && (
                  <div className="p-3 bg-gray-50 border-t border-gray-100 mt-auto">
                    {order.paymentStatus !== 'Paid' ? (
                      <button className="w-full py-2.5 bg-red-50 text-red-700 border border-red-200 font-bold rounded-lg hover:bg-red-100 transition-colors text-sm">
                        Collect Payment First
                      </button>
                    ) : order.status === 'Ready' ? (
                      <button 
                        onClick={() => handleHandOffOrder(order.id)}
                        className="w-full py-2.5 bg-servora-core text-white font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <ShoppingBag size={16} /> Hand Off to Customer
                      </button>
                    ) : (
                      <button disabled className="w-full py-2.5 bg-gray-100 text-gray-400 font-bold rounded-lg cursor-not-allowed text-sm">
                        Waiting on Kitchen...
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}