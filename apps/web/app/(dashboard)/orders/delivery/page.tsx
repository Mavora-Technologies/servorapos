'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Clock, 
  CheckCircle2, 
  User, 
  Phone, 
  MapPin, 
  Navigation, 
  X, 
  Link as LinkIcon, 
  Building2, 
  ChevronRight, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  FileText,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface DeliveryRecord {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  createdAt: string;
  provider?: string;
  driverName?: string;
  driverPhone?: string;
  trackingUrl?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  deliveryNotes?: string;
}

type LogisticsTab = 'Pending' | 'InTransit' | 'History' | 'Exceptions';

export default function DeliveryPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LogisticsTab>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dispatch Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [dispatchType, setDispatchType] = useState<'In-House' | '3PL'>('3PL');
  
  // In-House Form
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');

  // 3PL Form
  const [selectedProvider, setSelectedProvider] = useState('Uber Direct');
  const [isRequesting, setIsRequesting] = useState(false);

  const fetchDeliveries = async () => {
    try {
      setIsLoading(true);
      const result = await fetchApi('/api/v1/delivery');
      if (result?.data) {
        setDeliveries(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch enterprise deliveries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrderId) return;
    
    setIsRequesting(true);
    try {
      const payload = dispatchType === 'In-House' 
        ? { provider: 'In-House Fleet', driverName: driverName.trim(), driverPhone: driverPhone.trim() }
        : { provider: selectedProvider };

      await fetchApi(`/api/v1/delivery/${activeOrderId}/dispatch`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      setIsModalOpen(false);
      setDriverName(''); 
      setDriverPhone(''); 
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

  // Enterprise Telemetry Calculations
  const metrics = useMemo(() => {
    const pendingCount = deliveries.filter(d => ['Confirmed', 'Preparing', 'Ready'].includes(d.status)).length;
    const inTransitCount = deliveries.filter(d => d.status === 'Dispatched').length;
    const completedCount = deliveries.filter(d => ['Delivered', 'Completed'].includes(d.status)).length;
    const exceptionCount = deliveries.filter(d => d.status === 'Cancelled' || d.status === 'Failed').length;
    return { pendingCount, inTransitCount, completedCount, exceptionCount };
  }, [deliveries]);

  // Tab Filtering Logic
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      const matchesSearch = 
        d.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.driverName && d.driverName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.provider && d.provider.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeTab === 'Pending') {
        return ['Confirmed', 'Preparing', 'Ready'].includes(d.status);
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

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)]">
      
      {/* Top Banner Navigation */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-400">Enterprise Logistics & 3PL Control Tower</span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-servora-navy">TMS Dispatch Ledger</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Truck className="text-servora-core" size={22} /> Delivery & Transportation Management
          </h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Monitor last-mile 3PL partner APIs, in-house rider fleets, live tracking, and proof-of-delivery (POD) history.
          </p>
        </div>

        <button 
          onClick={fetchDeliveries}
          className="bg-white border border-gray-200 text-servora-navy text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors shadow-xs"
        >
          Refresh Control Tower
        </button>
      </div>

      {/* Telemetry Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Awaiting Dispatch</span>
            <h3 className="text-base font-bold text-servora-navy mt-0.5">{metrics.pendingCount} Orders</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Active In-Transit</span>
            <h3 className="text-base font-bold text-blue-600 mt-0.5">{metrics.inTransitCount} En Route</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Navigation size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Fulfilled History (POD)</span>
            <h3 className="text-base font-bold text-emerald-700 mt-0.5">{metrics.completedCount} Delivered</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Exceptions / Failed</span>
            <h3 className="text-base font-bold text-rose-600 mt-0.5">{metrics.exceptionCount} Issues</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* Control Tower Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl w-full sm:w-auto overflow-x-auto">
          {(['Pending', 'InTransit', 'History', 'Exceptions'] as LogisticsTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
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

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input 
            type="text" 
            placeholder="Search order #, driver, carrier..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-servora-core/20 focus:border-servora-core transition-all"
          />
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
            <p className="text-xs text-gray-500 mt-1">Delivery tickets assigned to orders will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-6">
            {filteredDeliveries.map(data => {
              const isReady = data.status === 'Ready';
              const isInTransit = data.status === 'Dispatched';
              const isCompleted = ['Delivered', 'Completed'].includes(data.status);

              return (
                <div key={data.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col space-y-4 shadow-xs">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="font-bold font-mono text-sm text-servora-navy">{data.orderNumber}</h3>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                        Created: {new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-servora-core">KES {parseFloat(data.total).toLocaleString()}</div>
                      <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                        data.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {data.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2.5">
                    {activeTab === 'Pending' && (
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-gray-100 text-xs">
                        <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Kitchen State:</span>
                        <span className={`font-bold px-2.5 py-1 rounded-lg text-[11px] ${
                          isReady 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {data.status}
                        </span>
                      </div>
                    )}

                    {activeTab === 'InTransit' && (
                      <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 font-bold text-servora-navy">
                            <User size={13} className="text-servora-core" /> {data.driverName || 'Courier Assigned'}
                          </div>
                          <span className="text-[10px] font-bold bg-white text-servora-core px-2 py-0.5 rounded-md border border-blue-200 uppercase">
                            {data.provider || '3PL'}
                          </span>
                        </div>
                        {data.driverPhone && (
                          <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                            <Phone size={13} className="text-gray-400" /> {data.driverPhone}
                          </div>
                        )}
                        {data.trackingUrl && (
                          <div className="flex items-center gap-1.5 font-medium text-servora-core truncate pt-1">
                            <LinkIcon size={13} /> 
                            <a href={data.trackingUrl} target="_blank" rel="noreferrer" className="hover:underline truncate">{data.trackingUrl}</a>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'History' && (
                      <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <ShieldCheck size={14} className="text-emerald-600" /> Proof of Delivery Verified
                        </div>
                        <div className="text-gray-600 space-y-1">
                          <p><strong>Carrier:</strong> {data.provider || 'In-House'}</p>
                          <p><strong>Courier:</strong> {data.driverName || 'Standard Delivery'}</p>
                          <p className="text-[10px] text-gray-400 font-mono">Fulfilled at: {new Date().toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-1">
                    {activeTab === 'Pending' && (
                      <button 
                        onClick={() => { setActiveOrderId(data.id); setIsModalOpen(true); }}
                        disabled={!isReady}
                        className="w-full py-2.5 bg-servora-navy text-white font-bold rounded-xl hover:bg-slate-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors text-xs flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Navigation size={14} /> Dispatch Rider / 3PL API
                      </button>
                    )}

                    {activeTab === 'InTransit' && (
                      <button 
                        onClick={() => handleCompleteDelivery(data.id)}
                        className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-xs hover:bg-emerald-700 transition-colors text-xs flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={15} /> Confirm Delivery (POD)
                      </button>
                    )}

                    {activeTab === 'History' && (
                      <div className="text-center text-[11px] font-bold text-emerald-700 bg-emerald-50 py-2 rounded-xl border border-emerald-200">
                        Archive Verified &bull; Closed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced Dispatch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Dispatch Logistics & Carrier Selection</h3>
                <p className="text-[11px] text-servora-deepTeal">Connect with 3PL API or assign local driver</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border border-gray-200">
              <button 
                onClick={() => setDispatchType('3PL')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  dispatchType === '3PL' ? 'bg-white text-servora-core shadow-xs border border-gray-200' : 'text-gray-500 hover:text-servora-navy'
                }`}
              >
                <Building2 size={14} /> 3PL API Network
              </button>
              <button 
                onClick={() => setDispatchType('In-House')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  dispatchType === 'In-House' ? 'bg-white text-servora-core shadow-xs border border-gray-200' : 'text-gray-500 hover:text-servora-navy'
                }`}
              >
                <User size={14} /> In-House Fleet
              </button>
            </div>

            <form onSubmit={handleDispatch} className="space-y-4">
              {dispatchType === '3PL' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-servora-navy mb-1">Select 3PL Carrier API *</label>
                    <select 
                      value={selectedProvider} 
                      onChange={e => setSelectedProvider(e.target.value)} 
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-servora-core"
                    >
                      <option value="Uber Direct">Uber Direct (Automated Dispatch)</option>
                      <option value="Bolt Delivery">Bolt Delivery Kenya</option>
                      <option value="Glovo Courier">Glovo Courier API</option>
                      <option value="Little Logistics">Little Cab Logistics</option>
                    </select>
                  </div>
                  <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-[11px] text-servora-deepTeal leading-relaxed">
                    Triggering dispatch pushes order weight, delivery address, and customer contact directly to the {selectedProvider} webhook endpoint, returning a live tracking URL.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-servora-navy mb-1">Rider Name / Call Sign *</label>
                    <input 
                      type="text" 
                      required 
                      value={driverName} 
                      onChange={e => setDriverName(e.target.value)} 
                      placeholder="e.g. Ochieng (Bodaboda 04)" 
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:border-servora-core focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-servora-navy mb-1">Rider Phone Number</label>
                    <input 
                      type="tel" 
                      value={driverPhone} 
                      onChange={e => setDriverPhone(e.target.value)} 
                      placeholder="07XX XXX XXX" 
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold focus:border-servora-core focus:outline-none" 
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isRequesting} 
                  className="px-4 py-2 text-xs font-bold text-white bg-servora-core rounded-xl hover:bg-blue-700 shadow-xs flex items-center justify-center gap-2 min-w-[140px] disabled:opacity-50"
                >
                  {isRequesting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    dispatchType === '3PL' ? 'Request 3PL Rider' : 'Assign & Dispatch'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}