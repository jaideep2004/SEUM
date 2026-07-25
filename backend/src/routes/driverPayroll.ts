import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as payrollController from '../controllers/driverPayrollController';

const router = Router();

router.post('/generate', authenticate, requireRole('super_admin', 'company_admin', 'hr'), payrollController.generate);
router.get('/', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'hr', 'finance'), payrollController.list);
router.get('/summary', authenticate, requireRole('super_admin', 'company_admin', 'finance', 'hr'), payrollController.summary);
router.get('/:id', authenticate, requireRole('super_admin', 'company_admin', 'finance', 'hr'), payrollController.detail);
router.patch('/:id/approve', authenticate, requireRole('super_admin', 'company_admin', 'finance'), payrollController.approve);
router.patch('/:id/pay', authenticate, requireRole('super_admin', 'company_admin', 'finance'), payrollController.pay);

export default router;
