"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateKitchenGlobalSettings = exports.deleteKitchenStation = exports.updateKitchenStation = exports.createKitchenStation = exports.getKitchenSettingsPayload = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getKitchenSettingsPayload = async (tenantId, branchId) => {
    // 1. Fetch or create baseline SLA pacing settings if not present
    let [global] = await db_1.db
        .select()
        .from(schema_1.kitchenGlobalSettings)
        .where((0, drizzle_orm_1.eq)(schema_1.kitchenGlobalSettings.tenantId, tenantId))
        .limit(1);
    if (!global) {
        const [createdGlobal] = await db_1.db
            .insert(schema_1.kitchenGlobalSettings)
            .values({
            tenantId,
            defaultWarningMinutes: 10,
            defaultCriticalMinutes: 18,
            enableCoursePacing: true,
            enableOrderConsolidation: true,
            vipPriorityBoostMinutes: 5,
            deliveryPriorityBoostMinutes: 3,
            soundVolume: 80,
        })
            .returning();
        global = createdGlobal;
    }
    // 2. Query stations dynamically — zero synthetic/mock records inserted
    const backupStation = (0, pg_core_1.alias)(schema_1.kitchenStations, 'backup_station');
    const stationConditions = [
        (0, drizzle_orm_1.eq)(schema_1.kitchenStations.tenantId, tenantId),
        branchId ? (0, drizzle_orm_1.eq)(schema_1.kitchenStations.branchId, branchId) : undefined,
    ].filter(Boolean);
    const [stationsList, categoriesList] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.kitchenStations.id,
            branchId: schema_1.kitchenStations.branchId,
            branchName: schema_1.branches.name,
            branchCode: schema_1.branches.code,
            name: schema_1.kitchenStations.name,
            code: schema_1.kitchenStations.code,
            stationType: schema_1.kitchenStations.stationType,
            colorHex: schema_1.kitchenStations.colorHex,
            targetPrepTimeMinutes: schema_1.kitchenStations.targetPrepTimeMinutes,
            warningTimeMinutes: schema_1.kitchenStations.warningTimeMinutes,
            criticalTimeMinutes: schema_1.kitchenStations.criticalTimeMinutes,
            assignedCategories: schema_1.kitchenStations.assignedCategories,
            autoBumpOnPrint: schema_1.kitchenStations.autoBumpOnPrint,
            soundAlertOnNewTicket: schema_1.kitchenStations.soundAlertOnNewTicket,
            allowTicketRecall: schema_1.kitchenStations.allowTicketRecall,
            backupStationId: schema_1.kitchenStations.backupStationId,
            backupStationName: backupStation.name,
            isActive: schema_1.kitchenStations.isActive,
            createdAt: schema_1.kitchenStations.createdAt,
        })
            .from(schema_1.kitchenStations)
            .innerJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.kitchenStations.branchId, schema_1.branches.id))
            .leftJoin(backupStation, (0, drizzle_orm_1.eq)(schema_1.kitchenStations.backupStationId, backupStation.id))
            .where((0, drizzle_orm_1.and)(...stationConditions))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.kitchenStations.id)),
        // Dynamically retrieve only real categories created by this tenant
        db_1.db
            .select({
            id: schema_1.menuCategories.id,
            name: schema_1.menuCategories.name,
        })
            .from(schema_1.menuCategories)
            .where((0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.menuCategories.name)),
    ]);
    return {
        globalSettings: global,
        stations: stationsList,
        availableCategories: categoriesList.map((c) => c.name),
    };
};
exports.getKitchenSettingsPayload = getKitchenSettingsPayload;
const createKitchenStation = async (tenantId, input) => {
    const [created] = await db_1.db
        .insert(schema_1.kitchenStations)
        .values({
        tenantId,
        branchId: input.branchId,
        name: input.name,
        code: input.code,
        stationType: input.stationType,
        colorHex: input.colorHex,
        targetPrepTimeMinutes: input.targetPrepTimeMinutes,
        warningTimeMinutes: input.warningTimeMinutes,
        criticalTimeMinutes: input.criticalTimeMinutes,
        assignedCategories: input.assignedCategories,
        autoBumpOnPrint: input.autoBumpOnPrint,
        soundAlertOnNewTicket: input.soundAlertOnNewTicket,
        allowTicketRecall: input.allowTicketRecall,
        backupStationId: input.backupStationId || null,
        isActive: input.isActive,
    })
        .returning();
    return created;
};
exports.createKitchenStation = createKitchenStation;
const updateKitchenStation = async (tenantId, stationId, input) => {
    const [existing] = await db_1.db
        .select({ id: schema_1.kitchenStations.id })
        .from(schema_1.kitchenStations)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kitchenStations.id, stationId), (0, drizzle_orm_1.eq)(schema_1.kitchenStations.tenantId, tenantId)))
        .limit(1);
    if (!existing) {
        throw new Error('Kitchen station not found.');
    }
    const [updated] = await db_1.db
        .update(schema_1.kitchenStations)
        .set({
        ...input,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.kitchenStations.id, stationId))
        .returning();
    return updated;
};
exports.updateKitchenStation = updateKitchenStation;
const deleteKitchenStation = async (tenantId, stationId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.kitchenStations)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kitchenStations.id, stationId), (0, drizzle_orm_1.eq)(schema_1.kitchenStations.tenantId, tenantId)))
        .returning();
    if (!deleted) {
        throw new Error('Kitchen station not found.');
    }
    return deleted;
};
exports.deleteKitchenStation = deleteKitchenStation;
const updateKitchenGlobalSettings = async (tenantId, input) => {
    const [updated] = await db_1.db
        .update(schema_1.kitchenGlobalSettings)
        .set({
        ...input,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.kitchenGlobalSettings.tenantId, tenantId))
        .returning();
    return updated;
};
exports.updateKitchenGlobalSettings = updateKitchenGlobalSettings;
