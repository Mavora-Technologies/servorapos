import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getKitchenSettings,
  postKitchenStation,
  putKitchenStation,
  deleteKitchenStation,
  putGlobalSettings,
} from '../controllers/kitchen-settings.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getKitchenSettings);
router.post('/stations', postKitchenStation);
router.put('/stations/:id', putKitchenStation);
router.delete('/stations/:id', deleteKitchenStation);
router.put('/global', putGlobalSettings);

export default router;