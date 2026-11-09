'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Monitor,
  Tablet,
  ChefHat,
  Smartphone,
  ChevronRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Key,
  Trash2,
  Edit2,
  X,
  Building2,
  Activity,
  Layers,
  Printer,
  Wallet,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface PosDevice {
  id: number;
  branchId: number;
  branchName: string;
  branchCode: string;
  name: string;
  deviceCode: string;
  deviceType: 'POS_TERMINAL' | 'KDS_DISPLAY' | 'WAITER_TABLET' | 'SELF_ORDER_KIOSK' | 'BARCODE_SCANNER' | 'MANAGER_STATION';
  operatingSystem: 'ANDROID' | 'IOS' | 'WINDOWS' | 'LINUX' | 'WEB_BROWSER';
  hardwareFingerprint: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  appVersion: string | null;
  assignedDrawerId: number | null;
  assignedDrawerName: string | null;
  assignedKitchenStationId: number | null;
  assignedKitchenStationName: string | null;
  assignedReceiptPrinterId: number | null;
  assignedReceiptPrinterName: string | null;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'DECOMMISSIONED';
  isLocked: boolean;
  allowOfflineSales: boolean;
  lastHeartbeatAt: string | null;
  lastHeartbeatIp: string | null;
  registeredByUserName: string | null;
  createdAt: string;
}

interface TelemetryData {
  totalDevices: number;
  activeDevices: number;
  lockedDevices: number;
  kdsDisplays: number;
  handheldTablets: number;
}

