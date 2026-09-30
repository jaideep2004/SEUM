import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as violationController from '../controllers/driverViolationController';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

router.post('/', authenticate, requireRole(...CAP.workforceWrite), violationController.create);
router.get('/', authenticate, requireRole(...CAP.workforceRead), violationController.list);
router.patch('/:id', authenticate, requireRole(...CAP.workforceAdmin), violationController.update);
router.post('/:id/dispute', authenticate, requireRole(...CAP.driverSelfService), violationController.dispute);
router.get('/safety-score/:driverId', authenticate, requireRole(...CAP.driverRecordsRead), violationController.safetyScore);
router.get('/leaderboard', authenticate, requireRole(...CAP.workforceRead), violationController.leaderboard);

export default router;
