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
exports.fetchExecutiveDashboard = exports.ForbiddenBranchError = void 0;
// apps/api/src/services/analytics.service.ts
const analyticsRepo = __importStar(require("../repositories/analytics.repository"));
const role_service_1 = require("./role.service");
class ForbiddenBranchError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ForbiddenBranchError';
    }
}
exports.ForbiddenBranchError = ForbiddenBranchError;
const fetchExecutiveDashboard = async (context, query) => {
    const authorized = await (0, role_service_1.getUserAuthorizedBranches)(context.tenantId, context.userId, context.role);
    const authorizedBranchIds = authorized === 'ALL' ? null : authorized;
    let effectiveBranchIds = authorizedBranchIds;
    if (query.branchId !== null) {
        if (authorized !== 'ALL' && !authorized.includes(query.branchId)) {
            throw new ForbiddenBranchError('You do not have clearance to inspect analytics for the selected branch.');
        }
        effectiveBranchIds = [query.branchId];
    }
    return await analyticsRepo.getExecutiveDashboardMetrics(context.tenantId, {
        ...query,
        authorizedBranchIds,
        effectiveBranchIds,
    });
};
exports.fetchExecutiveDashboard = fetchExecutiveDashboard;
