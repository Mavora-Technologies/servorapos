'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Mail,
  Send,
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
  Activity,
  Layers,
  FileText,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface MessagingIntegration {
  id: number;
  branchId: number | null;
  branchName: string | null;
  branchCode: string | null;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'WEBHOOK';
  provider:
    | 'AFRICAS_TALKING'
    | 'TWILIO'
    | 'ADVANTA_SMS'
    | 'SAFARICOM_BULK_SMS'
    | 'INFOBIP'
    | 'SENDGRID'
    | 'RESEND'
    | 'AWS_SES'
    | 'CUSTOM_WEBHOOK';
  title: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  senderId: string | null;
  accountIdentifier: string;
  apiKey: string;
  webhookUrl: string | null;
  monthlyCreditCap: number;
  currentMonthDispatches: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'SUSPENDED';
  lastHandshakeAt: string | null;
  lastHandshakeStatus: string | null;
  isDefault: boolean;
  createdAt: string;
}

interface MessagingTemplate {
  id: number;
  name: string;
  triggerEvent:
    | 'SHIFT_SCHEDULED'
    | 'SHIFT_REMINDER'
    | 'LATE_CLOCK_IN'
    | 'HANDOVER_PENDING'
    | 'RECEIPT_DISPATCH'
    | 'SAFE_DROP_ALERT';
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  subject: string | null;
  bodyTemplate: string;
  isActive: boolean;
}

