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
exports.removeUnitConversion = exports.modifyUnitConversion = exports.registerUnitConversion = exports.listTenantUnitConversions = void 0;
// apps/api/src/services/unit-conversion.service.ts
const unitConversionRepo = __importStar(require("../repositories/unit-conversion.repository"));
const listTenantUnitConversions = async (tenantId) => {
    return await unitConversionRepo.findUnitConversionsByTenant(tenantId);
};
exports.listTenantUnitConversions = listTenantUnitConversions;
const registerUnitConversion = async (tenantId, payload) => {
    return await unitConversionRepo.createUnitConversionTransaction(tenantId, payload);
};
exports.registerUnitConversion = registerUnitConversion;
const modifyUnitConversion = async (tenantId, conversionId, payload) => {
    if (!Number.isInteger(conversionId) || conversionId <= 0) {
        throw new Error('Invalid unit conversion ID');
    }
    return await unitConversionRepo.updateUnitConversionTransaction(tenantId, conversionId, payload);
};
exports.modifyUnitConversion = modifyUnitConversion;
const removeUnitConversion = async (tenantId, conversionId) => {
    if (!Number.isInteger(conversionId) || conversionId <= 0) {
        throw new Error('Invalid unit conversion ID');
    }
    return await unitConversionRepo.deleteUnitConversionRecord(tenantId, conversionId);
};
exports.removeUnitConversion = removeUnitConversion;
