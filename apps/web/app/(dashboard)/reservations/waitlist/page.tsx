'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Users, Clock, BellRing, CheckCircle2, XCircle, Phone, X, AlertTriangle } from 'lucide-react';

interface WaitlistEntry {
  id: number;
  customerName: string;
  customerPhone: string;
  partySize: number;
  quotedWaitTime: number;
  status: string;
  notes: string | null;
  createdAt: string;
}

export default function WaitlistPage() {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [quotedWaitTime, setQuotedWaitTime] = useState('15');
  const [notes, setNotes] = useState('');

  const fetchWaitlist = async () => {
    try {
      const token = localStorage.getItem('servora_token');
      const res = await fetch('http://localhost:8000/api/v1/waitlist', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch waitlist');
      const result = await res.json();
      setWaitlist(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlist();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update time every minute
    return () => clearInterval(timer);
  }, []);

  const handleAddWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('servora_token');
      const res = await fetch('http://localhost:8000/api/v1/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerName,
          customerPhone,
          partySize: parseInt(partySize),
          quotedWaitTime: parseInt(quotedWaitTime),
          notes
        })
      });

      if (!res.ok) throw new Error('Failed to add to waitlist');
      
      setIsModalOpen(false);
      setCustomerName(''); setCustomerPhone(''); setPartySize('2'); setQuotedWaitTime('15'); setNotes('');
      fetchWaitlist();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const token = localStorage.getItem('servora_token');
      await fetch(`http://localhost:8000/api/v1/waitlist/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchWaitlist();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getWaitData = (createdAt: string, quoted: number) => {
    const elapsedMins = Math.floor((currentTime.getTime() - new Date(createdAt).getTime()) / 60000);
    const isOverdue = elapsedMins > quoted;
    return { elapsedMins, isOverdue };
  };

  const activeWaitlist = waitlist.filter(w => w.status === 'Waiting' || w.status === 'Notified');
  const pastWaitlist = waitlist.filter(w => w.status === 'Seated' || w.status === 'Cancelled');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-servora-navy">Waitlist</h1>
          <p className="text-servora-deepTeal text-xs mt-1">Manage walk-ins and table wait times during peak hours.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-servora-core text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus size={14} /> Add to Waitlist
        </button>
      </div>

      {/* Active Waitlist */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
          <h3 className="text-sm font-semibold text-servora-navy flex items-center gap-2">
            <ClipboardList size={16} className="text-servora-core" /> Active Waitlist ({activeWaitlist.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-servora-deepTeal text-sm">Loading waitlist...</div>
        ) : activeWaitlist.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <ClipboardList size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium text-servora-navy">Waitlist is empty</p>
            <p className="text-xs mt-1">No guests currently waiting for a table.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100">
                  <th className="p-4 font-semibold">Guest</th>
                  <th className="p-4 font-semibold">Party</th>
                  <th className="p-4 font-semibold">Wait Time</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {activeWaitlist.map((entry) => {
                  const { elapsedMins, isOverdue } = getWaitData(entry.createdAt, entry.quotedWaitTime);
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-sm">{entry.customerName}</div>
                        <div className="flex items-center gap-1 text-gray-500 mt-0.5"><Phone size={10} /> {entry.customerPhone}</div>
                        {entry.notes && <div className="text-[10px] text-servora-teal mt-1 italic">"{entry.notes}"</div>}
                      </td>
                      <td className="p-4 font-bold text-gray-700 flex items-center gap-1.5 h-full mt-2">
                        <Users size={14} className="text-gray-400" /> {entry.partySize}
                      </td>
                      <td className="p-4">
                        <div className={`font-bold text-sm flex items-center gap-1.5 ${isOverdue ? 'text-red-600' : 'text-servora-core'}`}>
                          {isOverdue && <AlertTriangle size={14} />} {elapsedMins} min
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Quoted: {entry.quotedWaitTime} min</div>
                      </td>
                      <td className="p-4">
                        {entry.status === 'Notified' ? (
                          <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[11px] font-bold">Notified</span>
                        ) : (
                          <span className="bg-blue-50 text-servora-core px-2.5 py-1 rounded-full text-[11px] font-bold">Waiting</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => updateStatus(entry.id, 'Notified')} className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
                            <BellRing size={14} /> Notify
                          </button>
                          <button onClick={() => updateStatus(entry.id, 'Seated')} className="px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors">
                            <CheckCircle2 size={14} /> Seat
                          </button>
                          <button onClick={() => updateStatus(entry.id, 'Cancelled')} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <XCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add to Waitlist Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-servora-navy">Add to Waitlist</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddWaitlist} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-servora-navy mb-1">Guest Name</label>
                <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Phone Number</label>
                  <input type="tel" required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Party Size</label>
                  <input type="number" min="1" required value={partySize} onChange={e => setPartySize(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-servora-navy mb-1">Quoted Wait Time (Minutes)</label>
                <select value={quotedWaitTime} onChange={e => setQuotedWaitTime(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">1 Hour</option>
                  <option value="90">1 Hour 30 Mins</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-servora-navy mb-1">Notes (Optional)</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., Prefers patio" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-servora-core rounded-lg">Add to List</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}