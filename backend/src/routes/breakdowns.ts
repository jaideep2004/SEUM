import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as breakdownController from '../controllers/breakdownController';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

const MAINT_WRITE = CAP.maintenanceWrite;
const MAINT_READ = CAP.maintenanceRead;

router.post('/', authenticate, requireRole(...MAINT_WRITE), breakdownController.reportBreakdown);
router.get('/', authenticate, requireRole(...MAINT_READ), breakdownController.listBreakdowns);
router.get('/heatmap', authenticate, requireRole(...MAINT_READ), breakdownController.heatmap);
router.get('/:id', authenticate, requireRole(...MAINT_READ), breakdownController.getBreakdown);
router.patch('/:id/dispatch', authenticate, requireRole(...MAINT_WRITE), breakdownController.dispatchBreakdown);
router.patch('/:id/start', authenticate, requireRole(...MAINT_WRITE), breakdownController.startBreakdown);
router.patch('/:id/resolve', authenticate, requireRole(...MAINT_WRITE), breakdownController.resolveBreakdown);

export default router;