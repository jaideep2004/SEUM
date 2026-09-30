import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as costController from '../controllers/costController';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

const MAINT_WRITE = CAP.maintenanceWrite;
const MAINT_READ = CAP.maintenanceRead;

router.post('/', authenticate, requireRole(...MAINT_WRITE), costController.createCost);
router.get('/', authenticate, requireRole(...MAINT_READ), costController.listCosts);
router.get('/by-bus', authenticate, requireRole(...MAINT_READ), costController.byBus);
router.get('/analytics/age', authenticate, requireRole(...MAINT_READ), costController.ageAnalytics);
router.get('/:id', authenticate, requireRole(...MAINT_READ), costController.getCost);
router.patch('/:id', authenticate, requireRole(...MAINT_WRITE), costController.updateCost);

export default router;