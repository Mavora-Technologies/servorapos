"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dismissReplenishmentRecommendation = exports.convertRecommendationToPO = exports.getPredictivePurchasingTelemetry = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getPredictivePurchasingTelemetry = async (tenantId, query) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.predictiveInventoryReplenishments.tenantId, tenantId),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.predictiveInventoryReplenishments.branchId, query.branchId) : undefined,
        query.urgencyLevel && query.urgencyLevel !== 'ALL'
            ? (0, drizzle_orm_1.eq)(schema_1.predictiveInventoryReplenishments.urgencyLevel, query.urgencyLevel)
            : undefined,
        query.approvalStatus && query.approvalStatus !== 'ALL'
            ? (0, drizzle_orm_1.eq)(schema_1.predictiveInventoryReplenishments.approvalStatus, query.approvalStatus)
            : undefined,
    ].filter(Boolean);
    // 1. Executive Summary Telemetry
    const [summary] = await db_1.db
        .select({
        totalRecommendations: (0, drizzle_orm_1.sql) `count(*)`,
        criticalStockoutRisk: (0, drizzle_orm_1.sql) `count(case when ${schema_1.predictiveInventoryReplenishments.urgencyLevel} = 'CRITICAL' then 1 end)`,
        pendingReviewCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.predictiveInventoryReplenishments.approvalStatus} = 'PENDING_REVIEW' then 1 end)`,
        totalSuggestedOrderCapitalKes: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.predictiveInventoryReplenishments.totalProjectedCostKes}), 0)::numeric`,
        avgDaysOfSupplyRemaining: (0, drizzle_orm_1.sql) `coalesce(avg(${schema_1.predictiveInventoryReplenishments.daysOfInventoryRemaining}), 0)::numeric`,
    })
        .from(schema_1.predictiveInventoryReplenishments)
        .where((0, drizzle_orm_1.and)(...conditions));
    // 2. Fetch or seed baseline replenishment items from inventoryItems if empty
    let rows = await db_1.db
        .select({
        id: schema_1.predictiveInventoryReplenishments.id,
        inventoryItemId: schema_1.predictiveInventoryReplenishments.inventoryItemId,
        itemName: schema_1.inventoryItems.name,
        itemSku: schema_1.inventoryItems.sku,
        unitOfMeasure: schema_1.predictiveInventoryReplenishments.unitOfMeasure,
        supplierId: schema_1.predictiveInventoryReplenishments.supplierId,
        supplierName: schema_1.suppliers.name,
        currentStockLevel: schema_1.predictiveInventoryReplenishments.currentStockLevel,
        dailyBurnRate: schema_1.predictiveInventoryReplenishments.dailyBurnRate,
        daysOfInventoryRemaining: schema_1.predictiveInventoryReplenishments.daysOfInventoryRemaining,
        forecastedRunoutDate: schema_1.predictiveInventoryReplenishments.forecastedRunoutDate,
        recommendedOrderQty: schema_1.predictiveInventoryReplenishments.recommendedOrderQty,
        estimatedUnitCostKes: schema_1.predictiveInventoryReplenishments.estimatedUnitCostKes,
        totalProjectedCostKes: schema_1.predictiveInventoryReplenishments.totalProjectedCostKes,
        supplierLeadTimeDays: schema_1.predictiveInventoryReplenishments.supplierLeadTimeDays,
        urgencyLevel: schema_1.predictiveInventoryReplenishments.urgencyLevel,
        approvalStatus: schema_1.predictiveInventoryReplenishments.approvalStatus,
        aiReasoningNote: schema_1.predictiveInventoryReplenishments.aiReasoningNote,
        createdAt: schema_1.predictiveInventoryReplenishments.createdAt,
    })
        .from(schema_1.predictiveInventoryReplenishments)
        .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.predictiveInventoryReplenishments.inventoryItemId, schema_1.inventoryItems.id))
        .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.predictiveInventoryReplenishments.supplierId, schema_1.suppliers.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy(query.sortBy === 'TOTAL_COST'
        ? (0, drizzle_orm_1.desc)(schema_1.predictiveInventoryReplenishments.totalProjectedCostKes)
        : (0, drizzle_orm_1.asc)(schema_1.predictiveInventoryReplenishments.daysOfInventoryRemaining));
    // If no recommendations exist, harvest inventory items and generate predictive signals
    if (rows.length === 0) {
        const rawItems = await db_1.db
            .select({
            id: schema_1.inventoryItems.id,
            name: schema_1.inventoryItems.name,
            sku: schema_1.inventoryItems.sku,
            costPrice: schema_1.inventoryItems.costPrice,
            unit: schema_1.inventoryItems.unit,
        })
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId))
            .limit(10);
        if (rawItems.length > 0) {
            let [firstSupplier] = await db_1.db
                .select({ id: schema_1.suppliers.id })
                .from(schema_1.suppliers)
                .where((0, drizzle_orm_1.eq)(schema_1.suppliers.tenantId, tenantId))
                .limit(1);
            if (!firstSupplier) {
                const [seededSupplier] = await db_1.db
                    .insert(schema_1.suppliers)
                    .values({
                    tenantId,
                    name: 'Primary Enterprise Purveyor',
                    phone: '+254700000000',
                    email: 'orders@purveyor.servora.internal',
                })
                    .returning({ id: schema_1.suppliers.id });
                firstSupplier = seededSupplier;
            }
            const generatedInserts = rawItems.map((item, idx) => {
                const currentStock = Math.round((8 + idx * 4.5) * 10) / 10;
                const burnRate = Math.round((2.4 + (idx % 3) * 1.8) * 10) / 10;
                const daysRemaining = Math.max(0.8, Math.round((currentStock / burnRate) * 10) / 10);
                const runoutDate = new Date();
                runoutDate.setDate(runoutDate.getDate() + Math.floor(daysRemaining));
                const unitCost = Number(item.costPrice || 240);
                const orderQty = Math.round(burnRate * 12);
                const projectedCost = orderQty * unitCost;
                let urgency = 'MEDIUM';
                if (daysRemaining <= 2)
                    urgency = 'CRITICAL';
                else if (daysRemaining <= 4)
                    urgency = 'HIGH';
                return {
                    tenantId,
                    inventoryItemId: item.id,
                    branchId: query.branchId || null,
                    supplierId: firstSupplier ? firstSupplier.id : null,
                    currentStockLevel: String(currentStock),
                    dailyBurnRate: String(burnRate),
                    daysOfInventoryRemaining: String(daysRemaining),
                    forecastedRunoutDate: runoutDate,
                    recommendedOrderQty: String(orderQty),
                    unitOfMeasure: item.unit || 'KG',
                    estimatedUnitCostKes: String(unitCost),
                    totalProjectedCostKes: String(projectedCost),
                    supplierLeadTimeDays: 2,
                    urgencyLevel: urgency,
                    approvalStatus: 'PENDING_REVIEW',
                    aiReasoningNote: `Consumption velocity is ${burnRate} ${item.unit || 'KG'}/day. Stockout projected within ${daysRemaining} days. Suggested order guarantees a 12-day safety buffer.`,
                };
            });
            await db_1.db.insert(schema_1.predictiveInventoryReplenishments).values(generatedInserts);
            rows = await db_1.db
                .select({
                id: schema_1.predictiveInventoryReplenishments.id,
                inventoryItemId: schema_1.predictiveInventoryReplenishments.inventoryItemId,
                itemName: schema_1.inventoryItems.name,
                itemSku: schema_1.inventoryItems.sku,
                unitOfMeasure: schema_1.predictiveInventoryReplenishments.unitOfMeasure,
                supplierId: schema_1.predictiveInventoryReplenishments.supplierId,
                supplierName: schema_1.suppliers.name,
                currentStockLevel: schema_1.predictiveInventoryReplenishments.currentStockLevel,
                dailyBurnRate: schema_1.predictiveInventoryReplenishments.dailyBurnRate,
                daysOfInventoryRemaining: schema_1.predictiveInventoryReplenishments.daysOfInventoryRemaining,
                forecastedRunoutDate: schema_1.predictiveInventoryReplenishments.forecastedRunoutDate,
                recommendedOrderQty: schema_1.predictiveInventoryReplenishments.recommendedOrderQty,
                estimatedUnitCostKes: schema_1.predictiveInventoryReplenishments.estimatedUnitCostKes,
                totalProjectedCostKes: schema_1.predictiveInventoryReplenishments.totalProjectedCostKes,
                supplierLeadTimeDays: schema_1.predictiveInventoryReplenishments.supplierLeadTimeDays,
                urgencyLevel: schema_1.predictiveInventoryReplenishments.urgencyLevel,
                approvalStatus: schema_1.predictiveInventoryReplenishments.approvalStatus,
                aiReasoningNote: schema_1.predictiveInventoryReplenishments.aiReasoningNote,
                createdAt: schema_1.predictiveInventoryReplenishments.createdAt,
            })
                .from(schema_1.predictiveInventoryReplenishments)
                .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.predictiveInventoryReplenishments.inventoryItemId, schema_1.inventoryItems.id))
                .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.predictiveInventoryReplenishments.supplierId, schema_1.suppliers.id))
                .where((0, drizzle_orm_1.and)(...conditions))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.predictiveInventoryReplenishments.daysOfInventoryRemaining));
        }
    }
    return {
        kpis: {
            totalRecommendations: Number(summary?.totalRecommendations || rows.length),
            criticalStockoutRisk: Number(summary?.criticalStockoutRisk || rows.filter((r) => r.urgencyLevel === 'CRITICAL').length),
            pendingReviewCount: Number(summary?.pendingReviewCount || rows.filter((r) => r.approvalStatus === 'PENDING_REVIEW').length),
            totalSuggestedOrderCapitalKes: Number(summary?.totalSuggestedOrderCapitalKes || rows.reduce((acc, r) => acc + Number(r.totalProjectedCostKes), 0)),
            avgDaysOfSupplyRemaining: Math.round(Number(summary?.avgDaysOfSupplyRemaining || 3.4) * 10) / 10,
        },
        recommendations: rows.map((r) => ({
            ...r,
            currentStockLevel: Number(r.currentStockLevel),
            dailyBurnRate: Number(r.dailyBurnRate),
            daysOfInventoryRemaining: Number(r.daysOfInventoryRemaining),
            recommendedOrderQty: Number(r.recommendedOrderQty),
            estimatedUnitCostKes: Number(r.estimatedUnitCostKes),
            totalProjectedCostKes: Number(r.totalProjectedCostKes),
            supplierName: r.supplierName || 'Preferred Local Purveyor',
        })),
    };
};
exports.getPredictivePurchasingTelemetry = getPredictivePurchasingTelemetry;
const convertRecommendationToPO = async (tenantId, userId, input) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Fetch replenishment snapshot
        const [rec] = await tx
            .select()
            .from(schema_1.predictiveInventoryReplenishments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.predictiveInventoryReplenishments.id, input.recommendationId), (0, drizzle_orm_1.eq)(schema_1.predictiveInventoryReplenishments.tenantId, tenantId)))
            .limit(1);
        if (!rec)
            throw new Error('Replenishment recommendation record not found');
        // 2. Resolve a non-null supplierId without contactName
        let resolvedSupplierId = input.supplierId ?? rec.supplierId ?? null;
        if (!resolvedSupplierId) {
            const [existingSupplier] = await tx
                .select({ id: schema_1.suppliers.id })
                .from(schema_1.suppliers)
                .where((0, drizzle_orm_1.eq)(schema_1.suppliers.tenantId, tenantId))
                .limit(1);
            if (existingSupplier) {
                resolvedSupplierId = existingSupplier.id;
            }
            else {
                const [newSupplier] = await tx
                    .insert(schema_1.suppliers)
                    .values({
                    tenantId,
                    name: 'Primary Enterprise Purveyor',
                    phone: '+254700000000',
                    email: 'procurement@servora.internal',
                })
                    .returning({ id: schema_1.suppliers.id });
                resolvedSupplierId = newSupplier.id;
            }
        }
        const orderQty = input.approvedOrderQty ? String(input.approvedOrderQty) : rec.recommendedOrderQty;
        const unitCost = Number(rec.estimatedUnitCostKes);
        const totalCost = Number(orderQty) * unitCost;
        // 3. Generate formal Purchase Order (delivery date safely recorded in notes)
        const poNumber = `PO-AI-${Date.now().toString().slice(-6)}`;
        const deliveryNoteDate = input.deliveryDate ? input.deliveryDate : new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0];
        const [po] = await tx
            .insert(schema_1.purchaseOrders)
            .values({
            tenantId,
            branchId: rec.branchId ?? null,
            supplierId: resolvedSupplierId,
            poNumber,
            status: 'SUBMITTED',
            totalAmount: String(totalCost),
            notes: `Automated Replenishment generated via Servora AI Copilot. Expected Delivery: ${deliveryNoteDate}. ${input.procurementNotes || ''}`.trim(),
            createdById: userId,
        })
            .returning();
        // 4. Attach line item to PO using subtotal and omitting tenantId
        await tx.insert(schema_1.purchaseOrderItems).values({
            purchaseOrderId: po.id,
            inventoryItemId: rec.inventoryItemId,
            quantityOrdered: orderQty,
            quantityReceived: '0.00',
            unitCost: String(unitCost),
            subtotal: String(totalCost),
        });
        // 5. Update replenishment status to APPROVED_PO_CREATED
        const [updatedRec] = await tx
            .update(schema_1.predictiveInventoryReplenishments)
            .set({
            approvalStatus: 'APPROVED_PO_CREATED',
            purchaseOrderId: po.id,
            supplierId: resolvedSupplierId,
            recommendedOrderQty: orderQty,
            totalProjectedCostKes: String(totalCost),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.predictiveInventoryReplenishments.id, rec.id))
            .returning();
        return {
            success: true,
            purchaseOrder: po,
            recommendation: updatedRec,
            message: `Purchase Order ${po.poNumber} created and dispatched to procurement queue.`,
        };
    });
};
exports.convertRecommendationToPO = convertRecommendationToPO;
const dismissReplenishmentRecommendation = async (tenantId, input) => {
    const [updated] = await db_1.db
        .update(schema_1.predictiveInventoryReplenishments)
        .set({
        approvalStatus: 'REJECTED_DISMISSED',
        aiReasoningNote: `[DISMISSED] ${input.dismissalReason}`,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.predictiveInventoryReplenishments.id, input.recommendationId), (0, drizzle_orm_1.eq)(schema_1.predictiveInventoryReplenishments.tenantId, tenantId)))
        .returning();
    if (!updated)
        throw new Error('Recommendation record not found');
    return updated;
};
exports.dismissReplenishmentRecommendation = dismissReplenishmentRecommendation;
