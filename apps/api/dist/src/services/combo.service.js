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
exports.removeComboBundle = exports.modifyComboBundle = exports.registerComboBundle = exports.listTenantCombos = void 0;
// apps/api/src/services/combo.service.ts
const comboRepo = __importStar(require("../repositories/combo.repository"));
const menuRepo = __importStar(require("../repositories/menu.repository"));
const cloudinary_1 = require("../utils/cloudinary");
async function cleanupImageIfUnused(tenantId, publicId) {
    if (!publicId)
        return;
    const [usedInMenu, usedInCombos] = await Promise.all([
        menuRepo.isImagePublicIdReferenced(tenantId, publicId),
        comboRepo.isComboImagePublicIdReferenced(tenantId, publicId),
    ]);
    if (!usedInMenu && !usedInCombos) {
        void (0, cloudinary_1.destroyTenantCloudinaryImage)(tenantId, publicId);
    }
}
const listTenantCombos = async (tenantId, options) => {
    return await comboRepo.findCombosByTenant(tenantId, options);
};
exports.listTenantCombos = listTenantCombos;
const registerComboBundle = async (tenantId, branchId, payload, actor) => {
    return await comboRepo.createComboTransaction(tenantId, branchId, payload, actor);
};
exports.registerComboBundle = registerComboBundle;
const modifyComboBundle = async (tenantId, comboId, payload, actor) => {
    if (!Number.isInteger(comboId) || comboId <= 0) {
        throw new Error('Invalid combo bundle ID');
    }
    const result = await comboRepo.updateComboTransaction(tenantId, comboId, payload, actor);
    if (!result)
        return null;
    if (result.previousImagePublicId &&
        result.previousImagePublicId !== result.combo.imagePublicId) {
        void cleanupImageIfUnused(tenantId, result.previousImagePublicId);
    }
    return result.combo;
};
exports.modifyComboBundle = modifyComboBundle;
const removeComboBundle = async (tenantId, comboId, actor) => {
    if (!Number.isInteger(comboId) || comboId <= 0) {
        throw new Error('Invalid combo bundle ID');
    }
    const deleted = await comboRepo.deleteComboRecord(tenantId, comboId, actor);
    if (deleted?.imagePublicId) {
        void cleanupImageIfUnused(tenantId, deleted.imagePublicId);
    }
    return deleted;
};
exports.removeComboBundle = removeComboBundle;
