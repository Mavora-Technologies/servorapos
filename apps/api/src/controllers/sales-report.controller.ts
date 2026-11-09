import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as salesRepo from '../repositories/sales-report.repository';
import { salesReportQuerySchema, exportSalesReportSchema } from '../validators/sales-report.validator';

export const getSalesReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = salesReportQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const query = parseResult.data;

    const [summary, paymentBreakdown, categoryBreakdown, branchBreakdown, topItems, timeline] =
      await Promise.all([
        salesRepo.getSalesSummaryMetrics(tenantId, query),
        salesRepo.getPaymentTenderBreakdown(tenantId, query),
        salesRepo.getCategorySalesBreakdown(tenantId, query),
        salesRepo.getBranchSalesBreakdown(tenantId, query),
        salesRepo.getTopSellingItems(tenantId, query),
        salesRepo.getSalesTrendTimeline(tenantId, query),
      ]);

    res.status(200).json({
      status: 'success',
      data: {
        summary,
        paymentBreakdown,
        categoryBreakdown,
        branchBreakdown,
        topItems,
        timeline,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to generate sales report' });
  }
};

export const exportSalesReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = exportSalesReportSchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const query = parseResult.data;

    if (query.exportType === 'PAYMENT_TENDERS') {
      const data = await salesRepo.getPaymentTenderBreakdown(tenantId, query);
      const csv = [
        ['Payment Method', 'Transactions', 'Total Collected (KES)'].join(','),
        ...data.map((d) => [`"${d.paymentMethod}"`, d.transactionCount, d.totalCollected.toFixed(2)].join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=payment-tenders-${Date.now()}.csv`);
      res.status(200).send(csv);
      return;
    }

    if (query.exportType === 'LINE_ITEMS') {
      const items = await salesRepo.getTopSellingItems(tenantId, query, 100);
      const csv = [
        ['Item Name', 'Quantity Sold', 'Gross Revenue (KES)'].join(','),
        ...items.map((i) => [`"${i.itemName}"`, i.totalQuantitySold, i.totalRevenue.toFixed(2)].join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=sales-items-${Date.now()}.csv`);
      res.status(200).send(csv);
      return;
    }

    const timeline = await salesRepo.getSalesTrendTimeline(tenantId, query);
    const csv = [
      ['Date/Bucket', 'Completed Orders', 'Net Sales (KES)', 'Tax Amount (KES)', 'Total Gross (KES)'].join(','),
      ...timeline.map((t) => [
        `"${t.timeBucket}"`,
        t.orderCount,
        t.netSales.toFixed(2),
        t.taxTotal.toFixed(2),
        t.grandTotal.toFixed(2),
      ].join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sales-summary-${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
  }
};