// apps/api/src/controllers/branch.controller.ts
import { Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/db';
import { branches } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { createBranchSchema, updateBranchSchema } from '../validators/branch.validator';

// 1. Get all branches for the authenticated tenant
export const getBranches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const records = await db
      .select()
      .from(branches)
      .where(eq(branches.tenantId, tenantId))
      .orderBy(desc(branches.createdAt));

    res.status(200).json({ status: 'success', data: records });
  } catch (error: any) {
    console.error('[Get Branches Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch branches' });
  }
};

// 2. Create a new branch
export const createBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createBranchSchema.parse(req.body);

    // Check code duplication within tenant
    const existing = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.tenantId, tenantId), eq(branches.code, payload.code)))
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ status: 'error', message: `Branch code '${payload.code}' is already registered` });
      return;
    }

    const [branch] = await db
      .insert(branches)
      .values({
        tenantId,
        name: payload.name,
        code: payload.code,
        address: payload.address || null,
        phone: payload.phone || null,
        email: payload.email || null,
        isMainBranch: payload.isMainBranch,
        isActive: payload.isActive,
      })
      .returning();

    res.status(201).json({ status: 'success', data: branch });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Update an existing branch
export const updateBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = updateBranchSchema.parse(req.body);

    const [existing] = await db
      .select()
      .from(branches)
      .where(and(eq(branches.id, Number(id)), eq(branches.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Branch not found' });
      return;
    }

    if (payload.code && payload.code !== existing.code) {
      const duplicateCode = await db
        .select({ id: branches.id })
        .from(branches)
        .where(and(eq(branches.tenantId, tenantId), eq(branches.code, payload.code)))
        .limit(1);

      if (duplicateCode.length > 0) {
        res.status(400).json({ status: 'error', message: `Branch code '${payload.code}' is already registered` });
        return;
      }
    }

    const updateFields: any = { updatedAt: new Date() };
    if (payload.name !== undefined) updateFields.name = payload.name;
    if (payload.code !== undefined) updateFields.code = payload.code;
    if (payload.address !== undefined) updateFields.address = payload.address;
    if (payload.phone !== undefined) updateFields.phone = payload.phone;
    if (payload.email !== undefined) updateFields.email = payload.email;
    if (payload.isMainBranch !== undefined) updateFields.isMainBranch = payload.isMainBranch;
    if (payload.isActive !== undefined) updateFields.isActive = payload.isActive;

    const [updated] = await db
      .update(branches)
      .set(updateFields)
      .where(eq(branches.id, existing.id))
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

// 4. Toggle active status
export const toggleBranchStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const [existing] = await db
      .select()
      .from(branches)
      .where(and(eq(branches.id, Number(id)), eq(branches.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Branch not found' });
      return;
    }

    const [updated] = await db
      .update(branches)
      .set({ isActive: !existing.isActive, updatedAt: new Date() })
      .where(eq(branches.id, existing.id))
      .returning();

    res.status(200).json({
      status: 'success',
      message: `Branch ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};