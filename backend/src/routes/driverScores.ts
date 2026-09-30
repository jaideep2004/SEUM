import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as scoreController from '../controllers/driverScoreController';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

router.post('/compute/:driverId', authenticate, requireRole(...CAP.workforceAdmin), scoreController.compute);
router.get('/history/:driverId', authenticate, requireRole(...CAP.driverRecordsRead), scoreController.history);
router.get('/leaderboard', authenticate, requireRole(...CAP.workforceRead), scoreController.leaderboard);
router.get('/latest/:driverId', authenticate, requireRole(...CAP.driverRecordsRead), scoreController.latest);

export default router;
