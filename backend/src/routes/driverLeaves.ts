import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as leaveController from '../controllers/driverLeaveController';

const router = Router();

router.post('/', authenticate, requireRole('super_admin', 'company_admin', 'hr_manager'), leaveController.apply);
router.get('/', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'operations_manager', 'hr_manager'), leaveController.list);
router.patch('/:id/approve', authenticate, requireRole('super_admin', 'company_admin', 'hr_manager'), leaveController.approve);
router.patch('/:id/reject', authenticate, requireRole('super_admin', 'company_admin', 'hr_manager'), leaveController.reject);
router.get('/balance/:driverId', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'hr_manager'), leaveController.balance);
router.get('/calendar', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'operations_manager', 'hr_manager'), leaveController.calendar);

export default router;
