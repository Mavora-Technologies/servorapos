import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../config/db';
import {
  subscriptionPlans,
  tenantSubscriptions,
  billingPaymentMethods,
  billingInvoices,
  users,
  branches,
  tenants,
} from '../config/schema';
import {
  UpdateSubscriptionPlanInput,
  AddPaymentMethodInput,
  ListInvoicesQuery,
  SettleInvoiceInput,
} from '../validators/billing.validator';

export const getBillingOverview = async (tenantId: number) => {
  // Query available published plans
  const availablePlans = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.isActive, true))
    .orderBy(asc(subscriptionPlans.basePrice));

  // Query or initialize current tenant subscription
  let [subscription] = await db
    .select({
      id: tenantSubscriptions.id,
      tenantId: tenantSubscriptions.tenantId,
      planId: tenantSubscriptions.planId,
      planCode: subscriptionPlans.code,
      planName: subscriptionPlans.name,
      planDescription: subscriptionPlans.description,
      billingCycle: subscriptionPlans.billingCycle,
      basePrice: subscriptionPlans.basePrice,
      currency: subscriptionPlans.currency,
      perUserPrice: subscriptionPlans.perUserPrice,
      perBranchPrice: subscriptionPlans.perBranchPrice,
      includedUsers: subscriptionPlans.includedUsers,
      includedBranches: subscriptionPlans.includedBranches,
      features: subscriptionPlans.features,
      status: tenantSubscriptions.status,
      currentPeriodStart: tenantSubscriptions.currentPeriodStart,
      currentPeriodEnd: tenantSubscriptions.currentPeriodEnd,
      seatAllocation: tenantSubscriptions.seatAllocation,
      branchAllocation: tenantSubscriptions.branchAllocation,
      paymentMethodId: tenantSubscriptions.paymentMethodId,
      autoRenew: tenantSubscriptions.autoRenew,
      cancelAtPeriodEnd: tenantSubscriptions.cancelAtPeriodEnd,
      createdAt: tenantSubscriptions.createdAt,
    })
    .from(tenantSubscriptions)
    .innerJoin(subscriptionPlans, eq(tenantSubscriptions.planId, subscriptionPlans.id))
    .where(eq(tenantSubscriptions.tenantId, tenantId))
    .limit(1);

  // If no subscription record exists, establish dynamic baseline link
  if (!subscription && availablePlans.length > 0) {
    const defaultPlan = availablePlans[0];
    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [createdSub] = await db
      .insert(tenantSubscriptions)
      .values({
        tenantId,
        planId: defaultPlan.id,
        status: 'TRIAL',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        seatAllocation: defaultPlan.includedUsers,
        branchAllocation: defaultPlan.includedBranches,
        autoRenew: true,
      })
      .returning();

    subscription = {
      id: createdSub.id,
      tenantId: createdSub.tenantId,
      planId: createdSub.planId,
      planCode: defaultPlan.code,
      planName: defaultPlan.name,
      planDescription: defaultPlan.description,
      billingCycle: defaultPlan.billingCycle,
      basePrice: defaultPlan.basePrice,
      currency: defaultPlan.currency,
      perUserPrice: defaultPlan.perUserPrice,
      perBranchPrice: defaultPlan.perBranchPrice,
      includedUsers: defaultPlan.includedUsers,
      includedBranches: defaultPlan.includedBranches,
      features: defaultPlan.features,
      status: createdSub.status,
      currentPeriodStart: createdSub.currentPeriodStart,
      currentPeriodEnd: createdSub.currentPeriodEnd,
      seatAllocation: createdSub.seatAllocation,
      branchAllocation: createdSub.branchAllocation,
      paymentMethodId: createdSub.paymentMethodId,
      autoRenew: createdSub.autoRenew,
      cancelAtPeriodEnd: createdSub.cancelAtPeriodEnd,
      createdAt: createdSub.createdAt,
    };
  }

  // Active usage headcounts
  const [userCountResult, branchCountResult] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(branches)
      .where(eq(branches.tenantId, tenantId)),
  ]);

  const activeSeatsUsed = Number(userCountResult[0]?.count || 0);
  const activeBranchesUsed = Number(branchCountResult[0]?.count || 0);

  // Payment methods on file
  const paymentMethods = await db
    .select()
    .from(billingPaymentMethods)
    .where(eq(billingPaymentMethods.tenantId, tenantId))
    .orderBy(desc(billingPaymentMethods.isDefault), desc(billingPaymentMethods.id));

  return {
    subscription,
    availablePlans,
    usage: {
      seatsUsed: activeSeatsUsed,
      seatsAllocated: subscription?.seatAllocation || 0,
      branchesUsed: activeBranchesUsed,
      branchesAllocated: subscription?.branchAllocation || 0,
    },
    paymentMethods,
  };
};

