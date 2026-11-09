import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as customerRepo from '../repositories/customer.repository';
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from '../validators/customer.validator';

export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listCustomersQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await customerRepo.listTenantCustomers(tenantId, parseResult.data);

    res.status(200).json({
      status: 'success',
      data: result.customers,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list customers' });
  }
};

export const postCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createCustomerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const created = await customerRepo.createCustomerRecord(tenantId, parseResult.data);

    res.status(201).json({
      status: 'success',
      data: created,
      message: `Customer "${created.name}" created successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create customer' });
  }
};

export const patchCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const customerId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(customerId)) {
      res.status(400).json({ status: 'error', message: 'Valid customer ID required' });
      return;
    }

    const parseResult = updateCustomerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const updated = await customerRepo.updateCustomerRecord(tenantId, customerId, parseResult.data);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Customer not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Customer "${updated.name}" updated successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update customer' });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const customerId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(customerId)) {
      res.status(400).json({ status: 'error', message: 'Valid customer ID required' });
      return;
    }

    const deleted = await customerRepo.deleteCustomerRecord(tenantId, customerId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Customer not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `Customer "${deleted.name}" removed successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete customer' });
  }
};