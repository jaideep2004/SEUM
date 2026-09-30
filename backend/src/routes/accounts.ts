import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as accountController from '../controllers/accountController';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

router.post('/', authenticate, requireRole(...CAP.financeWrite), accountController.create);
router.get('/', authenticate, requireRole(...CAP.financeRead), accountController.list);
router.patch('/:id', authenticate, requireRole(...CAP.financeWrite), accountController.update);
router.get('/:id', authenticate, requireRole(...CAP.financeRead), accountController.detail);

export default router;