interface DispatchLog {
  id: number;
  recipient: string;
  channel: string;
  triggerEvent: string | null;
  bodyContent: string;
  externalMessageId: string | null;
  status: string;
  dispatchedAt: string;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

interface ProviderMeta {
  label: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'WEBHOOK';
  color: string;
  accountLabel: string;
  keyLabel: string;
  senderLabel?: string;
}

const PROVIDER_METADATA: Record<MessagingIntegration['provider'], ProviderMeta> = {
  AFRICAS_TALKING: {
    label: "Africa's Talking SMS",
    channel: 'SMS',
    color: '#0554F4',
    accountLabel: 'App Username',
    keyLabel: 'API Key',
    senderLabel: 'Alphanumeric Sender ID',
  },
  TWILIO: {
    label: 'Twilio Programmable Messaging',
    channel: 'SMS',
    color: '#F22F46',
    accountLabel: 'Account SID',
    keyLabel: 'Auth Token',
    senderLabel: 'Twilio Phone Number / Messaging Service SID',
  },
  ADVANTA_SMS: {
    label: 'Advanta Africa Bulk SMS',
    channel: 'SMS',
    color: '#008751',
    accountLabel: 'Partner ID',
    keyLabel: 'API Key',
    senderLabel: 'Sender ID',
  },
  SAFARICOM_BULK_SMS: {
    label: 'Safaricom Bulk SMS API',
    channel: 'SMS',
    color: '#10B981',
    accountLabel: 'Service Provider ID (SPID)',
    keyLabel: 'API Password / Token',
    senderLabel: 'Shortcode / Sender ID',
  },
  INFOBIP: {
    label: 'Infobip Omnichannel & WhatsApp',
    channel: 'WHATSAPP',
    color: '#FF5722',
    accountLabel: 'Base URL / Account ID',
    keyLabel: 'API Key',
    senderLabel: 'WhatsApp Sender Number',
  },
  SENDGRID: {
    label: 'Twilio SendGrid Email',
    channel: 'EMAIL',
    color: '#1A82E2',
    accountLabel: 'Verified Sender Email',
    keyLabel: 'API Key',
    senderLabel: 'From Name',
  },
  RESEND: {
    label: 'Resend Transactional Email',
    channel: 'EMAIL',
    color: '#18181B',
    accountLabel: 'Sending Domain / Email',
    keyLabel: 'API Key (re_...)',
    senderLabel: 'Sender Name',
  },
  AWS_SES: {
    label: 'Amazon Simple Email Service (SES)',
    channel: 'EMAIL',
    color: '#FF9900',
    accountLabel: 'AWS Access Key ID',
    keyLabel: 'AWS Secret Access Key',
    senderLabel: 'Verified Identity / ARN',
  },
  CUSTOM_WEBHOOK: {
    label: 'Generic HTTP Webhook Dispatcher',
    channel: 'WEBHOOK',
    color: '#64748B',
    accountLabel: 'Endpoint Title / Target ID',
    keyLabel: 'Bearer Token / HMAC Secret',
  },
};

export default function MessagingIntegrationsPage() {
  const [integrations, setIntegrations] = useState<MessagingIntegration[]>([]);
  const [templates, setTemplates] = useState<MessagingTemplate[]>([]);
  const [logs, setLogs] = useState<DispatchLog[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'GATEWAYS' | 'TEMPLATES' | 'LOGS'>('GATEWAYS');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Gateway Modal State
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<MessagingIntegration | null>(null);
  const [isSubmittingGateway, setIsSubmittingGateway] = useState(false);
  const [gatewayFormError, setGatewayFormError] = useState<string | null>(null);

  const [gatewayForm, setGatewayForm] = useState({
    branchId: '',
    channel: 'SMS' as MessagingIntegration['channel'],
    provider: 'AFRICAS_TALKING' as MessagingIntegration['provider'],
    title: '',
    environment: 'SANDBOX' as MessagingIntegration['environment'],
    senderId: '',
    accountIdentifier: '',
    apiKey: '',
    apiSecret: '',
    webhookUrl: '',
    monthlyCreditCap: 0,
    status: 'ACTIVE' as MessagingIntegration['status'],
    isDefault: false,
  });

  // Test Dispatch Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [targetIntegration, setTargetIntegration] = useState<MessagingIntegration | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [testMessage, setTestMessage] = useState('Servora HCM: Your shift has been updated. Review your schedule.');
  const [isTesting, setIsTesting] = useState(false);

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessagingTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    triggerEvent: 'SHIFT_SCHEDULED' as MessagingTemplate['triggerEvent'],
    channel: 'SMS' as MessagingTemplate['channel'],
    subject: '',
    bodyTemplate: 'Hello {{employee_name}}, you are scheduled for {{shift_date}} starting at {{start_time}} at {{branch_name}}.',
    isActive: true,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const queryParam = selectedBranchId !== 'ALL' ? `?branchId=${selectedBranchId}` : '';
      const [messagingRes, branchRes] = await Promise.all([
        fetchApi(`/api/v1/settings/integrations/messaging${queryParam}`),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (messagingRes?.data) {
        setIntegrations(messagingRes.data.integrations || []);
        setTemplates(messagingRes.data.templates || []);
        setLogs(messagingRes.data.logs || []);
      }
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load messaging integrations:', err);
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
    const totalTemplates = templates.length;
    const totalDispatches = logs.length;

    return {
      totalGateways,
      activeGateways,
      totalTemplates,
      totalDispatches,
    };
  }, [integrations, templates, logs]);

  const openCreateGatewayModal = () => {
    setEditingIntegration(null);
    setGatewayFormError(null);
    setGatewayForm({
      branchId: branches[0]?.id ? String(branches[0].id) : '',
      channel: 'SMS',
      provider: 'AFRICAS_TALKING',
      title: '',
      environment: 'SANDBOX',
      senderId: '',
      accountIdentifier: '',
      apiKey: '',
      apiSecret: '',
      webhookUrl: '',
      monthlyCreditCap: 0,
      status: 'ACTIVE',
      isDefault: integrations.length === 0,
    });
    setIsGatewayModalOpen(true);
  };

  const openEditGatewayModal = (item: MessagingIntegration) => {
    setEditingIntegration(item);
    setGatewayFormError(null);
    setGatewayForm({
      branchId: item.branchId ? String(item.branchId) : '',
      channel: item.channel,
      provider: item.provider,
      title: item.title,
      environment: item.environment,
      senderId: item.senderId || '',
      accountIdentifier: item.accountIdentifier,
      apiKey: item.apiKey,
      apiSecret: '',
      webhookUrl: item.webhookUrl || '',
      monthlyCreditCap: item.monthlyCreditCap,
      status: item.status,
      isDefault: item.isDefault,
    });
    setIsGatewayModalOpen(true);
  };

  const handleProviderSelect = (p: MessagingIntegration['provider']) => {
    const meta = PROVIDER_METADATA[p];
    setGatewayForm((prev) => ({
      ...prev,
      provider: p,
      channel: meta.channel,
    }));
  };

  const handleGatewaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGatewayFormError(null);
    try {
      setIsSubmittingGateway(true);
      const payload: Record<string, any> = {
        ...gatewayForm,
        branchId: gatewayForm.branchId ? parseInt(gatewayForm.branchId, 10) : null,
      };

      if (editingIntegration && !gatewayForm.apiSecret) {
        delete payload.apiSecret;
      }

      if (editingIntegration) {
        await fetchApi(`/api/v1/settings/integrations/messaging/gateways/${editingIntegration.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/api/v1/settings/integrations/messaging/gateways', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsGatewayModalOpen(false);
      setToastMessage({ text: 'Messaging gateway configuration saved.', type: 'success' });
      loadData();
    } catch (err: any) {
      setGatewayFormError(err.message || 'Failed to save gateway configuration');
    } finally {
      setIsSubmittingGateway(false);
    }
  };

  const handleDeleteGateway = async (id: number) => {
    if (!confirm('Are you sure you want to delete this messaging gateway?')) return;
    try {
      await fetchApi(`/api/v1/settings/integrations/messaging/gateways/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete gateway');
    }
  };

  const handleOpenTestModal = (item: MessagingIntegration) => {
    setTargetIntegration(item);
    setTestRecipient('');
    setTestMessage(`Servora Test Dispatch via ${item.title}`);
    setIsTestModalOpen(true);
  };

  const handleTestDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetIntegration) return;
    try {
      setIsTesting(true);
      const res = await fetchApi('/api/v1/settings/integrations/messaging/gateways/test-dispatch', {
        method: 'POST',
        body: JSON.stringify({
          integrationId: targetIntegration.id,
          recipient: testRecipient,
          message: testMessage,
        }),
      });

      setToastMessage({
        text: `${res.message} [Latency: ${res.data?.latencyMs}ms]`,
        type: res.data?.success ? 'success' : 'error',
      });
      setIsTestModalOpen(false);
      loadData();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Test dispatch failed', type: 'error' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await fetchApi(`/api/v1/settings/integrations/messaging/templates/${editingTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify(templateForm),
        });
      } else {
        await fetchApi('/api/v1/settings/integrations/messaging/templates', {
          method: 'POST',
          body: JSON.stringify(templateForm),
        });
      }
      setIsTemplateModalOpen(false);
      setToastMessage({ text: 'Template configuration updated.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this notification template?')) return;
    try {
      await fetchApi(`/api/v1/settings/integrations/messaging/templates/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete template');
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
            <span className="text-xs font-bold text-servora-navy">Communications & Alerts</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Messaging Gateways & Notification Services</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Configure SMS gateways, WhatsApp Business accounts, transactional email services, and automated employee schedule notifications.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={openCreateGatewayModal}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Add Gateway
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Gateways</span>
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Event Templates</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">{telemetry.totalTemplates}</p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <FileText size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Outbound Dispatches</span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">{telemetry.totalDispatches}</p>
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
            onClick={() => setActiveTab('GATEWAYS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'GATEWAYS'
                ? 'bg-servora-navy text-white shadow-xs'
                : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
            }`}
          >
            <Server size={14} />
            <span>Connected Gateways ({integrations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TEMPLATES')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'TEMPLATES'
                ? 'bg-servora-navy text-white shadow-xs'
                : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
            }`}
          >
            <FileText size={14} />
            <span>Event Templates ({templates.length})</span>
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
            <span>Dispatch Audit Log</span>
          </button>
        </div>

        {activeTab === 'GATEWAYS' && branches.length > 0 && (
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

      {/* 4. TAB 1: CONNECTED GATEWAYS */}
      {activeTab === 'GATEWAYS' && (
        integrations.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-servora-core flex items-center justify-center mx-auto">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-servora-navy">No Messaging Gateways Connected</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                Connect an SMS provider, WhatsApp Business gateway, or transactional email service to send staff roster alerts and customer receipts.
              </p>
            </div>
            <button
              onClick={openCreateGatewayModal}
              className="px-4 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Connect First Gateway
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((item) => {
              const meta = PROVIDER_METADATA[item.provider] || PROVIDER_METADATA.CUSTOM_WEBHOOK;
              const isOnline = item.status === 'ACTIVE';

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
                          {item.channel === 'SMS' && <Smartphone size={20} />}
                          {item.channel === 'WHATSAPP' && <MessageSquare size={20} />}
                          {item.channel === 'EMAIL' && <Mail size={20} />}
                          {item.channel === 'WEBHOOK' && <Globe size={20} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-servora-navy text-sm leading-tight">{item.title}</h3>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {item.branchName ? `${item.branchName} (${item.branchCode})` : 'Tenant-Wide Scope'}
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
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Channel</span>
                        <span className="font-bold text-servora-navy block">{item.channel}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Environment</span>
                        <span className="font-mono text-gray-700 font-bold">{item.environment}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Sender Identity</span>
                        <span className="font-mono font-bold text-servora-navy block truncate">
                          {item.senderId || 'Default Mask'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Monthly Dispatches</span>
                        <span className="font-mono text-gray-700 block">
                          {item.currentMonthDispatches} {item.monthlyCreditCap > 0 ? `/ ${item.monthlyCreditCap}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 text-[11px] text-gray-500 flex items-center justify-between">
                      <span>Health Verification:</span>
                      <span className="font-mono font-bold text-servora-navy">
                        {item.lastHandshakeStatus || 'Pending Verification'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleOpenTestModal(item)}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-gray-100 text-servora-navy border border-gray-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Send size={12} className="text-servora-core" />
                      <span>Test Dispatch</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditGatewayModal(item)}
                        className="p-1.5 text-gray-500 hover:text-servora-core hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGateway(item.id)}
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

      {/* 5. TAB 2: EVENT NOTIFICATION TEMPLATES */}
      {activeTab === 'TEMPLATES' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Merge-Tag Event Templates</h3>
              <p className="text-xs text-gray-400">
                Variables supported: <code>{`{{employee_name}}`}</code>, <code>{`{{shift_date}}`}</code>, <code>{`{{start_time}}`}</code>, <code>{`{{branch_name}}`}</code>, <code>{`{{order_number}}`}</code>, <code>{`{{grand_total}}`}</code>
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setTemplateForm({
                  name: '',
                  triggerEvent: 'SHIFT_SCHEDULED',
                  channel: 'SMS',
                  subject: '',
                  bodyTemplate: '',
                  isActive: true,
                });
                setIsTemplateModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Add Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.length === 0 ? (
              <div className="col-span-full p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center text-xs text-gray-400 italic">
                No notification templates configured.
              </div>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2.5">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                    <div>
                      <h4 className="font-bold text-servora-navy text-xs">{tpl.name}</h4>
                      <span className="text-[10px] font-mono font-bold text-servora-core uppercase bg-blue-50 px-1.5 py-0.2 rounded">
                        {tpl.triggerEvent} &bull; {tpl.channel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingTemplate(tpl);
                          setTemplateForm({
                            name: tpl.name,
                            triggerEvent: tpl.triggerEvent,
                            channel: tpl.channel,
                            subject: tpl.subject || '',
                            bodyTemplate: tpl.bodyTemplate,
                            isActive: tpl.isActive,
                          });
                          setIsTemplateModalOpen(true);
                        }}
                        className="p-1 text-gray-500 hover:text-servora-core rounded cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {tpl.subject && (
                    <div className="text-xs">
                      <span className="font-bold text-gray-500">Subject:</span> {tpl.subject}
                    </div>
                  )}

