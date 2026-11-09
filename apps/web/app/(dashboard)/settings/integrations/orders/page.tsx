'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Truck,
  Globe,
  ChevronRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
  SlidersHorizontal,
  Edit2,
  Trash2,
  X,
  Building2,
  Activity,
  Layers,
  ChefHat,
  Percent,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface OrderIntegration {
  id: number;
  branchId: number | null;
  branchName: string | null;
  branchCode: string | null;
  channel:
    | 'GLOVO'
    | 'UBER_EATS'
    | 'BOLT_FOOD'
    | 'DOORDASH'
    | 'SHOPIFY'
    | 'WOOCOMMERCE'
    | 'CUSTOM_WEBHOOK';
  title: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  storeIdentifier: string;
  apiKey: string;
  webhookSecret: string | null;
  callbackUrl: string | null;
  autoAcceptOrders: boolean;
  autoSendToKitchen: boolean;
  priceMarkupPercent: string;
  defaultPrepTimeMinutes: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'ERROR';
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  isDefault: boolean;
  createdAt: string;
}

interface OrderLog {
  id: number;
  integrationId: number;
  channel: string;
  eventType: string;
  externalOrderId: string | null;
  payload: any;
  status: string;
  receivedAt: string;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

interface ChannelMeta {
  label: string;
  category: 'Third-Party Delivery Aggregators' | 'E-Commerce Storefronts' | 'Custom API Webhooks';
  color: string;
  storeIdLabel: string;
  apiKeyLabel: string;
  secretLabel?: string;
}

const CHANNEL_METADATA: Record<OrderIntegration['channel'], ChannelMeta> = {
  GLOVO: {
    label: 'Glovo On-Demand Delivery',
    category: 'Third-Party Delivery Aggregators',
    color: '#FFC244',
    storeIdLabel: 'Glovo Store ID / Address UUID',
    apiKeyLabel: 'Glovo Partner API Token',
    secretLabel: 'Webhook Signing Secret',
  },
  UBER_EATS: {
    label: 'Uber Eats Merchant Integration',
    category: 'Third-Party Delivery Aggregators',
    color: '#06C167',
    storeIdLabel: 'Uber Eats Store UUID',
    apiKeyLabel: 'Client ID',
    secretLabel: 'Client Secret',
  },
  BOLT_FOOD: {
    label: 'Bolt Food Partner Gateway',
    category: 'Third-Party Delivery Aggregators',
    color: '#34D186',
    storeIdLabel: 'Bolt Restaurant ID',
    apiKeyLabel: 'Partner API Key',
    secretLabel: 'Secret Key',
  },
  DOORDASH: {
    label: 'DoorDash Drive & Marketplace',
    category: 'Third-Party Delivery Aggregators',
    color: '#FF3008',
    storeIdLabel: 'DoorDash Store ID',
    apiKeyLabel: 'Developer Key ID',
    secretLabel: 'Signing Secret',
  },
  SHOPIFY: {
    label: 'Shopify Storefront Webhooks',
    category: 'E-Commerce Storefronts',
    color: '#95BF47',
    storeIdLabel: 'Shopify Store Domain (myshopify.com)',
    apiKeyLabel: 'Admin API Access Token',
    secretLabel: 'Webhook HMAC Secret',
  },
  WOOCOMMERCE: {
    label: 'WooCommerce REST API',
    category: 'E-Commerce Storefronts',
    color: '#96588A',
    storeIdLabel: 'Base WordPress Site URL',
    apiKeyLabel: 'Consumer Key (ck_...)',
    secretLabel: 'Consumer Secret (cs_...)',
  },
  CUSTOM_WEBHOOK: {
    label: 'Custom Inbound Order Webhook',
    category: 'Custom API Webhooks',
    color: '#64748B',
    storeIdLabel: 'Client App Identifier / Source Tag',
    apiKeyLabel: 'Bearer Authentication Token',
    secretLabel: 'Signature Verification Secret',
  },
};

export default function OrderIntegrationsPage() {
  const [integrations, setIntegrations] = useState<OrderIntegration[]>([]);
  const [logs, setLogs] = useState<OrderLog[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'CHANNELS' | 'LOGS'>('CHANNELS');
  const [isLoading, setIsLoading] = useState(true);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<OrderIntegration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    branchId: '',
    channel: 'GLOVO' as OrderIntegration['channel'],
    title: '',
    environment: 'SANDBOX' as OrderIntegration['environment'],
    storeIdentifier: '',
    apiKey: '',
    apiSecret: '',
    webhookSecret: '',
    callbackUrl: '',
    autoAcceptOrders: false,
    autoSendToKitchen: true,
    priceMarkupPercent: 0,
    defaultPrepTimeMinutes: 20,
    status: 'ACTIVE' as OrderIntegration['status'],
    isDefault: false,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const queryParam = selectedBranchId !== 'ALL' ? `?branchId=${selectedBranchId}` : '';
      const [res, branchRes] = await Promise.all([
        fetchApi(`/api/v1/settings/integrations/orders${queryParam}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (res?.data) {
        setIntegrations(res.data.integrations || []);
        setLogs(res.data.logs || []);
      }
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load order integrations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  const telemetry = useMemo(() => {
    const totalChannels = integrations.length;
    const activeChannels = integrations.filter((i) => i.status === 'ACTIVE').length;
    const autoAcceptCount = integrations.filter((i) => i.autoAcceptOrders).length;
    const totalEvents = logs.length;

    return {
      totalChannels,
      activeChannels,
      autoAcceptCount,
      totalEvents,
    };
  }, [integrations, logs]);

  const openCreateModal = () => {
    setEditingIntegration(null);
    setFormError(null);
    setFormData({
      branchId: branches[0]?.id ? String(branches[0].id) : '',
      channel: 'GLOVO',
      title: '',
      environment: 'SANDBOX',
      storeIdentifier: '',
      apiKey: '',
      apiSecret: '',
      webhookSecret: '',
      callbackUrl: '',
      autoAcceptOrders: false,
      autoSendToKitchen: true,
      priceMarkupPercent: 0,
      defaultPrepTimeMinutes: 20,
      status: 'ACTIVE',
      isDefault: integrations.length === 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: OrderIntegration) => {
    setEditingIntegration(item);
    setFormError(null);
    setFormData({
      branchId: item.branchId ? String(item.branchId) : '',
      channel: item.channel,
      title: item.title,
      environment: item.environment,
      storeIdentifier: item.storeIdentifier,
      apiKey: item.apiKey,
      apiSecret: '',
      webhookSecret: item.webhookSecret || '',
      callbackUrl: item.callbackUrl || '',
      autoAcceptOrders: item.autoAcceptOrders,
      autoSendToKitchen: item.autoSendToKitchen,
      priceMarkupPercent: parseFloat(item.priceMarkupPercent) || 0,
      defaultPrepTimeMinutes: item.defaultPrepTimeMinutes,
      status: item.status,
      isDefault: item.isDefault,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      setIsSubmitting(true);
      const payload: Record<string, any> = {
        ...formData,
        branchId: formData.branchId ? parseInt(formData.branchId, 10) : null,
      };

      if (editingIntegration && !formData.apiSecret) {
        delete payload.apiSecret;
      }

      if (editingIntegration) {
        await fetchApi(`/api/v1/settings/integrations/orders/${editingIntegration.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/api/v1/settings/integrations/orders', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      setToastMessage({ text: 'Order integration configuration saved.', type: 'success' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save order integration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestSync = async (id: number) => {
    try {
      setTestingId(id);
      const res = await fetchApi('/api/v1/settings/integrations/orders/test-sync', {
        method: 'POST',
        body: JSON.stringify({ integrationId: id }),
      });
      setToastMessage({
        text: `${res.message} [Latency: ${res.data?.latencyMs}ms]`,
        type: res.data?.isSuccess ? 'success' : 'error',
      });
      loadData();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Channel sync failed', type: 'error' });
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this order channel integration?')) return;
    try {
      await fetchApi(`/api/v1/settings/integrations/orders/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete integration');
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
            <span className="text-xs font-bold text-servora-navy">Omnichannel Commerce</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Online Order Channels & Aggregator Integrations</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Connect third-party aggregators (Glovo, Uber Eats, Bolt Food) and e-commerce stores (Shopify, WooCommerce) with automatic KDS dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Connect Order Channel
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
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Channels</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">{telemetry.totalChannels}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <ShoppingBag size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Live Pipelines</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {telemetry.activeChannels} Online
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Auto-Accept Active</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {telemetry.autoAcceptCount} Channels
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Zap size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ingestion Webhooks</span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">{telemetry.totalEvents}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Activity size={18} />
          </div>
        </div>
      </div>

      {/* 3. TABS & FILTER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab('CHANNELS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CHANNELS'
                ? 'bg-servora-navy text-white shadow-xs'
                : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
            }`}
          >
            <ShoppingBag size={14} />
            <span>Connected Order Channels ({integrations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LOGS'
                ? 'bg-servora-navy text-white shadow-xs'
                : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
            }`}
          >
            <Activity size={14} />
            <span>Ingestion Audit Log</span>
          </button>
        </div>

        {activeTab === 'CHANNELS' && branches.length > 0 && (
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

      {/* 4. TAB 1: ORDER CHANNELS GRID */}
      {activeTab === 'CHANNELS' && (
        integrations.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-servora-core flex items-center justify-center mx-auto">
              <Truck size={24} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-servora-navy">No Order Channels Connected</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                Link Glovo, Uber Eats, Bolt Food, or your e-commerce website to auto-inject orders into the kitchen and centralize inventory sales.
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Connect First Channel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((item) => {
              const meta = CHANNEL_METADATA[item.channel] || CHANNEL_METADATA.CUSTOM_WEBHOOK;
              const isOnline = item.status === 'ACTIVE';
              const isBusy = testingId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: meta.color }}
                        >
                          <ShoppingBag size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-servora-navy text-sm leading-tight">{item.title}</h3>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {item.branchName ? `${item.branchName} (${item.branchCode})` : 'Tenant-Wide Template'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {item.isDefault && (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-servora-core border border-blue-200 rounded text-[9.5px] font-bold">
                            Default
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${
                            isOnline
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-3 border-b border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Environment</span>
                        <span className="font-mono text-gray-700 font-bold">{item.environment}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Store Identifier</span>
                        <span className="font-mono font-bold text-servora-navy block truncate">
                          {item.storeIdentifier}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Auto-Accept</span>
                        <span className="text-gray-700 block">
                          {item.autoAcceptOrders ? 'Auto-Accepted' : 'Manual Confirmation'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Kitchen Routing</span>
                        <span className="text-gray-700 block">
                          {item.autoSendToKitchen ? 'Auto-Fire to KDS' : 'Hold at POS'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Menu Price Markup</span>
                        <span className="font-mono text-gray-700 block">
                          +{item.priceMarkupPercent}%
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Target Prep Time</span>
                        <span className="font-mono text-gray-700 block">
                          {item.defaultPrepTimeMinutes} mins
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 text-[11px] text-gray-500 flex items-center justify-between">
                      <span>Sync Health:</span>
                      <span className="font-mono font-bold text-servora-navy">
                        {item.lastSyncStatus || 'Pending Sync'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleTestSync(item.id)}
                      disabled={isBusy}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-gray-100 text-servora-navy border border-gray-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Zap size={12} className={isBusy ? 'animate-spin text-amber-500' : 'text-servora-core'} />
                      <span>{isBusy ? 'Syncing...' : 'Ping Channel'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-gray-500 hover:text-servora-core hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
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
        )
      )}

      {/* 5. TAB 2: INGESTION AUDIT LOG */}
      {activeTab === 'LOGS' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">External Reference</th>
                  <th className="py-2.5 px-3">Payload Summary</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                      No order integration events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                        {new Date(log.receivedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-bold text-servora-navy uppercase">{log.channel}</td>
                      <td className="py-3 px-3 font-mono text-gray-600 font-bold">{log.eventType}</td>
                      <td className="py-3 px-3 font-mono text-servora-core">
                        {log.externalOrderId || '—'}
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-gray-700 font-mono text-[11px]">
                        {JSON.stringify(log.payload)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {log.status}
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

      {/* 6. MODAL: PROVISION / EDIT ORDER INTEGRATION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingIntegration ? 'Configure Order Channel' : 'Connect Order Channel Gateway'}
                </h3>
                <p className="text-[11px] text-gray-400">Configure aggregator API keys, automated KDS dispatch, and menu markup</p>
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Channel Provider *</label>
                  <select
                    required
                    value={formData.channel}
                    onChange={(e) => {
                      const c = e.target.value as OrderIntegration['channel'];
                      setFormData({
                        ...formData,
                        channel: c,
                        title: formData.title || CHANNEL_METADATA[c].label,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <optgroup label="Third-Party Delivery Aggregators">
                      <option value="GLOVO">Glovo Delivery</option>
                      <option value="UBER_EATS">Uber Eats</option>
                      <option value="BOLT_FOOD">Bolt Food</option>
                      <option value="DOORDASH">DoorDash</option>
                    </optgroup>
                    <optgroup label="E-Commerce Storefronts">
                      <option value="SHOPIFY">Shopify Store</option>
                      <option value="WOOCOMMERCE">WooCommerce API</option>
                    </optgroup>
                    <optgroup label="Custom Webhooks">
                      <option value="CUSTOM_WEBHOOK">Custom Inbound Order Webhook</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Integration Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter channel name"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Environment Mode</label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold font-mono focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="SANDBOX">Sandbox (Test / Staging Store)</option>
                    <option value="PRODUCTION">Production (Live Ingestion)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Branch Scope</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="">Tenant-Wide (All Locations)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Credentials */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
                <span className="font-bold text-servora-navy block text-xs">Store Identifiers & Security Keys</span>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">
                    {CHANNEL_METADATA[formData.channel].storeIdLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter store ID or URL"
                    value={formData.storeIdentifier}
                    onChange={(e) => setFormData({ ...formData, storeIdentifier: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      {CHANNEL_METADATA[formData.channel].apiKeyLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      {editingIntegration ? 'Secret Key (Blank to keep)' : 'API Secret (Optional)'}
                    </label>
                    <input
                      type="password"
                      value={formData.apiSecret}
                      onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Webhook Secret / Signing Token</label>
                  <input
                    type="password"
                    placeholder="Signature verification token"
                    value={formData.webhookSecret}
                    onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Operational Pacing & Markups */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
                <span className="font-bold text-servora-navy block text-xs">Automation, Kitchen Routing & Pricing</span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Channel Price Markup (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={100}
                      value={formData.priceMarkupPercent}
                      onChange={(e) => setFormData({ ...formData, priceMarkupPercent: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Target Prep Time (Minutes)</label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={formData.defaultPrepTimeMinutes}
                      onChange={(e) => setFormData({ ...formData, defaultPrepTimeMinutes: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoAcceptOrders}
                      onChange={(e) => setFormData({ ...formData, autoAcceptOrders: e.target.checked })}
                      className="rounded"
                    />
                    <span className="font-medium text-servora-navy">Auto-Accept orders without cashier confirmation</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoSendToKitchen}
                      onChange={(e) => setFormData({ ...formData, autoSendToKitchen: e.target.checked })}
                      className="rounded"
                    />
                    <span className="font-medium text-servora-navy">Auto-fire orders directly to Kitchen Display System (KDS)</span>
                  </label>
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
                  {isSubmitting ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}