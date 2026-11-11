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
exports.getFinanceOverview = void 0;
const financeHubRepo = __importStar(require("../repositories/finance-hub.repository"));
const finance_hub_validator_1 = require("../validators/finance-hub.validator");
const getFinanceOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = finance_hub_validator_1.financeHubQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid query parameters', errors: parseResult.error.issues });
            return;
        }
        const [overview, recentLedger] = await Promise.all([
            financeHubRepo.getExecutiveFinanceOverview(tenantId, parseResult.data),
            financeHubRepo.getRecentTreasuryLedger(tenantId, 10),
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                overview,
                recentLedger,
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate finance cockpit' });
    }
};
exports.getFinanceOverview = getFinanceOverview;
