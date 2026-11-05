import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { tenants, branches } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { updateBusinessProfileSchema } from '../validators/business.validator';

// 1. Get Business Entity Profile with Branch Count & Subscription telemetry
export const getBusinessProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const [tenant] = await db
      .select({
        id: tenants.id,
        businessName: tenants.businessName,
        slug: tenants.slug,
        legalName: tenants.legalName,
        kraPin: tenants.kraPin,
        email: tenants.email,
        phone: tenants.phone,
        currency: tenants.currency,
        timezone: tenants.timezone,
        subscriptionPlan: tenants.subscriptionPlan,
        subscriptionStatus: tenants.subscriptionStatus,
        logoUrl: tenants.logoUrl,
        isActive: tenants.isActive,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      res.status(404).json({ status: 'error', message: 'Business entity not found' });
      return;
    }

    // Include branch summary for the corporate view
    const branchList = await db
      .select({
        id: branches.id,
        name: branches.name,
        code: branches.code,
        isMainBranch: branches.isMainBranch,
        isActive: branches.isActive,
      })
      .from(branches)
      .where(eq(branches.tenantId, tenantId));

    res.status(200).json({
      status: 'success',
      data: {
        ...tenant,
        branchesCount: branchList.length,
        branches: branchList,
      },
    });
  } catch (error: any) {
    console.error('[Get Business Profile Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch business profile' });
  }
};

// 2. Update Business Profile
export const updateBusinessProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = updateBusinessProfileSchema.parse(req.body);

    // If slug is provided and modified, check uniqueness across other tenants
    if (payload.slug) {
      const [existingSlug] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.slug, payload.slug))
        .limit(1);

      if (existingSlug && existingSlug.id !== tenantId) {
        res.status(400).json({ status: 'error', message: `Slug '${payload.slug}' is already taken by another organization` });
        return;
      }
    }

    const [updated] = await db
      .update(tenants)
      .set({
        businessName: payload.businessName,
        slug: payload.slug || null,
        legalName: payload.legalName || null,
        kraPin: payload.kraPin ? payload.kraPin.toUpperCase() : null,
        email: payload.email || null,
        phone: payload.phone || null,
        currency: payload.currency,
        timezone: payload.timezone,
        logoUrl: payload.logoUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    res.status(200).json({
      status: 'success',
      message: 'Business profile updated successfully',
      data: updated,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};