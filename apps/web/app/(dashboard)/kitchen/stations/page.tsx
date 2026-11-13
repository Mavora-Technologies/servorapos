'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  RefreshCw,
  ChevronRight,
  Building2,
  Clock,
  SlidersHorizontal,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Printer,
  RotateCcw,
  ShieldAlert,
  ChefHat,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface KitchenStationRecord {
  id: number;
  branchId: number;
  branchName: string | null;
  branchCode: string | null;
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
  mappedMenuItemsCount: number;
  activeDishesCount: number;
  activeTicketsCount: number;
}

interface StationWorkload {
  station: string;
  pendingItemsCount: number;
  readyItemsCount: number;
  activeTicketsCount: number;
}

interface KitchenGlobalSettings {
  id?: number;
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

interface MenuCategoryOption {
  id: number;
  name: string;
}

export default function KitchenStationsMasterPage() {
  const [stations, setStations] = useState<KitchenStationRecord[]>([]);
  const [workloads, setWorkloads] = useState<StationWorkload[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [categories, setCategories] = useState<MenuCategoryOption[]>([]);
  const [globalSettings, setGlobalSettings] = useState<KitchenGlobalSettings | null>(null);

  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'STATIONS' | 'GLOBAL_RULES'>('STATIONS');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Create / Edit Station Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<KitchenStationRecord | null>(null);
  const [formBranchId, setFormBranchId] = useState<string>('');
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'PREP' | 'EXPEDITER' | 'PASS' | 'BAR' | 'PACKING'>('PREP');
  const [formColor, setFormColor] = useState('#0554F4');
  const [formTargetMins, setFormTargetMins] = useState('15');
  const [formWarningMins, setFormWarningMins] = useState('10');
  const [formCriticalMins, setFormCriticalMins] = useState('18');
  const [formCategories, setFormCategories] = useState<string[]>([]);
  const [formBackupStationId, setFormBackupStationId] = useState<string>('');
  const [formAutoBump, setFormAutoBump] = useState(false);
  const [formSoundAlert, setFormSoundAlert] = useState(true);
  const [formAllowRecall, setFormAllowRecall] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSavingStation, setIsSavingStation] = useState(false);

  // Global Rules Form State
  const [gWarnMins, setGWarnMins] = useState('10');
  const [gCritMins, setGCritMins] = useState('18');
  const [gCoursePacing, setGCoursePacing] = useState(true);
  const [gOrderConsolidation, setGOrderConsolidation] = useState(true);
  const [gVipBoost, setGVipBoost] = useState('5');
  const [gDeliveryBoost, setGDeliveryBoost] = useState('3');
  const [gSoundVolume, setGSoundVolume] = useState('80');
  const [gArchiveMins, setGArchiveMins] = useState('120');
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadStationsMaster = useCallback(async () => {
    try {
      setIsLoading(true);
      const branchQuery = branchFilter !== 'ALL' ? `?branchId=${branchFilter}` : '';
      const [overviewRes, branchRes] = await Promise.all([
        fetchApi(`/api/v1/kitchen/stations${branchQuery}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }

      if (overviewRes?.data) {
        setStations(overviewRes.data.stations || []);
        setWorkloads(overviewRes.data.workloads || []);
        setCategories(overviewRes.data.categories || []);

        const gs = overviewRes.data.globalSettings;
        setGlobalSettings(gs);
        if (gs) {
          setGWarnMins(String(gs.defaultWarningMinutes ?? 10));
          setGCritMins(String(gs.defaultCriticalMinutes ?? 18));
          setGCoursePacing(Boolean(gs.enableCoursePacing));
          setGOrderConsolidation(Boolean(gs.enableOrderConsolidation));
          setGVipBoost(String(gs.vipPriorityBoostMinutes ?? 5));
          setGDeliveryBoost(String(gs.deliveryPriorityBoostMinutes ?? 3));
          setGSoundVolume(String(gs.soundVolume ?? 80));
          setGArchiveMins(String(gs.autoArchiveCompletedMinutes ?? 120));
        }
      }
    } catch (err: any) {
      console.error('Failed to load kitchen stations master:', err);
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter]);

  useEffect(() => {
    loadStationsMaster();
  }, [loadStationsMaster]);

  const openCreateModal = () => {
    setEditingStation(null);
    setFormBranchId(
      branchFilter !== 'ALL'
        ? branchFilter
        : branches[0]?.id
        ? String(branches[0].id)
        : ''
    );
    setFormName('');
    setFormCode('');
    setFormType('PREP');
    setFormColor('#0554F4');
    setFormTargetMins('15');
    setFormWarningMins('10');
    setFormCriticalMins('18');
    setFormCategories([]);
    setFormBackupStationId('');
    setFormAutoBump(false);
    setFormSoundAlert(true);
    setFormAllowRecall(true);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (st: KitchenStationRecord) => {
    setEditingStation(st);
    setFormBranchId(String(st.branchId));
    setFormName(st.name);
    setFormCode(st.code);
    setFormType(st.stationType);
    setFormColor(st.colorHex || '#0554F4');
    setFormTargetMins(String(st.targetPrepTimeMinutes));
    setFormWarningMins(String(st.warningTimeMinutes));
    setFormCriticalMins(String(st.criticalTimeMinutes));
    setFormCategories(st.assignedCategories || []);
    setFormBackupStationId(st.backupStationId ? String(st.backupStationId) : '');
    setFormAutoBump(st.autoBumpOnPrint);
    setFormSoundAlert(st.soundAlertOnNewTicket);
    setFormAllowRecall(st.allowTicketRecall);
    setFormIsActive(st.isActive);
    setIsModalOpen(true);
  };

  const toggleCategorySelection = (categoryName: string) => {
    setFormCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingStation(true);
      const payload = {
        branchId: parseInt(formBranchId, 10),
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        stationType: formType,
        colorHex: formColor,
        targetPrepTimeMinutes: parseInt(formTargetMins, 10) || 15,
        warningTimeMinutes: parseInt(formWarningMins, 10) || 10,
        criticalTimeMinutes: parseInt(formCriticalMins, 10) || 18,
        assignedCategories: formCategories,
        backupStationId: formBackupStationId ? parseInt(formBackupStationId, 10) : null,
        autoBumpOnPrint: formAutoBump,
        soundAlertOnNewTicket: formSoundAlert,
        allowTicketRecall: formAllowRecall,
        isActive: formIsActive,
      };

      const res = editingStation
        ? await fetchApi(`/api/v1/kitchen/stations/${editingStation.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          })
        : await fetchApi('/api/v1/kitchen/stations', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      setIsModalOpen(false);
      showToast(res.message || 'Station configuration saved.');
      loadStationsMaster();
    } catch (err: any) {
      alert(err.message || 'Failed to save station');
    } finally {
      setIsSavingStation(false);
    }
  };

  const handleDeleteStation = async (st: KitchenStationRecord) => {
    if (!confirm(`Remove prep station "${st.name}" (${st.code})?`)) return;
    try {
      await fetchApi(`/api/v1/kitchen/stations/${st.id}`, { method: 'DELETE' });
      showToast(`Station "${st.name}" removed.`);
      loadStationsMaster();
    } catch (err: any) {
      alert(err.message || 'Failed to delete station');
    }
  };

  const handleSaveGlobalRules = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingGlobal(true);
      const res = await fetchApi('/api/v1/kitchen/global-settings', {
        method: 'PUT',
        body: JSON.stringify({
          defaultWarningMinutes: parseInt(gWarnMins, 10) || 10,
          defaultCriticalMinutes: parseInt(gCritMins, 10) || 18,
          enableCoursePacing: gCoursePacing,
          enableOrderConsolidation: gOrderConsolidation,
          vipPriorityBoostMinutes: parseInt(gVipBoost, 10) || 0,
          deliveryPriorityBoostMinutes: parseInt(gDeliveryBoost, 10) || 0,
          soundVolume: parseInt(gSoundVolume, 10) || 80,
          autoArchiveCompletedMinutes: parseInt(gArchiveMins, 10) || 120,
        }),
      });
      showToast(res.message || 'Global KDS orchestration settings updated.');
      loadStationsMaster();
    } catch (err: any) {
      alert(err.message || 'Failed to update global KDS rules');
    } finally {
      setIsSavingGlobal(false);
    }
  };

  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      if (typeFilter !== 'ALL' && s.stationType !== typeFilter) return false;
      return true;
    });
  }, [stations, typeFilter]);

  const activeCount = stations.filter((s) => s.isActive).length;
  const totalMappedItems = stations.reduce((sum, s) => sum + (s.mappedMenuItemsCount || 0), 0);
  const avgTargetSla =
    stations.length > 0
      ? Math.round(
          stations.reduce((sum, s) => sum + s.targetPrepTimeMinutes, 0) / stations.length
        )
      : 0;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE STATION ARCHITECTURE HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/kitchen"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1"
            >
              Live KDS Monitor <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Station Architecture &amp; Routing</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Layers size={24} className="text-servora-core" /> Kitchen Prep Stations, SLA &amp; Routing Rules
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Configure multi-branch kitchen terminals, target/critical cook SLAs, menu category routing, and failover stations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-between xl:justify-end">
          <Link
            href="/kitchen"
            className="px-3.5 py-2 bg-slate-100 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-1.5"
          >
            <ChefHat size={14} className="text-servora-core" /> Open Live KDS Board{' '}
            <ArrowUpRight size={13} />
          </Link>

          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Register Prep Station
          </button>

          <button
            onClick={loadStationsMaster}
            title="Refresh Stations"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 2. STATION CAPACITY & SLA KPI RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Configured Stations</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {activeCount} / {stations.length} Active
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Layers size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Catalog SKUs Routed</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {totalMappedItems} Menu Items
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ChefHat size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Avg Target Cook SLA</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {avgTargetSla > 0 ? `${avgTargetSla} mins` : '—'}
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Live Active Queue</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {workloads.reduce((s, w) => s + w.pendingItemsCount, 0)} Dishes
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <SlidersHorizontal size={18} />
          </div>
        </div>
      </div>

      {/* 3. SUB-NAVIGATION & BRANCH / TYPE FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl font-bold">
          <button
            onClick={() => setActiveTab('STATIONS')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'STATIONS'
                ? 'bg-white text-servora-navy shadow-xs'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            <Layers size={13} className="text-servora-core" />
            <span>Prep Stations &amp; Routing Directory ({stations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('GLOBAL_RULES')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'GLOBAL_RULES'
                ? 'bg-white text-servora-navy shadow-xs'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            <SlidersHorizontal size={13} className="text-purple-600" />
            <span>Global KDS Pacing &amp; SLA Policies</span>
          </button>
        </div>

        {activeTab === 'STATIONS' && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Branch Outlets ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Station Roles</option>
              <option value="PREP">Culinary Prep</option>
              <option value="BAR">Bar &amp; Dispense</option>
              <option value="EXPEDITER">Master Expediter</option>
              <option value="PASS">Plating &amp; Pass</option>
              <option value="PACKING">Takeaway / Delivery Packing</option>
            </select>
          </div>
        )}
      </div>

      {/* 4. TAB 1: CONFIGURED PREP STATIONS DIRECTORY */}
      {activeTab === 'STATIONS' && (
        <>
          {filteredStations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-14 text-center space-y-2.5">
              <Layers size={42} className="mx-auto opacity-20 text-servora-navy" />
              <p className="text-sm font-bold text-servora-navy">
                No Kitchen Prep Stations Configured Yet
              </p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Zero synthetic defaults are generated. Click <strong>Register Prep Station</strong> to define your branch cooking stations, SLA warning timers, failover routing, and menu category assignments.
              </p>
              <div className="pt-2">
                <button
                  onClick={openCreateModal}
                  className="px-4 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Register First Prep Station
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredStations.map((st) => (
                <div
                  key={st.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Color-coded Top Accent Bar */}
                    <div className="h-1.5 w-full" style={{ backgroundColor: st.colorHex }} />

                    <div className="p-5 space-y-3.5">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-servora-navy border border-gray-200">
                              {st.code}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-servora-core bg-blue-50 px-2 py-0.5 rounded">
                              {st.stationType}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-servora-navy mt-1.5">
                            {st.name}
                          </h3>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Building2 size={11} /> {st.branchName || 'Branch Outlet'}
                          </p>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            st.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                        >
                          {st.isActive ? 'Online' : 'Inactive'}
                        </span>
                      </div>

                      {/* SLA Threshold Matrix */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-gray-100 text-center font-mono text-xs">
                        <div>
                          <span className="text-[9.5px] uppercase text-gray-400 block font-sans font-bold">
                            Target SLA
                          </span>
                          <span className="font-bold text-servora-navy">
                            {st.targetPrepTimeMinutes}m
                          </span>
                        </div>
                        <div className="border-x border-gray-200">
                          <span className="text-[9.5px] uppercase text-amber-600 block font-sans font-bold">
                            Warning
                          </span>
                          <span className="font-bold text-amber-700">
                            {st.warningTimeMinutes}m
                          </span>
                        </div>
                        <div>
                          <span className="text-[9.5px] uppercase text-rose-600 block font-sans font-bold">
                            Critical
                          </span>
                          <span className="font-bold text-rose-700">
                            {st.criticalTimeMinutes}m
                          </span>
                        </div>
                      </div>

                      {/* Assigned Menu Categories */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-gray-400 block">
                          Routed Menu Categories ({st.mappedMenuItemsCount} SKUs)
                        </span>
                        {st.assignedCategories && st.assignedCategories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {st.assignedCategories.map((cat) => (
                              <span
                                key={cat}
                                className="px-2 py-0.5 bg-blue-50/70 text-servora-navy border border-blue-100 rounded-md text-[10.5px] font-semibold"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">
                            Direct item-level station assignment
                          </span>
                        )}
                      </div>

                      {/* Operational Capabilities, Failover & Live Workload */}
                      <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                        <div className="flex items-center gap-2">
                          {st.soundAlertOnNewTicket && (
                            <span title="Chime Alert Enabled" className="text-servora-core">
                              <Volume2 size={13} />
                            </span>
                          )}
                          {st.autoBumpOnPrint && (
                            <span title="Auto-Bump on Print" className="text-emerald-600">
                              <Printer size={13} />
                            </span>
                          )}
                          {st.allowTicketRecall && (
                            <span title="Ticket Recall Allowed" className="text-purple-600">
                              <RotateCcw size={13} />
                            </span>
                          )}
                          {st.backupStationName && (
                            <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              <ShieldAlert size={10} /> Failover: {st.backupStationName}
                            </span>
                          )}
                        </div>

                        <span className="font-mono font-bold text-servora-core">
                          {st.activeDishesCount || 0} active dishes ({st.activeTicketsCount || 0} tickets)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="px-5 py-3 bg-slate-50 border-t border-gray-100 flex justify-between items-center text-xs">
                    <button
                      onClick={() => openEditModal(st)}
                      className="font-bold text-servora-navy hover:text-servora-core flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={13} /> Configure Routing &amp; SLA
                    </button>

                    <button
                      onClick={() => handleDeleteStation(st)}
                      className="text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete Station"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 5. TAB 2: GLOBAL KDS PACING & SLA POLICIES */}
      {activeTab === 'GLOBAL_RULES' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs max-w-2xl space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-servora-navy">
              Enterprise Kitchen Orchestration &amp; Course Pacing Policies
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Tenant-wide rules governing default SLA alerts, VIP/Delivery priority boosting, and course hold behavior.
            </p>
          </div>

          <form onSubmit={handleSaveGlobalRules} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Default Warning Threshold (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={gWarnMins}
                  onChange={(e) => setGWarnMins(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Default Critical Overdue (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={gCritMins}
                  onChange={(e) => setGCritMins(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  VIP Table Priority Boost (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={gVipBoost}
                  onChange={(e) => setGVipBoost(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Delivery / 3PL Priority Boost (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={gDeliveryBoost}
                  onChange={(e) => setGDeliveryBoost(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  KDS Chime Alert Volume (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={gSoundVolume}
                  onChange={(e) => setGSoundVolume(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Auto-Archive Completed Tickets (Mins)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={gArchiveMins}
                  onChange={(e) => setGArchiveMins(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gCoursePacing}
                  onChange={(e) => setGCoursePacing(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="font-bold text-servora-navy">
                  Enable Course Pacing (Hold Mains until Starters are bumped)
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gOrderConsolidation}
                  onChange={(e) => setGOrderConsolidation(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="font-bold text-servora-navy">
                  Enable All-Day SKU Consolidation across active tickets
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingGlobal}
                className="px-5 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingGlobal ? 'Saving...' : 'Save Global KDS Policies'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. MODAL: CREATE / EDIT PREP STATION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingStation ? 'Configure Prep Station & SLA' : 'Register Kitchen Prep Station'}
                </h3>
                <p className="text-[11px] text-gray-400">
                  Define branch assignment, SLA cook targets, and category routing
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStation} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Branch Outlet *
                  </label>
                  <select
                    required
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy"
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Station Role *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy"
                  >
                    <option value="PREP">Culinary Prep</option>
                    <option value="BAR">Bar &amp; Beverages</option>
                    <option value="EXPEDITER">Master Expediter</option>
                    <option value="PASS">Plating &amp; Pass</option>
                    <option value="PACKING">Takeaway / Delivery Packing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Station Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grill & Choma"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Station Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="KDS-GRILL"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold uppercase"
                  />
                </div>
              </div>

              {/* SLA Timers */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Target Prep (Min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={formTargetMins}
                    onChange={(e) => setFormTargetMins(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-700 mb-1">
                    Warning Alert (Min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={formWarningMins}
                    onChange={(e) => setFormWarningMins(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-rose-700 mb-1">
                    Critical SLA (Min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="240"
                    value={formCriticalMins}
                    onChange={(e) => setFormCriticalMins(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              {/* Backup Failover & Color */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Failover Backup Station
                  </label>
                  <select
                    value={formBackupStationId}
                    onChange={(e) => setFormBackupStationId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy"
                  >
                    <option value="">None (No Automatic Reroute)</option>
                    {stations
                      .filter((s) => s.id !== editingStation?.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Header Color
                  </label>
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-full h-9 p-1 bg-slate-50 border border-gray-200 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              {/* Menu Category Routing Pills */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1.5">
                    Assigned Menu Categories
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-gray-200 rounded-xl max-h-28 overflow-y-auto">
                    {categories.map((cat) => {
                      const selected = formCategories.includes(cat.name);
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => toggleCategorySelection(cat.name)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                            selected
                              ? 'bg-servora-core text-white border-servora-core'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Terminal Behavior Flags */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formSoundAlert}
                    onChange={(e) => setFormSoundAlert(e.target.checked)}
                  />
                  <span className="font-semibold text-servora-navy">Sound Alert on Ticket</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAutoBump}
                    onChange={(e) => setFormAutoBump(e.target.checked)}
                  />
                  <span className="font-semibold text-servora-navy">Auto-Bump on Print</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAllowRecall}
                    onChange={(e) => setFormAllowRecall(e.target.checked)}
                  />
                  <span className="font-semibold text-servora-navy">Allow Ticket Recall</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  <span className="font-semibold text-servora-navy">Station Online / Active</span>
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStation}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  {isSavingStation ? 'Saving...' : 'Save Prep Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}