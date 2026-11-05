'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Search, 
  Filter, 
  Utensils, 
  ArrowUpRight, 
  X, 
  Printer, 
  Check, 
  ChefHat, 
  ShoppingBag, 
  Coffee, 
  ChevronRight,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface OrderRecord {
  id: number;
  orderNumber: string;
  orderType: 'Dine-In' | 'Takeaway' | 'Delivery' | 'Bar-Tab';
  status: string;
  paymentStatus: string;
  tableName?: string;
  customerName?: string;
  customerPhone?: string;
  buyerKraPin?: string;
  subtotal: string;
  tax: string;
  total: string;
  createdAt: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Inspect Modal State
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const result = await fetchApi('/api/v1/orders');
      if (result?.data) {
        setOrders(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders ledger:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: number, nextStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await fetchApi(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      setActiveOrder(null);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.tableName && o.tableName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const summaryMetrics = useMemo(() => {
    const totalCount = orders.length;
    const activeCount = orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled').length;
    const grossRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    return { totalCount, activeCount, grossRevenue };
  }, [orders]);

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
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-400">Order-to-Cash & Sales</span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-servora-navy">Order Management Ledger</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Enterprise Order Management</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Track active kitchen fulfillment pipelines, payment settlements, and KRA eTIMS fiscal records.
          </p>
        </div>

        <button 
          onClick={fetchOrders}
          className="bg-white border border-gray-200 text-servora-navy text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors shadow-xs"
        >
          Refresh Ledger
        </button>
      </div>

      {/* Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Total Orders Logged</span>
            <h3 className="text-lg font-bold text-servora-navy mt-1">{summaryMetrics.totalCount} Tickets</h3>
            <span className="text-[11px] text-servora-deepTeal font-medium">All recorded transactions</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Active Kitchen Queue</span>
            <h3 className="text-lg font-bold text-amber-700 mt-1">{summaryMetrics.activeCount} Pending</h3>
            <span className="text-[11px] text-amber-600 font-medium">In preparation or queue</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ChefHat size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Gross Revenue Turnover</span>
            <h3 className="text-lg font-bold text-emerald-700 mt-1">
              KES {summaryMetrics.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium">Cumulative sales volume</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* Query & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search order #, customer name, or table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl overflow-x-auto">
          {['ALL', 'Sent-To-Kitchen', 'Preparing', 'Ready', 'Completed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === status ? 'bg-white shadow-xs text-servora-navy font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {status === 'ALL' ? 'All Orders' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal animate-pulse">
            Connecting to enterprise order-to-cash ledger...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No order records match your search filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3.5 px-4">Order # & Location</th>
                  <th className="py-3.5 px-4">Channel / Type</th>
                  <th className="py-3.5 px-4">Fulfillment Status</th>
                  <th className="py-3.5 px-4">Payment Settlement</th>
                  <th className="py-3.5 px-4 text-right">Total (KES)</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredOrders.map((order) => {
                  const totalNum = parseFloat(order.total) || 0;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold block text-servora-navy">{order.orderNumber}</span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {order.tableName || 'Counter POS'} &bull; {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-gray-700">
                        {order.orderType}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${getStatusBadge(order.status)}`}>
                          <Clock size={12} /> {order.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] font-bold">
                          <CheckCircle size={12} /> {order.paymentStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-servora-navy">
                        KES {totalNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setActiveOrder(order)}
                          className="px-3 py-1.5 text-xs font-semibold text-servora-core hover:bg-servora-pale rounded-xl transition-colors inline-flex items-center gap-1"
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

      {/* INSPECT ORDER MODAL */}
      {activeOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">{activeOrder.orderNumber}</h3>
                <p className="text-[11px] text-servora-deepTeal mt-0.5">
                  Channel: <strong>{activeOrder.orderType}</strong> &bull; Location: <strong>{activeOrder.tableName || 'Counter'}</strong>
                </p>
              </div>
              <button onClick={() => setActiveOrder(null)} className="text-gray-400 hover:text-servora-navy">
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
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Payment Status</span>
                <span className="font-bold text-emerald-700 text-sm">
                  {activeOrder.paymentStatus}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">KRA VAT (16%)</span>
                <span className="font-mono font-semibold text-gray-800">
                  KES {parseFloat(activeOrder.tax || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Customer / KRA PIN</span>
                <span className="font-semibold text-gray-800 truncate block">
                  {activeOrder.buyerKraPin || activeOrder.customerName || 'Walk-in'}
                </span>
              </div>
            </div>

            {/* Status Advancement Workflow */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-servora-navy block">Advance Fulfillment Status:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Sent-To-Kitchen', 'Preparing', 'Ready', 'Completed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(activeOrder.id, st)}
                    disabled={isUpdatingStatus || activeOrder.status === st}
                    className={`py-2 px-2.5 rounded-xl font-bold border transition-colors ${
                      activeOrder.status === st
                        ? 'bg-servora-navy text-white border-servora-navy'
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
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
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