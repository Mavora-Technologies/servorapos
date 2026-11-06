import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as roleRepo from '../repositories/role.repository';
import { createRoleSchema, updateRoleSchema } from '../validators/role.validator';

export const getRolesDirectory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const data = await roleRepo.listRolesWithMetrics(tenantId);

    const metrics = {
      totalRoles: data.roles.length,
      systemRoles: data.roles.filter((r) => r.isSystemRole).length,
      customRoles: data.roles.filter((r) => !r.isSystemRole).length,
      totalPermissions: data.availablePermissions.length,
    };

    res.status(200).json({
      status: 'success',
      data: {
        metrics,
        roles: data.roles,
        availablePermissions: data.availablePermissions,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch roles' });
  }
};

export const createRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const payload = createRoleSchema.parse(req.body);
    const newRole = await roleRepo.createCustomRole(tenantId, payload);

    res.status(201).json({
      status: 'success',
      data: newRole,
      message: 'Role security clearance provisioned successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const updateRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const roleId = parseInt(String(req.params.id), 10);

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    if (isNaN(roleId)) {
      res.status(400).json({ status: 'error', message: 'Invalid role identifier' });
      return;
    }

    const payload = updateRoleSchema.parse(req.body);
    const updated = await roleRepo.updateCustomRole(tenantId, roleId, payload);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Role security matrix updated successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const deleteRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const roleId = parseInt(String(req.params.id), 10);

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    if (isNaN(roleId)) {
      res.status(400).json({ status: 'error', message: 'Invalid role identifier' });
      return;
    }

    await roleRepo.deleteCustomRole(tenantId, roleId);

    res.status(200).json({
      status: 'success',
      message: 'Custom role security profile deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};