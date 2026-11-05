import { Response } from 'express';
import { eq, desc, and, count } from 'drizzle-orm';
import { db } from '../config/db';
import { suppliers, inventoryItems } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { createSupplierSchema, updateSupplierSchema } from '../validators/supplier.validator';

// 1. Get all suppliers with linked active item counts
export const getSuppliers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const supplierRecords = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        contactPerson: suppliers.contactPerson,
        phone: suppliers.phone,
        email: suppliers.email,
        kraPin: suppliers.kraPin,
        physicalAddress: suppliers.physicalAddress,
        city: suppliers.city,
        paymentTerms: suppliers.paymentTerms,
        leadTimeDays: suppliers.leadTimeDays,
        bankName: suppliers.bankName,
        bankAccountNumber: suppliers.bankAccountNumber,
        mpesaPaybillNumber: suppliers.mpesaPaybillNumber,
        notes: suppliers.notes,
        isActive: suppliers.isActive,
        createdAt: suppliers.createdAt,
      })
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId))
      .orderBy(desc(suppliers.createdAt));

    // Calculate linked items per supplier
    const itemCounts = await db
      .select({
        supplierId: inventoryItems.preferredSupplierId,
        count: count(inventoryItems.id),
      })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.tenantId, tenantId), eq(inventoryItems.isActive, true)))
      .groupBy(inventoryItems.preferredSupplierId);

    const countMap = new Map<number, number>();
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
  } catch (error: any) {
    console.error('[Get Suppliers Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch suppliers' });
  }
};

// 2. Create Supplier
export const createSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createSupplierSchema.parse(req.body);

    const [supplier] = await db
      .insert(suppliers)
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
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Update Supplier
export const updateSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = updateSupplierSchema.parse(req.body);

    const [existing] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.id, Number(id)), eq(suppliers.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Supplier profile not found' });
      return;
    }

    const updateFields: any = { updatedAt: new Date() };
    if (payload.name !== undefined) updateFields.name = payload.name;
    if (payload.contactPerson !== undefined) updateFields.contactPerson = payload.contactPerson;
    if (payload.phone !== undefined) updateFields.phone = payload.phone;
    if (payload.email !== undefined) updateFields.email = payload.email || null;
    if (payload.kraPin !== undefined) updateFields.kraPin = payload.kraPin ? payload.kraPin.toUpperCase() : null;
    if (payload.physicalAddress !== undefined) updateFields.physicalAddress = payload.physicalAddress;
    if (payload.city !== undefined) updateFields.city = payload.city;
    if (payload.paymentTerms !== undefined) updateFields.paymentTerms = payload.paymentTerms;
    if (payload.leadTimeDays !== undefined) updateFields.leadTimeDays = payload.leadTimeDays;
    if (payload.bankName !== undefined) updateFields.bankName = payload.bankName;
    if (payload.bankAccountNumber !== undefined) updateFields.bankAccountNumber = payload.bankAccountNumber;
    if (payload.mpesaPaybillNumber !== undefined) updateFields.mpesaPaybillNumber = payload.mpesaPaybillNumber;
    if (payload.notes !== undefined) updateFields.notes = payload.notes;
    if (payload.isActive !== undefined) updateFields.isActive = payload.isActive;

    const [updated] = await db
      .update(suppliers)
      .set(updateFields)
      .where(eq(suppliers.id, existing.id))
      .returning();

    res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 4. Toggle Active Status
export const toggleSupplierStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const [existing] = await db
      .select({ id: suppliers.id, isActive: suppliers.isActive })
      .from(suppliers)
      .where(and(eq(suppliers.id, Number(id)), eq(suppliers.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Supplier not found' });
      return;
    }

    const [updated] = await db
      .update(suppliers)
      .set({ isActive: !existing.isActive, updatedAt: new Date() })
      .where(eq(suppliers.id, existing.id))
      .returning();

    res.status(200).json({
      status: 'success',
      message: `Supplier ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};