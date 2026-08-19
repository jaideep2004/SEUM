import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as breakdownController from '../controllers/breakdownController';

const router = Router();

const MAINT_WRITE = ['super_admin', 'company_admin', 'fleet_manager'];
const MAINT_READ = [...MAINT_WRITE, 'operations_manager'];

router.post('/', authenticate, requireRole(...MAINT_WRITE), breakdownController.reportBreakdown);
router.get('/', authenticate, requireRole(...MAINT_READ), breakdownController.listBreakdowns);
router.get('/heatmap', authenticate, requireRole(...MAINT_READ), breakdownController.heatmap);
router.get('/:id', authenticate, requireRole(...MAINT_READ), breakdownController.getBreakdown);
router.patch('/:id/dispatch', authenticate, requireRole(...MAINT_WRITE), breakdownController.dispatchBreakdown);
router.patch('/:id/start', authenticate, requireRole(...MAINT_WRITE), breakdownController.startBreakdown);
router.patch('/:id/resolve', authenticate, requireRole(...MAINT_WRITE), breakdownController.resolveBreakdown);

export default router;