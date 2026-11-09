import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getPrinters,
  postPrinter,
  putPrinter,
  deletePrinter,
  postPingPrinter,
  postTestPrint,
} from '../controllers/printer.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getPrinters);
router.post('/', postPrinter);
router.put('/:id', putPrinter);
router.delete('/:id', deletePrinter);
router.post('/:id/ping', postPingPrinter);
router.post('/test-print', postTestPrint);

export default router;