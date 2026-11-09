import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as perfRepo from '../repositories/performance-report.repository';
import {
  performanceReportQuerySchema,
  exportPerformanceReportSchema,
} from '../validators/performance-report.validator';

export const getPerformanceReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = performanceReportQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const report = await perfRepo.getPerformanceReportMetrics(tenantId, parseResult.data);

    res.status(200).json({
      status: 'success',
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to generate performance report' });
  }
};

export const exportPerformanceReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = exportPerformanceReportSchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const query = parseResult.data;
    const report = await perfRepo.getExportablePerformanceReport(tenantId, query);

    if (query.exportType === 'ROLE_BENCHMARKS') {
      const csv = [
        ['Operational Role', 'Headcount', 'Total Sales (KES)', 'Avg Sales / Employee (KES)', 'Labor Efficiency (KES/Hr)', 'Avg Appraisal Rating'].join(','),
        ...report.departmentBenchmarks.map((d) =>
          [
            `"${d.role}"`,
            d.headcount,
            d.totalSales.toFixed(2),
            d.avgSalesPerEmployee.toFixed(2),
            d.laborEfficiency.toFixed(2),
            d.avgRating.toFixed(1),
          ].join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=role-benchmarks-${Date.now()}.csv`);
      res.status(200).send(csv);
      return;
    }

    // Default: Staff League Table
    const csv = [
      [
        'Employee Name',
        'Email',
        'System Role',
        'Branch Location',
        'Sales Generated (KES)',
        'Orders Completed',
        'Avg Ticket (KES)',
        'Hours Worked',
        'Overtime Hours',
        'Revenue / Labor Hour (KES)',
        'Attendance Score %',
        'Appraisal Rating',
        'Performance Tier',
        'Void Incidents',
      ].join(','),
      ...report.items.map((s) =>
        [
          `"${s.name.replace(/"/g, '""')}"`,
          `"${s.email}"`,
          `"${s.role}"`,
          `"${s.branchName}"`,
          s.grossSales.toFixed(2),
          s.completedOrders,
          s.avgTicket.toFixed(2),
          s.totalHours.toFixed(1),
          s.overtimeHours.toFixed(1),
          s.salesPerHour.toFixed(2),
          `${s.attendanceScore}%`,
          s.rating.toFixed(1),
          s.performanceTier,
          s.voidCount,
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=staff-performance-${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
  }
};