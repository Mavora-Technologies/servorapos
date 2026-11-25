// apps/web/app/(dashboard)/settings/offline/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  WifiOff,
  Wifi,
  ChevronRight,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  SlidersHorizontal,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Wallet,
  Activity,
  UploadCloud,
  Gift,
  FileText,
  X,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import {
  cacheOfflinePolicy,
  getQueuedOfflineOrders,
  syncQueuedTransactions,
  type QueuedOfflineOrder,
} from '@/lib/offline-engine';

type ConflictStrategy = 'SERVER_TIMESTAMP_WINS' | 'CLIENT_TIMESTAMP_WINS' | 'MANUAL_REVIEW';

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
  conflictResolutionStrategy: ConflictStrategy;
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
  branchName: string | null;
  terminalIdentifier: string;
  batchReference: string;
  recordCount: number;
  status: string;
  conflictCount: number;
  payloadSummary: {
    submittedOrders?: number;
    reconciledOrders?: number;
    skippedDuplicates?: number;
  } | null;
  syncDurationMs: number;
  completedAt: string;
}

interface TelemetryData {
  totalSyncs: number;
  successfulSyncs: number;
  totalRecordsSynced: number;
  conflictsDetected: number;
  avgLatencyMs: number;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function OfflineSettingsPage() {
  const [hasSavedPolicy, setHasSavedPolicy] = useState(false);
  const [batches, setBatches] = useState<SyncBatchRecord[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'BATCHES'>('CONFIG');

  // Real Browser Network & Local IndexedDB Queue State
  const [isOnline, setIsOnline] = useState(true);
  const [localQueue, setLocalQueue] = useState<QueuedOfflineOrder[]>([]);

  // Loading & Feedback States
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    branchId: '',
    allowOfflineSales: true,
    maxOfflineHours: 72,
    maxOfflineTicketTotal: 50000,
    maxOfflineCumulativeBalance: 500000,
    requireManagerAuthForOffline: false,
    conflictResolutionStrategy: 'SERVER_TIMESTAMP_WINS' as ConflictStrategy,
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

  const refreshLocalQueue = useCallback(async () => {
    const queued = await getQueuedOfflineOrders();
    setLocalQueue(queued);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const queryParam = selectedBranchId !== 'ALL' ? `?branchId=${selectedBranchId}` : '';
    const [settingsResult, branchResult] = await Promise.allSettled([
      fetchApi(`/api/v1/settings/offline${queryParam}`),
      fetchApi('/api/v1/branches'),
    ]);

    if (settingsResult.status === 'fulfilled' && settingsResult.value?.data) {
      const payload = settingsResult.value.data;
      if (payload.settings) {
        const s: OfflineSettings = payload.settings;
        setHasSavedPolicy(true);
        const mapped = {
          branchId: s.branchId ? String(s.branchId) : '',
          allowOfflineSales: s.allowOfflineSales,
          maxOfflineHours: s.maxOfflineHours,
          maxOfflineTicketTotal: parseFloat(s.maxOfflineTicketTotal) || 0,
          maxOfflineCumulativeBalance: parseFloat(s.maxOfflineCumulativeBalance) || 0,
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
        };
        setFormData(mapped);
        void cacheOfflinePolicy(mapped).catch(() => {});
      } else {
        setHasSavedPolicy(false);
      }

      setBatches(Array.isArray(payload.batches) ? payload.batches : []);
      setTelemetry(payload.telemetry || null);
    } else {
      setLoadError(
        settingsResult.status === 'rejected'
          ? getErrorMessage(settingsResult.reason, 'Failed to load offline survivability settings.')
          : 'Unexpected response structure from offline settings API.'
      );
    }

    if (branchResult.status === 'fulfilled' && Array.isArray(branchResult.value?.data)) {
      setBranches(branchResult.value.data);
    }

    await refreshLocalQueue();
    setIsLoading(false);
  }, [selectedBranchId, refreshLocalQueue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real browser connectivity watcher + auto-sync on reconnect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      setIsOnline(true);
      const pending = await getQueuedOfflineOrders();
      if (pending.length > 0 && formData.autoSyncOnReconnect) {
        try {
          setIsSyncing(true);
          const result = await syncQueuedTransactions();
          setStatusBanner(`Network restored — ${result.message}`);
          await loadData();
        } catch (err: unknown) {
          setActionError(getErrorMessage(err, 'Auto-sync on reconnect failed.'));
        } finally {
          setIsSyncing(false);
        }
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [formData.autoSyncOnReconnect, loadData]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    setActionError(null);
    setStatusBanner(null);

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

      await cacheOfflinePolicy(formData).catch(() => {});
      setStatusBanner('Offline survivability policies saved and cached to local terminal.');
      await loadData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to save offline survivability settings.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncPendingQueue = async () => {
    if (isSyncing) return;
    setActionError(null);
    setStatusBanner(null);

    try {
      setIsSyncing(true);
      const result = await syncQueuedTransactions();
      setStatusBanner(result.message);
      await loadData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to reconcile offline queue.'));
    } finally {
      setIsSyncing(false);
    }
  };

  const localQueueTotalKes = localQueue.reduce((sum, q) => sum + (q.total || 0), 0);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core inline-flex items-center gap-1 transition-colors"
            >
              Enterprise Control <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">
              High-Availability &amp; Resilience
            </span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            {isOnline ? (
              <Wifi className="text-emerald-600" size={22} />
            ) : (
              <WifiOff className="text-rose-600" size={22} />
            )}
            Offline Survivability &amp; Local Cache Engine
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Configure disconnected POS ceilings, IndexedDB caching, and automatic transaction reconciliation on reconnect.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 ${
              isOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}
            />
            {isOnline ? 'Online' : 'Offline Mode'}
          </span>

          <button
            type="button"
            onClick={handleSyncPendingQueue}
            disabled={isSyncing || !isOnline || localQueue.length === 0}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <UploadCloud size={14} className="text-servora-core" />
            <span>
              {isSyncing
                ? 'Reconciling...'
                : `Sync Local Queue (${localQueue.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving || !isOnline}
            className="px-4 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving...' : 'Save Policies'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banners */}
      {statusBanner && (
        <div
          role="status"
          className="p-3.5 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            aria-label="Dismiss notification"
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border bg-rose-50 border-rose-200 text-rose-900 text-xs font-semibold flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
            className="text-rose-700 hover:text-rose-950"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {!hasSavedPolicy && !isLoading && !loadError && (
        <div className="p-3.5 rounded-xl border bg-amber-50 border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <span>
            No persisted offline policy exists yet for this tenant. Review the baseline settings below and click <strong>Save Policies</strong> to activate.
          </span>
        </div>
      )}

      {/* 2. TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Survivability Mode
            </span>
            <p className="text-lg font-bold font-mono text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  formData.allowOfflineSales ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                }`}
              />
              {formData.allowOfflineSales ? 'Enabled' : 'Restricted'}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Local Terminal Queue
            </span>
            <p className="text-lg font-bold font-mono text-servora-navy mt-0.5">
              {localQueue.length} Orders
            </p>
            {localQueueTotalKes > 0 && (
              <span className="text-[10px] font-mono text-gray-500">
                KES {localQueueTotalKes.toLocaleString()}
              </span>
            )}
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <UploadCloud size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Avg Sync Latency
            </span>
            <p className="text-lg font-bold font-mono text-purple-700 mt-0.5">
              {telemetry ? `${telemetry.avgLatencyMs} ms` : '—'}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Activity size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Sync Conflicts
            </span>
            <p className="text-lg font-bold font-mono text-amber-700 mt-0.5">
              {telemetry ? telemetry.conflictsDetected : 0}
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
            type="button"
            onClick={() => setActiveTab('CONFIG')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CONFIG'
                ? 'bg-servora-navy text-white shadow-xs'
                : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Survivability Rules &amp; Caching</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BATCHES')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'BATCHES'
                ? 'bg-servora-navy text-white shadow-xs'
                : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
            }`}
          >
            <Activity size={14} />
            <span>Reconciliation Batches ({batches.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {branches.length > 0 && (
            <select
              aria-label="Filter sync batches by branch"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
            >
              <option value="ALL">All Branch Locations</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            title="Refresh offline settings"
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-servora-navy cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 4. TAB 1: CONFIGURATION FORM */}
      {activeTab === 'CONFIG' && (
        <form onSubmit={handleSave} className="space-y-5 text-xs">
          {/* Section A: Disconnected Operational Limits */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-servora-navy">
                  Disconnected Operational Thresholds
                </h3>
                <p className="text-[11px] text-gray-400">
                  Maximum risk limits for POS terminals operating without a cloud connection
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowOfflineSales}
                  onChange={(e) =>
                    setFormData({ ...formData, allowOfflineSales: e.target.checked })
                  }
                  className="rounded w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-servora-navy">Enable Offline Mode</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  className="block text-[11px] font-bold text-servora-navy mb-1"
                  htmlFor="off-hours"
                >
                  Max Disconnected Window (Hours)
                </label>
                <input
                  id="off-hours"
                  type="number"
                  min={1}
                  max={720}
                  value={formData.maxOfflineHours}
                  onChange={(e) =>
                    setFormData({ ...formData, maxOfflineHours: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label
                  className="block text-[11px] font-bold text-servora-navy mb-1"
                  htmlFor="off-ticket"
                >
                  Single Ticket Offline Ceiling (KES)
                </label>
                <input
                  id="off-ticket"
                  type="number"
                  step="500"
                  min={0}
                  value={formData.maxOfflineTicketTotal}
                  onChange={(e) =>
                    setFormData({ ...formData, maxOfflineTicketTotal: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label
                  className="block text-[11px] font-bold text-servora-navy mb-1"
                  htmlFor="off-cum"
                >
                  Cumulative Unsynced Limit (KES)
                </label>
                <input
                  id="off-cum"
                  type="number"
                  step="5000"
                  min={0}
                  value={formData.maxOfflineCumulativeBalance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxOfflineCumulativeBalance: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-servora-core"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-servora-navy block">
                  Require Supervisor Auth to Enter Offline Mode
                </span>
                <span className="text-[11px] text-gray-500">
                  Requires a manager PIN override when WAN connectivity drops
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.requireManagerAuthForOffline}
                onChange={(e) =>
                  setFormData({ ...formData, requireManagerAuthForOffline: e.target.checked })
                }
                className="rounded cursor-pointer w-4 h-4"
              />
            </div>
          </div>

          {/* Section B: Conflict Resolution & Auto-Sync Engine */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-servora-navy">
                Reconciliation &amp; Conflict Resolution
              </h3>
              <p className="text-[11px] text-gray-400">
                Determines how queued orders and inventory decrements reconcile once online
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  className="block text-[11px] font-bold text-servora-navy mb-1"
                  htmlFor="off-strat"
                >
                  Conflict Resolution Policy
                </label>
                <select
                  id="off-strat"
                  value={formData.conflictResolutionStrategy}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conflictResolutionStrategy: e.target.value as ConflictStrategy,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  <option value="SERVER_TIMESTAMP_WINS">Server Timestamp Wins (Cloud)</option>
                  <option value="CLIENT_TIMESTAMP_WINS">Terminal Timestamp Wins (Store)</option>
                  <option value="MANUAL_REVIEW">Manual Review (Hold on Stock Conflict)</option>
                </select>
              </div>

              <div>
                <label
                  className="block text-[11px] font-bold text-servora-navy mb-1"
                  htmlFor="off-chunk"
                >
                  Sync Batch Chunk Size
                </label>
                <input
                  id="off-chunk"
                  type="number"
                  min={1}
                  max={500}
                  value={formData.syncBatchSize}
                  onChange={(e) =>
                    setFormData({ ...formData, syncBatchSize: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label
                  className="block text-[11px] font-bold text-servora-navy mb-1"
                  htmlFor="off-int"
                >
                  Heartbeat Reconnect Interval (Secs)
                </label>
                <input
                  id="off-int"
                  type="number"
                  min={5}
                  max={3600}
                  value={formData.syncIntervalSeconds}
                  onChange={(e) =>
                    setFormData({ ...formData, syncIntervalSeconds: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-servora-navy block">
                  Automatic Sync on Network Reconnect
                </span>
                <span className="text-[11px] text-gray-500">
                  Automatically flush IndexedDB offline orders to PostgreSQL upon reconnection
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.autoSyncOnReconnect}
                onChange={(e) =>
                  setFormData({ ...formData, autoSyncOnReconnect: e.target.checked })
                }
                className="rounded cursor-pointer w-4 h-4"
              />
            </div>
          </div>

          {/* Section C: Local Storage Security & Cache Pre-loading */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-servora-navy">
                Local Cache &amp; Cryptographic Security
              </h3>
              <p className="text-[11px] text-gray-400">
                Entities cached in browser IndexedDB storage for uninterrupted checkout
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  key: 'encryptLocalStorage' as const,
                  title: 'Encrypt Local Terminal Cache',
                  sub: 'Protect stored orders and audit metadata',
                },
                {
                  key: 'cacheUserCredentials' as const,
                  title: 'Offline Staff Authentication',
                  sub: 'Allow PIN shift sign-in while disconnected',
                },
                {
                  key: 'cacheCatalogItems' as const,
                  title: 'Cache Product Catalog & Pricing',
                  sub: 'Maintain full menu & modifier matrix offline',
                },
                {
                  key: 'cacheCustomerDirectory' as const,
                  title: 'Cache CRM Customer Directory',
                  sub: 'Enable loyalty lookup without WAN access',
                },
                {
                  key: 'cacheTaxTables' as const,
                  title: 'Cache Statutory Tax Tables',
                  sub: 'Preserve KRA VAT & Catering Levy rules offline',
                },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-start gap-2.5 cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={formData[opt.key]}
                    onChange={(e) => setFormData({ ...formData, [opt.key]: e.target.checked })}
                    className="rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-servora-navy block">{opt.title}</span>
                    <span className="text-[10px] text-gray-400">{opt.sub}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section D: Disconnected Tender Clearances */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-servora-navy">Offline Tender Clearances</h3>
              <p className="text-[11px] text-gray-400">
                Payment methods cashiers may accept without live cloud validation
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.allowOfflineCash}
                  onChange={(e) =>
                    setFormData({ ...formData, allowOfflineCash: e.target.checked })
                  }
                  className="rounded"
                />
                <Wallet size={15} className="text-servora-core shrink-0" />
                <span className="font-bold text-servora-navy">Cash</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.allowOfflineMpesaReference}
                  onChange={(e) =>
                    setFormData({ ...formData, allowOfflineMpesaReference: e.target.checked })
                  }
                  className="rounded"
                />
                <Smartphone size={15} className="text-emerald-600 shrink-0" />
                <span className="font-bold text-servora-navy">M-Pesa Ref</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.allowOfflineCard}
                  onChange={(e) =>
                    setFormData({ ...formData, allowOfflineCard: e.target.checked })
                  }
                  className="rounded"
                />
                <CreditCard size={15} className="text-indigo-600 shrink-0" />
                <span className="font-bold text-servora-navy">Card S&amp;F</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.allowOfflineGiftCards}
                  onChange={(e) =>
                    setFormData({ ...formData, allowOfflineGiftCards: e.target.checked })
                  }
                  className="rounded"
                />
                <Gift size={15} className="text-purple-600 shrink-0" />
                <span className="font-bold text-servora-navy">Gift Cards</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.allowOfflineCreditTabs}
                  onChange={(e) =>
                    setFormData({ ...formData, allowOfflineCreditTabs: e.target.checked })
                  }
                  className="rounded"
                />
                <FileText size={15} className="text-amber-600 shrink-0" />
                <span className="font-bold text-servora-navy">Credit Tabs</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving || !isOnline}
              className="px-5 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSaving ? 'Saving Policies...' : 'Save Survivability Policies'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 5. TAB 2: RECONCILIATION AUDIT BATCHES */}
      {activeTab === 'BATCHES' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th scope="col" className="py-2.5 px-3">Completed Timestamp</th>
                  <th scope="col" className="py-2.5 px-3">Terminal ID</th>
                  <th scope="col" className="py-2.5 px-3">Batch Reference</th>
                  <th scope="col" className="py-2.5 px-3">Branch</th>
                  <th scope="col" className="py-2.5 px-3">Synced Orders</th>
                  <th scope="col" className="py-2.5 px-3">Conflicts</th>
                  <th scope="col" className="py-2.5 px-3">Latency</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      No offline reconciliation batches recorded yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                        {new Date(batch.completedAt).toLocaleString('en-KE')}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-servora-navy">
                        {batch.terminalIdentifier}
                      </td>
                      <td className="py-3 px-3 font-mono text-servora-core">
                        {batch.batchReference}
                      </td>
                      <td className="py-3 px-3 text-gray-600">{batch.branchName || '—'}</td>
                      <td className="py-3 px-3 font-mono font-bold text-gray-700">
                        {batch.recordCount}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {batch.conflictCount > 0 ? (
                          <span className="text-rose-600 font-bold">
                            {batch.conflictCount} conflict(s)
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-600">
                        {batch.syncDurationMs} ms
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            batch.status === 'PROCESSED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : batch.status === 'CONFLICT_DETECTED'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
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