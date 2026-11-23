// apps/web/app/(dashboard)/settings/billing/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Check,
  Printer,
  Trash2,
  Sparkles,
  Zap,
  X,
  Smartphone,
  Landmark,
  FileText,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

type BillingCycle = 'MONTHLY' | 'BIANNUAL' | 'ANNUALLY';
type PaymentMethodType = 'CARD' | 'MPESA_STANDING_ORDER' | 'DIRECT_DEBIT' | 'CORPORATE_INVOICE';
type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'VOID';

interface TenantProfile {
  businessName: string;
  legalName: string | null;
  kraPin: string | null;
  currency: string;
}

interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description: string | null;
  billingCycle: BillingCycle;
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
  billingCycle: BillingCycle;
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
  paymentMethodId: number | null;
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
  type: PaymentMethodType;
  provider: string;
  accountMask: string;
  brandOrBank: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface BillingInvoice {
  id: number;
  invoiceNumber: string;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  status: InvoiceStatus;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  paidAt: string | null;
  paymentMethodType: string | null;
  externalTransactionRef: string | null;
  lineItems: InvoiceLineItem[];
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function BillingSettingsPage() {
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
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

  // Loading & Feedback States
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Seat & Plan Configuration Form State
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [allocatedSeats, setAllocatedSeats] = useState<number>(5);
  const [allocatedBranches, setAllocatedBranches] = useState<number>(1);
  const [autoRenew, setAutoRenew] = useState<boolean>(true);

  // New Payment Method Modal State
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [isSavingMethod, setIsSavingMethod] = useState(false);
  const [methodModalError, setMethodModalError] = useState<string | null>(null);
  const [methodForm, setMethodForm] = useState({
    type: 'MPESA_STANDING_ORDER' as PaymentMethodType,
    provider: 'MPESA',
    accountMask: '',
    brandOrBank: '',
    expiryMonth: '',
    expiryYear: '',
    isDefault: false,
  });

  // Delete Payment Method Confirmation Modal State
  const [pendingDeleteMethod, setPendingDeleteMethod] = useState<PaymentMethod | null>(null);
  const [isDeletingMethod, setIsDeletingMethod] = useState(false);

  // Settle Invoice Modal State
  const [settlingInvoice, setSettlingInvoice] = useState<BillingInvoice | null>(null);
  const [settleMethodId, setSettleMethodId] = useState<string>('');
  const [settleReference, setSettleReference] = useState<string>('');
  const [isSettling, setIsSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  // Printable Tax Invoice Preview Modal State
  const [viewingInvoice, setViewingInvoice] = useState<BillingInvoice | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const [overviewResult, invoiceResult] = await Promise.allSettled([
      fetchApi('/api/v1/settings/billing'),
      fetchApi('/api/v1/settings/billing/invoices'),
    ]);

    if (overviewResult.status === 'fulfilled' && overviewResult.value?.data) {
      const data = overviewResult.value.data;
      setTenantProfile(data.tenantProfile || null);
      setSubscription(data.subscription || null);
      const plans: SubscriptionPlan[] = Array.isArray(data.availablePlans)
        ? data.availablePlans
        : [];
      setAvailablePlans(plans);
      if (data.usage) setUsage(data.usage);
      if (Array.isArray(data.paymentMethods)) setPaymentMethods(data.paymentMethods);

      if (data.subscription) {
        setSelectedPlanId(data.subscription.planId);
        setAllocatedSeats(data.subscription.seatAllocation);
        setAllocatedBranches(data.subscription.branchAllocation);
        setAutoRenew(data.subscription.autoRenew);
      } else if (plans.length > 0) {
        setSelectedPlanId((prev) => prev ?? plans[0].id);
        setAllocatedSeats(Math.max(plans[0].includedUsers, data.usage?.seatsUsed ?? 1));
        setAllocatedBranches(Math.max(plans[0].includedBranches, data.usage?.branchesUsed ?? 1));
      }
    } else {
      setLoadError(
        overviewResult.status === 'rejected'
          ? getErrorMessage(overviewResult.reason, 'Failed to load billing overview.')
          : 'Unexpected response structure from billing API.'
      );
    }

    if (invoiceResult.status === 'fulfilled' && Array.isArray(invoiceResult.value?.data)) {
      setInvoices(invoiceResult.value.data);
    } else {
      setInvoices([]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activePlanObj = useMemo(() => {
    return availablePlans.find((p) => p.id === (selectedPlanId || subscription?.planId)) || null;
  }, [availablePlans, selectedPlanId, subscription]);

  const minAllowedSeats = useMemo(() => {
    return Math.max(activePlanObj?.includedUsers ?? 1, usage.seatsUsed, 1);
  }, [activePlanObj, usage.seatsUsed]);

  const minAllowedBranches = useMemo(() => {
    return Math.max(activePlanObj?.includedBranches ?? 1, usage.branchesUsed, 1);
  }, [activePlanObj, usage.branchesUsed]);

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlanId(plan.id);
    setAllocatedSeats((prev) => Math.max(prev, plan.includedUsers, usage.seatsUsed, 1));
    setAllocatedBranches((prev) => Math.max(prev, plan.includedBranches, usage.branchesUsed, 1));
  };

  // Dynamic estimated billing breakdown
  const estimatedCost = useMemo(() => {
    if (!activePlanObj) return { subtotal: 0, tax: 0, total: 0 };
    const base = parseFloat(activePlanObj.basePrice) || 0;
    const extraSeats = Math.max(0, allocatedSeats - activePlanObj.includedUsers);
    const extraBranches = Math.max(0, allocatedBranches - activePlanObj.includedBranches);
    const seatCost = extraSeats * (parseFloat(activePlanObj.perUserPrice) || 0);
    const branchCost = extraBranches * (parseFloat(activePlanObj.perBranchPrice) || 0);

    const subtotal = base + seatCost + branchCost;
    const tax = subtotal * 0.16;
    const total = subtotal + tax;

    return { subtotal, tax, total };
  }, [activePlanObj, allocatedSeats, allocatedBranches]);

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || isUpdatingSub) return;
    setActionError(null);
    setStatusBanner(null);

    try {
      setIsUpdatingSub(true);
      const res = await fetchApi('/api/v1/settings/billing/subscription', {
        method: 'PUT',
        body: JSON.stringify({
          planId: selectedPlanId,
          seatAllocation: Math.max(allocatedSeats, minAllowedSeats),
          branchAllocation: Math.max(allocatedBranches, minAllowedBranches),
          autoRenew,
        }),
      });
      setStatusBanner(res?.message || 'Enterprise subscription and allocation updated.');
      await loadData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Subscription update failed.'));
    } finally {
      setIsUpdatingSub(false);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingMethod) return;
    setMethodModalError(null);

    if (methodForm.accountMask.trim().length < 3) {
      setMethodModalError('Provide a valid card mask or account reference.');
      return;
    }

    try {
      setIsSavingMethod(true);
      await fetchApi('/api/v1/settings/billing/payment-methods', {
        method: 'POST',
        body: JSON.stringify({
          type: methodForm.type,
          provider: methodForm.provider.trim(),
          accountMask: methodForm.accountMask.trim(),
          brandOrBank: methodForm.brandOrBank.trim() || null,
          expiryMonth: methodForm.type === 'CARD' && methodForm.expiryMonth ? Number(methodForm.expiryMonth) : null,
          expiryYear: methodForm.type === 'CARD' && methodForm.expiryYear ? Number(methodForm.expiryYear) : null,
          token: `MND-${Date.now().toString(36).toUpperCase()}`,
          isDefault: methodForm.isDefault,
        }),
      });
      setIsMethodModalOpen(false);
      setMethodForm({
        type: 'MPESA_STANDING_ORDER',
        provider: 'MPESA',
        accountMask: '',
        brandOrBank: '',
        expiryMonth: '',
        expiryYear: '',
        isDefault: false,
      });
      setStatusBanner('Payment mandate registered successfully.');
      await loadData();
    } catch (err: unknown) {
      setMethodModalError(getErrorMessage(err, 'Failed to register payment mandate.'));
    } finally {
      setIsSavingMethod(false);
    }
  };

  const handleConfirmDeleteMethod = async () => {
    if (!pendingDeleteMethod || isDeletingMethod) return;
    setIsDeletingMethod(true);
    setActionError(null);
    try {
      await fetchApi(`/api/v1/settings/billing/payment-methods/${pendingDeleteMethod.id}`, {
        method: 'DELETE',
      });
      const mask = pendingDeleteMethod.accountMask;
      setPendingDeleteMethod(null);
      setStatusBanner(`Removed payment mandate (${mask}).`);
      await loadData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to remove payment mandate.'));
      setPendingDeleteMethod(null);
    } finally {
      setIsDeletingMethod(false);
    }
  };

  const handleSetDefaultMethod = async (id: number) => {
    setActionError(null);
    try {
      await fetchApi(`/api/v1/settings/billing/payment-methods/${id}/set-default`, {
        method: 'POST',
      });
      setStatusBanner('Primary subscription payment mandate updated.');
      await loadData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to update default payment mandate.'));
    }
  };

  const openSettleModal = (inv: BillingInvoice) => {
    const defaultPm = paymentMethods.find((m) => m.isDefault) || paymentMethods[0];
    setSettlingInvoice(inv);
    setSettleMethodId(defaultPm ? String(defaultPm.id) : '');
    setSettleReference('');
    setSettleError(null);
  };

  const handleConfirmSettleInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingInvoice || isSettling) return;
    setIsSettling(true);
    setSettleError(null);
    try {
      await fetchApi('/api/v1/settings/billing/invoices/settle', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: settlingInvoice.id,
          paymentMethodId: settleMethodId ? parseInt(settleMethodId, 10) : null,
          manualReference: settleReference.trim() || null,
        }),
      });
      const invNum = settlingInvoice.invoiceNumber;
      setSettlingInvoice(null);
      setStatusBanner(`Invoice ${invNum} marked as settled.`);
      await loadData();
    } catch (err: unknown) {
      setSettleError(getErrorMessage(err, 'Invoice settlement failed.'));
    } finally {
      setIsSettling(false);
    }
  };

  const pendingInvoiceCount = useMemo(
    () => invoices.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE').length,
    [invoices]
  );

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core inline-flex items-center gap-1 transition-colors"
            >
              Enterprise Control <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Subscription &amp; Licensing</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Receipt className="text-servora-core" size={22} />
            Billing &amp; Headcount License Management
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Manage subscription tiers, operator seat allocations, payment mandates, and KRA 16% VAT tax invoices.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          title="Refresh Account Ledger"
          className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-xs font-semibold text-servora-navy transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          Refresh
        </button>
      </div>

      {/* Feedback Banners */}
      {statusBanner && (
        <div
          role="status"
          className="p-3.5 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            aria-label="Dismiss notification"
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border bg-rose-50 border-rose-200 text-rose-900 text-xs font-semibold flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
            className="text-rose-700 hover:text-rose-950"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="p-5 bg-white rounded-2xl border border-rose-200 text-center space-y-2.5"
        >
          <p className="text-xs font-bold text-rose-800">{loadError}</p>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
          >
            Retry Request
          </button>
        </div>
      )}

      {/* 2. TELEMETRY & QUOTA RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Current Plan
            </span>
            <p className="text-base font-bold font-mono text-servora-navy mt-0.5">
              {subscription?.planName || 'Unassigned'}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Sparkles size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Status
            </span>
            <p
              className={`text-base font-bold font-mono mt-0.5 flex items-center gap-1.5 ${
                subscription?.status === 'ACTIVE'
                  ? 'text-emerald-700'
                  : subscription?.status === 'PAST_DUE'
                    ? 'text-rose-700'
                    : 'text-amber-700'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  subscription?.status === 'ACTIVE'
                    ? 'bg-emerald-500 animate-pulse'
                    : subscription?.status === 'PAST_DUE'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                }`}
              />
              {subscription?.status || 'NOT_ACTIVATED'}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Active Staff Seats
            </span>
            <p className="text-base font-bold font-mono text-servora-navy mt-0.5">
              {usage.seatsUsed} / {usage.seatsAllocated || '—'}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Active Branches
            </span>
            <p className="text-base font-bold font-mono text-amber-700 mt-0.5">
              {usage.branchesUsed} / {usage.branchesAllocated || '—'}
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Building2 size={18} />
          </div>
        </div>
      </div>

      {/* 3. FUNCTIONAL TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('PLAN')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'PLAN'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
          }`}
        >
          <Sparkles size={14} />
          <span>Subscription &amp; Headcount</span>
        </button>

        <button
          type="button"
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
          type="button"
          onClick={() => setActiveTab('INVOICES')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'INVOICES'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
          }`}
        >
          <Receipt size={14} />
          <span>
            Invoices &amp; Statements ({invoices.length})
            {pendingInvoiceCount > 0 ? ` • ${pendingInvoiceCount} Due` : ''}
          </span>
        </button>
      </div>

      {/* 4. TAB 1: SUBSCRIPTION TIER & SEAT PROVISIONING */}
      {activeTab === 'PLAN' && (
        <form onSubmit={handleUpdateSubscription} className="space-y-6">
          {availablePlans.length === 0 && !isLoading ? (
            <div className="p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center text-xs text-gray-500">
              No published subscription plans found in the platform catalog.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availablePlans.map((plan) => {
                const isSelected = (selectedPlanId || subscription?.planId) === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handlePlanSelect(plan)}
                    className={`text-left p-5 rounded-2xl border bg-white shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-servora-core ring-2 ring-servora-core/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="space-y-3 w-full">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-servora-navy text-base">{plan.name}</h3>
                          <span className="text-[10px] font-mono font-bold uppercase text-servora-core bg-blue-50 px-1.5 py-0.5 rounded">
                            {plan.code}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-servora-core text-white flex items-center justify-center shrink-0">
                            <Check size={12} />
                          </div>
                        )}
                      </div>

                      <div className="pt-1">
                        <span className="text-2xl font-bold font-mono text-servora-navy">
                          {plan.currency} {parseFloat(plan.basePrice).toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400">
                          {' '}
                          /{plan.billingCycle.toLowerCase()}
                        </span>
                      </div>

                      {plan.description && (
                        <p className="text-xs text-gray-500 leading-relaxed">{plan.description}</p>
                      )}

                      <div className="pt-2 border-t border-gray-100 text-xs space-y-1.5 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Check size={13} className="text-emerald-600 shrink-0" />
                          <span>
                            Includes {plan.includedUsers} seats &amp; {plan.includedBranches}{' '}
                            branch{plan.includedBranches === 1 ? '' : 'es'}
                          </span>
                        </div>
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <Check size={13} className="text-emerald-600 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Allocation Sliders & Estimated Calculation */}
          {activePlanObj && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-5 text-xs">
              <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-servora-navy">
                    Seat &amp; Branch Allocations
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Allocations cannot drop below active staff headcount ({usage.seatsUsed}) or active branches ({usage.branchesUsed}).
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-servora-navy cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRenew}
                    onChange={(e) => setAutoRenew(e.target.checked)}
                    className="rounded border-gray-300 text-servora-core w-4 h-4"
                  />
                  <span>Auto-renew each cycle</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex justify-between items-center font-bold text-servora-navy">
                    <span>Licensed Operator Seats</span>
                    <span className="font-mono text-sm">{allocatedSeats} Seats</span>
                  </div>
                  <input
                    type="range"
                    min={minAllowedSeats}
                    max={Math.max(100, minAllowedSeats + 20)}
                    value={Math.max(allocatedSeats, minAllowedSeats)}
                    onChange={(e) => setAllocatedSeats(Number(e.target.value))}
                    className="w-full cursor-pointer accent-servora-core"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Min: {minAllowedSeats} (Plan / Active)</span>
                    <span>
                      +{activePlanObj.currency}{' '}
                      {parseFloat(activePlanObj.perUserPrice || '0').toLocaleString()} / extra seat
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex justify-between items-center font-bold text-servora-navy">
                    <span>Authorized Physical Branches</span>
                    <span className="font-mono text-sm">{allocatedBranches} Branches</span>
                  </div>
                  <input
                    type="range"
                    min={minAllowedBranches}
                    max={Math.max(25, minAllowedBranches + 10)}
                    value={Math.max(allocatedBranches, minAllowedBranches)}
                    onChange={(e) => setAllocatedBranches(Number(e.target.value))}
                    className="w-full cursor-pointer accent-servora-core"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Min: {minAllowedBranches} (Plan / Active)</span>
                    <span>
                      +{activePlanObj.currency}{' '}
                      {parseFloat(activePlanObj.perBranchPrice || '0').toLocaleString()} / extra branch
                    </span>
                  </div>
                </div>
              </div>

              {/* Estimated Calculation Breakdown */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-gray-200 space-y-2">
                <div className="flex justify-between text-gray-500">
                  <span>Subscription Subtotal ({activePlanObj.name})</span>
                  <span className="font-mono font-bold text-servora-navy">
                    {activePlanObj.currency}{' '}
                    {estimatedCost.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Statutory Tax (KRA 16% VAT)</span>
                  <span className="font-mono font-bold text-servora-navy">
                    {activePlanObj.currency}{' '}
                    {estimatedCost.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-servora-navy pt-2 border-t border-gray-200">
                  <span>Total Due per {activePlanObj.billingCycle.toLowerCase()}</span>
                  <span className="font-mono text-base text-servora-core">
                    {activePlanObj.currency}{' '}
                    {estimatedCost.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isUpdatingSub || !selectedPlanId}
                  className="px-5 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
                >
                  <Zap size={14} />
                  <span>
                    {isUpdatingSub
                      ? 'Saving Allocation...'
                      : subscription
                        ? 'Confirm License Update'
                        : 'Activate Subscription'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* 5. TAB 2: PAYMENT METHODS & CORPORATE MANDATES */}
      {activeTab === 'PAYMENT_METHODS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">
                Payment Mandates &amp; Corporate Accounts
              </h3>
              <p className="text-xs text-gray-400">
                M-Pesa Paybill standing orders, tokenized corporate cards, or bank direct debit
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMethodModalError(null);
                setIsMethodModalOpen(true);
              }}
              className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Add Payment Mandate
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentMethods.length === 0 ? (
              <div className="col-span-full p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center text-xs text-gray-400">
                No payment mandates on file. Add a corporate M-Pesa mandate or card to streamline renewals.
              </div>
            ) : (
              paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className={`p-5 rounded-2xl border bg-white shadow-xs flex flex-col justify-between space-y-4 ${
                    pm.isDefault
                      ? 'border-servora-core ring-1 ring-servora-core/30'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {pm.type === 'CARD' && <CreditCard size={18} className="text-indigo-600" />}
                        {pm.type === 'MPESA_STANDING_ORDER' && (
                          <Smartphone size={18} className="text-emerald-600" />
                        )}
                        {pm.type === 'DIRECT_DEBIT' && (
                          <Landmark size={18} className="text-amber-600" />
                        )}
                        {pm.type === 'CORPORATE_INVOICE' && (
                          <FileText size={18} className="text-servora-core" />
                        )}
                        <span className="font-bold text-xs text-servora-navy">
                          {pm.brandOrBank || pm.provider}
                        </span>
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
                        type="button"
                        onClick={() => handleSetDefaultMethod(pm.id)}
                        className="text-xs font-bold text-servora-core hover:underline cursor-pointer"
                      >
                        Set Primary
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400 font-medium">Primary Mandate</span>
                    )}

                    <button
                      type="button"
                      onClick={() => setPendingDeleteMethod(pm)}
                      aria-label={`Remove ${pm.accountMask}`}
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
                  <th scope="col" className="py-3 px-4">Invoice Number</th>
                  <th scope="col" className="py-3 px-4">Billing Period</th>
                  <th scope="col" className="py-3 px-4">Subtotal</th>
                  <th scope="col" className="py-3 px-4">VAT</th>
                  <th scope="col" className="py-3 px-4">Total Amount</th>
                  <th scope="col" className="py-3 px-4">Due Date</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      No billing invoices issued yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-servora-core">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-600">
                        {new Date(inv.billingPeriodStart).toLocaleDateString('en-KE')} &ndash;{' '}
                        {new Date(inv.billingPeriodEnd).toLocaleDateString('en-KE')}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-700">
                        {inv.currency}{' '}
                        {parseFloat(inv.subtotal).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-700">
                        {inv.currency}{' '}
                        {parseFloat(inv.taxAmount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-servora-navy">
                        {inv.currency}{' '}
                        {parseFloat(inv.totalAmount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-500 text-[11px]">
                        {new Date(inv.dueDate).toLocaleDateString('en-KE')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : inv.status === 'OVERDUE'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingInvoice(inv)}
                            className="px-2.5 py-1 bg-slate-50 hover:bg-gray-100 text-servora-navy border border-gray-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Printer size={12} /> View
                          </button>
                          {inv.status !== 'PAID' && inv.status !== 'VOID' && (
                            <button
                              type="button"
                              onClick={() => openSettleModal(inv)}
                              className="px-2.5 py-1 bg-servora-core text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                            >
                              Settle
                            </button>
                          )}
                        </div>
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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-method-title"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 id="add-method-title" className="text-sm font-bold text-servora-navy">
                  Add Payment Mandate
                </h3>
                <p className="text-[11px] text-gray-400">
                  Save corporate M-Pesa mandate, card mask, or bank account
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMethodModalOpen(false)}
                aria-label="Close modal"
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {methodModalError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
              >
                {methodModalError}
              </div>
            )}

            <form onSubmit={handleAddPaymentMethod} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1" htmlFor="pm-type">
                  Mandate Type *
                </label>
                <select
                  id="pm-type"
                  value={methodForm.type}
                  onChange={(e) => {
                    const nextType = e.target.value as PaymentMethodType;
                    const defaultProvider =
                      nextType === 'MPESA_STANDING_ORDER'
                        ? 'MPESA'
                        : nextType === 'CARD'
                          ? 'STRIPE'
                          : 'BANK_DIRECT';
                    setMethodForm({ ...methodForm, type: nextType, provider: defaultProvider });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  <option value="MPESA_STANDING_ORDER">M-Pesa Standing Order / Paybill</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="DIRECT_DEBIT">Bank Direct Debit</option>
                  <option value="CORPORATE_INVOICE">Corporate Purchase Order</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1" htmlFor="pm-mask">
                  Card Mask / Account Reference *
                </label>
                <input
                  id="pm-mask"
                  type="text"
                  required
                  placeholder="e.g. 2547••••123 or •••• 4242"
                  value={methodForm.accountMask}
                  onChange={(e) => setMethodForm({ ...methodForm, accountMask: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1" htmlFor="pm-bank">
                    Brand / Bank Name
                  </label>
                  <input
                    id="pm-bank"
                    type="text"
                    placeholder="e.g. Safaricom, KCB, Visa"
                    value={methodForm.brandOrBank}
                    onChange={(e) => setMethodForm({ ...methodForm, brandOrBank: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1" htmlFor="pm-prov">
                    Provider Adapter *
                  </label>
                  <input
                    id="pm-prov"
                    type="text"
                    required
                    placeholder="e.g. MPESA, STRIPE, DPO"
                    value={methodForm.provider}
                    onChange={(e) => setMethodForm({ ...methodForm, provider: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              {methodForm.type === 'CARD' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-servora-navy mb-1" htmlFor="pm-exp-m">
                      Expiry Month
                    </label>
                    <input
                      id="pm-exp-m"
                      type="number"
                      min="1"
                      max="12"
                      placeholder="12"
                      value={methodForm.expiryMonth}
                      onChange={(e) => setMethodForm({ ...methodForm, expiryMonth: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-servora-navy mb-1" htmlFor="pm-exp-y">
                      Expiry Year
                    </label>
                    <input
                      id="pm-exp-y"
                      type="number"
                      min="2025"
                      max="2045"
                      placeholder="2029"
                      value={methodForm.expiryYear}
                      onChange={(e) => setMethodForm({ ...methodForm, expiryYear: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={methodForm.isDefault}
                  onChange={(e) => setMethodForm({ ...methodForm, isDefault: e.target.checked })}
                  className="rounded border-gray-300 text-servora-core w-4 h-4"
                />
                <span className="font-medium text-servora-navy">
                  Set as primary subscription payment mandate
                </span>
              </label>

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
                  disabled={isSavingMethod}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingMethod ? 'Saving...' : 'Save Mandate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: SETTLE INVOICE */}
      {settlingInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settle-invoice-title"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 id="settle-invoice-title" className="text-sm font-bold text-servora-navy">
                  Settle Invoice {settlingInvoice.invoiceNumber}
                </h3>
                <p className="text-[11px] text-gray-500">
                  Amount Due: {settlingInvoice.currency}{' '}
                  {parseFloat(settlingInvoice.totalAmount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettlingInvoice(null)}
                aria-label="Close modal"
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {settleError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
              >
                {settleError}
              </div>
            )}

            <form onSubmit={handleConfirmSettleInvoice} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1" htmlFor="settle-pm">
                  Payment Mandate
                </label>
                <select
                  id="settle-pm"
                  value={settleMethodId}
                  onChange={(e) => setSettleMethodId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-medium"
                >
                  <option value="">Manual Bank / M-Pesa Settlement</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.brandOrBank || pm.provider} ({pm.accountMask})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1" htmlFor="settle-ref">
                  M-Pesa Code / Bank Reference (Optional)
                </label>
                <input
                  id="settle-ref"
                  type="text"
                  placeholder="e.g. UK8912KL99 or EFT-2026-019"
                  value={settleReference}
                  onChange={(e) => setSettleReference(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSettlingInvoice(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettling}
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSettling ? 'Recording...' : 'Confirm Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: PRINTABLE STATUTORY TAX INVOICE */}
      {viewingInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-invoice-title"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-gray-200 pb-3">
              <div>
                <h3 id="view-invoice-title" className="text-base font-bold text-servora-navy">
                  TAX INVOICE — {viewingInvoice.invoiceNumber}
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Billed To: {tenantProfile?.legalName || tenantProfile?.businessName || 'Tenant'}
                  {tenantProfile?.kraPin ? ` • KRA PIN: ${tenantProfile.kraPin}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                aria-label="Close invoice"
                className="text-gray-400 hover:text-black cursor-pointer print:hidden"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {(viewingInvoice.lineItems || []).map((li, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-1.5 border-b border-gray-100"
                >
                  <div>
                    <span className="font-semibold text-servora-navy block">{li.description}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {li.quantity} &times; {viewingInvoice.currency}{' '}
                      {li.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-servora-navy">
                    {viewingInvoice.currency}{' '}
                    {li.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-1.5 font-mono">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>
                  {viewingInvoice.currency} {parseFloat(viewingInvoice.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>KRA VAT ({parseFloat(viewingInvoice.taxRate)}%):</span>
                <span>
                  {viewingInvoice.currency} {parseFloat(viewingInvoice.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm text-servora-navy pt-1.5 border-t border-gray-200">
                <span>TOTAL:</span>
                <span>
                  {viewingInvoice.currency} {parseFloat(viewingInvoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {viewingInvoice.externalTransactionRef && (
                <div className="flex justify-between text-[11px] text-emerald-700 pt-1">
                  <span>Settlement Ref:</span>
                  <span>{viewingInvoice.externalTransactionRef}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-servora-navy text-white font-bold rounded-xl hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} /> Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. DELETE PAYMENT MANDATE CONFIRMATION MODAL */}
      {pendingDeleteMethod && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-pm-title"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 id="delete-pm-title" className="text-sm font-bold text-servora-navy">
                  Remove Payment Mandate?
                </h3>
                <p className="text-xs text-servora-deepTeal mt-1 leading-relaxed">
                  Are you sure you want to remove{' '}
                  <strong className="text-servora-navy">{pendingDeleteMethod.accountMask}</strong>?
                  {pendingDeleteMethod.isDefault &&
                    ' Another saved mandate will automatically be promoted to primary if available.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPendingDeleteMethod(null)}
                disabled={isDeletingMethod}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMethod}
                disabled={isDeletingMethod}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeletingMethod ? 'Removing...' : 'Remove Mandate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}