'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Receipt,
  ShieldCheck,
  Building2,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
  Users,
  Coins,
  Percent,
  SlidersHorizontal,
  ChevronRight,
  Plus,
  Trash2,
  DollarSign,
  Activity,
  Check,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface TaxCode {
  id: number;
  code: string;
  name: string;
  rate: string;
  statutoryCode: string | null;
  isActive: boolean;
}

interface FinancialSettings {
  id: number;
  tenantId: number;
  baseCurrency: string;
  fiscalYearStartMonth: number;
  taxPin: string | null;
  isVatInclusive: boolean;
  vatRate: string;
  isCateringLevyEnabled: boolean;
  cateringLevyRate: string;
  isServiceChargeEnabled: boolean;
  serviceChargeRate: string;
  etimsEnvironment: 'SANDBOX' | 'PRODUCTION';
  autoFiscalizeOnPayment: boolean;
  etimsMiddleServerUrl: string | null;
  etimsDeviceSerial: string | null;
  etimsBranchCode: string;
  allowOfflineFiscalSign: boolean;
  tipDistributionModel: 'HOURS_WEIGHTED' | 'EQUAL_SPLIT' | 'ROLE_WEIGHTED';
  defaultOvertimeMultiplier: string;
  holidayOvertimeMultiplier: string;
  standardWorkWeekHours: number;
  maxDrawerCashThreshold: string;
  enableSafeDropAlerts: boolean;
}

