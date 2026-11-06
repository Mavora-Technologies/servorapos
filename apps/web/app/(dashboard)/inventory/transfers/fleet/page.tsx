'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    Truck,
    Plus,
    RefreshCw,
    Search,
    ChevronRight,
    ShieldCheck,
    Thermometer,
    Clock,
    ArrowUpRight,
    CheckCircle2,
    AlertTriangle,
    Layers,
    MapPin,
    Phone,
    UserCheck,
    Send,
    X,
    Snowflake,
    Building2,
    Gauge,
    SlidersHorizontal,
    Check,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface VehicleRecord {
    id: number;
    vehiclePlate: string;
    makeModel: string;
    vehicleType: string;
    driverName: string | null;
    driverPhone: string | null;
    maxPayloadKg: string;
    isRefrigerated: boolean;
    minTargetTemp: string | null;
    maxTargetTemp: string | null;
    currentStatus: 'AVAILABLE' | 'IN_TRANSIT' | 'MAINTENANCE' | 'OFF_DUTY';
    branchId: number | null;
    branchName: string | null;
    updatedAt: string;
}

interface DispatchRecord {
    id: number;
    transferId: number;
    transferNumber: string;
    dispatchStatus: string;
    departureTime: string;
    dispatchTempProbe: string | null;
    vehiclePlate: string;
    driverName: string | null;
    driverPhone: string | null;
    sourceBranchName: string;
    destBranchName: string;
}

interface BranchOption {
    id: number;
    name: string;
    code?: string;
}

interface FleetTelemetry {
    metrics: {
        totalVehicles: number;
        availableVehicles: number;
        inTransitVehicles: number;
        maintenanceVehicles: number;
        coldChainVehicles: number;
    };
    vehicles: VehicleRecord[];
    activeDispatches: DispatchRecord[];
}

