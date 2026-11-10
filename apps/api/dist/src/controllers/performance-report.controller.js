"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPerformanceReport = exports.getPerformanceReport = void 0;
const perfRepo = __importStar(require("../repositories/performance-report.repository"));
const performance_report_validator_1 = require("../validators/performance-report.validator");
const getPerformanceReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = performance_report_validator_1.performanceReportQuerySchema.safeParse(req.query);
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
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to generate performance report' });
    }
};
exports.getPerformanceReport = getPerformanceReport;
const exportPerformanceReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = performance_report_validator_1.exportPerformanceReportSchema.safeParse(req.query);
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
                ...report.departmentBenchmarks.map((d) => [
                    `"${d.role}"`,
                    d.headcount,
                    d.totalSales.toFixed(2),
                    d.avgSalesPerEmployee.toFixed(2),
                    d.laborEfficiency.toFixed(2),
                    d.avgRating.toFixed(1),
                ].join(',')),
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
            ...report.items.map((s) => [
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
            ].join(',')),
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=staff-performance-${Date.now()}.csv`);
        res.status(200).send(csv);
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
    }
};
exports.exportPerformanceReport = exportPerformanceReport;
