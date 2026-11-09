import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getTemplates,
  postTemplate,
  putTemplate,
  deleteTemplate,
  setDefault,
} from '../controllers/receipt.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getTemplates);
router.post('/', postTemplate);
router.put('/:id', putTemplate);
router.delete('/:id', deleteTemplate);
router.post('/set-default', setDefault);

export default router;