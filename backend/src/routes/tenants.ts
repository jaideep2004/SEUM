import { Router } from 'express';
import * as tenantController from '../controllers/tenantController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, requireRole('super_admin'), tenantController.createTenant);
router.get('/', authenticate, requireRole('super_admin'), tenantController.listTenants);
router.get('/:id', authenticate, requireRole('super_admin'), tenantController.getTenant);
router.patch('/:id', authenticate, requireRole('super_admin'), tenantController.updateTenant);
router.delete('/:id', authenticate, requireRole('super_admin'), tenantController.deleteTenant);

export default router;
