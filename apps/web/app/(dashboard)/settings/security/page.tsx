'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Key,
  Users,
  Smartphone,
  Globe,
  Clock,
  RefreshCw,
  ChevronRight,
  Save,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Monitor,
  Tablet,
  Activity,
  Plus,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SecuritySettings {
  id: number;
  tenantId: number;
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  passwordExpirationDays: number;
  preventPasswordReuseCount: number;
  mfaEnforcement: 'OPTIONAL' | 'ENFORCED_FOR_ADMINS' | 'ENFORCED_FOR_ALL';
  allowedMfaMethods: string[];
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  enforceIpBinding: boolean;
  notifyOnNewLogin: boolean;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  enableIpAllowlist: boolean;
  allowedIpRanges: string[];
  ssoEnabled: boolean;
  ssoProvider: string | null;
}

interface UserSessionRecord {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  ipAddress: string;
  deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'POS_TERMINAL';
  browser: string | null;
  os: string | null;
  city: string | null;
  country: string | null;
  lastActiveAt: string;
  createdAt: string;
}

interface TelemetryData {
  activeSessions: number;
  revokedSessions: number;
  totalStaffAccounts: number;
  activeStaffAccounts: number;
}

const DEVICE_ICONS: Record<UserSessionRecord['deviceType'], any> = {
  DESKTOP: Monitor,
  MOBILE: Smartphone,
  TABLET: Tablet,
  POS_TERMINAL: ShieldCheck,
};

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [activeTab, setActiveTab] = useState<'POLICIES' | 'SESSIONS'>('POLICIES');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    minPasswordLength: 10,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    passwordExpirationDays: 90,
    preventPasswordReuseCount: 5,
    mfaEnforcement: 'OPTIONAL' as SecuritySettings['mfaEnforcement'],
    allowedMfaMethods: ['TOTP', 'EMAIL'],
    sessionTimeoutMinutes: 30,
    maxConcurrentSessions: 3,
    enforceIpBinding: false,
    notifyOnNewLogin: true,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
    enableIpAllowlist: false,
    allowedIpRanges: [] as string[],
    ssoEnabled: false,
    ssoProvider: '',
  });

  const [newIpInput, setNewIpInput] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetchApi('/api/v1/settings/security');
      if (res?.data) {
        setSettings(res.data.settings);
        setSessions(res.data.sessions || []);
        setTelemetry(res.data.telemetry || null);

        const s: SecuritySettings = res.data.settings;
        setFormData({
          minPasswordLength: s.minPasswordLength,
          requireUppercase: s.requireUppercase,
          requireLowercase: s.requireLowercase,
          requireNumbers: s.requireNumbers,
          requireSymbols: s.requireSymbols,
          passwordExpirationDays: s.passwordExpirationDays,
          preventPasswordReuseCount: s.preventPasswordReuseCount,
          mfaEnforcement: s.mfaEnforcement,
          allowedMfaMethods: s.allowedMfaMethods || ['TOTP', 'EMAIL'],
          sessionTimeoutMinutes: s.sessionTimeoutMinutes,
          maxConcurrentSessions: s.maxConcurrentSessions,
          enforceIpBinding: s.enforceIpBinding,
          notifyOnNewLogin: s.notifyOnNewLogin,
          maxFailedAttempts: s.maxFailedAttempts,
          lockoutDurationMinutes: s.lockoutDurationMinutes,
          enableIpAllowlist: s.enableIpAllowlist,
          allowedIpRanges: s.allowedIpRanges || [],
          ssoEnabled: s.ssoEnabled,
          ssoProvider: s.ssoProvider || '',
        });
      }
    } catch (err: any) {
      console.error('Failed to load security settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleMfaMethod = (method: string) => {
    setFormData((prev) => {
      const exists = prev.allowedMfaMethods.includes(method);
      if (exists && prev.allowedMfaMethods.length <= 1) {
        return prev;
      }
      return {
        ...prev,
        allowedMfaMethods: exists
          ? prev.allowedMfaMethods.filter((m) => m !== method)
          : [...prev.allowedMfaMethods, method],
      };
    });
  };

  const handleAddIp = () => {
    if (!newIpInput.trim()) return;
    if (!formData.allowedIpRanges.includes(newIpInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        allowedIpRanges: [...prev.allowedIpRanges, newIpInput.trim()],
      }));
    }
    setNewIpInput('');
  };

  const handleRemoveIp = (ipToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedIpRanges: prev.allowedIpRanges.filter((ip) => ip !== ipToRemove),
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setToastMessage(null);
    try {
      setIsSaving(true);
      await fetchApi('/api/v1/settings/security', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      setToastMessage({ text: 'Enterprise security policies updated and enforced.', type: 'success' });
      loadData();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Failed to update security policies', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeSingle = async (sessionId: number) => {
    try {
      await fetchApi('/api/v1/settings/security/sessions/revoke', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      setToastMessage({ text: 'Active device session terminated.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke session');
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('Terminate all active sessions across all devices for your account?')) return;
    try {
      setIsRevokingAll(true);
      const res = await fetchApi('/api/v1/settings/security/sessions/revoke-all', {
        method: 'POST',
      });
      setToastMessage({ text: res.message || 'All other sessions terminated.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to terminate all sessions');
    } finally {
      setIsRevokingAll(false);
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
            <span className="text-xs font-bold text-servora-navy">Identity Governance & Risk</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <ShieldCheck className="text-servora-core" size={22} />
            Enterprise Security, Access & Active Sessions
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Govern staff credential complexity, multi-factor enforcement, idle timeouts, IP allowlists, and inspect live device sessions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={loadData}
            title="Refresh Security Status"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
          {activeTab === 'POLICIES' && (
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-4 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSaving ? 'Enforcing...' : 'Enforce Policies'}</span>
            </button>
          )}
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

      {/* 2. SECURITY POSTURE TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">MFA Policy</span>
            <p className="text-base font-bold font-mono text-servora-navy mt-0.5 truncate max-w-[130px]">
              {formData.mfaEnforcement.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Smartphone size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Idle Lockout</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {formData.sessionTimeoutMinutes} Mins
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Password Lifetime</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {formData.passwordExpirationDays > 0 ? `${formData.passwordExpirationDays} Days` : 'Permanent'}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Key size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Live Sessions</span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">
              {telemetry ? telemetry.activeSessions : 0} Active
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Activity size={18} />
          </div>
        </div>
      </div>

      {/* 3. TABS */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('POLICIES')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'POLICIES'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal size={14} />
          <span>Security & Authentication Policies</span>
        </button>

        <button
          onClick={() => setActiveTab('SESSIONS')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'SESSIONS'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
          }`}
        >
          <Monitor size={14} />
          <span>Active Device Sessions ({sessions.length})</span>
        </button>
      </div>

      {/* 4. TAB 1: POLICIES FORM */}
      {activeTab === 'POLICIES' && (
        <form onSubmit={handleSave} className="space-y-5 text-xs">
          {/* Section A: Password Complexity & Rotation */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-servora-navy flex items-center gap-1.5">
                <Lock size={15} className="text-servora-core" />
                Staff Credential Complexity & Expiration
              </h3>
              <p className="text-[11px] text-gray-400">
                Enforce cryptographic strength requirements and historical password memory rules
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Minimum Password Length
                </label>
                <input
                  type="number"
                  min={8}
                  max={64}
                  value={formData.minPasswordLength}
                  onChange={(e) => setFormData({ ...formData, minPasswordLength: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Password Rotation (Days)
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={formData.passwordExpirationDays}
                  onChange={(e) => setFormData({ ...formData, passwordExpirationDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-servora-core"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Set to 0 for non-expiring passwords.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Historical Password Memory
                </label>
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={formData.preventPasswordReuseCount}
                  onChange={(e) => setFormData({ ...formData, preventPasswordReuseCount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-servora-core"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Disallow reusing previous X passwords.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.requireUppercase}
                  onChange={(e) => setFormData({ ...formData, requireUppercase: e.target.checked })}
                  className="rounded cursor-pointer"
                />
                <span className="font-semibold text-servora-navy">Require Uppercase (A-Z)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.requireLowercase}
                  onChange={(e) => setFormData({ ...formData, requireLowercase: e.target.checked })}
                  className="rounded cursor-pointer"
                />
                <span className="font-semibold text-servora-navy">Require Lowercase (a-z)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.requireNumbers}
                  onChange={(e) => setFormData({ ...formData, requireNumbers: e.target.checked })}
                  className="rounded cursor-pointer"
                />
                <span className="font-semibold text-servora-navy">Require Numbers (0-9)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.requireSymbols}
                  onChange={(e) => setFormData({ ...formData, requireSymbols: e.target.checked })}
                  className="rounded cursor-pointer"
                />
                <span className="font-semibold text-servora-navy">Require Symbols (!@#$)</span>
              </label>
            </div>
          </div>

          {/* Section B: Multi-Factor Authentication (MFA) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-servora-navy flex items-center gap-1.5">
                <Smartphone size={15} className="text-servora-core" />
                Multi-Factor Authentication (MFA / 2FA)
              </h3>
              <p className="text-[11px] text-gray-400">
                Enforce step-up authentication across administrative and cashier user accounts
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'OPTIONAL', label: 'Optional (Staff Choice)', desc: 'Users choose whether to enable 2FA' },
                { id: 'ENFORCED_FOR_ADMINS', label: 'Enforced for Admins', desc: 'Mandatory for Managers and System Owners' },
                { id: 'ENFORCED_FOR_ALL', label: 'Enforced for All Staff', desc: 'Mandatory before accessing any screen' },
              ].map((opt) => {
                const selected = formData.mfaEnforcement === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setFormData({ ...formData, mfaEnforcement: opt.id as any })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selected
                        ? 'border-servora-core bg-blue-50/50 ring-1 ring-servora-core/30'
                        : 'border-gray-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-servora-navy">{opt.label}</span>
                      {selected && <CheckCircle2 size={14} className="text-servora-core" />}
                    </div>
                    <p className="text-[10px] text-gray-500 leading-normal">{opt.desc}</p>
                  </div>
                );
              })}
            </div>

            <div>
              <span className="text-[11px] font-bold text-servora-navy block mb-2">Authorized MFA Verification Methods:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'TOTP', label: 'Authenticator App (TOTP)' },
                  { id: 'EMAIL', label: 'Email One-Time Passcode' },
                  { id: 'SMS', label: 'SMS Security Token' },
                  { id: 'SECURITY_KEY', label: 'FIDO2 / Hardware Security Key' },
                ].map((method) => {
                  const isChecked = formData.allowedMfaMethods.includes(method.id);
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => toggleMfaMethod(method.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-servora-core text-white shadow-xs'
                          : 'bg-slate-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {method.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section C: Session Life-Cycle & Brute Force */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-servora-navy flex items-center gap-1.5">
                <Clock size={15} className="text-servora-core" />
                Session Lifecycle & Rate Limiting Controls
              </h3>
              <p className="text-[11px] text-gray-400">
                Automatic screen timeout, account lockout thresholds, and concurrent login quotas
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Inactivity Auto-Lockout (Mins)
                </label>
                <input
                  type="number"
                  min={5}
                  max={720}
                  value={formData.sessionTimeoutMinutes}
                  onChange={(e) => setFormData({ ...formData, sessionTimeoutMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Max Concurrent Devices
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={formData.maxConcurrentSessions}
                  onChange={(e) => setFormData({ ...formData, maxConcurrentSessions: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-servora-core"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">0 = Unlimited device logins.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Max Failed Logins
                </label>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={formData.maxFailedAttempts}
                  onChange={(e) => setFormData({ ...formData, maxFailedAttempts: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Lockout Duration (Mins)
                </label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={formData.lockoutDurationMinutes}
                  onChange={(e) => setFormData({ ...formData, lockoutDurationMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-servora-core"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.enforceIpBinding}
                  onChange={(e) => setFormData({ ...formData, enforceIpBinding: e.target.checked })}
                  className="rounded cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-servora-navy block">Strict IP Address Binding</span>
                  <span className="text-[10px] text-gray-400">Invalidate session tokens if client IP changes</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.notifyOnNewLogin}
                  onChange={(e) => setFormData({ ...formData, notifyOnNewLogin: e.target.checked })}
                  className="rounded cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-servora-navy block">Security Email Notifications</span>
                  <span className="text-[10px] text-gray-400">Alert employee email upon unrecognized login attempts</span>
                </div>
              </label>
            </div>
          </div>

          {/* Section D: Network Perimeter & CIDR Allowlist */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-servora-navy flex items-center gap-1.5">
                  <Globe size={15} className="text-servora-core" />
                  Network Perimeter & Trusted IP Allowlist
                </h3>
                <p className="text-[11px] text-gray-400">
                  Restrict terminal access strictly to company store networks or VPN CIDR subnets
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableIpAllowlist}
                  onChange={(e) => setFormData({ ...formData, enableIpAllowlist: e.target.checked })}
                  className="rounded w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-servora-navy">Enable IP Restriction</span>
              </label>
            </div>

            {formData.enableIpAllowlist && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter IPv4 / CIDR subnet (e.g. 192.168.1.0/24 or 41.89.20.15)"
                    value={newIpInput}
                    onChange={(e) => setNewIpInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core"
                  />
                  <button
                    type="button"
                    onClick={handleAddIp}
                    className="px-3 py-2 bg-servora-core text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Add Network
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.allowedIpRanges.length === 0 ? (
                    <p className="text-xs text-amber-700 italic">
                      Warning: IP allowlist enabled but no IP subnets are specified. This will block all logins.
                    </p>
                  ) : (
                    formData.allowedIpRanges.map((ip) => (
                      <span
                        key={ip}
                        className="px-2.5 py-1 bg-slate-100 text-servora-navy border border-gray-200 rounded-lg font-mono text-xs flex items-center gap-1.5"
                      >
                        {ip}
                        <button
                          type="button"
                          onClick={() => handleRemoveIp(ip)}
                          className="text-gray-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
            >
              <Save size={14} />
              <span>{isSaving ? 'Enforcing Policies...' : 'Enforce Security Policies'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 5. TAB 2: ACTIVE SESSIONS MONITOR */}
      {activeTab === 'SESSIONS' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Active Authenticated Devices</h3>
              <p className="text-xs text-gray-400">
                Inspect device footprint, client IP addresses, and revoke compromised or unauthorized logins.
              </p>
            </div>
            <button
              onClick={handleRevokeAll}
              disabled={isRevokingAll || sessions.length <= 1}
              className="px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <LogOut size={13} />
              <span>{isRevokingAll ? 'Revoking...' : 'Terminate All Other Sessions'}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3">Device & User</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Browser / OS</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Last Active</th>
                    <th className="py-2.5 px-3 text-right">Revocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 italic">
                        No active sessions recorded.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((sess) => {
                      const Icon = DEVICE_ICONS[sess.deviceType] || Monitor;
                      return (
                        <tr key={sess.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-servora-core flex items-center justify-center shrink-0">
                                <Icon size={16} />
                              </div>
                              <div>
                                <span className="font-bold text-servora-navy block">{sess.userName}</span>
                                <span className="text-[10px] text-gray-400 font-mono block">{sess.userEmail}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold font-mono bg-blue-50 text-servora-core border border-blue-200">
                              {sess.userRole}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-servora-navy">
                            {sess.ipAddress}
                          </td>
                          <td className="py-3 px-3 text-gray-600">
                            {sess.browser || 'Browser'} on {sess.os || 'OS'}
                          </td>
                          <td className="py-3 px-3 text-gray-600">
                            {sess.city ? `${sess.city}, ${sess.country}` : 'Local Network'}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                            {new Date(sess.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleRevokeSingle(sess.id)}
                              className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}