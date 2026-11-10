"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBin = exports.createZone = exports.listWarehouseTopology = void 0;
// apps/api/src/repositories/inventory-locations.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listWarehouseTopology = async (tenantId) => {
    // 1. Fetch zones with left-joined branch names (immune to GROUP BY errors)
    const rawZones = await db_1.db
        .select({
        id: schema_1.warehouseZones.id,
        zoneCode: schema_1.warehouseZones.zoneCode,
        name: schema_1.warehouseZones.name,
        zoneType: schema_1.warehouseZones.zoneType,
        temperatureMinC: schema_1.warehouseZones.temperatureMinC,
        temperatureMaxC: schema_1.warehouseZones.temperatureMaxC,
        isActive: schema_1.warehouseZones.isActive,
        branchId: schema_1.warehouseZones.branchId,
        branchName: schema_1.branches.name,
        updatedAt: schema_1.warehouseZones.updatedAt,
        createdAt: schema_1.warehouseZones.createdAt,
    })
        .from(schema_1.warehouseZones)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.warehouseZones.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.eq)(schema_1.warehouseZones.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.warehouseZones.createdAt));
    // 2. Fetch all active bins for the tenant
    const allBins = await db_1.db
        .select({
        id: schema_1.warehouseBins.id,
        binCode: schema_1.warehouseBins.binCode,
        barcode: schema_1.warehouseBins.barcode,
        binType: schema_1.warehouseBins.binType,
        pickSequence: schema_1.warehouseBins.pickSequence,
        maxWeightKg: schema_1.warehouseBins.maxWeightKg,
        maxVolumeCbm: schema_1.warehouseBins.maxVolumeCbm,
        isQuarantine: schema_1.warehouseBins.isQuarantine,
        isOccupied: schema_1.warehouseBins.isOccupied,
        isActive: schema_1.warehouseBins.isActive,
        zoneId: schema_1.warehouseBins.zoneId,
        zoneCode: schema_1.warehouseZones.zoneCode,
        zoneName: schema_1.warehouseZones.name,
        branchId: schema_1.warehouseZones.branchId,
        branchName: schema_1.branches.name,
    })
        .from(schema_1.warehouseBins)
        .innerJoin(schema_1.warehouseZones, (0, drizzle_orm_1.eq)(schema_1.warehouseBins.zoneId, schema_1.warehouseZones.id))
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.warehouseZones.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.warehouseBins.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.warehouseBins.isActive, true)))
        .orderBy(schema_1.warehouseBins.pickSequence);
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
exports.listWarehouseTopology = listWarehouseTopology;
const createZone = async (data) => {
    const [created] = await db_1.db
        .insert(schema_1.warehouseZones)
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
exports.createZone = createZone;
const createBin = async (data) => {
    const [created] = await db_1.db
        .insert(schema_1.warehouseBins)
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
exports.createBin = createBin;
