'use client';

import { useState, useEffect } from 'react';
import { Layers, Clock, CheckCircle2, Flame, UtensilsCrossed, Check } from 'lucide-react';
import { fetchApi } from '@/lib/api'; // Import centralized dynamic API helper

interface StationItem {
  id: number;
  quantity: number;
  name: string;
  station: string;
  kitchenStatus: string;
}

interface StationTicket {
  id: number;
  orderNumber: string;
  orderType: string;
  status: string;
  createdAt: string;
  items: StationItem[];
}

const STATIONS = [
  { id: 'ALL', label: 'All Stations Overview', icon: Layers },
  { id: 'MAIN_KITCHEN', label: 'Main Kitchen', icon: UtensilsCrossed },
  { id: 'GRILL', label: 'Grill & Nyama Choma', icon: Flame },
  { id: 'BAR', label: 'Bar & Beverages', icon: CheckCircle2 },
  { id: 'PASTRY', label: 'Pastry & Bakery', icon: Layers },
];

export default function KitchenStationsPage() {
  const [activeStation, setActiveStation] = useState('MAIN_KITCHEN');
  const [tickets, setTickets] = useState<StationTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchStationQueue = async (station: string) => {
    try {
      setIsLoading(true);
      // Uses dynamic base URL and securely attaches token via fetchApi
      const result = await fetchApi(`/api/v1/kitchen/tickets?station=${station}`);
      setTickets(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStationQueue(activeStation);
    const pollInterval = setInterval(() => fetchStationQueue(activeStation), 10000);
    return () => clearInterval(pollInterval);
  }, [activeStation]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleCompleteOrder = async (orderId: number) => {
    try {
      await fetchApi(`/api/v1/kitchen/tickets/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Ready' }),
      });
      fetchStationQueue(activeStation);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const getElapsedTime = (createdAt: string) => {
    const elapsedMs = currentTime.getTime() - new Date(createdAt).getTime();
    return Math.floor(elapsedMs / 60000);
  };

  // Filter items inside tickets that strictly belong to the active station (unless ALL is selected)
  const processedTickets = tickets.map(ticket => ({
    ...ticket,
    filteredItems: activeStation === 'ALL' 
      ? ticket.items 
      : ticket.items.filter(i => i.station === activeStation)
  })).filter(t => t.filteredItems.length > 0);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      
      {/* Header & Station Selector Switcher */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-servora-navy flex items-center gap-2">
            <Layers size={28} className="text-servora-core" /> Dedicated Station Workspaces
          </h1>
          <p className="text-servora-deepTeal text-xs mt-1">
            Isolate line-cook preparation views by specific kitchen and bar stations.
          </p>
        </div>

        {/* Station Navigation Pills */}
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm overflow-x-auto max-w-full">
          {STATIONS.map(station => {
            const Icon = station.icon;
            return (
              <button
                key={station.id}
                onClick={() => {
                  setIsLoading(true);
                  setActiveStation(station.id);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeStation === station.id 
                    ? 'bg-servora-core text-white shadow-sm' 
                    : 'text-gray-600 hover:text-servora-navy hover:bg-gray-50'
                }`}
              >
                <Icon size={14} />
                {station.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Station Queue Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-6">
        {isLoading && processedTickets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-servora-deepTeal">Loading station workspace...</div>
        ) : processedTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            <UtensilsCrossed size={48} className="mb-4 opacity-20 text-servora-core" />
            <p className="text-lg font-bold text-servora-navy">Station Queue is Clear</p>
            <p className="text-sm mt-1">No pending food items assigned to <span className="font-semibold text-servora-core">{activeStation}</span>.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {processedTickets.map(ticket => {
              const elapsedMins = getElapsedTime(ticket.createdAt);
              const isDelayed = elapsedMins > 12;

              return (
                <div 
                  key={ticket.id} 
                  className={`flex flex-col bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                    isDelayed ? 'border-red-300 bg-red-50/20' : 'border-gray-200'
                  }`}
                >
                  {/* Station Ticket Header */}
                  <div className="p-3 bg-servora-navy text-white flex justify-between items-center">
                    <div>
                      <span className="font-bold text-base tracking-wider">{ticket.orderNumber}</span>
                      <span className="text-[10px] uppercase bg-white/20 px-2 py-0.5 rounded ml-2 font-mono">
                        {ticket.orderType}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-xs bg-white/10 px-2.5 py-1 rounded">
                      <Clock size={13} />
                      {elapsedMins}m elapsed
                    </div>
                  </div>

                  {/* Filtered Station Items */}
                  <div className="p-4 flex-1 overflow-y-auto bg-gray-50/50">
                    <ul className="space-y-2.5">
                      {ticket.filteredItems.map(item => (
                        <li key={item.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <span className="bg-blue-50 text-servora-core font-bold px-2 py-1 rounded text-xs shrink-0 border border-blue-100">
                              {item.quantity}x
                            </span>
                            <span className="text-sm font-bold text-servora-navy">{item.name}</span>
                          </div>
                          <span className="text-[10px] font-mono uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                            {item.station}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Station Action Footer */}
                  <div className="p-3 bg-white border-t border-gray-100 mt-auto">
                    <button 
                      onClick={() => handleCompleteOrder(ticket.id)}
                      className="w-full py-2.5 bg-green-600 text-white font-bold rounded-lg shadow-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-xs"
                    >
                      <Check size={16} /> Mark Station Items Ready
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