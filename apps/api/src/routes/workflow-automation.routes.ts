import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getWorkflowOverview,
  getWorkflowRules,
  getAutomationCatalog,
  postWorkflowRule,
  patchWorkflowRule,
  postTriggerTestRun,
} from '../controllers/workflow-automation.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getWorkflowRules);
router.get('/metrics', getWorkflowOverview);
router.get('/catalog', getAutomationCatalog);
router.post('/', postWorkflowRule);
router.patch('/:id', patchWorkflowRule);
router.post('/:id/test-run', postTriggerTestRun);

export default router;