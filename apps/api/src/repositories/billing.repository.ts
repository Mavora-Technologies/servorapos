// apps/api/src/repositories/billing.repository.ts
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
import type {
  UpdateSubscriptionPlanInput,
  AddPaymentMethodInput,
  ListInvoicesQuery,
  SettleInvoiceInput,
} from '../validators/billing.validator';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

function getCycleDurationDays(cycle: string): number {
  switch (cycle.toUpperCase()) {
    case 'ANNUALLY':
      return 365;
    case 'BIANNUAL':
      return 180;
    default:
      return 30;
  }
}

export const findBillingOverviewByTenant = async (tenantId: number) => {
  const [
    availablePlans,
    [subscription],
    [userCountRow],
    [branchCountRow],
    paymentMethods,
    [tenantProfile],
  ] = await Promise.all([
    db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(asc(subscriptionPlans.basePrice)),

    db
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
        canceledAt: tenantSubscriptions.canceledAt,
        createdAt: tenantSubscriptions.createdAt,
      })
      .from(tenantSubscriptions)
      .innerJoin(subscriptionPlans, eq(tenantSubscriptions.planId, subscriptionPlans.id))
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .limit(1),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true))),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(branches)
      .where(and(eq(branches.tenantId, tenantId), eq(branches.isActive, true))),

    // Never project secret mandate `token` to API responses
    db
      .select({
        id: billingPaymentMethods.id,
        type: billingPaymentMethods.type,
        provider: billingPaymentMethods.provider,
        accountMask: billingPaymentMethods.accountMask,
        brandOrBank: billingPaymentMethods.brandOrBank,
        expiryMonth: billingPaymentMethods.expiryMonth,
        expiryYear: billingPaymentMethods.expiryYear,
        isDefault: billingPaymentMethods.isDefault,
        createdAt: billingPaymentMethods.createdAt,
      })
      .from(billingPaymentMethods)
      .where(eq(billingPaymentMethods.tenantId, tenantId))
      .orderBy(desc(billingPaymentMethods.isDefault), desc(billingPaymentMethods.id)),

    db
      .select({
        businessName: tenants.businessName,
        legalName: tenants.legalName,
        kraPin: tenants.kraPin,
        currency: tenants.currency,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1),
  ]);

  return {
    tenantProfile: tenantProfile ?? null,
    subscription: subscription ?? null,
    availablePlans,
    usage: {
      seatsUsed: Number(userCountRow?.count ?? 0),
      seatsAllocated: subscription?.seatAllocation ?? 0,
      branchesUsed: Number(branchCountRow?.count ?? 0),
      branchesAllocated: subscription?.branchAllocation ?? 0,
    },
    paymentMethods,
  };
};

