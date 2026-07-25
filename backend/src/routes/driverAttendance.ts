import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as attendanceController from '../controllers/driverAttendanceController';

const router = Router();

router.post('/check-in', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), attendanceController.checkIn);
router.post('/check-out', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), attendanceController.checkOut);
router.get('/list', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'operations_manager', 'hr'), attendanceController.list);
router.post('/manual', authenticate, requireRole('super_admin', 'company_admin', 'hr'), attendanceController.manualCorrection);
router.get('/summary', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'hr'), attendanceController.monthlySummary);
router.post('/auto-detect', authenticate, requireRole('super_admin', 'company_admin'), attendanceController.autoDetect);
router.get('/dashboard', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'operations_manager'), attendanceController.todayDashboard);

export default router;
