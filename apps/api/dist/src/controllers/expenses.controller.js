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
exports.patchExpenseStatus = exports.postCreateExpense = exports.getExpenses = exports.getOverviewMetrics = exports.getCategories = void 0;
const expenseRepo = __importStar(require("../repositories/expenses.repository"));
const expenses_validator_1 = require("../validators/expenses.validator");
const getCategories = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const categories = await expenseRepo.getExpenseCategories(tenantId);
        res.status(200).json({ status: 'success', data: categories });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch categories' });
    }
};
exports.getCategories = getCategories;
const getOverviewMetrics = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const metrics = await expenseRepo.getExpenseMetrics(tenantId, branchId);
        res.status(200).json({ status: 'success', data: metrics });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate expense metrics' });
    }
};
exports.getOverviewMetrics = getOverviewMetrics;
const getExpenses = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = expenses_validator_1.listExpensesQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid query filters', errors: parseResult.error.issues });
            return;
        }
        const data = await expenseRepo.listTenantExpenses(tenantId, parseResult.data);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list expenses' });
    }
};
exports.getExpenses = getExpenses;
const postCreateExpense = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = expenses_validator_1.createExpenseSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid expense payload', errors: parseResult.error.issues });
            return;
        }
        const created = await expenseRepo.createExpenseRecord(tenantId, userId, parseResult.data);
        res.status(201).json({
            status: 'success',
            data: created,
            message: `Expense claim ${created.voucherNumber} submitted successfully.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create expense claim' });
    }
};
exports.postCreateExpense = postCreateExpense;
const patchExpenseStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const supervisorId = req.user?.userId;
        const { id } = req.params;
        if (!tenantId || !supervisorId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const expenseId = parseInt(Array.isArray(id) ? id[0] : id, 10);
        const parseResult = expenses_validator_1.updateExpenseStatusSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid status update', errors: parseResult.error.issues });
            return;
        }
        const updated = await expenseRepo.updateExpenseApprovalStatus(tenantId, supervisorId, expenseId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: `Expense claim status updated to ${updated.status}.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update expense status' });
    }
};
exports.patchExpenseStatus = patchExpenseStatus;