export const upsertTenantSubscriptionTransaction = async (
  tenantId: number,
  input: UpdateSubscriptionPlanInput
) => {
  return await db.transaction(async (tx) => {
    // 1. Validate target plan exists and is active
    const [selectedPlan] = await tx
      .select()
      .from(subscriptionPlans)
      .where(and(eq(subscriptionPlans.id, input.planId), eq(subscriptionPlans.isActive, true)))
      .limit(1);

    if (!selectedPlan) {
      throw new Error('Selected subscription plan does not exist or is inactive.');
    }

    // 2. Enforce plan minimums and live headcount/branch utilization guardrails
    const [[userCountRow], [branchCountRow]] = await Promise.all([
      tx
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true))),
      tx
        .select({ count: sql<number>`count(*)::int` })
        .from(branches)
        .where(and(eq(branches.tenantId, tenantId), eq(branches.isActive, true))),
    ]);

    const activeUsers = Number(userCountRow?.count ?? 0);
    const activeBranches = Number(branchCountRow?.count ?? 0);

    if (input.seatAllocation < selectedPlan.includedUsers) {
      throw new Error(
        `Seat allocation cannot be below the ${selectedPlan.includedUsers} seats included in ${selectedPlan.name}.`
      );
    }
    if (input.branchAllocation < selectedPlan.includedBranches) {
      throw new Error(
        `Branch allocation cannot be below the ${selectedPlan.includedBranches} branch(es) included in ${selectedPlan.name}.`
      );
    }
    if (input.seatAllocation < activeUsers) {
      throw new Error(
        `Cannot reduce seat allocation to ${input.seatAllocation}: you currently have ${activeUsers} active staff accounts.`
      );
    }
    if (input.branchAllocation < activeBranches) {
      throw new Error(
        `Cannot reduce branch allocation to ${input.branchAllocation}: you currently have ${activeBranches} active branch(es).`
      );
    }

    // 3. Upsert tenant subscription
    const [existing] = await tx
      .select()
      .from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .for('update')
      .limit(1);

    const now = new Date();
    const cycleDays = getCycleDurationDays(selectedPlan.billingCycle);
    const periodEnd = new Date(now.getTime() + cycleDays * 24 * 60 * 60 * 1000);

    const hasBillingChange =
      !existing ||
      existing.planId !== input.planId ||
      existing.seatAllocation !== input.seatAllocation ||
      existing.branchAllocation !== input.branchAllocation;

    let savedSub;
    if (existing) {
      const [updated] = await tx
        .update(tenantSubscriptions)
        .set({
          planId: input.planId,
          seatAllocation: input.seatAllocation,
          branchAllocation: input.branchAllocation,
          autoRenew: input.autoRenew,
          cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
          canceledAt: input.cancelAtPeriodEnd ? now : null,
          status: 'ACTIVE',
          updatedAt: now,
        })
        .where(eq(tenantSubscriptions.id, existing.id))
        .returning();
      savedSub = updated;
    } else {
      const [defaultPm] = await tx
        .select({ id: billingPaymentMethods.id })
        .from(billingPaymentMethods)
        .where(
          and(
            eq(billingPaymentMethods.tenantId, tenantId),
            eq(billingPaymentMethods.isDefault, true)
          )
        )
        .limit(1);

      const [created] = await tx
        .insert(tenantSubscriptions)
        .values({
          tenantId,
          planId: input.planId,
          seatAllocation: input.seatAllocation,
          branchAllocation: input.branchAllocation,
          paymentMethodId: defaultPm?.id ?? null,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: input.autoRenew,
          cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
        })
        .returning();
      savedSub = created;
    }

    // 4. Sync denormalized tenant plan & status fields
    await tx
      .update(tenants)
      .set({
        subscriptionPlan: selectedPlan.code,
        subscriptionStatus: 'ACTIVE',
        updatedAt: now,
      })
      .where(eq(tenants.id, tenantId));

    // 5. Issue a statutory KRA 16% VAT billing invoice when activating or changing tier/quotas
    let issuedInvoice = null;
    if (hasBillingChange) {
      const basePrice = parseFloat(selectedPlan.basePrice) || 0;
      const perUserPrice = parseFloat(selectedPlan.perUserPrice) || 0;
      const perBranchPrice = parseFloat(selectedPlan.perBranchPrice) || 0;
      const extraSeats = Math.max(0, input.seatAllocation - selectedPlan.includedUsers);
      const extraBranches = Math.max(0, input.branchAllocation - selectedPlan.includedBranches);

      const lineItems: InvoiceLineItem[] = [
        {
          description: `${selectedPlan.name} (${selectedPlan.billingCycle}) — Base Plan`,
          quantity: 1,
          unitPrice: basePrice,
          amount: basePrice,
        },
      ];

      if (extraSeats > 0) {
        lineItems.push({
          description: `Additional Licensed Operator Seats`,
          quantity: extraSeats,
          unitPrice: perUserPrice,
          amount: Number((extraSeats * perUserPrice).toFixed(2)),
        });
      }

      if (extraBranches > 0) {
        lineItems.push({
          description: `Additional Authorized Branch Locations`,
          quantity: extraBranches,
          unitPrice: perBranchPrice,
          amount: Number((extraBranches * perBranchPrice).toFixed(2)),
        });
      }

      const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
      const vatRate = 16.0;
      const taxAmount = Number((subtotal * (vatRate / 100)).toFixed(2));
      const totalAmount = Number((subtotal + taxAmount).toFixed(2));

      if (totalAmount > 0) {
        const year = now.getFullYear();
        const suffix = `${tenantId}-${Date.now().toString().slice(-6)}`;
        const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        const [inv] = await tx
          .insert(billingInvoices)
          .values({
            tenantId,
            subscriptionId: savedSub.id,
            invoiceNumber: `INV-${year}-${suffix}`,
            subtotal: subtotal.toFixed(2),
            taxRate: vatRate.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            currency: selectedPlan.currency,
            status: 'PENDING',
            billingPeriodStart: savedSub.currentPeriodStart,
            billingPeriodEnd: savedSub.currentPeriodEnd,
            dueDate,
            lineItems,
          })
          .returning();

        issuedInvoice = inv;
      }
    }

    return { subscription: savedSub, invoice: issuedInvoice };
  });
};

