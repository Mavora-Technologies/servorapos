'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Receipt,
  ChevronRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  ShieldCheck,
  Calendar,
  Check,
  Download,
  Trash2,
  Clock,
  Sparkles,
  Zap,X,
  ArrowUpRight,
  Smartphone,
  Landmark,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description: string | null;
  billingCycle: 'MONTHLY' | 'ANNUALLY';
  basePrice: string;
  currency: string;
  includedUsers: number;
  includedBranches: number;
  perUserPrice: string;
  perBranchPrice: string;
  features: string[];
  isActive: boolean;
}

interface TenantSubscription {
  id: number;
  tenantId: number;
  planId: number;
  planCode: string;
  planName: string;
  planDescription: string | null;
  billingCycle: 'MONTHLY' | 'ANNUALLY';
  basePrice: string;
  currency: string;
  perUserPrice: string;
  perBranchPrice: string;
  includedUsers: number;
  includedBranches: number;
  features: string[];
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  seatAllocation: number;
  branchAllocation: number;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
}

interface UsageQuota {
  seatsUsed: number;
  seatsAllocated: number;
  branchesUsed: number;
  branchesAllocated: number;
}

interface PaymentMethod {
  id: number;
  type: 'CARD' | 'MPESA_STANDING_ORDER' | 'DIRECT_DEBIT' | 'CORPORATE_INVOICE';
  provider: string;
  accountMask: string;
  brandOrBank: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
}

interface BillingInvoice {
  id: number;
  invoiceNumber: string;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'VOID';
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  paidAt: string | null;
  paymentMethodType: string | null;
  externalTransactionRef: string | null;
}

