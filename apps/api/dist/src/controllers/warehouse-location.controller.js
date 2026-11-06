"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWarehouseLocation = exports.getWarehouseLocations = exports.createLocationSchema = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const zod_1 = require("zod");
exports.createLocationSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive('Branch is required'),
    code: zod_1.z.string().min(2, 'Bin code must be at least 2 characters').trim().toUpperCase(),
    name: zod_1.z.string().min(2, 'Location name is required').trim(),
    zoneType: zod_1.z.enum(['DRY_AMBIENT', 'CHILLED_2_8C', 'DEEP_FREEZE', 'PREP_LINE', 'HOLDING_PASS']).default('DRY_AMBIENT'),
    targetMinTemp: zod_1.z.coerce.number().optional().nullable(),
    targetMaxTemp: zod_1.z.coerce.number().optional().nullable(),
    isRefrigerated: zod_1.z.boolean().default(false),
});
// 1. Get all warehouse bins for active tenant & branch
const getWarehouseLocations = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const branchIdQuery = req.query.branchId ? Number(req.query.branchId) : req.user?.defaultBranchId;
        let conditions = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.warehouseLocations.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.warehouseLocations.isActive, true));
        if (branchIdQuery) {
            conditions = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.warehouseLocations.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.warehouseLocations.branchId, Number(branchIdQuery)), (0, drizzle_orm_1.eq)(schema_1.warehouseLocations.isActive, true));
        }
        const locations = await db_1.db
            .select({
            id: schema_1.warehouseLocations.id,
            branchId: schema_1.warehouseLocations.branchId,
            code: schema_1.warehouseLocations.code,
            name: schema_1.warehouseLocations.name,
            zoneType: schema_1.warehouseLocations.zoneType,
            targetMinTemp: schema_1.warehouseLocations.targetMinTemp,
            targetMaxTemp: schema_1.warehouseLocations.targetMaxTemp,
            isRefrigerated: schema_1.warehouseLocations.isRefrigerated,
        })
            .from(schema_1.warehouseLocations)
            .where(conditions)
            .orderBy(schema_1.warehouseLocations.code);
        res.status(200).json({ status: 'success', data: locations });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getWarehouseLocations = getWarehouseLocations;
// 2. Register New Bin Location
const createWarehouseLocation = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = exports.createLocationSchema.parse(req.body);
        const [location] = await db_1.db
            .insert(schema_1.warehouseLocations)
            .values({
            tenantId,
            branchId: payload.branchId,
            code: payload.code,
            name: payload.name,
            zoneType: payload.zoneType,
            targetMinTemp: payload.targetMinTemp !== undefined && payload.targetMinTemp !== null ? payload.targetMinTemp.toString() : null,
            targetMaxTemp: payload.targetMaxTemp !== undefined && payload.targetMaxTemp !== null ? payload.targetMaxTemp.toString() : null,
            isRefrigerated: payload.isRefrigerated,
        })
            .returning();
        res.status(201).json({ status: 'success', data: location });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.createWarehouseLocation = createWarehouseLocation;
