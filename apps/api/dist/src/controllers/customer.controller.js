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
exports.deleteCustomer = exports.patchCustomer = exports.postCustomer = exports.getCustomers = void 0;
const customerRepo = __importStar(require("../repositories/customer.repository"));
const customer_validator_1 = require("../validators/customer.validator");
const getCustomers = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = customer_validator_1.listCustomersQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await customerRepo.listTenantCustomers(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: result.customers,
            summary: result.summary,
            pagination: result.pagination,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list customers' });
    }
};
exports.getCustomers = getCustomers;
const postCustomer = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = customer_validator_1.createCustomerSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const created = await customerRepo.createCustomerRecord(tenantId, parseResult.data);
        res.status(201).json({
            status: 'success',
            data: created,
            message: `Customer "${created.name}" created successfully.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create customer' });
    }
};
exports.postCustomer = postCustomer;
const patchCustomer = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const customerId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(customerId)) {
            res.status(400).json({ status: 'error', message: 'Valid customer ID required' });
            return;
        }
        const parseResult = customer_validator_1.updateCustomerSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const updated = await customerRepo.updateCustomerRecord(tenantId, customerId, parseResult.data);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Customer not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: `Customer "${updated.name}" updated successfully.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update customer' });
    }
};
exports.patchCustomer = patchCustomer;
const deleteCustomer = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const customerId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(customerId)) {
            res.status(400).json({ status: 'error', message: 'Valid customer ID required' });
            return;
        }
        const deleted = await customerRepo.deleteCustomerRecord(tenantId, customerId);
        if (!deleted) {
            res.status(404).json({ status: 'error', message: 'Customer not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            message: `Customer "${deleted.name}" removed successfully.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete customer' });
    }
};
exports.deleteCustomer = deleteCustomer;
