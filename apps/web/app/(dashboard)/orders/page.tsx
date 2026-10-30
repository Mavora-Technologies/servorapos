'use client';

import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, ChevronRight } from 'lucide-react';

interface OrderRecord {
  id: number;
  orderNumber: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  total: string;
  createdAt: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('servora_token');
        const res = await fetch('http://localhost:8000/api/v1/orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch orders');
        const result = await res.json();
        setOrders(result.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-servora-navy">Order Management</h1>
        <p className="text-servora-deepTeal text-xs mt-1">Track active fulfillment lifecycles, statuses, and channel logs.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-servora-navy flex items-center gap-2">
            <FileText size={16} className="text-servora-core" /> Database Order Log ({orders.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-servora-deepTeal text-xs">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FileText size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium text-servora-navy">No orders recorded yet</p>
            <p className="text-xs mt-1">Orders processed through the POS terminal will appear here.</p>
          </div>
        ) : (
          <>
            {/* MOBILE & TABLET CARD VIEW (Visible on small screens) */}
            <div className="block lg:hidden divide-y divide-gray-100">
              {orders.map((order) => (
                <div key={order.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-servora-core text-sm">{order.orderNumber}</span>
                    <span className="font-bold text-servora-navy text-sm">KES {parseFloat(order.total).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-servora-navy">{order.orderType}</span>
                    <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-servora-core px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                      <Clock size={11} /> {order.status}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                      <CheckCircle size={11} /> {order.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE VIEW (Hidden on small screens, visible on lg+) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100">
                    <th className="p-4 font-semibold">Order Number</th>
                    <th className="p-4 font-semibold">Type</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Payment</th>
                    <th className="p-4 font-semibold">Total</th>
                    <th className="p-4 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-servora-navy">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-bold text-servora-core">{order.orderNumber}</td>
                      <td className="p-4 font-medium">{order.orderType}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-servora-core px-2.5 py-1 rounded-full text-[11px] font-medium">
                          <Clock size={12} /> {order.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-[11px] font-medium">
                          <CheckCircle size={12} /> {order.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4 font-bold">KES {parseFloat(order.total).toLocaleString()}</td>
                      <td className="p-4 text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}