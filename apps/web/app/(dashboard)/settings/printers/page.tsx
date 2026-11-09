'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Printer,
  Wifi,
  ChevronRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
  Building2,
  Settings2,
  Trash2,
  Edit2,
  Power,
  X,
  ChefHat,
  Wallet,
  Wine,
  Tag,
  Activity,
  Radio,
  FileText,
  Volume2,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface NetworkPrinter {
  id: number;
  branchId: number;
  branchName: string;
  branchCode: string;
  name: string;
  deviceType: 'RECEIPT' | 'KITCHEN' | 'BAR' | 'LABEL' | 'FISCAL_BOX';
  connectionType: 'NETWORK_TCP' | 'USB' | 'BLUETOOTH' | 'SERIAL';
  ipAddress: string | null;
  port: number;
  macAddress: string | null;
  driverProtocol: 'ESC_POS' | 'STAR_LINE' | 'TSPL' | 'EPSON_XML';
  paperWidth: '80MM' | '58MM';
  autoCut: boolean;
  openCashDrawerOnPrint: boolean;
  beepOnPrint: boolean;
  beepCount: number;
  backupPrinterId: number | null;
  backupPrinterName: string | null;
  assignedStations: string[];
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'UNKNOWN';
  lastPingAt: string | null;
  isActive: boolean;
}

