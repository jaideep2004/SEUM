import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as journalController from '../controllers/journalEntryController';

const router = Router();

router.post('/', authenticate, requireRole('super_admin', 'company_admin', 'finance'), journalController.create);
router.get('/', authenticate, requireRole('super_admin', 'company_admin', 'finance', 'operations_manager'), journalController.list);
router.get('/:id', authenticate, requireRole('super_admin', 'company_admin', 'finance', 'operations_manager'), journalController.detail);
router.post('/:id/post', authenticate, requireRole('super_admin', 'company_admin', 'finance'), journalController.post);

export default router;
