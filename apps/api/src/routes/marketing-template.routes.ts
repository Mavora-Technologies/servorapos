import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getMarketingTemplates,
  postMarketingTemplate,
  patchMarketingTemplate,
  deleteMarketingTemplate,
} from '../controllers/marketing-template.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getMarketingTemplates);
router.post('/', postMarketingTemplate);
router.patch('/:id', patchMarketingTemplate);
router.delete('/:id', deleteMarketingTemplate);

export default router;