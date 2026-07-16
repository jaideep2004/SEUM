import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { strictAuthRateLimit } from '../middleware/rateLimiter';

const router = Router();

router.post('/login', strictAuthRateLimit(), authController.login);
router.post('/register', strictAuthRateLimit(), authController.register);
router.post('/refresh', strictAuthRateLimit(), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', strictAuthRateLimit(), authController.forgotPassword);
router.post('/reset-password', strictAuthRateLimit(), authController.resetPassword);
router.get('/me', authenticate, authController.me);

export default router;
