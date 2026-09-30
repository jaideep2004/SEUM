import { Router } from 'express';
import multer from 'multer';
import * as fleetController from '../controllers/fleetController';
import * as analyticsController from '../controllers/analyticsController';
import { authenticate, requireRole } from '../middleware/auth';
import { CAPABILITIES as CAP } from '../auth/roles';

const FLEET_READ = CAP.fleetRead;
const FLEET_WRITE = CAP.fleetWrite;

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

// ─── Buses ───
router.post('/buses', authenticate, requireRole(...FLEET_WRITE), fleetController.createBus);
router.get('/buses', authenticate, requireRole(...FLEET_READ), fleetController.listBuses);
router.get('/buses/:id/history', authenticate, requireRole(...FLEET_READ), fleetController.getBusHistory);
router.get('/buses/:id', authenticate, requireRole(...FLEET_READ), fleetController.getBus);
router.patch('/buses/:id', authenticate, requireRole(...FLEET_WRITE), fleetController.updateBus);
router.delete('/buses/:id', authenticate, requireRole(...FLEET_WRITE), fleetController.deleteBus);

// ─── Documents ───
router.get('/documents/expiring', authenticate, requireRole(...FLEET_READ), fleetController.getExpiringDocuments);
router.post('/documents/check-expiry', authenticate, requireRole(...FLEET_WRITE), fleetController.checkExpiryNotifications);

// ─── Readiness ───
router.get('/readiness', authenticate, requireRole(...FLEET_READ), fleetController.getReadiness);
router.post('/readiness', authenticate, requireRole(...FLEET_WRITE), fleetController.updateReadiness);

// ─── Fuel Tracking ───
router.post('/fuel', authenticate, requireRole(...FLEET_WRITE), fleetController.createFuelLog);
router.get('/fuel', authenticate, requireRole(...FLEET_READ), fleetController.listFuelLogs);
router.get('/fuel/analytics', authenticate, requireRole(...FLEET_READ), fleetController.getFuelAnalytics);
router.get('/fuel/efficiency-check', authenticate, requireRole(...FLEET_READ), fleetController.checkFuelEfficiency);

// ─── Assignments ───
router.post('/assignments', authenticate, requireRole(...FLEET_WRITE), fleetController.createAssignment);
router.get('/assignments', authenticate, requireRole(...FLEET_READ), fleetController.listAssignments);
router.get('/assignments/calendar', authenticate, requireRole(...FLEET_READ), fleetController.getCalendarData);
router.patch('/assignments/:id', authenticate, requireRole(...FLEET_WRITE), fleetController.updateAssignment);
router.delete('/assignments/:id', authenticate, requireRole(...FLEET_WRITE), fleetController.deleteAssignment);
router.post('/buses/:id/documents/upload', authenticate, requireRole(...FLEET_WRITE), upload.single('file'), fleetController.uploadDocument);
router.post('/buses/:id/documents', authenticate, requireRole(...FLEET_WRITE), fleetController.createDocument);
router.get('/buses/:id/documents', authenticate, requireRole(...FLEET_READ), fleetController.listDocuments);
router.get('/buses/:id/documents/:docId', authenticate, requireRole(...FLEET_READ), fleetController.getDocument);
router.patch('/buses/:id/documents/:docId', authenticate, requireRole(...FLEET_WRITE), fleetController.updateDocument);
router.delete('/buses/:id/documents/:docId', authenticate, requireRole(...FLEET_WRITE), fleetController.deleteDocument);

// ─── Analytics ───
router.get('/analytics/dashboard', authenticate, requireRole(...FLEET_READ), analyticsController.getFleetAnalytics);
router.get('/analytics/export', authenticate, requireRole(...FLEET_READ), analyticsController.exportFleetReport);

export default router;
