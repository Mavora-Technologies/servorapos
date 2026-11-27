"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComboRecord = exports.updateComboTransaction = exports.createComboTransaction = exports.findCombosByTenant = exports.isComboImagePublicIdReferenced = void 0;
// apps/api/src/repositories/combo.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const cloudinary_1 = require("../utils/cloudinary");
function roundMoney(v) {
    return Math.round((v + Number.EPSILON) * 100) / 100;
}
const isComboImagePublicIdReferenced = async (tenantId, publicId) => {
    const [row] = await db_1.db
        .select({ id: schema_1.comboBundles.id })
        .from(schema_1.comboBundles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.comboBundles.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.comboBundles.imagePublicId, publicId)))
        .limit(1);
    return Boolean(row);
};
exports.isComboImagePublicIdReferenced = isComboImagePublicIdReferenced;
const findCombosByTenant = async (tenantId, options) => {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.comboBundles.tenantId, tenantId)];
    if (options?.branchId) {
        const branchScope = (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.comboBundles.branchId, options.branchId), (0, drizzle_orm_1.isNull)(schema_1.comboBundles.branchId));
        if (branchScope)
            conditions.push(branchScope);
    }
    if (options?.activeOnly) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.comboBundles.isAvailable, true));
    }
    const combos = await db_1.db
        .select()
        .from(schema_1.comboBundles)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.comboBundles.updatedAt), (0, drizzle_orm_1.desc)(schema_1.comboBundles.id));
    if (combos.length === 0) {
        return [];
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
        itemIsAvailable: schema_1.menuItems.isAvailable,
        itemImageUrl: schema_1.menuItems.imageUrl,
    })
        .from(schema_1.comboBundleItems)
        .innerJoin(schema_1.menuItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.comboBundleItems.menuItemId, schema_1.menuItems.id), (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)))
        .where((0, drizzle_orm_1.inArray)(schema_1.comboBundleItems.comboId, comboIds));
    const now = new Date();
    const mapped = combos.map((combo) => {
        const comboItems = items.filter((item) => item.comboId === combo.id);
        const standaloneTotal = roundMoney(comboItems.reduce((sum, line) => {
            const unitPrice = parseFloat(line.itemPrice || '0') || 0;
            const addPrice = parseFloat(line.additionalPrice || '0') || 0;
            return sum + (unitPrice + addPrice) * line.quantity;
        }, 0));
        const bundlePrice = roundMoney(parseFloat(combo.basePrice) || 0);
        const savingsAmount = roundMoney(standaloneTotal - bundlePrice);
        const savingsPercent = standaloneTotal > 0 ? roundMoney((savingsAmount / standaloneTotal) * 100) : 0;
        const pricingMode = savingsAmount > 0.005 ? 'DISCOUNTED' : savingsAmount < -0.005 ? 'PREMIUM' : 'EXACT';
        const unavailableComponents = comboItems
            .filter((i) => i.itemIsAvailable === false)
            .map((i) => i.itemName || `Item #${i.menuItemId}`);
        const afterStart = !combo.validFrom || new Date(combo.validFrom) <= now;
        const beforeEnd = !combo.validUntil || new Date(combo.validUntil) >= now;
        const isWithinSchedule = afterStart && beforeEnd;
        const effectiveAvailable = combo.isAvailable &&
            comboItems.length > 0 &&
            unavailableComponents.length === 0 &&
            isWithinSchedule;
        return {
            ...combo,
            imageCardUrl: (0, cloudinary_1.buildOptimizedCloudinaryUrl)(combo.imageUrl, 400, 300),
            imageThumbUrl: (0, cloudinary_1.buildOptimizedCloudinaryUrl)(combo.imageUrl, 96, 96),
            standaloneTotal,
            savingsAmount,
            savingsPercent,
            pricingMode,
            unavailableComponents,
            isWithinSchedule,
            effectiveAvailable,
            items: comboItems,
        };
    });
    return options?.activeOnly ? mapped.filter((c) => c.effectiveAvailable) : mapped;
};
exports.findCombosByTenant = findCombosByTenant;
const createComboTransaction = async (tenantId, branchId, payload, actor) => {
    return await db_1.db.transaction(async (tx) => {
        if (payload.sku) {
            const [dupSku] = await tx
                .select({ id: schema_1.comboBundles.id })
                .from(schema_1.comboBundles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.comboBundles.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.comboBundles.sku, payload.sku)));
            if (dupSku) {
                throw new Error(`SKU "${payload.sku}" is already assigned to another combo bundle.`);
            }
        }
        if (payload.imagePublicId) {
            (0, cloudinary_1.assertPublicIdBelongsToTenant)(tenantId, payload.imagePublicId);
        }
        const uniqueMenuItemIds = Array.from(new Set(payload.items.map((i) => i.menuItemId)));
        const matchedMenuItems = await tx
            .select({ id: schema_1.menuItems.id })
            .from(schema_1.menuItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.menuItems.id, uniqueMenuItemIds)));
        if (matchedMenuItems.length !== uniqueMenuItemIds.length) {
            throw new Error('One or more selected menu items do not exist or do not belong to this tenant.');
        }
        // Consolidate duplicate component entries safely
        const mergedByItem = new Map();
        for (const item of payload.items) {
            const prev = mergedByItem.get(item.menuItemId);
            if (prev) {
                prev.quantity += item.quantity;
                prev.additionalPrice = Math.max(prev.additionalPrice, item.additionalPrice);
            }
            else {
                mergedByItem.set(item.menuItemId, {
                    quantity: item.quantity,
                    additionalPrice: item.additionalPrice,
                });
            }
        }
        const [newCombo] = await tx
            .insert(schema_1.comboBundles)
            .values({
            tenantId,
            branchId: payload.branchId !== undefined ? payload.branchId : branchId,
            name: payload.name,
            description: payload.description ?? null,
            sku: payload.sku ?? null,
            basePrice: payload.basePrice.toFixed(2),
            isAvailable: payload.isAvailable,
            validFrom: payload.validFrom ? new Date(payload.validFrom) : null,
            validUntil: payload.validUntil ? new Date(payload.validUntil) : null,
            imageUrl: payload.imageUrl ?? null,
            imagePublicId: payload.imageUrl ? (payload.imagePublicId ?? null) : null,
            imageOriginalFilename: payload.imageUrl ? (payload.imageOriginalFilename ?? null) : null,
            imageMimeType: payload.imageUrl ? (payload.imageMimeType ?? null) : null,
            imageFileSize: payload.imageUrl ? (payload.imageFileSize ?? null) : null,
            imageUploadedAt: payload.imageUrl ? new Date() : null,
        })
            .returning();
        await tx.insert(schema_1.comboBundleItems).values(Array.from(mergedByItem.entries()).map(([menuItemId, line]) => ({
            comboId: newCombo.id,
            menuItemId,
            quantity: line.quantity,
            additionalPrice: line.additionalPrice.toFixed(2),
        })));
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: newCombo.branchId,
            userId: actor.userId,
            action: 'COMBO_BUNDLE_CREATED',
            module: 'MENU_CATALOG',
            entityType: 'combo_bundles',
            entityId: String(newCombo.id),
            newValues: {
                name: newCombo.name,
                basePrice: newCombo.basePrice,
                componentCount: mergedByItem.size,
            },
            ipAddress: actor.ipAddress ?? null,
        });
        return newCombo;
    });
};
exports.createComboTransaction = createComboTransaction;
const updateComboTransaction = async (tenantId, comboId, payload, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.comboBundles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.comboBundles.id, comboId), (0, drizzle_orm_1.eq)(schema_1.comboBundles.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
        if (payload.sku) {
            const [dupSku] = await tx
                .select({ id: schema_1.comboBundles.id })
                .from(schema_1.comboBundles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.comboBundles.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.comboBundles.sku, payload.sku), (0, drizzle_orm_1.ne)(schema_1.comboBundles.id, comboId)));
            if (dupSku) {
                throw new Error(`SKU "${payload.sku}" is already assigned to another combo bundle.`);
            }
        }
        if (payload.imagePublicId) {
            (0, cloudinary_1.assertPublicIdBelongsToTenant)(tenantId, payload.imagePublicId);
        }
        const updateFields = {
            updatedAt: new Date(),
        };
        if (payload.name !== undefined)
            updateFields.name = payload.name;
        if (payload.description !== undefined)
            updateFields.description = payload.description;
        if (payload.sku !== undefined)
            updateFields.sku = payload.sku;
        if (payload.branchId !== undefined)
            updateFields.branchId = payload.branchId;
        if (payload.basePrice !== undefined)
            updateFields.basePrice = payload.basePrice.toFixed(2);
        if (payload.isAvailable !== undefined)
            updateFields.isAvailable = payload.isAvailable;
        if (payload.validFrom !== undefined) {
            updateFields.validFrom = payload.validFrom ? new Date(payload.validFrom) : null;
        }
        if (payload.validUntil !== undefined) {
            updateFields.validUntil = payload.validUntil ? new Date(payload.validUntil) : null;
        }
        if (payload.imageUrl !== undefined) {
            updateFields.imageUrl = payload.imageUrl;
            if (payload.imageUrl === null) {
                updateFields.imagePublicId = null;
                updateFields.imageOriginalFilename = null;
                updateFields.imageMimeType = null;
                updateFields.imageFileSize = null;
                updateFields.imageUploadedAt = null;
            }
            else {
                if (payload.imagePublicId !== undefined) {
                    updateFields.imagePublicId = payload.imagePublicId;
                }
                if (payload.imageOriginalFilename !== undefined) {
                    updateFields.imageOriginalFilename = payload.imageOriginalFilename;
                }
                if (payload.imageMimeType !== undefined) {
                    updateFields.imageMimeType = payload.imageMimeType;
                }
                if (payload.imageFileSize !== undefined) {
                    updateFields.imageFileSize = payload.imageFileSize;
                }
                if (payload.imageUrl !== existing.imageUrl) {
                    updateFields.imageUploadedAt = new Date();
                }
            }
        }
        if (payload.items !== undefined) {
            if (payload.items.length === 0) {
                throw new Error('A combo bundle must include at least one menu item.');
            }
            const uniqueMenuItemIds = Array.from(new Set(payload.items.map((i) => i.menuItemId)));
            const matchedMenuItems = await tx
                .select({ id: schema_1.menuItems.id })
                .from(schema_1.menuItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.menuItems.id, uniqueMenuItemIds)));
            if (matchedMenuItems.length !== uniqueMenuItemIds.length) {
                throw new Error('One or more selected menu items do not exist or do not belong to this tenant.');
            }
            const mergedByItem = new Map();
            for (const item of payload.items) {
                const prev = mergedByItem.get(item.menuItemId);
                if (prev) {
                    prev.quantity += item.quantity;
                    prev.additionalPrice = Math.max(prev.additionalPrice, item.additionalPrice);
                }
                else {
                    mergedByItem.set(item.menuItemId, {
                        quantity: item.quantity,
                        additionalPrice: item.additionalPrice,
                    });
                }
            }
            await tx.delete(schema_1.comboBundleItems).where((0, drizzle_orm_1.eq)(schema_1.comboBundleItems.comboId, comboId));
            await tx.insert(schema_1.comboBundleItems).values(Array.from(mergedByItem.entries()).map(([menuItemId, line]) => ({
                comboId,
                menuItemId,
                quantity: line.quantity,
                additionalPrice: line.additionalPrice.toFixed(2),
            })));
        }
        const [updated] = await tx
            .update(schema_1.comboBundles)
            .set(updateFields)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.comboBundles.id, comboId), (0, drizzle_orm_1.eq)(schema_1.comboBundles.tenantId, tenantId)))
            .returning();
        if (!updated)
            return null;
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: updated.branchId,
            userId: actor.userId,
            action: 'COMBO_BUNDLE_UPDATED',
            module: 'MENU_CATALOG',
            entityType: 'combo_bundles',
            entityId: String(updated.id),
            previousValues: { basePrice: existing.basePrice, isAvailable: existing.isAvailable },
            newValues: { basePrice: updated.basePrice, isAvailable: updated.isAvailable },
            ipAddress: actor.ipAddress ?? null,
        });
        return {
            combo: updated,
            previousImagePublicId: existing.imagePublicId,
        };
    });
};
exports.updateComboTransaction = updateComboTransaction;
const deleteComboRecord = async (tenantId, comboId, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [deleted] = await tx
            .delete(schema_1.comboBundles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.comboBundles.id, comboId), (0, drizzle_orm_1.eq)(schema_1.comboBundles.tenantId, tenantId)))
            .returning({
            id: schema_1.comboBundles.id,
            name: schema_1.comboBundles.name,
            branchId: schema_1.comboBundles.branchId,
            imagePublicId: schema_1.comboBundles.imagePublicId,
        });
        if (!deleted)
            return null;
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: deleted.branchId,
            userId: actor.userId,
            action: 'COMBO_BUNDLE_DELETED',
            module: 'MENU_CATALOG',
            entityType: 'combo_bundles',
            entityId: String(deleted.id),
            previousValues: { name: deleted.name },
            ipAddress: actor.ipAddress ?? null,
        });
        return deleted;
    });
};
exports.deleteComboRecord = deleteComboRecord;
