import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getHelpOverview,
  getTickets,
  getTicketDetail,
  postTicket,
  postTicketMessage,
  patchTicketStatus,
  getKbArticle,
} from '../controllers/help.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getHelpOverview);
router.get('/tickets', getTickets);
router.get('/tickets/:id', getTicketDetail);
router.post('/tickets', postTicket);
router.post('/tickets/:id/messages', postTicketMessage);
router.patch('/tickets/:id/status', patchTicketStatus);
router.get('/kb/:slug', getKbArticle);

export default router;