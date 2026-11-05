'use client';

import { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle2, AlertTriangle, TrendingUp, BarChart3, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api'; // Import centralized dynamic API helper

interface PerformanceData {
  summary: {
    totalProcessed: number;
    avgPrepTimeMinutes: number;
    onTimeRatePercentage: number;
    delayedOrders: number;
  };
  recentExecutions: {
    id: number;
    orderNumber: string;
    orderType: string;
    durationMins: number;
    updatedAt: string;
  }[];
}

export default function KitchenPerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPerformance = async () => {
    try {
      setIsLoading(true);
      // Uses dynamic base URL and securely attaches token via fetchApi
      const result = await fetchApi('/api/v1/kitchen/performance');
      setData(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-servora-navy flex items-center gap-2">
            <Activity size={28} className="text-servora-core" /> Kitchen Performance Analytics
          </h1>
          <p className="text-servora-deepTeal text-xs mt-1">
            Real-time speed metrics, order throughput, and kitchen SLA tracking.
          </p>
        </div>
        <button 
          onClick={fetchPerformance}
          className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw size={14} /> Refresh Metrics
        </button>
      </div>

      {/* Content Container */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-servora-deepTeal">Loading performance analytics...</div>
        ) : !data ? (
          <div className="text-center text-gray-400 py-12">No performance data available.</div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Preparation Time</p>
                  <h3 className="text-2xl font-bold text-servora-navy mt-1">{data.summary.avgPrepTimeMinutes} mins</h3>
                  <span className="text-[11px] text-green-600 font-medium flex items-center gap-1 mt-1">
                    <TrendingUp size={12} /> Within 15m target SLA
                  </span>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-servora-core">
                  <Clock size={24} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">On-Time Fulfillment</p>
                  <h3 className="text-2xl font-bold text-servora-navy mt-1">{data.summary.onTimeRatePercentage}%</h3>
                  <span className="text-[11px] text-servora-teal font-medium mt-1 block">
                    Target: &gt; 90% On-Time
                  </span>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                  <CheckCircle2 size={24} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Processed</p>
                  <h3 className="text-2xl font-bold text-servora-navy mt-1">{data.summary.totalProcessed} orders</h3>
                  <span className="text-[11px] text-gray-400 font-medium mt-1 block">
                    Completed tickets
                  </span>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                  <BarChart3 size={24} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Delayed Orders (&gt;15m)</p>
                  <h3 className="text-2xl font-bold text-red-600 mt-1">{data.summary.delayedOrders}</h3>
                  <span className="text-[11px] text-red-500 font-medium mt-1 block">
                    Requires line review
                  </span>
                </div>
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                  <AlertTriangle size={24} />
                </div>
              </div>

            </div>

            {/* Recent Ticket Processing Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 font-bold text-servora-navy text-sm">
                Recent Order Execution Speeds
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                    <tr>
                      <th className="p-3.5">Order Number</th>
                      <th className="p-3.5">Channel</th>
                      <th className="p-3.5">Prep Duration</th>
                      <th className="p-3.5">Status Performance</th>
                      <th className="p-3.5">Completed Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-medium text-servora-navy">
                    {data.recentExecutions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400">No completed orders recorded yet.</td>
                      </tr>
                    ) : (
                      data.recentExecutions.map(exec => (
                        <tr key={exec.id} className="hover:bg-gray-50/50">
                          <td className="p-3.5 font-bold">{exec.orderNumber}</td>
                          <td className="p-3.5">
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                              {exec.orderType}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-servora-core">
                            {exec.durationMins} minutes
                          </td>
                          <td className="p-3.5">
                            {exec.durationMins <= 15 ? (
                              <span className="text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Fast / On-Time</span>
                            ) : (
                              <span className="text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Delayed SLA</span>
                            )}
                          </td>
                          <td className="p-3.5 text-gray-500 font-mono">
                            {new Date(exec.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}