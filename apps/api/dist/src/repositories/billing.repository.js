"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settleInvoiceTransaction = exports.setDefaultPaymentMethodTransaction = exports.deletePaymentMethodTransaction = exports.addPaymentMethodTransaction = exports.listTenantInvoices = exports.upsertTenantSubscriptionTransaction = exports.findBillingOverviewByTenant = void 0;
// apps/api/src/repositories/billing.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
function getCycleDurationDays(cycle) {
    switch (cycle.toUpperCase()) {
        case 'ANNUALLY':
            return 365;
        case 'BIANNUAL':
            return 180;
        default:
            return 30;
    }
}
const findBillingOverviewByTenant = async (tenantId) => {
    const [availablePlans, [subscription], [userCountRow], [branchCountRow], paymentMethods, [tenantProfile],] = await Promise.all([
        db_1.db
            .select()
            .from(schema_1.subscriptionPlans)
            .where((0, drizzle_orm_1.eq)(schema_1.subscriptionPlans.isActive, true))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.subscriptionPlans.basePrice)),
        db_1.db
            .select({
            id: schema_1.tenantSubscriptions.id,
            tenantId: schema_1.tenantSubscriptions.tenantId,
            planId: schema_1.tenantSubscriptions.planId,
            planCode: schema_1.subscriptionPlans.code,
            planName: schema_1.subscriptionPlans.name,
            planDescription: schema_1.subscriptionPlans.description,
            billingCycle: schema_1.subscriptionPlans.billingCycle,
            basePrice: schema_1.subscriptionPlans.basePrice,
            currency: schema_1.subscriptionPlans.currency,
            perUserPrice: schema_1.subscriptionPlans.perUserPrice,
            perBranchPrice: schema_1.subscriptionPlans.perBranchPrice,
            includedUsers: schema_1.subscriptionPlans.includedUsers,
            includedBranches: schema_1.subscriptionPlans.includedBranches,
            features: schema_1.subscriptionPlans.features,
            status: schema_1.tenantSubscriptions.status,
            currentPeriodStart: schema_1.tenantSubscriptions.currentPeriodStart,
            currentPeriodEnd: schema_1.tenantSubscriptions.currentPeriodEnd,
            seatAllocation: schema_1.tenantSubscriptions.seatAllocation,
            branchAllocation: schema_1.tenantSubscriptions.branchAllocation,
            paymentMethodId: schema_1.tenantSubscriptions.paymentMethodId,
            autoRenew: schema_1.tenantSubscriptions.autoRenew,
            cancelAtPeriodEnd: schema_1.tenantSubscriptions.cancelAtPeriodEnd,
            canceledAt: schema_1.tenantSubscriptions.canceledAt,
            createdAt: schema_1.tenantSubscriptions.createdAt,
        })
            .from(schema_1.tenantSubscriptions)
            .innerJoin(schema_1.subscriptionPlans, (0, drizzle_orm_1.eq)(schema_1.tenantSubscriptions.planId, schema_1.subscriptionPlans.id))
            .where((0, drizzle_orm_1.eq)(schema_1.tenantSubscriptions.tenantId, tenantId))
            .limit(1),
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true))),
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true))),
        // Never project secret mandate `token` to API responses
        db_1.db
            .select({
            id: schema_1.billingPaymentMethods.id,
            type: schema_1.billingPaymentMethods.type,
            provider: schema_1.billingPaymentMethods.provider,
            accountMask: schema_1.billingPaymentMethods.accountMask,
            brandOrBank: schema_1.billingPaymentMethods.brandOrBank,
            expiryMonth: schema_1.billingPaymentMethods.expiryMonth,
            expiryYear: schema_1.billingPaymentMethods.expiryYear,
            isDefault: schema_1.billingPaymentMethods.isDefault,
            createdAt: schema_1.billingPaymentMethods.createdAt,
        })
            .from(schema_1.billingPaymentMethods)
            .where((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.billingPaymentMethods.isDefault), (0, drizzle_orm_1.desc)(schema_1.billingPaymentMethods.id)),
        db_1.db
            .select({
            businessName: schema_1.tenants.businessName,
            legalName: schema_1.tenants.legalName,
            kraPin: schema_1.tenants.kraPin,
            currency: schema_1.tenants.currency,
        })
            .from(schema_1.tenants)
            .where((0, drizzle_orm_1.eq)(schema_1.tenants.id, tenantId))
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
exports.findBillingOverviewByTenant = findBillingOverviewByTenant;
const upsertTenantSubscriptionTransaction = async (tenantId, input) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Validate target plan exists and is active
        const [selectedPlan] = await tx
            .select()
            .from(schema_1.subscriptionPlans)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.subscriptionPlans.id, input.planId), (0, drizzle_orm_1.eq)(schema_1.subscriptionPlans.isActive, true)))
            .limit(1);
        if (!selectedPlan) {
            throw new Error('Selected subscription plan does not exist or is inactive.');
        }
        // 2. Enforce plan minimums and live headcount/branch utilization guardrails
        const [[userCountRow], [branchCountRow]] = await Promise.all([
            tx
                .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true))),
            tx
                .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(schema_1.branches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true))),
        ]);
        const activeUsers = Number(userCountRow?.count ?? 0);
        const activeBranches = Number(branchCountRow?.count ?? 0);
        if (input.seatAllocation < selectedPlan.includedUsers) {
            throw new Error(`Seat allocation cannot be below the ${selectedPlan.includedUsers} seats included in ${selectedPlan.name}.`);
        }
        if (input.branchAllocation < selectedPlan.includedBranches) {
            throw new Error(`Branch allocation cannot be below the ${selectedPlan.includedBranches} branch(es) included in ${selectedPlan.name}.`);
        }
        if (input.seatAllocation < activeUsers) {
            throw new Error(`Cannot reduce seat allocation to ${input.seatAllocation}: you currently have ${activeUsers} active staff accounts.`);
        }
        if (input.branchAllocation < activeBranches) {
            throw new Error(`Cannot reduce branch allocation to ${input.branchAllocation}: you currently have ${activeBranches} active branch(es).`);
        }
        // 3. Upsert tenant subscription
        const [existing] = await tx
            .select()
            .from(schema_1.tenantSubscriptions)
            .where((0, drizzle_orm_1.eq)(schema_1.tenantSubscriptions.tenantId, tenantId))
            .for('update')
            .limit(1);
        const now = new Date();
        const cycleDays = getCycleDurationDays(selectedPlan.billingCycle);
        const periodEnd = new Date(now.getTime() + cycleDays * 24 * 60 * 60 * 1000);
        const hasBillingChange = !existing ||
            existing.planId !== input.planId ||
            existing.seatAllocation !== input.seatAllocation ||
            existing.branchAllocation !== input.branchAllocation;
        let savedSub;
        if (existing) {
            const [updated] = await tx
                .update(schema_1.tenantSubscriptions)
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
                .where((0, drizzle_orm_1.eq)(schema_1.tenantSubscriptions.id, existing.id))
                .returning();
            savedSub = updated;
        }
        else {
            const [defaultPm] = await tx
                .select({ id: schema_1.billingPaymentMethods.id })
                .from(schema_1.billingPaymentMethods)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.isDefault, true)))
                .limit(1);
            const [created] = await tx
                .insert(schema_1.tenantSubscriptions)
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
            .update(schema_1.tenants)
            .set({
            subscriptionPlan: selectedPlan.code,
            subscriptionStatus: 'ACTIVE',
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.tenants.id, tenantId));
        // 5. Issue a statutory KRA 16% VAT billing invoice when activating or changing tier/quotas
        let issuedInvoice = null;
        if (hasBillingChange) {
            const basePrice = parseFloat(selectedPlan.basePrice) || 0;
            const perUserPrice = parseFloat(selectedPlan.perUserPrice) || 0;
            const perBranchPrice = parseFloat(selectedPlan.perBranchPrice) || 0;
            const extraSeats = Math.max(0, input.seatAllocation - selectedPlan.includedUsers);
            const extraBranches = Math.max(0, input.branchAllocation - selectedPlan.includedBranches);
            const lineItems = [
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
                    .insert(schema_1.billingInvoices)
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
exports.upsertTenantSubscriptionTransaction = upsertTenantSubscriptionTransaction;
const listTenantInvoices = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.billingInvoices.tenantId, tenantId)];
    if (query.status !== 'ALL') {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.billingInvoices.status, query.status));
    }
    const [countResult, invoices] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.billingInvoices)
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select()
            .from(schema_1.billingInvoices)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.billingInvoices.createdAt))
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
exports.listTenantInvoices = listTenantInvoices;
const addPaymentMethodTransaction = async (tenantId, input) => {
    return await db_1.db.transaction(async (tx) => {
        const existingMethods = await tx
            .select({ id: schema_1.billingPaymentMethods.id })
            .from(schema_1.billingPaymentMethods)
            .where((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId));
        const shouldBeDefault = input.isDefault || existingMethods.length === 0;
        if (shouldBeDefault) {
            await tx
                .update(schema_1.billingPaymentMethods)
                .set({ isDefault: false, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId));
        }
        const [created] = await tx
            .insert(schema_1.billingPaymentMethods)
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
            id: schema_1.billingPaymentMethods.id,
            type: schema_1.billingPaymentMethods.type,
            provider: schema_1.billingPaymentMethods.provider,
            accountMask: schema_1.billingPaymentMethods.accountMask,
            brandOrBank: schema_1.billingPaymentMethods.brandOrBank,
            expiryMonth: schema_1.billingPaymentMethods.expiryMonth,
            expiryYear: schema_1.billingPaymentMethods.expiryYear,
            isDefault: schema_1.billingPaymentMethods.isDefault,
            createdAt: schema_1.billingPaymentMethods.createdAt,
        });
        if (shouldBeDefault) {
            await tx
                .update(schema_1.tenantSubscriptions)
                .set({ paymentMethodId: created.id, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.tenantSubscriptions.tenantId, tenantId));
        }
        return created;
    });
};
exports.addPaymentMethodTransaction = addPaymentMethodTransaction;
const deletePaymentMethodTransaction = async (tenantId, methodId) => {
    return await db_1.db.transaction(async (tx) => {
        const [deleted] = await tx
            .delete(schema_1.billingPaymentMethods)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.id, methodId), (0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId)))
            .returning({ id: schema_1.billingPaymentMethods.id, isDefault: schema_1.billingPaymentMethods.isDefault });
        if (!deleted) {
            return null;
        }
        // If deleted method was default, promote next available mandate
        if (deleted.isDefault) {
            const [replacement] = await tx
                .select({ id: schema_1.billingPaymentMethods.id })
                .from(schema_1.billingPaymentMethods)
                .where((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.billingPaymentMethods.id))
                .limit(1);
            if (replacement) {
                await tx
                    .update(schema_1.billingPaymentMethods)
                    .set({ isDefault: true, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.id, replacement.id), (0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId)));
            }
            await tx
                .update(schema_1.tenantSubscriptions)
                .set({ paymentMethodId: replacement?.id ?? null, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.tenantSubscriptions.tenantId, tenantId));
        }
        return deleted;
    });
};
exports.deletePaymentMethodTransaction = deletePaymentMethodTransaction;
const setDefaultPaymentMethodTransaction = async (tenantId, methodId) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Verify target mandate belongs to tenant BEFORE clearing defaults
        const [target] = await tx
            .select({ id: schema_1.billingPaymentMethods.id })
            .from(schema_1.billingPaymentMethods)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.id, methodId), (0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId)))
            .limit(1);
        if (!target) {
            return null;
        }
        await tx
            .update(schema_1.billingPaymentMethods)
            .set({ isDefault: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId));
        const [updated] = await tx
            .update(schema_1.billingPaymentMethods)
            .set({ isDefault: true, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.id, methodId), (0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId)))
            .returning({
            id: schema_1.billingPaymentMethods.id,
            type: schema_1.billingPaymentMethods.type,
            provider: schema_1.billingPaymentMethods.provider,
            accountMask: schema_1.billingPaymentMethods.accountMask,
            brandOrBank: schema_1.billingPaymentMethods.brandOrBank,
            expiryMonth: schema_1.billingPaymentMethods.expiryMonth,
            expiryYear: schema_1.billingPaymentMethods.expiryYear,
            isDefault: schema_1.billingPaymentMethods.isDefault,
        });
        await tx
            .update(schema_1.tenantSubscriptions)
            .set({ paymentMethodId: methodId, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.tenantSubscriptions.tenantId, tenantId));
        return updated;
    });
};
exports.setDefaultPaymentMethodTransaction = setDefaultPaymentMethodTransaction;
const settleInvoiceTransaction = async (tenantId, input) => {
    return await db_1.db.transaction(async (tx) => {
        const [invoice] = await tx
            .select()
            .from(schema_1.billingInvoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.billingInvoices.id, input.invoiceId), (0, drizzle_orm_1.eq)(schema_1.billingInvoices.tenantId, tenantId)))
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
                .select({ id: schema_1.billingPaymentMethods.id, type: schema_1.billingPaymentMethods.type })
                .from(schema_1.billingPaymentMethods)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.id, input.paymentMethodId), (0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId)))
                .limit(1);
            if (!pm) {
                throw new Error('Selected payment mandate does not exist or belongs to another tenant.');
            }
            resolvedMethodType = pm.type;
        }
        const now = new Date();
        const [settled] = await tx
            .update(schema_1.billingInvoices)
            .set({
            status: 'PAID',
            paidAt: now,
            paymentMethodType: resolvedMethodType,
            externalTransactionRef: input.manualReference || `SETTLE-${Date.now().toString().slice(-6)}`,
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.billingInvoices.id, input.invoiceId), (0, drizzle_orm_1.eq)(schema_1.billingInvoices.tenantId, tenantId)))
            .returning();
        // Ensure subscription & tenant status reflect active standing
        if (invoice.subscriptionId) {
            await tx
                .update(schema_1.tenantSubscriptions)
                .set({ status: 'ACTIVE', updatedAt: now })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tenantSubscriptions.id, invoice.subscriptionId), (0, drizzle_orm_1.eq)(schema_1.tenantSubscriptions.tenantId, tenantId)));
            await tx
                .update(schema_1.tenants)
                .set({ subscriptionStatus: 'ACTIVE', updatedAt: now })
                .where((0, drizzle_orm_1.eq)(schema_1.tenants.id, tenantId));
        }
        return settled;
    });
};
exports.settleInvoiceTransaction = settleInvoiceTransaction;
