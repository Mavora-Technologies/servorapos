"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteModifierGroup = exports.createModifierGroup = exports.getModifiers = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const modifier_validator_1 = require("../validators/modifier.validator");
const getModifiers = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const groups = await db_1.db
            .select()
            .from(schema_1.modifierGroups)
            .where((0, drizzle_orm_1.eq)(schema_1.modifierGroups.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.modifierGroups.createdAt));
        const groupIds = groups.map((g) => g.id);
        const allOptions = groupIds.length > 0
            ? await db_1.db.select().from(schema_1.modifierOptions)
            : [];
        const result = groups.map((group) => ({
            ...group,
            options: allOptions.filter((opt) => opt.modifierGroupId === group.id),
        }));
        res.status(200).json({ status: 'success', data: result });
    }
    catch (error) {
        console.error('[Modifiers Controller Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch modifiers' });
    }
};
exports.getModifiers = getModifiers;
const createModifierGroup = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const validated = modifier_validator_1.createModifierGroupSchema.parse(req.body);
        const createdGroup = await db_1.db.transaction(async (tx) => {
            const [group] = await tx
                .insert(schema_1.modifierGroups)
                .values({
                tenantId,
                name: validated.name,
                description: validated.description,
                minSelections: validated.minSelections,
                maxSelections: validated.maxSelections,
                isRequired: validated.isRequired,
            })
                .returning();
            const optionInserts = validated.options.map((opt) => ({
                modifierGroupId: group.id,
                name: opt.name,
                priceAdjustment: opt.priceAdjustment.toFixed(2),
                isDefault: opt.isDefault,
                isAvailable: opt.isAvailable,
            }));
            const options = await tx.insert(schema_1.modifierOptions).values(optionInserts).returning();
            return { ...group, options };
        });
        res.status(201).json({ status: 'success', data: createdGroup });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        console.error('[Create Modifier Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to create modifier group' });
    }
};
exports.createModifierGroup = createModifierGroup;
const deleteModifierGroup = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        await db_1.db
            .delete(schema_1.modifierGroups)
            .where((0, drizzle_orm_1.eq)(schema_1.modifierGroups.id, Number(id)));
        res.status(200).json({ status: 'success', message: 'Modifier group deleted' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.deleteModifierGroup = deleteModifierGroup;
