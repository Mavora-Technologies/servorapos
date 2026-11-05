'use client';

import { useState, useEffect } from 'react';
import { ChefHat, Clock, CheckCircle2, PlayCircle, AlertCircle, Flame, Layers } from 'lucide-react';
import { fetchApi } from '@/lib/api'; // Import centralized dynamic API helper

interface KitchenItem {
  id: number;
  quantity: number;
  name: string;
  station: string;
}

interface KitchenTicket {
  id: number;
  orderNumber: string;
  orderType: string;
  status: 'Confirmed' | 'Preparing';
  createdAt: string;
  items: KitchenItem[];
}

const STATIONS = [
  { id: 'ALL', label: 'All Expediter Queue' },
  { id: 'MAIN_KITCHEN', label: 'Main Kitchen' },
  { id: 'GRILL', label: 'Grill / Nyama Choma' },
  { id: 'BAR', label: 'Bar & Beverages' },
];

export default function KitchenDisplayPage() {
  const [activeStation, setActiveStation] = useState('ALL');
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchTickets = async (station: string) => {
    try {
      setIsLoading(true);
      const query = station !== 'ALL' ? `?station=${station}` : '';
      // Uses dynamic base URL and securely attaches token via fetchApi
      const result = await fetchApi(`/api/v1/kitchen/tickets${query}`);
      setTickets(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(activeStation);
    const pollInterval = setInterval(() => fetchTickets(activeStation), 10000);
    return () => clearInterval(pollInterval);
  }, [activeStation]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await fetchApi(`/api/v1/kitchen/tickets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (newStatus === 'Ready') {
        setTickets(prev => prev.filter(t => t.id !== id));
      } else {
        setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
      }
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
      
      {/* Header & Station Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-servora-navy flex items-center gap-2">
            <ChefHat size={28} className="text-servora-core" /> Kitchen Display & Station Monitor
          </h1>
          <p className="text-servora-deepTeal text-xs mt-1">Live order routing. Auto-refreshes every 10 seconds.</p>
        </div>

        {/* Station Tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm overflow-x-auto max-w-full">
          {STATIONS.map(station => (
            <button
              key={station.id}
              onClick={() => {
                setIsLoading(true);
                setActiveStation(station.id);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeStation === station.id 
                  ? 'bg-servora-navy text-white shadow-sm' 
                  : 'text-gray-600 hover:text-servora-navy hover:bg-gray-50'
              }`}
            >
              {station.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-6">
        {isLoading && tickets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-servora-deepTeal">Loading live kitchen queue...</div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            <CheckCircle2 size={48} className="mb-4 opacity-20 text-green-500" />
            <p className="text-lg font-bold text-servora-navy">Station Clear!</p>
            <p className="text-sm mt-1">No active tickets waiting in this queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tickets.map(ticket => {
              const elapsedMins = getElapsedTime(ticket.createdAt);
              const isDelayed = elapsedMins > 12; // 12-minute warning threshold

              return (
                <div 
                  key={ticket.id} 
                  className={`flex flex-col rounded-xl border shadow-sm overflow-hidden transition-all ${
                    ticket.status === 'Preparing' 
                      ? 'bg-blue-50/30 border-blue-200' 
                      : isDelayed 
                        ? 'bg-red-50/30 border-red-200 animate-pulse' 
                        : 'bg-white border-gray-200'
                  }`}
                >
                  {/* Ticket Header */}
                  <div className={`p-3 border-b flex justify-between items-center text-white ${
                    ticket.status === 'Preparing' 
                      ? 'bg-servora-core' 
                      : isDelayed 
                        ? 'bg-red-600' 
                        : 'bg-servora-navy'
                  }`}>
                    <div className="font-bold text-lg tracking-wider flex items-center gap-2">
                      {ticket.orderNumber}
                      {isDelayed && <Flame size={16} className="text-yellow-300 animate-bounce" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded">
                        {ticket.orderType}
                      </span>
                      <div className="flex items-center gap-1 font-mono text-sm bg-white/10 px-2 py-1 rounded">
                        <Clock size={14} />
                        {elapsedMins}m
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="flex-1 p-4 overflow-y-auto">
                    <ul className="space-y-3">
                      {ticket.items.map(item => (
                        <li key={item.id} className="flex items-start justify-between text-servora-navy border-b border-gray-50 pb-2">
                          <div className="flex items-start gap-3">
                            <span className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded text-sm shrink-0 border border-gray-200">
                              {item.quantity}x
                            </span>
                            <span className="text-sm font-semibold leading-tight pt-0.5">{item.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-gray-400 uppercase bg-gray-50 px-1.5 py-0.5 rounded">
                            {item.station}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 bg-gray-50 border-t border-gray-100 mt-auto">
                    {ticket.status === 'Confirmed' ? (
                      <button 
                        onClick={() => handleUpdateStatus(ticket.id, 'Preparing')}
                        className="w-full py-2.5 bg-white border-2 border-servora-core text-servora-core font-bold rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-xs"
                      >
                        <PlayCircle size={16} /> Start Preparing
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpdateStatus(ticket.id, 'Ready')}
                        className="w-full py-2.5 bg-green-600 text-white font-bold rounded-lg shadow-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-xs"
                      >
                        <CheckCircle2 size={16} /> Mark as Ready
                      </button>
                    )}
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