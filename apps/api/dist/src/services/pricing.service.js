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
exports.removePricingRule = exports.modifyPricingRule = exports.registerPricingRule = exports.saveBulkBasePrices = exports.fetchTenantPricingOverview = void 0;
exports.isRuleCurrentlyActive = isRuleCurrentlyActive;
exports.computeRuleAdjustedPrice = computeRuleAdjustedPrice;
// apps/api/src/services/pricing.service.ts
const pricingRepo = __importStar(require("../repositories/pricing.repository"));
const DAY_INDEX_TO_CODE = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
function parseMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}
function isRuleCurrentlyActive(rule, now = new Date()) {
    if (!rule.isActive)
        return false;
    // 1. Check Day-of-Week schedule
    const daysRaw = (rule.daysOfWeek || 'ALL').trim().toUpperCase();
    if (daysRaw !== 'ALL') {
        const todayCode = DAY_INDEX_TO_CODE[now.getDay()];
        const allowedDays = daysRaw.split(',').map((d) => d.trim());
        if (!allowedDays.includes(todayCode)) {
            return false;
        }
    }
    // 2. Check Time-of-Day window (supports overnight windows like 22:00 -> 02:00)
    if (rule.startTime && rule.endTime) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const startMin = parseMinutes(rule.startTime);
        const endMin = parseMinutes(rule.endTime);
        if (startMin <= endMin) {
            if (currentMinutes < startMin || currentMinutes > endMin)
                return false;
        }
        else {
            // Overnight schedule (e.g. 22:00 to 02:00)
            if (currentMinutes < startMin && currentMinutes > endMin)
                return false;
        }
    }
    return true;
}
function computeRuleAdjustedPrice(basePrice, ruleType, ruleValue) {
    switch (ruleType) {
        case 'FIXED_PRICE':
            return Math.max(0, Number(ruleValue.toFixed(2)));
        case 'PERCENTAGE_DISCOUNT':
            return Math.max(0, Number((basePrice * (1 - ruleValue / 100)).toFixed(2)));
        case 'SURGE_ADDITION':
            return Math.max(0, Number((basePrice + ruleValue).toFixed(2)));
        default:
            return basePrice;
    }
}
const fetchTenantPricingOverview = async (tenantId) => {
    const { items, rules } = await pricingRepo.findPricingDataByTenant(tenantId);
    const now = new Date();
    return items.map((item) => {
        const basePrice = parseFloat(item.price) || 0;
        const itemRules = rules.filter((r) => r.menuItemId === item.id);
        const activeRule = itemRules.find((r) => isRuleCurrentlyActive(r, now)) ?? null;
        const effectivePrice = activeRule
            ? computeRuleAdjustedPrice(basePrice, activeRule.ruleType, parseFloat(activeRule.value) || 0)
            : basePrice;
        return {
            ...item,
            categoryName: item.categoryName || 'Uncategorized',
            effectivePrice: effectivePrice.toFixed(2),
            activeRuleId: activeRule?.id ?? null,
            activeRuleName: activeRule?.ruleName ?? null,
            rules: itemRules,
        };
    });
};
exports.fetchTenantPricingOverview = fetchTenantPricingOverview;
const saveBulkBasePrices = async (tenantId, updates) => {
    return await pricingRepo.bulkUpdateBasePricesTransaction(tenantId, updates);
};
exports.saveBulkBasePrices = saveBulkBasePrices;
const registerPricingRule = async (tenantId, branchId, payload) => {
    return await pricingRepo.createPricingRuleTransaction(tenantId, branchId, payload);
};
exports.registerPricingRule = registerPricingRule;
const modifyPricingRule = async (tenantId, ruleId, payload) => {
    if (!Number.isInteger(ruleId) || ruleId <= 0) {
        throw new Error('Invalid pricing rule ID');
    }
    return await pricingRepo.updatePricingRuleTransaction(tenantId, ruleId, payload);
};
exports.modifyPricingRule = modifyPricingRule;
const removePricingRule = async (tenantId, ruleId) => {
    if (!Number.isInteger(ruleId) || ruleId <= 0) {
        throw new Error('Invalid pricing rule ID');
    }
    return await pricingRepo.deletePricingRuleRecord(tenantId, ruleId);
};
exports.removePricingRule = removePricingRule;
