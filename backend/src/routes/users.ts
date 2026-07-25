import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireRole('super_admin', 'company_admin'), userController.listUsers);
router.delete('/:id', authenticate, requireRole('super_admin'), userController.deleteUser);
router.delete('/:id/permanent', authenticate, requireRole('super_admin'), userController.hardDeleteUser);

export default router;
