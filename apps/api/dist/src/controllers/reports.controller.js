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
exports.deleteSchedule = exports.postSchedule = exports.getExecutions = exports.postRunReport = exports.getReportCatalog = void 0;
const reportsRepo = __importStar(require("../repositories/reports.repository"));
const reports_validator_1 = require("../validators/reports.validator");
const getReportCatalog = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const [definitions, telemetry, schedules] = await Promise.all([
            reportsRepo.listReportDefinitions(tenantId),
            reportsRepo.getReportsTelemetry(tenantId),
            reportsRepo.listReportSchedules(tenantId),
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                definitions,
                telemetry,
                schedules,
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch reporting catalog' });
    }
};
exports.getReportCatalog = getReportCatalog;
const postRunReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = reports_validator_1.generateReportSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await reportsRepo.executeReportGeneration(tenantId, userId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: result,
            message: `Report ${result.definition.name} generated (${result.rows.length} records processed).`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Report execution failed' });
    }
};
exports.postRunReport = postRunReport;
const getExecutions = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = reports_validator_1.listExecutionsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await reportsRepo.listReportExecutions(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: result.executions,
            pagination: result.pagination,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list executions' });
    }
};
exports.getExecutions = getExecutions;
const postSchedule = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = reports_validator_1.createReportScheduleSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const created = await reportsRepo.createReportSchedule(tenantId, userId, parseResult.data);
        res.status(201).json({
            status: 'success',
            data: created,
            message: 'Automated report distribution schedule created.',
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create schedule' });
    }
};
exports.postSchedule = postSchedule;
const deleteSchedule = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const scheduleId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(scheduleId)) {
            res.status(400).json({ status: 'error', message: 'Valid schedule ID required' });
            return;
        }
        await reportsRepo.deleteReportSchedule(tenantId, scheduleId);
        res.status(200).json({ status: 'success', message: 'Report schedule removed.' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete schedule' });
    }
};
exports.deleteSchedule = deleteSchedule;
