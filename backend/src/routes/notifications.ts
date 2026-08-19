import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, notificationController.listNotifications);
router.post('/', authenticate, notificationController.createNotificationHandler);
router.get('/count', authenticate, notificationController.getUnreadCount);
router.get('/preferences', authenticate, notificationController.getUserPreferences);
router.put('/preferences', authenticate, notificationController.saveUserPreferences);
router.patch('/:id/read', authenticate, notificationController.markAsRead);
router.patch('/read-all', authenticate, notificationController.markAllAsRead);
router.delete('/:id', authenticate, notificationController.dismissNotification);

export default router;