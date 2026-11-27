"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/branch.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const branch_controller_1 = require("../controllers/branch.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
// Scoped strictly to user_branch_memberships / defaultBranchId in branch.service.ts
router.get('/', branch_controller_1.getBranches);
router.post('/', (0, rbac_middleware_1.requirePermission)('settings.manage'), branch_controller_1.createBranch);
router.put('/:id', (0, rbac_middleware_1.requirePermission)('settings.manage'), branch_controller_1.updateBranch);
router.patch('/:id/toggle-status', (0, rbac_middleware_1.requirePermission)('settings.manage'), branch_controller_1.toggleBranchStatus);
exports.default = router;
