'use client';

import { useState, useEffect } from 'react';
import { ChefHat, Clock, CheckCircle2, PlayCircle, AlertCircle } from 'lucide-react';

interface KitchenTicket {
  id: number;
  orderNumber: string;
  orderType: string;
  status: 'Confirmed' | 'Preparing';
  createdAt: string;
  items: { id: number; quantity: number; name: string }[];
}

export default function KitchenDisplayPage() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('servora_token');
      const res = await fetch('http://localhost:8000/api/v1/kitchen/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const result = await res.json();
      setTickets(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and polling every 10 seconds
  useEffect(() => {
    fetchTickets();
    const pollInterval = setInterval(fetchTickets, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  // Update current time every minute for elapsed time calculation
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('servora_token');
      const res = await fetch(`http://localhost:8000/api/v1/kitchen/tickets/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update status');
      
      // Remove ticket from screen if marked Ready, otherwise update state locally
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
    const minutes = Math.floor(elapsedMs / 60000);
    return minutes;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-servora-navy flex items-center gap-2">
            <ChefHat size={28} className="text-servora-core" /> Kitchen Display System
          </h1>
          <p className="text-servora-deepTeal text-xs mt-1">Live order queue. Auto-refreshes every 10 seconds.</p>
        </div>
        <div className="text-right text-sm font-semibold text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-6">
        {isLoading && tickets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-servora-deepTeal">Loading kitchen tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            <CheckCircle2 size={48} className="mb-4 opacity-20 text-green-500" />
            <p className="text-lg font-bold text-servora-navy">All Caught Up!</p>
            <p className="text-sm mt-1">No active orders waiting for preparation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tickets.map(ticket => {
              const elapsedMins = getElapsedTime(ticket.createdAt);
              const isDelayed = elapsedMins > 15; // Flag orders taking longer than 15 minutes

              return (
                <div 
                  key={ticket.id} 
                  className={`flex flex-col rounded-xl border shadow-sm overflow-hidden transition-all ${
                    ticket.status === 'Preparing' 
                      ? 'bg-blue-50/30 border-blue-200' 
                      : isDelayed 
                        ? 'bg-red-50/30 border-red-200' 
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
                    <div className="font-bold text-lg tracking-wider">{ticket.orderNumber}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded">
                        {ticket.orderType}
                      </span>
                      <div className="flex items-center gap-1 font-mono text-sm bg-white/10 px-2 py-1 rounded">
                        {isDelayed && <AlertCircle size={14} />}
                        <Clock size={14} />
                        {elapsedMins}m
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="flex-1 p-4 overflow-y-auto">
                    <ul className="space-y-3">
                      {ticket.items.map(item => (
                        <li key={item.id} className="flex items-start gap-3 text-servora-navy">
                          <span className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded text-sm shrink-0 border border-gray-200">
                            {item.quantity}x
                          </span>
                          <span className="text-sm font-semibold leading-tight pt-0.5">{item.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 bg-gray-50 border-t border-gray-100 mt-auto">
                    {ticket.status === 'Confirmed' ? (
                      <button 
                        onClick={() => handleUpdateStatus(ticket.id, 'Preparing')}
                        className="w-full py-2.5 bg-white border-2 border-servora-core text-servora-core font-bold rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <PlayCircle size={18} /> Start Preparing
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpdateStatus(ticket.id, 'Ready')}
                        className="w-full py-2.5 bg-green-600 text-white font-bold rounded-lg shadow-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={18} /> Mark as Ready
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