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
exports.updateStatus = exports.createReservation = exports.getReservations = void 0;
const reservationService = __importStar(require("../services/reservation.service"));
const getReservations = async (req, res) => {
    try {
        const data = await reservationService.getReservations(req.user.tenantId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch reservations' });
    }
};
exports.getReservations = getReservations;
const createReservation = async (req, res) => {
    try {
        const reservation = await reservationService.addReservation(req.user.tenantId, req.body);
        res.status(201).json({ status: 'success', data: reservation });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to create reservation' });
    }
};
exports.createReservation = createReservation;
const updateStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const reservation = await reservationService.changeStatus(req.user.tenantId, parseInt(id, 10), req.body.status);
        res.status(200).json({ status: 'success', data: reservation });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update status' });
    }
};
exports.updateStatus = updateStatus;
