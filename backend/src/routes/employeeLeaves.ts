import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as leaveController from '../controllers/employeeLeaveController';

const router = Router();

const HR_WRITE = ['super_admin', 'company_admin', 'hr_manager'];
const HR_READ = [...HR_WRITE, 'operations_manager', 'finance_accountant'];

router.post('/', authenticate, requireRole(...HR_WRITE, 'employee'), leaveController.apply);
router.get('/', authenticate, requireRole(...HR_READ), leaveController.list);
router.get('/calendar', authenticate, requireRole(...HR_READ), leaveController.calendar);
router.get('/balance/:employeeId', authenticate, requireRole(...HR_READ), leaveController.balance);
router.get('/:id', authenticate, requireRole(...HR_READ), leaveController.detail);
router.patch('/:id/manager-approve', authenticate, requireRole(...HR_WRITE, 'operations_manager'), leaveController.managerApprove);
router.patch('/:id/approve', authenticate, requireRole(...HR_WRITE), leaveController.approve);
router.patch('/:id/reject', authenticate, requireRole(...HR_WRITE, 'operations_manager'), leaveController.reject);

export default router;
