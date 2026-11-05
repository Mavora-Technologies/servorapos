'use client';

import { useState, useEffect } from 'react';
import { History, Search, CheckCircle2, XCircle, Clock, Calendar, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api'; // Import centralized dynamic API helper

interface HistoryTicket {
  id: number;
  orderNumber: string;
  orderType: string;
  status: string;
  createdAt: string;
  completedAt: string;
  items: { id: number; quantity: number; name: string }[];
}

export default function KitchenHistoryPage() {
  const [history, setHistory] = useState<HistoryTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      // Uses dynamic base URL and securely attaches token via fetchApi
      const result = await fetchApi('/api/v1/kitchen/history');
      setHistory(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = history.filter(ticket => 
    ticket.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.orderType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-servora-navy flex items-center gap-2">
            <History size={28} className="text-servora-core" /> Kitchen Execution History
          </h1>
          <p className="text-servora-deepTeal text-xs mt-1">
            Audit log of completed, ready, and cancelled kitchen orders.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-servora-core/20"
            />
          </div>
          <button 
            onClick={fetchHistory}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
            title="Refresh History"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* History Table Container */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-servora-deepTeal">Loading kitchen history...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
            <History size={48} className="mb-3 opacity-20 text-servora-core" />
            <p className="text-base font-bold text-servora-navy">No Kitchen History Found</p>
            <p className="text-xs mt-1">Completed or cancelled tickets will appear here once processed.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="p-4">Order Number</th>
                  <th className="p-4">Channel</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Ordered Items Summary</th>
                  <th className="p-4">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredHistory.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-bold text-servora-navy">{ticket.orderNumber}</td>
                    <td className="p-4">
                      <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
                        {ticket.orderType}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        ticket.status === 'Completed' || ticket.status === 'Ready' || ticket.status === 'Served'
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {ticket.status === 'Completed' || ticket.status === 'Ready' || ticket.status === 'Served' ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        {ticket.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 text-xs">
                      {ticket.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </td>
                    <td className="p-4 text-xs text-gray-500 font-mono">
                      {new Date(ticket.completedAt || ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}