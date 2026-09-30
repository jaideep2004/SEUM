import { Router } from 'express';
import * as auditController from '../controllers/auditController';
import * as auditCleanupController from '../controllers/auditCleanupController';
import { authenticate, requireRole } from '../middleware/auth';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

router.get('/', authenticate, requireRole(...CAP.auditRead), auditController.listAuditLogs);
router.delete('/cleanup', authenticate, requireRole(...CAP.platformAdmin), auditCleanupController.triggerCleanup);

export default router;
