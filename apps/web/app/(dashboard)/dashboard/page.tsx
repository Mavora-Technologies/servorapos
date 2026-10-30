'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingBag, Clock, AlertCircle, UtensilsCrossed } from 'lucide-react';

// Data types expected from the backend database
interface DashboardMetrics {
  grossSales: number;
  netSales: number;
  ordersCompleted: number;
  pendingOrders: number;
  averageOrderValue: number;
  salesTrend: { time: string; sales: number }[];
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('servora_token');
        // Pointing to the actual API. Will return 404/empty until we build the backend controller in the next step.
        const res = await fetch('http://localhost:8000/api/v1/analytics/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Analytics API pending implementation');
        
        const result = await res.json();
        setMetrics(result.data);
      } catch (err: any) {
        setError(err.message);
        // Fallback empty state to prevent fake data rendering per blueprint rules
        setMetrics({
          grossSales: 0, netSales: 0, ordersCompleted: 0, pendingOrders: 0, averageOrderValue: 0,
          salesTrend: []
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-servora-deepTeal">Loading analytics from database...</div>;
  }

  return (
    <>
      {/* Date Filters & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-servora-navy">Today's Overview</h1>
          <p className="text-servora-deepTeal text-xs mt-1">Metrics generated from actual database records.</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-white border border-gray-200 text-servora-navy text-xs rounded-md px-3 py-2 outline-none focus:border-servora-core">
            <option>Today</option>
            <option>Yesterday</option>
            <option>Last 7 Days</option>
          </select>
          <button className="bg-servora-core text-white text-xs px-4 py-2 rounded-md shadow-sm hover:bg-blue-700 transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start">
            <span className="text-servora-deepTeal text-xs font-medium uppercase tracking-wider">Gross Sales</span>
            <div className="p-2 bg-blue-50 text-servora-core rounded-lg"><TrendingUp size={16} /></div>
          </div>
          <span className="text-2xl font-bold text-servora-navy mt-2">KES {metrics?.grossSales.toLocaleString()}</span>
          <span className="text-[11px] text-green-600 mt-2 bg-green-50 w-fit px-2 py-0.5 rounded-full">+0.0% from yesterday</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start">
            <span className="text-servora-deepTeal text-xs font-medium uppercase tracking-wider">Orders Completed</span>
            <div className="p-2 bg-teal-50 text-servora-teal rounded-lg"><ShoppingBag size={16} /></div>
          </div>
          <span className="text-2xl font-bold text-servora-navy mt-2">{metrics?.ordersCompleted}</span>
          <span className="text-[11px] text-servora-deepTeal mt-2">Avg. KES {metrics?.averageOrderValue.toLocaleString()}/order</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start">
            <span className="text-servora-deepTeal text-xs font-medium uppercase tracking-wider">Pending Orders</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={16} /></div>
          </div>
          <span className="text-2xl font-bold text-servora-navy mt-2">{metrics?.pendingOrders}</span>
          <span className="text-[11px] text-amber-600 mt-2 bg-amber-50 w-fit px-2 py-0.5 rounded-full">Awaiting kitchen fulfillment</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start">
            <span className="text-servora-deepTeal text-xs font-medium uppercase tracking-wider">Low Stock Alerts</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertCircle size={16} /></div>
          </div>
          <span className="text-2xl font-bold text-servora-navy mt-2">0</span>
          <span className="text-[11px] text-servora-deepTeal mt-2">Ingredients below threshold</span>
        </div>

      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Area */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-servora-navy mb-6">Hourly Sales Trend</h3>
          <div className="h-72 w-full">
            {metrics?.salesTrend.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-servora-deepTeal/50 border-2 border-dashed border-gray-100 rounded-lg">
                <TrendingUp size={32} className="mb-2 opacity-50" />
                <p>Awaiting transaction data</p>
                {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics?.salesTrend}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0554F4" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0554F4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#041F56', fontSize: '12px', fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#0554F4" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Secondary Info Area */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-servora-navy mb-4">Top Selling Items</h3>
          <div className="flex flex-col items-center justify-center h-64 text-servora-deepTeal/50 border-2 border-dashed border-gray-100 rounded-lg">
            <UtensilsCrossed size={32} className="mb-2 opacity-50" />
            <p>No fulfilled orders yet.</p>
          </div>
        </div>

      </div>
    </>
  );
}