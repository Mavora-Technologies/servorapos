import { Router } from 'express';
import { getFleetDashboard, createVehicle, dispatchVehicle } from '../controllers/logistics-fleet.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', getFleetDashboard);
router.post('/vehicles', createVehicle);
router.post('/dispatch', dispatchVehicle);

export default router;