export default function BillingSettingsPage() {
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [usage, setUsage] = useState<UsageQuota>({
    seatsUsed: 0,
    seatsAllocated: 0,
    branchesUsed: 0,
    branchesAllocated: 0,
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [activeTab, setActiveTab] = useState<'PLAN' | 'PAYMENT_METHODS' | 'INVOICES'>('PLAN');

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Seat Configuration Form State
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [allocatedSeats, setAllocatedSeats] = useState<number>(5);
  const [allocatedBranches, setAllocatedBranches] = useState<number>(1);

  // New Payment Method Modal State
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [methodForm, setMethodForm] = useState({
    type: 'CARD' as PaymentMethod['type'],
    provider: 'STRIPE',
    accountMask: '',
    brandOrBank: '',
    expiryMonth: 12,
    expiryYear: 2028,
    token: '',
    isDefault: false,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [overviewRes, invoiceRes] = await Promise.all([
        fetchApi('/api/v1/settings/billing'),
        fetchApi('/api/v1/settings/billing/invoices'),
      ]);

      if (overviewRes?.data) {
        setSubscription(overviewRes.data.subscription);
        setAvailablePlans(overviewRes.data.availablePlans || []);
        if (overviewRes.data.usage) setUsage(overviewRes.data.usage);
        if (overviewRes.data.paymentMethods) setPaymentMethods(overviewRes.data.paymentMethods);

        if (overviewRes.data.subscription) {
          setSelectedPlanId(overviewRes.data.subscription.planId);
          setAllocatedSeats(overviewRes.data.subscription.seatAllocation);
          setAllocatedBranches(overviewRes.data.subscription.branchAllocation);
        }
      }

      if (invoiceRes?.data && Array.isArray(invoiceRes.data)) {
        setInvoices(invoiceRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load billing parameters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activePlanObj = useMemo(() => {
    return availablePlans.find((p) => p.id === (selectedPlanId || subscription?.planId)) || null;
  }, [availablePlans, selectedPlanId, subscription]);

  // Dynamic estimated total calculation
  const estimatedCost = useMemo(() => {
    if (!activePlanObj) return { subtotal: 0, tax: 0, total: 0 };
    const base = parseFloat(activePlanObj.basePrice) || 0;
    const extraSeats = Math.max(0, allocatedSeats - activePlanObj.includedUsers);
    const extraBranches = Math.max(0, allocatedBranches - activePlanObj.includedBranches);
    const seatCost = extraSeats * (parseFloat(activePlanObj.perUserPrice) || 0);
    const branchCost = extraBranches * (parseFloat(activePlanObj.perBranchPrice) || 0);

    const subtotal = base + seatCost + branchCost;
    const tax = subtotal * 0.16; // Statutory VAT 16%
    const total = subtotal + tax;

    return { subtotal, tax, total };
  }, [activePlanObj, allocatedSeats, allocatedBranches]);

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;
    try {
      setIsUpdatingSub(true);
      await fetchApi('/api/v1/settings/billing/subscription', {
        method: 'PUT',
        body: JSON.stringify({
          planId: selectedPlanId,
          seatAllocation: allocatedSeats,
          branchAllocation: allocatedBranches,
          autoRenew: true,
        }),
      });
      setToastMessage({ text: 'Enterprise subscription and allocation updated.', type: 'success' });
      loadData();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Subscription update failed', type: 'error' });
    } finally {
      setIsUpdatingSub(false);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/api/v1/settings/billing/payment-methods', {
        method: 'POST',
        body: JSON.stringify({
          ...methodForm,
          token: `TOK-${Date.now().toString().slice(-8)}`,
        }),
      });
      setIsMethodModalOpen(false);
      setToastMessage({ text: 'Payment mandate registered successfully.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add payment method');
    }
  };

  const handleDeleteMethod = async (id: number) => {
    if (!confirm('Remove this payment method?')) return;
    try {
      await fetchApi(`/api/v1/settings/billing/payment-methods/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove payment method');
    }
  };

  const handleSetDefaultMethod = async (id: number) => {
    try {
      await fetchApi(`/api/v1/settings/billing/payment-methods/${id}/set-default`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update default payment method');
    }
  };

  const handleSettleInvoice = async (invoiceId: number) => {
    try {
      await fetchApi('/api/v1/settings/billing/invoices/settle', {
        method: 'POST',
        body: JSON.stringify({ invoiceId }),
      });
      setToastMessage({ text: 'Invoice marked as paid.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Settlement failed');
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
            <span className="text-xs font-bold text-servora-navy">Subscription & Licensing</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Receipt className="text-servora-core" size={22} />
            Billing & Headcount License Management
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Manage your subscription tier, seat allocations, payment mandates, and statutory tax invoices.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={loadData}
            title="Refresh Account Ledger"
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

      {/* 2. TELEMETRY & QUOTA RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Current Plan</span>
            <p className="text-lg font-bold font-mono text-servora-navy mt-0.5">
              {subscription?.planName || 'Unassigned'}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Sparkles size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</span>
            <p className="text-base font-bold font-mono text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {subscription?.status || 'Active'}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Seats Utilized</span>
            <p className="text-lg font-bold font-mono text-servora-navy mt-0.5">
              {usage.seatsUsed} / {usage.seatsAllocated}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Branches</span>
            <p className="text-lg font-bold font-mono text-amber-700 mt-0.5">
              {usage.branchesUsed} / {usage.branchesAllocated}
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Building2 size={18} />
          </div>
        </div>
      </div>

      {/* 3. FUNCTIONAL TABS */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('PLAN')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'PLAN'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
          }`}
        >
          <Sparkles size={14} />
          <span>Subscription & Headcount</span>
        </button>

        <button
          onClick={() => setActiveTab('PAYMENT_METHODS')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'PAYMENT_METHODS'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
          }`}
        >
          <CreditCard size={14} />
          <span>Payment Mandates ({paymentMethods.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('INVOICES')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'INVOICES'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
          }`}
        >
          <Receipt size={14} />
          <span>Invoices & Statements ({invoices.length})</span>
        </button>
      </div>

      {/* 4. TAB 1: SUBSCRIPTION TIER & SEAT PROVISIONING */}
      {activeTab === 'PLAN' && (
        <form onSubmit={handleUpdateSubscription} className="space-y-6">
          {/* Plan Tiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availablePlans.map((plan) => {
              const isSelected = (selectedPlanId || subscription?.planId) === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`p-5 rounded-2xl border bg-white shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'border-servora-core ring-2 ring-servora-core/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-servora-navy text-base">{plan.name}</h3>
                        <span className="text-[10px] font-mono font-bold uppercase text-servora-core bg-blue-50 px-1.5 py-0.5 rounded">
                          {plan.code}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-servora-core text-white flex items-center justify-center">
                          <Check size={12} />
                        </div>
                      )}
                    </div>

                    <div className="pt-1">
                      <span className="text-2xl font-bold font-mono text-servora-navy">
                        {plan.currency} {parseFloat(plan.basePrice).toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400"> /{plan.billingCycle.toLowerCase()}</span>
                    </div>

                    {plan.description && (
                      <p className="text-xs text-gray-500 leading-relaxed">{plan.description}</p>
                    )}

                    <div className="pt-2 border-t border-gray-100 text-xs space-y-1.5 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Check size={13} className="text-emerald-600 shrink-0" />
                        <span>Includes {plan.includedUsers} users & {plan.includedBranches} branch</span>
                      </div>
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <Check size={13} className="text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Allocation Sliders & Estimated Calculation */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-5 text-xs">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-servora-navy">Seat & Workstation Allocations</h3>
              <p className="text-[11px] text-gray-400">
                Adjust licensed operator seats and active operating branch locations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex justify-between items-center font-bold text-servora-navy">
                  <span>Licensed Operator Seats</span>
                  <span className="font-mono text-sm">{allocatedSeats} Seats</span>
                </div>
                <input
                  type="range"
                  min={activePlanObj ? activePlanObj.includedUsers : 1}
                  max={100}
                  value={allocatedSeats}
                  onChange={(e) => setAllocatedSeats(Number(e.target.value))}
                  className="w-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Included: {activePlanObj?.includedUsers || 1}</span>
                  <span>+{activePlanObj?.currency} {parseFloat(activePlanObj?.perUserPrice || '0').toLocaleString()} / extra seat</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex justify-between items-center font-bold text-servora-navy">
                  <span>Authorized Physical Branches</span>
                  <span className="font-mono text-sm">{allocatedBranches} Branches</span>
                </div>
                <input
                  type="range"
                  min={activePlanObj ? activePlanObj.includedBranches : 1}
                  max={20}
                  value={allocatedBranches}
                  onChange={(e) => setAllocatedBranches(Number(e.target.value))}
                  className="w-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Included: {activePlanObj?.includedBranches || 1}</span>
                  <span>+{activePlanObj?.currency} {parseFloat(activePlanObj?.perBranchPrice || '0').toLocaleString()} / extra branch</span>
                </div>
              </div>
            </div>

            {/* Estimated Calculation Breakdown */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-gray-200 space-y-2">
              <div className="flex justify-between text-gray-500">
                <span>Base Subscription ({activePlanObj?.name})</span>
                <span className="font-mono font-bold text-servora-navy">
                  {activePlanObj?.currency} {estimatedCost.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Statutory Tax (KRA 16% VAT)</span>
                <span className="font-mono font-bold text-servora-navy">
                  {activePlanObj?.currency} {estimatedCost.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-servora-navy pt-2 border-t border-gray-200">
                <span>Total Due per {activePlanObj?.billingCycle.toLowerCase()}</span>
                <span className="font-mono text-base text-servora-core">
                  {activePlanObj?.currency} {estimatedCost.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isUpdatingSub}
                className="px-5 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
              >
                <Zap size={14} />
                <span>{isUpdatingSub ? 'Updating Tier...' : 'Confirm License Upgrade'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 5. TAB 2: PAYMENT METHODS & CORPORATE MANDATES */}
      {activeTab === 'PAYMENT_METHODS' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Payment Mandates & Corporate Accounts</h3>
              <p className="text-xs text-gray-400">Card tokenization, M-Pesa automatic paybill mandate, or direct bank clearing</p>
            </div>
            <button
              onClick={() => setIsMethodModalOpen(true)}
              className="px-3.5 py-1.5 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Add Payment Method
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentMethods.length === 0 ? (
              <div className="col-span-full p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center text-xs text-gray-400 italic">
                No payment methods on file. Add a corporate card or payment mandate to avoid service disruption.
              </div>
            ) : (
              paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className={`p-5 rounded-2xl border bg-white shadow-xs flex flex-col justify-between space-y-4 ${
                    pm.isDefault ? 'border-servora-core ring-1 ring-servora-core/30' : 'border-gray-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {pm.type === 'CARD' && <CreditCard size={18} className="text-indigo-600" />}
                        {pm.type === 'MPESA_STANDING_ORDER' && <Smartphone size={18} className="text-emerald-600" />}
                        {pm.type === 'DIRECT_DEBIT' && <Landmark size={18} className="text-amber-600" />}
                        <span className="font-bold text-xs text-servora-navy">{pm.brandOrBank || pm.type}</span>
                      </div>
                      {pm.isDefault && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-servora-core border border-blue-200">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="font-mono text-base font-bold text-servora-navy tracking-wider">
                      {pm.accountMask}
                    </div>

                    {pm.expiryMonth && pm.expiryYear && (
                      <p className="text-[10px] text-gray-400">
                        Expires: {pm.expiryMonth.toString().padStart(2, '0')}/{pm.expiryYear}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    {!pm.isDefault ? (
                      <button
                        onClick={() => handleSetDefaultMethod(pm.id)}
                        className="text-xs font-bold text-servora-core hover:underline cursor-pointer"
                      >
                        Set Default
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400 font-medium">Primary Mandate</span>
                    )}

                    <button
                      onClick={() => handleDeleteMethod(pm.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6. TAB 3: INVOICES & STATUTORY TAX STATEMENTS */}
      {activeTab === 'INVOICES' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Billing Cycle</th>
                  <th className="py-2.5 px-3">Subtotal</th>
                  <th className="py-2.5 px-3">VAT (16%)</th>
                  <th className="py-2.5 px-3">Total Amount</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                      No invoices issued yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-servora-core">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-600">
                        {new Date(inv.billingPeriodStart).toLocaleDateString()} - {new Date(inv.billingPeriodEnd).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-700">
                        {inv.currency} {parseFloat(inv.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-700">
                        {inv.currency} {parseFloat(inv.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-servora-navy">
                        {inv.currency} {parseFloat(inv.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-500 text-[11px]">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.status === 'OVERDUE'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {inv.status !== 'PAID' ? (
                          <button
                            onClick={() => handleSettleInvoice(inv.id)}
                            className="px-2.5 py-1 bg-servora-core text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                          >
                            Pay Now
                          </button>
                        ) : (
                          <button
                            onClick={() => alert(`Downloading PDF for ${inv.invoiceNumber}...`)}
                            className="px-2.5 py-1 bg-slate-50 hover:bg-gray-100 text-servora-navy border border-gray-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Download size={12} /> Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. MODAL: REGISTER PAYMENT METHOD */}
      {isMethodModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Add Payment Mandate</h3>
                <p className="text-[11px] text-gray-400">Save corporate card or mobile payment account</p>
              </div>
              <button onClick={() => setIsMethodModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddPaymentMethod} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Mandate Type *</label>
                <select
                  value={methodForm.type}
                  onChange={(e) => setMethodForm({ ...methodForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="MPESA_STANDING_ORDER">M-Pesa Standing Order / Paybill</option>
                  <option value="DIRECT_DEBIT">Bank Direct Debit</option>
                  <option value="CORPORATE_INVOICE">Corporate Purchase Order</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Card / Account Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. •••• 4242 or 254712345678"
                  value={methodForm.accountMask}
                  onChange={(e) => setMethodForm({ ...methodForm, accountMask: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Brand / Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Visa, KCB, Safaricom"
                    value={methodForm.brandOrBank}
                    onChange={(e) => setMethodForm({ ...methodForm, brandOrBank: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Provider Adapter</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STRIPE, DPO"
                    value={methodForm.provider}
                    onChange={(e) => setMethodForm({ ...methodForm, provider: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={methodForm.isDefault}
                    onChange={(e) => setMethodForm({ ...methodForm, isDefault: e.target.checked })}
                    className="rounded"
                  />
                  <span className="font-medium text-servora-navy">Set as primary subscription payment mandate</span>
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsMethodModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                >
                  Save Mandate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}