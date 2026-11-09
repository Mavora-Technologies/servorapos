import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as productRepo from '../repositories/product-report.repository';
import { productReportQuerySchema, exportProductReportSchema } from '../validators/product-report.validator';

export const getProductReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = productReportQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const report = await productRepo.getProductReportMetrics(tenantId, parseResult.data);

    res.status(200).json({
      status: 'success',
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to generate product report' });
  }
};

export const exportProductReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = exportProductReportSchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const query = parseResult.data;
    const report = await productRepo.getExportableProductReport(tenantId, query);

    if (query.exportType === 'CATEGORY_BREAKDOWN') {
      const csv = [
        ['Category', 'Units Sold', 'Gross Revenue (KES)', 'Gross Margin (KES)', 'Margin %'].join(','),
        ...report.categoryBreakdown.map((c) =>
          [
            `"${c.categoryName}"`,
            c.unitsSold,
            c.grossRevenue.toFixed(2),
            c.grossProfit.toFixed(2),
            `${c.marginPercent}%`,
          ].join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=category-performance-${Date.now()}.csv`);
      res.status(200).send(csv);
      return;
    }

    // Default: Product Matrix
    const csv = [
      [
        'Item Name',
        'SKU',
        'Category',
        'Tracking Type',
        'Units Sold',
        'Avg Price (KES)',
        'Revenue (KES)',
        'COGS (KES)',
        'Gross Profit (KES)',
        'Margin %',
        'Food Cost %',
        'Classification',
      ].join(','),
      ...report.items.map((i) =>
        [
          `"${i.itemName.replace(/"/g, '""')}"`,
          `"${i.sku}"`,
          `"${i.categoryName}"`,
          i.stockTrackingType,
          i.quantitySold,
          i.avgSellingPrice.toFixed(2),
          i.grossRevenue.toFixed(2),
          i.totalCost.toFixed(2),
          i.grossProfit.toFixed(2),
          `${i.marginPercent}%`,
          `${i.foodCostPercent}%`,
          i.matrixClassification,
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=product-performance-${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
  }
};