import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { 
  getReorderSuggestions, 
  assignPreferredSupplier, 
  executeReplenishment 
} from '../controllers/inventory-reorder.controller';

const router = Router();

router.use(requireAuth);

router.get('/suggestions', getReorderSuggestions);
router.patch('/assign-supplier', assignPreferredSupplier);
router.post('/execute', executeReplenishment);

export default router;