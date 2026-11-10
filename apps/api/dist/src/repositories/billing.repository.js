"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settleInvoice = exports.setDefaultPaymentMethod = exports.deletePaymentMethod = exports.addPaymentMethod = exports.listTenantInvoices = exports.updateTenantSubscription = exports.getBillingOverview = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getBillingOverview = async (tenantId) => {
    // Query available published plans
    const availablePlans = await db_1.db
        .select()
        .from(schema_1.subscriptionPlans)
        .where((0, drizzle_orm_1.eq)(schema_1.subscriptionPlans.isActive, true))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.subscriptionPlans.basePrice));
    // Query or initialize current tenant subscription
    let [subscription] = await db_1.db
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
        createdAt: schema_1.tenantSubscriptions.createdAt,
    })
        .from(schema_1.tenantSubscriptions)
        .innerJoin(schema_1.subscriptionPlans, (0, drizzle_orm_1.eq)(schema_1.tenantSubscriptions.planId, schema_1.subscriptionPlans.id))
        .where((0, drizzle_orm_1.eq)(schema_1.tenantSubscriptions.tenantId, tenantId))
        .limit(1);
    // If no subscription record exists, establish dynamic baseline link
    if (!subscription && availablePlans.length > 0) {
        const defaultPlan = availablePlans[0];
        const periodStart = new Date();
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const [createdSub] = await db_1.db
            .insert(schema_1.tenantSubscriptions)
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
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true))),
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)),
    ]);
    const activeSeatsUsed = Number(userCountResult[0]?.count || 0);
    const activeBranchesUsed = Number(branchCountResult[0]?.count || 0);
    // Payment methods on file
    const paymentMethods = await db_1.db
        .select()
        .from(schema_1.billingPaymentMethods)
        .where((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.billingPaymentMethods.isDefault), (0, drizzle_orm_1.desc)(schema_1.billingPaymentMethods.id));
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
exports.getBillingOverview = getBillingOverview;
const updateTenantSubscription = async (tenantId, input) => {
    const [selectedPlan] = await db_1.db
        .select()
        .from(schema_1.subscriptionPlans)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.subscriptionPlans.id, input.planId), (0, drizzle_orm_1.eq)(schema_1.subscriptionPlans.isActive, true)))
        .limit(1);
    if (!selectedPlan) {
        throw new Error('Selected enterprise subscription tier does not exist.');
    }
    const [existing] = await db_1.db
        .select({ id: schema_1.tenantSubscriptions.id })
        .from(schema_1.tenantSubscriptions)
        .where((0, drizzle_orm_1.eq)(schema_1.tenantSubscriptions.tenantId, tenantId))
        .limit(1);
    if (existing) {
        const [updated] = await db_1.db
            .update(schema_1.tenantSubscriptions)
            .set({
            planId: input.planId,
            seatAllocation: input.seatAllocation,
            branchAllocation: input.branchAllocation,
            autoRenew: input.autoRenew,
            status: 'ACTIVE',
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.tenantSubscriptions.tenantId, tenantId))
            .returning();
        return updated;
    }
    const [created] = await db_1.db
        .insert(schema_1.tenantSubscriptions)
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
exports.updateTenantSubscription = updateTenantSubscription;
const listTenantInvoices = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.billingInvoices.tenantId, tenantId),
        query.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.billingInvoices.status, query.status) : undefined,
    ].filter(Boolean);
    const [countResult, invoices] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
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
exports.listTenantInvoices = listTenantInvoices;
const addPaymentMethod = async (tenantId, input) => {
    if (input.isDefault) {
        await db_1.db
            .update(schema_1.billingPaymentMethods)
            .set({ isDefault: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId));
    }
    const [created] = await db_1.db
        .insert(schema_1.billingPaymentMethods)
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
exports.addPaymentMethod = addPaymentMethod;
const deletePaymentMethod = async (tenantId, methodId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.billingPaymentMethods)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.id, methodId), (0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId)))
        .returning();
    if (!deleted) {
        throw new Error('Payment method mandate record not found.');
    }
    return deleted;
};
exports.deletePaymentMethod = deletePaymentMethod;
const setDefaultPaymentMethod = async (tenantId, methodId) => {
    await db_1.db
        .update(schema_1.billingPaymentMethods)
        .set({ isDefault: false, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId));
    const [updated] = await db_1.db
        .update(schema_1.billingPaymentMethods)
        .set({ isDefault: true, updatedAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.id, methodId), (0, drizzle_orm_1.eq)(schema_1.billingPaymentMethods.tenantId, tenantId)))
        .returning();
    return updated;
};
exports.setDefaultPaymentMethod = setDefaultPaymentMethod;
const settleInvoice = async (tenantId, input) => {
    const [invoice] = await db_1.db
        .select()
        .from(schema_1.billingInvoices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.billingInvoices.id, input.invoiceId), (0, drizzle_orm_1.eq)(schema_1.billingInvoices.tenantId, tenantId)))
        .limit(1);
    if (!invoice) {
        throw new Error('Invoice not found.');
    }
    if (invoice.status === 'PAID') {
        throw new Error('Invoice has already been settled.');
    }
    const [settled] = await db_1.db
        .update(schema_1.billingInvoices)
        .set({
        status: 'PAID',
        paidAt: new Date(),
        externalTransactionRef: input.manualReference || `SETTLE-${Date.now().toString().slice(-6)}`,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.billingInvoices.id, input.invoiceId))
        .returning();
    return settled;
};
exports.settleInvoice = settleInvoice;
