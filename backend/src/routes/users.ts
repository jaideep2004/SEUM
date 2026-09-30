import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticate, requireRole } from '../middleware/auth';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

router.get('/', authenticate, requireRole(...CAP.userAdmin), userController.listUsers);
router.patch('/:id', authenticate, requireRole(...CAP.userAdmin), userController.updateUser);
router.delete('/:id', authenticate, requireRole(...CAP.userAdmin), userController.deleteUser);
router.delete('/:id/permanent', authenticate, requireRole(...CAP.platformAdmin), userController.hardDeleteUser);

export default router;
