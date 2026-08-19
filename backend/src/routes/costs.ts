import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as costController from '../controllers/costController';

const router = Router();

const MAINT_WRITE = ['super_admin', 'company_admin', 'fleet_manager'];
const MAINT_READ = [...MAINT_WRITE, 'operations_manager'];

router.post('/', authenticate, requireRole(...MAINT_WRITE), costController.createCost);
router.get('/', authenticate, requireRole(...MAINT_READ), costController.listCosts);
router.get('/by-bus', authenticate, requireRole(...MAINT_READ), costController.byBus);
router.get('/analytics/age', authenticate, requireRole(...MAINT_READ), costController.ageAnalytics);
router.get('/:id', authenticate, requireRole(...MAINT_READ), costController.getCost);
router.patch('/:id', authenticate, requireRole(...MAINT_WRITE), costController.updateCost);

export default router;