export const listTenantInvoices = async (tenantId: number, query: ListInvoicesQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(billingInvoices.tenantId, tenantId)];
  if (query.status !== 'ALL') {
    conditions.push(eq(billingInvoices.status, query.status));
  }

  const [countResult, invoices] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
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

  const total = Number(countResult[0]?.count ?? 0);

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

export const addPaymentMethodTransaction = async (
  tenantId: number,
  input: AddPaymentMethodInput
) => {
  return await db.transaction(async (tx) => {
    const existingMethods = await tx
      .select({ id: billingPaymentMethods.id })
      .from(billingPaymentMethods)
      .where(eq(billingPaymentMethods.tenantId, tenantId));

    const shouldBeDefault = input.isDefault || existingMethods.length === 0;

    if (shouldBeDefault) {
      await tx
        .update(billingPaymentMethods)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(billingPaymentMethods.tenantId, tenantId));
    }

    const [created] = await tx
      .insert(billingPaymentMethods)
      .values({
        tenantId,
        type: input.type,
        provider: input.provider,
        accountMask: input.accountMask,
        brandOrBank: input.brandOrBank ?? null,
        expiryMonth: input.expiryMonth ?? null,
        expiryYear: input.expiryYear ?? null,
        token: input.token,
        isDefault: shouldBeDefault,
      })
      .returning({
        id: billingPaymentMethods.id,
        type: billingPaymentMethods.type,
        provider: billingPaymentMethods.provider,
        accountMask: billingPaymentMethods.accountMask,
        brandOrBank: billingPaymentMethods.brandOrBank,
        expiryMonth: billingPaymentMethods.expiryMonth,
        expiryYear: billingPaymentMethods.expiryYear,
        isDefault: billingPaymentMethods.isDefault,
        createdAt: billingPaymentMethods.createdAt,
      });

    if (shouldBeDefault) {
      await tx
        .update(tenantSubscriptions)
        .set({ paymentMethodId: created.id, updatedAt: new Date() })
        .where(eq(tenantSubscriptions.tenantId, tenantId));
    }

    return created;
  });
};

export const deletePaymentMethodTransaction = async (tenantId: number, methodId: number) => {
  return await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(billingPaymentMethods)
      .where(
        and(
          eq(billingPaymentMethods.id, methodId),
          eq(billingPaymentMethods.tenantId, tenantId)
        )
      )
      .returning({ id: billingPaymentMethods.id, isDefault: billingPaymentMethods.isDefault });

    if (!deleted) {
      return null;
    }

    // If deleted method was default, promote next available mandate
    if (deleted.isDefault) {
      const [replacement] = await tx
        .select({ id: billingPaymentMethods.id })
        .from(billingPaymentMethods)
        .where(eq(billingPaymentMethods.tenantId, tenantId))
        .orderBy(desc(billingPaymentMethods.id))
        .limit(1);

      if (replacement) {
        await tx
          .update(billingPaymentMethods)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(
            and(
              eq(billingPaymentMethods.id, replacement.id),
              eq(billingPaymentMethods.tenantId, tenantId)
            )
          );
      }

      await tx
        .update(tenantSubscriptions)
        .set({ paymentMethodId: replacement?.id ?? null, updatedAt: new Date() })
        .where(eq(tenantSubscriptions.tenantId, tenantId));
    }

    return deleted;
  });
};

