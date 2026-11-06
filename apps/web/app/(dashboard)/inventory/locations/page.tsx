'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    MapPin,
    Building2,
    Layers,
    Thermometer,
    ShieldAlert,
    Search,
    Plus,
    RefreshCw,
    ChevronRight,
    Boxes,
    Barcode,
    ArrowUpRight,
    CheckCircle2,
    AlertTriangle,
    Snowflake,
    SlidersHorizontal,
    X,
    Gauge,
    Compass,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ZoneRecord {
    id: number;
    zoneCode: string;
    name: string;
    zoneType: string;
    temperatureMinC: string | null;
    temperatureMaxC: string | null;
    isActive: boolean;
    branchId: number;
    branchName: string;
    binCount: number;
    occupiedBinCount: number;
    updatedAt: string;
}

interface BinRecord {
    id: number;
    binCode: string;
    barcode: string | null;
    binType: string;
    pickSequence: number;
    maxWeightKg: string;
    maxVolumeCbm: string;
    isQuarantine: boolean;
    isOccupied: boolean;
    isActive: boolean;
    zoneId: number;
    zoneCode: string;
    zoneName: string;
    branchId: number;
    branchName: string;
}

interface BranchOption {
    id: number;
    name: string;
    code?: string;
}

interface LocationTopology {
    metrics: {
        totalZones: number;
        totalBins: number;
        coldChainZones: number;
        occupiedBins: number;
        quarantineBins: number;
    };
    zones: ZoneRecord[];
    bins: BinRecord[];
}

