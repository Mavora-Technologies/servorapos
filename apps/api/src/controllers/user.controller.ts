// apps/api/src/controllers/user.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { createStaffSchema } from '../validators/user.validator';
import { createStaffUser } from '../repositories/user.repository';

export const addStaffMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userRole = (req.user as any)?.role;

    // Guard: Only admins can create staff
    if (userRole && userRole !== 'ADMIN') {
      res.status(403).json({ status: 'error', message: 'Only administrators can add new team members.' });
      return;
    }

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const validatedData = createStaffSchema.parse(req.body);
    const newStaff = await createStaffUser(tenantId, validatedData);

    res.status(201).json({
      status: 'success',
      message: `${validatedData.role} account created successfully`,
      data: newStaff,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};