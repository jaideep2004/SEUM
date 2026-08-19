import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as scoreController from '../controllers/driverScoreController';

const router = Router();

router.post('/compute/:driverId', authenticate, requireRole('super_admin', 'company_admin', 'hr_manager'), scoreController.compute);
router.get('/history/:driverId', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'hr_manager', 'driver'), scoreController.history);
router.get('/leaderboard', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'hr_manager'), scoreController.leaderboard);
router.get('/latest/:driverId', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager', 'hr_manager', 'driver'), scoreController.latest);

export default router;
