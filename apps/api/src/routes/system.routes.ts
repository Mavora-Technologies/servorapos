// apps/api/src/routes/system.routes.ts
import { Router, Request, Response } from 'express';
import { db } from '../config/db';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  try {
    // Run lightweight query to check actual database connectivity
    await db.execute(sql`SELECT 1`);
    const latency = Date.now() - start;

    res.status(200).json({
      status: 'success',
      data: {
        healthy: true,
        region: process.env.SERVER_REGION || 'Primary Region',
        cluster: process.env.CLUSTER_NAME || 'Connected',
        latencyMs: latency,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      data: {
        healthy: false,
        region: process.env.SERVER_REGION || 'Offline',
        cluster: 'Degraded',
        latencyMs: -1,
        message: error.message,
      },
    });
  }
});

export default router;