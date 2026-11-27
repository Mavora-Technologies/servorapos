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
exports.getDashboardAnalytics = void 0;
const zod_1 = require("zod");
const analyticsService = __importStar(require("../services/analytics.service"));
const analytics_validator_1 = require("../validators/analytics.validator");
const getDashboardAnalytics = async (req, res) => {
    try {
        const user = req.user;
        if (!user?.tenantId || !user?.userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = analytics_validator_1.dashboardAnalyticsQuerySchema.parse(req.query);
        const data = await analyticsService.fetchExecutiveDashboard({
            tenantId: user.tenantId,
            userId: user.userId,
            role: user.role,
        }, query);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Invalid dashboard filter parameters',
                errors: error.issues,
            });
            return;
        }
        if (error instanceof analyticsService.ForbiddenBranchError) {
            res.status(403).json({ status: 'error', message: error.message });
            return;
        }
        const message = error instanceof Error ? error.message : 'Analytics query failed';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getDashboardAnalytics = getDashboardAnalytics;
