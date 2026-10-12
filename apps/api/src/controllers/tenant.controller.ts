import { Request, Response } from 'express';
import { createTenantSchema } from '../validators/tenant.validator';
import { onboardNewTenant } from '../services/tenant.service';

export const createTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createTenantSchema.parse(req.body);
    
    const result = await onboardNewTenant(validatedData);
    
    res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    // Handle Postgres unique constraint violation for duplicate emails
    if (error.code === '23505') {
      res.status(409).json({ status: 'error', message: 'Email already exists' });
      return;
    }
    
    console.error('[Tenant Controller Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};