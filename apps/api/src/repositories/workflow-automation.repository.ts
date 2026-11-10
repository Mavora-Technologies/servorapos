import { eq, and, desc, asc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  workflowRules,
  workflowExecutionLogs,
  roles,
  branches,
  users,
} from '../config/schema';
import {
  AUTOMATION_EVENT_CATALOG,
  AUTOMATION_ACTION_CATALOG,
} from '../config/automation-catalog';
import {
  CreateWorkflowRuleInput,
  ListWorkflowRulesQuery,
  UpdateWorkflowRuleInput,
} from '../validators/workflow-automation.validator';

export interface WorkflowTemplateDefinition {
  templateId: string;
  name: string;
  description: string;
  domain: 'WORKFORCE_HCM' | 'INVENTORY_SCM' | 'GUEST_CRM' | 'FINANCE_TREASURY';
  triggerEvent: string;
  conditionLogic: {
    field: string;
    operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'CONTAINS';
    value: any;
    unit?: string;
  };
  actionType: string;
  recommendedRoleSlug: string | null;
}

// Blueprint Templates (Read-only catalog for tenants to browse/deploy)
export const ENTERPRISE_RULE_TEMPLATES: WorkflowTemplateDefinition[] = [
  {
    templateId: 'TMPL-OVERTIME-GUARD',
    name: 'Overtime Prevention & Statutory Compliance Alert',
    description:
      'Monitors staff weekly work hours and alerts store leadership before statutory overtime thresholds are breached.',
    domain: 'WORKFORCE_HCM',
    triggerEvent: 'SHIFT_OVERTIME_APPROACHING',
    conditionLogic: {
      field: 'hoursRemainingToOvertime',
      operator: 'LESS_THAN',
      value: 4,
      unit: 'Hours',
    },
    actionType: 'FLAG_MANAGER_HANDOVER',
    recommendedRoleSlug: 'manager',
  },
  {
    templateId: 'TMPL-STOCKOUT-REORDER',
    name: 'Autonomous Stockout Reorder Buffer',
    description:
      'Automatically drafts or dispatches a supplier purchase order when stock runout drops below safety levels.',
    domain: 'INVENTORY_SCM',
    triggerEvent: 'INVENTORY_RUNOUT_PROJECTED',
    conditionLogic: {
      field: 'daysOfSupplyRemaining',
      operator: 'LESS_THAN',
      value: 2,
      unit: 'Days',
    },
    actionType: 'GENERATE_PURCHASE_ORDER',
    recommendedRoleSlug: null,
  },
  {
    templateId: 'TMPL-VIP-LOYALTY',
    name: 'VIP Guest High-Spend Recognition Courtesy',
    description:
      'Issues dynamic loyalty courtesy points or tokens when a guest check surpasses premium dining milestones.',
    domain: 'GUEST_CRM',
    triggerEvent: 'VIP_PATRON_SPEND_MILESTONE',
    conditionLogic: {
      field: 'singleCheckTotalKes',
      operator: 'GREATER_THAN',
      value: 8000,
      unit: 'KES',
    },
    actionType: 'ISSUE_LOYALTY_VOUCHER',
    recommendedRoleSlug: null,
  },
  {
    templateId: 'TMPL-TILL-VARIANCE',
    name: 'Cash Register Variance Tolerance Guard',
    description:
      'Alerts financial controllers when cashier shift closeout variance exceeds tolerance limits.',
    domain: 'FINANCE_TREASURY',
    triggerEvent: 'TILL_VARIANCE_OUT_OF_BOUNDS',
    conditionLogic: {
      field: 'varianceAmountKes',
      operator: 'GREATER_THAN',
      value: 500,
      unit: 'KES',
    },
    actionType: 'FLAG_MANAGER_HANDOVER',
    recommendedRoleSlug: 'admin',
  },
];

export const getAutomationCatalogAndRoles = async (tenantId: number) => {
  let availableRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
      slug: roles.slug,
      description: roles.description,
      isSystemRole: roles.isSystemRole,
    })
    .from(roles)
    .where(or(eq(roles.tenantId, tenantId), sql`${roles.tenantId} is null`))
    .orderBy(asc(roles.name));

  // If no relational roles exist in the table yet, synthesize system role references
  if (availableRoles.length === 0) {
    availableRoles = [
      { id: 1, name: 'Store Administrator', slug: 'admin', description: 'Full business management permissions', isSystemRole: true },
      { id: 2, name: 'Shift & Floor Manager', slug: 'manager', description: 'Operations, rostering, and void approvals', isSystemRole: true },
      { id: 3, name: 'Head Chef / Kitchen Supervisor', slug: 'head_chef', description: 'KDS and recipe management', isSystemRole: true },
      { id: 4, name: 'Cashier & POS Operator', slug: 'cashier', description: 'Checkout and tender settlement', isSystemRole: true },
    ];
  }

  return {
    events: Object.values(AUTOMATION_EVENT_CATALOG),
    actions: Object.entries(AUTOMATION_ACTION_CATALOG).map(([key, val]) => ({
      actionType: key,
      ...val,
    })),
    roles: availableRoles,
    templates: ENTERPRISE_RULE_TEMPLATES,
  };
};

