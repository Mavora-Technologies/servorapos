import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { logisticsFleet, transferFleetDispatches, stockTransfers, branches } from '../config/schema';

export const listVehiclesByTenant = async (tenantId: number) => {
  return await db
    .select({
      id: logisticsFleet.id,
      vehiclePlate: logisticsFleet.vehiclePlate,
      makeModel: logisticsFleet.makeModel,
      vehicleType: logisticsFleet.vehicleType,
      driverName: logisticsFleet.driverName,
      driverPhone: logisticsFleet.driverPhone,
      maxPayloadKg: logisticsFleet.maxPayloadKg,
      isRefrigerated: logisticsFleet.isRefrigerated,
      minTargetTemp: logisticsFleet.minTargetTemp,
      maxTargetTemp: logisticsFleet.maxTargetTemp,
      currentStatus: logisticsFleet.currentStatus,
      branchId: logisticsFleet.branchId,
      branchName: branches.name,
      isActive: logisticsFleet.isActive,
      updatedAt: logisticsFleet.updatedAt,
    })
    .from(logisticsFleet)
    .leftJoin(branches, eq(logisticsFleet.branchId, branches.id))
    .where(and(eq(logisticsFleet.tenantId, tenantId), eq(logisticsFleet.isActive, true)))
    .orderBy(desc(logisticsFleet.updatedAt));
};

export const listActiveFleetDispatches = async (tenantId: number) => {
  return await db
    .select({
      id: transferFleetDispatches.id,
      transferId: transferFleetDispatches.transferId,
      transferNumber: stockTransfers.transferNumber,
      dispatchStatus: transferFleetDispatches.dispatchStatus,
      departureTime: transferFleetDispatches.departureTime,
      arrivalTime: transferFleetDispatches.arrivalTime,
      dispatchTempProbe: transferFleetDispatches.dispatchTempProbe,
      vehiclePlate: logisticsFleet.vehiclePlate,
      driverName: logisticsFleet.driverName,
      driverPhone: logisticsFleet.driverPhone,
      sourceBranchName: sql<string>`src_branch.name`,
      destBranchName: sql<string>`dest_branch.name`,
    })
    .from(transferFleetDispatches)
    .innerJoin(logisticsFleet, eq(transferFleetDispatches.fleetVehicleId, logisticsFleet.id))
    .innerJoin(stockTransfers, eq(transferFleetDispatches.transferId, stockTransfers.id))
    .leftJoin(sql`${branches} as src_branch`, sql`src_branch.id = ${stockTransfers.sourceBranchId}`)
    .leftJoin(sql`${branches} as dest_branch`, sql`dest_branch.id = ${stockTransfers.destinationBranchId}`)
    .where(eq(transferFleetDispatches.tenantId, tenantId))
    .orderBy(desc(transferFleetDispatches.createdAt))
    .limit(50);
};

export const createVehicle = async (data: {
  tenantId: number;
  branchId?: number | null;
  vehiclePlate: string;
  makeModel: string;
  vehicleType: string;
  driverName?: string;
  driverPhone?: string;
  maxPayloadKg: string;
  isRefrigerated: boolean;
  minTargetTemp?: string;
  maxTargetTemp?: string;
}) => {
  const [created] = await db
    .insert(logisticsFleet)
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

export const dispatchVehicleForTransfer = async (
  tenantId: number,
  data: {
    transferId: number;
    fleetVehicleId: number;
    dispatchedById: number;
    departureOdometerKm?: string;
    dispatchTempProbe?: string;
    deliveryNotes?: string;
  }
) => {
  return await db.transaction(async (tx) => {
    const [vehicle] = await tx
      .select()
      .from(logisticsFleet)
      .where(and(eq(logisticsFleet.id, data.fleetVehicleId), eq(logisticsFleet.tenantId, tenantId)))
      .for('update');

    if (!vehicle) throw new Error('Vehicle not found.');
    if (vehicle.currentStatus === 'IN_TRANSIT') {
      throw new Error(`Vehicle ${vehicle.vehiclePlate} is already in transit on another route.`);
    }

    await tx
      .update(logisticsFleet)
      .set({ currentStatus: 'IN_TRANSIT', updatedAt: new Date() })
      .where(eq(logisticsFleet.id, vehicle.id));

    await tx
      .update(stockTransfers)
      .set({ 
        status: 'IN_TRANSIT', 
        carrierVehiclePlate: vehicle.vehiclePlate,
        driverName: vehicle.driverName,
        dispatchTempProbe: data.dispatchTempProbe || null,
        dispatchedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(and(eq(stockTransfers.id, data.transferId), eq(stockTransfers.tenantId, tenantId)));

    const [dispatch] = await tx
      .insert(transferFleetDispatches)
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