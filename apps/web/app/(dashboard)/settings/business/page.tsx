'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Building2, 
  Save, 
  Globe, 
  Mail, 
  Phone, 
  Receipt, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Store, 
  ExternalLink,
  UploadCloud,
  ChevronRight,
  Layers
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface BranchSummary {
  id: number;
  name: string;
  code: string;
  isMainBranch: boolean;
  isActive: boolean;
}

interface BusinessProfile {
  id: number;
  businessName: string;
  slug: string | null;
  legalName: string | null;
  kraPin: string | null;
  email: string | null;
  phone: string | null;
  currency: string;
  timezone: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  logoUrl: string | null;
  isActive: boolean;
  branchesCount: number;
  branches: BranchSummary[];
}

export default function BusinessSettingsPage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [legalName, setLegalName] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [timezone, setTimezone] = useState('Africa/Nairobi');
  const [logoUrl, setLogoUrl] = useState('');

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi('/api/v1/business');
      if (res?.data) {
        const d = res.data;
        setProfile(d);
        setBusinessName(d.businessName || '');
        setSlug(d.slug || '');
        setLegalName(d.legalName || '');
        setKraPin(d.kraPin || '');
        setEmail(d.email || '');
        setPhone(d.phone || '');
        setCurrency(d.currency || 'KES');
        setTimezone(d.timezone || 'Africa/Nairobi');
        setLogoUrl(d.logoUrl || '');
      }
    } catch (err: any) {
      console.error('Failed to load business profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetchApi('/api/v1/business', {
        method: 'PUT',
        body: JSON.stringify({
          businessName,
          slug: slug.trim().toLowerCase() || undefined,
          legalName: legalName || undefined,
          kraPin: kraPin ? kraPin.trim().toUpperCase() : undefined,
          email: email || undefined,
          phone: phone || undefined,
          currency,
          timezone,
          logoUrl: logoUrl || undefined,
        }),
      });

      setFeedback({ type: 'success', message: res.message || 'Corporate profile updated successfully.' });
      loadProfile();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update corporate profile.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-400">Settings</span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-servora-navy">Corporate Entity</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Business Profile & Entity Identity</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Configure legal trading identity, KRA fiscal PIN compliance, regional billing currency, and storefront branding.
          </p>
        </div>

        {profile && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-servora-pale text-servora-core border border-servora-core/20 rounded-xl text-xs font-bold font-mono">
              Plan: {profile.subscriptionPlan}
            </span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
              {profile.subscriptionStatus}
            </span>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse bg-white rounded-2xl border border-gray-100">
          Loading business corporate identity...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Identity Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-servora-navy flex items-center gap-2 border-b border-gray-100 pb-3">
                <Building2 size={16} className="text-servora-core" />
                Trading & Legal Entity Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    Trading Name (Displays on POS & Bills) *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Servora Bistro & Grill"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    Registered Legal Corporate Name
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g. Servora Hospitality Limited"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    Business Web Slug / URL Identifier
                  </label>
                  <div className="flex items-center">
                    <span className="px-2.5 py-2 text-xs bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-gray-500 font-mono">
                      servora.app/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="servora-bistro"
                      className="w-full px-3 py-2 border border-gray-200 rounded-r-xl text-xs focus:border-servora-core focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    KRA Tax PIN (TIMS/eTIMS Compliance)
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={kraPin}
                    onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                    placeholder="P051234567Z"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold uppercase focus:border-servora-core focus:outline-none tracking-wider"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Used for electronic fiscal tax invoices (bhfId / VSCU).</p>
                </div>
              </div>
            </div>

            {/* Contact & Communications Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-servora-navy flex items-center gap-2 border-b border-gray-100 pb-3">
                <Mail size={16} className="text-servora-core" />
                Official Communications & Contact
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    Primary Corporate Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@servora.app"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    Headquarters Phone Contact
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 700 000000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Regional & Fiscal Preferences */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-servora-navy flex items-center gap-2 border-b border-gray-100 pb-3">
                <Globe size={16} className="text-servora-core" />
                Fiscal Currency & Regional Settings
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    Base Ledger Currency *
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-bold"
                  >
                    <option value="KES">KES - Kenyan Shilling (KES)</option>
                    <option value="USD">USD - US Dollar ($)</option>
                    <option value="EUR">EUR - Euro (€)</option>
                    <option value="GBP">GBP - British Pound (£)</option>
                    <option value="TZS">TZS - Tanzanian Shilling (TZS)</option>
                    <option value="UGX">UGX - Ugandan Shilling (UGX)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    Operating Timezone *
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-mono"
                  >
                    <option value="Africa/Nairobi">Africa/Nairobi (EAT - UTC+3)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (SAST - UTC+2)</option>
                    <option value="Africa/Lagos">Africa/Lagos (WAT - UTC+1)</option>
                    <option value="Africa/Cairo">Africa/Cairo (EET - UTC+2)</option>
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-servora-core text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save size={15} />
                {isSubmitting ? 'Saving Changes...' : 'Save Corporate Entity'}
              </button>
            </div>
          </div>

          {/* Right Summary / Brand Identity Card */}
          <div className="space-y-6">
            {/* Storefront Logo & Brand Asset */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-servora-navy border-b border-gray-100 pb-3">
                Corporate Brand Asset
              </h3>

              <div className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-200 rounded-xl bg-slate-50 text-center">
                {logoUrl ? (
                  <div className="space-y-2 flex flex-col items-center">
                    <img
                      src={logoUrl}
                      alt="Brand Logo"
                      className="max-h-24 max-w-full object-contain rounded-lg"
                      onError={() => setLogoUrl('')}
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-[11px] text-rose-600 font-semibold hover:underline"
                    >
                      Remove Logo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <UploadCloud size={28} className="mx-auto text-gray-400" />
                    <p className="text-xs font-semibold text-servora-navy">No Logo Configured</p>
                    <p className="text-[10px] text-gray-400">PNG, SVG or JPEG for bills & receipts</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">
                  Hosted Logo URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>
            </div>

            {/* Outlets Overview Quick Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-servora-navy flex items-center gap-1.5">
                  <Store size={15} className="text-servora-core" />
                  Active Branch Nodes
                </h3>
                <Link
                  href="/settings/branches"
                  className="text-xs font-bold text-servora-core hover:underline flex items-center gap-0.5"
                >
                  Manage <ExternalLink size={11} />
                </Link>
              </div>

              <div className="space-y-2">
                {profile?.branches && profile.branches.length > 0 ? (
                  profile.branches.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 text-xs bg-slate-50/70"
                    >
                      <div>
                        <span className="font-bold text-servora-navy block">{b.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {b.code} {b.isMainBranch && '• Central Hub'}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          b.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {b.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic">No branch outlets registered yet.</p>
                )}
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}