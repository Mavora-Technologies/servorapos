import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as foodCostRepo from '../repositories/food-costing-report.repository';
import {
  foodCostingReportQuerySchema,
  exportFoodCostingReportSchema,
} from '../validators/food-costing-report.validator';

export const getFoodCostingReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = foodCostingReportQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const report = await foodCostRepo.getFoodCostingReportMetrics(tenantId, parseResult.data);

    res.status(200).json({
      status: 'success',
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to generate food costing report' });
  }
};

export const exportFoodCostingReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = exportFoodCostingReportSchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const query = parseResult.data;
    const report = await foodCostRepo.getExportableFoodCostingReport(tenantId, query);

    if (query.exportType === 'CATEGORY_MARGIN_SUMMARY') {
      const csv = [
        ['Category', 'Costed Recipes', 'Avg Selling Price (KES)', 'Avg Portion Cost (KES)', 'Food Cost %'].join(','),
        ...report.categoryCostSummary.map((c) =>
          [
            `"${c.category}"`,
            c.recipeCount,
            c.avgPortionPrice.toFixed(2),
            c.avgPortionCost.toFixed(2),
            `${c.categoryFoodCostPercent}%`,
          ].join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=category-food-cost-${Date.now()}.csv`);
      res.status(200).send(csv);
      return;
    }

    // Default: Detailed Recipe BOM Ledger
    const csv = [
      [
        'Menu Item',
        'SKU',
        'Category',
        'Kitchen Station',
        'Selling Price (KES)',
        'Portion Cost (KES)',
        'Gross Margin (KES)',
        'Food Cost %',
        'Gross Margin %',
        'Cost Health',
        'Units Sold',
        'Cost of Sales (KES)',
      ].join(','),
      ...report.items.map((i) =>
        [
          `"${i.name.replace(/"/g, '""')}"`,
          `"${i.sku}"`,
          `"${i.categoryName}"`,
          i.kitchenStation,
          i.sellingPrice.toFixed(2),
          i.theoreticalPortionCost.toFixed(2),
          i.grossProfit.toFixed(2),
          `${i.foodCostPercent}%`,
          `${i.grossMarginPercent}%`,
          i.costHealth,
          i.unitsSoldPeriod,
          i.totalCostOfSalesPeriod.toFixed(2),
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=recipe-food-costing-${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
  }
};