import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as invRepo from '../repositories/inventory-report.repository';
import {
  inventoryReportQuerySchema,
  exportInventoryReportSchema,
} from '../validators/inventory-report.validator';

export const getInventoryReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = inventoryReportQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const report = await invRepo.getInventoryReportMetrics(tenantId, parseResult.data);

    res.status(200).json({
      status: 'success',
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate inventory report' });
  }
};

export const exportInventoryReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = exportInventoryReportSchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const query = parseResult.data;
    const report = await invRepo.getExportableInventoryReport(tenantId, query);

    if (query.exportType === 'WASTE_SCRAP_LEDGER') {
      const csv = [
        ['Cost Center / Department', 'Incidents Logged', 'Total Loss Cost (KES)'].join(','),
        ...report.departmentalWaste.map((w) =>
          [`"${w.department}"`, w.incidentCount, w.totalLossCost.toFixed(2)].join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=waste-scrap-ledger-${Date.now()}.csv`);
      res.status(200).send(csv);
      return;
    }

    if (query.exportType === 'BATCH_EXPIRY_SCHEDULE') {
      const csv = [
        ['Batch Number', 'Item Name', 'Quantity Remaining', 'Unit Cost (KES)', 'Expiry Date', 'Days Left', 'At-Risk Valuation (KES)'].join(','),
        ...report.expiringBatches.map((b) =>
          [
            `"${b.batchNumber}"`,
            `"${b.itemName.replace(/"/g, '""')}"`,
            b.currentQuantity.toFixed(2),
            b.unitCost.toFixed(2),
            `"${new Date(b.expiryDate).toISOString().split('T')[0]}"`,
            b.daysRemaining,
            b.atRiskValuation.toFixed(2),
          ].join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=batch-expiry-schedule-${Date.now()}.csv`);
      res.status(200).send(csv);
      return;
    }

    // Default: Stock on Hand Master Matrix
    const csv = [
      [
        'Item Name',
        'SKU',
        'Category',
        'Material Type',
        'Stock Level',
        'Base Unit',
        'Unit Cost (KES)',
        'Total Valuation (KES)',
        'Min Threshold',
        'Reorder Quantity',
        'Condition',
        'Stock Status',
      ].join(','),
      ...report.items.map((i) =>
        [
          `"${i.name.replace(/"/g, '""')}"`,
          `"${i.sku || 'N/A'}"`,
          `"${i.category}"`,
          i.materialType,
          i.currentStock.toFixed(2),
          i.unit,
          i.costPrice.toFixed(2),
          i.totalValuation.toFixed(2),
          i.minThreshold.toFixed(2),
          i.reorderQuantity.toFixed(2),
          i.storageCondition,
          i.healthStatus,
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=stock-on-hand-${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
  }
};