export default function FleetLogisticsPage() {
    const [data, setData] = useState<FleetTelemetry | null>(null);
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters & Search
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [branchFilter, setBranchFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Asset Registration Modal
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [newVehicle, setNewVehicle] = useState({
        vehiclePlate: '',
        makeModel: '',
        vehicleType: 'REEFER_VAN',
        driverName: '',
        driverPhone: '',
        maxPayloadKg: '1500',
        branchId: '',
        isRefrigerated: false,
        minTargetTemp: '2.0',
        maxTargetTemp: '8.0',
    });

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [fleetRes, branchesRes] = await Promise.all([
                fetchApi('/api/v1/inventory/transfers/fleet'),
                fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
            ]);

            if (fleetRes?.data) {
                setData(fleetRes.data);
            }
            if (branchesRes?.data && Array.isArray(branchesRes.data)) {
                setBranches(branchesRes.data);
            }
        } catch (err: any) {
            console.error('Failed to load fleet data:', err);
            // Surface the error so you immediately see if it's 404, 500, or unauthorized
            alert(`Fleet Telemetry Error: ${err.message || 'Check backend logs'}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const timer = setInterval(loadData, 30000);
        return () => clearInterval(timer);
    }, []);

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        try {
            setIsSubmitting(true);
            await fetchApi('/api/v1/inventory/transfers/fleet/vehicles', {
                method: 'POST',
                body: JSON.stringify({
                    ...newVehicle,
                    branchId: newVehicle.branchId ? parseInt(newVehicle.branchId, 10) : undefined,
                    minTargetTemp: newVehicle.isRefrigerated ? newVehicle.minTargetTemp : undefined,
                    maxTargetTemp: newVehicle.isRefrigerated ? newVehicle.maxTargetTemp : undefined,
                }),
            });

            setIsRegisterModalOpen(false);
            setNewVehicle({
                vehiclePlate: '',
                makeModel: '',
                vehicleType: 'REEFER_VAN',
                driverName: '',
                driverPhone: '',
                maxPayloadKg: '1500',
                branchId: '',
                isRefrigerated: false,
                minTargetTemp: '2.0',
                maxTargetTemp: '8.0',
            });
            loadData();
        } catch (err: any) {
            setFormError(err.message || 'Failed to register fleet asset');
        } finally {
            setIsSubmitting(false);
        }
    };

    const metrics = useMemo(() => {
        return {
            totalVehicles: data?.metrics?.totalVehicles ?? (data?.vehicles?.length || 0),
            availableVehicles: data?.metrics?.availableVehicles ?? (data?.vehicles?.filter(v => v.currentStatus === 'AVAILABLE').length || 0),
            inTransitVehicles: data?.metrics?.inTransitVehicles ?? (data?.vehicles?.filter(v => v.currentStatus === 'IN_TRANSIT').length || 0),
            coldChainVehicles: data?.metrics?.coldChainVehicles ?? (data?.vehicles?.filter(v => v.isRefrigerated).length || 0),
            maintenanceVehicles: data?.metrics?.maintenanceVehicles ?? (data?.vehicles?.filter(v => v.currentStatus === 'MAINTENANCE').length || 0),
        };
    }, [data]);

    const filteredVehicles = useMemo(() => {
        if (!data?.vehicles || !Array.isArray(data.vehicles)) return [];
        return data.vehicles.filter((v) => {
            const matchesStatus = statusFilter === 'ALL' || v.currentStatus === statusFilter;
            const matchesType = typeFilter === 'ALL' || v.vehicleType === typeFilter;
            const matchesBranch = branchFilter === 'ALL' || String(v.branchId) === branchFilter;
            const query = searchQuery.toLowerCase().trim();
            const matchesQuery =
                !query ||
                v.vehiclePlate?.toLowerCase().includes(query) ||
                v.driverName?.toLowerCase().includes(query) ||
                v.makeModel?.toLowerCase().includes(query) ||
                v.branchName?.toLowerCase().includes(query);

            return matchesStatus && matchesType && matchesBranch && matchesQuery;
        });
    }, [data?.vehicles, statusFilter, typeFilter, branchFilter, searchQuery]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'AVAILABLE':
                return (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1">
                        <CheckCircle2 size={11} /> Standby / Ready
                    </span>
                );
            case 'IN_TRANSIT':
                return (
                    <span className="px-2.5 py-1 bg-blue-50 text-servora-core border border-blue-200 rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1 animate-pulse">
                        <Truck size={11} /> Active Route
                    </span>
                );
            case 'MAINTENANCE':
                return (
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1">
                        <AlertTriangle size={11} /> Workshop / Service
                    </span>
                );
            default:
                return (
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10.5px] font-bold">
                        Off Duty
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6 pb-12 font-sans">
            {/* 1. EXECUTIVE COMMAND HEADER */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-servora-core bg-blue-50 px-2 py-0.5 rounded-md">
                            LE-TRA / TMS [MM06]
                        </span>
                        <ChevronRight size={12} className="text-gray-400" />
                        <span className="text-xs font-bold text-servora-navy">Inter-Branch Logistics & Fleet Telemetry</span>
                    </div>
                    <h1 className="text-xl font-bold text-servora-navy">Logistics Fleet Management & Dispatch Console</h1>
                    <p className="text-xs text-servora-deepTeal mt-0.5">
                        Real-time track-and-trace for internal transfer trucks, cold-chain reefer vans, and driver manifests.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                    <Link
                        href="/inventory/transfers"
                        className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                    >
                        <span>Transfer Orders [MM05]</span>
                        <ArrowUpRight size={12} />
                    </Link>
                    <button
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus size={14} /> Add Vehicle Asset
                    </button>
                    <button
                        onClick={loadData}
                        title="Refresh Live Fleet State"
                        className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. FLEET TELEMETRY STRIP */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Fleet Assets</span>
                        <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
                            {metrics.totalVehicles}
                        </p>
                    </div>
                    <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
                        <Layers size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Available Standby</span>
                        <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                            {metrics.availableVehicles}
                        </p>
                    </div>
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircle2 size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">En Route Consignments</span>
                        <p className="text-xl font-bold font-mono text-servora-core mt-0.5">
                            {metrics.inTransitVehicles}
                        </p>
                    </div>
                    <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
                        <Truck size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cold Chain Reefer</span>
                        <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
                            {metrics.coldChainVehicles}
                        </p>
                    </div>
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                        <Thermometer size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between col-span-2 lg:col-span-1">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Workshop & Service</span>
                        <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
                            {metrics.maintenanceVehicles}
                        </p>
                    </div>
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                        <AlertTriangle size={18} />
                    </div>
                </div>
            </div>

            {/* 3. ACTIVE IN-TRANSIT CONSIGNMENTS MONITOR */}
            {data?.activeDispatches && data.activeDispatches.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-servora-core animate-pulse" />
                            <h2 className="text-sm font-bold text-servora-navy">Active In-Transit Inter-Branch Consignments</h2>
                        </div>
                        <span className="text-xs font-mono font-bold text-servora-core">
                            {data.activeDispatches.length} Vehicles Moving
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {data.activeDispatches.map((disp) => (
                            <div key={disp.id} className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-2 text-xs">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-mono font-bold text-servora-core block">{disp.transferNumber}</span>
                                        <span className="text-[11px] font-bold text-servora-navy">{disp.vehiclePlate}</span>
                                    </div>
                                    <span className="px-2 py-0.5 bg-blue-100 text-servora-navy rounded font-mono font-bold text-[10px]">
                                        IN_TRANSIT
                                    </span>
                                </div>

                                <div className="space-y-1 text-[11px] text-gray-600 border-t border-blue-100 pt-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={12} className="text-gray-400 shrink-0" />
                                        <span>{disp.sourceBranchName || 'Central Hub'} &rarr; {disp.destBranchName || 'Branch'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <UserCheck size={12} className="text-gray-400 shrink-0" />
                                        <span>Driver: {disp.driverName || 'Designated Driver'} ({disp.driverPhone || 'N/A'})</span>
                                    </div>
                                    {disp.dispatchTempProbe && (
                                        <div className="flex items-center gap-1.5 font-mono text-purple-700 font-bold">
                                            <Thermometer size={12} className="shrink-0" />
                                            <span>Probe: {disp.dispatchTempProbe}°C (HACCP Validated)</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. MASTER FLEET ASSET DIRECTORY TABLE */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-servora-navy">Master Vehicle & Carrier Ledger</h2>
                        <span className="text-xs font-mono text-gray-400">({filteredVehicles.length} of {data?.vehicles?.length || 0} Assets)</span>
                    </div>

                    {/* Multi-Parameter Filters */}
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                        <div className="relative flex-1 sm:w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search plate, driver, depot..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="AVAILABLE">Available</option>
                            <option value="IN_TRANSIT">In Transit</option>
                            <option value="MAINTENANCE">Maintenance</option>
                        </select>

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
                        >
                            <option value="ALL">All Categories</option>
                            <option value="REEFER_VAN">Reefer Van</option>
                            <option value="BOX_TRUCK">Box Truck</option>
                            <option value="PICKUP">Pickup</option>
                            <option value="MOTORBIKE">Motorbike</option>
                        </select>

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

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                                <th className="py-2.5 px-3">Vehicle Plate & Make</th>
                                <th className="py-2.5 px-3">Category & Body</th>
                                <th className="py-2.5 px-3">Thermal Spec / Reefer</th>
                                <th className="py-2.5 px-3">Driver / Operator</th>
                                <th className="py-2.5 px-3">Base Depot</th>
                                <th className="py-2.5 px-3">Operational State</th>
                                <th className="py-2.5 px-3 text-right">Quick Dispatch</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredVehicles.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                                        No fleet assets match the filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredVehicles.map((v) => (
                                    <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3 px-3">
                                            <span className="font-mono font-bold text-servora-navy text-sm block">{v.vehiclePlate}</span>
                                            <span className="text-[11px] text-gray-400">{v.makeModel || 'Standard Fleet'}</span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="font-semibold text-gray-800 block">
                                                {v.vehicleType.replace('_', ' ')}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                Payload: {parseFloat(v.maxPayloadKg || '1500').toLocaleString()} KG
                                            </span>
                                        </td>
                                        <td className="py-3 px-3">
                                            {v.isRefrigerated ? (
                                                <div>
                                                    <span className="text-[10.5px] text-purple-700 font-bold flex items-center gap-1">
                                                        <Snowflake size={11} /> Cold Chain Reefer
                                                    </span>
                                                    <span className="text-[10px] font-mono text-purple-900 font-semibold block">
                                                        Target: {v.minTargetTemp ?? '0'}°C to {v.maxTargetTemp ?? '4'}°C
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-gray-400 italic">Dry Cargo Ambient</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="font-bold text-servora-navy block">{v.driverName || 'Unassigned'}</span>
                                            {v.driverPhone ? (
                                                <a
                                                    href={`tel:${v.driverPhone}`}
                                                    className="text-[11px] text-gray-500 hover:text-servora-core font-mono flex items-center gap-1 mt-0.5 transition-colors"
                                                >
                                                    <Phone size={10} /> {v.driverPhone}
                                                </a>
                                            ) : (
                                                <span className="text-[10px] text-gray-400 font-mono">No phone</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-gray-700">
                                            <div className="flex items-center gap-1 font-medium">
                                                <Building2 size={12} className="text-gray-400 shrink-0" />
                                                <span>{v.branchName || 'Central Hub'}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3">
                                            {getStatusBadge(v.currentStatus)}
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <Link
                                                href={`/inventory/transfers?assignVehicleId=${v.id}`}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 ${v.currentStatus === 'AVAILABLE'
                                                        ? 'bg-servora-core text-white hover:bg-blue-700 shadow-xs'
                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                                                    }`}
                                            >
                                                <Send size={11} /> Assign Route
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 5. ASSET ONBOARDING MODAL */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-servora-navy">Add Fleet Vehicle Asset [LE-TRA]</h3>
                                <p className="text-[11px] text-gray-400">Register new delivery truck, van, or bike to logistics pool</p>
                            </div>
                            <button
                                onClick={() => setIsRegisterModalOpen(false)}
                                className="text-gray-400 hover:text-servora-navy cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {formError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-servora-navy mb-1">
                                        Registration Plate *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. KDE 321B"
                                        value={newVehicle.vehiclePlate}
                                        onChange={(e) => setNewVehicle({ ...newVehicle, vehiclePlate: e.target.value.toUpperCase() })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-servora-core text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Make & Model *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Isuzu FRR / HiAce"
                                        value={newVehicle.makeModel}
                                        onChange={(e) => setNewVehicle({ ...newVehicle, makeModel: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Asset Category</label>
                                    <select
                                        value={newVehicle.vehicleType}
                                        onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer text-xs"
                                    >
                                        <option value="REEFER_VAN">Refrigerated Reefer Van</option>
                                        <option value="BOX_TRUCK">Box Truck</option>
                                        <option value="PICKUP">Flatbed / Pickup</option>
                                        <option value="MOTORBIKE">Courier Motorbike</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Assigned Base Depot</label>
                                    <select
                                        value={newVehicle.branchId}
                                        onChange={(e) => setNewVehicle({ ...newVehicle, branchId: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer text-xs"
                                    >
                                        <option value="">Central Commissary Hub</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Driver Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Driver Full Name"
                                        value={newVehicle.driverName}
                                        onChange={(e) => setNewVehicle({ ...newVehicle, driverName: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Driver Phone *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="2547XXXXXXXX"
                                        value={newVehicle.driverPhone}
                                        onChange={(e) => setNewVehicle({ ...newVehicle, driverPhone: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-servora-navy mb-1">Max Payload Rating (KG)</label>
                                    <input
                                        type="number"
                                        value={newVehicle.maxPayloadKg}
                                        onChange={(e) => setNewVehicle({ ...newVehicle, maxPayloadKg: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core text-xs"
                                    />
                                </div>
                                <div className="flex items-center pt-5">
                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-servora-navy">
                                        <input
                                            type="checkbox"
                                            checked={newVehicle.isRefrigerated}
                                            onChange={(e) => setNewVehicle({ ...newVehicle, isRefrigerated: e.target.checked })}
                                            className="rounded border-gray-300 text-servora-core focus:ring-servora-core w-4 h-4 cursor-pointer"
                                        />
                                        <span>Reefer Cold-Chain Unit</span>
                                    </label>
                                </div>
                            </div>

                            {/* Dynamic Cold-Chain Range Config */}
                            {newVehicle.isRefrigerated && (
                                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                                    <span className="text-[10.5px] font-bold uppercase text-purple-900 tracking-wider flex items-center gap-1">
                                        <Thermometer size={12} /> Target Temperature Operating Range (°C)
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-purple-800 mb-0.5">Min Temp (°C)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={newVehicle.minTargetTemp}
                                                onChange={(e) => setNewVehicle({ ...newVehicle, minTargetTemp: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg font-mono text-xs focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-purple-800 mb-0.5">Max Temp (°C)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={newVehicle.maxTargetTemp}
                                                onChange={(e) => setNewVehicle({ ...newVehicle, maxTargetTemp: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg font-mono text-xs focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-3 border-t border-gray-100 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsRegisterModalOpen(false)}
                                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer text-xs"
                                >
                                    {isSubmitting ? 'Registering...' : 'Register Asset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}