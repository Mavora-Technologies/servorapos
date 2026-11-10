'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Puzzle,
  Zap,
  Play,
  TrendingUp,
  ShieldCheck,
  Plus,
  RefreshCw,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  Users,
  Package,
  Sparkles,
  DollarSign,
  Edit3,
  X,
  FileCode,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface DynamicRole {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isSystemRole: boolean;
}

interface EventFieldSchema {
  field: string;
  label: string;
  type: 'NUMBER' | 'STRING' | 'BOOLEAN';
  unit?: string;
  allowedOperators: ('GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'CONTAINS')[];
  defaultValue: any;
}

interface TriggerEventDefinition {
  event: string;
  label: string;
  domain: 'WORKFORCE_HCM' | 'INVENTORY_SCM' | 'GUEST_CRM' | 'FINANCE_TREASURY';
  description: string;
  payloadFields: EventFieldSchema[];
  supportedActions: string[];
}

interface ActionDefinition {
  actionType: string;
  label: string;
  requiresTargetRole: boolean;
  payloadFields: { name: string; label: string; type: string }[];
}

interface WorkflowTemplate {
  templateId: string;
  name: string;
  description: string;
  domain: 'WORKFORCE_HCM' | 'INVENTORY_SCM' | 'GUEST_CRM' | 'FINANCE_TREASURY';
  triggerEvent: string;
  conditionLogic: {
    field: string;
    operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'CONTAINS';
    value: any;
    unit?: string;
  };
  actionType: string;
  recommendedRoleSlug: string | null;
}

interface WorkflowRule {
  id: number;
  name: string;
  description: string | null;
  domain: 'WORKFORCE_HCM' | 'INVENTORY_SCM' | 'GUEST_CRM' | 'FINANCE_TREASURY';
  triggerEvent: string;
  conditionLogic: {
    field: string;
    operator: string;
    value: any;
    unit?: string;
  };
  actionType: string;
  actionPayload: Record<string, any>;
  isActive: boolean;
  executionCount: number;
  lastTriggeredAt: string | null;
  branchName: string;
  createdByName: string;
}

interface WorkflowMetrics {
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  successRate: number;
}

const DOMAIN_CONFIG = {
  WORKFORCE_HCM: { label: 'Human Capital & Rota', icon: Users, badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  INVENTORY_SCM: { label: 'Supply Chain & Restock', icon: Package, badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  GUEST_CRM: { label: 'Guest Retention & Loyalty', icon: Sparkles, badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  FINANCE_TREASURY: { label: 'Treasury & Margins', icon: DollarSign, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function AutomationsPage() {
  const [metrics, setMetrics] = useState<WorkflowMetrics | null>(null);
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [eventCatalog, setEventCatalog] = useState<TriggerEventDefinition[]>([]);
  const [actionCatalog, setActionCatalog] = useState<ActionDefinition[]>([]);
  const [availableRoles, setAvailableRoles] = useState<DynamicRole[]>([]);

  const [activeTab, setActiveTab] = useState<'RULES' | 'TEMPLATES'>('RULES');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);

  // Form State
  const [ruleName, setRuleName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<'WORKFORCE_HCM' | 'INVENTORY_SCM' | 'GUEST_CRM' | 'FINANCE_TREASURY'>('WORKFORCE_HCM');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('LESS_THAN');
  const [thresholdValue, setThresholdValue] = useState<number | string>(4);
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedTargetRoleId, setSelectedTargetRoleId] = useState<string>('');
  const [isRuleActive, setIsRuleActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (domainFilter !== 'ALL') params.set('domain', domainFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const [rulesRes, metricsRes, catalogRes] = await Promise.all([
        fetchApi(`/api/v1/automations?${params.toString()}`),
        fetchApi('/api/v1/automations/metrics'),
        fetchApi('/api/v1/automations/catalog'),
      ]);

      if (rulesRes?.data) setRules(rulesRes.data);
      if (metricsRes?.data) setMetrics(metricsRes.data);
      if (catalogRes?.data) {
        setEventCatalog(catalogRes.data.events || []);
        setActionCatalog(catalogRes.data.actions || []);
        setAvailableRoles(catalogRes.data.roles || []);
        setTemplates(catalogRes.data.templates || []);
      }
    } catch (err: any) {
      console.error('Failed to load workflow automations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [domainFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableEventsForDomain = useMemo(() => {
    return eventCatalog.filter((e) => e.domain === selectedDomain);
  }, [eventCatalog, selectedDomain]);

  const currentEventDefinition = useMemo(() => {
    return eventCatalog.find((e) => e.event === selectedEvent) || availableEventsForDomain[0];
  }, [eventCatalog, selectedEvent, availableEventsForDomain]);

  const currentFieldDefinition = useMemo(() => {
    if (!currentEventDefinition) return null;
    return (
      currentEventDefinition.payloadFields.find((f) => f.field === selectedField) ||
      currentEventDefinition.payloadFields[0]
    );
  }, [currentEventDefinition, selectedField]);

  const currentActionDefinition = useMemo(() => {
    return actionCatalog.find((a) => a.actionType === selectedAction) || actionCatalog[0];
  }, [actionCatalog, selectedAction]);

  const handleDomainChange = (domain: any) => {
    setSelectedDomain(domain);
    const match = eventCatalog.find((e) => e.domain === domain);
    if (match) {
      setSelectedEvent(match.event);
      const firstField = match.payloadFields[0];
      if (firstField) {
        setSelectedField(firstField.field);
        setSelectedOperator(firstField.allowedOperators[0]);
        setThresholdValue(firstField.defaultValue);
      }
      setSelectedAction(match.supportedActions[0] || '');
    }
  };

  const handleEventChange = (eventName: string) => {
    setSelectedEvent(eventName);
    const match = eventCatalog.find((e) => e.event === eventName);
    if (match) {
      const firstField = match.payloadFields[0];
      if (firstField) {
        setSelectedField(firstField.field);
        setSelectedOperator(firstField.allowedOperators[0]);
        setThresholdValue(firstField.defaultValue);
      }
      setSelectedAction(match.supportedActions[0] || '');
    }
  };

  const handleFieldChange = (fieldName: string) => {
    setSelectedField(fieldName);
    if (currentEventDefinition) {
      const f = currentEventDefinition.payloadFields.find((item) => item.field === fieldName);
      if (f) {
        setSelectedOperator(f.allowedOperators[0]);
        setThresholdValue(f.defaultValue);
      }
    }
  };

  const handleOpenCreate = () => {
    setEditingRule(null);
    setRuleName('');
    const defaultDomain = 'WORKFORCE_HCM';
    setSelectedDomain(defaultDomain);
    const firstEvent = eventCatalog.find((e) => e.domain === defaultDomain) || eventCatalog[0];

    if (firstEvent) {
      setSelectedEvent(firstEvent.event);
      const f = firstEvent.payloadFields[0];
      if (f) {
        setSelectedField(f.field);
        setSelectedOperator(f.allowedOperators[0]);
        setThresholdValue(f.defaultValue);
      }
      setSelectedAction(firstEvent.supportedActions[0] || '');
    }

    if (availableRoles.length > 0) {
      setSelectedTargetRoleId(String(availableRoles[0].id));
    }
    setIsRuleActive(true);
    setIsModalOpen(true);
  };

  const handleDeployTemplate = async (tmpl: WorkflowTemplate) => {
    try {
      setIsSubmitting(true);
      const matchingRole = tmpl.recommendedRoleSlug
        ? availableRoles.find((r) => r.slug === tmpl.recommendedRoleSlug)
        : null;

      const payload = {
        name: tmpl.name,
        description: tmpl.description,
        domain: tmpl.domain,
        triggerEvent: tmpl.triggerEvent,
        conditionLogic: tmpl.conditionLogic,
        actionType: tmpl.actionType,
        actionPayload: {
          targetRoleId: matchingRole?.id || null,
          priorityLevel: 'HIGH',
          autoExecute: true,
        },
        isActive: true,
      };

      const res = await fetchApi('/api/v1/automations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setToastMessage({ text: res.message || `Deployed "${tmpl.name}" successfully.`, type: 'success' });
      setActiveTab('RULES');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to deploy template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (rule: WorkflowRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setSelectedDomain(rule.domain);
    setSelectedEvent(rule.triggerEvent);
    setSelectedField(rule.conditionLogic.field);
    setSelectedOperator(rule.conditionLogic.operator);
    setThresholdValue(rule.conditionLogic.value);
    setSelectedAction(rule.actionType);
    setSelectedTargetRoleId(rule.actionPayload.targetRoleId ? String(rule.actionPayload.targetRoleId) : '');
    setIsRuleActive(rule.isActive);
    setIsModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const parsedValue =
        currentFieldDefinition?.type === 'NUMBER'
          ? parseFloat(String(thresholdValue)) || 0
          : thresholdValue;

      const payload = {
        name: ruleName.trim(),
        domain: selectedDomain,
        triggerEvent: selectedEvent || currentEventDefinition?.event,
        conditionLogic: {
          field: selectedField || currentFieldDefinition?.field,
          operator: selectedOperator,
          value: parsedValue,
          unit: currentFieldDefinition?.unit,
        },
        actionType: selectedAction || currentActionDefinition?.actionType,
        actionPayload: {
          targetRoleId: selectedTargetRoleId ? parseInt(selectedTargetRoleId, 10) : null,
          priorityLevel: 'HIGH',
          autoExecute: true,
        },
        isActive: isRuleActive,
      };

      const url = editingRule ? `/api/v1/automations/${editingRule.id}` : '/api/v1/automations';
      const method = editingRule ? 'PATCH' : 'POST';

      const res = await fetchApi(url, {
        method,
        body: JSON.stringify(payload),
      });

      setIsModalOpen(false);
      setToastMessage({ text: res.message || 'Workflow automation configured.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save workflow rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestRun = async (rule: WorkflowRule) => {
    try {
      const res = await fetchApi(`/api/v1/automations/${rule.id}/test-run`, { method: 'POST' });
      setToastMessage({ text: res.message || 'Test execution completed.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Test run failed');
    }
  };

  const handleToggleActive = async (rule: WorkflowRule) => {
    try {
      await fetchApi(`/api/v1/automations/${rule.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
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
            <span className="text-xs font-bold text-servora-navy">Business Process Orchestration</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Puzzle className="text-servora-core" size={24} />
            Enterprise Workflow Automations & Business Process Engine
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Event-driven business rules connecting workforce overtime thresholds, autonomous inventory restock, and VIP guest engagement.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> New Workflow Rule
          </button>
          <button
            onClick={loadData}
            title="Refresh Triggers"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs"
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

      {/* 2. AUTOMATION PERFORMANCE METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Workflow Rules</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {metrics ? metrics.activeRules : 0}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Monitoring Real-Time Events</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Zap size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Executions</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {metrics ? metrics.totalExecutions.toLocaleString() : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Automated Actions Fired</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Process SLA Reliability</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {metrics ? `${metrics.successRate}%` : '100%'}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Execution Success Rate</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Available RBAC Roles</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              {availableRoles.length}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Loaded from Enterprise Directory</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Users size={18} />
          </div>
        </div>
      </div>

      {/* 3. WORKDAY / JOULE PROCESS TABS & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl font-bold">
          <button
            onClick={() => setActiveTab('RULES')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'RULES'
                ? 'bg-white text-servora-navy shadow-xs'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            <Layers size={13} className="text-servora-core" />
            <span>Configured Tenant Rules ({rules.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TEMPLATES')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'TEMPLATES'
                ? 'bg-white text-servora-navy shadow-xs'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            <FileCode size={13} className="text-purple-600" />
            <span>Pre-built Process Templates ({templates.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Operational Domains</option>
            <option value="WORKFORCE_HCM">Human Capital & Rota (HCM)</option>
            <option value="INVENTORY_SCM">Supply Chain & Inventory</option>
            <option value="GUEST_CRM">Guest Retention & CRM</option>
            <option value="FINANCE_TREASURY">Treasury & Margins</option>
          </select>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              placeholder="Search rule or trigger event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-servora-core w-44 sm:w-60"
            />
          </div>
        </div>
      </div>

      {/* 4. ACTIVE CONFIGURED RULES TAB */}
      {activeTab === 'RULES' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                  <th className="py-2.5 px-3">Rule Definition</th>
                  <th className="py-2.5 px-3">Domain</th>
                  <th className="py-2.5 px-3">Event Trigger</th>
                  <th className="py-2.5 px-3">Evaluation Logic</th>
                  <th className="py-2.5 px-3">Action Actuator & Role Target</th>
                  <th className="py-2.5 px-3 text-center">Fired</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-gray-400 italic">
                      <div className="max-w-md mx-auto space-y-2">
                        <Puzzle size={36} className="mx-auto opacity-25 text-servora-navy" />
                        <p className="font-bold text-servora-navy not-italic">No Active Workflow Rules Configured</p>
                        <p className="text-xs text-gray-500 not-italic">
                          This tenant account has not created any business rules yet. Click <strong>New Workflow Rule</strong> or deploy one from the <strong>Pre-built Process Templates</strong> gallery.
                        </p>
                        <button
                          onClick={() => setActiveTab('TEMPLATES')}
                          className="mt-2 px-3 py-1.5 bg-servora-core text-white font-bold rounded-lg text-xs hover:bg-blue-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          Explore Process Templates <ArrowRight size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => {
                    const domainBadge = DOMAIN_CONFIG[rule.domain] || DOMAIN_CONFIG.WORKFORCE_HCM;
                    const DomainIcon = domainBadge.icon;
                    const targetRole = availableRoles.find((r) => r.id === rule.actionPayload?.targetRoleId);

                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-bold text-servora-navy block">{rule.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{rule.branchName}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase border ${domainBadge.badge}`}>
                            <DomainIcon size={10} />
                            {domainBadge.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-servora-navy">
                          {rule.triggerEvent}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-600 text-[11px]">
                          IF <strong>{rule.conditionLogic.field}</strong> {rule.conditionLogic.operator.replace(/_/g, ' ')} {String(rule.conditionLogic.value)} {rule.conditionLogic.unit || ''}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-purple-700 font-bold block text-[11px]">
                            {rule.actionType}
                          </span>
                          {targetRole ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 mt-0.5">
                              Role: {targetRole.name}
                            </span>
                          ) : rule.actionPayload?.targetRoleSlug ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 mt-0.5">
                              Role: {rule.actionPayload.targetRoleSlug}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-servora-navy">
                          {rule.executionCount}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(rule)}
                            className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase border cursor-pointer ${
                              rule.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-300'
                            }`}
                          >
                            {rule.isActive ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleTestRun(rule)}
                              className="px-2 py-1 bg-slate-50 border border-gray-200 hover:bg-gray-100 text-servora-navy font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Test Execute Rule"
                            >
                              <Play size={10} className="text-servora-core" /> Test Run
                            </button>
                            <button
                              onClick={() => handleOpenEdit(rule)}
                              className="p-1 text-gray-400 hover:text-servora-core transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                              title="Edit Rule"
                            >
                              <Edit3 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. PRE-BUILT TEMPLATES CATALOG TAB */}
      {activeTab === 'TEMPLATES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tmpl) => {
            const domainBadge = DOMAIN_CONFIG[tmpl.domain] || DOMAIN_CONFIG.WORKFORCE_HCM;
            const DomainIcon = domainBadge.icon;

            return (
              <div
                key={tmpl.templateId}
                className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${domainBadge.badge}`}>
                      <DomainIcon size={11} /> {domainBadge.label}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">
                      {tmpl.triggerEvent}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-servora-navy">{tmpl.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tmpl.description}</p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-gray-100 font-mono text-[11px] space-y-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Condition:</span>
                      <span className="font-bold text-servora-navy">
                        IF {tmpl.conditionLogic.field} {tmpl.conditionLogic.operator.replace(/_/g, ' ')} {tmpl.conditionLogic.value} {tmpl.conditionLogic.unit || ''}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Action Actuator:</span>
                      <span className="font-bold text-purple-700">{tmpl.actionType}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-mono">Template ID: {tmpl.templateId}</span>
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleDeployTemplate(tmpl)}
                    className="px-3.5 py-1.5 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Plus size={13} /> Deploy to Workspace
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. MODAL: ENTERPRISE WORKFLOW RULE BUILDER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingRule ? `Edit Rule: ${editingRule.name}` : 'Configure Business Automation Rule'}
                </h3>
                <p className="text-[11px] text-gray-400">Establish schema-governed triggers, condition logic, and dynamic actuators</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Overtime Threshold Warning Rule"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Operational Domain *</label>
                  <select
                    value={selectedDomain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="WORKFORCE_HCM">Human Capital (HCM Rota)</option>
                    <option value="INVENTORY_SCM">Supply Chain & Inventory</option>
                    <option value="GUEST_CRM">Guest Retention & CRM</option>
                    <option value="FINANCE_TREASURY">Treasury & Margins</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Event Trigger *</label>
                  <select
                    value={selectedEvent || currentEventDefinition?.event}
                    onChange={(e) => handleEventChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    {availableEventsForDomain.map((ev) => (
                      <option key={ev.event} value={ev.event}>
                        {ev.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Condition Logic Builder with Governed Event Fields */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-servora-navy">Evaluation Condition Logic (IF)</span>
                  {currentFieldDefinition?.unit && (
                    <span className="text-[10px] font-mono text-gray-400">Unit: {currentFieldDefinition.unit}</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Payload Field *</label>
                    <select
                      value={selectedField || currentFieldDefinition?.field}
                      onChange={(e) => handleFieldChange(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px] focus:outline-none cursor-pointer"
                    >
                      {currentEventDefinition?.payloadFields.map((f) => (
                        <option key={f.field} value={f.field}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Operator *</label>
                    <select
                      value={selectedOperator}
                      onChange={(e) => setSelectedOperator(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px] focus:outline-none cursor-pointer"
                    >
                      {currentFieldDefinition?.allowedOperators.map((op) => (
                        <option key={op} value={op}>
                          {op.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">
                      Threshold ({currentFieldDefinition?.unit || 'Value'}) *
                    </label>
                    <input
                      type={currentFieldDefinition?.type === 'NUMBER' ? 'number' : 'text'}
                      required
                      value={thresholdValue}
                      onChange={(e) => setThresholdValue(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Actuator Builder with Dynamic Database Roles */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <span className="text-[11px] font-bold text-servora-navy block">Action Actuator (THEN)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Action Type *</label>
                    <select
                      value={selectedAction || currentActionDefinition?.actionType}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px] focus:outline-none cursor-pointer"
                    >
                      {actionCatalog.map((act) => (
                        <option key={act.actionType} value={act.actionType}>
                          {act.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">
                      Target Enterprise Role {currentActionDefinition?.requiresTargetRole ? '*' : '(Optional)'}
                    </label>
                    <select
                      disabled={!currentActionDefinition?.requiresTargetRole}
                      value={selectedTargetRoleId}
                      onChange={(e) => setSelectedTargetRoleId(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px] focus:outline-none cursor-pointer disabled:bg-slate-100 disabled:text-gray-400"
                    >
                      <option value="">Choose Dynamic Role...</option>
                      {availableRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name} {role.isSystemRole ? '(System Role)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ruleActive"
                  checked={isRuleActive}
                  onChange={(e) => setIsRuleActive(e.target.checked)}
                  className="rounded text-servora-core focus:ring-servora-core"
                />
                <label htmlFor="ruleActive" className="text-xs font-bold text-servora-navy cursor-pointer">
                  Activate Rule for Immediate Real-Time Event Listening
                </label>
              </div>

              <div className="pt-2 flex gap-2">
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
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingRule ? 'Update Rule' : 'Save & Deploy Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}