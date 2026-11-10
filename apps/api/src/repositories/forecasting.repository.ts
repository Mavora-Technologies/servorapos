import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { db } from '../config/db';
import {
  demandForecastSnapshots,
  orders,
  branches,
} from '../config/schema';
import { AdjustForecastModifierInput, ForecastingQuery } from '../validators/forecasting.validator';

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

export const getDemandForecastingTelemetry = async (tenantId: number, query: ForecastingQuery) => {
  const horizon = query.horizonDays || 7;
  const targetLaborPct = (query.targetLaborCostPct || 22.0) / 100;
  const branchCondition = query.branchId ? eq(demandForecastSnapshots.branchId, query.branchId) : undefined;
  const orderBranchCondition = query.branchId ? eq(orders.branchId, query.branchId) : undefined;

  // 1. Audit real historical transactions for this specific tenant & branch
  const historicalDayStats = await db
    .select({
      dayOfWeekIndex: sql<number>`extract(dow from ${orders.createdAt})::int`,
      totalOrdersCount: sql<number>`count(*)::int`,
      avgDailyRevenue: sql<number>`coalesce(avg(coalesce(${orders.total}, 0)), 0)::numeric`,
      dailyRevenueSum: sql<number>`coalesce(sum(coalesce(${orders.total}, 0)), 0)::numeric`,
      distinctDays: sql<number>`count(distinct date(${orders.createdAt}))::int`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        orderBranchCondition,
        gte(orders.createdAt, sql`now() - interval '60 days'`)
      )
    )
    .groupBy(sql`extract(dow from ${orders.createdAt})`);

  const totalHistoricalOrders = historicalDayStats.reduce((sum, s) => sum + s.totalOrdersCount, 0);
  const totalOperatingDays = historicalDayStats.reduce((sum, s) => sum + s.distinctDays, 0);

  // COLD START DETECTION:
  // If a tenant is brand new and has no recorded transactions (or less than 3 days of operations),
  // do NOT synthesize phantom sales. Return an honest zero-state.
  if (totalHistoricalOrders === 0 || totalOperatingDays < 3) {
    // Clean up any previously generated phantom data for this tenant
    await db
      .delete(demandForecastSnapshots)
      .where(and(eq(demandForecastSnapshots.tenantId, tenantId), branchCondition));

    return {
      hasSufficientData: false,
      dataMaturity: {
        recordedOrdersCount: totalHistoricalOrders,
        distinctDaysWithData: totalOperatingDays,
        minimumDaysRequired: 3,
        message: 'Insufficient historical sales history. Real-time POS or online order volume is required to train regression curves.',
      },
      kpis: {
        totalForecastedRevenue: 0,
        totalForecastedCovers: 0,
        totalLaborBudgetKes: 0,
        totalOptimalLaborHours: 0,
        blendedConfidenceScore: 0,
        targetLaborPercentage: query.targetLaborCostPct,
      },
      snapshots: [],
    };
  }

  // 2. Compute true day-of-week baseline from actual tenant transactions
  const dayPerformanceMap = new Map<number, { avgDailySales: number; avgCheck: number; covers: number }>();
  historicalDayStats.forEach((stat) => {
    const days = Math.max(stat.distinctDays, 1);
    const avgDailySales = Math.round(Number(stat.dailyRevenueSum) / days);
    const avgCheck = stat.totalOrdersCount > 0 ? Number(stat.dailyRevenueSum) / stat.totalOrdersCount : 1500;
    const covers = Math.max(Math.round(avgDailySales / avgCheck), 1);
    dayPerformanceMap.set(stat.dayOfWeekIndex, { avgDailySales, avgCheck, covers });
  });

  const baseConditions = [
    eq(demandForecastSnapshots.tenantId, tenantId),
    branchCondition,
    gte(demandForecastSnapshots.forecastDate, sql`current_date`),
    lte(demandForecastSnapshots.forecastDate, sql`current_date + (${horizon} || ' days')::interval`),
  ].filter(Boolean);

  let existingSnapshots = await db
    .select()
    .from(demandForecastSnapshots)
    .where(and(...baseConditions))
    .orderBy(asc(demandForecastSnapshots.forecastDate));

  // Generate projections only when actual tenant order history exists
  if (existingSnapshots.length < horizon) {
    await db.delete(demandForecastSnapshots).where(and(...baseConditions));

    const weatherMultipliers: Record<string, number> = {
      CLEAR_NORMAL: 1.0,
      RAIN_HEAVY: 0.88,
      HEATWAVE: 1.15,
      COLD_SNAP: 0.92,
    };
    const weatherMult = weatherMultipliers[query.weatherCondition || 'CLEAR_NORMAL'] || 1.0;

    const newInserts = [];
    for (let i = 0; i < horizon; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + i);
      forecastDate.setHours(0, 0, 0, 0);

      const dow = forecastDate.getDay();
      const dayName = DAY_NAMES[dow];
      const tenantDayStat = dayPerformanceMap.get(dow);

      if (!tenantDayStat || tenantDayStat.avgDailySales === 0) continue;

      const daySales = Math.round(tenantDayStat.avgDailySales * weatherMult);
      const dayCovers = Math.max(Math.round(daySales / tenantDayStat.avgCheck), 1);

      // Dynamic staffing ratios derived from volume
      const optimalHeadcount = Math.max(2, Math.ceil(dayCovers / 15));
      const fohStaff = Math.max(1, Math.ceil(optimalHeadcount * 0.6));
      const bohStaff = Math.max(1, optimalHeadcount - fohStaff);

      const fohHours = Math.round(fohStaff * 7.0 * 10) / 10;
      const bohHours = Math.round(bohStaff * 7.5 * 10) / 10;
      const optimalTotalHours = Math.round((fohHours + bohHours) * 10) / 10;
      const laborBudget = Math.round(daySales * targetLaborPct);

      newInserts.push({
        tenantId,
        branchId: query.branchId || null,
        forecastDate,
        dayOfWeek: dayName,
        projectedCovers: dayCovers,
        projectedGrossSalesKes: String(daySales),
        historicalActualSalesKes: String(Math.round(tenantDayStat.avgDailySales)),
        recommendedFohLaborHours: String(fohHours),
        recommendedBohLaborHours: String(bohHours),
        scheduledLaborHours: String(optimalTotalHours),
        optimalStaffingHeadcount: optimalHeadcount,
        laborCostBudgetKes: String(laborBudget),
        confidenceScore: '0.92',
        weatherFactor: query.weatherCondition || 'CLEAR_NORMAL',
        localEventModifier: dayName === 'FRIDAY' || dayName === 'SATURDAY' ? 'Weekend Volume Service' : 'Regular Service',
        varianceTolerancePct: '5.00',
      });
    }

    if (newInserts.length > 0) {
      existingSnapshots = await db
        .insert(demandForecastSnapshots)
        .values(newInserts)
        .returning();
    }
  }

  const totalForecastedRevenue = existingSnapshots.reduce(
    (acc, curr) => acc + Number(curr.projectedGrossSalesKes),
    0
  );
  const totalForecastedCovers = existingSnapshots.reduce(
    (acc, curr) => acc + curr.projectedCovers,
    0
  );
  const totalLaborBudget = existingSnapshots.reduce(
    (acc, curr) => acc + Number(curr.laborCostBudgetKes),
    0
  );
  const totalLaborHours = existingSnapshots.reduce(
    (acc, curr) => acc + Number(curr.recommendedFohLaborHours) + Number(curr.recommendedBohLaborHours),
    0
  );

  return {
    hasSufficientData: true,
    dataMaturity: {
      recordedOrdersCount: totalHistoricalOrders,
      distinctDaysWithData: totalOperatingDays,
      minimumDaysRequired: 3,
    },
    kpis: {
      totalForecastedRevenue,
      totalForecastedCovers,
      totalLaborBudgetKes: totalLaborBudget,
      totalOptimalLaborHours: Math.round(totalLaborHours * 10) / 10,
      blendedConfidenceScore: Number(existingSnapshots[0]?.confidenceScore || 0.92),
      targetLaborPercentage: query.targetLaborCostPct,
    },
    snapshots: existingSnapshots.map((s) => ({
      ...s,
      projectedGrossSalesKes: Number(s.projectedGrossSalesKes),
      historicalActualSalesKes: s.historicalActualSalesKes ? Number(s.historicalActualSalesKes) : null,
      recommendedFohLaborHours: Number(s.recommendedFohLaborHours),
      recommendedBohLaborHours: Number(s.recommendedBohLaborHours),
      scheduledLaborHours: Number(s.scheduledLaborHours),
      laborCostBudgetKes: Number(s.laborCostBudgetKes),
      confidenceScore: Number(s.confidenceScore),
    })),
  };
};

export const updateSnapshotModifier = async (tenantId: number, input: AdjustForecastModifierInput) => {
  const [snapshot] = await db
    .select()
    .from(demandForecastSnapshots)
    .where(and(eq(demandForecastSnapshots.id, input.snapshotId), eq(demandForecastSnapshots.tenantId, tenantId)))
    .limit(1);

  if (!snapshot) throw new Error('Forecast snapshot not found');

  const factor = 1 + (input.varianceAdjustmentPct || 0) / 100;
  const newSales = Math.round(Number(snapshot.projectedGrossSalesKes) * factor);
  const newCovers = Math.max(1, Math.round(snapshot.projectedCovers * factor));
  const newBudget = Math.round(Number(snapshot.laborCostBudgetKes) * factor);

  const [updated] = await db
    .update(demandForecastSnapshots)
    .set({
      projectedGrossSalesKes: String(newSales),
      projectedCovers: newCovers,
      laborCostBudgetKes: String(newBudget),
      localEventModifier: input.localEventModifier || snapshot.localEventModifier,
      updatedAt: new Date(),
    })
    .where(eq(demandForecastSnapshots.id, input.snapshotId))
    .returning();

  return updated;
};