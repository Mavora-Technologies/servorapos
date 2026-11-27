"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignStaffPosPinTransaction = exports.authenticatePosPinSwitch = exports.listBranchKioskOperators = exports.syncPostOrderStockAndAvailability = exports.validatePosPromoCode = exports.searchPosCustomersWithLoyalty = exports.deductOrderInventoryInTx = exports.validateOrderStockAvailability = exports.verifyActiveRegisterForPosSale = exports.getPosTerminalContext = void 0;
// apps/api/src/repositories/pos-terminal.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const role_service_1 = require("../services/role.service");
// In-memory failed PIN rate limiter (tenantId:branchId:target -> { count, lockedUntil })
const pinAttemptTracker = new Map();
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
const getPosTerminalContext = async (tenantId, userId, requestedBranchId, authorizedBranchIds = null) => {
    // 1. Fetch Authorized Tenant Branches (enforced via user_branch_memberships)
    const branchConditions = [(0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)];
    if (authorizedBranchIds !== null) {
        if (authorizedBranchIds.length === 0) {
            return {
                branches: [],
                activeBranch: null,
                drawers: [],
                activeShift: null,
                custodianGuardrails: null,
                loyaltyRewards: [],
                itemAvailability: [],
                kitchenStations: [],
                itemStationMap: {},
                itemModifierGroupsMap: {},
            };
        }
        branchConditions.push((0, drizzle_orm_1.inArray)(schema_1.branches.id, authorizedBranchIds));
    }
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
        .where((0, drizzle_orm_1.and)(...branchConditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.branches.isMainBranch), (0, drizzle_orm_1.asc)(schema_1.branches.name));
    const activeBranch = accessibleBranches.find((b) => b.id === requestedBranchId) ||
        accessibleBranches[0] ||
        null;
    const branchCondition = activeBranch
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.branchId, activeBranch.id), (0, drizzle_orm_1.isNull)(schema_1.cashDrawers.branchId))
        : undefined;
    const shiftBranchCondition = activeBranch
        ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, activeBranch.id)
        : undefined;
    const assignmentBranchCondition = activeBranch
        ? (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.branchId, activeBranch.id)
        : undefined;
    // 2. Parallel Fetch: Drawers, Open Drawer Sessions, User & Branch Shifts, Guardrails, Rewards, Availability, Stations, Catalog, Inventory, Recipes & Modifier Links
    const todayStr = new Date().toISOString().split('T')[0];
    const [branchDrawers, activeDrawerSessions, [userActiveShift], [branchActiveShift], [custodianAssignment], activeRewards, unavailableItems, allTenantKitchenStations, tenantCatalogRouting, tenantInventory, tenantRecipes, attachedModifierLinks,] = await Promise.all([
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
            id: schema_1.drawerSessions.id,
            drawerId: schema_1.drawerSessions.drawerId,
            cashierId: schema_1.drawerSessions.cashierId,
            status: schema_1.drawerSessions.status,
            openingFloat: schema_1.drawerSessions.openingFloat,
            expectedClosingBalance: schema_1.drawerSessions.expectedClosingBalance,
            openedAt: schema_1.drawerSessions.openedAt,
        })
            .from(schema_1.drawerSessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.drawerSessions.status} != 'CLOSED_RECONCILED'`))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.drawerSessions.openedAt)),
        db_1.db
            .select({
            id: schema_1.cashierShifts.id,
            branchId: schema_1.cashierShifts.branchId,
            cashierId: schema_1.cashierShifts.cashierId,
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
            id: schema_1.cashierShifts.id,
            branchId: schema_1.cashierShifts.branchId,
            cashierId: schema_1.cashierShifts.cashierId,
            openingFloat: schema_1.cashierShifts.openingFloat,
            expectedCash: schema_1.cashierShifts.expectedCash,
            status: schema_1.cashierShifts.status,
            openedAt: schema_1.cashierShifts.openedAt,
        })
            .from(schema_1.cashierShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'OPEN'), shiftBranchCondition))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.cashierShifts.openedAt))
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
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.userId, userId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.assignmentDate, todayStr), (0, drizzle_orm_1.inArray)(schema_1.cashierAssignments.status, ['ASSIGNED', 'ACTIVE']), assignmentBranchCondition))
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
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.branchId, activeBranch.id), (0, drizzle_orm_1.isNull)(schema_1.menuItemAvailability.branchId))))
            : Promise.resolve([]),
        db_1.db
            .select({
            id: schema_1.kitchenStations.id,
            branchId: schema_1.kitchenStations.branchId,
            name: schema_1.kitchenStations.name,
            code: schema_1.kitchenStations.code,
            stationType: schema_1.kitchenStations.stationType,
            colorHex: schema_1.kitchenStations.colorHex,
            targetPrepTimeMinutes: schema_1.kitchenStations.targetPrepTimeMinutes,
            assignedCategories: schema_1.kitchenStations.assignedCategories,
            backupStationId: schema_1.kitchenStations.backupStationId,
            isActive: schema_1.kitchenStations.isActive,
        })
            .from(schema_1.kitchenStations)
            .where((0, drizzle_orm_1.eq)(schema_1.kitchenStations.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.kitchenStations.name)),
        db_1.db
            .select({
            id: schema_1.menuItems.id,
            name: schema_1.menuItems.name,
            kitchenStation: schema_1.menuItems.kitchenStation,
            stockTrackingType: schema_1.menuItems.stockTrackingType,
            directInventoryItemId: schema_1.menuItems.directInventoryItemId,
            categoryName: schema_1.menuCategories.name,
        })
            .from(schema_1.menuItems)
            .leftJoin(schema_1.menuCategories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.categoryId, schema_1.menuCategories.id), (0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId)))
            .where((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)),
        db_1.db
            .select({
            id: schema_1.inventoryItems.id,
            name: schema_1.inventoryItems.name,
            unit: schema_1.inventoryItems.unit,
            currentStock: schema_1.inventoryItems.currentStock,
            allowNegativeStock: schema_1.inventoryItems.allowNegativeStock,
            isActive: schema_1.inventoryItems.isActive,
        })
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)),
        db_1.db
            .select({
            recipeId: schema_1.recipes.id,
            menuItemId: schema_1.recipes.menuItemId,
            yieldPortions: schema_1.recipes.yieldPortions,
        })
            .from(schema_1.recipes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.recipes.isActive, true))),
        db_1.db
            .select({
            menuItemId: schema_1.menuItemModifierGroups.menuItemId,
            groupId: schema_1.modifierGroups.id,
            groupName: schema_1.modifierGroups.name,
            description: schema_1.modifierGroups.description,
            minSelections: schema_1.modifierGroups.minSelections,
            maxSelections: schema_1.modifierGroups.maxSelections,
            isRequired: schema_1.modifierGroups.isRequired,
            sortOrder: schema_1.menuItemModifierGroups.sortOrder,
        })
            .from(schema_1.menuItemModifierGroups)
            .innerJoin(schema_1.modifierGroups, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemModifierGroups.modifierGroupId, schema_1.modifierGroups.id), (0, drizzle_orm_1.eq)(schema_1.modifierGroups.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.modifierGroups.isActive, true)))
            .where((0, drizzle_orm_1.eq)(schema_1.menuItemModifierGroups.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.menuItemModifierGroups.sortOrder), (0, drizzle_orm_1.asc)(schema_1.modifierGroups.name)),
    ]);
    // Fetch recipe ingredients & active modifier options concurrently
    const recipeIds = tenantRecipes.map((r) => r.recipeId);
    const linkedGroupIds = Array.from(new Set(attachedModifierLinks.map((l) => l.groupId)));
    const [allRecipeIngredients, activeModifierOptions] = await Promise.all([
        recipeIds.length > 0
            ? db_1.db
                .select({
                recipeId: schema_1.recipeIngredients.recipeId,
                inventoryItemId: schema_1.recipeIngredients.inventoryItemId,
                quantity: schema_1.recipeIngredients.quantity,
                unit: schema_1.recipeIngredients.unit,
                wastagePercentage: schema_1.recipeIngredients.wastagePercentage,
            })
                .from(schema_1.recipeIngredients)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.recipeIngredients.recipeId, recipeIds)))
            : Promise.resolve([]),
        linkedGroupIds.length > 0
            ? db_1.db
                .select({
                id: schema_1.modifierOptions.id,
                modifierGroupId: schema_1.modifierOptions.modifierGroupId,
                name: schema_1.modifierOptions.name,
                priceAdjustment: schema_1.modifierOptions.priceAdjustment,
                linkedInventoryItemId: schema_1.modifierOptions.linkedInventoryItemId,
                linkedQuantity: schema_1.modifierOptions.linkedQuantity,
                linkedUnit: schema_1.modifierOptions.linkedUnit,
                isDefault: schema_1.modifierOptions.isDefault,
            })
                .from(schema_1.modifierOptions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.modifierOptions.modifierGroupId, linkedGroupIds), (0, drizzle_orm_1.eq)(schema_1.modifierOptions.isAvailable, true)))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.modifierOptions.id))
            : Promise.resolve([]),
    ]);
    // Build itemModifierGroupsMap keyed by menuItemId
    const optionsByGroupId = new Map();
    for (const opt of activeModifierOptions) {
        const list = optionsByGroupId.get(opt.modifierGroupId) ?? [];
        list.push({
            id: opt.id,
            name: opt.name,
            priceAdjustment: Number(opt.priceAdjustment) || 0,
            linkedInventoryItemId: opt.linkedInventoryItemId,
            linkedQuantity: Number(opt.linkedQuantity) || 0,
            linkedUnit: opt.linkedUnit ?? null,
            isDefault: opt.isDefault,
        });
        optionsByGroupId.set(opt.modifierGroupId, list);
    }
    const itemModifierGroupsMap = {};
    for (const link of attachedModifierLinks) {
        const groupOptions = optionsByGroupId.get(link.groupId) ?? [];
        if (groupOptions.length === 0)
            continue;
        if (!itemModifierGroupsMap[link.menuItemId]) {
            itemModifierGroupsMap[link.menuItemId] = [];
        }
        itemModifierGroupsMap[link.menuItemId].push({
            id: link.groupId,
            name: link.groupName,
            description: link.description,
            minSelections: link.minSelections,
            maxSelections: link.maxSelections,
            isRequired: link.isRequired,
            options: groupOptions,
        });
    }
    // Index inventory and recipes for O(1) lookup
    const invById = new Map(tenantInventory.map((inv) => [
        inv.id,
        {
            ...inv,
            stockNum: parseFloat(inv.currentStock) || 0,
        },
    ]));
    const manualAvailByMenuId = new Map(unavailableItems.map((u) => [u.menuItemId, u]));
    const recipeByMenuId = new Map(tenantRecipes.map((r) => [
        r.menuItemId,
        {
            recipeId: r.recipeId,
            yieldPortions: parseFloat(r.yieldPortions) || 1,
        },
    ]));
    const ingredientsByRecipeId = new Map();
    for (const ing of allRecipeIngredients) {
        const list = ingredientsByRecipeId.get(ing.recipeId) ?? [];
        list.push(ing);
        ingredientsByRecipeId.set(ing.recipeId, list);
    }
    // 3. Compute Authoritative Per-Item Stock Availability (Manual 86 + Direct Stock + Recipe BOM)
    const computedAvailability = tenantCatalogRouting.map((item) => {
        const manualFlag = manualAvailByMenuId.get(item.id);
        const manual86 = manualFlag?.is86ed === true;
        const manualRemaining = manualFlag?.remainingCount ?? null;
        const requirements = [];
        let inventoryLimit = null;
        let limitingIngredientName = null;
        if (item.stockTrackingType === 'STOCKED_PRODUCT' && item.directInventoryItemId) {
            const inv = invById.get(item.directInventoryItemId);
            if (inv) {
                requirements.push({
                    inventoryItemId: inv.id,
                    inventoryItemName: inv.name,
                    requiredPerPortion: 1,
                    unit: inv.unit,
                    currentStock: inv.stockNum,
                    allowNegativeStock: inv.allowNegativeStock,
                });
                if (!inv.allowNegativeStock) {
                    inventoryLimit = Math.max(0, Math.floor(inv.stockNum));
                    limitingIngredientName = inv.name;
                }
            }
        }
        else if (item.stockTrackingType === 'RECIPE' ||
            item.stockTrackingType === 'COMPOSITE') {
            const rec = recipeByMenuId.get(item.id);
            if (rec) {
                const ings = ingredientsByRecipeId.get(rec.recipeId) ?? [];
                const yieldPortions = rec.yieldPortions > 0 ? rec.yieldPortions : 1;
                for (const ing of ings) {
                    const inv = invById.get(ing.inventoryItemId);
                    if (!inv)
                        continue;
                    const baseQty = parseFloat(ing.quantity) || 0;
                    const wastagePct = parseFloat(ing.wastagePercentage) || 0;
                    const requiredPerPortion = (baseQty * (1 + wastagePct / 100)) / yieldPortions;
                    if (requiredPerPortion <= 0)
                        continue;
                    requirements.push({
                        inventoryItemId: inv.id,
                        inventoryItemName: inv.name,
                        requiredPerPortion,
                        unit: ing.unit || inv.unit,
                        currentStock: inv.stockNum,
                        allowNegativeStock: inv.allowNegativeStock,
                    });
                    if (!inv.allowNegativeStock) {
                        const possiblePortions = Math.max(0, Math.floor(inv.stockNum / requiredPerPortion));
                        if (inventoryLimit === null || possiblePortions < inventoryLimit) {
                            inventoryLimit = possiblePortions;
                            limitingIngredientName = inv.name;
                        }
                    }
                }
            }
        }
        let maxAvailable = inventoryLimit;
        if (manualRemaining !== null) {
            maxAvailable =
                maxAvailable === null
                    ? Math.max(0, manualRemaining)
                    : Math.min(maxAvailable, Math.max(0, manualRemaining));
        }
        const isOutOfStock = manual86 || (maxAvailable !== null && maxAvailable <= 0);
        return {
            menuItemId: item.id,
            is86ed: isOutOfStock,
            remainingCount: maxAvailable,
            maxAvailable,
            stockTrackingType: item.stockTrackingType,
            limitingIngredientName,
            requirements,
        };
    });
    // 4. Prefer branch-specific stations; fall back to tenant-wide shared stations if branch has none
    const branchSpecificStations = activeBranch
        ? allTenantKitchenStations.filter((s) => s.branchId === activeBranch.id)
        : [];
    const effectiveStations = branchSpecificStations.length > 0 ? branchSpecificStations : allTenantKitchenStations;
    const stationById = new Map(allTenantKitchenStations.map((s) => [s.id, s]));
    const resolveFailoverStation = (stationObj) => {
        if (!stationObj.isActive && stationObj.backupStationId) {
            const backup = stationById.get(stationObj.backupStationId);
            if (backup && backup.isActive) {
                return {
                    stationName: backup.name,
                    stationCode: backup.code,
                    isFailover: true,
                    originalStationName: stationObj.name,
                };
            }
        }
        return {
            stationName: stationObj.name,
            stationCode: stationObj.code,
            isFailover: false,
            originalStationName: stationObj.name,
        };
    };
    // 5. Resolve default station per menu item
    const itemStationMap = {};
    for (const item of tenantCatalogRouting) {
        const catName = (item.categoryName || '').trim().toLowerCase();
        const rawItemStation = (item.kitchenStation || '').trim();
        const rawItemStationLower = rawItemStation.toLowerCase();
        const matchedByCategory = effectiveStations.find((st) => (st.assignedCategories || []).some((c) => {
            const cLow = c.trim().toLowerCase();
            return (cLow !== 'all' &&
                (cLow === catName || (rawItemStationLower !== '' && cLow === rawItemStationLower)));
        }));
        if (matchedByCategory) {
            itemStationMap[item.id] = resolveFailoverStation(matchedByCategory);
            continue;
        }
        const matchedByName = effectiveStations.find((st) => st.name.trim().toLowerCase() === rawItemStationLower ||
            st.code.trim().toLowerCase() === rawItemStationLower ||
            (st.stationType === 'BAR' &&
                (rawItemStationLower.includes('bar') || rawItemStationLower.includes('beverage'))));
        if (matchedByName) {
            itemStationMap[item.id] = resolveFailoverStation(matchedByName);
        }
        else {
            itemStationMap[item.id] = {
                stationName: rawItemStation || 'Main Kitchen',
                stationCode: null,
                isFailover: false,
                originalStationName: rawItemStation || 'Main Kitchen',
            };
        }
    }
    // 6. Map open drawer sessions & resolve branch-level active shift for shared waiter terminals
    const sessionByDrawerId = new Map();
    for (const s of activeDrawerSessions) {
        if (!sessionByDrawerId.has(s.drawerId)) {
            sessionByDrawerId.set(s.drawerId, s);
        }
    }
    const effectiveActiveShift = userActiveShift || branchActiveShift || null;
    return {
        branches: accessibleBranches,
        activeBranch,
        drawers: branchDrawers.map((d) => {
            const openSession = sessionByDrawerId.get(d.id) || null;
            return {
                ...d,
                currentBalance: Number(d.currentBalance),
                activeSessionId: openSession?.id ?? null,
                hasOpenSession: d.status === 'OPEN' && Boolean(openSession),
            };
        }),
        activeShift: effectiveActiveShift
            ? {
                id: effectiveActiveShift.id,
                branchId: effectiveActiveShift.branchId,
                openingFloat: Number(effectiveActiveShift.openingFloat),
                expectedCash: Number(effectiveActiveShift.expectedCash),
                status: effectiveActiveShift.status,
                openedAt: effectiveActiveShift.openedAt,
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
        itemAvailability: computedAvailability,
        kitchenStations: effectiveStations,
        itemStationMap,
        itemModifierGroupsMap,
    };
};
exports.getPosTerminalContext = getPosTerminalContext;
/**
 * Verifies that an active cash drawer session and open cashier shift exist
 * for the target branch/register before allowing a POS checkout to commit.
 * Supports shared waiter terminals operating under a supervisor/cashier's open float.
 */
const verifyActiveRegisterForPosSale = async (tenantId, branchId, cashDrawerId) => {
    const drawerFilter = cashDrawerId
        ? (0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, cashDrawerId)
        : branchId
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.cashDrawers.branchId))
            : undefined;
    const shiftBranchFilter = branchId ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, branchId) : undefined;
    const [openDrawers, [openShift]] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.cashDrawers.id,
            name: schema_1.cashDrawers.name,
            status: schema_1.cashDrawers.status,
            sessionId: schema_1.drawerSessions.id,
        })
            .from(schema_1.cashDrawers)
            .leftJoin(schema_1.drawerSessions, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.drawerId, schema_1.cashDrawers.id), (0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.drawerSessions.status} != 'CLOSED_RECONCILED'`))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashDrawers.status, 'OPEN'), drawerFilter))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.drawerSessions.openedAt))
            .limit(1),
        db_1.db
            .select({
            id: schema_1.cashierShifts.id,
        })
            .from(schema_1.cashierShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'OPEN'), shiftBranchFilter))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.cashierShifts.openedAt))
            .limit(1),
    ]);
    const activeDrawer = openDrawers[0] || null;
    if (!activeDrawer || !openShift) {
        return {
            isReady: false,
            drawerId: activeDrawer?.id ?? null,
            drawerName: activeDrawer?.name ?? null,
            drawerSessionId: activeDrawer?.sessionId ?? null,
            cashierShiftId: openShift?.id ?? null,
            reason: !activeDrawer
                ? 'Cannot complete POS sale: no open cash drawer register is active for this outlet. A supervisor or cashier must open a shift float.'
                : 'Cannot complete POS sale: no open cashier shift exists for this outlet. A supervisor or cashier must open a shift float.',
        };
    }
    return {
        isReady: true,
        drawerId: activeDrawer.id,
        drawerName: activeDrawer.name,
        drawerSessionId: activeDrawer.sessionId ?? null,
        cashierShiftId: openShift.id,
    };
};
exports.verifyActiveRegisterForPosSale = verifyActiveRegisterForPosSale;
/**
 * Authoritative live database stock validation for a POS order cart.
 * Aggregates shared raw materials across all cart lines and checks manual 86'd caps.
 */
