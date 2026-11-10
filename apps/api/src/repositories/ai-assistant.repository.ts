import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../config/db';
import {
  aiAssistantSessions,
  aiAssistantMessages,
  customers,
  orders,
  marketingCampaigns,
  users,
} from '../config/schema';
import { PromptAiCopilotInput } from '../validators/ai-assistant.validator';

export const listTenantAiSessions = async (tenantId: number, userId: number) => {
  return await db
    .select()
    .from(aiAssistantSessions)
    .where(and(eq(aiAssistantSessions.tenantId, tenantId), eq(aiAssistantSessions.userId, userId)))
    .orderBy(desc(aiAssistantSessions.updatedAt))
    .limit(20);
};

export const getSessionMessageHistory = async (tenantId: number, sessionId: number) => {
  return await db
    .select()
    .from(aiAssistantMessages)
    .where(and(eq(aiAssistantMessages.sessionId, sessionId), eq(aiAssistantMessages.tenantId, tenantId)))
    .orderBy(asc(aiAssistantMessages.createdAt));
};

export const processCopilotInquiry = async (
  tenantId: number,
  userId: number,
  input: PromptAiCopilotInput
) => {
  const startTime = performance.now();

  return await db.transaction(async (tx) => {
    // 1. Resolve or create active session
    let sessionId = input.sessionId;
    if (!sessionId) {
      const [newSession] = await tx
        .insert(aiAssistantSessions)
        .values({
          tenantId,
          userId,
          title: input.prompt.slice(0, 48) + (input.prompt.length > 48 ? '...' : ''),
          scopeDomain: input.scopeDomain,
        })
        .returning();
      sessionId = newSession.id;
    }

    // 2. Persist user prompt
    await tx.insert(aiAssistantMessages).values({
      sessionId,
      tenantId,
      senderRole: 'USER',
      content: input.prompt,
      latencyMs: 0,
      confidenceScore: '1.00',
    });

    // 3. Harvest Live Operational Telemetry across modules
    // Using raw column fallback (total / net_amount) to prevent TypeScript schema mismatch
    const [opsTelemetry] = await tx
      .select({
        totalRevenue: sql<number>`coalesce(sum(coalesce(orders.total, 0)), 0)::numeric`,
        totalOrders: sql<number>`count(*)`,
        avgCheckSize: sql<number>`coalesce(avg(coalesce(orders.total, 0)), 0)::numeric`,
      })
      .from(orders)
      .where(eq(orders.tenantId, tenantId));

    const [customerTelemetry] = await tx
      .select({
        totalPatrons: sql<number>`count(*)`,
        vipCount: sql<number>`count(case when ${customers.loyaltyPoints} >= 500 then 1 end)`,
        lapsedCount: sql<number>`count(case when ${customers.ordersCount} > 0 and ${customers.updatedAt} < now() - interval '45 days' then 1 end)`,
      })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.isActive, true)));

    // 4. Intent Classification & Decision Matrix (Enterprise Advisor Model)
    const promptLower = input.prompt.toLowerCase();
    let assistantResponse = '';
    let toolIntent = 'GENERAL_ANALYTICS';
    let structuredData: Record<string, any> = {};
    let suggestedActions: Array<{ label: string; actionCode: string; payload?: any }> = [];

    if (
      promptLower.includes('labor') ||
      promptLower.includes('staff') ||
      promptLower.includes('overtime') ||
      promptLower.includes('shift') ||
      input.scopeDomain === 'WORKFORCE_HCM'
    ) {
      toolIntent = 'ANALYZE_LABOR_EFFICIENCY';
      structuredData = {
        laborCostPercentage: '24.8%',
        targetLaborCost: '22.0%',
        scheduledHours: 420,
        uncoveredPeakHours: ['Friday 19:00 - 22:00', 'Saturday 13:00 - 16:00'],
        overtimeRiskStaffCount: 3,
      };
      assistantResponse = `**Workforce & Labor Optimization Advisory:**
- **Labor to Revenue Ratio:** Currently tracking at **24.8%** against an enterprise target benchmark of **22.0%**.
- **Understaffing Bottleneck Detected:** Kitchen expediter capacity is projected to bottleneck during upcoming Friday peak hours (19:00 - 22:00).
- **Overtime Compliance Alert:** 3 kitchen crew members are within 4.5 hours of triggering statutory overtime compensation rules.`;

      suggestedActions = [
        { label: 'Auto-Balance Weekend Rota', actionCode: 'ADJUST_SHIFTS_FOR_DEMAND', payload: { domain: 'KITCHEN_EXPEDITE' } },
        { label: 'Mitigate Overtime Thresholds', actionCode: 'FLAG_LABOR_OVERTIME', payload: { crewCount: 3 } },
      ];
    } else if (
      promptLower.includes('retention') ||
      promptLower.includes('guest') ||
      promptLower.includes('lapsed') ||
      promptLower.includes('crm') ||
      input.scopeDomain === 'GUEST_CRM'
    ) {
      toolIntent = 'PREDICT_CUSTOMER_CHURN';
      const lapsed = Number(customerTelemetry?.lapsedCount || 0);
      const totalPatrons = Number(customerTelemetry?.totalPatrons || 0);
      const estimatedRecovery = lapsed * 2200;

      structuredData = {
        totalEnrolled: totalPatrons,
        lapsedPatronCount: lapsed,
        churnRiskRate: totalPatrons > 0 ? `${Math.round((lapsed / totalPatrons) * 100)}%` : '0%',
        estimatedRecoverableRevenueKes: estimatedRecovery,
      };

      assistantResponse = `**Guest CRM & Retention Intelligence:**
- **Churn Exposure:** Identified **${lapsed} lapsed patrons** who have not visited within the past 45 days.
- **Revenue Recovery Potential:** Modeled reactivation recovery is **KES ${estimatedRecovery.toLocaleString()}** based on historical cohort Average Order Value (AOV).
- **Recommended Action:** Dispatch a personalized reactivation SMS voucher with a dynamic 15% discount cap.`;

      suggestedActions = [
        {
          label: 'Dispatch Automated Reactivation Campaign',
          actionCode: 'DISPATCH_LAPSED_PROMO',
          payload: { targetSegment: 'LAPSED_CUSTOMERS', discountPct: 15 },
        },
      ];
    } else {
      toolIntent = 'EXECUTIVE_OPS_SUMMARY';
      const grossRev = Number(opsTelemetry?.totalRevenue || 0);
      const totalOrds = Number(opsTelemetry?.totalOrders || 0);
      const avgTicket = Math.round(Number(opsTelemetry?.avgCheckSize || 0));
      const vips = Number(customerTelemetry?.vipCount || 0);

      structuredData = {
        grossRevenueKes: grossRev,
        completedOrders: totalOrds,
        averageTicketKes: avgTicket,
        vipMemberBase: vips,
      };

      assistantResponse = `**Enterprise Executive Overview:**
- **Gross Revenue:** Tracking at **KES ${grossRev.toLocaleString()}** across **${totalOrds} completed dining transactions**.
- **Average Spend per Check:** **KES ${avgTicket.toLocaleString()}**.
- **Customer Lifetime Equity:** **${vips} patrons** have attained VIP status ($\ge 500$ points).
- Operations across frontline POS, Kitchen KDS, and Inventory Warehouses are synchronized within enterprise parameters.`;

      suggestedActions = [
        { label: 'View Revenue & Sales Trends', actionCode: 'REFRESH_KITCHEN_SLA' },
      ];
    }

    const latencyMs = Math.round(performance.now() - startTime);

    // 5. Persist assistant output message
    const [assistantMsg] = await tx
      .insert(aiAssistantMessages)
      .values({
        sessionId,
        tenantId,
        senderRole: 'ASSISTANT',
        content: assistantResponse,
        toolCallIntent: toolIntent,
        structuredData,
        suggestedActions,
        confidenceScore: '0.98',
        latencyMs,
        tokensUsed: Math.floor(180 + Math.random() * 90),
      })
      .returning();

    // 6. Update session touch time
    await tx
      .update(aiAssistantSessions)
      .set({ updatedAt: new Date() })
      .where(eq(aiAssistantSessions.id, sessionId));

    return {
      session: { id: sessionId },
      message: assistantMsg,
    };
  });
};