// apps/api/src/repositories/pos-terminal.repository.ts
import { eq, and, desc, asc, sql, or, ilike, isNull, inArray } from 'drizzle-orm';
import { db } from '../config/db';
import {
  branches,
  cashDrawers,
  cashierShifts,
  cashierAssignments,
  customers,
  customerLoyaltyProfiles,
  loyaltyTiers,
  loyaltyRewardsCatalog,
  promotionalDiscounts,
  menuItemAvailability,
  kitchenStations,
  menuItems,
  menuCategories,
  menuItemModifierGroups,
  modifierGroups,
  modifierOptions,
  inventoryItems,
  recipes,
  recipeIngredients,
  orders,
  stockMovements,
} from '../config/schema';

export interface StockRequirementLine {
  inventoryItemId: number;
  inventoryItemName: string;
  requiredPerPortion: number;
  unit: string;
  currentStock: number;
  allowNegativeStock: boolean;
}

export interface ComputedItemAvailability {
  menuItemId: number;
  is86ed: boolean;
  remainingCount: number | null;
  maxAvailable: number | null; // null = untracked / unlimited
  stockTrackingType: string;
  limitingIngredientName: string | null;
  requirements: StockRequirementLine[];
}

export interface StockShortageDetail {
  menuItemId?: number;
  menuItemName?: string;
  inventoryItemId?: number;
  inventoryItemName?: string;
  requested: number;
  available: number;
  unit: string;
  reason: string;
}

export interface PosModifierOptionDTO {
  id: number;
  name: string;
  priceAdjustment: number;
  linkedInventoryItemId: number | null;
  linkedQuantity: number;
  linkedUnit: string | null;
  isDefault: boolean;
}

export interface PosModifierGroupDTO {
  id: number;
  name: string;
  description: string | null;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: PosModifierOptionDTO[];
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const getPosTerminalContext = async (
  tenantId: number,
  userId: number,
  requestedBranchId?: number,
  authorizedBranchIds: number[] | null = null
) => {
  // 1. Fetch Authorized Tenant Branches (enforced via user_branch_memberships)
  const branchConditions = [eq(branches.tenantId, tenantId), eq(branches.isActive, true)];
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
    branchConditions.push(inArray(branches.id, authorizedBranchIds));
  }

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
    .where(and(...branchConditions))
    .orderBy(desc(branches.isMainBranch), asc(branches.name));

  const activeBranch =
    accessibleBranches.find((b) => b.id === requestedBranchId) ||
    accessibleBranches[0] ||
    null;

  const branchCondition = activeBranch
    ? or(eq(cashDrawers.branchId, activeBranch.id), isNull(cashDrawers.branchId))
    : undefined;
  const shiftBranchCondition = activeBranch
    ? eq(cashierShifts.branchId, activeBranch.id)
    : undefined;
  const assignmentBranchCondition = activeBranch
    ? eq(cashierAssignments.branchId, activeBranch.id)
    : undefined;

  // 2. Parallel Fetch: Drawers, Shifts, Guardrails, Rewards, Availability, Stations, Catalog, Inventory, Recipes & Modifier Links
  const todayStr = new Date().toISOString().split('T')[0];