const validateOrderStockAvailability = async (tenantId, requestedItems, branchId) => {
    const uniqueMenuIds = Array.from(new Set(requestedItems.map((i) => i.menuItemId)));
    if (uniqueMenuIds.length === 0) {
        return { valid: true, shortages: [] };
    }
    const qtyByMenuItem = new Map();
    for (const line of requestedItems) {
        qtyByMenuItem.set(line.menuItemId, (qtyByMenuItem.get(line.menuItemId) ?? 0) + line.quantity);
    }
    const [menuRows, availRows, recipeRows] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.menuItems.id,
            name: schema_1.menuItems.name,
            stockTrackingType: schema_1.menuItems.stockTrackingType,
            directInventoryItemId: schema_1.menuItems.directInventoryItemId,
            isAvailable: schema_1.menuItems.isAvailable,
        })
            .from(schema_1.menuItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.menuItems.id, uniqueMenuIds))),
        branchId
            ? db_1.db
                .select({
                menuItemId: schema_1.menuItemAvailability.menuItemId,
                is86ed: schema_1.menuItemAvailability.is86ed,
                remainingCount: schema_1.menuItemAvailability.remainingCount,
            })
                .from(schema_1.menuItemAvailability)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.menuItemAvailability.menuItemId, uniqueMenuIds), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.menuItemAvailability.branchId))))
            : db_1.db
                .select({
                menuItemId: schema_1.menuItemAvailability.menuItemId,
                is86ed: schema_1.menuItemAvailability.is86ed,
                remainingCount: schema_1.menuItemAvailability.remainingCount,
            })
                .from(schema_1.menuItemAvailability)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.menuItemAvailability.menuItemId, uniqueMenuIds))),
        db_1.db
            .select({
            recipeId: schema_1.recipes.id,
            menuItemId: schema_1.recipes.menuItemId,
            yieldPortions: schema_1.recipes.yieldPortions,
        })
            .from(schema_1.recipes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.recipes.isActive, true), (0, drizzle_orm_1.inArray)(schema_1.recipes.menuItemId, uniqueMenuIds))),
    ]);
    const recipeIds = recipeRows.map((r) => r.recipeId);
    const ingredientRows = recipeIds.length > 0
        ? await db_1.db
            .select({
            recipeId: schema_1.recipeIngredients.recipeId,
            inventoryItemId: schema_1.recipeIngredients.inventoryItemId,
            quantity: schema_1.recipeIngredients.quantity,
            unit: schema_1.recipeIngredients.unit,
            wastagePercentage: schema_1.recipeIngredients.wastagePercentage,
        })
            .from(schema_1.recipeIngredients)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.recipeIngredients.recipeId, recipeIds)))
        : [];
    const menuById = new Map(menuRows.map((m) => [m.id, m]));
    const availByMenuId = new Map(availRows.map((a) => [a.menuItemId, a]));
    const recipeByMenuId = new Map(recipeRows.map((r) => [r.menuItemId, r]));
    const shortages = [];
    // 1. Check menu-level availability, 86'd status, and manual remainingCount caps
    const requiredInventoryIds = new Set();
    const demandByInventoryId = new Map();
    for (const [menuItemId, requestedQty] of qtyByMenuItem.entries()) {
        const item = menuById.get(menuItemId);
        if (!item || !item.isAvailable) {
            shortages.push({
                menuItemId,
                menuItemName: item?.name ?? `Item #${menuItemId}`,
                requested: requestedQty,
                available: 0,
                unit: 'portion',
                reason: 'Menu item is currently unavailable or inactive.',
            });
            continue;
        }
        const manualAvail = availByMenuId.get(menuItemId);
        if (manualAvail?.is86ed) {
            shortages.push({
                menuItemId,
                menuItemName: item.name,
                requested: requestedQty,
                available: 0,
                unit: 'portion',
                reason: `${item.name} is currently 86'd (out of stock).`,
            });
            continue;
        }
        if (manualAvail?.remainingCount !== null &&
            manualAvail?.remainingCount !== undefined &&
            requestedQty > manualAvail.remainingCount) {
            shortages.push({
                menuItemId,
                menuItemName: item.name,
                requested: requestedQty,
                available: Math.max(0, manualAvail.remainingCount),
                unit: 'portion',
                reason: `Only ${Math.max(0, manualAvail.remainingCount)} portion(s) of ${item.name} remaining.`,
            });
            continue;
        }
        if (item.stockTrackingType === 'STOCKED_PRODUCT' && item.directInventoryItemId) {
            requiredInventoryIds.add(item.directInventoryItemId);
            demandByInventoryId.set(item.directInventoryItemId, (demandByInventoryId.get(item.directInventoryItemId) ?? 0) + requestedQty);
        }
        else if (item.stockTrackingType === 'RECIPE' ||
            item.stockTrackingType === 'COMPOSITE') {
            const rec = recipeByMenuId.get(menuItemId);
            if (rec) {
                const yieldPortions = parseFloat(rec.yieldPortions) || 1;
                const ings = ingredientRows.filter((ing) => ing.recipeId === rec.recipeId);
                for (const ing of ings) {
                    const baseQty = parseFloat(ing.quantity) || 0;
                    const wastagePct = parseFloat(ing.wastagePercentage) || 0;
                    const totalNeeded = (baseQty * (1 + wastagePct / 100) * requestedQty) / yieldPortions;
                    if (totalNeeded <= 0)
                        continue;
                    requiredInventoryIds.add(ing.inventoryItemId);
                    demandByInventoryId.set(ing.inventoryItemId, (demandByInventoryId.get(ing.inventoryItemId) ?? 0) + totalNeeded);
                }
            }
        }
    }
    // 2. Compare aggregated inventory demand against live stock balances
    if (requiredInventoryIds.size > 0) {
        const invRows = await db_1.db
            .select({
            id: schema_1.inventoryItems.id,
            name: schema_1.inventoryItems.name,
            unit: schema_1.inventoryItems.unit,
            currentStock: schema_1.inventoryItems.currentStock,
            allowNegativeStock: schema_1.inventoryItems.allowNegativeStock,
        })
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.inventoryItems.id, Array.from(requiredInventoryIds))));
        const invById = new Map(invRows.map((inv) => [inv.id, inv]));
        for (const [invId, totalRequired] of demandByInventoryId.entries()) {
            const inv = invById.get(invId);
            if (!inv)
                continue;
            if (inv.allowNegativeStock)
                continue;
            const availableStock = parseFloat(inv.currentStock) || 0;
            if (totalRequired > availableStock + 0.00001) {
                shortages.push({
                    inventoryItemId: inv.id,
                    inventoryItemName: inv.name,
                    requested: Number(totalRequired.toFixed(4)),
                    available: Number(Math.max(0, availableStock).toFixed(4)),
                    unit: inv.unit,
                    reason: `Insufficient stock for ${inv.name}: required ${totalRequired.toFixed(2)} ${inv.unit}, available ${Math.max(0, availableStock).toFixed(2)} ${inv.unit}.`,
                });
            }
        }
    }
    return {
        valid: shortages.length === 0,
        shortages,
    };
};
exports.validateOrderStockAvailability = validateOrderStockAvailability;
/**
 * Atomic transactional inventory & availability depletion for committed POS orders.
 * Locks order, manual availability rows, and inventory rows with FOR UPDATE.
 */
