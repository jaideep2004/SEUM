import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as profitController from '../controllers/tripProfitabilityController';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('super_admin', 'company_admin', 'finance', 'operations_manager'), profitController.list);
router.get('/analytics', requireRole('super_admin', 'company_admin', 'finance'), profitController.analytics);

export default router;