export const updateTenantSubscription = async (
  tenantId: number,
  input: UpdateSubscriptionPlanInput
) => {
  const [selectedPlan] = await db
    .select()
    .from(subscriptionPlans)
    .where(and(eq(subscriptionPlans.id, input.planId), eq(subscriptionPlans.isActive, true)))
    .limit(1);

  if (!selectedPlan) {
    throw new Error('Selected enterprise subscription tier does not exist.');
  }

  const [existing] = await db
    .select({ id: tenantSubscriptions.id })
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.tenantId, tenantId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(tenantSubscriptions)
      .set({
        planId: input.planId,
        seatAllocation: input.seatAllocation,
        branchAllocation: input.branchAllocation,
        autoRenew: input.autoRenew,
        status: 'ACTIVE',
        updatedAt: new Date(),
      })
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(tenantSubscriptions)
    .values({
      tenantId,
      planId: input.planId,
      seatAllocation: input.seatAllocation,
      branchAllocation: input.branchAllocation,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      autoRenew: input.autoRenew,
    })
    .returning();

  return created;
};

export const listTenantInvoices = async (tenantId: number, query: ListInvoicesQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(billingInvoices.tenantId, tenantId),
    query.status !== 'ALL' ? eq(billingInvoices.status, query.status) : undefined,
  ].filter(Boolean);

  const [countResult, invoices] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(billingInvoices)
      .where(and(...conditions)),
    db
      .select()
      .from(billingInvoices)
      .where(and(...conditions))
      .orderBy(desc(billingInvoices.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return {
    invoices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const addPaymentMethod = async (tenantId: number, input: AddPaymentMethodInput) => {
  if (input.isDefault) {
    await db
      .update(billingPaymentMethods)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(billingPaymentMethods.tenantId, tenantId));
  }

  const [created] = await db
    .insert(billingPaymentMethods)
    .values({
      tenantId,
      type: input.type,
      provider: input.provider,
      accountMask: input.accountMask,
      brandOrBank: input.brandOrBank || null,
      expiryMonth: input.expiryMonth || null,
      expiryYear: input.expiryYear || null,
      token: input.token,
      isDefault: input.isDefault,
    })
    .returning();

  return created;
};

export const deletePaymentMethod = async (tenantId: number, methodId: number) => {
  const [deleted] = await db
    .delete(billingPaymentMethods)
    .where(
      and(
        eq(billingPaymentMethods.id, methodId),
        eq(billingPaymentMethods.tenantId, tenantId)
      )
    )
    .returning();

  if (!deleted) {
    throw new Error('Payment method mandate record not found.');
  }

  return deleted;
};

export const setDefaultPaymentMethod = async (tenantId: number, methodId: number) => {
  await db
    .update(billingPaymentMethods)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(billingPaymentMethods.tenantId, tenantId));

  const [updated] = await db
    .update(billingPaymentMethods)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(
      and(
        eq(billingPaymentMethods.id, methodId),
        eq(billingPaymentMethods.tenantId, tenantId)
      )
    )
    .returning();

  return updated;
};

export const settleInvoice = async (tenantId: number, input: SettleInvoiceInput) => {
  const [invoice] = await db
    .select()
    .from(billingInvoices)
    .where(
      and(
        eq(billingInvoices.id, input.invoiceId),
        eq(billingInvoices.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!invoice) {
    throw new Error('Invoice not found.');
  }

  if (invoice.status === 'PAID') {
    throw new Error('Invoice has already been settled.');
  }

  const [settled] = await db
    .update(billingInvoices)
    .set({
      status: 'PAID',
      paidAt: new Date(),
      externalTransactionRef: input.manualReference || `SETTLE-${Date.now().toString().slice(-6)}`,
      updatedAt: new Date(),
    })
    .where(eq(billingInvoices.id, input.invoiceId))
    .returning();

  return settled;
};