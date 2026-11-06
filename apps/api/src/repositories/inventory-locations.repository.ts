// apps/api/src/repositories/inventory-locations.repository.ts
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/db';
import { warehouseZones, warehouseBins, branches } from '../config/schema';

export const listWarehouseTopology = async (tenantId: number) => {
  // 1. Fetch zones with left-joined branch names (immune to GROUP BY errors)
  const rawZones = await db
    .select({
      id: warehouseZones.id,
      zoneCode: warehouseZones.zoneCode,
      name: warehouseZones.name,
      zoneType: warehouseZones.zoneType,
      temperatureMinC: warehouseZones.temperatureMinC,
      temperatureMaxC: warehouseZones.temperatureMaxC,
      isActive: warehouseZones.isActive,
      branchId: warehouseZones.branchId,
      branchName: branches.name,
      updatedAt: warehouseZones.updatedAt,
      createdAt: warehouseZones.createdAt,
    })
    .from(warehouseZones)
    .leftJoin(branches, eq(warehouseZones.branchId, branches.id))
    .where(eq(warehouseZones.tenantId, tenantId))
    .orderBy(desc(warehouseZones.createdAt));

  // 2. Fetch all active bins for the tenant
  const allBins = await db
    .select({
      id: warehouseBins.id,
      binCode: warehouseBins.binCode,
      barcode: warehouseBins.barcode,
      binType: warehouseBins.binType,
      pickSequence: warehouseBins.pickSequence,
      maxWeightKg: warehouseBins.maxWeightKg,
      maxVolumeCbm: warehouseBins.maxVolumeCbm,
      isQuarantine: warehouseBins.isQuarantine,
      isOccupied: warehouseBins.isOccupied,
      isActive: warehouseBins.isActive,
      zoneId: warehouseBins.zoneId,
      zoneCode: warehouseZones.zoneCode,
      zoneName: warehouseZones.name,
      branchId: warehouseZones.branchId,
      branchName: branches.name,
    })
    .from(warehouseBins)
    .innerJoin(warehouseZones, eq(warehouseBins.zoneId, warehouseZones.id))
    .leftJoin(branches, eq(warehouseZones.branchId, branches.id))
    .where(and(eq(warehouseBins.tenantId, tenantId), eq(warehouseBins.isActive, true)))
    .orderBy(warehouseBins.pickSequence);

  // 3. Map bin densities in-memory
  const zones = rawZones.map((z) => {
    const zoneBins = allBins.filter((b) => b.zoneId === z.id);
    return {
      ...z,
      branchName: z.branchName || 'Central Hub',
      binCount: zoneBins.length,
      occupiedBinCount: zoneBins.filter((b) => b.isOccupied).length,
    };
  });

  return { zones, bins: allBins };
};

export const createZone = async (data: {
  tenantId: number;
  branchId: number;
  zoneCode: string;
  name: string;
  zoneType: string;
  temperatureMinC?: string;
  temperatureMaxC?: string;
}) => {
  const [created] = await db
    .insert(warehouseZones)
    .values({
      tenantId: data.tenantId,
      branchId: data.branchId,
      zoneCode: data.zoneCode.toUpperCase().trim(),
      name: data.name.trim(),
      zoneType: data.zoneType,
      temperatureMinC: data.temperatureMinC ? parseFloat(data.temperatureMinC).toFixed(2) : null,
      temperatureMaxC: data.temperatureMaxC ? parseFloat(data.temperatureMaxC).toFixed(2) : null,
    })
    .returning();
  return created;
};

export const createBin = async (data: {
  tenantId: number;
  zoneId: number;
  binCode: string;
  barcode?: string;
  binType: string;
  pickSequence?: number;
  maxWeightKg?: string;
  maxVolumeCbm?: string;
  isQuarantine?: boolean;
}) => {
  const [created] = await db
    .insert(warehouseBins)
    .values({
      tenantId: data.tenantId,
      zoneId: data.zoneId,
      binCode: data.binCode.toUpperCase().trim(),
      barcode: data.barcode || `BIN-${data.binCode.toUpperCase().trim()}`,
      binType: data.binType || 'STANDARD_SHELF',
      pickSequence: data.pickSequence ?? 10,
      maxWeightKg: data.maxWeightKg ? parseFloat(data.maxWeightKg).toFixed(2) : '500.00',
      maxVolumeCbm: data.maxVolumeCbm ? parseFloat(data.maxVolumeCbm).toFixed(3) : '1.500',
      isQuarantine: Boolean(data.isQuarantine),
      isOccupied: false,
    })
    .returning();
  return created;
};