import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as partController from '../controllers/partController';

const router = Router();

const MAINT_WRITE = ['super_admin', 'company_admin', 'fleet_manager'];
const MAINT_READ = [...MAINT_WRITE, 'operations_manager'];

router.post('/', authenticate, requireRole(...MAINT_WRITE), partController.createPart);
router.get('/', authenticate, requireRole(...MAINT_READ), partController.listParts);
router.get('/transactions', authenticate, requireRole(...MAINT_READ), partController.transactions);
router.get('/usage/:busId', authenticate, requireRole(...MAINT_READ), partController.usageByBus);
router.get('/:id', authenticate, requireRole(...MAINT_READ), partController.getPart);
router.patch('/:id', authenticate, requireRole(...MAINT_WRITE), partController.updatePart);
router.post('/:id/stock-in', authenticate, requireRole(...MAINT_WRITE), partController.stockIn);
router.post('/:id/stock-out', authenticate, requireRole(...MAINT_WRITE), partController.stockOut);

export default router;