'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Truck,
  Clock,
  CheckCircle2,
  User,
  Phone,
  Navigation,
  X,
  Link as LinkIcon,
  Building2,
  ChevronRight,
  Search,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Eye,
  Plus,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface DeliveryRecord {
  id: number;
  branchId: number | null;
  branchName: string | null;
  orderNumber: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  total: string;
  itemsCount?: number;
  createdAt: string;
  provider?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  trackingUrl?: string | null;
  deliveryFee?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
}

interface DeliveryDetail extends DeliveryRecord {
  items: {
    id: number;
    menuItemId: number;
    itemName: string | null;
    quantity: string;
    totalPrice: string;
  }[];
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

interface StaffMember {
  id: number;
  fullName: string;
  phone: string | null;
  role: string;
}

type LogisticsTab = 'Pending' | 'InTransit' | 'History' | 'Exceptions';

export default function DeliveryPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [fleetStaff, setFleetStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const [activeTab, setActiveTab] = useState<LogisticsTab>('Pending');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Dispatch Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [dispatchType, setDispatchType] = useState<'In-House' | '3PL'>('3PL');

  // Rider / Carrier Form States
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('Uber Direct');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('250');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  // Order Line-Item Inspection Modal
  const [inspectedDelivery, setInspectedDelivery] = useState<DeliveryDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (branchFilter !== 'ALL') params.set('branchId', branchFilter);
      if (providerFilter !== 'ALL') params.set('provider', providerFilter);

      const [result, branchRes, staffRes] = await Promise.all([
        fetchApi(`/api/v1/delivery?${params.toString()}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
        fetchApi('/api/v1/delivery/fleet-roster').catch(() => ({ data: [] })),
      ]);

      if (result?.data) setDeliveries(result.data);
      if (branchRes?.data && Array.isArray(branchRes.data)) setBranches(branchRes.data);
      if (staffRes?.data && Array.isArray(staffRes.data)) setFleetStaff(staffRes.data);
      setNowTick(Date.now());
    } catch (error) {
      console.error('Failed to fetch enterprise deliveries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter, providerFilter]);

  useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 10000);
    const clock = setInterval(() => setNowTick(Date.now()), 30000);
    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, [fetchDeliveries]);

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(staffId);
    const found = fleetStaff.find((s) => String(s.id) === staffId);
    if (found) {
      setDriverName(found.fullName);
      setDriverPhone(found.phone || '');
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrderId) return;

    setIsRequesting(true);
    try {
      const payload = {
        dispatchMode: dispatchType === 'In-House' ? 'IN_HOUSE' : '3PL',
        provider: dispatchType === 'In-House' ? 'In-House Fleet' : selectedProvider,
        driverName: driverName.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        vehicleRegistration: vehicleReg.trim() || undefined,
        trackingUrl: trackingUrl.trim() || undefined,
        deliveryFee: parseFloat(deliveryFee) || 0,
        deliveryNotes: deliveryNotes.trim() || undefined,
      };

      await fetchApi(`/api/v1/delivery/${activeOrderId}/dispatch`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsModalOpen(false);
      setSelectedStaffId('');
      setDriverName('');
      setDriverPhone('');
      setVehicleReg('');
      setTrackingUrl('');
      setDeliveryNotes('');
      setActiveOrderId(null);
      fetchDeliveries();
    } catch (err: any) {
      alert(err.message || 'Dispatch failed');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCompleteDelivery = async (orderId: number) => {
    try {
      await fetchApi(`/api/v1/delivery/${orderId}/complete`, {
        method: 'PATCH',
      });
      fetchDeliveries();
    } catch (err: any) {
      alert(err.message || 'Failed to complete delivery');
    }
  };

  const handleInspectDelivery = async (record: DeliveryRecord) => {
    setInspectedDelivery({ ...record, items: [] });
    setIsLoadingDetail(true);
    try {
      const res = await fetchApi(`/api/v1/orders/${record.id}`);
      if (res?.data) {
        setInspectedDelivery({ ...record, items: res.data.items || [] });
      }
    } catch (err) {
      console.error('Failed to fetch delivery lines:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Enterprise Telemetry Calculations
  const metrics = useMemo(() => {
    const pendingCount = deliveries.filter((d) =>
      ['Confirmed', 'Sent-To-Kitchen', 'Preparing', 'Ready'].includes(d.status)
    ).length;
    const inTransitCount = deliveries.filter((d) => d.status === 'Dispatched').length;
    const completedCount = deliveries.filter((d) =>
      ['Delivered', 'Completed'].includes(d.status)
    ).length;
    const exceptionCount = deliveries.filter(
      (d) => d.status === 'Cancelled' || d.status === 'Failed'
    ).length;
    return { pendingCount, inTransitCount, completedCount, exceptionCount };
  }, [deliveries]);

  // Tab Filtering Logic
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        d.orderNumber.toLowerCase().includes(q) ||
        (d.driverName && d.driverName.toLowerCase().includes(q)) ||
        (d.provider && d.provider.toLowerCase().includes(q)) ||
        (d.customerName && d.customerName.toLowerCase().includes(q)) ||
        (d.customerPhone && d.customerPhone.includes(searchQuery));

      if (!matchesSearch) return false;

      if (activeTab === 'Pending') {
        return ['Confirmed', 'Sent-To-Kitchen', 'Preparing', 'Ready'].includes(d.status);
      }
      if (activeTab === 'InTransit') {
        return d.status === 'Dispatched';
      }
      if (activeTab === 'History') {
        return ['Delivered', 'Completed'].includes(d.status);
      }
      if (activeTab === 'Exceptions') {
        return ['Cancelled', 'Failed'].includes(d.status);
      }
      return true;
    });
  }, [deliveries, activeTab, searchQuery]);

  const getElapsedMinutes = (isoDate: string) =>
    Math.max(0, Math.floor((nowTick - new Date(isoDate).getTime()) / 60000));

  return (
    <div className="space-y-5 flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] font-sans">
      {/* Top Banner Navigation */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs shrink-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/orders"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1"
            >
              Order-to-Cash & Sales <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">TMS Dispatch Ledger</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Truck className="text-servora-core" size={22} /> Delivery & Transportation Management
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Coordinate last-mile 3PL carriers, assign in-house workforce riders, track SLA transit times, and confirm POD.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          <Link
            href="/pos"
            className="bg-servora-core text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus size={14} /> New Delivery Order
          </Link>
          <button
            onClick={fetchDeliveries}
            title="Refresh Control Tower"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* Telemetry Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 shrink-0">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Awaiting Dispatch</span>
            <h3 className="text-lg font-bold font-mono text-servora-navy mt-0.5">{metrics.pendingCount} Orders</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Active In-Transit</span>
            <h3 className="text-lg font-bold font-mono text-blue-600 mt-0.5">{metrics.inTransitCount} En Route</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Navigation size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Fulfilled History (POD)</span>
            <h3 className="text-lg font-bold font-mono text-emerald-700 mt-0.5">{metrics.completedCount} Delivered</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Exceptions / Cancelled</span>
            <h3 className="text-lg font-bold font-mono text-rose-600 mt-0.5">{metrics.exceptionCount} Issues</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* Control Tower Tabs & Multi-Dimensional Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs shrink-0 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {(['Pending', 'InTransit', 'History', 'Exceptions'] as LogisticsTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab
                  ? 'bg-white shadow-xs text-servora-navy'
                  : 'text-gray-500 hover:text-servora-navy'
              }`}
            >
              {tab === 'Pending' && `Awaiting Dispatch (${metrics.pendingCount})`}
              {tab === 'InTransit' && `In-Transit (${metrics.inTransitCount})`}
              {tab === 'History' && `POD History (${metrics.completedCount})`}
              {tab === 'Exceptions' && `Exceptions (${metrics.exceptionCount})`}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Branch Locations ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Carriers & Fleets</option>
            <option value="In-House Fleet">In-House Fleet</option>
            <option value="Uber Direct">Uber Direct</option>
            <option value="Bolt Delivery">Bolt Delivery</option>
            <option value="Glovo Courier">Glovo Courier</option>
            <option value="Little Logistics">Little Logistics</option>
          </select>

          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search order #, guest, rider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core transition-all"
            />
          </div>
        </div>
      </div>

      {/* Deliveries Display Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading && deliveries.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-servora-deepTeal animate-pulse">
            Loading transportation management records...
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 p-12">
            <Truck size={42} className="mb-3 opacity-20 text-servora-navy" />
            <p className="text-sm font-bold text-servora-navy">No records found in {activeTab} queue</p>
            <p className="text-xs text-gray-500 mt-1">
              Orders placed under &apos;Delivery &amp; 3PL Logistics&apos; or &apos;Delivery&apos; on the POS terminal appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-6">
            {filteredDeliveries.map((data) => {
              const isReady = data.status === 'Ready';
              const elapsedMins = getElapsedMinutes(data.dispatchedAt || data.createdAt);

              return (
                <div
                  key={data.id}
                  className={`bg-white rounded-2xl border p-5 flex flex-col space-y-3.5 shadow-xs ${
                    isReady ? 'border-emerald-300 ring-2 ring-emerald-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold font-mono text-sm text-servora-navy">{data.orderNumber}</h3>
                        {data.itemsCount !== undefined && data.itemsCount > 0 && (
                          <span className="text-[10px] font-mono font-bold bg-blue-50 text-servora-core px-1.5 py-0.2 rounded">
                            {data.itemsCount} items
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                        {new Date(data.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        ({elapsedMins}m elapsed)
                      </p>
                      {data.branchName && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Building2 size={10} /> {data.branchName}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-servora-core">
                        KES {parseFloat(data.total).toLocaleString()}
                      </div>
                      <span
                        className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                          data.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {data.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Recipient Info */}
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-servora-navy flex items-center gap-1.5">
                      <User size={12} className="text-servora-core" />
                      {data.customerName || 'Delivery Customer'}
                    </div>
                    {data.customerPhone && (
                      <div className="text-gray-500 font-mono flex items-center gap-1.5">
                        <Phone size={12} className="text-gray-400" /> {data.customerPhone}
                      </div>
                    )}
                    {data.notes && (
                      <p className="text-[11px] text-gray-500 italic line-clamp-2">{data.notes}</p>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    {activeTab === 'Pending' && (
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-gray-100 text-xs">
                        <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                          Kitchen State:
                        </span>
                        <span
                          className={`font-bold px-2.5 py-0.5 rounded-lg text-[11px] ${
                            isReady
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {data.status}
                        </span>
                      </div>
                    )}

                    {activeTab === 'InTransit' && (
                      <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 font-bold text-servora-navy">
                            <User size={13} className="text-servora-core" />{' '}
                            {data.driverName || 'Courier Dispatched'}
                          </div>
                          <span className="text-[10px] font-bold bg-white text-servora-core px-2 py-0.5 rounded-md border border-blue-200 uppercase">
                            {data.provider || '3PL'}
                          </span>
                        </div>
                        {data.driverPhone && (
                          <div className="flex items-center gap-1.5 text-gray-600 font-mono">
                            <Phone size={12} className="text-gray-400" /> {data.driverPhone}
                          </div>
                        )}
                        {data.trackingUrl && (
                          <div className="flex items-center gap-1.5 font-medium text-servora-core truncate pt-1">
                            <LinkIcon size={12} />
                            <a
                              href={data.trackingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline truncate"
                            >
                              {data.trackingUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'History' && (
                      <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <ShieldCheck size={14} className="text-emerald-600" /> Proof of Delivery Verified
                        </div>
                        <div className="text-gray-600 space-y-0.5">
                          <p>
                            <strong>Carrier:</strong> {data.provider || 'In-House Fleet'}
                          </p>
                          <p>
                            <strong>Courier:</strong> {data.driverName || 'Assigned Rider'}
                          </p>
                          {data.deliveredAt && (
                            <p className="text-[10px] text-gray-400 font-mono">
                              Delivered: {new Date(data.deliveredAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-1 flex gap-2">
                    <button
                      onClick={() => handleInspectDelivery(data)}
                      className="px-3 py-2 bg-slate-50 border border-gray-200 text-servora-navy font-bold rounded-xl hover:bg-gray-100 transition-colors text-xs cursor-pointer flex items-center gap-1"
                    >
                      <Eye size={13} /> Items
                    </button>

                    {activeTab === 'Pending' && (
                      <button
                        onClick={() => {
                          setActiveOrderId(data.id);
                          setIsModalOpen(true);
                        }}
                        className="flex-1 py-2 bg-servora-navy text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Navigation size={14} /> Dispatch Rider / 3PL
                      </button>
                    )}

                    {activeTab === 'InTransit' && (
                      <button
                        onClick={() => handleCompleteDelivery(data.id)}
                        className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs hover:bg-emerald-700 transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={15} /> Confirm Delivery (POD)
                      </button>
                    )}

                    {activeTab === 'History' && (
                      <div className="flex-1 text-center text-[11px] font-bold text-emerald-700 bg-emerald-50 py-2 rounded-xl border border-emerald-200">
                        POD Verified &bull; Closed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dispatch Modal (Zero Synthetic Mock Drivers) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Dispatch Logistics & Carrier Selection</h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Assign a 3PL courier partner or select an active workforce rider
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-servora-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setDispatchType('3PL')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  dispatchType === '3PL'
                    ? 'bg-white text-servora-core shadow-xs border border-gray-200'
                    : 'text-gray-500 hover:text-servora-navy'
                }`}
              >
                <Building2 size={14} /> 3PL Partner Network
              </button>
              <button
                type="button"
                onClick={() => setDispatchType('In-House')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  dispatchType === 'In-House'
                    ? 'bg-white text-servora-core shadow-xs border border-gray-200'
                    : 'text-gray-500 hover:text-servora-navy'
                }`}
              >
                <User size={14} /> In-House Fleet
              </button>
            </div>

            <form onSubmit={handleDispatch} className="space-y-3 text-xs">
              {dispatchType === '3PL' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-servora-navy mb-1">
                      3PL Carrier Partner *
                    </label>
                    <select
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:border-servora-core"
                    >
                      <option value="Uber Direct">Uber Direct</option>
                      <option value="Bolt Delivery">Bolt Delivery Kenya</option>
                      <option value="Glovo Courier">Glovo Courier</option>
                      <option value="Little Logistics">Little Cab Logistics</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-servora-navy mb-1">
                        Assigned Courier Name
                      </label>
                      <input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="From carrier app"
                        className="w-full p-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-servora-navy mb-1">
                        Courier Phone
                      </label>
                      <input
                        type="tel"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="07XX XXX XXX"
                        className="w-full p-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-servora-navy mb-1">
                      Live Carrier Tracking URL
                    </label>
                    <input
                      type="url"
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  {fleetStaff.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-bold text-servora-navy mb-1">
                        Select Workforce Rider (Optional)
                      </label>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => handleStaffSelect(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none"
                      >
                        <option value="">-- Enter Rider Details Manually --</option>
                        {fleetStaff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.fullName} ({s.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-servora-navy mb-1">
                        Rider Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="Enter rider name"
                        className="w-full p-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-servora-navy mb-1">
                        Rider Phone
                      </label>
                      <input
                        type="tel"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="07XX XXX XXX"
                        className="w-full p-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-servora-navy mb-1">
                      Bike / Vehicle Plate Registration
                    </label>
                    <input
                      type="text"
                      value={vehicleReg}
                      onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                      placeholder="e.g. KMGA 412B"
                      className="w-full p-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Dispatch Fee (KES)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Drop-Off Notes
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Gate code, landmark..."
                    className="w-full p-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRequesting}
                  className="px-4 py-2 text-xs font-bold text-white bg-servora-core rounded-xl hover:bg-blue-700 shadow-xs flex items-center justify-center gap-2 min-w-[140px] disabled:opacity-50 cursor-pointer"
                >
                  {isRequesting
                    ? 'Dispatching...'
                    : dispatchType === '3PL'
                    ? 'Confirm 3PL Dispatch'
                    : 'Assign & Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Package Line-Item Verification Modal */}
      {inspectedDelivery && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-servora-navy">
                  {inspectedDelivery.orderNumber}
                </h3>
                <p className="text-[11px] text-gray-500">
                  Delivery Manifest &bull; {inspectedDelivery.branchName || 'Main Outlet'}
                </p>
              </div>
              <button
                onClick={() => setInspectedDelivery(null)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-servora-navy block">Sealed Package Contents:</span>
              {isLoadingDetail ? (
                <div className="p-4 text-center text-gray-400 animate-pulse">Loading manifest...</div>
              ) : inspectedDelivery.items.length > 0 ? (
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {inspectedDelivery.items.map((line) => (
                    <div key={line.id} className="p-2.5 flex justify-between items-center">
                      <span className="font-bold text-servora-navy">
                        {Number(line.quantity)}x {line.itemName || `Item #${line.menuItemId}`}
                      </span>
                      <span className="font-mono font-bold">
                        KES {Number(line.totalPrice).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 italic">No line items recorded.</p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setInspectedDelivery(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}