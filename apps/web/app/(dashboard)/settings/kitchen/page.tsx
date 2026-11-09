'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ChefHat,
  Clock,
  ChevronRight,
  Plus,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Wine,
  Layers,
  SlidersHorizontal,
  Edit2,
  Trash2,
  X,
  Volume2,
  Package,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface KitchenStation {
  id: number;
  branchId: number;
  branchName: string;
  branchCode: string;
  name: string;
  code: string;
  stationType: 'PREP' | 'EXPEDITER' | 'PASS' | 'BAR' | 'PACKING';
  colorHex: string;
  targetPrepTimeMinutes: number;
  warningTimeMinutes: number;
  criticalTimeMinutes: number;
  assignedCategories: string[];
  autoBumpOnPrint: boolean;
  soundAlertOnNewTicket: boolean;
  allowTicketRecall: boolean;
  backupStationId: number | null;
  backupStationName: string | null;
  isActive: boolean;
}

interface KitchenGlobalSettings {
  id: number;
  defaultWarningMinutes: number;
  defaultCriticalMinutes: number;
  enableCoursePacing: boolean;
  enableOrderConsolidation: boolean;
  vipPriorityBoostMinutes: number;
  deliveryPriorityBoostMinutes: number;
  soundVolume: number;
  autoArchiveCompletedMinutes: number;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

const STATION_TYPE_ICONS: Record<KitchenStation['stationType'], any> = {
  PREP: Flame,
  EXPEDITER: ChefHat,
  PASS: Layers,
  BAR: Wine,
  PACKING: Package,
};

export default function KitchenSettingsPage() {
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [globalSettings, setGlobalSettings] = useState<KitchenGlobalSettings | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'STATIONS' | 'SLA_PACING'>('STATIONS');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Station Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<KitchenStation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    branchId: '',
    name: '',
    code: '',
    stationType: 'PREP' as KitchenStation['stationType'],
    colorHex: '#0554F4',
    targetPrepTimeMinutes: 15,
    warningTimeMinutes: 10,
    criticalTimeMinutes: 18,
    assignedCategories: [] as string[],
    autoBumpOnPrint: false,
    soundAlertOnNewTicket: true,
    allowTicketRecall: true,
    backupStationId: '',
    isActive: true,
  });

  // Global Settings Form
  const [globalFormData, setGlobalFormData] = useState({
    defaultWarningMinutes: 10,
    defaultCriticalMinutes: 18,
    enableCoursePacing: true,
    enableOrderConsolidation: true,
    vipPriorityBoostMinutes: 5,
    deliveryPriorityBoostMinutes: 3,
    soundVolume: 80,
    autoArchiveCompletedMinutes: 120,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [kitchenRes, branchRes] = await Promise.all([
        fetchApi(`/api/v1/settings/kitchen?branchId=${selectedBranchId}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (kitchenRes?.data) {
        setStations(kitchenRes.data.stations || []);
        setAvailableCategories(kitchenRes.data.availableCategories || []);
        if (kitchenRes.data.globalSettings) {
          setGlobalSettings(kitchenRes.data.globalSettings);
          setGlobalFormData({
            defaultWarningMinutes: kitchenRes.data.globalSettings.defaultWarningMinutes,
            defaultCriticalMinutes: kitchenRes.data.globalSettings.defaultCriticalMinutes,
            enableCoursePacing: kitchenRes.data.globalSettings.enableCoursePacing,
            enableOrderConsolidation: kitchenRes.data.globalSettings.enableOrderConsolidation,
            vipPriorityBoostMinutes: kitchenRes.data.globalSettings.vipPriorityBoostMinutes,
            deliveryPriorityBoostMinutes: kitchenRes.data.globalSettings.deliveryPriorityBoostMinutes,
            soundVolume: kitchenRes.data.globalSettings.soundVolume,
            autoArchiveCompletedMinutes: kitchenRes.data.globalSettings.autoArchiveCompletedMinutes,
          });
        }
      }

      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load kitchen settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  const telemetry = useMemo(() => {
    const totalStations = stations.length;
    const activeStations = stations.filter((s) => s.isActive).length;
    const avgTargetSla =
      stations.length > 0
        ? Math.round(stations.reduce((acc, s) => acc + s.targetPrepTimeMinutes, 0) / stations.length)
        : 0;

    return {
      totalStations,
      activeStations,
      avgTargetSla,
    };
  }, [stations]);

  const openCreateModal = () => {
    setEditingStation(null);
    setFormError(null);
    setFormData({
      branchId: branches[0]?.id ? String(branches[0].id) : '',
      name: '',
      code: '',
      stationType: 'PREP',
      colorHex: '#0554F4',
      targetPrepTimeMinutes: 15,
      warningTimeMinutes: 10,
      criticalTimeMinutes: 18,
      assignedCategories: [],
      autoBumpOnPrint: false,
      soundAlertOnNewTicket: true,
      allowTicketRecall: true,
      backupStationId: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (station: KitchenStation) => {
    setEditingStation(station);
    setFormError(null);
    setFormData({
      branchId: String(station.branchId),
      name: station.name,
      code: station.code,
      stationType: station.stationType,
      colorHex: station.colorHex,
      targetPrepTimeMinutes: station.targetPrepTimeMinutes,
      warningTimeMinutes: station.warningTimeMinutes,
      criticalTimeMinutes: station.criticalTimeMinutes,
      assignedCategories: station.assignedCategories || [],
      autoBumpOnPrint: station.autoBumpOnPrint,
      soundAlertOnNewTicket: station.soundAlertOnNewTicket,
      allowTicketRecall: station.allowTicketRecall,
      backupStationId: station.backupStationId ? String(station.backupStationId) : '',
      isActive: station.isActive,
    });
    setIsModalOpen(true);
  };

  const toggleCategorySelection = (category: string) => {
    setFormData((prev) => {
      const exists = prev.assignedCategories.includes(category);
      return {
        ...prev,
        assignedCategories: exists
          ? prev.assignedCategories.filter((c) => c !== category)
          : [...prev.assignedCategories, category],
      };
    });
  };

  const handleStationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        branchId: parseInt(formData.branchId, 10),
        backupStationId: formData.backupStationId ? parseInt(formData.backupStationId, 10) : null,
      };

      if (editingStation) {
        await fetchApi(`/api/v1/settings/kitchen/stations/${editingStation.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/api/v1/settings/kitchen/stations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      setToastMessage({ text: 'KDS station configuration updated.', type: 'success' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save station');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGlobalSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage(null);
    try {
      setIsSavingGlobal(true);
      await fetchApi('/api/v1/settings/kitchen/global', {
        method: 'PUT',
        body: JSON.stringify(globalFormData),
      });
      setToastMessage({ text: 'Culinary SLA & pacing parameters saved.', type: 'success' });
      loadData();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Failed to update global settings', type: 'error' });
    } finally {
      setIsSavingGlobal(false);
    }
  };

  const handleDeleteStation = async (id: number) => {
    if (!confirm('Are you sure you want to remove this station?')) return;
    try {
      await fetchApi(`/api/v1/settings/kitchen/stations/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete station');
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Enterprise Control <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Production Routing</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">KDS Preparation Stations & Routing</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Configure physical production stations, map dynamic menu categories, and establish SLA countdown thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Add Station
          </button>
          <button
            onClick={loadData}
            title="Refresh"
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
          <CheckCircle2 size={16} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Stations</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">{telemetry.totalStations}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <ChefHat size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Target Cook SLA</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {telemetry.avgTargetSla > 0 ? `${telemetry.avgTargetSla} mins` : '—'}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Routing</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">{telemetry.activeStations} Active</p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Course Pacing</span>
            <p className="text-base font-bold font-mono text-amber-700 mt-0.5">
              {globalSettings?.enableCoursePacing ? 'Enforced' : 'Unrestricted'}
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Layers size={18} />
          </div>
        </div>
      </div>

      {/* 3. TABS & BRANCH FILTER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab('STATIONS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'STATIONS'
                ? 'bg-servora-navy text-white shadow-xs'
                : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
            }`}
          >
            <ChefHat size={14} />
            <span>Preparation Stations ({stations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SLA_PACING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'SLA_PACING'
                ? 'bg-servora-navy text-white shadow-xs'
                : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Culinary SLA & Pacing</span>
          </button>
        </div>

        {activeTab === 'STATIONS' && branches.length > 0 && (
          <select
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
      </div>

      {/* 4. CONTENT */}
      {activeTab === 'STATIONS' ? (
        stations.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-servora-core flex items-center justify-center mx-auto">
              <ChefHat size={24} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-servora-navy">No Preparation Stations Configured</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                Create routing stations specific to your facility (e.g. Broiler, Salad Bar, Espresso Station, or Dispatch Expediter).
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Create First Station
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stations.map((s) => {
              const Icon = STATION_TYPE_ICONS[s.stationType] || ChefHat;
              return (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 font-bold"
                          style={{ backgroundColor: s.colorHex }}
                        >
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-servora-navy text-sm leading-snug">{s.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[10px] font-bold text-servora-core bg-blue-50 px-1.5 py-0.2 rounded">
                              {s.code}
                            </span>
                            <span className="text-[11px] text-gray-400 font-medium">
                              {s.branchName} ({s.branchCode})
                            </span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${
                          s.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {s.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    {/* SLA Timers */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs py-3 border-b border-gray-100">
                      <div className="p-2 bg-slate-50 rounded-xl border border-gray-100">
                        <span className="text-[9.5px] font-bold text-gray-400 uppercase block">Target SLA</span>
                        <span className="font-mono font-bold text-servora-navy mt-0.5 block">
                          {s.targetPrepTimeMinutes} mins
                        </span>
                      </div>

                      <div className="p-2 bg-amber-50/70 rounded-xl border border-amber-200 text-amber-800">
                        <span className="text-[9.5px] font-bold text-amber-600 uppercase block">Amber Warning</span>
                        <span className="font-mono font-bold mt-0.5 block">{s.warningTimeMinutes} mins</span>
                      </div>

                      <div className="p-2 bg-rose-50/70 rounded-xl border border-rose-200 text-rose-800">
                        <span className="text-[9.5px] font-bold text-rose-600 uppercase block">Critical Alert</span>
                        <span className="font-mono font-bold mt-0.5 block">{s.criticalTimeMinutes} mins</span>
                      </div>
                    </div>

                    {/* Assigned Categories */}
                    <div className="pt-3">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                        Routed Categories ({s.assignedCategories.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {s.assignedCategories.length > 0 ? (
                          s.assignedCategories.map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 bg-slate-100 text-servora-navy border border-gray-200 rounded-md text-[10px] font-medium"
                            >
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs italic">All items / Manual dispatch</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-400 uppercase">
                      Role: {s.stationType}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(s)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-servora-core hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStation(s.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* GLOBAL SLA & PACING TAB */
        <div className="max-w-2xl bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5 text-xs">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-bold text-servora-navy text-sm">Culinary Pacing & Kitchen Workflow Rules</h3>
            <p className="text-[11px] text-gray-400">
              Govern course pacing, ticket grouping, and order prioritization rules.
            </p>
          </div>

          <form onSubmit={handleGlobalSettingsSubmit} className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-servora-navy block">Course Management Pacing</span>
                  <span className="text-[11px] text-gray-500">
                    Hold Main course tickets until Starters & Appetizers are bumped by the expediter
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={globalFormData.enableCoursePacing}
                  onChange={(e) =>
                    setGlobalFormData({ ...globalFormData, enableCoursePacing: e.target.checked })
                  }
                  className="rounded w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div>
                  <span className="font-bold text-servora-navy block">Item Aggregation & Consolidation</span>
                  <span className="text-[11px] text-gray-500">
                    Group identical dishes across distinct open tickets on station displays
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={globalFormData.enableOrderConsolidation}
                  onChange={(e) =>
                    setGlobalFormData({ ...globalFormData, enableOrderConsolidation: e.target.checked })
                  }
                  className="rounded w-4 h-4 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  VIP Priority Boost (Mins Fast-Track)
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={globalFormData.vipPriorityBoostMinutes}
                  onChange={(e) =>
                    setGlobalFormData({
                      ...globalFormData,
                      vipPriorityBoostMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Delivery / 3PL Priority Boost (Mins)
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={globalFormData.deliveryPriorityBoostMinutes}
                  onChange={(e) =>
                    setGlobalFormData({
                      ...globalFormData,
                      deliveryPriorityBoostMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-servora-navy mb-1">
                KDS Notification Volume ({globalFormData.soundVolume}%)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={globalFormData.soundVolume}
                onChange={(e) =>
                  setGlobalFormData({ ...globalFormData, soundVolume: Number(e.target.value) })
                }
                className="w-full cursor-pointer"
              />
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={isSavingGlobal}
                className="px-4 py-2 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isSavingGlobal ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. MODAL: COMPOSE / EDIT STATION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingStation ? 'Configure Station' : 'Add Preparation Station'}
                </h3>
                <p className="text-[11px] text-gray-400">Define hardware code, role, and category bindings</p>
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

            <form onSubmit={handleStationSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Station Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Broiler & Rotisserie"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Station Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="KDS-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Operating Branch *</label>
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Station Type</label>
                  <select
                    value={formData.stationType}
                    onChange={(e) => setFormData({ ...formData, stationType: e.target.value as any })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="PREP">Line Prep Station</option>
                    <option value="EXPEDITER">Master Expediter</option>
                    <option value="PASS">Pass / Heat Lamp</option>
                    <option value="BAR">Bar Dispense</option>
                    <option value="PACKING">Takeaway / Delivery Packing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Color Marker</label>
                  <input
                    type="color"
                    value={formData.colorHex}
                    onChange={(e) => setFormData({ ...formData, colorHex: e.target.value })}
                    className="w-full h-9 p-0.5 bg-slate-50 border border-gray-200 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              {/* SLA Configuration */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <span className="font-bold text-servora-navy block text-xs">Cook Timers & Alerts (Minutes)</span>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Target Prep SLA</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={formData.targetPrepTimeMinutes}
                      onChange={(e) => setFormData({ ...formData, targetPrepTimeMinutes: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-600 mb-0.5">Amber Warning</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={formData.warningTimeMinutes}
                      onChange={(e) => setFormData({ ...formData, warningTimeMinutes: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs text-amber-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-rose-600 mb-0.5">Critical Alert</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={formData.criticalTimeMinutes}
                      onChange={(e) => setFormData({ ...formData, criticalTimeMinutes: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs text-rose-700"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Category Assignment */}
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1.5">
                  Route Real Menu Categories to this Station:
                </label>
                {availableCategories.length === 0 ? (
                  <p className="text-gray-400 text-xs italic p-2 bg-slate-50 border border-gray-200 rounded-xl">
                    No categories registered in Menu Catalog yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-gray-200 rounded-xl">
                    {availableCategories.map((cat) => {
                      const isSelected = formData.assignedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategorySelection(cat)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-servora-core text-white font-bold shadow-xs'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                )}
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
                  {isSubmitting ? 'Saving...' : 'Save Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}