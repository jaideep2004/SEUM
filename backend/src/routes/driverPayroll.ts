import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as payrollController from '../controllers/driverPayrollController';

const router = Router();

router.post('/generate', authenticate, requireRole('super_admin', 'company_admin', 'hr_manager'), payrollController.generate);
router.get('/', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'hr_manager', 'finance_accountant'), payrollController.list);
router.get('/summary', authenticate, requireRole('super_admin', 'company_admin', 'finance_accountant', 'hr_manager'), payrollController.summary);
router.get('/:id', authenticate, requireRole('super_admin', 'company_admin', 'finance_accountant', 'hr_manager'), payrollController.detail);
router.patch('/:id/approve', authenticate, requireRole('super_admin', 'company_admin', 'finance_accountant'), payrollController.approve);
router.patch('/:id/pay', authenticate, requireRole('super_admin', 'company_admin', 'finance_accountant'), payrollController.pay);

export default router;