const deductOrderInventoryInTx = async (tx, params) => {
    const { tenantId, branchId, userId, orderId, orderNumber, items } = params;
    // 1. Guard against duplicate deduction on the same order
    const [orderRow] = await tx
        .select({ id: schema_1.orders.id, inventoryDeducted: schema_1.orders.inventoryDeducted })
        .from(schema_1.orders)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
        .for('update');
    if (!orderRow || orderRow.inventoryDeducted) {
        return;
    }
    const uniqueMenuIds = Array.from(new Set(items.map((i) => i.menuItemId)));
    if (uniqueMenuIds.length === 0)
        return;
    const qtyByMenuItem = new Map();
    for (const line of items) {
        qtyByMenuItem.set(line.menuItemId, (qtyByMenuItem.get(line.menuItemId) ?? 0) + line.quantity);
    }
    // 2. Load menu items, active recipes, and manual availability caps
    const [menuRows, availRows, recipeRows] = await Promise.all([
        tx
            .select({
            id: schema_1.menuItems.id,
            name: schema_1.menuItems.name,
            stockTrackingType: schema_1.menuItems.stockTrackingType,
            directInventoryItemId: schema_1.menuItems.directInventoryItemId,
        })
            .from(schema_1.menuItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.menuItems.id, uniqueMenuIds))),
        tx
            .select()
            .from(schema_1.menuItemAvailability)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.menuItemAvailability.menuItemId, uniqueMenuIds), branchId
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.menuItemAvailability.branchId))
            : (0, drizzle_orm_1.isNull)(schema_1.menuItemAvailability.branchId)))
            .for('update'),
        tx
            .select({
            recipeId: schema_1.recipes.id,
            menuItemId: schema_1.recipes.menuItemId,
            yieldPortions: schema_1.recipes.yieldPortions,
        })
            .from(schema_1.recipes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.recipes.isActive, true), (0, drizzle_orm_1.inArray)(schema_1.recipes.menuItemId, uniqueMenuIds))),
    ]);
    const recipeIds = recipeRows.map((r) => r.recipeId);
    const ingredientRows = recipeIds.length > 0
        ? await tx
            .select({
            recipeId: schema_1.recipeIngredients.recipeId,
            inventoryItemId: schema_1.recipeIngredients.inventoryItemId,
            quantity: schema_1.recipeIngredients.quantity,
            wastagePercentage: schema_1.recipeIngredients.wastagePercentage,
        })
            .from(schema_1.recipeIngredients)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.recipeIngredients.recipeId, recipeIds)))
        : [];
    const menuById = new Map(menuRows.map((m) => [m.id, m]));
    const recipeByMenuId = new Map(recipeRows.map((r) => [r.menuItemId, r]));
    // 3. Decrement manual menu_item_availability remainingCount (if configured)
    for (const avail of availRows) {
        const soldQty = qtyByMenuItem.get(avail.menuItemId) ?? 0;
        if (soldQty <= 0)
            continue;
        if (avail.is86ed) {
            const itemName = menuById.get(avail.menuItemId)?.name ?? `Item #${avail.menuItemId}`;
            throw new Error(`${itemName} is out of stock (86'd).`);
        }
        if (avail.remainingCount !== null) {
            if (soldQty > avail.remainingCount) {
                const itemName = menuById.get(avail.menuItemId)?.name ?? `Item #${avail.menuItemId}`;
                throw new Error(`Insufficient portions for ${itemName}: only ${avail.remainingCount} remaining.`);
            }
            const nextRemaining = Math.max(0, Math.floor(avail.remainingCount - soldQty));
            await tx
                .update(schema_1.menuItemAvailability)
                .set({
                remainingCount: nextRemaining,
                is86ed: nextRemaining <= 0,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.id, avail.id), (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId)));
        }
    }
    // 4. Aggregate total raw material / stocked product consumption across the order
    const demandByInventoryId = new Map();
    for (const [menuItemId, soldQty] of qtyByMenuItem.entries()) {
        const item = menuById.get(menuItemId);
        if (!item)
            continue;
        if (item.stockTrackingType === 'STOCKED_PRODUCT' && item.directInventoryItemId) {
            demandByInventoryId.set(item.directInventoryItemId, (demandByInventoryId.get(item.directInventoryItemId) ?? 0) + soldQty);
        }
        else if (item.stockTrackingType === 'RECIPE' ||
            item.stockTrackingType === 'COMPOSITE') {
            const rec = recipeByMenuId.get(menuItemId);
            if (!rec)
                continue;
            const yieldPortions = parseFloat(rec.yieldPortions) || 1;
            const ings = ingredientRows.filter((ing) => ing.recipeId === rec.recipeId);
            for (const ing of ings) {
                const baseQty = parseFloat(ing.quantity) || 0;
                const wastagePct = parseFloat(ing.wastagePercentage) || 0;
                const totalNeeded = (baseQty * (1 + wastagePct / 100) * soldQty) / yieldPortions;
                if (totalNeeded <= 0)
                    continue;
                demandByInventoryId.set(ing.inventoryItemId, (demandByInventoryId.get(ing.inventoryItemId) ?? 0) + totalNeeded);
            }
        }
    }
    // 5. Lock inventory rows, deduct balances, and post POS_RECIPE_DEPLETION movements
    if (demandByInventoryId.size > 0) {
        const invIds = Array.from(demandByInventoryId.keys());
        const lockedInvRows = await tx
            .select()
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.inventoryItems.id, invIds)))
            .for('update');
        const invById = new Map(lockedInvRows.map((inv) => [inv.id, inv]));
        for (const [invId, totalNeeded] of demandByInventoryId.entries()) {
            const inv = invById.get(invId);
            if (!inv)
                continue;
            const currentStock = parseFloat(inv.currentStock) || 0;
            const newStock = currentStock - totalNeeded;
            if (newStock < -0.00001 && !inv.allowNegativeStock) {
                throw new Error(`Insufficient stock for ${inv.name}: required ${totalNeeded.toFixed(2)} ${inv.unit}, available ${Math.max(0, currentStock).toFixed(2)} ${inv.unit}.`);
            }
            const finalBalance = inv.allowNegativeStock ? newStock : Math.max(0, newStock);
            const unitCost = parseFloat(inv.costPrice) || 0;
            await tx
                .update(schema_1.inventoryItems)
                .set({
                currentStock: finalBalance.toFixed(4),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, inv.id), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)));
            await tx.insert(schema_1.stockMovements).values({
                tenantId,
                branchId: branchId ?? inv.branchId ?? null,
                inventoryItemId: inv.id,
                userId,
                orderId,
                type: 'POS_RECIPE_DEPLETION',
                quantity: (-totalNeeded).toFixed(4),
                unitCost: unitCost.toFixed(4),
                totalValuation: (totalNeeded * unitCost).toFixed(4),
                balanceAfter: finalBalance.toFixed(4),
                documentReference: orderNumber,
                locationBin: 'POS Sale Auto-Depletion',
                notes: `Automated stock depletion for POS Order ${orderNumber}`,
            });
        }
    }
    // 6. Mark order as inventory-deducted
    await tx
        .update(schema_1.orders)
        .set({ inventoryDeducted: true, updatedAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)));
};
exports.deductOrderInventoryInTx = deductOrderInventoryInTx;
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
/**
 * Synchronizes manual `menu_item_availability.remaining_count` (and `is_86ed`)
 * after an order is committed, and triggers inventory depletion only if
 * `orderRepo.createOrderRecord` has not already posted stock movements for this order.
 */