export const setDefaultPaymentMethodTransaction = async (
  tenantId: number,
  methodId: number
) => {
  return await db.transaction(async (tx) => {
    // 1. Verify target mandate belongs to tenant BEFORE clearing defaults
    const [target] = await tx
      .select({ id: billingPaymentMethods.id })
      .from(billingPaymentMethods)
      .where(
        and(
          eq(billingPaymentMethods.id, methodId),
          eq(billingPaymentMethods.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!target) {
      return null;
    }

    await tx
      .update(billingPaymentMethods)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(billingPaymentMethods.tenantId, tenantId));

    const [updated] = await tx
      .update(billingPaymentMethods)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(
        and(
          eq(billingPaymentMethods.id, methodId),
          eq(billingPaymentMethods.tenantId, tenantId)
        )
      )
      .returning({
        id: billingPaymentMethods.id,
        type: billingPaymentMethods.type,
        provider: billingPaymentMethods.provider,
        accountMask: billingPaymentMethods.accountMask,
        brandOrBank: billingPaymentMethods.brandOrBank,
        expiryMonth: billingPaymentMethods.expiryMonth,
        expiryYear: billingPaymentMethods.expiryYear,
        isDefault: billingPaymentMethods.isDefault,
      });

    await tx
      .update(tenantSubscriptions)
      .set({ paymentMethodId: methodId, updatedAt: new Date() })
      .where(eq(tenantSubscriptions.tenantId, tenantId));

    return updated;
  });
};

export const settleInvoiceTransaction = async (
  tenantId: number,
  input: SettleInvoiceInput
) => {
  return await db.transaction(async (tx) => {
    const [invoice] = await tx
      .select()
      .from(billingInvoices)
      .where(
        and(
          eq(billingInvoices.id, input.invoiceId),
          eq(billingInvoices.tenantId, tenantId)
        )
      )
      .for('update')
      .limit(1);

    if (!invoice) {
      return null;
    }

    if (invoice.status === 'PAID') {
      throw new Error('This invoice has already been settled.');
    }
    if (invoice.status === 'VOID') {
      throw new Error('Cannot settle a voided invoice.');
    }

    let resolvedMethodType = invoice.paymentMethodType ?? 'MANUAL_SETTLEMENT';

    if (input.paymentMethodId) {
      const [pm] = await tx
        .select({ id: billingPaymentMethods.id, type: billingPaymentMethods.type })
        .from(billingPaymentMethods)
        .where(
          and(
            eq(billingPaymentMethods.id, input.paymentMethodId),
            eq(billingPaymentMethods.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!pm) {
        throw new Error('Selected payment mandate does not exist or belongs to another tenant.');
      }
      resolvedMethodType = pm.type;
    }

    const now = new Date();
    const [settled] = await tx
      .update(billingInvoices)
      .set({
        status: 'PAID',
        paidAt: now,
        paymentMethodType: resolvedMethodType,
        externalTransactionRef:
          input.manualReference || `SETTLE-${Date.now().toString().slice(-6)}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(billingInvoices.id, input.invoiceId),
          eq(billingInvoices.tenantId, tenantId)
        )
      )
      .returning();

    // Ensure subscription & tenant status reflect active standing
    if (invoice.subscriptionId) {
      await tx
        .update(tenantSubscriptions)
        .set({ status: 'ACTIVE', updatedAt: now })
        .where(
          and(
            eq(tenantSubscriptions.id, invoice.subscriptionId),
            eq(tenantSubscriptions.tenantId, tenantId)
          )
        );

      await tx
        .update(tenants)
        .set({ subscriptionStatus: 'ACTIVE', updatedAt: now })
        .where(eq(tenants.id, tenantId));
    }

    return settled;
  });
};