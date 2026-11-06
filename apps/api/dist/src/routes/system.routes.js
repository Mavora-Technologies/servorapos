"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/system.routes.ts
const express_1 = require("express");
const db_1 = require("../config/db");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
router.get('/health', async (_req, res) => {
    const start = Date.now();
    try {
        // Run lightweight query to check actual database connectivity
        await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT 1`);
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
    }
    catch (error) {
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
exports.default = router;
