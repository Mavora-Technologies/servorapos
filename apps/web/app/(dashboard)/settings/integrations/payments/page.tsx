'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Smartphone,
  ChevronRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
  Globe,
  SlidersHorizontal,
  Edit2,
  Trash2,
  X,
  ShieldCheck,
  Building2,
  Layers,
  Activity,
  Landmark,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface PaymentIntegration {
  id: number;
  branchId: number | null;
  branchName: string | null;
  branchCode: string | null;
  provider:
    | 'MPESA_DARAJA'
    | 'PESAPAL'
    | 'DPO_PAY'
    | 'FLUTTERWAVE'
    | 'KCB_BUNI'
    | 'EQUITY_JENGA'
    | 'COOP_BANK'
    | 'STANBIC_BANK'
    | 'NCBA_BANK'
    | 'ABSA_BANK'
    | 'IM_BANK'
    | 'STRIPE'
    | 'ADYEN'
    | 'MANUAL_PDQ';
  title: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  merchantIdentifier: string;
  apiKey: string;
  passKey: string | null;
  webhookSecret: string | null;
  callbackUrl: string | null;
  supportedCurrencies: string[];
  autoReconcile: boolean;
  settlementAccountCode: string | null;
  surchargePercent: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'SUSPENDED';
  lastHandshakeAt: string | null;
  lastHandshakeStatus: string | null;
  isDefault: boolean;
  createdAt: string;
}

