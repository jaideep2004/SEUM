import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as violationController from '../controllers/driverViolationController';

const router = Router();

router.post('/', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'monitoring_control'), violationController.create);
router.get('/', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'operations_manager', 'hr_manager', 'monitoring_control'), violationController.list);
router.patch('/:id', authenticate, requireRole('super_admin', 'company_admin', 'hr_manager'), violationController.update);
router.post('/:id/dispute', authenticate, requireRole('super_admin', 'company_admin', 'driver'), violationController.dispute);
router.get('/safety-score/:driverId', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'hr_manager', 'driver'), violationController.safetyScore);
router.get('/leaderboard', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'hr_manager'), violationController.leaderboard);

export default router;