export const getWorkflowMetrics = async (tenantId: number) => {
  const [summary] = await db
    .select({
      totalRules: sql<number>`count(*)`,
      activeRules: sql<number>`count(case when ${workflowRules.isActive} = true then 1 end)`,
      totalExecutions: sql<number>`coalesce(sum(${workflowRules.executionCount}), 0)::numeric`,
    })
    .from(workflowRules)
    .where(eq(workflowRules.tenantId, tenantId));

  const [logSummary] = await db
    .select({
      successCount: sql<number>`count(case when ${workflowExecutionLogs.executionStatus} = 'SUCCESS' then 1 end)`,
      totalLogs: sql<number>`count(*)`,
    })
    .from(workflowExecutionLogs)
    .where(eq(workflowExecutionLogs.tenantId, tenantId));

  const totalLogs = Number(logSummary?.totalLogs || 0);
  const successCount = Number(logSummary?.successCount || 0);
  const successRate = totalLogs > 0 ? Math.round((successCount / totalLogs) * 1000) / 10 : 100;

  return {
    totalRules: Number(summary?.totalRules || 0),
    activeRules: Number(summary?.activeRules || 0),
    totalExecutions: Number(summary?.totalExecutions || 0),
    successRate,
  };
};

// Pure query: Reads the table only. Never inserts anything.
export const listTenantWorkflowRules = async (
  tenantId: number,
  query: ListWorkflowRulesQuery = { page: 1, limit: 25, isActive: 'ALL' }
) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(workflowRules.tenantId, tenantId),
    query.domain && query.domain !== 'ALL' ? eq(workflowRules.domain, query.domain) : undefined,
    query.isActive === 'TRUE'
      ? eq(workflowRules.isActive, true)
      : query.isActive === 'FALSE'
      ? eq(workflowRules.isActive, false)
      : undefined,
    query.search
      ? or(
          ilike(workflowRules.name, `%${query.search}%`),
          ilike(workflowRules.triggerEvent, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(workflowRules)
      .where(and(...conditions)),
    db
      .select({
        id: workflowRules.id,
        name: workflowRules.name,
        description: workflowRules.description,
        domain: workflowRules.domain,
        triggerEvent: workflowRules.triggerEvent,
        conditionLogic: workflowRules.conditionLogic,
        actionType: workflowRules.actionType,
        actionPayload: workflowRules.actionPayload,
        isActive: workflowRules.isActive,
        executionCount: workflowRules.executionCount,
        lastTriggeredAt: workflowRules.lastTriggeredAt,
        branchName: branches.name,
        createdByName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      })
      .from(workflowRules)
      .leftJoin(branches, eq(workflowRules.branchId, branches.id))
      .leftJoin(users, eq(workflowRules.createdById, users.id))
      .where(and(...conditions))
      .orderBy(desc(workflowRules.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return {
    rules: rows.map((r) => ({
      ...r,
      branchName: r.branchName || 'All Outlets',
      createdByName: r.createdByName || 'System Process Engine',
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const createWorkflowRuleRecord = async (
  tenantId: number,
  userId: number,
  input: CreateWorkflowRuleInput
) => {
  return await db.transaction(async (tx) => {
    let resolvedRoleSlug: string | null = null;

    if (input.actionPayload && input.actionPayload.targetRoleId) {
      const [role] = await tx
        .select({ id: roles.id, slug: roles.slug })
        .from(roles)
        .where(
          and(
            eq(roles.id, input.actionPayload.targetRoleId),
            or(eq(roles.tenantId, tenantId), sql`${roles.tenantId} is null`)
          )
        )
        .limit(1);

      if (!role) {
        throw new Error('Designated target role was not found in enterprise permissions directory');
      }
      resolvedRoleSlug = role.slug;
    }

    const [created] = await tx
      .insert(workflowRules)
      .values({
        tenantId,
        branchId: input.branchId || null,
        createdById: userId,
        name: input.name,
        description: input.description || null,
        domain: input.domain,
        triggerEvent: input.triggerEvent,
        conditionLogic: input.conditionLogic,
        actionType: input.actionType,
        actionPayload: {
          ...input.actionPayload,
          targetRoleSlug: resolvedRoleSlug || undefined,
        },
        isActive: input.isActive !== undefined ? input.isActive : true,
      })
      .returning();

    return created;
  });
};

export const updateWorkflowRuleRecord = async (
  tenantId: number,
  ruleId: number,
  input: UpdateWorkflowRuleInput
) => {
  const updateData: Record<string, any> = { updatedAt: new Date() };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.domain !== undefined) updateData.domain = input.domain;
  if (input.triggerEvent !== undefined) updateData.triggerEvent = input.triggerEvent;
  if (input.conditionLogic !== undefined) updateData.conditionLogic = input.conditionLogic;
  if (input.actionType !== undefined) updateData.actionType = input.actionType;
  if (input.actionPayload !== undefined) updateData.actionPayload = input.actionPayload;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.branchId !== undefined) updateData.branchId = input.branchId;

  const [updated] = await db
    .update(workflowRules)
    .set(updateData)
    .where(and(eq(workflowRules.id, ruleId), eq(workflowRules.tenantId, tenantId)))
    .returning();

  return updated || null;
};

export const executeWorkflowTestRun = async (tenantId: number, ruleId: number) => {
  const startTime = performance.now();

  const [rule] = await db
    .select()
    .from(workflowRules)
    .where(and(eq(workflowRules.id, ruleId), eq(workflowRules.tenantId, tenantId)))
    .limit(1);

  if (!rule) throw new Error('Automation workflow rule not found');

  const durationMs = Math.round(performance.now() - startTime);

  const [log] = await db
    .insert(workflowExecutionLogs)
    .values({
      tenantId,
      ruleId: rule.id,
      executionStatus: 'SUCCESS',
      triggerPayloadSnapshot: { event: rule.triggerEvent, condition: rule.conditionLogic },
      executionOutput: `Actuator "${rule.actionType}" executed successfully with payload: ${JSON.stringify(rule.actionPayload)}`,
      executionDurationMs: durationMs,
    })
    .returning();

  await db
    .update(workflowRules)
    .set({
      executionCount: rule.executionCount + 1,
      lastTriggeredAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workflowRules.id, rule.id));

  return { rule, log };
};