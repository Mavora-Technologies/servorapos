import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as paymentRepo from '../repositories/payment-report.repository';
import {
  paymentReportQuerySchema,
  exportPaymentReportSchema,
} from '../validators/payment-report.validator';

export const getPaymentReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = paymentReportQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const report = await paymentRepo.getPaymentReportMetrics(tenantId, parseResult.data);

    res.status(200).json({
      status: 'success',
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate payment report' });
  }
};

export const exportPaymentReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = exportPaymentReportSchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const query = parseResult.data;
    const report = await paymentRepo.getExportablePaymentReport(tenantId, query);

    if (query.exportType === 'CLEARING_ACCOUNTS') {
      const csv = [
        ['Clearing Account', 'Transaction Count', 'Inflow AR (KES)', 'Outflow AP (KES)', 'Net Liquidity (KES)'].join(','),
        ...report.clearingAccounts.map((c) =>
          [
            `"${c.accountName}"`,
            c.transactionCount,
            c.inflow.toFixed(2),
            c.outflow.toFixed(2),
            c.netBalance.toFixed(2),
          ].join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=clearing-accounts-${Date.now()}.csv`);
      res.status(200).send(csv);
      return;
    }

    if (query.exportType === 'DAILY_TENDER_SUMMARY') {
      const csv = [
        ['Date/Bucket', 'Transaction Count', 'Total Inflow (KES)', 'Total Outflow (KES)', 'Net Cash (KES)'].join(','),
        ...report.timeline.map((t) =>
          [
            `"${t.timeBucket}"`,
            t.transactionCount,
            t.inflow.toFixed(2),
            t.outflow.toFixed(2),
            t.netCash.toFixed(2),
          ].join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=daily-tender-summary-${Date.now()}.csv`);
      res.status(200).send(csv);
      return;
    }

    // Default: Ledger Transactions
    const csv = [
      [
        'Payment Number',
        'Flow',
        'Method',
        'Clearing Account',
        'Reference Code',
        'Amount (KES)',
        'Party / Order',
        'Branch',
        'Status',
        'Reconciled',
        'Timestamp',
      ].join(','),
      ...report.ledger.map((tx) =>
        [
          `"${tx.paymentNumber}"`,
          tx.paymentFlow,
          `"${tx.paymentMethod}"`,
          `"${tx.clearingAccount}"`,
          `"${tx.transactionReference}"`,
          tx.amount.toFixed(2),
          `"${tx.partyIdentifier}"`,
          `"${tx.branchName}"`,
          tx.status,
          tx.isReconciled ? 'YES' : 'NO',
          `"${new Date(tx.createdAt).toISOString()}"`,
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=treasury-ledger-${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
  }
};