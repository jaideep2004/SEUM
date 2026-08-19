import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as attendanceController from '../controllers/employeeAttendanceController';

const router = Router();

const HR_WRITE = ['super_admin', 'company_admin', 'hr_manager'];
const HR_READ = [...HR_WRITE, 'operations_manager', 'finance_accountant'];

router.post('/check-in', authenticate, requireRole(...HR_WRITE), attendanceController.checkIn);
router.post('/check-out', authenticate, requireRole(...HR_WRITE), attendanceController.checkOut);
router.get('/list', authenticate, requireRole(...HR_READ), attendanceController.list);
router.get('/summary', authenticate, requireRole(...HR_READ), attendanceController.monthlySummary);

export default router;
