import { eq, and, desc, asc, sql, or, ilike, gte, isNull, lte } from 'drizzle-orm';
import { db } from '../config/db';
import {
    branches,
    userBranchMemberships,
    cashDrawers,
    cashierShifts,
    cashierAssignments,
    customers,
    customerLoyaltyProfiles,
    loyaltyTiers,
    loyaltyRewardsCatalog,
    promotionalDiscounts,
    menuItemAvailability,
} from '../config/schema';

export const getPosTerminalContext = async (
    tenantId: number,
    userId: number,
    requestedBranchId?: number
) => {
    // 1. Fetch Authorized Tenant Branches (via userBranchMemberships or all active tenant branches for Admins)
    const accessibleBranches = await db
        .select({
            id: branches.id,
            name: branches.name,
            code: branches.code,
            address: branches.address,
            phone: branches.phone,
            kraPin: branches.kraPin,
            etimsBranchId: branches.etimsBranchId,
            etimsDeviceSerial: branches.etimsDeviceSerial,
            receiptFooter: branches.receiptFooter,
            isMainBranch: branches.isMainBranch,
        })
        .from(branches)
        .where(and(eq(branches.tenantId, tenantId), eq(branches.isActive, true)))
        .orderBy(desc(branches.isMainBranch), asc(branches.name));

    const activeBranch =
        accessibleBranches.find((b) => b.id === requestedBranchId) ||
        accessibleBranches[0] ||
        null;

    const branchCondition = activeBranch
        ? or(eq(cashDrawers.branchId, activeBranch.id), isNull(cashDrawers.branchId))
        : undefined;
    const shiftBranchCondition = activeBranch ? eq(cashierShifts.branchId, activeBranch.id) : undefined;

    // 2. Parallel Fetch: Branch Drawers, Active Cashier Shift, Today's Custodian Assignment, Active Rewards & 86'd Items
    const todayStr = new Date().toISOString().split('T')[0];

    const [
        branchDrawers,
        [activeShift],
        [custodianAssignment],
        activeRewards,
        unavailableItems,
    ] = await Promise.all([
        db
            .select({
                id: cashDrawers.id,
                drawerCode: cashDrawers.drawerCode,
                name: cashDrawers.name,
                status: cashDrawers.status,
                currentBalance: cashDrawers.currentBalance,
            })
            .from(cashDrawers)
            .where(and(eq(cashDrawers.tenantId, tenantId), branchCondition))
            .orderBy(asc(cashDrawers.drawerCode)),

        db
            .select({
                id: cashierShifts.id,
                branchId: cashierShifts.branchId,
                openingFloat: cashierShifts.openingFloat,
                expectedCash: cashierShifts.expectedCash,
                status: cashierShifts.status,
                openedAt: cashierShifts.openedAt,
            })
            .from(cashierShifts)
            .where(
                and(
                    eq(cashierShifts.tenantId, tenantId),
                    eq(cashierShifts.cashierId, userId),
                    eq(cashierShifts.status, 'OPEN'),
                    shiftBranchCondition
                )
            )
            .limit(1),

        db
            .select({
                id: cashierAssignments.id,
                cashDrawerId: cashierAssignments.cashDrawerId,
                shiftType: cashierAssignments.shiftType,
                allocatedFloat: cashierAssignments.allocatedFloat,
                maxCashLimit: cashierAssignments.maxCashLimit,
                allowRefunds: cashierAssignments.allowRefunds,
                allowDrawerPop: cashierAssignments.allowDrawerPop,
                allowManualDiscount: cashierAssignments.allowManualDiscount,
                maxDiscountPercent: cashierAssignments.maxDiscountPercent,
            })
            .from(cashierAssignments)
            .where(
                and(
                    eq(cashierAssignments.tenantId, tenantId),
                    eq(cashierAssignments.userId, userId),
                    eq(cashierAssignments.assignmentDate, todayStr)
                )
            )
            .limit(1),

        db
            .select({
                id: loyaltyRewardsCatalog.id,
                name: loyaltyRewardsCatalog.name,
                pointsCost: loyaltyRewardsCatalog.pointsCost,
                rewardType: loyaltyRewardsCatalog.rewardType,
                rewardValue: loyaltyRewardsCatalog.rewardValue,
                minTierId: loyaltyRewardsCatalog.minTierId,
            })
            .from(loyaltyRewardsCatalog)
            .where(and(eq(loyaltyRewardsCatalog.tenantId, tenantId), eq(loyaltyRewardsCatalog.isActive, true)))
            .orderBy(asc(loyaltyRewardsCatalog.pointsCost)),

        activeBranch
            ? db
                .select({
                    menuItemId: menuItemAvailability.menuItemId,
                    is86ed: menuItemAvailability.is86ed,
                    remainingCount: menuItemAvailability.remainingCount,
                })
                .from(menuItemAvailability)
                .where(
                    and(
                        eq(menuItemAvailability.tenantId, tenantId),
                        eq(menuItemAvailability.branchId, activeBranch.id)
                    )
                )
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

export const searchPosCustomersWithLoyalty = async (tenantId: number, search: string) => {
    const rows = await db
        .select({
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            email: customers.email,
            kraPin: customers.kraPin,
            companyName: customers.companyName,
            customerType: customers.customerType,
            totalSpent: customers.totalSpent,
            ordersCount: customers.ordersCount,
            currentPoints: sql<number>`coalesce(${customerLoyaltyProfiles.currentPoints}, ${customers.loyaltyPoints}, 0)`,
            tierId: customerLoyaltyProfiles.tierId,
            tierName: loyaltyTiers.name,
            earningMultiplier: loyaltyTiers.earningMultiplier,
        })
        .from(customers)
        .leftJoin(customerLoyaltyProfiles, eq(customers.id, customerLoyaltyProfiles.customerId))
        .leftJoin(loyaltyTiers, eq(customerLoyaltyProfiles.tierId, loyaltyTiers.id))
        .where(
            and(
                eq(customers.tenantId, tenantId),
                eq(customers.isActive, true),
                or(
                    ilike(customers.name, `%${search}%`),
                    ilike(customers.phone, `%${search}%`),
                    ilike(customers.kraPin, `%${search}%`)
                )
            )
        )
        .orderBy(desc(customers.totalSpent))
        .limit(10);

    return rows.map((r) => ({
        ...r,
        totalSpent: Number(r.totalSpent),
        currentPoints: Number(r.currentPoints),
        tierName: r.tierName || 'Base Member',
        earningMultiplier: r.earningMultiplier ? Number(r.earningMultiplier) : 1.0,
    }));
};

export const validatePosPromoCode = async (
    tenantId: number,
    code: string,
    subtotalKes: number
) => {
    const [promo] = await db
        .select()
        .from(promotionalDiscounts)
        .where(
            and(
                eq(promotionalDiscounts.tenantId, tenantId),
                ilike(promotionalDiscounts.code, code.trim()),
                eq(promotionalDiscounts.isActive, true)
            )
        )
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
    } else {
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