"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchVehicleForTransfer = exports.updateVehicleStatus = exports.createVehicle = exports.listActiveFleetDispatches = exports.listVehiclesByTenant = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listVehiclesByTenant = async (tenantId) => {
    return await db_1.db
        .select({
        id: schema_1.logisticsVehicles.id,
        plateNumber: schema_1.logisticsVehicles.plateNumber,
        makeModel: schema_1.logisticsVehicles.makeModel,
        vehicleType: schema_1.logisticsVehicles.vehicleType,
        driverName: schema_1.logisticsVehicles.driverName,
        driverPhone: schema_1.logisticsVehicles.driverPhone,
        maxPayloadKg: schema_1.logisticsVehicles.maxPayloadKg,
        temperatureControlled: schema_1.logisticsVehicles.temperatureControlled,
        currentStatus: schema_1.logisticsVehicles.currentStatus,
        primaryBranchId: schema_1.logisticsVehicles.primaryBranchId,
        branchName: schema_1.branches.name,
        isActive: schema_1.logisticsVehicles.isActive,
        updatedAt: schema_1.logisticsVehicles.updatedAt,
    })
        .from(schema_1.logisticsVehicles)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.logisticsVehicles.primaryBranchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.logisticsVehicles.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.logisticsVehicles.isActive, true)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.logisticsVehicles.updatedAt));
};
exports.listVehiclesByTenant = listVehiclesByTenant;
const listActiveFleetDispatches = async (tenantId) => {
    return await db_1.db
        .select({
        id: schema_1.transferFleetDispatches.id,
        transferId: schema_1.transferFleetDispatches.transferId,
        transferNumber: schema_1.stockTransfers.transferNumber,
        dispatchStatus: schema_1.transferFleetDispatches.dispatchStatus,
        departureTime: schema_1.transferFleetDispatches.departureTime,
        arrivalTime: schema_1.transferFleetDispatches.arrivalTime,
        temperatureSetpointC: schema_1.transferFleetDispatches.temperatureSetpointC,
        plateNumber: schema_1.logisticsVehicles.plateNumber,
        driverName: schema_1.logisticsVehicles.driverName,
        driverPhone: schema_1.logisticsVehicles.driverPhone,
        sourceBranchName: (0, drizzle_orm_1.sql) `src_branch.name`,
        destBranchName: (0, drizzle_orm_1.sql) `dest_branch.name`,
    })
        .from(schema_1.transferFleetDispatches)
        .innerJoin(schema_1.logisticsVehicles, (0, drizzle_orm_1.eq)(schema_1.transferFleetDispatches.vehicleId, schema_1.logisticsVehicles.id))
        .innerJoin(schema_1.stockTransfers, (0, drizzle_orm_1.eq)(schema_1.transferFleetDispatches.transferId, schema_1.stockTransfers.id))
        .leftJoin((0, drizzle_orm_1.sql) `${schema_1.branches} as src_branch`, (0, drizzle_orm_1.sql) `src_branch.id = ${schema_1.stockTransfers.sourceBranchId}`)
        .leftJoin((0, drizzle_orm_1.sql) `${schema_1.branches} as dest_branch`, (0, drizzle_orm_1.sql) `dest_branch.id = ${schema_1.stockTransfers.destinationBranchId}`)
        .where((0, drizzle_orm_1.eq)(schema_1.transferFleetDispatches.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.transferFleetDispatches.createdAt))
        .limit(50);
};
exports.listActiveFleetDispatches = listActiveFleetDispatches;
const createVehicle = async (data) => {
    const [created] = await db_1.db
        .insert(schema_1.logisticsVehicles)
        .values({
        ...data,
        currentStatus: 'AVAILABLE',
        isActive: true,
    })
        .returning();
    return created;
};
exports.createVehicle = createVehicle;
const updateVehicleStatus = async (tenantId, vehicleId, status) => {
    const [updated] = await db_1.db
        .update(schema_1.logisticsVehicles)
        .set({ currentStatus: status, updatedAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.logisticsVehicles.id, vehicleId), (0, drizzle_orm_1.eq)(schema_1.logisticsVehicles.tenantId, tenantId)))
        .returning();
    return updated;
};
exports.updateVehicleStatus = updateVehicleStatus;
const dispatchVehicleForTransfer = async (tenantId, data) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Check & set vehicle status to IN_TRANSIT
        const [vehicle] = await tx
            .select()
            .from(schema_1.logisticsVehicles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.logisticsVehicles.id, data.vehicleId), (0, drizzle_orm_1.eq)(schema_1.logisticsVehicles.tenantId, tenantId)))
            .for('update');
        if (!vehicle)
            throw new Error('Vehicle not found.');
        if (vehicle.currentStatus === 'IN_TRANSIT')
            throw new Error('Vehicle is already assigned to an active route.');
        await tx
            .update(schema_1.logisticsVehicles)
            .set({ currentStatus: 'IN_TRANSIT', updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.logisticsVehicles.id, vehicle.id));
        // 2. Update stock transfer status to IN_TRANSIT
        await tx
            .update(schema_1.stockTransfers)
            .set({ status: 'IN_TRANSIT', updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockTransfers.id, data.transferId), (0, drizzle_orm_1.eq)(schema_1.stockTransfers.tenantId, tenantId)));
        // 3. Create dispatch record
        const [dispatch] = await tx
            .insert(schema_1.transferFleetDispatches)
            .values({
            tenantId,
            transferId: data.transferId,
            vehicleId: data.vehicleId,
            dispatchedById: data.dispatchedById,
            dispatchStatus: 'IN_TRANSIT',
            departureTime: new Date(),
            departureOdometerKm: data.departureOdometerKm || null,
            temperatureSetpointC: data.temperatureSetpointC || null,
            deliveryNotes: data.deliveryNotes || null,
        })
            .returning();
        return dispatch;
    });
};
exports.dispatchVehicleForTransfer = dispatchVehicleForTransfer;
