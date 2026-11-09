'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  Store,
  ChevronRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  Building2,
  Layers,
  Wine,
  ShoppingBag,
  Truck,
  Car,
  Edit2,
  Power,
  Trash2,
  X,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ServiceModel {
  id: number;
  branchId: number | null;
  branchName: string | null;
  branchCode: string | null;
  name: string;
  type: 'DINE_IN' | 'QUICK_SERVICE' | 'BAR_TAB' | 'TAKEAWAY' | 'DELIVERY' | 'DRIVE_THRU';
  description: string | null;
  requiresTable: boolean;
  payBeforeOrder: boolean;
  promptGuestCount: boolean;
  allowSplitChecks: boolean;
  allowTableTransfers: boolean;
  autoSendToKitchen: boolean;
  enableCoursePacing: boolean;
  requireSeatNumbering: boolean;
  autoApplyServiceCharge: boolean;
  serviceChargePercent: string;
  packingChargeAmount: string;
  preAuthCardRequired: boolean;
  maxTabCreditLimit: string;
  isActive: boolean;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

const TYPE_ICONS: Record<ServiceModel['type'], any> = {
  DINE_IN: UtensilsCrossed,
  QUICK_SERVICE: Store,
  BAR_TAB: Wine,
  TAKEAWAY: ShoppingBag,
  DELIVERY: Truck,
  DRIVE_THRU: Car,
};

export default function ServiceModelsPage() {
  const [models, setModels] = useState<ServiceModel[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ServiceModel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    branchId: '',
    name: '',
    type: 'DINE_IN' as ServiceModel['type'],
    description: '',
    requiresTable: true,
    payBeforeOrder: false,
    promptGuestCount: true,
    allowSplitChecks: true,
    allowTableTransfers: true,
    autoSendToKitchen: false,
    enableCoursePacing: false,
    requireSeatNumbering: false,
    autoApplyServiceCharge: false,
    serviceChargePercent: 0,
    packingChargeAmount: 0,
    preAuthCardRequired: false,
    maxTabCreditLimit: 0,
    isActive: true,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const queryParam = selectedBranchId !== 'ALL' ? `?branchId=${selectedBranchId}` : '';
      const [modelsRes, branchRes] = await Promise.all([
        fetchApi(`/api/v1/settings/service-models${queryParam}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (modelsRes?.data && Array.isArray(modelsRes.data)) {
        setModels(modelsRes.data);
      }
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load service models:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  const telemetry = useMemo(() => {
    const totalModels = models.length;
    const activeModels = models.filter((m) => m.isActive).length;
    const tableServiceModels = models.filter((m) => m.requiresTable).length;
    const counterModels = models.filter((m) => m.payBeforeOrder).length;

    return {
      totalModels,
      activeModels,
      tableServiceModels,
      counterModels,
    };
  }, [models]);

  const openCreateModal = () => {
    setEditingModel(null);
    setFormError(null);
    setFormData({
      branchId: branches[0]?.id ? String(branches[0].id) : '',
      name: '',
      type: 'DINE_IN',
      description: '',
      requiresTable: true,
      payBeforeOrder: false,
      promptGuestCount: true,
      allowSplitChecks: true,
      allowTableTransfers: true,
      autoSendToKitchen: false,
      enableCoursePacing: false,
      requireSeatNumbering: false,
      autoApplyServiceCharge: false,
      serviceChargePercent: 0,
      packingChargeAmount: 0,
      preAuthCardRequired: false,
      maxTabCreditLimit: 0,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (model: ServiceModel) => {
    setEditingModel(model);
    setFormError(null);
    setFormData({
      branchId: model.branchId ? String(model.branchId) : '',
      name: model.name,
      type: model.type,
      description: model.description || '',
      requiresTable: model.requiresTable,
      payBeforeOrder: model.payBeforeOrder,
      promptGuestCount: model.promptGuestCount,
      allowSplitChecks: model.allowSplitChecks,
      allowTableTransfers: model.allowTableTransfers,
      autoSendToKitchen: model.autoSendToKitchen,
      enableCoursePacing: model.enableCoursePacing,
      requireSeatNumbering: model.requireSeatNumbering,
      autoApplyServiceCharge: model.autoApplyServiceCharge,
      serviceChargePercent: parseFloat(model.serviceChargePercent) || 0,
      packingChargeAmount: parseFloat(model.packingChargeAmount) || 0,
      preAuthCardRequired: model.preAuthCardRequired,
      maxTabCreditLimit: parseFloat(model.maxTabCreditLimit) || 0,
      isActive: model.isActive,
    });
    setIsModalOpen(true);
  };

  const handleTypeSelect = (type: ServiceModel['type']) => {
    setFormData((prev) => {
      let requiresTable = false;
      let payBeforeOrder = true;
      let promptGuestCount = false;
      let enableCoursePacing = false;
      let requireSeatNumbering = false;

      if (type === 'DINE_IN') {
        requiresTable = true;
        payBeforeOrder = false;
        promptGuestCount = true;
        enableCoursePacing = true;
        requireSeatNumbering = true;
      } else if (type === 'BAR_TAB') {
        requiresTable = false;
        payBeforeOrder = false;
        promptGuestCount = false;
      }

      return {
        ...prev,
        type,
        requiresTable,
        payBeforeOrder,
        promptGuestCount,
        enableCoursePacing,
        requireSeatNumbering,
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
        branchId: formData.branchId ? parseInt(formData.branchId, 10) : null,
      };

      if (editingModel) {
        await fetchApi(`/api/v1/settings/service-models/${editingModel.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/api/v1/settings/service-models', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      setToastMessage({ text: 'Service model workflow saved.', type: 'success' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save service model configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (model: ServiceModel) => {
    try {
      await fetchApi(`/api/v1/settings/service-models/${model.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !model.isActive }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update model status');
    }
  };

  const handleDeleteModel = async (id: number) => {
    if (!confirm('Are you sure you want to delete this service model workflow?')) return;
    try {
      await fetchApi(`/api/v1/settings/service-models/${id}`, {
        method: 'DELETE',
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete service model');
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
            <span className="text-xs font-bold text-servora-navy">Front-of-House Workflows</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Hospitality Service Models & Revenue Centers</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Configure ordering logic, table assignment rules, payment sequencing, course pacing, and delivery surcharges.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Provision Service Model
          </button>
          <button
            onClick={loadData}
            title="Refresh Models"
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

      {/* 2. OPERATIONAL TELEMETRY TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Configured Models</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">{telemetry.totalModels}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Layers size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Workflows</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{telemetry.activeModels} Online</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Table Service</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">{telemetry.tableServiceModels}</p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <UtensilsCrossed size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pay-First Counter</span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">{telemetry.counterModels}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Store size={18} />
          </div>
        </div>
      </div>

      {/* 3. BRANCH FILTER BAR */}
      {branches.length > 0 && (
        <div className="flex items-center gap-2.5 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
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
        </div>
      )}

      {/* 4. SERVICE MODELS GRID OR EMPTY STATE */}
      {models.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-servora-core flex items-center justify-center mx-auto">
            <Layers size={24} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-servora-navy">No Service Models Configured</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              Set up operational revenue models tailored to your venue (e.g., Table Service, Quick Service Counter, Bar Tab, Delivery Dispatch).
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Provision First Model
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {models.map((model) => {
            const Icon = TYPE_ICONS[model.type] || Store;
            return (
              <div
                key={model.id}
                className={`p-5 rounded-2xl border bg-white shadow-xs flex flex-col justify-between transition-all ${
                  model.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center shrink-0">
                        <Icon size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-servora-navy text-sm leading-snug">{model.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono uppercase font-bold text-servora-core bg-blue-50 px-1.5 py-0.2 rounded">
                            {model.type.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {model.branchName ? model.branchName : 'Tenant-Wide Template'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${
                        model.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {model.isActive ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                        </>
                      ) : (
                        'Disabled'
                      )}
                    </span>
                  </div>

                  {model.description && (
                    <p className="text-xs text-gray-600 mb-4 leading-relaxed">{model.description}</p>
                  )}

                  {/* Workflow Badge Summary */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-4">
                    <div className="p-2 rounded-lg bg-slate-50 border border-gray-100 space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Payment Timing</span>
                      <span className="font-semibold text-servora-navy">
                        {model.payBeforeOrder ? 'Pay First (Pre-pay)' : 'Post-Pay (After Service)'}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-gray-100 space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Floor Assignment</span>
                      <span className="font-semibold text-servora-navy">
                        {model.requiresTable ? 'Table Required' : 'Open Seating / Direct'}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-gray-100 space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Kitchen Routing</span>
                      <span className="font-semibold text-servora-navy">
                        {model.autoSendToKitchen ? 'Auto-Fire to KDS' : 'Manual Expediter Send'}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-gray-100 space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Course Management</span>
                      <span className="font-semibold text-servora-navy">
                        {model.enableCoursePacing ? 'Course Pacing Active' : 'Single Ticket'}
                      </span>
                    </div>
                  </div>

                  {/* Surcharges if applicable */}
                  {(parseFloat(model.serviceChargePercent) > 0 || parseFloat(model.packingChargeAmount) > 0) && (
                    <div className="flex items-center gap-3 p-2 bg-blue-50/50 rounded-lg text-[11px] font-mono text-servora-navy mb-3">
                      {parseFloat(model.serviceChargePercent) > 0 && (
                        <span>Service Charge: +{model.serviceChargePercent}%</span>
                      )}
                      {parseFloat(model.packingChargeAmount) > 0 && (
                        <span>Packaging Fee: KES {parseFloat(model.packingChargeAmount).toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Toolbar */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(model)}
                    className={`text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                      model.isActive ? 'text-gray-500 hover:text-amber-600' : 'text-emerald-600 hover:text-emerald-700'
                    }`}
                  >
                    <Power size={13} />
                    <span>{model.isActive ? 'Disable Workflow' : 'Enable Workflow'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(model)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-servora-core hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Configure Model Settings"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteModel(model.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Model"
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

      {/* 5. MODAL: PROVISION / EDIT SERVICE MODEL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingModel ? 'Configure Service Model Workflow' : 'Provision Hospitality Service Model'}
                </h3>
                <p className="text-[11px] text-gray-400">Define dining logic, payment timing, and KDS expediter behavior</p>
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
              {/* Type Selector */}
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1.5">Operational Revenue Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'DINE_IN', label: 'Dine-In', icon: UtensilsCrossed },
                      { id: 'QUICK_SERVICE', label: 'Quick Service', icon: Store },
                      { id: 'BAR_TAB', label: 'Bar & Tab', icon: Wine },
                      { id: 'TAKEAWAY', label: 'Takeaway', icon: ShoppingBag },
                      { id: 'DELIVERY', label: 'Delivery / 3PL', icon: Truck },
                      { id: 'DRIVE_THRU', label: 'Drive-Thru', icon: Car },
                    ] as const
                  ).map((t) => {
                    const Icon = t.icon;
                    const selected = formData.type === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleTypeSelect(t.id)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                          selected
                            ? 'bg-servora-core text-white border-servora-core font-bold shadow-xs'
                            : 'bg-slate-50 border-gray-200 text-servora-navy hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={14} className={selected ? 'text-white' : 'text-servora-core'} />
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Garden Terrace Table Service"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Branch Scope</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="">Tenant-Wide Template (All Outlets)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Operational Description</label>
                <input
                  type="text"
                  placeholder="Summarize workflow operations for this station"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
              </div>

              {/* Workflow Logic Checkboxes */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2.5">
                <span className="font-bold text-servora-navy block text-xs">Ordering & Settlement Controls</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requiresTable}
                      onChange={(e) => setFormData({ ...formData, requiresTable: e.target.checked })}
                      className="rounded"
                    />
                    <span>Requires Floor Table Assignment</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.payBeforeOrder}
                      onChange={(e) => setFormData({ ...formData, payBeforeOrder: e.target.checked })}
                      className="rounded"
                    />
                    <span>Pay-First (Tender before fulfillment)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.promptGuestCount}
                      onChange={(e) => setFormData({ ...formData, promptGuestCount: e.target.checked })}
                      className="rounded"
                    />
                    <span>Prompt for Guest Cover Count</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowSplitChecks}
                      onChange={(e) => setFormData({ ...formData, allowSplitChecks: e.target.checked })}
                      className="rounded"
                    />
                    <span>Allow Bill Splitting at POS</span>
                  </label>
                </div>
              </div>

              {/* Kitchen & Expediter Routing */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2.5">
                <span className="font-bold text-servora-navy block text-xs">Kitchen Display (KDS) & Pacing</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoSendToKitchen}
                      onChange={(e) => setFormData({ ...formData, autoSendToKitchen: e.target.checked })}
                      className="rounded"
                    />
                    <span>Auto-fire tickets to Kitchen Display</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enableCoursePacing}
                      onChange={(e) => setFormData({ ...formData, enableCoursePacing: e.target.checked })}
                      className="rounded"
                    />
                    <span>Enable Course Pacing (Starters / Mains)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requireSeatNumbering}
                      onChange={(e) => setFormData({ ...formData, requireSeatNumbering: e.target.checked })}
                      className="rounded"
                    />
                    <span>Enforce Seat-Level Ordering</span>
                  </label>
                </div>
              </div>

              {/* Surcharges & Packaging */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Packaging Charge (KES)</label>
                  <input
                    type="number"
                    step="5"
                    min={0}
                    value={formData.packingChargeAmount}
                    onChange={(e) => setFormData({ ...formData, packingChargeAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Service Charge (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={100}
                    value={formData.serviceChargePercent}
                    onChange={(e) => setFormData({ ...formData, serviceChargePercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                  />
                </div>
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
                  {isSubmitting ? 'Saving...' : 'Save Service Model'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}