interface WebhookLog {
  id: number;
  integrationId: number;
  provider: string;
  eventType: string;
  externalReference: string | null;
  responseCode: number;
  status: string;
  receivedAt: string;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

interface ProviderMeta {
  label: string;
  category: 'Mobile Money & Regional Aggregators' | 'Commercial Banking APIs' | 'Global Card & Terminal';
  icon: any;
  color: string;
  identifierLabel: string;
  keyLabel: string;
  secretLabel: string;
  passKeyLabel?: string;
}

const PROVIDER_METADATA: Record<PaymentIntegration['provider'], ProviderMeta> = {
  MPESA_DARAJA: {
    label: 'Safaricom M-Pesa Daraja',
    category: 'Mobile Money & Regional Aggregators',
    icon: Smartphone,
    color: '#10B981',
    identifierLabel: 'Business Shortcode / Till Number',
    keyLabel: 'Consumer Key',
    secretLabel: 'Consumer Secret',
    passKeyLabel: 'Online Passkey',
  },
  PESAPAL: {
    label: 'Pesapal IPN Gateway',
    category: 'Mobile Money & Regional Aggregators',
    icon: Globe,
    color: '#0554F4',
    identifierLabel: 'Merchant Consumer Key',
    keyLabel: 'Consumer Key',
    secretLabel: 'Consumer Secret',
  },
  DPO_PAY: {
    label: 'DPO Group (Direct Pay Online)',
    category: 'Mobile Money & Regional Aggregators',
    icon: ShieldCheck,
    color: '#D97706',
    identifierLabel: 'Company Token',
    keyLabel: 'API Service Type',
    secretLabel: 'Company Secret Key',
  },
  FLUTTERWAVE: {
    label: 'Flutterwave',
    category: 'Mobile Money & Regional Aggregators',
    icon: Layers,
    color: '#F59E0B',
    identifierLabel: 'Merchant ID',
    keyLabel: 'Public API Key',
    secretLabel: 'Secret API Key',
  },
  KCB_BUNI: {
    label: 'KCB Bank (Buni Open API / Vooma)',
    category: 'Commercial Banking APIs',
    icon: Landmark,
    color: '#008751',
    identifierLabel: 'Merchant Till / Buni App ID',
    keyLabel: 'Buni Consumer Key',
    secretLabel: 'Buni Consumer Secret',
    passKeyLabel: 'Buni Certificate / Passkey',
  },
  EQUITY_JENGA: {
    label: 'Equity Bank (Jenga API / EazzyPay)',
    category: 'Commercial Banking APIs',
    icon: Landmark,
    color: '#A32A29',
    identifierLabel: 'Jenga Merchant Code',
    keyLabel: 'Jenga API Key',
    secretLabel: 'Jenga Private Key / Secret',
    passKeyLabel: 'Bearer Token / Passcode',
  },
  COOP_BANK: {
    label: 'Co-operative Bank (Co-op Connect API)',
    category: 'Commercial Banking APIs',
    icon: Landmark,
    color: '#005930',
    identifierLabel: 'Co-op Account / Terminal ID',
    keyLabel: 'Client ID',
    secretLabel: 'Client Secret Key',
    passKeyLabel: 'Security Token',
  },
  STANBIC_BANK: {
    label: 'Stanbic Bank (OneHub Open Banking)',
    category: 'Commercial Banking APIs',
    icon: Landmark,
    color: '#0033A0',
    identifierLabel: 'Stanbic Profile / Merchant ID',
    keyLabel: 'App Key / Client ID',
    secretLabel: 'Client Secret',
  },
  NCBA_BANK: {
    label: 'NCBA Bank (Open Banking / Loop)',
    category: 'Commercial Banking APIs',
    icon: Landmark,
    color: '#1E293B',
    identifierLabel: 'NCBA Merchant Account / Shortcode',
    keyLabel: 'Consumer Key',
    secretLabel: 'Consumer Secret',
  },
  ABSA_BANK: {
    label: 'Absa Bank (API Exchange Gateway)',
    category: 'Commercial Banking APIs',
    icon: Landmark,
    color: '#B4003C',
    identifierLabel: 'Merchant Number / Terminal MID',
    keyLabel: 'Client Key',
    secretLabel: 'Client Secret Key',
  },
  IM_BANK: {
    label: 'I&M Bank (Open Banking API)',
    category: 'Commercial Banking APIs',
    icon: Landmark,
    color: '#005B94',
    identifierLabel: 'Client Code / Merchant ID',
    keyLabel: 'Client ID',
    secretLabel: 'Secret Token',
  },
  STRIPE: {
    label: 'Stripe Terminal & Billing',
    category: 'Global Card & Terminal',
    icon: CreditCard,
    color: '#6366F1',
    identifierLabel: 'Stripe Account ID',
    keyLabel: 'Publishable API Key',
    secretLabel: 'Secret Key',
  },
  ADYEN: {
    label: 'Adyen Omnichannel',
    category: 'Global Card & Terminal',
    icon: Server,
    color: '#00112C',
    identifierLabel: 'Merchant Account Code',
    keyLabel: 'API Key',
    secretLabel: 'HMAC Signing Key',
  },
  MANUAL_PDQ: {
    label: 'Standalone Bank PDQ Terminal',
    category: 'Global Card & Terminal',
    icon: CreditCard,
    color: '#64748B',
    identifierLabel: 'Terminal TID / MID Number',
    keyLabel: 'Station Device Identifier',
    secretLabel: 'PIN Pad Auth Key',
  },
};

export default function PaymentIntegrationsPage() {
  const [integrations, setIntegrations] = useState<PaymentIntegration[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<PaymentIntegration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    branchId: '',
    provider: 'MPESA_DARAJA' as PaymentIntegration['provider'],
    title: '',
    environment: 'SANDBOX' as PaymentIntegration['environment'],
    merchantIdentifier: '',
    apiKey: '',
    apiSecret: '',
    passKey: '',
    webhookSecret: '',
    callbackUrl: '',
    supportedCurrencies: ['KES'],
    autoReconcile: true,
    settlementAccountCode: '',
    surchargePercent: 0,
    status: 'ACTIVE' as PaymentIntegration['status'],
    isDefault: false,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const queryParam = selectedBranchId !== 'ALL' ? `?branchId=${selectedBranchId}` : '';
      const [res, branchRes] = await Promise.all([
        fetchApi(`/api/v1/settings/integrations/payments${queryParam}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (res?.data) {
        setIntegrations(res.data.integrations || []);
        setWebhookLogs(res.data.logs || []);
      }
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load payment gateways:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  const telemetry = useMemo(() => {
    const totalGateways = integrations.length;
    const activeGateways = integrations.filter((g) => g.status === 'ACTIVE').length;
    const defaultGateway = integrations.find((g) => g.isDefault)?.title || 'Unassigned';
    const totalLogs = webhookLogs.length;

    return {
      totalGateways,
      activeGateways,
      defaultGateway,
      totalLogs,
    };
  }, [integrations, webhookLogs]);

  const openCreateModal = () => {
    setEditingIntegration(null);
    setFormError(null);
    setFormData({
      branchId: branches[0]?.id ? String(branches[0].id) : '',
      provider: 'MPESA_DARAJA',
      title: '',
      environment: 'SANDBOX',
      merchantIdentifier: '',
      apiKey: '',
      apiSecret: '',
      passKey: '',
      webhookSecret: '',
      callbackUrl: '',
      supportedCurrencies: ['KES'],
      autoReconcile: true,
      settlementAccountCode: '',
      surchargePercent: 0,
      status: 'ACTIVE',
      isDefault: integrations.length === 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: PaymentIntegration) => {
    setEditingIntegration(item);
    setFormError(null);
    setFormData({
      branchId: item.branchId ? String(item.branchId) : '',
      provider: item.provider,
      title: item.title,
      environment: item.environment,
      merchantIdentifier: item.merchantIdentifier,
      apiKey: item.apiKey,
      apiSecret: '',
      passKey: item.passKey || '',
      webhookSecret: item.webhookSecret || '',
      callbackUrl: item.callbackUrl || '',
      supportedCurrencies: item.supportedCurrencies || ['KES'],
      autoReconcile: item.autoReconcile,
      settlementAccountCode: item.settlementAccountCode || '',
      surchargePercent: parseFloat(item.surchargePercent) || 0,
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
        await fetchApi(`/api/v1/settings/integrations/payments/${editingIntegration.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/api/v1/settings/integrations/payments', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      setToastMessage({ text: 'Payment gateway configuration saved.', type: 'success' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save payment integration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestHandshake = async (id: number) => {
    try {
      setTestingId(id);
      const res = await fetchApi('/api/v1/settings/integrations/payments/test-handshake', {
        method: 'POST',
        body: JSON.stringify({ integrationId: id }),
      });
      setToastMessage({
        text: `${res.message} [Latency: ${res.data?.latencyMs}ms]`,
        type: res.data?.isSuccess ? 'success' : 'error',
      });
      loadData();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Handshake failed', type: 'error' });
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this payment gateway?')) return;
    try {
      await fetchApi(`/api/v1/settings/integrations/payments/${id}`, { method: 'DELETE' });
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
            <span className="text-xs font-bold text-servora-navy">Financial Integrations & Settlement</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Payment Gateways & Banking Integrations</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Configure mobile money (M-Pesa Daraja), Kenyan bank APIs, and card terminals without hardcoded constraints.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Connect Gateway
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

      {/* 2. GATEWAY TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Adapters</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">{telemetry.totalGateways}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Server size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Gateways</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {telemetry.activeGateways} Online
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Primary Provider</span>
            <p className="text-xs font-bold font-mono text-servora-navy mt-1 truncate max-w-[130px]">
              {telemetry.defaultGateway}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">IPN Webhook Events</span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">{telemetry.totalLogs}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Activity size={18} />
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
            <option value="ALL">All Branch Locations (Tenant-Wide)</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 4. INTEGRATIONS GRID */}
      {integrations.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-servora-core flex items-center justify-center mx-auto">
            <Landmark size={24} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-servora-navy">No Payment Gateways Configured</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              Connect M-Pesa Daraja, bank API accounts, or card payment acquirers to begin reconciling payments.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Connect First Gateway
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((item) => {
            const meta = PROVIDER_METADATA[item.provider] || PROVIDER_METADATA.MANUAL_PDQ;
            const Icon = meta.icon;
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
                        <Icon size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-servora-navy text-sm leading-tight">{item.title}</h3>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {item.branchName ? `${item.branchName} (${item.branchCode})` : 'Tenant-Wide Default'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {item.isDefault && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-servora-core border border-blue-200 rounded text-[9.5px] font-bold">
                          Primary
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
                      <span className="font-mono text-gray-700 font-bold">
                        {item.environment}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Identifier / Till</span>
                      <span className="font-mono font-bold text-servora-navy block truncate">
                        {item.merchantIdentifier}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Auto-Reconcile</span>
                      <span className="text-gray-700 block">
                        {item.autoReconcile ? 'Real-time IPN' : 'Manual Audit'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Currencies</span>
                      <span className="font-mono text-gray-700 block">
                        {item.supportedCurrencies.join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-gray-500 flex items-center justify-between">
                    <span>Handshake Status:</span>
                    <span className="font-mono font-bold text-servora-navy">
                      {item.lastHandshakeStatus ? item.lastHandshakeStatus : 'Not Tested'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleTestHandshake(item.id)}
                    disabled={isBusy}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-gray-100 text-servora-navy border border-gray-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Zap size={12} className={isBusy ? 'animate-spin text-amber-500' : 'text-servora-core'} />
                    <span>{isBusy ? 'Verifying...' : 'Ping Gateway'}</span>
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
      )}

      {/* 5. MODAL: PROVISION / EDIT PAYMENT INTEGRATION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingIntegration ? 'Configure Gateway Adapter' : 'Connect Banking / Payment Gateway'}
                </h3>
                <p className="text-[11px] text-gray-400">Configure provider keys, merchant account parameters, and callbacks</p>
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Provider Adapter *</label>
                  <select
                    required
                    value={formData.provider}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        provider: e.target.value as PaymentIntegration['provider'],
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <optgroup label="Mobile Money & Regional Aggregators">
                      <option value="MPESA_DARAJA">Safaricom M-Pesa Daraja</option>
                      <option value="PESAPAL">Pesapal IPN Gateway</option>
                      <option value="DPO_PAY">DPO Group (Direct Pay Online)</option>
                      <option value="FLUTTERWAVE">Flutterwave</option>
                    </optgroup>

                    <optgroup label="Commercial Banking APIs">
                      <option value="KCB_BUNI">KCB Bank (Buni Open API / Vooma)</option>
                      <option value="EQUITY_JENGA">Equity Bank (Jenga API / EazzyPay)</option>
                      <option value="COOP_BANK">Co-operative Bank (Co-op Connect API)</option>
                      <option value="STANBIC_BANK">Stanbic Bank (OneHub API)</option>
                      <option value="NCBA_BANK">NCBA Bank (Open Banking / Loop)</option>
                      <option value="ABSA_BANK">Absa Bank (API Exchange)</option>
                      <option value="IM_BANK">I&M Bank (Open Banking API)</option>
                    </optgroup>

                    <optgroup label="Global Card & Terminal Gateways">
                      <option value="STRIPE">Stripe Terminal & Billing</option>
                      <option value="ADYEN">Adyen Omnichannel</option>
                      <option value="MANUAL_PDQ">Standalone Bank PDQ Terminal</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Integration Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter integration title"
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
                    <option value="SANDBOX">Sandbox (Test Environment)</option>
                    <option value="PRODUCTION">Production (Live Gateway)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Branch Scope</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="">Tenant-Wide (All Outlets)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cryptographic Secrets & Account Keys */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
                <span className="font-bold text-servora-navy block text-xs">Authentication & Secret Credentials</span>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">
                    {PROVIDER_METADATA[formData.provider].identifierLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.merchantIdentifier}
                    onChange={(e) => setFormData({ ...formData, merchantIdentifier: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      {PROVIDER_METADATA[formData.provider].keyLabel} *
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
                      {editingIntegration
                        ? `${PROVIDER_METADATA[formData.provider].secretLabel} (Blank to keep)`
                        : `${PROVIDER_METADATA[formData.provider].secretLabel} *`}
                    </label>
                    <input
                      type="password"
                      required={!editingIntegration}
                      value={formData.apiSecret}
                      onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {PROVIDER_METADATA[formData.provider].passKeyLabel && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      {PROVIDER_METADATA[formData.provider].passKeyLabel}
                    </label>
                    <input
                      type="password"
                      value={formData.passKey}
                      onChange={(e) => setFormData({ ...formData, passKey: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Settlement & Audit Configuration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">GL Clearing Code</label>
                  <input
                    type="text"
                    placeholder="Enter GL code from Chart of Accounts"
                    value={formData.settlementAccountCode}
                    onChange={(e) => setFormData({ ...formData, settlementAccountCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Surcharge Markup (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    value={formData.surchargePercent}
                    onChange={(e) => setFormData({ ...formData, surchargePercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoReconcile}
                    onChange={(e) => setFormData({ ...formData, autoReconcile: e.target.checked })}
                    className="rounded"
                  />
                  <span className="font-medium text-servora-navy">Auto-reconcile transactions via Webhook IPN callbacks</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded"
                  />
                  <span className="font-medium text-servora-navy">Set as primary checkout tender method</span>
                </label>
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