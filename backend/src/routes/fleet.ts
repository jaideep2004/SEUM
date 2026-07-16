import { Router } from 'express';
import * as fleetController from '../controllers/fleetController';
import * as analyticsController from '../controllers/analyticsController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// ─── Buses ───
router.post('/buses', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.createBus);
router.get('/buses', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.listBuses);
router.get('/buses/:id/history', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.getBusHistory);
router.get('/buses/:id', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.getBus);
router.patch('/buses/:id', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.updateBus);
router.delete('/buses/:id', authenticate, requireRole('super_admin', 'company_admin'), fleetController.deleteBus);

// ─── Documents ───
router.get('/documents/expiring', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.getExpiringDocuments);
router.post('/documents/check-expiry', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.checkExpiryNotifications);

// ─── Readiness ───
router.get('/readiness', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.getReadiness);
router.post('/readiness', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.updateReadiness);

// ─── Fuel Tracking ───
router.post('/fuel', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.createFuelLog);
router.get('/fuel', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.listFuelLogs);
router.get('/fuel/analytics', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.getFuelAnalytics);
router.get('/fuel/efficiency-check', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.checkFuelEfficiency);

// ─── Assignments ───
router.post('/assignments', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.createAssignment);
router.get('/assignments', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.listAssignments);
router.get('/assignments/calendar', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.getCalendarData);
router.patch('/assignments/:id', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.updateAssignment);
router.post('/buses/:id/documents', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.createDocument);
router.get('/buses/:id/documents', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.listDocuments);
router.get('/buses/:id/documents/:docId', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.getDocument);
router.patch('/buses/:id/documents/:docId', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.updateDocument);
router.delete('/buses/:id/documents/:docId', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), fleetController.deleteDocument);

// ─── Analytics ───
router.get('/analytics/dashboard', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), analyticsController.getFleetAnalytics);
router.get('/analytics/export', authenticate, requireRole('super_admin', 'company_admin', 'fleet_manager'), analyticsController.exportFleetReport);

export default router;
