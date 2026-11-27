// apps/api/src/routes/pos-terminal.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import {
  getPosContext,
  searchPosCustomers,
  postValidatePromo,
  postValidateStock,
  getKioskOperators,
  postPosPinSwitch,
  putStaffPosPin,
} from '../controllers/pos-terminal.controller';

const router = Router();
router.use(requireAuth);

router.get('/context', getPosContext);
router.get('/customers', searchPosCustomers);
router.post('/validate-promo', postValidatePromo);
router.post('/validate-stock', postValidateStock);

// Shared Kiosk PIN Switching & PIN Administration
router.get('/kiosk-operators', getKioskOperators);
router.post('/pin-switch', postPosPinSwitch);
router.put('/staff/:userId/pin', requirePermission('staff.manage'), putStaffPosPin);

export default router;