"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchVehicleForTransfer = exports.createVehicle = exports.listActiveFleetDispatches = exports.listVehiclesByTenant = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listVehiclesByTenant = async (tenantId) => {
    return await db_1.db
        .select({
        id: schema_1.logisticsFleet.id,
        vehiclePlate: schema_1.logisticsFleet.vehiclePlate,
        makeModel: schema_1.logisticsFleet.makeModel,
        vehicleType: schema_1.logisticsFleet.vehicleType,
        driverName: schema_1.logisticsFleet.driverName,
        driverPhone: schema_1.logisticsFleet.driverPhone,
        maxPayloadKg: schema_1.logisticsFleet.maxPayloadKg,
        isRefrigerated: schema_1.logisticsFleet.isRefrigerated,
        minTargetTemp: schema_1.logisticsFleet.minTargetTemp,
        maxTargetTemp: schema_1.logisticsFleet.maxTargetTemp,
        currentStatus: schema_1.logisticsFleet.currentStatus,
        branchId: schema_1.logisticsFleet.branchId,
        branchName: schema_1.branches.name,
        isActive: schema_1.logisticsFleet.isActive,
        updatedAt: schema_1.logisticsFleet.updatedAt,
    })
        .from(schema_1.logisticsFleet)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.logisticsFleet.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.logisticsFleet.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.logisticsFleet.isActive, true)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.logisticsFleet.updatedAt));
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
        dispatchTempProbe: schema_1.transferFleetDispatches.dispatchTempProbe,
        vehiclePlate: schema_1.logisticsFleet.vehiclePlate,
        driverName: schema_1.logisticsFleet.driverName,
        driverPhone: schema_1.logisticsFleet.driverPhone,
        sourceBranchName: (0, drizzle_orm_1.sql) `src_branch.name`,
        destBranchName: (0, drizzle_orm_1.sql) `dest_branch.name`,
    })
        .from(schema_1.transferFleetDispatches)
        .innerJoin(schema_1.logisticsFleet, (0, drizzle_orm_1.eq)(schema_1.transferFleetDispatches.fleetVehicleId, schema_1.logisticsFleet.id))
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
        .insert(schema_1.logisticsFleet)
        .values({
        tenantId: data.tenantId,
        branchId: data.branchId ?? null,
        vehiclePlate: data.vehiclePlate,
        makeModel: data.makeModel,
        vehicleType: data.vehicleType,
        driverName: data.driverName || null,
        driverPhone: data.driverPhone || null,
        maxPayloadKg: data.maxPayloadKg,
        isRefrigerated: data.isRefrigerated,
        minTargetTemp: data.minTargetTemp || null,
        maxTargetTemp: data.maxTargetTemp || null,
        currentStatus: 'AVAILABLE',
        isActive: true,
    })
        .returning();
    return created;
};
exports.createVehicle = createVehicle;
const dispatchVehicleForTransfer = async (tenantId, data) => {
    return await db_1.db.transaction(async (tx) => {
        const [vehicle] = await tx
            .select()
            .from(schema_1.logisticsFleet)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.logisticsFleet.id, data.fleetVehicleId), (0, drizzle_orm_1.eq)(schema_1.logisticsFleet.tenantId, tenantId)))
            .for('update');
        if (!vehicle)
            throw new Error('Vehicle not found.');
        if (vehicle.currentStatus === 'IN_TRANSIT') {
            throw new Error(`Vehicle ${vehicle.vehiclePlate} is already in transit on another route.`);
        }
        await tx
            .update(schema_1.logisticsFleet)
            .set({ currentStatus: 'IN_TRANSIT', updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.logisticsFleet.id, vehicle.id));
        await tx
            .update(schema_1.stockTransfers)
            .set({
            status: 'IN_TRANSIT',
            carrierVehiclePlate: vehicle.vehiclePlate,
            driverName: vehicle.driverName,
            dispatchTempProbe: data.dispatchTempProbe || null,
            dispatchedAt: new Date(),
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockTransfers.id, data.transferId), (0, drizzle_orm_1.eq)(schema_1.stockTransfers.tenantId, tenantId)));
        const [dispatch] = await tx
            .insert(schema_1.transferFleetDispatches)
            .values({
            tenantId,
            transferId: data.transferId,
            fleetVehicleId: data.fleetVehicleId,
            dispatchedById: data.dispatchedById,
            dispatchStatus: 'IN_TRANSIT',
            departureTime: new Date(),
            departureOdometerKm: data.departureOdometerKm || null,
            dispatchTempProbe: data.dispatchTempProbe || null,
            deliveryNotes: data.deliveryNotes || null,
        })
            .returning();
        return dispatch;
    });
};
exports.dispatchVehicleForTransfer = dispatchVehicleForTransfer;
