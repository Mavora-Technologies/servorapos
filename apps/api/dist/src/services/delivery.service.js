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
exports.completeDelivery = exports.dispatchOrder = exports.getDeliveries = void 0;
const deliveryRepo = __importStar(require("../repositories/delivery.repository"));
const getDeliveries = async (tenantId) => await deliveryRepo.fetchDeliveryOrders(tenantId);
exports.getDeliveries = getDeliveries;
// 3PL Integration Simulator
const requestThirdPartyLogistics = async (provider) => {
    // In production, this uses the provider's REST API (e.g., Uber Direct API or Bolt API)
    // to request a rider and receive the driver details & tracking link.
    const mockDrivers = ['Kamau (Bodaboda)', 'Ochieng (Rider)', 'Njoroge', 'Wanjiku (Delivery)'];
    const randomDriver = mockDrivers[Math.floor(Math.random() * mockDrivers.length)];
    const randomPhone = `07${Math.floor(Math.random() * 90000000 + 10000000)}`;
    const mockFee = Math.floor(Math.random() * 300) + 150; // Random fee between 150 - 450 KES
    return {
        provider,
        driverName: randomDriver,
        driverPhone: randomPhone,
        trackingUrl: `https://track.${provider.toLowerCase().replace(/\s/g, '')}.com/live/ord-${Math.floor(Math.random() * 10000)}`,
        deliveryFee: mockFee
    };
};
const dispatchOrder = async (tenantId, orderId, data) => {
    let dispatchData = { ...data };
    // If using a 3PL provider, call their API to assign the rider automatically
    if (data.provider !== 'In-House') {
        const apiResponse = await requestThirdPartyLogistics(data.provider);
        dispatchData = { ...dispatchData, ...apiResponse };
    }
    return await deliveryRepo.assignDriverTransaction(tenantId, orderId, dispatchData);
};
exports.dispatchOrder = dispatchOrder;
const completeDelivery = async (tenantId, orderId) => await deliveryRepo.markDeliveredTransaction(tenantId, orderId);
exports.completeDelivery = completeDelivery;
