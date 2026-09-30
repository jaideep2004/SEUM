import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as leaveController from '../controllers/driverLeaveController';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

router.post('/', authenticate, requireRole(...CAP.workforceAdmin), leaveController.apply);
router.get('/', authenticate, requireRole(...CAP.workforceRead), leaveController.list);
router.patch('/:id/approve', authenticate, requireRole(...CAP.workforceAdmin), leaveController.approve);
router.patch('/:id/reject', authenticate, requireRole(...CAP.workforceAdmin), leaveController.reject);
router.get('/balance/:driverId', authenticate, requireRole(...CAP.workforceRead), leaveController.balance);
router.get('/calendar', authenticate, requireRole(...CAP.workforceRead), leaveController.calendar);

export default router;
