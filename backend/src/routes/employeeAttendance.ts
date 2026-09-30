import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as attendanceController from '../controllers/employeeAttendanceController';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

const HR_WRITE = CAP.hrWrite;
const HR_READ = CAP.hrRead;

router.post('/check-in', authenticate, requireRole(...HR_WRITE), attendanceController.checkIn);
router.post('/check-out', authenticate, requireRole(...HR_WRITE), attendanceController.checkOut);
router.get('/list', authenticate, requireRole(...HR_READ), attendanceController.list);
router.get('/summary', authenticate, requireRole(...HR_READ), attendanceController.monthlySummary);

export default router;
