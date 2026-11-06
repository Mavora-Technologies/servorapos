import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as staffRepo from '../repositories/staff.repository';
import {
  createStaffSchema,
  updateStaffSchema,
  resetPinSchema,
  toggleStaffStatusSchema,
} from '../validators/staff.validator';

export const getStaffRoster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { search, branchId, role, isActive } = req.query;

    // Safely extract scalar string values from req.query
    const searchStr = typeof search === 'string' ? search : undefined;
    const branchIdNum = typeof branchId === 'string' ? parseInt(branchId, 10) : undefined;
    const roleStr = typeof role === 'string' ? role : undefined;
    const isActiveBool = typeof isActive === 'string' ? isActive === 'true' : undefined;

    const { staff, roles } = await staffRepo.listStaffByTenant(tenantId, {
      search: searchStr,
      branchId: branchIdNum && !isNaN(branchIdNum) ? branchIdNum : undefined,
      role: roleStr,
      isActive: isActiveBool,
    });

    const metrics = {
      totalStaff: staff.length,
      activeStaff: staff.filter((s) => s.isActive).length,
      inactiveStaff: staff.filter((s) => !s.isActive).length,
      posPinEnrolled: staff.filter((s) => s.hasPin).length,
      branchCoverage: new Set(staff.map((s) => s.defaultBranchId).filter(Boolean)).size,
    };

    res.status(200).json({
      status: 'success',
      data: {
        metrics,
        staff,
        roles,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch staff roster' });
  }
};

export const createStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const payload = createStaffSchema.parse(req.body);
    const newStaff = await staffRepo.createStaffMember(tenantId, payload);

    res.status(201).json({
      status: 'success',
      data: newStaff,
      message: 'Employee successfully registered and provisioned',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to register employee' });
  }
};

export const updateStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const staffId = parseInt(String(req.params.id), 10);

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    if (isNaN(staffId)) {
      res.status(400).json({ status: 'error', message: 'Invalid employee identifier' });
      return;
    }

    const payload = updateStaffSchema.parse(req.body);
    const updated = await staffRepo.updateStaffMember(tenantId, staffId, payload);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Employee profile updated successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update employee' });
  }
};

export const toggleStaffStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const staffId = parseInt(String(req.params.id), 10);

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    if (isNaN(staffId)) {
      res.status(400).json({ status: 'error', message: 'Invalid employee identifier' });
      return;
    }

    const { isActive } = toggleStaffStatusSchema.parse(req.body);
    const updated = await staffRepo.updateStaffMember(tenantId, staffId, { isActive });

    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Employee account ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const resetStaffPin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const staffId = parseInt(String(req.params.id), 10);

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    if (isNaN(staffId)) {
      res.status(400).json({ status: 'error', message: 'Invalid employee identifier' });
      return;
    }

    const { pin } = resetPinSchema.parse(req.body);
    const result = await staffRepo.setStaffPin(tenantId, staffId, pin);

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};