import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as maintenanceController from '../controllers/maintenanceController';

const router = Router();

const MAINT_WRITE = ['super_admin', 'company_admin', 'fleet_manager'];
const MAINT_READ = [...MAINT_WRITE, 'operations_manager'];

router.post('/tasks', authenticate, requireRole(...MAINT_WRITE), maintenanceController.createTask);
router.get('/tasks', authenticate, requireRole(...MAINT_READ), maintenanceController.listTasks);
router.get('/tasks/calendar', authenticate, requireRole(...MAINT_READ), maintenanceController.calendar);
router.post('/tasks/auto-generate', authenticate, requireRole(...MAINT_WRITE), maintenanceController.autoGenerate);
router.get('/tasks/:id', authenticate, requireRole(...MAINT_READ), maintenanceController.getTask);
router.patch('/tasks/:id', authenticate, requireRole(...MAINT_WRITE), maintenanceController.updateTask);
router.post('/tasks/:id/start', authenticate, requireRole(...MAINT_WRITE), maintenanceController.startTask);
router.post('/tasks/:id/complete', authenticate, requireRole(...MAINT_WRITE), maintenanceController.completeTask);
router.post('/tasks/:id/cancel', authenticate, requireRole(...MAINT_WRITE), maintenanceController.cancelTask);
router.delete('/tasks/:id', authenticate, requireRole(...MAINT_WRITE), maintenanceController.deleteTask);

export default router;