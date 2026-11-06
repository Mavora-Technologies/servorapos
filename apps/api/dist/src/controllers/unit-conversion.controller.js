"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUnitConversion = exports.createUnitConversion = exports.getUnitConversions = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const unit_conversion_validator_1 = require("../validators/unit-conversion.validator");
const getUnitConversions = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const conversions = await db_1.db
            .select({
            id: schema_1.unitConversions.id,
            tenantId: schema_1.unitConversions.tenantId,
            fromUnit: schema_1.unitConversions.fromUnit,
            toUnit: schema_1.unitConversions.toUnit,
            conversionFactor: schema_1.unitConversions.conversionFactor,
            inventoryItemId: schema_1.unitConversions.inventoryItemId,
            inventoryItemName: schema_1.inventoryItems.name,
            unitCategory: schema_1.unitConversions.unitCategory,
            description: schema_1.unitConversions.description,
            isDefault: schema_1.unitConversions.isDefault,
            createdAt: schema_1.unitConversions.createdAt,
        })
            .from(schema_1.unitConversions)
            .leftJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.unitConversions.inventoryItemId, schema_1.inventoryItems.id))
            .where((0, drizzle_orm_1.eq)(schema_1.unitConversions.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.unitConversions.id));
        res.status(200).json({ status: 'success', data: conversions });
    }
    catch (error) {
        console.error('[Get Unit Conversions Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch unit conversions' });
    }
};
exports.getUnitConversions = getUnitConversions;
const createUnitConversion = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const validated = unit_conversion_validator_1.createUnitConversionSchema.parse(req.body);
        const [created] = await db_1.db
            .insert(schema_1.unitConversions)
            .values({
            tenantId,
            fromUnit: validated.fromUnit,
            toUnit: validated.toUnit,
            conversionFactor: validated.conversionFactor.toFixed(4),
            inventoryItemId: validated.inventoryItemId || null,
            unitCategory: validated.unitCategory,
            description: validated.description || null,
        })
            .returning();
        res.status(201).json({ status: 'success', data: created });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.createUnitConversion = createUnitConversion;
const deleteUnitConversion = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        await db_1.db
            .delete(schema_1.unitConversions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.unitConversions.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.unitConversions.tenantId, tenantId)));
        res.status(200).json({ status: 'success', message: 'Conversion rule removed' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.deleteUnitConversion = deleteUnitConversion;
