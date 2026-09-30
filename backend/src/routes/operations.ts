import { Router } from 'express';
import * as routeController from '../controllers/routeController';
import * as tripController from '../controllers/tripController';
import * as recurringTripController from '../controllers/recurringTripController';
import * as driverAssignmentController from '../controllers/driverAssignmentController';
import * as monitoringController from '../controllers/monitoringController';
import * as reportController from '../controllers/reportController';
import { authenticate, requireRole } from '../middleware/auth';
import { CAPABILITIES as CAP } from '../auth/roles';

const OPS_READ = CAP.operationsRead;
const OPS_WRITE = CAP.operationsWrite;

const router = Router();

// ─── Routes ───
router.post('/routes', authenticate, requireRole(...OPS_WRITE), routeController.createRoute);
router.get('/routes', authenticate, requireRole(...OPS_READ), routeController.listRoutes);
router.get('/routes/:id', authenticate, requireRole(...OPS_READ), routeController.getRoute);
router.patch('/routes/:id', authenticate, requireRole(...OPS_WRITE), routeController.updateRoute);
router.delete('/routes/:id', authenticate, requireRole(...OPS_WRITE), routeController.deleteRoute);
router.post('/routes/:id/stops', authenticate, requireRole(...OPS_WRITE), routeController.addStop);
router.delete('/routes/:id/stops/:stopId', authenticate, requireRole(...OPS_WRITE), routeController.removeStop);

// ─── Trip Calendar (must precede /trips/:id) ───
router.get('/trips/calendar', authenticate, requireRole(...OPS_READ), tripController.getTripCalendar);

// ─── Trips ───
router.post('/trips', authenticate, requireRole(...OPS_WRITE), tripController.createTrip);
router.get('/trips', authenticate, requireRole(...OPS_READ), tripController.listTrips);
router.get('/trips/:id', authenticate, requireRole(...OPS_READ), tripController.getTrip);
router.patch('/trips/:id', authenticate, requireRole(...OPS_WRITE), tripController.updateTrip);
router.delete('/trips/:id', authenticate, requireRole(...OPS_WRITE), tripController.removeTrip);

// ─── Trip Status Transitions ───
router.post('/trips/:id/start', authenticate, requireRole(...OPS_WRITE), tripController.startTrip);
router.post('/trips/:id/complete', authenticate, requireRole(...OPS_WRITE), tripController.completeTrip);
router.post('/trips/:id/delay', authenticate, requireRole(...OPS_WRITE), tripController.delayTrip);
router.post('/trips/:id/cancel', authenticate, requireRole(...OPS_WRITE), tripController.cancelTrip);

// ─── Trip Passengers ───
router.post('/trips/:id/passengers', authenticate, requireRole(...OPS_WRITE), tripController.addPassenger);
router.delete('/trips/:id/passengers/:passengerId', authenticate, requireRole(...OPS_WRITE), tripController.removePassenger);

// ─── Driver Assignment ───
router.post('/trips/:id/assign-driver', authenticate, requireRole(...OPS_WRITE), driverAssignmentController.assignDriver);
router.get('/drivers/available', authenticate, requireRole(...OPS_READ), driverAssignmentController.getAvailableDrivers);
router.post('/trips/:id/driver-confirm', authenticate, requireRole(...CAP.driverSelfService), driverAssignmentController.driverConfirmTrip);
router.get('/drivers/schedule', authenticate, requireRole(...CAP.driverSelfService), driverAssignmentController.getDriverSchedule);

// ─── Recurring Trip Patterns ───
router.post('/recurring-trips', authenticate, requireRole(...OPS_WRITE), recurringTripController.createPattern);
router.get('/recurring-trips', authenticate, requireRole(...OPS_READ), recurringTripController.listPatterns);
router.post('/recurring-trips/auto-generate', authenticate, requireRole(...OPS_WRITE), recurringTripController.autoGenerate);
router.get('/recurring-trips/:id', authenticate, requireRole(...OPS_READ), recurringTripController.getPattern);
router.patch('/recurring-trips/:id', authenticate, requireRole(...OPS_WRITE), recurringTripController.updatePattern);
router.delete('/recurring-trips/:id', authenticate, requireRole(...OPS_WRITE), recurringTripController.deletePattern);
router.post('/recurring-trips/:id/generate', authenticate, requireRole(...OPS_WRITE), recurringTripController.generateTrips);
router.get('/recurring-trips/:id/calendar', authenticate, requireRole(...OPS_READ), recurringTripController.getPatternCalendar);

// ─── Trip Reports ───
router.get('/reports/trip', authenticate, requireRole(...OPS_READ), reportController.getTripReport);
router.get('/reports/trip/summary', authenticate, requireRole(...OPS_READ), reportController.getTripSummaryData);
router.get('/reports/drivers', authenticate, requireRole(...OPS_READ), reportController.getDriverReport);
router.get('/reports/routes', authenticate, requireRole(...OPS_READ), reportController.getRouteReport);
router.get('/reports/buses', authenticate, requireRole(...OPS_READ), reportController.getBusUtilizationReport);
router.get('/reports/export', authenticate, requireRole(...OPS_READ), reportController.exportTripReport);

// ─── Trip Monitoring (Pre-GPS) ───
router.get('/monitoring/dashboard', authenticate, requireRole(...OPS_READ), monitoringController.getDashboard);
router.get('/monitoring/delays', authenticate, requireRole(...OPS_READ), monitoringController.getDelayedTrips);
router.post('/monitoring/trips/:id/override', authenticate, requireRole(...OPS_WRITE), monitoringController.manualOverride);
router.post('/monitoring/trips/:id/external-update', authenticate, requireRole(...OPS_WRITE), monitoringController.externalUpdate);
router.get('/monitoring/trips/:id/timeline', authenticate, requireRole(...OPS_READ), monitoringController.getTimelineComparison);
router.get('/monitoring/trips/:id/logs', authenticate, requireRole(...OPS_READ), monitoringController.getStatusLogs);

export default router;