interface ContextData {
  drawers: { id: number; name: string; branchId: number }[];
  stations: { id: number; name: string; code: string; branchId: number }[];
  printers: { id: number; name: string; branchId: number }[];
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

const DEVICE_TYPE_ICONS: Record<PosDevice['deviceType'], any> = {
  POS_TERMINAL: Monitor,
  KDS_DISPLAY: ChefHat,
  WAITER_TABLET: Tablet,
  SELF_ORDER_KIOSK: Layers,
  BARCODE_SCANNER: Zap,
  MANAGER_STATION: ShieldCheck,
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<PosDevice[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [context, setContext] = useState<ContextData>({ drawers: [], stations: [], printers: [] });
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<PosDevice | null>(null);
  const [pairingResult, setPairingResult] = useState<{ pairingCode: string; expiresAt: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    branchId: '',
    name: '',
    deviceCode: '',
    deviceType: 'POS_TERMINAL' as PosDevice['deviceType'],
    operatingSystem: 'WEB_BROWSER' as PosDevice['operatingSystem'],
    ipAddress: '',
    assignedDrawerId: '',
    assignedKitchenStationId: '',
    assignedReceiptPrinterId: '',
    allowOfflineSales: true,
    status: 'ACTIVE' as PosDevice['status'],
  });

  const [pairingForm, setPairingForm] = useState({
    branchId: '',
    deviceType: 'POS_TERMINAL' as PosDevice['deviceType'],
    assignedDrawerId: '',
    assignedKitchenStationId: '',
    expiryHours: 24,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedBranchId !== 'ALL') params.set('branchId', selectedBranchId);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const [devRes, ctxRes, branchRes] = await Promise.all([
        fetchApi(`/api/v1/settings/devices?${params.toString()}`),
        fetchApi(`/api/v1/settings/devices/context${selectedBranchId !== 'ALL' ? `?branchId=${selectedBranchId}` : ''}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (devRes?.data) {
        setDevices(devRes.data.devices || []);
        setTelemetry(devRes.data.telemetry || null);
      }
      if (ctxRes?.data) {
        setContext(ctxRes.data);
      }
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load devices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId, statusFilter]);

  const openRegisterModal = () => {
    setEditingDevice(null);
    setFormError(null);
    setFormData({
      branchId: branches[0]?.id ? String(branches[0].id) : '',
      name: '',
      deviceCode: '',
      deviceType: 'POS_TERMINAL',
      operatingSystem: 'WEB_BROWSER',
      ipAddress: '',
      assignedDrawerId: '',
      assignedKitchenStationId: '',
      assignedReceiptPrinterId: '',
      allowOfflineSales: true,
      status: 'ACTIVE',
    });
    setIsRegisterModalOpen(true);
  };

  const openEditModal = (device: PosDevice) => {
    setEditingDevice(device);
    setFormError(null);
    setFormData({
      branchId: String(device.branchId),
      name: device.name,
      deviceCode: device.deviceCode,
      deviceType: device.deviceType,
      operatingSystem: device.operatingSystem,
      ipAddress: device.ipAddress || '',
      assignedDrawerId: device.assignedDrawerId ? String(device.assignedDrawerId) : '',
      assignedKitchenStationId: device.assignedKitchenStationId ? String(device.assignedKitchenStationId) : '',
      assignedReceiptPrinterId: device.assignedReceiptPrinterId ? String(device.assignedReceiptPrinterId) : '',
      allowOfflineSales: device.allowOfflineSales,
      status: device.status,
    });
    setIsRegisterModalOpen(true);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      setIsSubmitting(true);
      const payload: Record<string, any> = {
        ...formData,
        branchId: parseInt(formData.branchId, 10),
        assignedDrawerId: formData.assignedDrawerId ? parseInt(formData.assignedDrawerId, 10) : null,
        assignedKitchenStationId: formData.assignedKitchenStationId ? parseInt(formData.assignedKitchenStationId, 10) : null,
        assignedReceiptPrinterId: formData.assignedReceiptPrinterId ? parseInt(formData.assignedReceiptPrinterId, 10) : null,
      };

      if (editingDevice) {
        await fetchApi(`/api/v1/settings/devices/${editingDevice.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/api/v1/settings/devices', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsRegisterModalOpen(false);
      setToastMessage({ text: 'Device terminal saved successfully.', type: 'success' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save device');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLock = async (device: PosDevice) => {
    try {
      await fetchApi(`/api/v1/settings/devices/${device.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isLocked: !device.isLocked }),
      });
      setToastMessage({
        text: `Device ${device.deviceCode} ${device.isLocked ? 'unlocked' : 'locked'}.`,
        type: 'success',
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update lock status');
    }
  };

  const handleDeleteDevice = async (id: number) => {
    if (!confirm('Are you sure you want to decommission this device? Terminal authentication will be immediately revoked.')) return;
    try {
      await fetchApi(`/api/v1/settings/devices/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete device');
    }
  };

  const handleGeneratePairingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        ...pairingForm,
        branchId: parseInt(pairingForm.branchId, 10),
        assignedDrawerId: pairingForm.assignedDrawerId ? parseInt(pairingForm.assignedDrawerId, 10) : null,
        assignedKitchenStationId: pairingForm.assignedKitchenStationId ? parseInt(pairingForm.assignedKitchenStationId, 10) : null,
      };

      const res = await fetchApi('/api/v1/settings/devices/pairing-code', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res?.data) {
        setPairingResult({
          pairingCode: res.data.pairingCode,
          expiresAt: res.data.expiresAt,
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate pairing token');
    } finally {
      setIsSubmitting(false);
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
            <span className="text-xs font-bold text-servora-navy">Workstation Fleet</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Monitor className="text-servora-core" size={22} />
            POS Workstations, Tablets & KDS Displays
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Register trusted Point of Sale terminals, handheld ordering tablets, KDS displays, and pair new hardware devices.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => {
              setPairingResult(null);
              setPairingForm({
                branchId: branches[0]?.id ? String(branches[0].id) : '',
                deviceType: 'POS_TERMINAL',
                assignedDrawerId: '',
                assignedKitchenStationId: '',
                expiryHours: 24,
              });
              setIsPairingModalOpen(true);
            }}
            className="px-3 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Key size={14} className="text-servora-core" /> Generate Pairing PIN
          </button>
          <button
            onClick={openRegisterModal}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Provision Terminal
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

      {/* 2. FLEET TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Enrolled Fleet</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {telemetry ? telemetry.totalDevices : 0}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Monitor size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Terminals</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {telemetry ? telemetry.activeDevices : 0} Online
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">KDS Touchscreens</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {telemetry ? telemetry.kdsDisplays : 0} Displays
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <ChefHat size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Locked Workstations</span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">
              {telemetry ? telemetry.lockedDevices : 0}
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Lock size={18} />
          </div>
        </div>
      </div>

      {/* 3. FILTER TOOLBAR */}
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
        >
          <option value="ALL">All Terminal States</option>
          <option value="ACTIVE">Active (Enrolled)</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DECOMMISSIONED">Decommissioned</option>
        </select>
      </div>

      {/* 4. FLEET GRID OR EMPTY STATE */}
      {devices.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-servora-core flex items-center justify-center mx-auto">
            <Monitor size={24} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-servora-navy">No Workstation Terminals Registered</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              Add Point of Sale stations, KDS displays, or mobile waiter tablets to bind hardware and enable secure checkout sessions.
            </p>
          </div>
          <button
            onClick={openRegisterModal}
            className="px-4 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Provision First Terminal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => {
            const Icon = DEVICE_TYPE_ICONS[device.deviceType] || Monitor;
            const isOnline = device.status === 'ACTIVE' && !device.isLocked;

            return (
              <div
                key={device.id}
                className={`p-5 rounded-2xl border bg-white shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow ${
                  device.isLocked ? 'border-amber-300 bg-amber-50/20' : 'border-gray-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center shrink-0">
                        <Icon size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-servora-navy text-sm leading-tight">{device.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] font-bold text-servora-core bg-blue-50 px-1.5 py-0.2 rounded">
                            {device.deviceCode}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {device.branchName} ({device.branchCode})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {device.isLocked && (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9.5px] font-bold flex items-center gap-1">
                          <Lock size={10} /> Locked
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${
                          isOnline
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                        {device.status}
                      </span>
                    </div>
                  </div>

                  {/* Attributes Matrix */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-3 border-b border-gray-100">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Hardware Role</span>
                      <span className="font-bold text-servora-navy block">{device.deviceType.replace('_', ' ')}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">OS Platform</span>
                      <span className="font-mono text-gray-700 font-bold">{device.operatingSystem}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Cash Drawer</span>
                      <span className="text-gray-700 block truncate">
                        {device.assignedDrawerName || 'No Drawer Bound'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Assigned Station</span>
                      <span className="text-gray-700 block truncate">
                        {device.assignedKitchenStationName || 'Central Counter'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Receipt Printer</span>
                      <span className="text-gray-700 block truncate">
                        {device.assignedReceiptPrinterName || 'Default Driver'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Offline Mode</span>
                      <span className="text-gray-700 block">
                        {device.allowOfflineSales ? 'Allowed' : 'Restricted'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-gray-500 flex items-center justify-between">
                    <span>Last Heartbeat:</span>
                    <span className="font-mono font-bold text-servora-navy">
                      {device.lastHeartbeatAt ? new Date(device.lastHeartbeatAt).toLocaleTimeString() : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Operations Action Bar */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleLock(device)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer ${
                      device.isLocked
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {device.isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                    <span>{device.isLocked ? 'Unlock Terminal' : 'Lockout Terminal'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(device)}
                      className="p-1.5 text-gray-500 hover:text-servora-core hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDevice(device.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL: REGISTER / EDIT DEVICE */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingDevice ? 'Configure Workstation Hardware' : 'Provision Workstation Terminal'}
                </h3>
                <p className="text-[11px] text-gray-400">Assign hardware code, role, and peripheral bindings</p>
              </div>
              <button onClick={() => setIsRegisterModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Terminal Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Front Cashier Till 01"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Device Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="POS-01"
                    value={formData.deviceCode}
                    onChange={(e) => setFormData({ ...formData, deviceCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Branch *</label>
                  <select
                    required
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="">Select Branch...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Hardware Role</label>
                  <select
                    value={formData.deviceType}
                    onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as any })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="POS_TERMINAL">Fixed POS Terminal</option>
                    <option value="KDS_DISPLAY">Kitchen Display (KDS)</option>
                    <option value="WAITER_TABLET">Handheld Waiter Tablet</option>
                    <option value="SELF_ORDER_KIOSK">Self-Order Kiosk</option>
                    <option value="BARCODE_SCANNER">Handheld Scanner</option>
                    <option value="MANAGER_STATION">Manager Station</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">OS Platform</label>
                  <select
                    value={formData.operatingSystem}
                    onChange={(e) => setFormData({ ...formData, operatingSystem: e.target.value as any })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="WEB_BROWSER">Web Browser (PWA)</option>
                    <option value="ANDROID">Android</option>
                    <option value="IOS">Apple iOS</option>
                    <option value="WINDOWS">Windows</option>
                    <option value="LINUX">Linux</option>
                  </select>
                </div>
              </div>

              {/* Peripheral Bindings */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
                <span className="font-bold text-servora-navy block text-xs">Assigned Peripherals & Physical Station</span>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Assigned Cash Drawer</label>
                    <select
                      value={formData.assignedDrawerId}
                      onChange={(e) => setFormData({ ...formData, assignedDrawerId: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="">No Drawer</option>
                      {context.drawers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">KDS Station Binding</label>
                    <select
                      value={formData.assignedKitchenStationId}
                      onChange={(e) => setFormData({ ...formData, assignedKitchenStationId: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="">Not Applicable</option>
                      {context.stations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Receipt Printer</label>
                    <select
                      value={formData.assignedReceiptPrinterId}
                      onChange={(e) => setFormData({ ...formData, assignedReceiptPrinterId: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="">Default Network Route</option>
                      {context.printers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowOfflineSales}
                    onChange={(e) => setFormData({ ...formData, allowOfflineSales: e.target.checked })}
                    className="rounded"
                  />
                  <span className="font-medium text-servora-navy">Authorize offline transactional caching on this terminal</span>
                </label>
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Workstation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: GENERATE PAIRING CODE */}
      {isPairingModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Enroll New Device</h3>
                <p className="text-[11px] text-gray-400">Generate a one-time cryptographic pairing PIN</p>
              </div>
              <button onClick={() => setIsPairingModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {pairingResult ? (
              <div className="space-y-4 py-2 text-center">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-servora-deepTeal uppercase tracking-wider block">
                    One-Time Terminal Pairing PIN
                  </span>
                  <div className="text-3xl font-mono font-black text-servora-core tracking-widest">
                    {pairingResult.pairingCode}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Expires at: {new Date(pairingResult.expiresAt).toLocaleTimeString()}
                  </p>
                </div>
                <p className="text-xs text-gray-600">
                  Open the POS client on your new hardware terminal, select <strong>Pair Workstation</strong>, and enter this PIN.
                </p>
                <button
                  onClick={() => setIsPairingModalOpen(false)}
                  className="w-full py-2.5 bg-servora-core text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleGeneratePairingSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Target Branch *</label>
                  <select
                    required
                    value={pairingForm.branchId}
                    onChange={(e) => setPairingForm({ ...pairingForm, branchId: e.target.value })}
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

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Terminal Role</label>
                  <select
                    value={pairingForm.deviceType}
                    onChange={(e) => setPairingForm({ ...pairingForm, deviceType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="POS_TERMINAL">Fixed POS Station</option>
                    <option value="KDS_DISPLAY">Kitchen Display (KDS)</option>
                    <option value="WAITER_TABLET">Handheld Waiter Tablet</option>
                    <option value="SELF_ORDER_KIOSK">Self-Order Kiosk</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPairingModalOpen(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Generating...' : 'Create Pairing Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}