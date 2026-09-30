import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as profitController from '../controllers/tripProfitabilityController';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

router.use(authenticate);

router.get('/', requireRole(...CAP.financeRead), profitController.list);
router.get('/analytics', requireRole(...CAP.financeWrite), profitController.analytics);

export default router;
