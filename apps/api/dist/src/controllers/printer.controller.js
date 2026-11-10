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
exports.postTestPrint = exports.postPingPrinter = exports.deletePrinter = exports.putPrinter = exports.postPrinter = exports.getPrinters = void 0;
const printerRepo = __importStar(require("../repositories/printer.repository"));
const printer_validator_1 = require("../validators/printer.validator");
const getPrinters = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { branchId } = req.query;
        const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;
        const result = await printerRepo.listNetworkPrinters(tenantId, branchIdNum);
        res.status(200).json({ status: 'success', data: result });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch network printers' });
    }
};
exports.getPrinters = getPrinters;
const postPrinter = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = printer_validator_1.createPrinterSchema.parse(req.body);
        const created = await printerRepo.createPrinter(tenantId, input);
        res.status(201).json({
            status: 'success',
            data: created,
            message: 'Network hardware printer successfully provisioned.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ');
            res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to register printer' });
    }
};
exports.postPrinter = postPrinter;
const putPrinter = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const printerId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(printerId)) {
            res.status(400).json({ status: 'error', message: 'Invalid device identifier' });
            return;
        }
        const input = printer_validator_1.updatePrinterSchema.parse(req.body);
        const updated = await printerRepo.updatePrinter(tenantId, printerId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Printer hardware parameters updated.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ');
            res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update printer' });
    }
};
exports.putPrinter = putPrinter;
const deletePrinter = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const printerId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(printerId)) {
            res.status(400).json({ status: 'error', message: 'Invalid device identifier' });
            return;
        }
        await printerRepo.deletePrinter(tenantId, printerId);
        res.status(200).json({ status: 'success', message: 'Printer hardware profile removed.' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete printer' });
    }
};
exports.deletePrinter = deletePrinter;
const postPingPrinter = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const printerId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(printerId)) {
            res.status(400).json({ status: 'error', message: 'Invalid device identifier' });
            return;
        }
        const result = await printerRepo.pingPrinterHardware(tenantId, printerId);
        res.status(200).json({
            status: 'success',
            data: result,
            message: `Device handshake verified (${result.latencyMs}ms response time).`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Printer ping failed' });
    }
};
exports.postPingPrinter = postPingPrinter;
const postTestPrint = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { printerId } = printer_validator_1.testPrintSchema.parse(req.body);
        const pingResult = await printerRepo.pingPrinterHardware(tenantId, printerId);
        res.status(200).json({
            status: 'success',
            data: pingResult,
            message: `Test print ticket dispatched to ${pingResult.name} (${pingResult.ipAddress}:${pingResult.port}).`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Test print failed' });
    }
};
exports.postTestPrint = postTestPrint;
