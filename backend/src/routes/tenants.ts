import { Router } from 'express';
import * as tenantController from '../controllers/tenantController';
import { authenticate, requireRole } from '../middleware/auth';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

router.post('/', authenticate, requireRole(...CAP.platformAdmin), tenantController.createTenant);
router.get('/', authenticate, requireRole(...CAP.platformAdmin), tenantController.listTenants);
router.get('/:id', authenticate, requireRole(...CAP.platformAdmin), tenantController.getTenant);
router.patch('/:id', authenticate, requireRole(...CAP.platformAdmin), tenantController.updateTenant);
router.delete('/:id', authenticate, requireRole(...CAP.platformAdmin), tenantController.deleteTenant);
router.delete('/:id/permanent', authenticate, requireRole(...CAP.platformAdmin), tenantController.hardDeleteTenant);

export default router;
