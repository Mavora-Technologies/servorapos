'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  WifiOff,
  Wifi,
  ChevronRight,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  Lock,
  Layers,
  Clock,
  SlidersHorizontal,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Wallet,
  Activity,
  Zap,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface OfflineSettings {
  id: number;
  tenantId: number;
  branchId: number | null;
  branchName: string | null;
  branchCode: string | null;
  allowOfflineSales: boolean;
  maxOfflineHours: number;
  maxOfflineTicketTotal: string;
  maxOfflineCumulativeBalance: string;
  requireManagerAuthForOffline: boolean;
  conflictResolutionStrategy: 'SERVER_TIMESTAMP_WINS' | 'CLIENT_TIMESTAMP_WINS' | 'MANUAL_REVIEW';
  autoSyncOnReconnect: boolean;
  syncBatchSize: number;
  syncIntervalSeconds: number;
  cacheCatalogItems: boolean;
  cacheCustomerDirectory: boolean;
  cacheTaxTables: boolean;
  cacheUserCredentials: boolean;
  encryptLocalStorage: boolean;
  allowOfflineCash: boolean;
  allowOfflineCard: boolean;
  allowOfflineMpesaReference: boolean;
  allowOfflineGiftCards: boolean;
  allowOfflineCreditTabs: boolean;
}

interface SyncBatchRecord {
  id: number;
  terminalIdentifier: string;
  batchReference: string;
  recordCount: number;
  status: string;
  conflictCount: number;
  payloadSummary: any;
  syncDurationMs: number;
  completedAt: string;
}

