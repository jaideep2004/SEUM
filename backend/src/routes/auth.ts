import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate, requireRole } from '../middleware/auth';
import { strictAuthRateLimit } from '../middleware/rateLimiter';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

router.post('/login', strictAuthRateLimit(), authController.login);
router.post('/register', authenticate, requireRole(...CAP.userAdmin), strictAuthRateLimit(), authController.register);
router.post('/refresh', strictAuthRateLimit(), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', strictAuthRateLimit(), authController.forgotPassword);
router.post('/reset-password', strictAuthRateLimit(), authController.resetPassword);
router.get('/me', authenticate, authController.me);

export default router;
