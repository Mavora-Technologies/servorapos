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
exports.toggleBranchActiveState = exports.modifyBranch = exports.provisionBranch = exports.listAuthorizedBranches = void 0;
// apps/api/src/services/branch.service.ts
const branchRepo = __importStar(require("../repositories/branch.repository"));
const role_service_1 = require("./role.service");
const listAuthorizedBranches = async (actor) => {
    const authorized = await (0, role_service_1.getUserAuthorizedBranches)(actor.tenantId, actor.userId, actor.role);
    const scope = authorized === 'ALL' ? null : authorized;
    return await branchRepo.findBranchesByTenantScope(actor.tenantId, scope);
};
exports.listAuthorizedBranches = listAuthorizedBranches;
const provisionBranch = async (actor, payload) => {
    return await branchRepo.createBranchTransaction(actor.tenantId, payload, {
        userId: actor.userId,
        ipAddress: actor.ipAddress,
    });
};
exports.provisionBranch = provisionBranch;
const modifyBranch = async (actor, branchId, payload) => {
    return await branchRepo.updateBranchTransaction(actor.tenantId, branchId, payload, {
        userId: actor.userId,
        ipAddress: actor.ipAddress,
    });
};
exports.modifyBranch = modifyBranch;
const toggleBranchActiveState = async (actor, branchId) => {
    return await branchRepo.toggleBranchStatusTransaction(actor.tenantId, branchId, {
        userId: actor.userId,
        ipAddress: actor.ipAddress,
    });
};
exports.toggleBranchActiveState = toggleBranchActiveState;