const syncPostOrderStockAndAvailability = async (params) => {
    const { tenantId, branchId, userId, orderId, orderNumber, items } = params;
    const uniqueMenuIds = Array.from(new Set(items.map((i) => i.menuItemId)));
    if (uniqueMenuIds.length === 0)
        return;
    const qtyByMenuItem = new Map();
    for (const line of items) {
        qtyByMenuItem.set(line.menuItemId, (qtyByMenuItem.get(line.menuItemId) ?? 0) + line.quantity);
    }
    await db_1.db.transaction(async (tx) => {
        const [orderRow] = await tx
            .select({ id: schema_1.orders.id, inventoryDeducted: schema_1.orders.inventoryDeducted })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .for('update');
        if (!orderRow)
            return;
        const existingMovements = await tx
            .select({ id: schema_1.stockMovements.id })
            .from(schema_1.stockMovements)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockMovements.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.stockMovements.orderId, orderId)))
            .limit(1);
        const inventoryAlreadyDeducted = orderRow.inventoryDeducted || existingMovements.length > 0;
        if (!inventoryAlreadyDeducted) {
            await (0, exports.deductOrderInventoryInTx)(tx, {
                tenantId,
                branchId,
                userId,
                orderId,
                orderNumber,
                items,
            });
            return;
        }
        const availRows = await tx
            .select()
            .from(schema_1.menuItemAvailability)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.menuItemAvailability.menuItemId, uniqueMenuIds), branchId
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.menuItemAvailability.branchId))
            : undefined))
            .for('update');
        for (const avail of availRows) {
            const soldQty = qtyByMenuItem.get(avail.menuItemId) ?? 0;
            if (soldQty <= 0 || avail.remainingCount === null)
                continue;
            const nextRemaining = Math.max(0, Math.floor(avail.remainingCount - soldQty));
            await tx
                .update(schema_1.menuItemAvailability)
                .set({
                remainingCount: nextRemaining,
                is86ed: nextRemaining <= 0,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.id, avail.id), (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId)));
        }
        if (!orderRow.inventoryDeducted) {
            await tx
                .update(schema_1.orders)
                .set({ inventoryDeducted: true, updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)));
        }
    });
};
exports.syncPostOrderStockAndAvailability = syncPostOrderStockAndAvailability;
/**
 * Lists active staff cleared for the terminal's branch who have a POS PIN configured.
 * Never returns passwordHash or pinHash.
 */