                  <p className="text-xs font-mono bg-slate-50 p-2.5 rounded-xl border border-gray-100 text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {tpl.bodyTemplate}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6. TAB 3: DISPATCH AUDIT LOG */}
      {activeTab === 'LOGS' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Trigger / Event</th>
                  <th className="py-2.5 px-3">Message Content</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                      No dispatch audit logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                        {new Date(log.dispatchedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-bold text-servora-navy uppercase">{log.channel}</td>
                      <td className="py-3 px-3 font-mono font-bold text-servora-core">{log.recipient}</td>
                      <td className="py-3 px-3 text-gray-600">{log.triggerEvent || 'DIRECT'}</td>
                      <td className="py-3 px-3 max-w-xs truncate text-gray-700 font-mono text-[11px]">
                        {log.bodyContent}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            log.status === 'DELIVERED'
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

      {/* 7. MODAL: PROVISION / EDIT GATEWAY */}
      {isGatewayModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingIntegration ? 'Configure Messaging Gateway' : 'Connect Messaging Gateway'}
                </h3>
                <p className="text-[11px] text-gray-400">Configure provider keys, sender identities, and dispatch scopes</p>
              </div>
              <button onClick={() => setIsGatewayModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {gatewayFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {gatewayFormError}
              </div>
            )}

            <form onSubmit={handleGatewaySubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Provider Adapter *</label>
                  <select
                    required
                    value={gatewayForm.provider}
                    onChange={(e) => handleProviderSelect(e.target.value as MessagingIntegration['provider'])}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <optgroup label="SMS Gateways">
                      <option value="AFRICAS_TALKING">Africa&apos;s Talking SMS</option>
                      <option value="TWILIO">Twilio Programmable SMS</option>
                      <option value="ADVANTA_SMS">Advanta Africa Bulk SMS</option>
                      <option value="SAFARICOM_BULK_SMS">Safaricom Bulk SMS API</option>
                    </optgroup>
                    <optgroup label="WhatsApp Gateways">
                      <option value="INFOBIP">Infobip WhatsApp Business</option>
                    </optgroup>
                    <optgroup label="Transactional Email">
                      <option value="SENDGRID">Twilio SendGrid Email</option>
                      <option value="RESEND">Resend Email</option>
                      <option value="AWS_SES">Amazon SES</option>
                    </optgroup>
                    <optgroup label="Custom Webhooks">
                      <option value="CUSTOM_WEBHOOK">Custom HTTP Webhook</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Gateway Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter integration title"
                    value={gatewayForm.title}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Environment Mode</label>
                  <select
                    value={gatewayForm.environment}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, environment: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold font-mono focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="SANDBOX">Sandbox (Test / Staging)</option>
                    <option value="PRODUCTION">Production (Live Gateway)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Branch Scope</label>
                  <select
                    value={gatewayForm.branchId}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, branchId: e.target.value })}
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

              {/* Dynamic Credentials */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
                <span className="font-bold text-servora-navy block text-xs">Authentication & Credentials</span>

                {PROVIDER_METADATA[gatewayForm.provider].senderLabel && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      {PROVIDER_METADATA[gatewayForm.provider].senderLabel}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RESTAURANT or +254..."
                      value={gatewayForm.senderId}
                      onChange={(e) => setGatewayForm({ ...gatewayForm, senderId: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">
                    {PROVIDER_METADATA[gatewayForm.provider].accountLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={gatewayForm.accountIdentifier}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, accountIdentifier: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      {PROVIDER_METADATA[gatewayForm.provider].keyLabel} *
                    </label>
                    <input
                      type="password"
                      required
                      value={gatewayForm.apiKey}
                      onChange={(e) => setGatewayForm({ ...gatewayForm, apiKey: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">
                      {editingIntegration ? 'API Secret (Blank to keep)' : 'API Secret (Optional)'}
                    </label>
                    <input
                      type="password"
                      value={gatewayForm.apiSecret}
                      onChange={(e) => setGatewayForm({ ...gatewayForm, apiSecret: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Delivery Report (DLR) Webhook URL</label>
                  <input
                    type="url"
                    placeholder="https://api.domain.com/webhooks/messaging"
                    value={gatewayForm.webhookUrl}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, webhookUrl: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gatewayForm.isDefault}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, isDefault: e.target.checked })}
                    className="rounded"
                  />
                  <span className="font-medium text-servora-navy">
                    Set as default gateway for this channel ({gatewayForm.channel})
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsGatewayModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGateway}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingGateway ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: TEST DISPATCH */}
      {isTestModalOpen && targetIntegration && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Test Gateway Dispatch</h3>
                <p className="text-[11px] text-gray-400">Dispatch test payload through {targetIntegration.title}</p>
              </div>
              <button onClick={() => setIsTestModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTestDispatchSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Recipient ({targetIntegration.channel === 'EMAIL' ? 'Email Address' : 'Phone Number'}) *
                </label>
                <input
                  type={targetIntegration.channel === 'EMAIL' ? 'email' : 'text'}
                  required
                  placeholder={targetIntegration.channel === 'EMAIL' ? 'user@domain.com' : '+2547XXXXXXXX'}
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Test Payload Message *</label>
                <textarea
                  rows={3}
                  required
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTesting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{isTesting ? 'Sending...' : 'Send Test'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: TEMPLATE CREATOR / EDITOR */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingTemplate ? 'Edit Notification Template' : 'Create Notification Template'}
                </h3>
                <p className="text-[11px] text-gray-400">Configure trigger events and merge-tag templates</p>
              </div>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTemplateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Template Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Roster Published SMS"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Target Channel *</label>
                  <select
                    value={templateForm.channel}
                    onChange={(e) => setTemplateForm({ ...templateForm, channel: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="SMS">SMS Message</option>
                    <option value="WHATSAPP">WhatsApp Direct</option>
                    <option value="EMAIL">Email Dispatch</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Trigger Event *</label>
                <select
                  value={templateForm.triggerEvent}
                  onChange={(e) => setTemplateForm({ ...templateForm, triggerEvent: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  <option value="SHIFT_SCHEDULED">Shift Allocated / Roster Published</option>
                  <option value="SHIFT_REMINDER">Pre-Shift Reminder Alert</option>
                  <option value="LATE_CLOCK_IN">Late Arrival / Attendance Flag</option>
                  <option value="HANDOVER_PENDING">Manager Shift Handover Sign-off</option>
                  <option value="SAFE_DROP_ALERT">Till Threshold Safe Drop Required</option>
                  <option value="RECEIPT_DISPATCH">Digital Receipt & Fiscal Slip</option>
                </select>
              </div>

              {templateForm.channel === 'EMAIL' && (
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Email Subject Line *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Schedule Update: You have a new shift assigned"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Template Content *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter notification message using merge tags..."
                  value={templateForm.bodyTemplate}
                  onChange={(e) => setTemplateForm({ ...templateForm, bodyTemplate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}