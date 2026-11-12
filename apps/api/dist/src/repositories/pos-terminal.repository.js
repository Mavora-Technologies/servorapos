"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePosPromoCode = exports.searchPosCustomersWithLoyalty = exports.getPosTerminalContext = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getPosTerminalContext = async (tenantId, userId, requestedBranchId) => {
    // 1. Fetch Authorized Tenant Branches (via userBranchMemberships or all active tenant branches for Admins)
    const accessibleBranches = await db_1.db
        .select({
        id: schema_1.branches.id,
        name: schema_1.branches.name,
        code: schema_1.branches.code,
        address: schema_1.branches.address,
        phone: schema_1.branches.phone,
        kraPin: schema_1.branches.kraPin,
        etimsBranchId: schema_1.branches.etimsBranchId,
        etimsDeviceSerial: schema_1.branches.etimsDeviceSerial,
        receiptFooter: schema_1.branches.receiptFooter,
        isMainBranch: schema_1.branches.isMainBranch,
    })
        .from(schema_1.branches)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.branches.isMainBranch), (0, drizzle_orm_1.asc)(schema_1.branches.name));
    const activeBranch = accessibleBranches.find((b) => b.id === requestedBranchId) ||
        accessibleBranches[0] ||
        null;
    const branchCondition = activeBranch
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.branchId, activeBranch.id), (0, drizzle_orm_1.isNull)(schema_1.cashDrawers.branchId))
        : undefined;
    const shiftBranchCondition = activeBranch ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, activeBranch.id) : undefined;
    // 2. Parallel Fetch: Branch Drawers, Active Cashier Shift, Today's Custodian Assignment, Active Rewards & 86'd Items
    const todayStr = new Date().toISOString().split('T')[0];
    const [branchDrawers, [activeShift], [custodianAssignment], activeRewards, unavailableItems,] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.cashDrawers.id,
            drawerCode: schema_1.cashDrawers.drawerCode,
            name: schema_1.cashDrawers.name,
            status: schema_1.cashDrawers.status,
            currentBalance: schema_1.cashDrawers.currentBalance,
        })
            .from(schema_1.cashDrawers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId), branchCondition))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.cashDrawers.drawerCode)),
        db_1.db
            .select({
            id: schema_1.cashierShifts.id,
            branchId: schema_1.cashierShifts.branchId,
            openingFloat: schema_1.cashierShifts.openingFloat,
            expectedCash: schema_1.cashierShifts.expectedCash,
            status: schema_1.cashierShifts.status,
            openedAt: schema_1.cashierShifts.openedAt,
        })
            .from(schema_1.cashierShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, userId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'OPEN'), shiftBranchCondition))
            .limit(1),
        db_1.db
            .select({
            id: schema_1.cashierAssignments.id,
            cashDrawerId: schema_1.cashierAssignments.cashDrawerId,
            shiftType: schema_1.cashierAssignments.shiftType,
            allocatedFloat: schema_1.cashierAssignments.allocatedFloat,
            maxCashLimit: schema_1.cashierAssignments.maxCashLimit,
            allowRefunds: schema_1.cashierAssignments.allowRefunds,
            allowDrawerPop: schema_1.cashierAssignments.allowDrawerPop,
            allowManualDiscount: schema_1.cashierAssignments.allowManualDiscount,
            maxDiscountPercent: schema_1.cashierAssignments.maxDiscountPercent,
        })
            .from(schema_1.cashierAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.userId, userId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.assignmentDate, todayStr)))
            .limit(1),
        db_1.db
            .select({
            id: schema_1.loyaltyRewardsCatalog.id,
            name: schema_1.loyaltyRewardsCatalog.name,
            pointsCost: schema_1.loyaltyRewardsCatalog.pointsCost,
            rewardType: schema_1.loyaltyRewardsCatalog.rewardType,
            rewardValue: schema_1.loyaltyRewardsCatalog.rewardValue,
            minTierId: schema_1.loyaltyRewardsCatalog.minTierId,
        })
            .from(schema_1.loyaltyRewardsCatalog)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.isActive, true)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.loyaltyRewardsCatalog.pointsCost)),
        activeBranch
            ? db_1.db
                .select({
                menuItemId: schema_1.menuItemAvailability.menuItemId,
                is86ed: schema_1.menuItemAvailability.is86ed,
                remainingCount: schema_1.menuItemAvailability.remainingCount,
            })
                .from(schema_1.menuItemAvailability)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.branchId, activeBranch.id)))
            : Promise.resolve([]),
    ]);
    return {
        branches: accessibleBranches,
        activeBranch,
        drawers: branchDrawers.map((d) => ({
            ...d,
            currentBalance: Number(d.currentBalance),
        })),
        activeShift: activeShift
            ? {
                ...activeShift,
                openingFloat: Number(activeShift.openingFloat),
                expectedCash: Number(activeShift.expectedCash),
            }
            : null,
        custodianGuardrails: custodianAssignment
            ? {
                ...custodianAssignment,
                allocatedFloat: Number(custodianAssignment.allocatedFloat),
                maxCashLimit: Number(custodianAssignment.maxCashLimit),
            }
            : null,
        loyaltyRewards: activeRewards.map((r) => ({
            ...r,
            rewardValue: Number(r.rewardValue),
        })),
        itemAvailability: unavailableItems,
    };
};
exports.getPosTerminalContext = getPosTerminalContext;
const searchPosCustomersWithLoyalty = async (tenantId, search) => {
    const rows = await db_1.db
        .select({
        id: schema_1.customers.id,
        name: schema_1.customers.name,
        phone: schema_1.customers.phone,
        email: schema_1.customers.email,
        kraPin: schema_1.customers.kraPin,
        companyName: schema_1.customers.companyName,
        customerType: schema_1.customers.customerType,
        totalSpent: schema_1.customers.totalSpent,
        ordersCount: schema_1.customers.ordersCount,
        currentPoints: (0, drizzle_orm_1.sql) `coalesce(${schema_1.customerLoyaltyProfiles.currentPoints}, ${schema_1.customers.loyaltyPoints}, 0)`,
        tierId: schema_1.customerLoyaltyProfiles.tierId,
        tierName: schema_1.loyaltyTiers.name,
        earningMultiplier: schema_1.loyaltyTiers.earningMultiplier,
    })
        .from(schema_1.customers)
        .leftJoin(schema_1.customerLoyaltyProfiles, (0, drizzle_orm_1.eq)(schema_1.customers.id, schema_1.customerLoyaltyProfiles.customerId))
        .leftJoin(schema_1.loyaltyTiers, (0, drizzle_orm_1.eq)(schema_1.customerLoyaltyProfiles.tierId, schema_1.loyaltyTiers.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.customers.isActive, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.customers.name, `%${search}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.phone, `%${search}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.kraPin, `%${search}%`))))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.customers.totalSpent))
        .limit(10);
    return rows.map((r) => ({
        ...r,
        totalSpent: Number(r.totalSpent),
        currentPoints: Number(r.currentPoints),
        tierName: r.tierName || 'Base Member',
        earningMultiplier: r.earningMultiplier ? Number(r.earningMultiplier) : 1.0,
    }));
};
exports.searchPosCustomersWithLoyalty = searchPosCustomersWithLoyalty;
const validatePosPromoCode = async (tenantId, code, subtotalKes) => {
    const [promo] = await db_1.db
        .select()
        .from(schema_1.promotionalDiscounts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.promotionalDiscounts.tenantId, tenantId), (0, drizzle_orm_1.ilike)(schema_1.promotionalDiscounts.code, code.trim()), (0, drizzle_orm_1.eq)(schema_1.promotionalDiscounts.isActive, true)))
        .limit(1);
    if (!promo) {
        throw new Error('Invalid or inactive promotional code.');
    }
    const now = new Date();
    if (promo.startDate && new Date(promo.startDate) > now) {
        throw new Error('This promotional code is not yet active.');
    }
    if (promo.expiresAt && new Date(promo.expiresAt) < now) {
        throw new Error('This promotional code has expired.');
    }
    if (promo.currentUsageCount >= promo.maxUsageCount) {
        throw new Error('Maximum redemption limit reached for this promo code.');
    }
    const minSubtotal = Number(promo.minOrderSubtotalKes);
    if (subtotalKes < minSubtotal) {
        throw new Error(`Minimum order subtotal of KES ${minSubtotal.toLocaleString()} required.`);
    }
    let calculatedDiscountKes = 0;
    const val = Number(promo.discountValue);
    if (promo.discountType === 'PERCENTAGE') {
        calculatedDiscountKes = subtotalKes * (val / 100);
        if (promo.maxDiscountCapKes) {
            calculatedDiscountKes = Math.min(calculatedDiscountKes, Number(promo.maxDiscountCapKes));
        }
    }
    else {
        calculatedDiscountKes = Math.min(subtotalKes, val);
    }
    return {
        id: promo.id,
        code: promo.code,
        discountType: promo.discountType,
        discountValue: val,
        calculatedDiscountKes: Math.round(calculatedDiscountKes * 100) / 100,
    };
};
exports.validatePosPromoCode = validatePosPromoCode;