const listBranchKioskOperators = async (tenantId, branchId) => {
    const memberSubquery = db_1.db
        .select({ userId: schema_1.userBranchMemberships.userId })
        .from(schema_1.userBranchMemberships)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.branchId, branchId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true)));
    const rows = await db_1.db
        .select({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        role: schema_1.users.role,
        defaultBranchId: schema_1.users.defaultBranchId,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true), (0, drizzle_orm_1.isNotNull)(schema_1.users.pinHash), (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.users.role, ['ADMIN', 'SUPER_ADMIN']), (0, drizzle_orm_1.eq)(schema_1.users.defaultBranchId, branchId), (0, drizzle_orm_1.inArray)(schema_1.users.id, memberSubquery))))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.users.firstName), (0, drizzle_orm_1.asc)(schema_1.users.lastName));
    return rows.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        fullName: `${u.firstName} ${u.lastName}`.trim(),
        role: u.role,
    }));
};
exports.listBranchKioskOperators = listBranchKioskOperators;
/**
 * Verifies a waiter/cashier POS PIN, enforces branch clearance & RBAC,
 * signs a fresh authoritative JWT for that operator, and writes a sanitized audit log.
 */
const authenticatePosPinSwitch = async (params) => {
    const { tenantId, branchId, pin, targetUserId, previousUserId, ipAddress } = params;
    const throttleKey = `${tenantId}:${branchId}:${targetUserId ?? 'DIRECT'}`;
    const now = Date.now();
    const tracker = pinAttemptTracker.get(throttleKey);
    if (tracker && tracker.lockedUntil > now) {
        const minsLeft = Math.ceil((tracker.lockedUntil - now) / 60000);
        throw new Error(`Terminal PIN temporarily locked after ${MAX_PIN_ATTEMPTS} failed attempts. Try again in ${minsLeft} minute(s).`);
    }
    const memberSubquery = db_1.db
        .select({ userId: schema_1.userBranchMemberships.userId })
        .from(schema_1.userBranchMemberships)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.branchId, branchId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true)));
    const candidateConditions = [
        (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId),
        (0, drizzle_orm_1.eq)(schema_1.users.isActive, true),
        (0, drizzle_orm_1.isNotNull)(schema_1.users.pinHash),
        (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.users.role, ['ADMIN', 'SUPER_ADMIN']), (0, drizzle_orm_1.eq)(schema_1.users.defaultBranchId, branchId), (0, drizzle_orm_1.inArray)(schema_1.users.id, memberSubquery)),
    ];
    if (targetUserId) {
        candidateConditions.push((0, drizzle_orm_1.eq)(schema_1.users.id, targetUserId));
    }
    const candidates = await db_1.db
        .select({
        id: schema_1.users.id,
        tenantId: schema_1.users.tenantId,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        email: schema_1.users.email,
        role: schema_1.users.role,
        defaultBranchId: schema_1.users.defaultBranchId,
        pinHash: schema_1.users.pinHash,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)(...candidateConditions));
    let matchedUser = null;
    for (const candidate of candidates) {
        if (!candidate.pinHash)
            continue;
        const isMatch = await bcryptjs_1.default.compare(pin, candidate.pinHash);
        if (isMatch) {
            matchedUser = candidate;
            break;
        }
    }
    if (!matchedUser) {
        const nextCount = (tracker?.count ?? 0) + 1;
        pinAttemptTracker.set(throttleKey, {
            count: nextCount,
            lockedUntil: nextCount >= MAX_PIN_ATTEMPTS ? now + LOCKOUT_MS : 0,
        });
        await db_1.db.insert(schema_1.auditLogs).values({
            tenantId,
            branchId,
            userId: previousUserId,
            action: 'POS_PIN_SWITCH_FAILED',
            module: 'AUTH',
            entityType: 'pos_terminal_session',
            entityId: String(targetUserId ?? branchId),
            reason: `Invalid POS PIN attempt (${nextCount}/${MAX_PIN_ATTEMPTS})`,
            ipAddress: ipAddress ?? null,
        });
        throw new Error('Invalid POS PIN or operator is not cleared for this branch.');
    }
    pinAttemptTracker.delete(throttleKey);
    const allowedBranches = await (0, role_service_1.getUserAuthorizedBranches)(tenantId, matchedUser.id, matchedUser.role);
    if (allowedBranches !== 'ALL' && !allowedBranches.includes(branchId)) {
        throw new Error('Operator does not have branch clearance for this outlet.');
    }
    const effectivePermissions = await (0, role_service_1.getEffectiveUserPermissions)(tenantId, matchedUser.id, matchedUser.role, branchId);
    const secret = process.env.JWT_SECRET || 'servora-super-secret-key-2026';
    const token = jsonwebtoken_1.default.sign({
        userId: matchedUser.id,
        tenantId: matchedUser.tenantId,
        role: matchedUser.role,
        email: matchedUser.email,
        defaultBranchId: branchId,
    }, secret, { expiresIn: '12h' });
    await Promise.all([
        db_1.db
            .update(schema_1.users)
            .set({ lastLoginAt: new Date(), updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, matchedUser.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId))),
        db_1.db.insert(schema_1.auditLogs).values({
            tenantId,
            branchId,
            userId: matchedUser.id,
            action: 'POS_OPERATOR_PIN_SWITCH',
            module: 'AUTH',
            entityType: 'pos_terminal_session',
            entityId: String(matchedUser.id),
            reason: `Operator switched on POS terminal (previous userId: ${previousUserId})`,
            newValues: { operatorId: matchedUser.id, role: matchedUser.role, branchId },
            ipAddress: ipAddress ?? null,
        }),
    ]);
    return {
        token,
        user: {
            id: matchedUser.id,
            firstName: matchedUser.firstName,
            lastName: matchedUser.lastName,
            fullName: `${matchedUser.firstName} ${matchedUser.lastName}`.trim(),
            email: matchedUser.email,
            role: matchedUser.role,
            defaultBranchId: branchId,
            permissions: effectivePermissions,
        },
    };
};
exports.authenticatePosPinSwitch = authenticatePosPinSwitch;
/**
 * Assigns or resets a unique 4–6 digit POS PIN for an active tenant employee.
 * Enforces PIN uniqueness across the tenant so direct PIN-only login is unambiguous.
 */
