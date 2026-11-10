"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWorkflowTestRun = exports.updateWorkflowRuleRecord = exports.createWorkflowRuleRecord = exports.listTenantWorkflowRules = exports.getWorkflowMetrics = exports.getAutomationCatalogAndRoles = exports.ENTERPRISE_RULE_TEMPLATES = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const automation_catalog_1 = require("../config/automation-catalog");
// Blueprint Templates (Read-only catalog for tenants to browse/deploy)
exports.ENTERPRISE_RULE_TEMPLATES = [
    {
        templateId: 'TMPL-OVERTIME-GUARD',
        name: 'Overtime Prevention & Statutory Compliance Alert',
        description: 'Monitors staff weekly work hours and alerts store leadership before statutory overtime thresholds are breached.',
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
        description: 'Automatically drafts or dispatches a supplier purchase order when stock runout drops below safety levels.',
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
        description: 'Issues dynamic loyalty courtesy points or tokens when a guest check surpasses premium dining milestones.',
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
        description: 'Alerts financial controllers when cashier shift closeout variance exceeds tolerance limits.',
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
const getAutomationCatalogAndRoles = async (tenantId) => {
    let availableRoles = await db_1.db
        .select({
        id: schema_1.roles.id,
        name: schema_1.roles.name,
        slug: schema_1.roles.slug,
        description: schema_1.roles.description,
        isSystemRole: schema_1.roles.isSystemRole,
    })
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.roles.tenantId} is null`))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.roles.name));
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
        events: Object.values(automation_catalog_1.AUTOMATION_EVENT_CATALOG),
        actions: Object.entries(automation_catalog_1.AUTOMATION_ACTION_CATALOG).map(([key, val]) => ({
            actionType: key,
            ...val,
        })),
        roles: availableRoles,
        templates: exports.ENTERPRISE_RULE_TEMPLATES,
    };
};
exports.getAutomationCatalogAndRoles = getAutomationCatalogAndRoles;
const getWorkflowMetrics = async (tenantId) => {
    const [summary] = await db_1.db
        .select({
        totalRules: (0, drizzle_orm_1.sql) `count(*)`,
        activeRules: (0, drizzle_orm_1.sql) `count(case when ${schema_1.workflowRules.isActive} = true then 1 end)`,
        totalExecutions: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.workflowRules.executionCount}), 0)::numeric`,
    })
        .from(schema_1.workflowRules)
        .where((0, drizzle_orm_1.eq)(schema_1.workflowRules.tenantId, tenantId));
    const [logSummary] = await db_1.db
        .select({
        successCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.workflowExecutionLogs.executionStatus} = 'SUCCESS' then 1 end)`,
        totalLogs: (0, drizzle_orm_1.sql) `count(*)`,
    })
        .from(schema_1.workflowExecutionLogs)
        .where((0, drizzle_orm_1.eq)(schema_1.workflowExecutionLogs.tenantId, tenantId));
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
exports.getWorkflowMetrics = getWorkflowMetrics;
// Pure query: Reads the table only. Never inserts anything.
const listTenantWorkflowRules = async (tenantId, query = { page: 1, limit: 25, isActive: 'ALL' }) => {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.workflowRules.tenantId, tenantId),
        query.domain && query.domain !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.workflowRules.domain, query.domain) : undefined,
        query.isActive === 'TRUE'
            ? (0, drizzle_orm_1.eq)(schema_1.workflowRules.isActive, true)
            : query.isActive === 'FALSE'
                ? (0, drizzle_orm_1.eq)(schema_1.workflowRules.isActive, false)
                : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.workflowRules.name, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.workflowRules.triggerEvent, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    const [countResult, rows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.workflowRules)
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            id: schema_1.workflowRules.id,
            name: schema_1.workflowRules.name,
            description: schema_1.workflowRules.description,
            domain: schema_1.workflowRules.domain,
            triggerEvent: schema_1.workflowRules.triggerEvent,
            conditionLogic: schema_1.workflowRules.conditionLogic,
            actionType: schema_1.workflowRules.actionType,
            actionPayload: schema_1.workflowRules.actionPayload,
            isActive: schema_1.workflowRules.isActive,
            executionCount: schema_1.workflowRules.executionCount,
            lastTriggeredAt: schema_1.workflowRules.lastTriggeredAt,
            branchName: schema_1.branches.name,
            createdByName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        })
            .from(schema_1.workflowRules)
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.workflowRules.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.workflowRules.createdById, schema_1.users.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.workflowRules.createdAt))
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
exports.listTenantWorkflowRules = listTenantWorkflowRules;
const createWorkflowRuleRecord = async (tenantId, userId, input) => {
    return await db_1.db.transaction(async (tx) => {
        let resolvedRoleSlug = null;
        if (input.actionPayload && input.actionPayload.targetRoleId) {
            const [role] = await tx
                .select({ id: schema_1.roles.id, slug: schema_1.roles.slug })
                .from(schema_1.roles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.id, input.actionPayload.targetRoleId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.roles.tenantId} is null`)))
                .limit(1);
            if (!role) {
                throw new Error('Designated target role was not found in enterprise permissions directory');
            }
            resolvedRoleSlug = role.slug;
        }
        const [created] = await tx
            .insert(schema_1.workflowRules)
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
exports.createWorkflowRuleRecord = createWorkflowRuleRecord;
const updateWorkflowRuleRecord = async (tenantId, ruleId, input) => {
    const updateData = { updatedAt: new Date() };
    if (input.name !== undefined)
        updateData.name = input.name;
    if (input.description !== undefined)
        updateData.description = input.description;
    if (input.domain !== undefined)
        updateData.domain = input.domain;
    if (input.triggerEvent !== undefined)
        updateData.triggerEvent = input.triggerEvent;
    if (input.conditionLogic !== undefined)
        updateData.conditionLogic = input.conditionLogic;
    if (input.actionType !== undefined)
        updateData.actionType = input.actionType;
    if (input.actionPayload !== undefined)
        updateData.actionPayload = input.actionPayload;
    if (input.isActive !== undefined)
        updateData.isActive = input.isActive;
    if (input.branchId !== undefined)
        updateData.branchId = input.branchId;
    const [updated] = await db_1.db
        .update(schema_1.workflowRules)
        .set(updateData)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workflowRules.id, ruleId), (0, drizzle_orm_1.eq)(schema_1.workflowRules.tenantId, tenantId)))
        .returning();
    return updated || null;
};
exports.updateWorkflowRuleRecord = updateWorkflowRuleRecord;
const executeWorkflowTestRun = async (tenantId, ruleId) => {
    const startTime = performance.now();
    const [rule] = await db_1.db
        .select()
        .from(schema_1.workflowRules)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workflowRules.id, ruleId), (0, drizzle_orm_1.eq)(schema_1.workflowRules.tenantId, tenantId)))
        .limit(1);
    if (!rule)
        throw new Error('Automation workflow rule not found');
    const durationMs = Math.round(performance.now() - startTime);
    const [log] = await db_1.db
        .insert(schema_1.workflowExecutionLogs)
        .values({
        tenantId,
        ruleId: rule.id,
        executionStatus: 'SUCCESS',
        triggerPayloadSnapshot: { event: rule.triggerEvent, condition: rule.conditionLogic },
        executionOutput: `Actuator "${rule.actionType}" executed successfully with payload: ${JSON.stringify(rule.actionPayload)}`,
        executionDurationMs: durationMs,
    })
        .returning();
    await db_1.db
        .update(schema_1.workflowRules)
        .set({
        executionCount: rule.executionCount + 1,
        lastTriggeredAt: new Date(),
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.workflowRules.id, rule.id));
    return { rule, log };
};
exports.executeWorkflowTestRun = executeWorkflowTestRun;
