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
exports.removeModifierGroup = exports.modifyModifierGroup = exports.registerModifierGroup = exports.listTenantModifierGroups = void 0;
// apps/api/src/services/modifier.service.ts
const modifierRepo = __importStar(require("../repositories/modifier.repository"));
const listTenantModifierGroups = async (tenantId) => {
    return await modifierRepo.findModifierGroupsByTenant(tenantId);
};
exports.listTenantModifierGroups = listTenantModifierGroups;
const registerModifierGroup = async (tenantId, payload) => {
    return await modifierRepo.createModifierGroupTransaction(tenantId, payload);
};
exports.registerModifierGroup = registerModifierGroup;
const modifyModifierGroup = async (tenantId, groupId, payload) => {
    if (!Number.isInteger(groupId) || groupId <= 0) {
        throw new Error('Invalid modifier group ID');
    }
    return await modifierRepo.updateModifierGroupTransaction(tenantId, groupId, payload);
};
exports.modifyModifierGroup = modifyModifierGroup;
const removeModifierGroup = async (tenantId, groupId) => {
    if (!Number.isInteger(groupId) || groupId <= 0) {
        throw new Error('Invalid modifier group ID');
    }
    return await modifierRepo.deleteModifierGroupRecord(tenantId, groupId);
};
exports.removeModifierGroup = removeModifierGroup;
