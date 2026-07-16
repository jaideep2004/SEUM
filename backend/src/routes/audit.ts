import { Router } from 'express';
import * as auditController from '../controllers/auditController';
import * as auditCleanupController from '../controllers/auditCleanupController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireRole('super_admin', 'company_admin'), auditController.listAuditLogs);
router.delete('/cleanup', authenticate, requireRole('super_admin'), auditCleanupController.triggerCleanup);

export default router;
