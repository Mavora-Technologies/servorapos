"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleSupplierStatus = exports.updateSupplier = exports.createSupplier = exports.getSuppliers = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const supplier_validator_1 = require("../validators/supplier.validator");
// 1. Get all suppliers with linked active item counts
const getSuppliers = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const supplierRecords = await db_1.db
            .select({
            id: schema_1.suppliers.id,
            name: schema_1.suppliers.name,
            contactPerson: schema_1.suppliers.contactPerson,
            phone: schema_1.suppliers.phone,
            email: schema_1.suppliers.email,
            kraPin: schema_1.suppliers.kraPin,
            physicalAddress: schema_1.suppliers.physicalAddress,
            city: schema_1.suppliers.city,
            paymentTerms: schema_1.suppliers.paymentTerms,
            leadTimeDays: schema_1.suppliers.leadTimeDays,
            bankName: schema_1.suppliers.bankName,
            bankAccountNumber: schema_1.suppliers.bankAccountNumber,
            mpesaPaybillNumber: schema_1.suppliers.mpesaPaybillNumber,
            notes: schema_1.suppliers.notes,
            isActive: schema_1.suppliers.isActive,
            createdAt: schema_1.suppliers.createdAt,
        })
            .from(schema_1.suppliers)
            .where((0, drizzle_orm_1.eq)(schema_1.suppliers.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.suppliers.createdAt));
        // Calculate linked items per supplier
        const itemCounts = await db_1.db
            .select({
            supplierId: schema_1.inventoryItems.preferredSupplierId,
            count: (0, drizzle_orm_1.count)(schema_1.inventoryItems.id),
        })
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.isActive, true)))
            .groupBy(schema_1.inventoryItems.preferredSupplierId);
        const countMap = new Map();
        itemCounts.forEach((c) => {
            if (c.supplierId) {
                countMap.set(c.supplierId, Number(c.count));
            }
        });
        const enriched = supplierRecords.map((s) => ({
            ...s,
            linkedItemsCount: countMap.get(s.id) || 0,
        }));
        res.status(200).json({ status: 'success', data: enriched });
    }
    catch (error) {
        console.error('[Get Suppliers Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch suppliers' });
    }
};
exports.getSuppliers = getSuppliers;
// 2. Create Supplier
const createSupplier = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = supplier_validator_1.createSupplierSchema.parse(req.body);
        const [supplier] = await db_1.db
            .insert(schema_1.suppliers)
            .values({
            tenantId,
            name: payload.name,
            contactPerson: payload.contactPerson || null,
            phone: payload.phone || null,
            email: payload.email || null,
            kraPin: payload.kraPin ? payload.kraPin.toUpperCase() : null,
            physicalAddress: payload.physicalAddress || null,
            city: payload.city || 'Nairobi',
            paymentTerms: payload.paymentTerms,
            leadTimeDays: payload.leadTimeDays,
            bankName: payload.bankName || null,
            bankAccountNumber: payload.bankAccountNumber || null,
            mpesaPaybillNumber: payload.mpesaPaybillNumber || null,
            notes: payload.notes || null,
            isActive: payload.isActive,
        })
            .returning();
        res.status(201).json({ status: 'success', data: supplier });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.createSupplier = createSupplier;
// 3. Update Supplier
const updateSupplier = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = supplier_validator_1.updateSupplierSchema.parse(req.body);
        const [existing] = await db_1.db
            .select({ id: schema_1.suppliers.id })
            .from(schema_1.suppliers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.suppliers.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.suppliers.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            res.status(404).json({ status: 'error', message: 'Supplier profile not found' });
            return;
        }
        const updateFields = { updatedAt: new Date() };
        if (payload.name !== undefined)
            updateFields.name = payload.name;
        if (payload.contactPerson !== undefined)
            updateFields.contactPerson = payload.contactPerson;
        if (payload.phone !== undefined)
            updateFields.phone = payload.phone;
        if (payload.email !== undefined)
            updateFields.email = payload.email || null;
        if (payload.kraPin !== undefined)
            updateFields.kraPin = payload.kraPin ? payload.kraPin.toUpperCase() : null;
        if (payload.physicalAddress !== undefined)
            updateFields.physicalAddress = payload.physicalAddress;
        if (payload.city !== undefined)
            updateFields.city = payload.city;
        if (payload.paymentTerms !== undefined)
            updateFields.paymentTerms = payload.paymentTerms;
        if (payload.leadTimeDays !== undefined)
            updateFields.leadTimeDays = payload.leadTimeDays;
        if (payload.bankName !== undefined)
            updateFields.bankName = payload.bankName;
        if (payload.bankAccountNumber !== undefined)
            updateFields.bankAccountNumber = payload.bankAccountNumber;
        if (payload.mpesaPaybillNumber !== undefined)
            updateFields.mpesaPaybillNumber = payload.mpesaPaybillNumber;
        if (payload.notes !== undefined)
            updateFields.notes = payload.notes;
        if (payload.isActive !== undefined)
            updateFields.isActive = payload.isActive;
        const [updated] = await db_1.db
            .update(schema_1.suppliers)
            .set(updateFields)
            .where((0, drizzle_orm_1.eq)(schema_1.suppliers.id, existing.id))
            .returning();
        res.status(200).json({ status: 'success', data: updated });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.updateSupplier = updateSupplier;
// 4. Toggle Active Status
const toggleSupplierStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const [existing] = await db_1.db
            .select({ id: schema_1.suppliers.id, isActive: schema_1.suppliers.isActive })
            .from(schema_1.suppliers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.suppliers.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.suppliers.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            res.status(404).json({ status: 'error', message: 'Supplier not found' });
            return;
        }
        const [updated] = await db_1.db
            .update(schema_1.suppliers)
            .set({ isActive: !existing.isActive, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.suppliers.id, existing.id))
            .returning();
        res.status(200).json({
            status: 'success',
            message: `Supplier ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
            data: updated,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.toggleSupplierStatus = toggleSupplierStatus;
