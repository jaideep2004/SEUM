import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as leaveController from '../controllers/employeeLeaveController';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

const HR_WRITE = CAP.hrWrite;
const HR_READ = CAP.hrRead;

router.post('/', authenticate, requireRole(...CAP.employeeSelfService), leaveController.apply);
router.get('/', authenticate, requireRole(...HR_READ), leaveController.list);
router.get('/calendar', authenticate, requireRole(...HR_READ), leaveController.calendar);
router.get('/balance/:employeeId', authenticate, requireRole(...HR_READ), leaveController.balance);
router.get('/:id', authenticate, requireRole(...HR_READ), leaveController.detail);
router.patch('/:id/manager-approve', authenticate, requireRole(...CAP.leaveManagerApprove), leaveController.managerApprove);
router.patch('/:id/approve', authenticate, requireRole(...HR_WRITE), leaveController.approve);
router.patch('/:id/reject', authenticate, requireRole(...CAP.leaveManagerApprove), leaveController.reject);

export default router;
