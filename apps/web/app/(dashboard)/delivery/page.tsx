'use client';

import { useState, useEffect } from 'react';
import { Truck, Clock, CheckCircle2, User, Phone, MapPin, Navigation, X, Link as LinkIcon, Building2 } from 'lucide-react';

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
}

export default function DeliveryPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
      const token = localStorage.getItem('servora_token');
      const res = await fetch('http://localhost:8000/api/v1/delivery', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch deliveries');
      const result = await res.json();
      setDeliveries(result.data);
    } catch (error) {
      console.error(error);
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
      const token = localStorage.getItem('servora_token');
      
      const payload = dispatchType === 'In-House' 
        ? { provider: 'In-House', driverName, driverPhone }
        : { provider: selectedProvider }; // Backend will auto-fill driver details via 3PL API

      const res = await fetch(`http://localhost:8000/api/v1/delivery/${activeOrderId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to dispatch order');
      
      setIsModalOpen(false);
      setDriverName(''); setDriverPhone(''); setActiveOrderId(null);
      fetchDeliveries();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCompleteDelivery = async (orderId: number) => {
    try {
      const token = localStorage.getItem('servora_token');
      await fetch(`http://localhost:8000/api/v1/delivery/${orderId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      fetchDeliveries();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const pendingDispatch = deliveries.filter(d => ['Confirmed', 'Preparing', 'Ready'].includes(d.status));
  const outForDelivery = deliveries.filter(d => d.status === 'Dispatched');

  const DeliveryCard = ({ data, type }: { data: DeliveryRecord, type: 'pending' | 'out' }) => (
    <div className={`bg-white rounded-xl border p-4 flex flex-col space-y-4 shadow-sm transition-all ${type === 'pending' && data.status === 'Ready' ? 'border-servora-core ring-1 ring-servora-core/30' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start border-b border-gray-100 pb-3">
        <div>
          <h3 className="font-bold text-lg text-servora-navy">{data.orderNumber}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{new Date(data.createdAt).toLocaleTimeString()}</p>
        </div>
        <div className="text-right">
          <div className="font-bold text-servora-core">KES {parseFloat(data.total).toLocaleString()}</div>
          <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${data.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {data.paymentStatus}
          </span>
        </div>
      </div>

      <div className="flex-1">
        {type === 'pending' ? (
          <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kitchen:</span>
            <span className={`text-xs font-bold px-2 py-1 rounded ${data.status === 'Ready' ? 'bg-green-100 text-green-700' : data.status === 'Preparing' ? 'bg-blue-100 text-blue-700 animate-pulse' : 'bg-gray-200 text-gray-600'}`}>
              {data.status}
            </span>
          </div>
        ) : (
          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 space-y-2.5">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 text-sm font-bold text-servora-navy">
                <User size={16} className="text-servora-core" /> {data.driverName}
              </div>
              <span className="text-[10px] font-bold bg-white text-blue-700 px-2 py-0.5 rounded border border-blue-200 shadow-sm uppercase">
                {data.provider}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
              <Phone size={14} className="text-gray-400" /> {data.driverPhone || 'No phone provided'}
            </div>
            {data.trackingUrl && (
              <div className="flex items-center gap-2 text-xs font-medium text-servora-core">
                <LinkIcon size={14} /> <a href={data.trackingUrl} target="_blank" rel="noreferrer" className="hover:underline line-clamp-1">{data.trackingUrl}</a>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto pt-2">
        {type === 'pending' ? (
          <button 
            onClick={() => { setActiveOrderId(data.id); setIsModalOpen(true); }}
            disabled={data.status !== 'Ready'}
            className="w-full py-2.5 bg-servora-navy text-white font-bold rounded-lg hover:bg-slate-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Navigation size={16} /> Dispatch Rider
          </button>
        ) : (
          <button 
            onClick={() => handleCompleteDelivery(data.id)}
            className="w-full py-2.5 bg-green-600 text-white font-bold rounded-lg shadow-sm hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} /> Mark as Delivered
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-servora-navy flex items-center gap-2">
          <Truck className="text-servora-core" size={24} /> Delivery & Dispatch
        </h1>
        <p className="text-servora-deepTeal text-xs mt-1">Integrate with 3PL logistics (Uber, Bolt, Glovo) or assign local riders.</p>
      </div>

      {isLoading && deliveries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-servora-deepTeal text-sm">Loading deliveries...</div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0 overflow-hidden">
          <div className="flex flex-col bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-white shrink-0">
              <h3 className="text-sm font-bold text-servora-navy flex items-center gap-2">
                <MapPin size={16} className="text-gray-400" /> Awaiting Dispatch ({pendingDispatch.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {pendingDispatch.map(order => <DeliveryCard key={order.id} data={order} type="pending" />)}
              {pendingDispatch.length === 0 && <p className="text-xs text-gray-400 text-center py-8">No orders awaiting dispatch.</p>}
            </div>
          </div>

          <div className="flex flex-col bg-blue-50/30 rounded-2xl border border-blue-100 overflow-hidden">
            <div className="p-4 border-b border-blue-100 bg-white shrink-0">
              <h3 className="text-sm font-bold text-servora-navy flex items-center gap-2">
                <Truck size={16} className="text-blue-500" /> Out for Delivery ({outForDelivery.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {outForDelivery.map(order => <DeliveryCard key={order.id} data={order} type="out" />)}
              {outForDelivery.length === 0 && <p className="text-xs text-gray-400 text-center py-8">No active deliveries on the road.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Dispatch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-servora-navy">Dispatch Logistics</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="flex gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
              <button 
                onClick={() => setDispatchType('3PL')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${dispatchType === '3PL' ? 'bg-white text-servora-core shadow-sm border border-gray-200' : 'text-gray-500 hover:text-servora-navy'}`}
              >
                <Building2 size={14} /> 3PL Network
              </button>
              <button 
                onClick={() => setDispatchType('In-House')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${dispatchType === 'In-House' ? 'bg-white text-servora-core shadow-sm border border-gray-200' : 'text-gray-500 hover:text-servora-navy'}`}
              >
                <User size={14} /> Local Rider
              </button>
            </div>

            <form onSubmit={handleDispatch} className="space-y-4">
              {dispatchType === '3PL' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-servora-navy mb-1">Select Logistics Partner</label>
                    <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:border-servora-core">
                      <option value="Uber Direct">Uber Direct (API Integration)</option>
                      <option value="Bolt Delivery">Bolt Delivery Kenya</option>
                      <option value="Glovo">Glovo Courier</option>
                      <option value="Little Cab">Little Logistics</option>
                    </select>
                  </div>
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-xs text-gray-600">
                    <p>Requesting a rider will automatically generate a tracking link and assign the nearest available rider from the {selectedProvider} network.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-servora-navy mb-1">Local Rider Name</label>
                    <input type="text" required value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="e.g. Ochieng (Bodaboda)" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-servora-navy mb-1">Rider Phone (Optional)</label>
                    <input type="tel" value={driverPhone} onChange={e => setDriverPhone(e.target.value)} placeholder="07XX XXX XXX" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={isRequesting} className="px-4 py-2 text-xs font-medium text-white bg-servora-core rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 min-w-[140px]">
                  {isRequesting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : (dispatchType === '3PL' ? 'Request 3PL Rider' : 'Dispatch Rider')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}