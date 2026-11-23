// apps/api/src/services/pricing.service.ts
import * as pricingRepo from '../repositories/pricing.repository';
import type {
  BulkUpdatePricesInput,
  CreatePricingRuleInput,
  UpdatePricingRuleInput,
} from '../validators/pricing.validator';

const DAY_INDEX_TO_CODE = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

export interface EvaluableRule {
  id: number;
  ruleName: string;
  ruleType: string;
  value: string;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: string | null;
  isActive: boolean;
}

function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isRuleCurrentlyActive(rule: EvaluableRule, now: Date = new Date()): boolean {
  if (!rule.isActive) return false;

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
      if (currentMinutes < startMin || currentMinutes > endMin) return false;
    } else {
      // Overnight schedule (e.g. 22:00 to 02:00)
      if (currentMinutes < startMin && currentMinutes > endMin) return false;
    }
  }

  return true;
}

export function computeRuleAdjustedPrice(
  basePrice: number,
  ruleType: string,
  ruleValue: number
): number {
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

export const fetchTenantPricingOverview = async (tenantId: number) => {
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

export const saveBulkBasePrices = async (
  tenantId: number,
  updates: BulkUpdatePricesInput['updates']
) => {
  return await pricingRepo.bulkUpdateBasePricesTransaction(tenantId, updates);
};

export const registerPricingRule = async (
  tenantId: number,
  branchId: number | null,
  payload: CreatePricingRuleInput
) => {
  return await pricingRepo.createPricingRuleTransaction(tenantId, branchId, payload);
};

export const modifyPricingRule = async (
  tenantId: number,
  ruleId: number,
  payload: UpdatePricingRuleInput
) => {
  if (!Number.isInteger(ruleId) || ruleId <= 0) {
    throw new Error('Invalid pricing rule ID');
  }
  return await pricingRepo.updatePricingRuleTransaction(tenantId, ruleId, payload);
};

export const removePricingRule = async (tenantId: number, ruleId: number) => {
  if (!Number.isInteger(ruleId) || ruleId <= 0) {
    throw new Error('Invalid pricing rule ID');
  }
  return await pricingRepo.deletePricingRuleRecord(tenantId, ruleId);
};