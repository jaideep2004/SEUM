import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as attendanceController from '../controllers/driverAttendanceController';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

router.post('/check-in', authenticate, requireRole(...CAP.workforceWrite), attendanceController.checkIn);
router.post('/check-out', authenticate, requireRole(...CAP.workforceWrite), attendanceController.checkOut);
router.get('/list', authenticate, requireRole(...CAP.workforceRead), attendanceController.list);
router.post('/manual', authenticate, requireRole(...CAP.workforceAdmin), attendanceController.manualCorrection);
router.get('/summary', authenticate, requireRole(...CAP.workforceRead), attendanceController.monthlySummary);
router.post('/auto-detect', authenticate, requireRole(...CAP.workforceAdmin), attendanceController.autoDetect);
router.get('/dashboard', authenticate, requireRole(...CAP.workforceRead), attendanceController.todayDashboard);

export default router;