export default function FinancialSettingsPage() {
  const [settings, setSettings] = useState<FinancialSettings | null>(null);
  const [taxCodesList, setTaxCodesList] = useState<TaxCode[]>([]);
  const [activeTab, setActiveTab] = useState<'TAX_STATUTORY' | 'ETIMS_FISCAL' | 'HCM_WAGE_TIPS' | 'TREASURY'>('TAX_STATUTORY');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    baseCurrency: 'KES',
    fiscalYearStartMonth: 1,
    taxPin: '',
    isVatInclusive: true,
    vatRate: 16,
    isCateringLevyEnabled: true,
    cateringLevyRate: 2,
    isServiceChargeEnabled: false,
    serviceChargeRate: 5,
    etimsEnvironment: 'SANDBOX' as 'SANDBOX' | 'PRODUCTION',
    autoFiscalizeOnPayment: true,
    etimsMiddleServerUrl: '',
    etimsDeviceSerial: '',
    etimsBranchCode: '00',
    allowOfflineFiscalSign: true,
    tipDistributionModel: 'HOURS_WEIGHTED' as 'HOURS_WEIGHTED' | 'EQUAL_SPLIT' | 'ROLE_WEIGHTED',
    defaultOvertimeMultiplier: 1.5,
    holidayOvertimeMultiplier: 2.0,
    standardWorkWeekHours: 40,
    maxDrawerCashThreshold: 50000,
    enableSafeDropAlerts: true,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetchApi('/api/v1/settings/financial');
      if (res?.data?.settings) {
        const s: FinancialSettings = res.data.settings;
        setSettings(s);
        setFormData({
          baseCurrency: s.baseCurrency || 'KES',
          fiscalYearStartMonth: s.fiscalYearStartMonth || 1,
          taxPin: s.taxPin || '',
          isVatInclusive: s.isVatInclusive,
          vatRate: parseFloat(s.vatRate) || 16,
          isCateringLevyEnabled: s.isCateringLevyEnabled,
          cateringLevyRate: parseFloat(s.cateringLevyRate) || 2,
          isServiceChargeEnabled: s.isServiceChargeEnabled,
          serviceChargeRate: parseFloat(s.serviceChargeRate) || 5,
          etimsEnvironment: s.etimsEnvironment || 'SANDBOX',
          autoFiscalizeOnPayment: s.autoFiscalizeOnPayment,
          etimsMiddleServerUrl: s.etimsMiddleServerUrl || '',
          etimsDeviceSerial: s.etimsDeviceSerial || '',
          etimsBranchCode: s.etimsBranchCode || '00',
          allowOfflineFiscalSign: s.allowOfflineFiscalSign,
          tipDistributionModel: s.tipDistributionModel || 'HOURS_WEIGHTED',
          defaultOvertimeMultiplier: parseFloat(s.defaultOvertimeMultiplier) || 1.5,
          holidayOvertimeMultiplier: parseFloat(s.holidayOvertimeMultiplier) || 2.0,
          standardWorkWeekHours: s.standardWorkWeekHours || 40,
          maxDrawerCashThreshold: parseFloat(s.maxDrawerCashThreshold) || 50000,
          enableSafeDropAlerts: s.enableSafeDropAlerts,
        });
      }
      if (res?.data?.taxCodes) {
        setTaxCodesList(res.data.taxCodes);
      }
    } catch (err: any) {
      console.error('Failed to load financial settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setToastMessage(null);
    try {
      setIsSaving(true);
      const res = await fetchApi('/api/v1/settings/financial', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      setToastMessage({ text: res?.message || 'Financial parameters successfully saved.', type: 'success' });
      loadData();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Failed to save financial parameters', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEtimsPing = async () => {
    setToastMessage(null);
    try {
      setIsPinging(true);
      const res = await fetchApi('/api/v1/settings/financial/etims/test-connection', {
        method: 'POST',
      });
      setToastMessage({
        text: `${res.message} [Latency: ${res.data?.latencyMs}ms]`,
        type: 'success',
      });
    } catch (err: any) {
      setToastMessage({ text: err.message || 'eTIMS OSCU handshake failed', type: 'error' });
    } finally {
      setIsPinging(false);
    }
  };

  // Real-Time Dynamic Ticket Simulator
  const simulatedCheck = useMemo(() => {
    const gross = 1000;
    const vatPercent = formData.vatRate / 100;
    const levyPercent = formData.isCateringLevyEnabled ? formData.cateringLevyRate / 100 : 0;
    const servicePercent = formData.isServiceChargeEnabled ? formData.serviceChargeRate / 100 : 0;

    let net = 0;
    let vat = 0;
    let levy = 0;
    let service = 0;

    if (formData.isVatInclusive) {
      const combinedDivisor = 1 + vatPercent + levyPercent + servicePercent;
      net = gross / combinedDivisor;
      vat = net * vatPercent;
      levy = net * levyPercent;
      service = net * servicePercent;
    } else {
      net = gross;
      vat = net * vatPercent;
      levy = net * levyPercent;
      service = net * servicePercent;
    }

    return {
      gross,
      net: net.toFixed(2),
      vat: vat.toFixed(2),
      levy: levy.toFixed(2),
      service: service.toFixed(2),
      totalCharge: (net + vat + levy + service).toFixed(2),
    };
  }, [formData]);

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
            <span className="text-xs font-bold text-servora-navy">Financial Architecture & Statutory Rules</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Financial Settings & Fiscal Device Integration</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Configure statutory VAT schedules, KRA eTIMS OSCU devices, tip-pooling rules, overtime multipliers, and safe drop limits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={handleTestEtimsPing}
            disabled={isPinging}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Zap size={14} className={isPinging ? 'animate-bounce text-amber-500' : 'text-servora-core'} />
            <span>{isPinging ? 'Testing OSCU...' : 'Ping eTIMS Gateway'}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving...' : 'Save Parameters'}</span>
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

      {/* 2. STATUTORY & FISCAL STATUS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Statutory Tax & Levy</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {formData.vatRate}% + {formData.isCateringLevyEnabled ? `${formData.cateringLevyRate}%` : '0%'}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Receipt size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">eTIMS Mode</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5 flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${formData.etimsEnvironment === 'PRODUCTION' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {formData.etimsEnvironment}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Server size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tip Pool Model</span>
            <p className="text-base font-bold font-mono text-purple-700 mt-0.5 truncate">
              {formData.tipDistributionModel.replace('_', ' ')}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Coins size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Till Safe Drop Cap</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {formData.baseCurrency} {formData.maxDrawerCashThreshold.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Wallet size={18} />
          </div>
        </div>
      </div>

      {/* 3. FUNCTIONAL TABS & REAL-TIME CHECK SIMULATOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Configuration Column (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 overflow-x-auto">
            {(
              [
                { id: 'TAX_STATUTORY', label: 'Taxes & Statutory Levies', icon: Receipt },
                { id: 'ETIMS_FISCAL', label: 'KRA eTIMS & Fiscal Device', icon: Server },
                { id: 'HCM_WAGE_TIPS', label: 'Labor, Tips & Overtime', icon: Users },
                { id: 'TREASURY', label: 'Treasury & Safe Drop', icon: Wallet },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-servora-navy text-white shadow-xs'
                      : 'bg-slate-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: TAXES & STATUTORY LEVIES */}
          {activeTab === 'TAX_STATUTORY' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Base Reporting Currency</label>
                  <input
                    type="text"
                    value={formData.baseCurrency}
                    onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Corporate Tax PIN (KRA)</label>
                  <input
                    type="text"
                    placeholder="e.g. P051234567X"
                    value={formData.taxPin}
                    onChange={(e) => setFormData({ ...formData, taxPin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              {/* Tax Inclusivity Toggle */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-servora-navy block">Tax Inclusivity Display</span>
                  <span className="text-[11px] text-gray-500">Menu prices on POS and guest checks already include VAT</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isVatInclusive}
                  onChange={(e) => setFormData({ ...formData, isVatInclusive: e.target.checked })}
                  className="rounded w-4 h-4 cursor-pointer"
                />
              </div>

              {/* VAT & Catering Levy Setup */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                  <span className="font-bold text-servora-navy block">Value Added Tax (VAT)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.vatRate}
                      onChange={(e) => setFormData({ ...formData, vatRate: Number(e.target.value) })}
                      className="w-24 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                    <span className="font-bold font-mono text-gray-500">% Standard Rate</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-servora-navy block">Tourism & Catering Levy</span>
                    <input
                      type="checkbox"
                      checked={formData.isCateringLevyEnabled}
                      onChange={(e) => setFormData({ ...formData, isCateringLevyEnabled: e.target.checked })}
                      className="rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      disabled={!formData.isCateringLevyEnabled}
                      value={formData.cateringLevyRate}
                      onChange={(e) => setFormData({ ...formData, cateringLevyRate: Number(e.target.value) })}
                      className="w-24 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs disabled:opacity-50"
                    />
                    <span className="font-bold font-mono text-gray-500">% Statutory Levy</span>
                  </div>
                </div>
              </div>

              {/* Service Charge */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-servora-navy block">Discretionary Service Charge</span>
                    <span className="text-[11px] text-gray-500">Automatically added to dining checks for direct staff distribution</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isServiceChargeEnabled}
                    onChange={(e) => setFormData({ ...formData, isServiceChargeEnabled: e.target.checked })}
                    className="rounded cursor-pointer"
                  />
                </div>
                {formData.isServiceChargeEnabled && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      step="0.5"
                      value={formData.serviceChargeRate}
                      onChange={(e) => setFormData({ ...formData, serviceChargeRate: Number(e.target.value) })}
                      className="w-24 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                    <span className="font-bold font-mono text-gray-500">% Service Charge</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: KRA ETIMS & FISCAL DEVICE */}
          {activeTab === 'ETIMS_FISCAL' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">eTIMS Gateway Environment</label>
                  <select
                    value={formData.etimsEnvironment}
                    onChange={(e) => setFormData({ ...formData, etimsEnvironment: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="SANDBOX">Sandbox (KRA Staging Test Gateway)</option>
                    <option value="PRODUCTION">Production (Live KRA Portal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Branch OSCU Code (`bhfId`)</label>
                  <input
                    type="text"
                    value={formData.etimsBranchCode}
                    onChange={(e) => setFormData({ ...formData, etimsBranchCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Trader Integration Middleware URL</label>
                <input
                  type="text"
                  placeholder="https://etims.servora.internal:8443/api"
                  value={formData.etimsMiddleServerUrl}
                  onChange={(e) => setFormData({ ...formData, etimsMiddleServerUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Hardware SDC Device Serial (`sdcId`)</label>
                <input
                  type="text"
                  placeholder="e.g. OSCU-SDC-2026-NBO-01"
                  value={formData.etimsDeviceSerial}
                  onChange={(e) => setFormData({ ...formData, etimsDeviceSerial: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-servora-navy block">Auto-Fiscalize on Settlement</span>
                    <span className="text-[11px] text-gray-500">Sign invoice payload immediately when order is paid</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.autoFiscalizeOnPayment}
                    onChange={(e) => setFormData({ ...formData, autoFiscalizeOnPayment: e.target.checked })}
                    className="rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <div>
                    <span className="font-bold text-servora-navy block">Offline Cryptographic Fallback</span>
                    <span className="text-[11px] text-gray-500">Queue invoices locally for sync when network is interrupted</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.allowOfflineFiscalSign}
                    onChange={(e) => setFormData({ ...formData, allowOfflineFiscalSign: e.target.checked })}
                    className="rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LABOR, TIPS & OVERTIME (HCM) */}
          {activeTab === 'HCM_WAGE_TIPS' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Tip Pool Distribution Model</label>
                <select
                  value={formData.tipDistributionModel}
                  onChange={(e) => setFormData({ ...formData, tipDistributionModel: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  <option value="HOURS_WEIGHTED">Hours-Weighted (Distributed pro-rata based on clocked shift hours)</option>
                  <option value="EQUAL_SPLIT">Equal Split (Divided equally among all rostered team members on duty)</option>
                  <option value="ROLE_WEIGHTED">Role-Weighted (Scaled points assigned by functional role)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Standard Work Week</label>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      value={formData.standardWorkWeekHours}
                      onChange={(e) => setFormData({ ...formData, standardWorkWeekHours: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-lg font-bold text-xs"
                    />
                    <span>hrs</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Overtime Multiplier</label>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      step="0.25"
                      value={formData.defaultOvertimeMultiplier}
                      onChange={(e) => setFormData({ ...formData, defaultOvertimeMultiplier: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-lg font-bold text-xs"
                    />
                    <span>x</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Holiday Multiplier</label>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      step="0.25"
                      value={formData.holidayOvertimeMultiplier}
                      onChange={(e) => setFormData({ ...formData, holidayOvertimeMultiplier: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-lg font-bold text-xs"
                    />
                    <span>x</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TREASURY & SAFE DROP */}
          {activeTab === 'TREASURY' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Maximum Drawer Cash Limit (Threshold)</label>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-gray-500">{formData.baseCurrency}</span>
                  <input
                    type="number"
                    step="5000"
                    value={formData.maxDrawerCashThreshold}
                    onChange={(e) => setFormData({ ...formData, maxDrawerCashThreshold: Number(e.target.value) })}
                    className="w-48 px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-xs focus:outline-none focus:border-servora-core"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Exceeding this cash accumulation threshold prompts the POS cashier to complete an authorized safe drop.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-servora-navy block">Automated Safe Drop Alerts</span>
                  <span className="text-[11px] text-gray-500">Notify the Duty Manager when a till reaches 90% of its limit</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enableSafeDropAlerts}
                  onChange={(e) => setFormData({ ...formData, enableSafeDropAlerts: e.target.checked })}
                  className="rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Real-time Ticket Calculation Simulator (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-servora-navy flex items-center gap-1.5">
                <Receipt size={14} className="text-servora-core" /> Ticket Tax Breakdown Simulator
              </span>
              <span className="text-[10px] font-mono text-gray-400">Sample KES 1,000</span>
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              Live preview of statutory deductions on a standard <strong>KES 1,000.00</strong> dining bill under current configuration:
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Net Food & Beverage:</span>
                <span className="font-bold text-servora-navy">KES {simulatedCheck.net}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>VAT ({formData.vatRate}%):</span>
                <span className="font-bold">+KES {simulatedCheck.vat}</span>
              </div>
              {formData.isCateringLevyEnabled && (
                <div className="flex justify-between text-emerald-700">
                  <span>Catering Levy ({formData.cateringLevyRate}%):</span>
                  <span className="font-bold">+KES {simulatedCheck.levy}</span>
                </div>
              )}
              {formData.isServiceChargeEnabled && (
                <div className="flex justify-between text-purple-700">
                  <span>Service Charge ({formData.serviceChargeRate}%):</span>
                  <span className="font-bold">+KES {simulatedCheck.service}</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-servora-navy text-sm">
                <span>Final Guest Total:</span>
                <span>KES {simulatedCheck.totalCharge}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <span className="text-[10px] text-gray-400 block font-mono">
              Statutory Compliance: Laws of Kenya • Value Added Tax Act & Tourism Act (2011)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}