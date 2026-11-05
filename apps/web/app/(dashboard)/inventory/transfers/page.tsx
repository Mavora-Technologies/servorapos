'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Truck, 
  Plus, 
  ArrowRight, 
  ChevronRight, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Package, 
  Building2, 
  Send, 
  Inbox, 
  Trash2,
  Snowflake,
  ShieldAlert,
  DollarSign,
  AlertOctagon,
  Gauge,
  UserCheck
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface TransferHeader {
  id: number;
  transferNumber: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'DISCREPANCY_COMPLETED' | 'CANCELLED';
  sourceBranchId: number;
  sourceBranchName: string;
  destinationBranchId: number;
  destinationBranchName: string;
  carrierVehiclePlate: string | null;
  driverName: string | null;
  dispatchTempProbe: string | null;
  arrivalTempProbe: string | null;
  totalValuation: string;
  transitLossValuation: string;
  notes: string | null;
  dispatchedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  requesterEmail: string | null;
}

interface TransferItemLine {
  id: number;
  inventoryItemId: number;
  itemName: string;
  itemSku: string | null;
  itemUnit: string;
  itemCategory: string;
  currentSourceStock: string;
  requestedQuantity: string;
  sentQuantity: string | null;
  receivedQuantity: string | null;
  transitLossQuantity: string | null;
  unitCost: string;
  batchNumber: string | null;
  notes: string | null;
}

interface TransferDetail extends TransferHeader {
  items: TransferItemLine[];
}

interface TransferSummary {
  totalTransfers: number;
  activeTransitCount: number;
  pendingCount: number;
  inTransitValuation: number;
}

interface BranchOption {
  id: number;
  name: string;
  code?: string;
}

interface InventoryOption {
  id: number;
  name: string;
  unit: string;
  currentStock: string;
  costPrice: string;
}

