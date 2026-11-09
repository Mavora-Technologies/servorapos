import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as loyaltyTxRepo from '../repositories/loyalty-transactions.repository';
import {
  loyaltyTransactionsQuerySchema,
  exportLoyaltyTransactionsSchema,
} from '../validators/loyalty-transactions.validator';

export const getLoyaltyTransactionsReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = loyaltyTransactionsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const report = await loyaltyTxRepo.getLoyaltyTransactionsMetrics(tenantId, parseResult.data);

    res.status(200).json({
      status: 'success',
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch loyalty transaction audit log' });
  }
};

export const exportLoyaltyTransactionsReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = exportLoyaltyTransactionsSchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const query = parseResult.data;
    const report = await loyaltyTxRepo.getExportableLoyaltyTransactions(tenantId, query);

    const csv = [
      [
        'Audit Reference',
        'Customer Name',
        'Phone',
        'Entry Type',
        'Points Delta',
        'Monetary Value (KES)',
        'Balance Before',
        'Balance After',
        'Channel',
        'Branch',
        'Operator',
        'Timestamp',
      ].join(','),
      ...report.transactions.map((tx) =>
        [
          `"${tx.auditReference || 'N/A'}"`,
          `"${tx.customerName}"`,
          `"${tx.customerPhone}"`,
          tx.entryType,
          tx.pointsDelta,
          tx.monetaryValueKes.toFixed(2),
          tx.balanceBefore,
          tx.balanceAfter,
          tx.channel,
          `"${tx.branchName}"`,
          `"${tx.processedByName}"`,
          `"${new Date(tx.createdAt).toISOString()}"`,
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=loyalty-ledger-audit-${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
  }
};