import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as accountController from '../controllers/accountController';

const router = Router();

router.post('/', authenticate, requireRole('super_admin', 'company_admin', 'finance'), accountController.create);
router.get('/', authenticate, requireRole('super_admin', 'company_admin', 'finance', 'operations_manager'), accountController.list);
router.patch('/:id', authenticate, requireRole('super_admin', 'company_admin', 'finance'), accountController.update);
router.get('/:id', authenticate, requireRole('super_admin', 'company_admin', 'finance', 'operations_manager'), accountController.detail);

export default router;
