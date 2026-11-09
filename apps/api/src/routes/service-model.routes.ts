import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getServiceModels,
  postServiceModel,
  putServiceModel,
  patchServiceModelStatus,
  deleteServiceModel,
} from '../controllers/service-model.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getServiceModels);
router.post('/', postServiceModel);
router.put('/:id', putServiceModel);
router.patch('/:id/status', patchServiceModelStatus);
router.delete('/:id', deleteServiceModel);

export default router;