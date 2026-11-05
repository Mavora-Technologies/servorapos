import { Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/db';
import { warehouseLocations } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

export const createLocationSchema = z.object({
  branchId: z.coerce.number().positive('Branch is required'),
  code: z.string().min(2, 'Bin code must be at least 2 characters').trim().toUpperCase(),
  name: z.string().min(2, 'Location name is required').trim(),
  zoneType: z.enum(['DRY_AMBIENT', 'CHILLED_2_8C', 'DEEP_FREEZE', 'PREP_LINE', 'HOLDING_PASS']).default('DRY_AMBIENT'),
  targetMinTemp: z.coerce.number().optional().nullable(),
  targetMaxTemp: z.coerce.number().optional().nullable(),
  isRefrigerated: z.boolean().default(false),
});

// 1. Get all warehouse bins for active tenant & branch
export const getWarehouseLocations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const branchIdQuery = req.query.branchId ? Number(req.query.branchId) : req.user?.defaultBranchId;

    let conditions = and(eq(warehouseLocations.tenantId, tenantId), eq(warehouseLocations.isActive, true));

    if (branchIdQuery) {
      conditions = and(
        eq(warehouseLocations.tenantId, tenantId),
        eq(warehouseLocations.branchId, Number(branchIdQuery)),
        eq(warehouseLocations.isActive, true)
      );
    }

    const locations = await db
      .select({
        id: warehouseLocations.id,
        branchId: warehouseLocations.branchId,
        code: warehouseLocations.code,
        name: warehouseLocations.name,
        zoneType: warehouseLocations.zoneType,
        targetMinTemp: warehouseLocations.targetMinTemp,
        targetMaxTemp: warehouseLocations.targetMaxTemp,
        isRefrigerated: warehouseLocations.isRefrigerated,
      })
      .from(warehouseLocations)
      .where(conditions)
      .orderBy(warehouseLocations.code);

    res.status(200).json({ status: 'success', data: locations });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Register New Bin Location
export const createWarehouseLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createLocationSchema.parse(req.body);

    const [location] = await db
      .insert(warehouseLocations)
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
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};