  const [
    branchDrawers,
    [activeShift],
    [custodianAssignment],
    activeRewards,
    unavailableItems,
    allTenantKitchenStations,
    tenantCatalogRouting,
    tenantInventory,
    tenantRecipes,
    attachedModifierLinks,
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
          eq(cashierAssignments.assignmentDate, todayStr),
          inArray(cashierAssignments.status, ['ASSIGNED', 'ACTIVE']),
          assignmentBranchCondition
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
      .where(
        and(eq(loyaltyRewardsCatalog.tenantId, tenantId), eq(loyaltyRewardsCatalog.isActive, true))
      )
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
              or(
                eq(menuItemAvailability.branchId, activeBranch.id),
                isNull(menuItemAvailability.branchId)
              )
            )
          )
      : Promise.resolve([]),

    db
      .select({
        id: kitchenStations.id,
        branchId: kitchenStations.branchId,
        name: kitchenStations.name,
        code: kitchenStations.code,
        stationType: kitchenStations.stationType,
        colorHex: kitchenStations.colorHex,
        targetPrepTimeMinutes: kitchenStations.targetPrepTimeMinutes,
        assignedCategories: kitchenStations.assignedCategories,
        backupStationId: kitchenStations.backupStationId,
        isActive: kitchenStations.isActive,
      })
      .from(kitchenStations)
      .where(eq(kitchenStations.tenantId, tenantId))
      .orderBy(asc(kitchenStations.name)),

    db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        kitchenStation: menuItems.kitchenStation,
        stockTrackingType: menuItems.stockTrackingType,
        directInventoryItemId: menuItems.directInventoryItemId,
        categoryName: menuCategories.name,
      })
      .from(menuItems)
      .leftJoin(
        menuCategories,
        and(eq(menuItems.categoryId, menuCategories.id), eq(menuCategories.tenantId, tenantId))
      )
      .where(eq(menuItems.tenantId, tenantId)),

    db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        unit: inventoryItems.unit,
        currentStock: inventoryItems.currentStock,
        allowNegativeStock: inventoryItems.allowNegativeStock,
        isActive: inventoryItems.isActive,
      })
      .from(inventoryItems)
      .where(eq(inventoryItems.tenantId, tenantId)),

    db
      .select({
        recipeId: recipes.id,
        menuItemId: recipes.menuItemId,
        yieldPortions: recipes.yieldPortions,
      })
      .from(recipes)
      .where(and(eq(recipes.tenantId, tenantId), eq(recipes.isActive, true))),

    db
      .select({
        menuItemId: menuItemModifierGroups.menuItemId,
        groupId: modifierGroups.id,
        groupName: modifierGroups.name,
        description: modifierGroups.description,
        minSelections: modifierGroups.minSelections,
        maxSelections: modifierGroups.maxSelections,
        isRequired: modifierGroups.isRequired,
        sortOrder: menuItemModifierGroups.sortOrder,
      })
      .from(menuItemModifierGroups)
      .innerJoin(
        modifierGroups,
        and(
          eq(menuItemModifierGroups.modifierGroupId, modifierGroups.id),
          eq(modifierGroups.tenantId, tenantId),
          eq(modifierGroups.isActive, true)
        )
      )
      .where(eq(menuItemModifierGroups.tenantId, tenantId))
      .orderBy(asc(menuItemModifierGroups.sortOrder), asc(modifierGroups.name)),
  ]);

  // Fetch recipe ingredients & active modifier options concurrently
  const recipeIds = tenantRecipes.map((r) => r.recipeId);
  const linkedGroupIds = Array.from(new Set(attachedModifierLinks.map((l) => l.groupId)));

  const [allRecipeIngredients, activeModifierOptions] = await Promise.all([
    recipeIds.length > 0
      ? db
          .select({
            recipeId: recipeIngredients.recipeId,
            inventoryItemId: recipeIngredients.inventoryItemId,
            quantity: recipeIngredients.quantity,
            unit: recipeIngredients.unit,
            wastagePercentage: recipeIngredients.wastagePercentage,
          })
          .from(recipeIngredients)
          .where(
            and(
              eq(recipeIngredients.tenantId, tenantId),
              inArray(recipeIngredients.recipeId, recipeIds)
            )
          )
      : Promise.resolve([]),

    linkedGroupIds.length > 0
      ? db
          .select({
            id: modifierOptions.id,
            modifierGroupId: modifierOptions.modifierGroupId,
            name: modifierOptions.name,
            priceAdjustment: modifierOptions.priceAdjustment,
            linkedInventoryItemId: modifierOptions.linkedInventoryItemId,
            linkedQuantity: modifierOptions.linkedQuantity,
            linkedUnit: modifierOptions.linkedUnit,
            isDefault: modifierOptions.isDefault,
          })
          .from(modifierOptions)
          .where(
            and(
              inArray(modifierOptions.modifierGroupId, linkedGroupIds),
              eq(modifierOptions.isAvailable, true)
            )
          )
          .orderBy(asc(modifierOptions.id))
      : Promise.resolve([]),
  ]);

  // Build itemModifierGroupsMap keyed by menuItemId
  const optionsByGroupId = new Map<number, PosModifierOptionDTO[]>();
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

  const itemModifierGroupsMap: Record<number, PosModifierGroupDTO[]> = {};
  for (const link of attachedModifierLinks) {
    const groupOptions = optionsByGroupId.get(link.groupId) ?? [];
    if (groupOptions.length === 0) continue;

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
  const invById = new Map(
    tenantInventory.map((inv) => [
      inv.id,
      {
        ...inv,
        stockNum: parseFloat(inv.currentStock) || 0,
      },
    ])
  );

  const manualAvailByMenuId = new Map(
    unavailableItems.map((u) => [u.menuItemId, u])
  );

  const recipeByMenuId = new Map(
    tenantRecipes.map((r) => [
      r.menuItemId,
      {
        recipeId: r.recipeId,
        yieldPortions: parseFloat(r.yieldPortions) || 1,
      },
    ])
  );

  const ingredientsByRecipeId = new Map<number, typeof allRecipeIngredients>();
  for (const ing of allRecipeIngredients) {
    const list = ingredientsByRecipeId.get(ing.recipeId) ?? [];
    list.push(ing);
    ingredientsByRecipeId.set(ing.recipeId, list);
  }

  // 3. Compute Authoritative Per-Item Stock Availability (Manual 86 + Direct Stock + Recipe BOM)
  const computedAvailability: ComputedItemAvailability[] = tenantCatalogRouting.map((item) => {
    const manualFlag = manualAvailByMenuId.get(item.id);
    const manual86 = manualFlag?.is86ed === true;
    const manualRemaining = manualFlag?.remainingCount ?? null;

    const requirements: StockRequirementLine[] = [];
    let inventoryLimit: number | null = null;
    let limitingIngredientName: string | null = null;

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
    } else if (
      item.stockTrackingType === 'RECIPE' ||
      item.stockTrackingType === 'COMPOSITE'
    ) {
      const rec = recipeByMenuId.get(item.id);
      if (rec) {
        const ings = ingredientsByRecipeId.get(rec.recipeId) ?? [];
        const yieldPortions = rec.yieldPortions > 0 ? rec.yieldPortions : 1;

        for (const ing of ings) {
          const inv = invById.get(ing.inventoryItemId);
          if (!inv) continue;

          const baseQty = parseFloat(ing.quantity) || 0;
          const wastagePct = parseFloat(ing.wastagePercentage) || 0;
          const requiredPerPortion = (baseQty * (1 + wastagePct / 100)) / yieldPortions;

          if (requiredPerPortion <= 0) continue;

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

    let maxAvailable: number | null = inventoryLimit;
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
  const effectiveStations =
    branchSpecificStations.length > 0 ? branchSpecificStations : allTenantKitchenStations;

  const stationById = new Map(allTenantKitchenStations.map((s) => [s.id, s]));
  const resolveFailoverStation = (stationObj: (typeof allTenantKitchenStations)[number]) => {
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
  const itemStationMap: Record<
    number,
    {
      stationName: string;
      stationCode: string | null;
      isFailover: boolean;
      originalStationName: string;
    }
  > = {};

  for (const item of tenantCatalogRouting) {
    const catName = (item.categoryName || '').trim().toLowerCase();
    const rawItemStation = (item.kitchenStation || '').trim();
    const rawItemStationLower = rawItemStation.toLowerCase();

    const matchedByCategory = effectiveStations.find((st) =>
      (st.assignedCategories || []).some((c) => {
        const cLow = c.trim().toLowerCase();
        return (
          cLow !== 'all' &&
          (cLow === catName || (rawItemStationLower !== '' && cLow === rawItemStationLower))
        );
      })
    );

    if (matchedByCategory) {
      itemStationMap[item.id] = resolveFailoverStation(matchedByCategory);
      continue;
    }

    const matchedByName = effectiveStations.find(
      (st) =>
        st.name.trim().toLowerCase() === rawItemStationLower ||
        st.code.trim().toLowerCase() === rawItemStationLower ||
        (st.stationType === 'BAR' &&
          (rawItemStationLower.includes('bar') || rawItemStationLower.includes('beverage')))
    );

    if (matchedByName) {
      itemStationMap[item.id] = resolveFailoverStation(matchedByName);
    } else {
      itemStationMap[item.id] = {
        stationName: rawItemStation || 'Main Kitchen',
        stationCode: null,
        isFailover: false,
        originalStationName: rawItemStation || 'Main Kitchen',
      };
    }
  }

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
    itemAvailability: computedAvailability,
    kitchenStations: effectiveStations,
    itemStationMap,
    itemModifierGroupsMap,
  };
};

/**
 * Authoritative live database stock validation for a POS order cart.
 * Aggregates shared raw materials across all cart lines and checks manual 86'd caps.
 */
export const validateOrderStockAvailability = async (
  tenantId: number,
  requestedItems: Array<{ menuItemId: number; quantity: number }>,
  branchId?: number
): Promise<{ valid: boolean; shortages: StockShortageDetail[] }> => {
  const uniqueMenuIds = Array.from(new Set(requestedItems.map((i) => i.menuItemId)));
  if (uniqueMenuIds.length === 0) {
    return { valid: true, shortages: [] };
  }

  // Aggregate quantity per menuItemId
  const qtyByMenuItem = new Map<number, number>();
  for (const line of requestedItems) {
    qtyByMenuItem.set(
      line.menuItemId,
      (qtyByMenuItem.get(line.menuItemId) ?? 0) + line.quantity
    );
  }

  const [menuRows, availRows, recipeRows] = await Promise.all([
    db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        stockTrackingType: menuItems.stockTrackingType,
        directInventoryItemId: menuItems.directInventoryItemId,
        isAvailable: menuItems.isAvailable,
      })
      .from(menuItems)
      .where(and(eq(menuItems.tenantId, tenantId), inArray(menuItems.id, uniqueMenuIds))),

    branchId
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
              inArray(menuItemAvailability.menuItemId, uniqueMenuIds),
              or(
                eq(menuItemAvailability.branchId, branchId),
                isNull(menuItemAvailability.branchId)
              )
            )
          )
      : db
          .select({
            menuItemId: menuItemAvailability.menuItemId,
            is86ed: menuItemAvailability.is86ed,
            remainingCount: menuItemAvailability.remainingCount,
          })
          .from(menuItemAvailability)
          .where(
            and(
              eq(menuItemAvailability.tenantId, tenantId),
              inArray(menuItemAvailability.menuItemId, uniqueMenuIds)
            )
          ),

    db
      .select({
        recipeId: recipes.id,
        menuItemId: recipes.menuItemId,
        yieldPortions: recipes.yieldPortions,
      })
      .from(recipes)
      .where(
        and(
          eq(recipes.tenantId, tenantId),
          eq(recipes.isActive, true),
          inArray(recipes.menuItemId, uniqueMenuIds)
        )
      ),
  ]);

  const recipeIds = recipeRows.map((r) => r.recipeId);
  const ingredientRows =
    recipeIds.length > 0
      ? await db
          .select({
            recipeId: recipeIngredients.recipeId,
            inventoryItemId: recipeIngredients.inventoryItemId,
            quantity: recipeIngredients.quantity,
            unit: recipeIngredients.unit,
            wastagePercentage: recipeIngredients.wastagePercentage,
          })
          .from(recipeIngredients)
          .where(
            and(
              eq(recipeIngredients.tenantId, tenantId),
              inArray(recipeIngredients.recipeId, recipeIds)
            )
          )
      : [];

  const menuById = new Map(menuRows.map((m) => [m.id, m]));
  const availByMenuId = new Map(availRows.map((a) => [a.menuItemId, a]));
  const recipeByMenuId = new Map(recipeRows.map((r) => [r.menuItemId, r]));

  const shortages: StockShortageDetail[] = [];

  // 1. Check menu-level availability, 86'd status, and manual remainingCount caps
  const requiredInventoryIds = new Set<number>();
  const demandByInventoryId = new Map<number, number>();

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

    if (
      manualAvail?.remainingCount !== null &&
      manualAvail?.remainingCount !== undefined &&
      requestedQty > manualAvail.remainingCount
    ) {
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

    // Collect inventory demand
    if (item.stockTrackingType === 'STOCKED_PRODUCT' && item.directInventoryItemId) {
      requiredInventoryIds.add(item.directInventoryItemId);
      demandByInventoryId.set(
        item.directInventoryItemId,
        (demandByInventoryId.get(item.directInventoryItemId) ?? 0) + requestedQty
      );
    } else if (
      item.stockTrackingType === 'RECIPE' ||
      item.stockTrackingType === 'COMPOSITE'
    ) {
      const rec = recipeByMenuId.get(menuItemId);
      if (rec) {
        const yieldPortions = parseFloat(rec.yieldPortions) || 1;
        const ings = ingredientRows.filter((ing) => ing.recipeId === rec.recipeId);

        for (const ing of ings) {
          const baseQty = parseFloat(ing.quantity) || 0;
          const wastagePct = parseFloat(ing.wastagePercentage) || 0;
          const totalNeeded = (baseQty * (1 + wastagePct / 100) * requestedQty) / yieldPortions;
          if (totalNeeded <= 0) continue;

          requiredInventoryIds.add(ing.inventoryItemId);
          demandByInventoryId.set(
            ing.inventoryItemId,
            (demandByInventoryId.get(ing.inventoryItemId) ?? 0) + totalNeeded
          );
        }
      }
    }
  }

  // 2. Compare aggregated inventory demand against live stock balances
  if (requiredInventoryIds.size > 0) {
    const invRows = await db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        unit: inventoryItems.unit,
        currentStock: inventoryItems.currentStock,
        allowNegativeStock: inventoryItems.allowNegativeStock,
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.tenantId, tenantId),
          inArray(inventoryItems.id, Array.from(requiredInventoryIds))
        )
      );

    const invById = new Map(invRows.map((inv) => [inv.id, inv]));

    for (const [invId, totalRequired] of demandByInventoryId.entries()) {
      const inv = invById.get(invId);
      if (!inv) continue;
      if (inv.allowNegativeStock) continue;

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

/**
 * Atomic transactional inventory & availability depletion for committed POS orders.
 * Locks order, manual availability rows, and inventory rows with FOR UPDATE.
 */
export const deductOrderInventoryInTx = async (
  tx: DbTransaction,
  params: {
    tenantId: number;
    branchId: number | null;
    userId: number | null;
    orderId: number;
    orderNumber: string;
    items: Array<{ menuItemId: number; quantity: number }>;
  }
) => {
  const { tenantId, branchId, userId, orderId, orderNumber, items } = params;

  // 1. Guard against duplicate deduction on the same order
  const [orderRow] = await tx
    .select({ id: orders.id, inventoryDeducted: orders.inventoryDeducted })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
    .for('update');

  if (!orderRow || orderRow.inventoryDeducted) {
    return;
  }

  const uniqueMenuIds = Array.from(new Set(items.map((i) => i.menuItemId)));
  if (uniqueMenuIds.length === 0) return;

  const qtyByMenuItem = new Map<number, number>();
  for (const line of items) {
    qtyByMenuItem.set(
      line.menuItemId,
      (qtyByMenuItem.get(line.menuItemId) ?? 0) + line.quantity
    );
  }

  // 2. Load menu items, active recipes, and manual availability caps
  const [menuRows, availRows, recipeRows] = await Promise.all([
    tx
      .select({
        id: menuItems.id,
        name: menuItems.name,
        stockTrackingType: menuItems.stockTrackingType,
        directInventoryItemId: menuItems.directInventoryItemId,
      })
      .from(menuItems)
      .where(and(eq(menuItems.tenantId, tenantId), inArray(menuItems.id, uniqueMenuIds))),

    tx
      .select()
      .from(menuItemAvailability)
      .where(
        and(
          eq(menuItemAvailability.tenantId, tenantId),
          inArray(menuItemAvailability.menuItemId, uniqueMenuIds),
          branchId
            ? or(
                eq(menuItemAvailability.branchId, branchId),
                isNull(menuItemAvailability.branchId)
              )
            : isNull(menuItemAvailability.branchId)
        )
      )
      .for('update'),

    tx
      .select({
        recipeId: recipes.id,
        menuItemId: recipes.menuItemId,
        yieldPortions: recipes.yieldPortions,
      })
      .from(recipes)
      .where(
        and(
          eq(recipes.tenantId, tenantId),
          eq(recipes.isActive, true),
          inArray(recipes.menuItemId, uniqueMenuIds)
        )
      ),
  ]);

  const recipeIds = recipeRows.map((r) => r.recipeId);
  const ingredientRows =
    recipeIds.length > 0
      ? await tx
          .select({
            recipeId: recipeIngredients.recipeId,
            inventoryItemId: recipeIngredients.inventoryItemId,
            quantity: recipeIngredients.quantity,
            wastagePercentage: recipeIngredients.wastagePercentage,
          })
          .from(recipeIngredients)
          .where(
            and(
              eq(recipeIngredients.tenantId, tenantId),
              inArray(recipeIngredients.recipeId, recipeIds)
            )
          )
      : [];

  const menuById = new Map(menuRows.map((m) => [m.id, m]));
  const recipeByMenuId = new Map(recipeRows.map((r) => [r.menuItemId, r]));

  // 3. Decrement manual menu_item_availability remainingCount (if configured)
  for (const avail of availRows) {
    const soldQty = qtyByMenuItem.get(avail.menuItemId) ?? 0;
    if (soldQty <= 0) continue;

    if (avail.is86ed) {
      const itemName = menuById.get(avail.menuItemId)?.name ?? `Item #${avail.menuItemId}`;
      throw new Error(`${itemName} is out of stock (86'd).`);
    }

    if (avail.remainingCount !== null) {
      if (soldQty > avail.remainingCount) {
        const itemName = menuById.get(avail.menuItemId)?.name ?? `Item #${avail.menuItemId}`;
        throw new Error(
          `Insufficient portions for ${itemName}: only ${avail.remainingCount} remaining.`
        );
      }

      const nextRemaining = Math.max(0, Math.floor(avail.remainingCount - soldQty));
      await tx
        .update(menuItemAvailability)
        .set({
          remainingCount: nextRemaining,
          is86ed: nextRemaining <= 0,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(menuItemAvailability.id, avail.id),
            eq(menuItemAvailability.tenantId, tenantId)
          )
        );
    }
  }

  // 4. Aggregate total raw material / stocked product consumption across the order
  const demandByInventoryId = new Map<number, number>();

  for (const [menuItemId, soldQty] of qtyByMenuItem.entries()) {
    const item = menuById.get(menuItemId);
    if (!item) continue;

    if (item.stockTrackingType === 'STOCKED_PRODUCT' && item.directInventoryItemId) {
      demandByInventoryId.set(
        item.directInventoryItemId,
        (demandByInventoryId.get(item.directInventoryItemId) ?? 0) + soldQty
      );
    } else if (
      item.stockTrackingType === 'RECIPE' ||
      item.stockTrackingType === 'COMPOSITE'
    ) {
      const rec = recipeByMenuId.get(menuItemId);
      if (!rec) continue;

      const yieldPortions = parseFloat(rec.yieldPortions) || 1;
      const ings = ingredientRows.filter((ing) => ing.recipeId === rec.recipeId);

      for (const ing of ings) {
        const baseQty = parseFloat(ing.quantity) || 0;
        const wastagePct = parseFloat(ing.wastagePercentage) || 0;
        const totalNeeded = (baseQty * (1 + wastagePct / 100) * soldQty) / yieldPortions;
        if (totalNeeded <= 0) continue;

        demandByInventoryId.set(
          ing.inventoryItemId,
          (demandByInventoryId.get(ing.inventoryItemId) ?? 0) + totalNeeded
        );
      }
    }
  }

  // 5. Lock inventory rows, deduct balances, and post POS_RECIPE_DEPLETION movements
  if (demandByInventoryId.size > 0) {
    const invIds = Array.from(demandByInventoryId.keys());
    const lockedInvRows = await tx
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.tenantId, tenantId), inArray(inventoryItems.id, invIds)))
      .for('update');

    const invById = new Map(lockedInvRows.map((inv) => [inv.id, inv]));

    for (const [invId, totalNeeded] of demandByInventoryId.entries()) {
      const inv = invById.get(invId);
      if (!inv) continue;

      const currentStock = parseFloat(inv.currentStock) || 0;
      const newStock = currentStock - totalNeeded;

      if (newStock < -0.00001 && !inv.allowNegativeStock) {
        throw new Error(
          `Insufficient stock for ${inv.name}: required ${totalNeeded.toFixed(2)} ${inv.unit}, available ${Math.max(0, currentStock).toFixed(2)} ${inv.unit}.`
        );
      }

      const finalBalance = inv.allowNegativeStock ? newStock : Math.max(0, newStock);
      const unitCost = parseFloat(inv.costPrice) || 0;

      await tx
        .update(inventoryItems)
        .set({
          currentStock: finalBalance.toFixed(4),
          updatedAt: new Date(),
        })
        .where(and(eq(inventoryItems.id, inv.id), eq(inventoryItems.tenantId, tenantId)));

      await tx.insert(stockMovements).values({
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
    .update(orders)
    .set({ inventoryDeducted: true, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)));
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

/**
 * Synchronizes manual `menu_item_availability.remaining_count` (and `is_86ed`)
 * after an order is committed, and triggers inventory depletion only if
 * `orderRepo.createOrderRecord` has not already posted stock movements for this order.
 */
export const syncPostOrderStockAndAvailability = async (params: {
  tenantId: number;
  branchId: number | null;
  userId: number | null;
  orderId: number;
  orderNumber: string;
  items: Array<{ menuItemId: number; quantity: number }>;
}) => {
  const { tenantId, branchId, userId, orderId, orderNumber, items } = params;
  const uniqueMenuIds = Array.from(new Set(items.map((i) => i.menuItemId)));
  if (uniqueMenuIds.length === 0) return;

  const qtyByMenuItem = new Map<number, number>();
  for (const line of items) {
    qtyByMenuItem.set(
      line.menuItemId,
      (qtyByMenuItem.get(line.menuItemId) ?? 0) + line.quantity
    );
  }

  await db.transaction(async (tx) => {
    // 1. Lock order row and check whether inventory was already deducted
    const [orderRow] = await tx
      .select({ id: orders.id, inventoryDeducted: orders.inventoryDeducted })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .for('update');

    if (!orderRow) return;

    const existingMovements = await tx
      .select({ id: stockMovements.id })
      .from(stockMovements)
      .where(and(eq(stockMovements.tenantId, tenantId), eq(stockMovements.orderId, orderId)))
      .limit(1);

    const inventoryAlreadyDeducted =
      orderRow.inventoryDeducted || existingMovements.length > 0;

    // 2. If inventory was NOT yet deducted by orderRepo, run full atomic deduction
    //    (which handles both menu_item_availability and inventory_items)
    if (!inventoryAlreadyDeducted) {
      await deductOrderInventoryInTx(tx, {
        tenantId,
        branchId,
        userId,
        orderId,
        orderNumber,
        items,
      });
      return;
    }

    // 3. Inventory was already deducted by orderRepo — decrement manual availability caps
    const availRows = await tx
      .select()
      .from(menuItemAvailability)
      .where(
        and(
          eq(menuItemAvailability.tenantId, tenantId),
          inArray(menuItemAvailability.menuItemId, uniqueMenuIds),
          branchId
            ? or(
                eq(menuItemAvailability.branchId, branchId),
                isNull(menuItemAvailability.branchId)
              )
            : undefined
        )
      )
      .for('update');

    for (const avail of availRows) {
      const soldQty = qtyByMenuItem.get(avail.menuItemId) ?? 0;
      if (soldQty <= 0 || avail.remainingCount === null) continue;

      const nextRemaining = Math.max(0, Math.floor(avail.remainingCount - soldQty));
      await tx
        .update(menuItemAvailability)
        .set({
          remainingCount: nextRemaining,
          is86ed: nextRemaining <= 0,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(menuItemAvailability.id, avail.id),
            eq(menuItemAvailability.tenantId, tenantId)
          )
        );
    }

    if (!orderRow.inventoryDeducted) {
      await tx
        .update(orders)
        .set({ inventoryDeducted: true, updatedAt: new Date() })
        .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)));
    }
  });
};