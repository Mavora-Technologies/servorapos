// apps/api/src/controllers/role.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as roleService from '../services/role.service';
import { createRoleSchema, updateRoleSchema } from '../validators/role.validator';

export const getRolesDirectory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const data = await roleService.fetchTenantRolesDirectory(tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch roles';
    res.status(500).json({ status: 'error', message });
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
    const newRole = await roleService.provisionCustomRole(tenantId, payload);

    res.status(201).json({
      status: 'success',
      data: newRole,
      message: 'Role security clearance provisioned successfully.',
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create role';
    res.status(400).json({ status: 'error', message });
  }
};

export const updateRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const roleId = Number(req.params.id);
    if (!Number.isInteger(roleId) || roleId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid role identifier' });
      return;
    }

    const payload = updateRoleSchema.parse(req.body);
    const updated = await roleService.modifyCustomRole(tenantId, roleId, payload);

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Custom role not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Role security matrix updated successfully.',
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to update role';
    res.status(400).json({ status: 'error', message });
  }
};

export const deleteRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const roleId = Number(req.params.id);
    if (!Number.isInteger(roleId) || roleId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid role identifier' });
      return;
    }

    const deleted = await roleService.removeCustomRole(tenantId, roleId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Role not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Custom role security profile deleted successfully.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete role';
    res.status(400).json({ status: 'error', message });
  }
};