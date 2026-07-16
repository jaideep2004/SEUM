import { Router } from 'express';
import * as routeController from '../controllers/routeController';
import * as tripController from '../controllers/tripController';
import * as recurringTripController from '../controllers/recurringTripController';
import * as driverAssignmentController from '../controllers/driverAssignmentController';
import * as monitoringController from '../controllers/monitoringController';
import * as reportController from '../controllers/reportController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// ─── Routes ───
router.post('/routes', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), routeController.createRoute);
router.get('/routes', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), routeController.listRoutes);
router.get('/routes/:id', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), routeController.getRoute);
router.patch('/routes/:id', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), routeController.updateRoute);
router.delete('/routes/:id', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), routeController.deleteRoute);
router.post('/routes/:id/stops', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), routeController.addStop);
router.delete('/routes/:id/stops/:stopId', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), routeController.removeStop);

// ─── Trip Calendar (must precede /trips/:id) ───
router.get('/trips/calendar', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), tripController.getTripCalendar);

// ─── Trips ───
router.post('/trips', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), tripController.createTrip);
router.get('/trips', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), tripController.listTrips);
router.get('/trips/:id', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), tripController.getTrip);
router.patch('/trips/:id', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), tripController.updateTrip);
router.delete('/trips/:id', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), tripController.removeTrip);

// ─── Trip Status Transitions ───
router.post('/trips/:id/start', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), tripController.startTrip);
router.post('/trips/:id/complete', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), tripController.completeTrip);
router.post('/trips/:id/delay', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), tripController.delayTrip);
router.post('/trips/:id/cancel', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), tripController.cancelTrip);

// ─── Trip Passengers ───
router.post('/trips/:id/passengers', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), tripController.addPassenger);
router.delete('/trips/:id/passengers/:passengerId', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), tripController.removePassenger);

// ─── Driver Assignment ───
router.post('/trips/:id/assign-driver', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), driverAssignmentController.assignDriver);
router.get('/drivers/available', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), driverAssignmentController.getAvailableDrivers);
router.post('/trips/:id/driver-confirm', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager', 'driver'), driverAssignmentController.driverConfirmTrip);
router.get('/drivers/schedule', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), driverAssignmentController.getDriverSchedule);

// ─── Recurring Trip Patterns ───
router.post('/recurring-trips', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), recurringTripController.createPattern);
router.get('/recurring-trips', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), recurringTripController.listPatterns);
router.get('/recurring-trips/:id', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), recurringTripController.getPattern);
router.patch('/recurring-trips/:id', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), recurringTripController.updatePattern);
router.delete('/recurring-trips/:id', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), recurringTripController.deletePattern);
router.post('/recurring-trips/:id/generate', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), recurringTripController.generateTrips);
router.get('/recurring-trips/:id/calendar', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), recurringTripController.getPatternCalendar);

// ─── Trip Reports ───
router.get('/reports/trip', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), reportController.getTripReport);
router.get('/reports/trip/summary', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), reportController.getTripSummaryData);
router.get('/reports/drivers', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), reportController.getDriverReport);
router.get('/reports/routes', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), reportController.getRouteReport);
router.get('/reports/buses', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), reportController.getBusUtilizationReport);
router.get('/reports/export', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), reportController.exportTripReport);

// ─── Trip Monitoring (Pre-GPS) ───
router.get('/monitoring/dashboard', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), monitoringController.getDashboard);
router.get('/monitoring/delays', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), monitoringController.getDelayedTrips);
router.post('/monitoring/trips/:id/override', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), monitoringController.manualOverride);
router.post('/monitoring/trips/:id/external-update', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), monitoringController.externalUpdate);
router.get('/monitoring/trips/:id/timeline', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), monitoringController.getTimelineComparison);
router.get('/monitoring/trips/:id/logs', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), monitoringController.getStatusLogs);

export default router;
