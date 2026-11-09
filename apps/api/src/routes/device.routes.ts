import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getDevices,
  getDeviceContext,
  postRegisterDevice,
  putDevice,
  deleteDevice,
  postGeneratePairingCode,
  postHeartbeat,
} from '../controllers/device.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getDevices);
router.get('/context', getDeviceContext);
router.post('/', postRegisterDevice);
router.put('/:id', putDevice);
router.delete('/:id', deleteDevice);
router.post('/pairing-code', postGeneratePairingCode);
router.post('/:id/heartbeat', postHeartbeat);

export default router;