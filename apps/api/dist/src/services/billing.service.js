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
exports.processInvoiceSettlement = exports.markDefaultPaymentMethod = exports.removePaymentMethod = exports.registerPaymentMethod = exports.fetchTenantInvoices = exports.saveTenantSubscription = exports.fetchTenantBillingOverview = void 0;
// apps/api/src/services/billing.service.ts
const billingRepo = __importStar(require("../repositories/billing.repository"));
const fetchTenantBillingOverview = async (tenantId) => {
    return await billingRepo.findBillingOverviewByTenant(tenantId);
};
exports.fetchTenantBillingOverview = fetchTenantBillingOverview;
const saveTenantSubscription = async (tenantId, input) => {
    return await billingRepo.upsertTenantSubscriptionTransaction(tenantId, input);
};
exports.saveTenantSubscription = saveTenantSubscription;
const fetchTenantInvoices = async (tenantId, query) => {
    return await billingRepo.listTenantInvoices(tenantId, query);
};
exports.fetchTenantInvoices = fetchTenantInvoices;
const registerPaymentMethod = async (tenantId, input) => {
    return await billingRepo.addPaymentMethodTransaction(tenantId, input);
};
exports.registerPaymentMethod = registerPaymentMethod;
const removePaymentMethod = async (tenantId, methodId) => {
    if (!Number.isInteger(methodId) || methodId <= 0) {
        throw new Error('Valid payment method ID is required.');
    }
    return await billingRepo.deletePaymentMethodTransaction(tenantId, methodId);
};
exports.removePaymentMethod = removePaymentMethod;
const markDefaultPaymentMethod = async (tenantId, methodId) => {
    if (!Number.isInteger(methodId) || methodId <= 0) {
        throw new Error('Valid payment method ID is required.');
    }
    return await billingRepo.setDefaultPaymentMethodTransaction(tenantId, methodId);
};
exports.markDefaultPaymentMethod = markDefaultPaymentMethod;
const processInvoiceSettlement = async (tenantId, input) => {
    return await billingRepo.settleInvoiceTransaction(tenantId, input);
};
exports.processInvoiceSettlement = processInvoiceSettlement;
