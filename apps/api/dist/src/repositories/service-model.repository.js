"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteServiceModel = exports.updateServiceModel = exports.createServiceModel = exports.listServiceModels = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listServiceModels = async (tenantId, branchId) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.serviceModels.tenantId, tenantId),
        branchId ? (0, drizzle_orm_1.eq)(schema_1.serviceModels.branchId, branchId) : undefined,
    ].filter(Boolean);
    const models = await db_1.db
        .select({
        id: schema_1.serviceModels.id,
        branchId: schema_1.serviceModels.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        name: schema_1.serviceModels.name,
        type: schema_1.serviceModels.type,
        description: schema_1.serviceModels.description,
        requiresTable: schema_1.serviceModels.requiresTable,
        payBeforeOrder: schema_1.serviceModels.payBeforeOrder,
        promptGuestCount: schema_1.serviceModels.promptGuestCount,
        allowSplitChecks: schema_1.serviceModels.allowSplitChecks,
        allowTableTransfers: schema_1.serviceModels.allowTableTransfers,
        autoSendToKitchen: schema_1.serviceModels.autoSendToKitchen,
        enableCoursePacing: schema_1.serviceModels.enableCoursePacing,
        requireSeatNumbering: schema_1.serviceModels.requireSeatNumbering,
        autoApplyServiceCharge: schema_1.serviceModels.autoApplyServiceCharge,
        serviceChargePercent: schema_1.serviceModels.serviceChargePercent,
        packingChargeAmount: schema_1.serviceModels.packingChargeAmount,
        preAuthCardRequired: schema_1.serviceModels.preAuthCardRequired,
        maxTabCreditLimit: schema_1.serviceModels.maxTabCreditLimit,
        isActive: schema_1.serviceModels.isActive,
        createdAt: schema_1.serviceModels.createdAt,
    })
        .from(schema_1.serviceModels)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.serviceModels.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.serviceModels.id));
    return models;
};
exports.listServiceModels = listServiceModels;
const createServiceModel = async (tenantId, input) => {
    const [created] = await db_1.db
        .insert(schema_1.serviceModels)
        .values({
        tenantId,
        branchId: input.branchId || null,
        name: input.name,
        type: input.type,
        description: input.description || null,
        requiresTable: input.requiresTable,
        payBeforeOrder: input.payBeforeOrder,
        promptGuestCount: input.promptGuestCount,
        allowSplitChecks: input.allowSplitChecks,
        allowTableTransfers: input.allowTableTransfers,
        autoSendToKitchen: input.autoSendToKitchen,
        enableCoursePacing: input.enableCoursePacing,
        requireSeatNumbering: input.requireSeatNumbering,
        autoApplyServiceCharge: input.autoApplyServiceCharge,
        serviceChargePercent: String(input.serviceChargePercent),
        packingChargeAmount: String(input.packingChargeAmount),
        preAuthCardRequired: input.preAuthCardRequired,
        maxTabCreditLimit: String(input.maxTabCreditLimit),
        isActive: input.isActive,
    })
        .returning();
    return created;
};
exports.createServiceModel = createServiceModel;
const updateServiceModel = async (tenantId, modelId, input) => {
    const [existing] = await db_1.db
        .select({ id: schema_1.serviceModels.id })
        .from(schema_1.serviceModels)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.serviceModels.id, modelId), (0, drizzle_orm_1.eq)(schema_1.serviceModels.tenantId, tenantId)))
        .limit(1);
    if (!existing) {
        throw new Error('Service model profile not found.');
    }
    const updateData = {
        updatedAt: new Date(),
    };
    if (input.name !== undefined)
        updateData.name = input.name;
    if (input.type !== undefined)
        updateData.type = input.type;
    if (input.description !== undefined)
        updateData.description = input.description;
    if (input.branchId !== undefined)
        updateData.branchId = input.branchId;
    if (input.requiresTable !== undefined)
        updateData.requiresTable = input.requiresTable;
    if (input.payBeforeOrder !== undefined)
        updateData.payBeforeOrder = input.payBeforeOrder;
    if (input.promptGuestCount !== undefined)
        updateData.promptGuestCount = input.promptGuestCount;
    if (input.allowSplitChecks !== undefined)
        updateData.allowSplitChecks = input.allowSplitChecks;
    if (input.allowTableTransfers !== undefined)
        updateData.allowTableTransfers = input.allowTableTransfers;
    if (input.autoSendToKitchen !== undefined)
        updateData.autoSendToKitchen = input.autoSendToKitchen;
    if (input.enableCoursePacing !== undefined)
        updateData.enableCoursePacing = input.enableCoursePacing;
    if (input.requireSeatNumbering !== undefined)
        updateData.requireSeatNumbering = input.requireSeatNumbering;
    if (input.autoApplyServiceCharge !== undefined)
        updateData.autoApplyServiceCharge = input.autoApplyServiceCharge;
    if (input.serviceChargePercent !== undefined)
        updateData.serviceChargePercent = String(input.serviceChargePercent);
    if (input.packingChargeAmount !== undefined)
        updateData.packingChargeAmount = String(input.packingChargeAmount);
    if (input.preAuthCardRequired !== undefined)
        updateData.preAuthCardRequired = input.preAuthCardRequired;
    if (input.maxTabCreditLimit !== undefined)
        updateData.maxTabCreditLimit = String(input.maxTabCreditLimit);
    if (input.isActive !== undefined)
        updateData.isActive = input.isActive;
    const [updated] = await db_1.db
        .update(schema_1.serviceModels)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.serviceModels.id, modelId))
        .returning();
    return updated;
};
exports.updateServiceModel = updateServiceModel;
const deleteServiceModel = async (tenantId, modelId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.serviceModels)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.serviceModels.id, modelId), (0, drizzle_orm_1.eq)(schema_1.serviceModels.tenantId, tenantId)))
        .returning();
    if (!deleted) {
        throw new Error('Service model profile not found.');
    }
    return deleted;
};
exports.deleteServiceModel = deleteServiceModel;