interface KitchenStationOption {
  id: number;
  name: string;
  code: string;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

const DEVICE_TYPE_ICONS: Record<NetworkPrinter['deviceType'], any> = {
  RECEIPT: Wallet,
  KITCHEN: ChefHat,
  BAR: Wine,
  LABEL: Tag,
  FISCAL_BOX: Server,
};

export default function PrintersPage() {
  const [printers, setPrinters] = useState<NetworkPrinter[]>([]);
  const [availableStations, setAvailableStations] = useState<KitchenStationOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals & Action States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<NetworkPrinter | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTestingId, setActiveTestingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    branchId: '',
    name: '',
    deviceType: 'RECEIPT' as NetworkPrinter['deviceType'],
    connectionType: 'NETWORK_TCP' as NetworkPrinter['connectionType'],
    ipAddress: '',
    port: 9100,
    macAddress: '',
    driverProtocol: 'ESC_POS' as NetworkPrinter['driverProtocol'],
    paperWidth: '80MM' as NetworkPrinter['paperWidth'],
    autoCut: true,
    openCashDrawerOnPrint: false,
    beepOnPrint: false,
    beepCount: 1,
    backupPrinterId: '',
    assignedStations: [] as string[],
    isActive: true,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const queryParam = selectedBranchId !== 'ALL' ? `?branchId=${selectedBranchId}` : '';
      const [printersRes, branchRes] = await Promise.all([
        fetchApi(`/api/v1/settings/printers${queryParam}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (printersRes?.data) {
        if (Array.isArray(printersRes.data)) {
          setPrinters(printersRes.data);
        } else {
          setPrinters(printersRes.data.printers || []);
          setAvailableStations(printersRes.data.availableStations || []);
        }
      }
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load printer configurations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  const telemetry = useMemo(() => {
    const totalDevices = printers.length;
    const onlineDevices = printers.filter((p) => p.status === 'ONLINE').length;
    const kitchenEndpoints = printers.filter((p) => p.deviceType === 'KITCHEN').length;
    const tillReceiptPrinters = printers.filter((p) => p.deviceType === 'RECEIPT').length;

    return {
      totalDevices,
      onlineDevices,
      kitchenEndpoints,
      tillReceiptPrinters,
    };
  }, [printers]);

  const filteredPrinters = useMemo(() => {
    return printers.filter((p) => {
      const matchesBranch = selectedBranchId === 'ALL' || String(p.branchId) === selectedBranchId;
      const matchesType = typeFilter === 'ALL' || p.deviceType === typeFilter;
      return matchesBranch && matchesType;
    });
  }, [printers, selectedBranchId, typeFilter]);

  const openCreateModal = () => {
    setEditingPrinter(null);
    setFormError(null);
    setFormData({
      branchId: branches[0]?.id ? String(branches[0].id) : '',
      name: '',
      deviceType: 'RECEIPT',
      connectionType: 'NETWORK_TCP',
      ipAddress: '',
      port: 9100,
      macAddress: '',
      driverProtocol: 'ESC_POS',
      paperWidth: '80MM',
      autoCut: true,
      openCashDrawerOnPrint: false,
      beepOnPrint: false,
      beepCount: 1,
      backupPrinterId: '',
      assignedStations: [],
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: NetworkPrinter) => {
    setEditingPrinter(p);
    setFormError(null);
    setFormData({
      branchId: String(p.branchId),
      name: p.name,
      deviceType: p.deviceType,
      connectionType: p.connectionType,
      ipAddress: p.ipAddress || '',
      port: p.port,
      macAddress: p.macAddress || '',
      driverProtocol: p.driverProtocol,
      paperWidth: p.paperWidth,
      autoCut: p.autoCut,
      openCashDrawerOnPrint: p.openCashDrawerOnPrint,
      beepOnPrint: p.beepOnPrint,
      beepCount: p.beepCount,
      backupPrinterId: p.backupPrinterId ? String(p.backupPrinterId) : '',
      assignedStations: p.assignedStations || [],
      isActive: p.isActive,
    });
    setIsModalOpen(true);
  };

  const toggleStation = (stationCode: string) => {
    setFormData((prev) => {
      const exists = prev.assignedStations.includes(stationCode);
      return {
        ...prev,
        assignedStations: exists
          ? prev.assignedStations.filter((s) => s !== stationCode)
          : [...prev.assignedStations, stationCode],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        branchId: parseInt(formData.branchId, 10),
        backupPrinterId: formData.backupPrinterId ? parseInt(formData.backupPrinterId, 10) : null,
      };

      if (editingPrinter) {
        await fetchApi(`/api/v1/settings/printers/${editingPrinter.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/api/v1/settings/printers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      setToastMessage({ text: 'Printer hardware parameters saved.', type: 'success' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save printer hardware');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePing = async (id: number) => {
    try {
      setActiveTestingId(id);
      const res = await fetchApi(`/api/v1/settings/printers/${id}/ping`, { method: 'POST' });
      setToastMessage({ text: res.message, type: 'success' });
      loadData();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Printer ping failed', type: 'error' });
    } finally {
      setActiveTestingId(null);
    }
  };

  const handleTestPrint = async (id: number) => {
    try {
      setActiveTestingId(id);
      const res = await fetchApi('/api/v1/settings/printers/test-print', {
        method: 'POST',
        body: JSON.stringify({ printerId: id }),
      });
      setToastMessage({ text: res.message, type: 'success' });
      loadData();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Test print failed', type: 'error' });
    } finally {
      setActiveTestingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this printer profile?')) return;
    try {
      await fetchApi(`/api/v1/settings/printers/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete printer');
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Enterprise Control <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Hardware Topology & Printing</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Network POS Printers & Kitchen Routing Hub</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Configure LAN thermal receipt printers, ESC/POS kitchen ticket dispatchers, failover redirects, and cash drawer triggers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Register Hardware Device
          </button>
          <button
            onClick={loadData}
            title="Refresh Fleet"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. HARDWARE TELEMETRY TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Devices</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">{telemetry.totalDevices}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Printer size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Online Fleet</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {telemetry.onlineDevices} Active
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Wifi size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Kitchen Endpoints</span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">{telemetry.kitchenEndpoints}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <ChefHat size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Receipt Cutters</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">{telemetry.tillReceiptPrinters}</p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Wallet size={18} />
          </div>
        </div>
      </div>

      {/* 3. FILTER & LOCATION TOOLBAR */}
      <div className="flex flex-wrap items-center gap-2.5 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        {branches.length > 0 && (
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="ALL">All Branch Locations</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        )}

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
        >
          <option value="ALL">All Device Roles</option>
          <option value="RECEIPT">Customer Receipt Printers</option>
          <option value="KITCHEN">Kitchen Production Printers</option>
          <option value="BAR">Bar Dispense Printers</option>
          <option value="LABEL">Shelf / Sticky Label Printers</option>
          <option value="FISCAL_BOX">Fiscal Control Units</option>
        </select>
      </div>

      {/* 4. HARDWARE FLEET GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrinters.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300 text-xs italic space-y-2">
            <Printer size={32} className="mx-auto opacity-30 text-servora-navy" />
            <p className="font-bold text-servora-navy text-sm not-italic">No Network Printers Registered</p>
            <p className="not-italic text-gray-400">
              Add your thermal receipt printers, bar dispenses, or kitchen station endpoints above.
            </p>
          </div>
        ) : (
          filteredPrinters.map((p) => {
            const Icon = DEVICE_TYPE_ICONS[p.deviceType] || Printer;
            const isOnline = p.status === 'ONLINE';
            const isBusy = activeTestingId === p.id;

            return (
              <div
                key={p.id}
                className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center shrink-0">
                        <Icon size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-servora-navy text-sm leading-tight">{p.name}</h3>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {p.branchName} ({p.branchCode})
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${
                        isOnline
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      {p.status}
                    </span>
                  </div>

                  {/* Network & Hardware Spec Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-3 border-b border-gray-100">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Network Endpoint</span>
                      <span className="font-mono font-bold text-servora-navy block truncate">
                        {p.ipAddress ? `${p.ipAddress}:${p.port}` : `${p.connectionType} Connection`}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Protocol & Paper</span>
                      <span className="font-mono text-gray-700 block">
                        {p.driverProtocol} &bull; {p.paperWidth}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Drawer Kick / Cut</span>
                      <span className="text-gray-700 block">
                        {p.openCashDrawerOnPrint ? 'Kick Drawer' : 'No Drawer'} &bull; {p.autoCut ? 'Auto-Cut' : 'Tear'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Buzzer Alert</span>
                      <span className="text-gray-700 block">
                        {p.beepOnPrint ? `${p.beepCount} Beeps` : 'Silent'}
                      </span>
                    </div>
                  </div>

                  {/* Kitchen Prep Stations */}
                  {p.assignedStations && p.assignedStations.length > 0 && (
                    <div className="pt-2.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">
                        Assigned Prep Stations
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {p.assignedStations.map((stationCode) => (
                          <span
                            key={stationCode}
                            className="px-1.5 py-0.5 bg-slate-100 text-servora-navy border border-gray-200 rounded text-[9.5px] font-mono font-bold"
                          >
                            {stationCode}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Failover Device */}
                  {p.backupPrinterName && (
                    <div className="pt-2 text-[11px] text-amber-700 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      <span>Failover: {p.backupPrinterName}</span>
                    </div>
                  )}
                </div>

                {/* Diagnostics & Operations Action Bar */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePing(p.id)}
                      disabled={isBusy}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-gray-100 text-servora-navy border border-gray-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Zap size={12} className={isBusy ? 'animate-spin text-servora-core' : 'text-servora-core'} />
                      <span>Ping</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestPrint(p.id)}
                      disabled={isBusy}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-servora-core border border-blue-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <FileText size={12} />
                      <span>Test Slip</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="p-1.5 text-gray-500 hover:text-servora-core hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. MODAL: PROVISION / EDIT PRINTER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingPrinter ? 'Configure Network Hardware Device' : 'Register Network POS Printer'}
                </h3>
                <p className="text-[11px] text-gray-400">Configure TCP/IP address, ESC/POS protocol, and station triggers</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Device Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pass Expediter Printer"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Operating Branch *</label>
                  <select
                    required
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="">Select Branch...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Device Role *</label>
                  <select
                    value={formData.deviceType}
                    onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as any })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="RECEIPT">Receipt Terminal</option>
                    <option value="KITCHEN">Kitchen Expediter</option>
                    <option value="BAR">Bar Dispense</option>
                    <option value="LABEL">Barcode Label</option>
                    <option value="FISCAL_BOX">Fiscal Control Box</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Protocol *</label>
                  <select
                    value={formData.driverProtocol}
                    onChange={(e) => setFormData({ ...formData, driverProtocol: e.target.value as any })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="ESC_POS">Epson ESC/POS</option>
                    <option value="STAR_LINE">Star Line Mode</option>
                    <option value="TSPL">TSPL Barcode</option>
                    <option value="EPSON_XML">ePOS XML</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Paper Roll Width</label>
                  <select
                    value={formData.paperWidth}
                    onChange={(e) => setFormData({ ...formData, paperWidth: e.target.value as any })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="80MM">80mm Thermal</option>
                    <option value="58MM">58mm Compact</option>
                  </select>
                </div>
              </div>

              {/* Network Parameters */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2.5">
                <span className="font-bold text-servora-navy block text-xs">TCP/IP Network Parameters</span>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">IPv4 Address (Static) *</label>
                    <input
                      type="text"
                      placeholder="192.168.1.100"
                      value={formData.ipAddress}
                      onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Raw Port</label>
                    <input
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Hardware Actions & Triggers */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <span className="font-bold text-servora-navy block text-xs">Automated Hardware Peripherals</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoCut}
                      onChange={(e) => setFormData({ ...formData, autoCut: e.target.checked })}
                      className="rounded"
                    />
                    <span>Auto-Cut Thermal Paper</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.openCashDrawerOnPrint}
                      onChange={(e) => setFormData({ ...formData, openCashDrawerOnPrint: e.target.checked })}
                      className="rounded"
                    />
                    <span>Kick Cash Drawer (24V Pulse)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.beepOnPrint}
                      onChange={(e) => setFormData({ ...formData, beepOnPrint: e.target.checked })}
                      className="rounded"
                    />
                    <span>Buzzer Chime on Arrival</span>
                  </label>
                </div>
              </div>

              {/* Dynamic Kitchen Prep Stations Routing Tags */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-servora-navy">
                    Assigned Kitchen Production Stations
                  </label>
                  <Link
                    href="/settings/kitchen"
                    className="text-[10px] text-servora-core hover:underline flex items-center gap-0.5 font-bold"
                  >
                    Configure Stations &rarr;
                  </Link>
                </div>

                {availableStations.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-dashed border-gray-200 rounded-xl text-center">
                    <p className="text-[11px] text-gray-500">
                      No KDS stations registered for this workspace yet.
                    </p>
                    <Link
                      href="/settings/kitchen"
                      className="text-[11px] text-servora-core font-bold hover:underline inline-block mt-1"
                    >
                      Define Stations in Kitchen Settings &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-gray-200 rounded-xl">
                    {availableStations.map((station) => {
                      const isSelected = formData.assignedStations.includes(station.code);
                      return (
                        <button
                          key={station.id}
                          type="button"
                          onClick={() => toggleStation(station.code)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-servora-core text-white shadow-xs'
                              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {station.name} ({station.code})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Failover Backup Printer */}
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Automatic Failover Device (Offline Redirect)
                </label>
                <select
                  value={formData.backupPrinterId}
                  onChange={(e) => setFormData({ ...formData, backupPrinterId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  <option value="">No Failover (Alert Cashier on Error)</option>
                  {printers
                    .filter((p) => !editingPrinter || p.id !== editingPrinter.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.ipAddress || 'Local'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Registering...' : 'Save Hardware Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}