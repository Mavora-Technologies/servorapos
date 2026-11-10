import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as expenseRepo from '../repositories/expenses.repository';
import {
  createExpenseSchema,
  updateExpenseStatusSchema,
  listExpensesQuerySchema,
} from '../validators/expenses.validator';

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const categories = await expenseRepo.getExpenseCategories(tenantId);
    res.status(200).json({ status: 'success', data: categories });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch categories' });
  }
};

export const getOverviewMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const metrics = await expenseRepo.getExpenseMetrics(tenantId, branchId);
    res.status(200).json({ status: 'success', data: metrics });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate expense metrics' });
  }
};

export const getExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listExpensesQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid query filters', errors: parseResult.error.issues });
      return;
    }

    const data = await expenseRepo.listTenantExpenses(tenantId, parseResult.data);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list expenses' });
  }
};

export const postCreateExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createExpenseSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid expense payload', errors: parseResult.error.issues });
      return;
    }

    const created = await expenseRepo.createExpenseRecord(tenantId, userId, parseResult.data);
    res.status(201).json({
      status: 'success',
      data: created,
      message: `Expense claim ${created.voucherNumber} submitted successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create expense claim' });
  }
};

export const patchExpenseStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const supervisorId = req.user?.userId;
    const { id } = req.params;

    if (!tenantId || !supervisorId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const expenseId = parseInt(Array.isArray(id) ? id[0] : id, 10);
    const parseResult = updateExpenseStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid status update', errors: parseResult.error.issues });
      return;
    }

    const updated = await expenseRepo.updateExpenseApprovalStatus(
      tenantId,
      supervisorId,
      expenseId,
      parseResult.data
    );

    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Expense claim status updated to ${updated.status}.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update expense status' });
  }
};