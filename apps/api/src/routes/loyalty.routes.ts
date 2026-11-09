import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getLoyaltyOverview,
  getLoyaltyMembers,
  postAdjustPoints,
  postLoyaltyTier,
  postRewardCatalogItem,
} from '../controllers/loyalty.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getLoyaltyOverview);
router.get('/members', getLoyaltyMembers);
router.post('/points/adjust', postAdjustPoints);
router.post('/tiers', postLoyaltyTier);
router.post('/rewards', postRewardCatalogItem);

export default router;