'use client';

import { useState, useEffect } from 'react';
import { Map, Plus, Users, UtensilsCrossed, CheckCircle, Clock, Sparkles, X } from 'lucide-react';

interface DiningArea { id: number; name: string; }
interface RestaurantTable { id: number; areaId: number; tableLabel: string; capacity: number; status: string; }

export default function TablesPage() {
  const [areas, setAreas] = useState<DiningArea[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [activeTable, setActiveTable] = useState<RestaurantTable | null>(null);

  // Form states
  const [areaName, setAreaName] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [tableLabel, setTableLabel] = useState('');
  const [tableCapacity, setTableCapacity] = useState('');

  const fetchFloorPlan = async () => {
    try {
      const token = localStorage.getItem('servora_token');
      const res = await fetch('http://localhost:8000/api/v1/tables', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch floor plan');
      const result = await res.json();
      setAreas(result.data.areas);
      setTables(result.data.tables);
      if (result.data.areas.length > 0 && !selectedAreaId) {
        setSelectedAreaId(result.data.areas[0].id.toString());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchFloorPlan(); }, []);

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('servora_token');
      await fetch('http://localhost:8000/api/v1/tables/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: areaName })
      });
      setAreaName(''); setIsAreaModalOpen(false); fetchFloorPlan();
    } catch (err: any) { alert(err.message); }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('servora_token');
      await fetch('http://localhost:8000/api/v1/tables/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ areaId: parseInt(selectedAreaId), tableLabel, capacity: parseInt(tableCapacity) })
      });
      setTableLabel(''); setTableCapacity(''); setIsTableModalOpen(false); fetchFloorPlan();
    } catch (err: any) { alert(err.message); }
  };

  const updateTableStatus = async (tableId: number, status: string) => {
    try {
      const token = localStorage.getItem('servora_token');
      await fetch(`http://localhost:8000/api/v1/tables/${tableId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      setActiveTable(null); fetchFloorPlan();
    } catch (err: any) { alert(err.message); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-700 border-green-200';
      case 'Occupied': return 'bg-blue-100 text-servora-core border-blue-200';
      case 'Reserved': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Cleaning': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-servora-navy">Floor Plan & Tables</h1>
          <p className="text-servora-deepTeal text-xs mt-1">Manage dining areas, table capacities, and live availability.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsAreaModalOpen(true)} className="bg-white border border-gray-200 text-servora-navy text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">

<Map size={14} />
Add Area
          </button>
          <button onClick={() => setIsTableModalOpen(true)} disabled={areas.length === 0} className="bg-servora-core text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
            <Plus size={14} /> Add Table
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-servora-deepTeal text-sm">Loading floor plan...</div>
      ) : areas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          <Map size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm font-medium text-servora-navy">No dining areas configured</p>
          <p className="text-xs mt-1">Create an area (e.g., Main Hall, Patio) to begin mapping tables.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {areas.map(area => {
            const areaTables = tables.filter(t => t.areaId === area.id);
            return (
              <div key={area.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-servora-navy">{area.name}</h3>
                  <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">{areaTables.length} Tables</span>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {areaTables.length === 0 ? (
                    <p className="col-span-full text-xs text-gray-400 py-4">No tables added to this area yet.</p>
                  ) : (
                    areaTables.map(table => (
                      <button 
                        key={table.id}
                        onClick={() => setActiveTable(table)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all hover:scale-105 ${getStatusColor(table.status)}`}
                      >
                        <UtensilsCrossed size={24} className="mb-2 opacity-80" />
                        <span className="font-bold text-sm">{table.tableLabel}</span>
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold opacity-75">
                          <Users size={10} /> {table.capacity} Seats
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Area Modal */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-servora-navy">Add Dining Area</h3>
            <form onSubmit={handleCreateArea} className="space-y-4">
              <input type="text" required value={areaName} onChange={e => setAreaName(e.target.value)} placeholder="e.g. Balcony, VIP Room" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsAreaModalOpen(false)} className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-servora-core rounded-lg">Save Area</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {isTableModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-servora-navy">Add Table</h3>
            <form onSubmit={handleCreateTable} className="space-y-3">
              <select value={selectedAreaId} onChange={e => setSelectedAreaId(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input type="text" required value={tableLabel} onChange={e => setTableLabel(e.target.value)} placeholder="Table Label (e.g. T1, Window 4)" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              <input type="number" required value={tableCapacity} onChange={e => setTableCapacity(e.target.value)} placeholder="Seating Capacity (e.g. 4)" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsTableModalOpen(false)} className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-servora-core rounded-lg">Save Table</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Action Sheet */}
      {activeTable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-servora-navy">{activeTable.tableLabel}</h3>
                <p className="text-xs text-gray-500">Update current table status</p>
              </div>
              <button onClick={() => setActiveTable(null)} className="text-gray-400"><X size={20} /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => updateTableStatus(activeTable.id, 'Available')} className="py-3 px-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-bold flex flex-col items-center gap-1 hover:bg-green-100">
                <CheckCircle size={18} /> Available
              </button>
              <button onClick={() => updateTableStatus(activeTable.id, 'Occupied')} className="py-3 px-2 bg-blue-50 text-servora-core border border-blue-200 rounded-xl text-xs font-bold flex flex-col items-center gap-1 hover:bg-blue-100">
                <Users size={18} /> Occupied
              </button>
              <button onClick={() => updateTableStatus(activeTable.id, 'Reserved')} className="py-3 px-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex flex-col items-center gap-1 hover:bg-purple-100">
                <Clock size={18} /> Reserved
              </button>
              <button onClick={() => updateTableStatus(activeTable.id, 'Cleaning')} className="py-3 px-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold flex flex-col items-center gap-1 hover:bg-amber-100">
                <Sparkles size={18} /> Cleaning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}