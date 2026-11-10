import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getRewardsOverview,
  getRewardsCatalog,
  postReward,
  patchReward,
  postRedeemReward,
} from '../controllers/loyalty-rewards.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getRewardsCatalog);
router.get('/metrics', getRewardsOverview);
router.post('/', postReward);
router.patch('/:id', patchReward);
router.post('/redeem', postRedeemReward);

export default router;