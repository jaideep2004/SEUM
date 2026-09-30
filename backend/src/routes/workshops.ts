import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as workshopController from '../controllers/workshopController';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

const MAINT_WRITE = CAP.maintenanceWrite;
const MAINT_READ = CAP.maintenanceRead;

router.post('/', authenticate, requireRole(...MAINT_WRITE), workshopController.createWorkshop);
router.get('/', authenticate, requireRole(...MAINT_READ), workshopController.listWorkshops);
router.get('/:id', authenticate, requireRole(...MAINT_READ), workshopController.getWorkshop);
router.get('/:id/tasks', authenticate, requireRole(...MAINT_READ), workshopController.getWorkshopTasks);
router.get('/:id/work-order.pdf', authenticate, requireRole(...MAINT_READ), workshopController.workOrderPdf);
router.patch('/:id', authenticate, requireRole(...MAINT_WRITE), workshopController.updateWorkshop);
router.delete('/:id', authenticate, requireRole(...MAINT_WRITE), workshopController.deleteWorkshop);

export default router;