export default function WarehouseLocationsPage() {
    const [data, setData] = useState<LocationTopology | null>(null);
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Active View Tab ('ZONES' or 'BINS')
    const [activeTab, setActiveTab] = useState<'ZONES' | 'BINS'>('ZONES');

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [branchFilter, setBranchFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');

    // Modal States
    const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
    const [isBinModalOpen, setIsBinModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // New Zone State
    const [newZone, setNewZone] = useState({
        branchId: '',
        zoneCode: '',
        name: '',
        zoneType: 'INTERNAL_STORAGE',
        temperatureMinC: '2.0',
        temperatureMaxC: '8.0',
    });

    // New Bin State
    const [newBin, setNewBin] = useState({
        zoneId: '',
        binCode: '',
        barcode: '',
        binType: 'STANDARD_SHELF',
        pickSequence: '10',
        maxWeightKg: '500',
        maxVolumeCbm: '1.5',
        isQuarantine: false,
    });

    const loadData = async () => {
    try {
      setIsLoading(true);
      const [locRes, branchesRes] = await Promise.all([
        fetchApi('/api/v1/inventory/locations'),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (locRes?.data) {
        setData(locRes.data);
      }
      if (branchesRes?.data && Array.isArray(branchesRes.data)) {
        setBranches(branchesRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load warehouse topology:', err);
    } finally {
      setIsLoading(false);
    }
  };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateZone = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError(null);
        try {
            setIsSubmitting(true);
            await fetchApi('/api/v1/inventory/locations/zones', {
                method: 'POST',
                body: JSON.stringify(newZone),
            });
            setIsZoneModalOpen(false);
            setNewZone({
                branchId: '',
                zoneCode: '',
                name: '',
                zoneType: 'INTERNAL_STORAGE',
                temperatureMinC: '2.0',
                temperatureMaxC: '8.0',
            });
            loadData();
        } catch (err: any) {
            setModalError(err.message || 'Failed to register warehouse zone');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateBin = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError(null);
        try {
            setIsSubmitting(true);
            await fetchApi('/api/v1/inventory/locations/bins', {
                method: 'POST',
                body: JSON.stringify(newBin),
            });
            setIsBinModalOpen(false);
            setNewBin({
                zoneId: '',
                binCode: '',
                barcode: '',
                binType: 'STANDARD_SHELF',
                pickSequence: '10',
                maxWeightKg: '500',
                maxVolumeCbm: '1.5',
                isQuarantine: false,
            });
            loadData();
        } catch (err: any) {
            setModalError(err.message || 'Failed to register bin location');
        } finally {
            setIsSubmitting(false);
        }
    };

    const metrics = useMemo(() => {
        const zonesList = data?.zones ?? [];
        const binsList = data?.bins ?? [];
        return {
            totalZones: data?.metrics?.totalZones ?? zonesList.length,
            totalBins: data?.metrics?.totalBins ?? binsList.length,
            coldChainZones: data?.metrics?.coldChainZones ?? zonesList.filter((z) => ['COLD_STORAGE', 'DEEP_FREEZE'].includes(z.zoneType)).length,
            occupiedBins: data?.metrics?.occupiedBins ?? binsList.filter((b) => b.isOccupied).length,
            quarantineBins: data?.metrics?.quarantineBins ?? binsList.filter((b) => b.isQuarantine).length,
        };
    }, [data]);

    const filteredZones = useMemo(() => {
        if (!data?.zones || !Array.isArray(data.zones)) return [];
        return data.zones.filter((z) => {
            const matchesBranch = branchFilter === 'ALL' || String(z.branchId) === branchFilter;
            const matchesType = typeFilter === 'ALL' || z.zoneType === typeFilter;
            const q = searchQuery.toLowerCase().trim();
            const matchesQuery = !q || z.zoneCode.toLowerCase().includes(q) || z.name.toLowerCase().includes(q) || (z.branchName && z.branchName.toLowerCase().includes(q));
            return matchesBranch && matchesType && matchesQuery;
        });
    }, [data?.zones, branchFilter, typeFilter, searchQuery]);

    const filteredBins = useMemo(() => {
        if (!data?.bins || !Array.isArray(data.bins)) return [];
        return data.bins.filter((b) => {
            const matchesBranch = branchFilter === 'ALL' || String(b.branchId) === branchFilter;
            const matchesType = typeFilter === 'ALL' || b.binType === typeFilter;
            const q = searchQuery.toLowerCase().trim();
            const matchesQuery = !q || b.binCode.toLowerCase().includes(q) || (b.zoneName && b.zoneName.toLowerCase().includes(q)) || (b.barcode && b.barcode.toLowerCase().includes(q));
            return matchesBranch && matchesType && matchesQuery;
        });
    }, [data?.bins, branchFilter, typeFilter, searchQuery]);

    return (
        <div className="space-y-6 pb-12 font-sans">
            {/* 1. TOP EXECUTIVE COMMAND HEADER */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-servora-core bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-servora-core animate-pulse" />
                            Servora WMS
                        </span>
                        <ChevronRight size={12} className="text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500">Facility Zones & Coordinate Bin Slotting</span>
                    </div>
                    <h1 className="text-xl font-bold text-servora-navy">Warehouse Layout & Storage Locations</h1>
                    <p className="text-xs text-servora-deepTeal mt-0.5">
                        Manage multi-zone stock placement, cold-chain temperature thresholds, and optimized pick sequences across branches.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                    <button
                        onClick={() => setIsBinModalOpen(true)}
                        className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <Boxes size={14} /> Add Bin Slot
                    </button>
                    <button
                        onClick={() => setIsZoneModalOpen(true)}
                        className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus size={14} /> Add Storage Zone
                    </button>
                    <button
                        onClick={loadData}
                        title="Refresh Warehouse Layout"
                        className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. TOPOLOGY TELEMETRY STRIP */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Zones</span>
                        <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">{metrics.totalZones}</p>
                    </div>
                    <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
                        <Layers size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Bin Slots</span>
                        <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{metrics.totalBins}</p>
                    </div>
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Boxes size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cold Chain Zones</span>
                        <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">{metrics.coldChainZones}</p>
                    </div>
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                        <Snowflake size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Occupied Slots</span>
                        <p className="text-xl font-bold font-mono text-blue-700 mt-0.5">{metrics.occupiedBins}</p>
                    </div>
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                        <Compass size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between col-span-2 lg:col-span-1">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Quarantine Scrap Bins</span>
                        <p className="text-xl font-bold font-mono text-rose-600 mt-0.5">{metrics.quarantineBins}</p>
                    </div>
                    <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                        <ShieldAlert size={18} />
                    </div>
                </div>
            </div>

            {/* 3. CONTROL LEDGER & TOPOLOGY VIEW */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                    {/* Tab Switcher */}
                    <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
                        <button
                            onClick={() => setActiveTab('ZONES')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'ZONES' ? 'bg-white text-servora-navy shadow-xs' : 'text-gray-500 hover:text-black'
                                }`}
                        >
                            Storage Zones ({data?.zones?.length ?? 0})
                        </button>
                        <button
                            onClick={() => setActiveTab('BINS')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'BINS' ? 'bg-white text-servora-navy shadow-xs' : 'text-gray-500 hover:text-black'
                                }`}
                        >
                            Coordinate Bins ({data?.bins?.length ?? 0})
                        </button>
                    </div>

                    {/* Filtering Engine */}
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder={activeTab === 'ZONES' ? 'Search zone code, name...' : 'Search bin coordinate, barcode...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
                            />
                        </div>

                        {branches.length > 0 && (
                            <select
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
                            >
                                <option value="ALL">All Depots</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={String(b.id)}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Tab 1: Storage Zones Grid */}
                {activeTab === 'ZONES' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                                    <th className="py-2.5 px-3">Zone Code & Name</th>
                                    <th className="py-2.5 px-3">Depot Facility</th>
                                    <th className="py-2.5 px-3">Functional Category</th>
                                    <th className="py-2.5 px-3">HACCP Temperature Spec</th>
                                    <th className="py-2.5 px-3 text-center">Bin Density</th>
                                    <th className="py-2.5 px-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredZones.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                                            No storage zones configured for this depot filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredZones.map((z) => (
                                        <tr key={z.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3 px-3">
                                                <span className="font-mono font-bold text-servora-navy block">{z.zoneCode}</span>
                                                <span className="text-[11px] text-gray-500 font-medium">{z.name}</span>
                                            </td>
                                            <td className="py-3 px-3 font-medium text-gray-700">
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 size={13} className="text-gray-400 shrink-0" />
                                                    <span>{z.branchName}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className="font-bold text-[10.5px] uppercase tracking-wider text-servora-deepTeal bg-slate-100 px-2 py-0.5 rounded-md">
                                                    {z.zoneType.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3">
                                                {z.temperatureMinC !== null && z.temperatureMaxC !== null ? (
                                                    <div className="font-mono font-bold text-purple-700 flex items-center gap-1">
                                                        <Snowflake size={11} />
                                                        <span>
                                                            {z.temperatureMinC}°C to {z.temperatureMaxC}°C
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[11px]">Ambient Climate</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <span className="font-mono font-bold text-servora-navy">
                                                    {z.occupiedBinCount} / {z.binCount} Bins
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <button
                                                    onClick={() => {
                                                        setNewBin((prev) => ({ ...prev, zoneId: String(z.id) }));
                                                        setIsBinModalOpen(true);
                                                    }}
                                                    className="px-2.5 py-1 bg-blue-50 text-servora-core hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Plus size={11} /> Add Bin
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Tab 2: Granular Coordinate Bins */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                                    <th className="py-2.5 px-3">Bin Coordinate (A-R-S-B)</th>
                                    <th className="py-2.5 px-3">Zone & Facility</th>
                                    <th className="py-2.5 px-3">Type & Barcode</th>
                                    <th className="py-2.5 px-3 font-mono">Pick Sequence</th>
                                    <th className="py-2.5 px-3">Max Rating</th>
                                    <th className="py-2.5 px-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredBins.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                                            No coordinate bins found matching search criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBins.map((b) => (
                                        <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3 px-3">
                                                <span className="font-mono font-bold text-servora-navy text-sm block">{b.binCode}</span>
                                                {b.isQuarantine && (
                                                    <span className="text-[10px] text-rose-700 font-bold flex items-center gap-1 mt-0.5">
                                                        <ShieldAlert size={10} /> Quarantine Isolation
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className="font-bold text-servora-navy block">{b.zoneName}</span>
                                                <span className="text-[11px] text-gray-400 font-medium">{b.branchName}</span>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className="font-medium text-gray-700 block">{b.binType.replace('_', ' ')}</span>
                                                <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <Barcode size={10} /> {b.barcode}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 font-mono font-bold text-gray-700">Seq #{b.pickSequence}</td>
                                            <td className="py-3 px-3 font-mono text-gray-600">
                                                {parseFloat(b.maxWeightKg || '0').toLocaleString()} KG &bull; {b.maxVolumeCbm} M³
                                            </td>
                                            <td className="py-3 px-3">
                                                {b.isOccupied ? (
                                                    <span className="px-2 py-0.5 bg-blue-50 text-servora-core border border-blue-200 rounded-md font-bold text-[10px]">
                                                        Occupied
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px]">
                                                        Available Slot
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 4. MODAL: CREATE STORAGE ZONE */}
            {isZoneModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-servora-navy">Configure Warehouse Zone [EWM-ZONE]</h3>
                                <p className="text-[11px] text-gray-400">Establish thermal or functional warehouse areas</p>
                            </div>
                            <button onClick={() => setIsZoneModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        {modalError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{modalError}</div>}

                        <form onSubmit={handleCreateZone} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-servora-navy mb-1">Depot Facility *</label>
                                <select
                                    required
                                    value={newZone.branchId}
                                    onChange={(e) => setNewZone({ ...newZone, branchId: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                                >
                                    <option value="">Select facility...</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Zone Code *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. ZN-COLD-01"
                                        value={newZone.zoneCode}
                                        onChange={(e) => setNewZone({ ...newZone, zoneCode: e.target.value.toUpperCase() })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-servora-core"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Functional Category</label>
                                    <select
                                        value={newZone.zoneType}
                                        onChange={(e) => setNewZone({ ...newZone, zoneType: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                                    >
                                        <option value="INTERNAL_STORAGE">Standard Ambient Dry</option>
                                        <option value="COLD_STORAGE">Chilled Storage (2°C-8°C)</option>
                                        <option value="DEEP_FREEZE">Deep Freeze (-20°C)</option>
                                        <option value="RECEIVING">Receiving Dock</option>
                                        <option value="QUARANTINE_SCRAP">Quarantine & Scrap</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-servora-navy mb-1">Zone Descriptive Label *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Dairy & Poultry Walk-in Chiller"
                                    value={newZone.name}
                                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                                />
                            </div>

                            {['COLD_STORAGE', 'DEEP_FREEZE'].includes(newZone.zoneType) && (
                                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                                    <span className="text-[10px] font-bold uppercase text-purple-900 tracking-wider flex items-center gap-1">
                                        <Snowflake size={11} /> HACCP Temperature Calibration Spec (°C)
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-purple-800 mb-0.5">Min Temp (°C)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={newZone.temperatureMinC}
                                                onChange={(e) => setNewZone({ ...newZone, temperatureMinC: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg font-mono text-xs focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-purple-800 mb-0.5">Max Temp (°C)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={newZone.temperatureMaxC}
                                                onChange={(e) => setNewZone({ ...newZone, temperatureMaxC: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg font-mono text-xs focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-3 border-t border-gray-100 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsZoneModalOpen(false)}
                                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                                >
                                    {isSubmitting ? 'Configuring...' : 'Save Zone'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 5. MODAL: CREATE STORAGE BIN */}
            {isBinModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-servora-navy">Register Coordinate Bin [EWM-BIN]</h3>
                                <p className="text-[11px] text-gray-400">Add physical coordinate address (Aisle-Rack-Shelf-Bin)</p>
                            </div>
                            <button onClick={() => setIsBinModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        {modalError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{modalError}</div>}

                        <form onSubmit={handleCreateBin} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-servora-navy mb-1">Storage Zone *</label>
                                <select
                                    required
                                    value={newBin.zoneId}
                                    onChange={(e) => setNewBin({ ...newBin, zoneId: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                                >
                                    <option value="">Select zone...</option>
                                    {(data?.zones ?? []).map((z) => (
                                        <option key={z.id} value={z.id}>
                                            {z.name} ({z.zoneCode}) - {z.branchName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Coordinate Code *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="A01-R02-S03-B04"
                                        value={newBin.binCode}
                                        onChange={(e) => setNewBin({ ...newBin, binCode: e.target.value.toUpperCase() })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-servora-core"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Pick Wave Sequence</label>
                                    <input
                                        type="number"
                                        value={newBin.pickSequence}
                                        onChange={(e) => setNewBin({ ...newBin, pickSequence: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Max Weight (KG)</label>
                                    <input
                                        type="number"
                                        value={newBin.maxWeightKg}
                                        onChange={(e) => setNewBin({ ...newBin, maxWeightKg: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Max Volume (M³)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newBin.maxVolumeCbm}
                                        onChange={(e) => setNewBin({ ...newBin, maxVolumeCbm: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-servora-navy">
                                    <input
                                        type="checkbox"
                                        checked={newBin.isQuarantine}
                                        onChange={(e) => setNewBin({ ...newBin, isQuarantine: e.target.checked })}
                                        className="rounded border-gray-300 text-servora-core focus:ring-servora-core w-4 h-4 cursor-pointer"
                                    />
                                    <span>Quarantine & Defective Item Isolation Bin</span>
                                </label>
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsBinModalOpen(false)}
                                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                                >
                                    {isSubmitting ? 'Registering...' : 'Save Bin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}