interface TelemetryData {
  totalSyncs: number;
  successfulSyncs: number;
  conflictsDetected: number;
  avgLatencyMs: number;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

export default function OfflineSettingsPage() {
  const [settings, setSettings] = useState<OfflineSettings | null>(null);
  const [batches, setBatches] = useState<SyncBatchRecord[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'BATCHES'>('CONFIG');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    branchId: '',
    allowOfflineSales: true,
    maxOfflineHours: 72,
    maxOfflineTicketTotal: 50000,
    maxOfflineCumulativeBalance: 500000,
    requireManagerAuthForOffline: false,
    conflictResolutionStrategy: 'SERVER_TIMESTAMP_WINS' as OfflineSettings['conflictResolutionStrategy'],
    autoSyncOnReconnect: true,
    syncBatchSize: 50,
    syncIntervalSeconds: 30,
    cacheCatalogItems: true,
    cacheCustomerDirectory: true,
    cacheTaxTables: true,
    cacheUserCredentials: true,
    encryptLocalStorage: true,
    allowOfflineCash: true,
    allowOfflineCard: true,
    allowOfflineMpesaReference: true,
    allowOfflineGiftCards: false,
    allowOfflineCreditTabs: false,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const queryParam = selectedBranchId !== 'ALL' ? `?branchId=${selectedBranchId}` : '';
      const [res, branchRes] = await Promise.all([
        fetchApi(`/api/v1/settings/offline${queryParam}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (res?.data?.settings) {
        const s: OfflineSettings = res.data.settings;
        setSettings(s);
        setFormData({
          branchId: s.branchId ? String(s.branchId) : '',
          allowOfflineSales: s.allowOfflineSales,
          maxOfflineHours: s.maxOfflineHours,
          maxOfflineTicketTotal: parseFloat(s.maxOfflineTicketTotal) || 50000,
          maxOfflineCumulativeBalance: parseFloat(s.maxOfflineCumulativeBalance) || 500000,
          requireManagerAuthForOffline: s.requireManagerAuthForOffline,
          conflictResolutionStrategy: s.conflictResolutionStrategy,
          autoSyncOnReconnect: s.autoSyncOnReconnect,
          syncBatchSize: s.syncBatchSize,
          syncIntervalSeconds: s.syncIntervalSeconds,
          cacheCatalogItems: s.cacheCatalogItems,
          cacheCustomerDirectory: s.cacheCustomerDirectory,
          cacheTaxTables: s.cacheTaxTables,
          cacheUserCredentials: s.cacheUserCredentials,
          encryptLocalStorage: s.encryptLocalStorage,
          allowOfflineCash: s.allowOfflineCash,
          allowOfflineCard: s.allowOfflineCard,
          allowOfflineMpesaReference: s.allowOfflineMpesaReference,
          allowOfflineGiftCards: s.allowOfflineGiftCards,
          allowOfflineCreditTabs: s.allowOfflineCreditTabs,
        });
      }

      if (res?.data?.batches) setBatches(res.data.batches);
      if (res?.data?.telemetry) setTelemetry(res.data.telemetry);
      if (branchRes?.data && Array.isArray(branchRes.data)) setBranches(branchRes.data);
    } catch (err: any) {
      console.error('Failed to load offline parameters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setToastMessage(null);
    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        branchId: formData.branchId ? parseInt(formData.branchId, 10) : null,
      };

      await fetchApi('/api/v1/settings/offline', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setToastMessage({ text: 'Offline survivability policies saved successfully.', type: 'success' });
      loadData();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Failed to update settings', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSync = async () => {
    try {
      setIsSyncing(true);
      const res = await fetchApi('/api/v1/settings/offline/simulate-sync', {
        method: 'POST',
        body: JSON.stringify({
          terminalIdentifier: 'POS-TEST-TERM',
          recordCount: 5,
        }),
      });

      setToastMessage({
        text: `${res.message} [Latency: ${res.data?.syncDurationMs}ms]`,
        type: 'success',
      });
      loadData();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Sync simulation failed', type: 'error' });
    } finally {
      setIsSyncing(false);
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
            <span className="text-xs font-bold text-servora-navy">High-Availability & Resilience</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <WifiOff className="text-servora-core" size={22} />
            Offline Survivability & Local Cache Engine
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Configure disconnected POS operations, local database encryption, transaction thresholds, and conflict resolution policies.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={handleTestSync}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Zap size={14} className={isSyncing ? 'animate-bounce text-amber-500' : 'text-servora-core'} />
            <span>{isSyncing ? 'Reconciling...' : 'Simulate Terminal Sync'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-4 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving...' : 'Save Policies'}</span>
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

      {/* 2. TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Survivability Mode</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${formData.allowOfflineSales ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              {formData.allowOfflineSales ? 'Enabled' : 'Restricted'}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Offline Time Allowance</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {formData.maxOfflineHours} Hours
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sync Handshake Latency</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {telemetry ? `${telemetry.avgLatencyMs} ms` : '—'}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Activity size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sync Conflicts</span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">
              {telemetry ? telemetry.conflictsDetected : 0} Detected
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* 3. TABS & SCOPE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CONFIG'
                ? 'bg-servora-navy text-white shadow-xs'
                : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Survivability Rules & Caching</span>
          </button>

          <button
            onClick={() => setActiveTab('BATCHES')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'BATCHES'
                ? 'bg-servora-navy text-white shadow-xs'
                : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
            }`}
          >
            <Activity size={14} />
            <span>Reconciliation Audit Batches ({batches.length})</span>
          </button>
        </div>

        {branches.length > 0 && (
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
          >
            <option value="ALL">All Branch Locations (Tenant-Wide)</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 4. TAB 1: CONFIGURATION FORM */}
      {activeTab === 'CONFIG' && (
        <form onSubmit={handleSave} className="space-y-5 text-xs">
          {/* Section A: Offline Mode Operational Limits */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-servora-navy">Disconnected Operational Thresholds</h3>
                <p className="text-[11px] text-gray-400">
                  Configure maximum risk limits for terminals operating without a WAN connection
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowOfflineSales}
                  onChange={(e) => setFormData({ ...formData, allowOfflineSales: e.target.checked })}
                  className="rounded w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-servora-navy">Enable Offline Mode</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Max Disconnected Operation (Hours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={formData.maxOfflineHours}
                  onChange={(e) => setFormData({ ...formData, maxOfflineHours: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-servora-core"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Terminals lock after this window until cloud sync occurs.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Single Ticket Offline Ceiling
                </label>
                <input
                  type="number"
                  step="500"
                  min={0}
                  value={formData.maxOfflineTicketTotal}
                  onChange={(e) => setFormData({ ...formData, maxOfflineTicketTotal: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-servora-core"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Maximum amount authorized per single offline order.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Cumulative Unsynced Balance Limit
                </label>
                <input
                  type="number"
                  step="5000"
                  min={0}
                  value={formData.maxOfflineCumulativeBalance}
                  onChange={(e) => setFormData({ ...formData, maxOfflineCumulativeBalance: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-servora-core"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Max total pending sales stored locally before forcing reconnect.</p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-servora-navy block">Require Supervisor Auth to Enter Offline Mode</span>
                <span className="text-[11px] text-gray-500">Requires a manager PIN override when the network connection drops</span>
              </div>
              <input
                type="checkbox"
                checked={formData.requireManagerAuthForOffline}
                onChange={(e) => setFormData({ ...formData, requireManagerAuthForOffline: e.target.checked })}
                className="rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Section B: Conflict Resolution & Auto-Sync Engine */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-servora-navy">Reconciliation & Conflict Resolution</h3>
              <p className="text-[11px] text-gray-400">
                Determines precedence when offline and cloud versions conflict (e.g. inventory decrements or order updates)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Conflict Resolution Policy
                </label>
                <select
                  value={formData.conflictResolutionStrategy}
                  onChange={(e) => setFormData({ ...formData, conflictResolutionStrategy: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  <option value="SERVER_TIMESTAMP_WINS">Server Timestamp Wins (Authoritative Cloud)</option>
                  <option value="CLIENT_TIMESTAMP_WINS">Terminal Timestamp Wins (Store Ground Truth)</option>
                  <option value="MANUAL_REVIEW">Flag for Manual Review / Audit Escrow</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Sync Batch Chunk Size
                </label>
                <input
                  type="number"
                  min={5}
                  max={500}
                  value={formData.syncBatchSize}
                  onChange={(e) => setFormData({ ...formData, syncBatchSize: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Heartbeat Reconnect Interval (Secs)
                </label>
                <input
                  type="number"
                  min={5}
                  max={3600}
                  value={formData.syncIntervalSeconds}
                  onChange={(e) => setFormData({ ...formData, syncIntervalSeconds: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-servora-navy block">Automatic Sync on Network Reconnect</span>
                <span className="text-[11px] text-gray-500">Dispatch offline queue immediately upon WAN reconnection</span>
              </div>
              <input
                type="checkbox"
                checked={formData.autoSyncOnReconnect}
                onChange={(e) => setFormData({ ...formData, autoSyncOnReconnect: e.target.checked })}
                className="rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Section C: Local Storage Security & Cache Pre-loading */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-servora-navy">Local Cache & Cryptographic Security</h3>
              <p className="text-[11px] text-gray-400">
                Specify entities cached in the browser IndexedDB storage and enforce hardware-level encryption
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.encryptLocalStorage}
                  onChange={(e) => setFormData({ ...formData, encryptLocalStorage: e.target.checked })}
                  className="rounded"
                />
                <div>
                  <span className="font-bold text-servora-navy block">Encrypt Local Terminal Cache</span>
                  <span className="text-[10px] text-gray-400">AES-GCM encryption for stored orders and audit events</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.cacheUserCredentials}
                  onChange={(e) => setFormData({ ...formData, cacheUserCredentials: e.target.checked })}
                  className="rounded"
                />
                <div>
                  <span className="font-bold text-servora-navy block">Offline Staff Authentication</span>
                  <span className="text-[10px] text-gray-400">Hash staff PINs locally for offline shift log-in</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.cacheCatalogItems}
                  onChange={(e) => setFormData({ ...formData, cacheCatalogItems: e.target.checked })}
                  className="rounded"
                />
                <div>
                  <span className="font-bold text-servora-navy block">Cache Product Catalog & Pricing</span>
                  <span className="text-[10px] text-gray-400">Maintain full menu and variant matrix offline</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.cacheTaxTables}
                  onChange={(e) => setFormData({ ...formData, cacheTaxTables: e.target.checked })}
                  className="rounded"
                />
                <div>
                  <span className="font-bold text-servora-navy block">Cache Statutory Tax Tables</span>
                  <span className="text-[10px] text-gray-400">Preserve VAT and Catering Levy rules offline</span>
                </div>
              </label>
            </div>
          </div>

          {/* Section D: Disconnected Tender Method Permissions */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-servora-navy">Offline Tender Clearances</h3>
              <p className="text-[11px] text-gray-400">
                Control which payment methods POS operators are permitted to accept without cloud validation
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.allowOfflineCash}
                  onChange={(e) => setFormData({ ...formData, allowOfflineCash: e.target.checked })}
                  className="rounded"
                />
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-servora-core" />
                  <span className="font-bold text-servora-navy">Cash Tender</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.allowOfflineMpesaReference}
                  onChange={(e) => setFormData({ ...formData, allowOfflineMpesaReference: e.target.checked })}
                  className="rounded"
                />
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-emerald-600" />
                  <span className="font-bold text-servora-navy">Manual M-Pesa Code</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.allowOfflineCard}
                  onChange={(e) => setFormData({ ...formData, allowOfflineCard: e.target.checked })}
                  className="rounded"
                />
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-indigo-600" />
                  <span className="font-bold text-servora-navy">Card Store & Forward</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSaving ? 'Saving Policies...' : 'Save Survivability Policies'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 5. TAB 2: RECONCILIATION BATCHES */}
      {activeTab === 'BATCHES' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Completed Timestamp</th>
                  <th className="py-2.5 px-3">Terminal ID</th>
                  <th className="py-2.5 px-3">Batch Reference</th>
                  <th className="py-2.5 px-3">Synced Records</th>
                  <th className="py-2.5 px-3">Conflicts</th>
                  <th className="py-2.5 px-3">Sync Latency</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 italic">
                      No offline reconciliation batches recorded yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                        {new Date(batch.completedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-servora-navy">
                        {batch.terminalIdentifier}
                      </td>
                      <td className="py-3 px-3 font-mono text-servora-core">
                        {batch.batchReference}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-gray-700">
                        {batch.recordCount} orders
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {batch.conflictCount > 0 ? (
                          <span className="text-rose-600 font-bold">{batch.conflictCount} conflicts</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-600">
                        {batch.syncDurationMs} ms
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            batch.status === 'PROCESSED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {batch.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}