const assignStaffPosPinTransaction = async (params) => {
    const { tenantId, targetUserId, pin, actorUserId, ipAddress } = params;
    return await db_1.db.transaction(async (tx) => {
        const [target] = await tx
            .select({
            id: schema_1.users.id,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            defaultBranchId: schema_1.users.defaultBranchId,
            isActive: schema_1.users.isActive,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, targetUserId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
            .limit(1);
        if (!target || !target.isActive) {
            throw new Error('Staff member not found or inactive.');
        }
        const existingPinHolders = await tx
            .select({ id: schema_1.users.id, pinHash: schema_1.users.pinHash })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true), (0, drizzle_orm_1.isNotNull)(schema_1.users.pinHash)));
        for (const holder of existingPinHolders) {
            if (holder.id === targetUserId || !holder.pinHash)
                continue;
            if (await bcryptjs_1.default.compare(pin, holder.pinHash)) {
                throw new Error('This POS PIN is already assigned to another active staff member. Choose a unique PIN.');
            }
        }
        const pinHash = await bcryptjs_1.default.hash(pin, 10);
        await tx
            .update(schema_1.users)
            .set({ pinHash, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, targetUserId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)));
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: target.defaultBranchId ?? null,
            userId: actorUserId,
            action: 'STAFF_POS_PIN_ASSIGNED',
            module: 'WORKFORCE_HCM',
            entityType: 'users',
            entityId: String(targetUserId),
            reason: `POS PIN updated for ${target.firstName} ${target.lastName}`,
            ipAddress: ipAddress ?? null,
        });
        return {
            userId: target.id,
            fullName: `${target.firstName} ${target.lastName}`.trim(),
            pinConfigured: true,
        };
    });
};
exports.assignStaffPosPinTransaction = assignStaffPosPinTransaction;