interface FleetOption {
  id: number;
  vehiclePlate: string;
  vehicleType: string;
  driverName: string | null;
  driverPhone: string | null;
  isRefrigerated: boolean;
}

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<TransferHeader[]>([]);
  const [summary, setSummary] = useState<TransferSummary | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryOption[]>([]);
  const [fleetList, setFleetList] = useState<FleetOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Inspect Modal State
  const [activeTransfer, setActiveTransfer] = useState<TransferDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Dynamic Waybill Action Buffers
  const [selectedFleetId, setSelectedFleetId] = useState<string>('');
  const [isCustomCarrier, setIsCustomCarrier] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [dispatchTemp, setDispatchTemp] = useState('');
  const [arrivalTemp, setArrivalTemp] = useState('');
  const [qtyBuffer, setQtyBuffer] = useState<Record<number, string>>({});
  const [batchBuffer, setBatchBuffer] = useState<Record<number, string>>({});

  // New Transfer Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [sourceBranchId, setSourceBranchId] = useState<string>('');
  const [destinationBranchId, setDestinationBranchId] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState('');
  const [requestItems, setRequestItems] = useState<{ inventoryItemId: number; requestedQuantity: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [transfersRes, branchesRes, invRes, fleetRes] = await Promise.all([
        fetchApi('/api/v1/inventory/transfers'),
        fetchApi('/api/v1/branches'),
        fetchApi('/api/v1/inventory'),
        fetchApi('/api/v1/inventory/transfers/fleet').catch(() => ({ data: [] })),
      ]);

      if (transfersRes?.data) {
        setTransfers(transfersRes.data.transfers || transfersRes.data || []);
        setSummary(transfersRes.data.summary || null);
      }
      if (branchesRes?.data && Array.isArray(branchesRes.data)) {
        setBranches(branchesRes.data);
        if (branchesRes.data.length >= 2) {
          setSourceBranchId(String(branchesRes.data[0].id));
          setDestinationBranchId(String(branchesRes.data[1].id));
        } else if (branchesRes.data.length === 1) {
          setSourceBranchId(String(branchesRes.data[0].id));
          setDestinationBranchId('');
        }
      }
      if (invRes?.data) setInventoryList(invRes.data);
      if (fleetRes?.data) setFleetList(fleetRes.data);
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openTransferDetails = async (id: number) => {
    setIsDetailLoading(true);
    try {
      const res = await fetchApi(`/api/v1/inventory/transfers/${id}`);
      if (res?.data) {
        setActiveTransfer(res.data);
        const qBuf: Record<number, string> = {};
        const bBuf: Record<number, string> = {};

        res.data.items.forEach((item: TransferItemLine) => {
          if (res.data.status === 'PENDING') {
            qBuf[item.id] = String(parseFloat(item.requestedQuantity));
            bBuf[item.id] = item.batchNumber || '';
          } else if (res.data.status === 'IN_TRANSIT') {
            qBuf[item.id] = String(parseFloat(item.sentQuantity || item.requestedQuantity));
          }
        });

        setQtyBuffer(qBuf);
        setBatchBuffer(bBuf);
        setSelectedFleetId('');
        setIsCustomCarrier(false);
        setVehiclePlate(res.data.carrierVehiclePlate || '');
        setDriverName(res.data.driverName || '');
        setDispatchTemp(res.data.dispatchTempProbe || '');
        setArrivalTemp('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to fetch details');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleFleetSelect = (fleetIdStr: string) => {
    setSelectedFleetId(fleetIdStr);
    if (fleetIdStr === 'CUSTOM') {
      setIsCustomCarrier(true);
      setVehiclePlate('');
      setDriverName('');
    } else {
      setIsCustomCarrier(false);
      const fleetItem = fleetList.find((f) => String(f.id) === fleetIdStr);
      if (fleetItem) {
        setVehiclePlate(fleetItem.vehiclePlate);
        setDriverName(fleetItem.driverName || '');
      } else {
        setVehiclePlate('');
        setDriverName('');
      }
    }
  };

  const handleAddItemToRequest = () => {
    if (inventoryList.length === 0) return;
    setRequestItems([
      ...requestItems,
      { inventoryItemId: inventoryList[0].id, requestedQuantity: 20 },
    ]);
  };

  const handleRemoveItemFromRequest = (idx: number) => {
    setRequestItems(requestItems.filter((_, i) => i !== idx));
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestItems.length === 0) {
      alert('Please add at least one inventory item to the transfer request');
      return;
    }
    if (sourceBranchId === destinationBranchId) {
      alert('Source and destination branches must be different');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await fetchApi('/api/v1/inventory/transfers', {
        method: 'POST',
        body: JSON.stringify({
          sourceBranchId: parseInt(sourceBranchId, 10),
          destinationBranchId: parseInt(destinationBranchId, 10),
          notes: transferNotes || undefined,
          items: requestItems,
        }),
      });

      setIsNewModalOpen(false);
      setRequestItems([]);
      setTransferNotes('');
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create transfer request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async () => {
    if (!activeTransfer) return;
    if (!vehiclePlate.trim()) {
      alert('Please select a registered company vehicle or specify a carrier vehicle plate number.');
      return;
    }
    if (!driverName.trim()) {
      alert('Please designate the assigned driver or transport agent name.');
      return;
    }

    if (!confirm(`Dispatch STO ${activeTransfer.transferNumber}? Stock will be moved into In-Transit custody.`)) return;

    try {
      const itemsPayload = activeTransfer.items.map((item) => ({
        itemId: item.id,
        sentQuantity: parseFloat(qtyBuffer[item.id] || item.requestedQuantity),
        batchNumber: batchBuffer[item.id]?.trim() || undefined,
      }));

      await fetchApi(`/api/v1/inventory/transfers/${activeTransfer.id}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({
          carrierVehiclePlate: vehiclePlate.trim(),
          driverName: driverName.trim(),
          dispatchTempProbe: dispatchTemp.trim() ? parseFloat(dispatchTemp) : undefined,
          items: itemsPayload,
        }),
      });

      alert('Consignment successfully placed into In-Transit Fleet Custody');
      setActiveTransfer(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch shipment');
    }
  };

  const handleReceive = async () => {
    if (!activeTransfer) return;
    if (!confirm(`Confirm arrival of STO ${activeTransfer.transferNumber}? Received items will deposit into ${activeTransfer.destinationBranchName} inventory.`)) return;

    try {
      const itemsPayload = activeTransfer.items.map((item) => ({
        itemId: item.id,
        receivedQuantity: parseFloat(qtyBuffer[item.id] || item.sentQuantity || '0'),
      }));

      await fetchApi(`/api/v1/inventory/transfers/${activeTransfer.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          arrivalTempProbe: arrivalTemp.trim() ? parseFloat(arrivalTemp) : undefined,
          items: itemsPayload,
        }),
      });

      alert('Consignment verified and deposited into branch storeroom.');
      setActiveTransfer(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to receive shipment');
    }
  };

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const matchesSearch =
        t.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.sourceBranchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.destinationBranchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.carrierVehiclePlate && t.carrierVehiclePlate.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.driverName && t.driverName.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'DISCREPANCY') {
        matchesStatus = t.status === 'DISCREPANCY_COMPLETED';
      } else if (statusFilter !== 'ALL') {
        matchesStatus = t.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [transfers, searchTerm, statusFilter]);

  const getStatusBadge = (status: TransferHeader['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
            <Clock size={11} /> STO REQUISITION PENDING
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
            <Truck size={11} /> IN FLEET TRANSIT
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
            <CheckCircle2 size={11} /> RECEIVED & STORED
          </span>
        );
      case 'DISCREPANCY_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
            <AlertOctagon size={11} /> SHRINKAGE WRITTEN-OFF
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-md">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/inventory"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Inventory Ledger <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Inter-Branch Logistics</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Stock Transport Orders (STO) & Consignments</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Coordinate commissary bulk replenishment, in-transit fleet custody, cold-chain waybills, and shrinkage write-offs.
          </p>
        </div>

        <button
          onClick={() => {
            handleAddItemToRequest();
            setIsNewModalOpen(true);
          }}
          className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> Raise Stock Transport Order
        </button>
      </div>

      {/* Aggregate Telemetry Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">In-Transit Fleet Custody</span>
              <h3 className="text-lg font-bold text-blue-700 mt-1">
                KES {summary.inTransitValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-blue-600 font-medium">Across {summary.activeTransitCount} active shipments</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Requisitions Pending Pick</span>
              <h3 className="text-lg font-bold text-amber-700 mt-1">{summary.pendingCount} Orders</h3>
              <span className="text-[11px] text-amber-600 font-medium">Awaiting warehouse dispatch</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Total Consignments</span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">{summary.totalTransfers} Records</h3>
              <span className="text-[11px] text-servora-deepTeal font-medium">Audited multi-branch transfers</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-50 text-servora-navy flex items-center justify-center">
              <Package size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search by STO #, branch, vehicle plate, or driver..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {[
            { id: 'ALL', label: 'All Transfers' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'IN_TRANSIT', label: 'In Transit' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'DISCREPANCY', label: 'Shrinkage Claim' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === tab.id ? 'bg-white shadow-xs text-servora-navy font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transfers Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Connecting to branch transfer logistics ledger...
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No transfer orders found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3.5 px-4">STO Number</th>
                  <th className="py-3.5 px-4">Origin &rarr; Destination Route</th>
                  <th className="py-3.5 px-4">Carrier & Fleet</th>
                  <th className="py-3.5 px-4 text-right">Transfer Valuation</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Dispatched Date</th>
                  <th className="py-3.5 px-4">Received Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-servora-navy font-mono">
                      {t.transferNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Building2 size={13} className="text-gray-400 shrink-0" />
                        <span>{t.sourceBranchName}</span>
                        <ArrowRight size={12} className="text-servora-core shrink-0" />
                        <span className="text-servora-core">{t.destinationBranchName}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {t.carrierVehiclePlate ? (
                        <div>
                          <span className="font-mono font-bold block">{t.carrierVehiclePlate}</span>
                          <span className="text-[10px] text-gray-400">Driver: {t.driverName || 'N/A'}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not Assigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-servora-navy">
                      KES {parseFloat(t.totalValuation).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      {parseFloat(t.transitLossValuation) > 0 && (
                        <span className="block text-[10px] text-rose-600">
                          -KES {parseFloat(t.transitLossValuation).toFixed(2)} (Loss)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(t.status)}
                    </td>

                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                      {t.dispatchedAt ? new Date(t.dispatchedAt).toLocaleDateString() : '-'}
                    </td>

                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                      {t.receivedAt ? new Date(t.receivedAt).toLocaleDateString() : '-'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openTransferDetails(t.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-servora-pale text-servora-core rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors"
                      >
                        Inspect Manifest &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT & DISPATCH/RECEIVE MODAL */}
      {activeTransfer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-servora-navy">{activeTransfer.transferNumber}</h3>
                  {getStatusBadge(activeTransfer.status)}
                </div>
                <p className="text-[11px] text-servora-deepTeal mt-0.5">
                  Route: <strong>{activeTransfer.sourceBranchName}</strong> &rarr; <strong>{activeTransfer.destinationBranchName}</strong>
                </p>
              </div>
              <button onClick={() => setActiveTransfer(null)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            {/* Logistics Waybill Parameters (When Pending Dispatch) */}
            {activeTransfer.status === 'PENDING' && (
              <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-servora-navy tracking-wider block">
                    Cold-Chain Logistics & Carrier Fleet Assignment
                  </span>
                  {fleetList.length > 0 && (
                    <span className="text-[10px] text-servora-deepTeal">
                      {fleetList.length} Registered Carrier Vehicles
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Company Fleet Vehicle</label>
                    <select
                      value={selectedFleetId}
                      onChange={(e) => handleFleetSelect(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-medium"
                    >
                      <option value="">Select registered fleet...</option>
                      {fleetList.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.vehiclePlate} ({f.vehicleType.replace('_', ' ')}) - {f.driverName || 'No Driver'}
                        </option>
                      ))}
                      <option value="CUSTOM">+ Specify Third-Party (3PL) Logistics</option>
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      Carrier Vehicle Registration Plate *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. KDL 901W"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Driver / Agent Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Francis Mwangi"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Dispatch Temp Probe (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 3.2"
                      value={dispatchTemp}
                      onChange={(e) => setDispatchTemp(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Arrival Cold-Chain & QC Intake (When In Transit) */}
            {activeTransfer.status === 'IN_TRANSIT' && (
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-amber-900 tracking-wider">
                    Arrival Cold-Chain & QC Intake
                  </span>
                  <span className="text-xs text-amber-800 font-mono">
                    Departure Temp: {activeTransfer.dispatchTempProbe ? `${activeTransfer.dispatchTempProbe}°C` : 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Arrival Temperature Probe (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 3.8"
                      value={arrivalTemp}
                      onChange={(e) => setArrivalTemp(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Carrier Transport Reference</label>
                    <span className="block text-xs font-mono font-bold text-servora-navy py-1.5">
                      {activeTransfer.carrierVehiclePlate || 'N/A'} (Driver: {activeTransfer.driverName || 'N/A'})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Line Items Manifest */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                Consignment Manifest Items ({activeTransfer.items.length})
              </span>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="p-3">Item</th>
                      <th className="p-3 text-right">Requested</th>
                      <th className="p-3 text-right">Dispatched</th>
                      <th className="p-3 text-right">Received</th>
                      {activeTransfer.status === 'PENDING' && <th className="p-3 text-center">Batch Lot #</th>}
                      {activeTransfer.status !== 'COMPLETED' && activeTransfer.status !== 'DISCREPANCY_COMPLETED' && (
                        <th className="p-3 text-center">Verification Input</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeTransfer.items.map((line) => {
                      const sentVal = parseFloat(line.sentQuantity || '0');
                      const recvVal = parseFloat(qtyBuffer[line.id] || line.sentQuantity || '0');
                      const transitShrinkage = Math.max(0, sentVal - recvVal);

                      return (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-servora-navy">
                            {line.itemName}
                            <span className="block text-[10px] text-gray-400 font-mono">
                              {line.itemSku || 'NO-SKU'} {line.batchNumber ? `(Lot: ${line.batchNumber})` : ''}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-medium">
                            {parseFloat(line.requestedQuantity)} {line.itemUnit}
                          </td>
                          <td className="p-3 text-right font-mono font-medium text-gray-600">
                            {line.sentQuantity ? `${parseFloat(line.sentQuantity)} ${line.itemUnit}` : '-'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">
                            {line.receivedQuantity ? `${parseFloat(line.receivedQuantity)} ${line.itemUnit}` : '-'}
                          </td>

                          {activeTransfer.status === 'PENDING' && (
                            <td className="p-3 text-center">
                              <input
                                type="text"
                                placeholder="e.g. LOT-B2"
                                value={batchBuffer[line.id] ?? ''}
                                onChange={(e) => setBatchBuffer({ ...batchBuffer, [line.id]: e.target.value })}
                                className="w-24 px-2 py-1 text-xs border border-gray-300 rounded-lg text-center font-mono font-semibold"
                              />
                            </td>
                          )}

                          {activeTransfer.status !== 'COMPLETED' && activeTransfer.status !== 'DISCREPANCY_COMPLETED' && (
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={qtyBuffer[line.id] ?? ''}
                                  onChange={(e) => setQtyBuffer({ ...qtyBuffer, [line.id]: e.target.value })}
                                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-lg text-center font-bold font-mono"
                                />
                                {activeTransfer.status === 'IN_TRANSIT' && transitShrinkage > 0 && (
                                  <span className="text-[10px] text-rose-600 font-bold block" title="Shrinkage written off to waste">
                                    -{transitShrinkage} {line.itemUnit}
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveTransfer(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {activeTransfer.status === 'PENDING' && (
                  <button
                    onClick={handleDispatch}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    <Send size={13} /> Confirm & Dispatch Waybill
                  </button>
                )}

                {activeTransfer.status === 'IN_TRANSIT' && (
                  <button
                    onClick={handleReceive}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <Inbox size={13} /> Inspect & Credit Stock
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TRANSFER REQUEST MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Initiate Stock Transport Order (STO)</h3>
                <p className="text-[11px] text-servora-deepTeal">Source replenishment stock from warehouse or outlet</p>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Source (Dispatching Branch) *</label>
                  <select
                    value={sourceBranchId}
                    onChange={(e) => setSourceBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="">Select dispatch origin...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.code ? `(${b.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Destination (Receiving Branch) *</label>
                  <select
                    value={destinationBranchId}
                    onChange={(e) => setDestinationBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="">Select receiving outlet...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.code ? `(${b.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {branches.length < 2 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center justify-between">
                  <span>At least two active branch locations are required to execute stock transfers.</span>
                  <Link href="/settings/branches" className="font-bold underline text-amber-900 ml-2">
                    Add Branch
                  </Link>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-servora-navy">Transfer Items</span>
                  <button
                    type="button"
                    onClick={handleAddItemToRequest}
                    className="text-xs font-semibold text-servora-core hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Ingredient
                  </button>
                </div>

                <div className="space-y-2">
                  {requestItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-gray-200">
                      <select
                        value={item.inventoryItemId}
                        onChange={(e) => {
                          const updated = [...requestItems];
                          updated[idx].inventoryItemId = parseInt(e.target.value, 10);
                          setRequestItems(updated);
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                      >
                        {inventoryList.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} ({inv.unit})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        required
                        placeholder="Qty"
                        value={item.requestedQuantity}
                        onChange={(e) => {
                          const updated = [...requestItems];
                          updated[idx].requestedQuantity = parseFloat(e.target.value) || 0;
                          setRequestItems(updated);
                        }}
                        className="w-24 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-center font-bold"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveItemFromRequest(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Transfer Notes / Logistics Ref</label>
                <input
                  type="text"
                  placeholder="e.g. Replenishment for weekend rush via Company Van"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Create Transfer Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}