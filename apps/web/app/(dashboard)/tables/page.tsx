'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Map, 
  Plus, 
  Users, 
  UtensilsCrossed, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  X, 
  ChevronRight, 
  ShoppingCart, 
  Coffee, 
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface DiningArea { 
  id: number; 
  name: string; 
}

interface RestaurantTable { 
  id: number; 
  areaId: number; 
  tableLabel: string; 
  capacity: number; 
  status: 'Available' | 'Occupied' | 'Reserved' | 'Cleaning';
  assignedWaiterId?: number | null;
}

type TableFilterTab = 'ALL' | 'Available' | 'Occupied' | 'Reserved' | 'Cleaning';

export default function TablesPage() {
  const [areas, setAreas] = useState<DiningArea[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtering State
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<TableFilterTab>('ALL');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');

  // Modals & Action Drawer
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [activeTable, setActiveTable] = useState<RestaurantTable | null>(null);

  // Form states
  const [areaName, setAreaName] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [tableLabel, setTableLabel] = useState('');
  const [tableCapacity, setTableCapacity] = useState('4');

  const fetchFloorPlan = async () => {
    try {
      setIsLoading(true);
      const result = await fetchApi('/api/v1/tables');
      
      if (result?.data) {
        setAreas(result.data.areas || []);
        setTables(result.data.tables || []);
        if (result.data.areas.length > 0 && !selectedAreaId) {
          setSelectedAreaId(result.data.areas[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Failed to load floor plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchFloorPlan(); 
  }, []);

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/api/v1/tables/areas', {
        method: 'POST',
        body: JSON.stringify({ name: areaName.trim() })
      });
      setAreaName(''); 
      setIsAreaModalOpen(false); 
      fetchFloorPlan();
    } catch (err: any) { 
      alert(err.message || 'Failed to create area'); 
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/api/v1/tables/items', {
        method: 'POST',
        body: JSON.stringify({ 
          areaId: parseInt(selectedAreaId, 10), 
          tableLabel: tableLabel.trim(), 
          capacity: parseInt(tableCapacity, 10) 
        })
      });
      setTableLabel(''); 
      setTableCapacity('4'); 
      setIsTableModalOpen(false); 
      fetchFloorPlan();
    } catch (err: any) { 
      alert(err.message || 'Failed to create table'); 
    }
  };

  const updateTableStatus = async (tableId: number, status: string) => {
    try {
      await fetchApi(`/api/v1/tables/${tableId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setActiveTable(null); 
      fetchFloorPlan();
    } catch (err: any) { 
      alert(err.message || 'Failed to update table status'); 
    }
  };

  // Enterprise Telemetry Metrics
  const metrics = useMemo(() => {
    const totalTables = tables.length;
    const availableCount = tables.filter(t => t.status === 'Available').length;
    const occupiedCount = tables.filter(t => t.status === 'Occupied').length;
    const reservedCount = tables.filter(t => t.status === 'Reserved').length;
    const cleaningCount = tables.filter(t => t.status === 'Cleaning').length;

    const totalSeats = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
    const occupiedSeats = tables.filter(t => t.status === 'Occupied').reduce((sum, t) => sum + (t.capacity || 0), 0);
    const utilizationRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

    return { totalTables, availableCount, occupiedCount, reservedCount, cleaningCount, utilizationRate };
  }, [tables]);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      const matchesStatus = selectedStatusFilter === 'ALL' || t.status === selectedStatusFilter;
      const matchesZone = selectedZoneFilter === 'ALL' || t.areaId.toString() === selectedZoneFilter;
      return matchesStatus && matchesZone;
    });
  }, [tables, selectedStatusFilter, selectedZoneFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400';
      case 'Occupied': return 'bg-blue-50 text-servora-core border-blue-200 hover:border-blue-400';
      case 'Reserved': return 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400';
      case 'Cleaning': return 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Navigation */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-400">Hospitality & Floor Plan Control Tower</span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-servora-navy">Dining Zones & Table Status</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Floor Plan & Table Management Hub</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Monitor real-time restaurant seat utilization, housekeeping turnaround times, and instant POS table routing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsAreaModalOpen(true)} 
            className="bg-white border border-gray-200 text-servora-navy text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} /> Add Area Zone
          </button>
          <button 
            onClick={() => setIsTableModalOpen(true)} 
            disabled={areas.length === 0} 
            className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <Plus size={15} /> Add Dining Table
          </button>
        </div>
      </div>

      {/* Telemetry Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Seat Utilization</span>
            <h3 className="text-base font-bold text-servora-navy mt-0.5">{metrics.utilizationRate}% Capacity</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Available Tables</span>
            <h3 className="text-base font-bold text-emerald-700 mt-0.5">{metrics.availableCount} Ready</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Occupied & Active</span>
            <h3 className="text-base font-bold text-blue-600 mt-0.5">{metrics.occupiedCount} Dining</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Housekeeping / Cleaning</span>
            <h3 className="text-base font-bold text-amber-700 mt-0.5">{metrics.cleaningCount} Turning</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
        </div>
      </div>

      {/* Control Tower Filters & Zone Selector */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'Available', 'Occupied', 'Reserved', 'Cleaning'] as TableFilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedStatusFilter(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                selectedStatusFilter === tab 
                  ? 'bg-white shadow-xs text-servora-navy' 
                  : 'text-gray-500 hover:text-servora-navy'
              }`}
            >
              {tab === 'ALL' ? 'All Tables' : tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-gray-400 whitespace-nowrap">Filter Zone:</span>
          <select 
            value={selectedZoneFilter}
            onChange={e => setSelectedZoneFilter(e.target.value)}
            className="bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-servora-navy focus:outline-none"
          >
            <option value="ALL">All Dining Zones</option>
            {areas.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Floor Plan Grid */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-xs text-servora-deepTeal animate-pulse">
          Synchronizing dining areas and floor layout...
        </div>
      ) : areas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 space-y-2">
          <p className="text-sm font-bold text-servora-navy">No dining areas configured</p>
          <p className="text-xs text-gray-500">Create a dining area (e.g., Main Dining Hall, Patio, Rooftop) to begin mapping tables.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {areas
            .filter(area => selectedZoneFilter === 'ALL' || area.id.toString() === selectedZoneFilter)
            .map(area => {
              const areaTables = filteredTables.filter(t => t.areaId === area.id);
              if (areaTables.length === 0 && selectedStatusFilter !== 'ALL') return null;

              return (
                <div key={area.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                  <div className="bg-slate-50 p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-servora-core"></span>
                      <h3 className="font-bold text-servora-navy text-sm">{area.name}</h3>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                      {areaTables.length} Tables Filtered
                    </span>
                  </div>

                  <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {areaTables.length === 0 ? (
                      <p className="col-span-full text-xs text-gray-400 py-6 text-center italic">
                        No tables match the current status filter in this zone.
                      </p>
                    ) : (
                      areaTables.map(table => (
                        <button 
                          key={table.id}
                          onClick={() => setActiveTable(table)}
                          className={`flex flex-col items-center justify-between p-4 rounded-2xl border-2 transition-all hover:scale-102 shadow-xs h-32 ${getStatusColor(table.status)}`}
                        >
                          <div className="w-full flex justify-between items-center text-[10px] font-bold uppercase tracking-wider opacity-75">
                            <span>{table.status}</span>
                            <Users size={12} />
                          </div>

                          <div className="my-auto text-center">
                            <UtensilsCrossed size={22} className="mx-auto mb-1 opacity-80" />
                            <span className="font-bold text-base block">{table.tableLabel}</span>
                          </div>

                          <div className="text-[10px] font-bold opacity-75">
                            {table.capacity} Seater
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

      {/* ADD AREA MODAL */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Add Dining Area Zone</h3>
                <p className="text-[11px] text-servora-deepTeal">Create a new floor section</p>
              </div>
              <button onClick={() => setIsAreaModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateArea} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Area Name *</label>
                <input 
                  type="text" 
                  required 
                  value={areaName} 
                  onChange={e => setAreaName(e.target.value)} 
                  placeholder="e.g. Main Hall, Patio, VIP Balcony" 
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAreaModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-servora-core rounded-xl hover:bg-blue-700 shadow-xs">Save Area</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TABLE MODAL */}
      {isTableModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Add Dining Table</h3>
                <p className="text-[11px] text-servora-deepTeal">Assign table to dining zone</p>
              </div>
              <button onClick={() => setIsTableModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTable} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Dining Area Zone *</label>
                <select 
                  value={selectedAreaId} 
                  onChange={e => setSelectedAreaId(e.target.value)} 
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                >
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Table Label / Number *</label>
                <input 
                  type="text" 
                  required 
                  value={tableLabel} 
                  onChange={e => setTableLabel(e.target.value)} 
                  placeholder="e.g. Table 4, Booth A" 
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Seating Capacity *</label>
                <input 
                  type="number" 
                  min="1" 
                  required 
                  value={tableCapacity} 
                  onChange={e => setTableCapacity(e.target.value)} 
                  placeholder="e.g. 4" 
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsTableModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-servora-core rounded-xl hover:bg-blue-700 shadow-xs">Save Table</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABLE STATUS & POS QUICK ACTION DRAWER */}
      {activeTable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">{activeTable.tableLabel}</h3>
                <p className="text-[11px] text-servora-deepTeal">Capacity: {activeTable.capacity} seats | Status: <strong>{activeTable.status}</strong></p>
              </div>
              <button onClick={() => setActiveTable(null)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider block">Update Table Status</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button onClick={() => updateTableStatus(activeTable.id, 'Available')} className="py-2.5 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors">
                  <CheckCircle size={14} /> Available
                </button>
                <button onClick={() => updateTableStatus(activeTable.id, 'Occupied')} className="py-2.5 px-3 bg-blue-50 text-servora-core border border-blue-200 rounded-xl font-bold flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors">
                  <Users size={14} /> Occupied
                </button>
                <button onClick={() => updateTableStatus(activeTable.id, 'Reserved')} className="py-2.5 px-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold flex items-center justify-center gap-1.5 hover:bg-purple-100 transition-colors">
                  <Clock size={14} /> Reserved
                </button>
                <button onClick={() => updateTableStatus(activeTable.id, 'Cleaning')} className="py-2.5 px-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold flex items-center justify-center gap-1.5 hover:bg-amber-100 transition-colors">
                  <Sparkles size={14} /> Cleaning
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <Link
                href={`/pos?tableId=${activeTable.id}&tableName=${encodeURIComponent(activeTable.tableLabel)}`}
                className="w-full py-2.5 bg-servora-core text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <ShoppingCart size={15} /> Open POS Order for {activeTable.tableLabel} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}