import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getCampaignsOverview,
  getCampaigns,
  getTemplates,
  postCampaign,
  patchCampaign,
  postDispatchCampaign,
} from '../controllers/marketing-campaign.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getCampaigns);
router.get('/metrics', getCampaignsOverview);
router.get('/templates', getTemplates);
router.post('/', postCampaign);
router.patch('/:id', patchCampaign);
router.post('/:id/dispatch', postDispatchCampaign);

export default router;