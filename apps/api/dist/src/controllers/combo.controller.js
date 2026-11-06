"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCombo = exports.createCombo = exports.getCombos = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const combo_validator_1 = require("../validators/combo.validator");
const getCombos = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const combos = await db_1.db
            .select()
            .from(schema_1.comboBundles)
            .where((0, drizzle_orm_1.eq)(schema_1.comboBundles.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.comboBundles.createdAt));
        if (combos.length === 0) {
            res.status(200).json({ status: 'success', data: [] });
            return;
        }
        const comboIds = combos.map((c) => c.id);
        const items = await db_1.db
            .select({
            id: schema_1.comboBundleItems.id,
            comboId: schema_1.comboBundleItems.comboId,
            menuItemId: schema_1.comboBundleItems.menuItemId,
            quantity: schema_1.comboBundleItems.quantity,
            additionalPrice: schema_1.comboBundleItems.additionalPrice,
            itemName: schema_1.menuItems.name,
            itemPrice: schema_1.menuItems.price,
        })
            .from(schema_1.comboBundleItems)
            .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.comboBundleItems.menuItemId, schema_1.menuItems.id))
            .where((0, drizzle_orm_1.inArray)(schema_1.comboBundleItems.comboId, comboIds));
        const result = combos.map((combo) => ({
            ...combo,
            items: items.filter((item) => item.comboId === combo.id),
        }));
        res.status(200).json({ status: 'success', data: result });
    }
    catch (error) {
        console.error('[Get Combos Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch combos' });
    }
};
exports.getCombos = getCombos;
const createCombo = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const defaultBranchId = req.user?.defaultBranchId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const validated = combo_validator_1.createComboBundleSchema.parse(req.body);
        const created = await db_1.db.transaction(async (tx) => {
            const [newCombo] = await tx
                .insert(schema_1.comboBundles)
                .values({
                tenantId,
                branchId: defaultBranchId || null,
                name: validated.name,
                description: validated.description,
                sku: validated.sku,
                basePrice: validated.basePrice.toFixed(2),
                isAvailable: validated.isAvailable,
            })
                .returning();
            const itemInserts = validated.items.map((i) => ({
                comboId: newCombo.id,
                menuItemId: i.menuItemId,
                quantity: i.quantity,
                additionalPrice: i.additionalPrice.toFixed(2),
            }));
            await tx.insert(schema_1.comboBundleItems).values(itemInserts);
            return newCombo;
        });
        res.status(201).json({ status: 'success', data: created });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        console.error('[Create Combo Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to create combo bundle' });
    }
};
exports.createCombo = createCombo;
const deleteCombo = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        await db_1.db
            .delete(schema_1.comboBundles)
            .where((0, drizzle_orm_1.eq)(schema_1.comboBundles.id, Number(id)));
        res.status(200).json({ status: 'success', message: 'Combo bundle deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.deleteCombo = deleteCombo;
