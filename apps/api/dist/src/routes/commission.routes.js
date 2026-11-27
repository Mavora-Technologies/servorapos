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
// apps/api/src/routes/commission.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const ctrl = __importStar(require("../controllers/commission.controller"));
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/plans', (0, rbac_middleware_1.requirePermission)(['staff.manage', 'reports.view']), ctrl.getPlans);
router.post('/plans', (0, rbac_middleware_1.requirePermission)('staff.manage'), ctrl.postPlan);
router.put('/plans/:id', (0, rbac_middleware_1.requirePermission)('staff.manage'), ctrl.putPlan);
router.get('/preview', (0, rbac_middleware_1.requirePermission)(['staff.manage', 'reports.view']), ctrl.getPreview);
router.get('/runs', (0, rbac_middleware_1.requirePermission)(['staff.manage', 'reports.view', 'payments.view']), ctrl.getRuns);
router.post('/runs', (0, rbac_middleware_1.requirePermission)('staff.manage'), ctrl.postGenerateRun);
router.post('/runs/:id/approve', (0, rbac_middleware_1.requirePermission)(['staff.manage', 'payments.reconcile']), ctrl.postApproveRun);
router.post('/runs/:id/settle', (0, rbac_middleware_1.requirePermission)('payments.reconcile'), ctrl.postSettleRun);
exports.default = router;
