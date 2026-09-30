import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as journalController from '../controllers/journalEntryController';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

router.post('/', authenticate, requireRole(...CAP.financeWrite), journalController.create);
router.get('/', authenticate, requireRole(...CAP.financeRead), journalController.list);
router.get('/:id', authenticate, requireRole(...CAP.financeRead), journalController.detail);
router.post('/:id/post', authenticate, requireRole(...CAP.financeWrite), journalController.post);

export default router;
