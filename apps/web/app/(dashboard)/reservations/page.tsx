'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Plus, Users, Clock, CheckCircle2, XCircle, Phone, MapPin, X } from 'lucide-react';

interface Reservation {
  id: number;
  customerName: string;
  customerPhone: string;
  partySize: number;
  reservationDate: string;
  status: string;
  specialRequests: string | null;
  tableLabel: string | null;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<any[]>([]); // To populate the table selection dropdown
  const [isLoading, setIsLoading] = useState(true);

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [reservationDate, setReservationDate] = useState('');
  const [tableId, setTableId] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('servora_token');
      
      // Fetch Reservations
      const resReq = await fetch('http://localhost:8000/api/v1/reservations', { headers: { Authorization: `Bearer ${token}` } });
      if (resReq.ok) {
        const result = await resReq.json();
        setReservations(result.data);
      }

      // Fetch Tables for the assignment dropdown
      const tableReq = await fetch('http://localhost:8000/api/v1/tables', { headers: { Authorization: `Bearer ${token}` } });
      if (tableReq.ok) {
        const result = await tableReq.json();
        setTables(result.data.tables);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('servora_token');
      const res = await fetch('http://localhost:8000/api/v1/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerName,
          customerPhone,
          partySize: parseInt(partySize),
          reservationDate,
          tableId: tableId ? parseInt(tableId) : null,
          specialRequests
        })
      });

      if (!res.ok) throw new Error('Failed to create reservation');

      setIsModalOpen(false);
      setCustomerName(''); setCustomerPhone(''); setPartySize('2'); setReservationDate(''); setTableId(''); setSpecialRequests('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const token = localStorage.getItem('servora_token');
      await fetch(`http://localhost:8000/api/v1/reservations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmed': return <span className="bg-blue-50 text-servora-core px-2 py-1 rounded-full text-[11px] font-bold">Confirmed</span>;
      case 'Checked-In': return <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-[11px] font-bold">Checked-In</span>;
      case 'No-Show': return <span className="bg-red-50 text-red-700 px-2 py-1 rounded-full text-[11px] font-bold">No-Show</span>;
      case 'Completed': return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-[11px] font-bold">Completed</span>;
      default: return <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-[11px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-servora-navy">Reservations</h1>
          <p className="text-servora-deepTeal text-xs mt-1">Manage guest bookings, waitlists, and table assignments.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-servora-core text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus size={14} /> New Booking
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-servora-navy flex items-center gap-2">
            <CalendarDays size={16} className="text-servora-core" /> Upcoming Reservations
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-servora-deepTeal text-sm">Loading reservations...</div>
        ) : reservations.length === 0 ? (
          <div className="bg-white p-12 text-center text-gray-400">
            <CalendarDays size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium text-servora-navy">No reservations booked</p>
            <p className="text-xs mt-1">Click "New Booking" to reserve a table for a guest.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100">
                  <th className="p-4 font-semibold">Guest</th>
                  <th className="p-4 font-semibold">Date & Time</th>
                  <th className="p-4 font-semibold">Party</th>
                  <th className="p-4 font-semibold">Table</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {reservations.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-sm">{res.customerName}</div>
                      <div className="flex items-center gap-1 text-gray-500 mt-0.5"><Phone size={10} /> {res.customerPhone}</div>
                      {res.specialRequests && <div className="text-[10px] text-servora-teal mt-1 italic max-w-[150px] truncate">"{res.specialRequests}"</div>}
                    </td>
                    <td className="p-4 font-medium text-servora-core">
                      <div className="flex items-center gap-1.5"><CalendarDays size={12}/> {new Date(res.reservationDate).toLocaleDateString()}</div>
                      <div className="flex items-center gap-1.5 mt-0.5"><Clock size={12}/> {new Date(res.reservationDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td className="p-4 font-bold text-gray-700 flex items-center gap-1.5 h-full mt-3">
                      <Users size={14} className="text-gray-400" /> {res.partySize}
                    </td>
                    <td className="p-4">
                      {res.tableLabel ? (
                        <span className="flex items-center gap-1 font-medium bg-gray-100 px-2 py-1 rounded text-[11px]"><MapPin size={10}/> {res.tableLabel}</span>
                      ) : <span className="text-gray-400 italic text-[11px]">Unassigned</span>}
                    </td>
                    <td className="p-4">{getStatusBadge(res.status)}</td>
                    <td className="p-4 text-right">
                      {res.status !== 'Checked-In' && res.status !== 'Completed' && res.status !== 'No-Show' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => updateStatus(res.id, 'Checked-In')} className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded transition-colors" title="Check In">
                            <CheckCircle2 size={16} />
                          </button>
                          <button onClick={() => updateStatus(res.id, 'No-Show')} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors" title="Mark No-Show">
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Reservation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-servora-navy">New Reservation</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleCreateReservation} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Guest Name</label>
                  <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Phone Number</label>
                  <input type="tel" required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Date & Time</label>
                  <input type="datetime-local" required value={reservationDate} onChange={e => setReservationDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Party Size</label>
                  <input type="number" min="1" required value={partySize} onChange={e => setPartySize(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-servora-navy mb-1">Assign Table (Optional)</label>
                <select value={tableId} onChange={e => setTableId(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  <option value="">Do not assign yet</option>
                  {tables.map(t => <option key={t.id} value={t.id}>{t.tableLabel} (Seats {t.capacity})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-servora-navy mb-1">Special Requests</label>
                <textarea rows={2} value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} placeholder="Allergies, high chair required, etc." className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-servora-core rounded-lg">Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}