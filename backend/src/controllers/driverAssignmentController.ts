import { Request, Response, NextFunction } from 'express';
import * as tripService from '../services/tripService';
import { assignDriverSchema, confirmTripSchema, driverScheduleQuerySchema } from '../validators/operations';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function assignDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const data = assignDriverSchema.parse(req.body);
    const trip = await tripService.assignDriver(req.user!.tenantId, req.params.id, data.driverId);
    return sendSuccess(res, trip, 'Driver assigned');
  } catch (err) { next(err); }
}

export async function getAvailableDrivers(req: Request, res: Response, next: NextFunction) {
  try {
    const date = req.query.date as string | undefined;
    const drivers = await tripService.getAvailableDrivers(req.user!.tenantId, date);
    return sendSuccess(res, drivers, 'Available drivers retrieved');
  } catch (err) { next(err); }
}

export async function driverConfirmTrip(req: Request, res: Response, next: NextFunction) {
  try {
    const data = confirmTripSchema.parse(req.body);
    const trip = await tripService.driverConfirmTrip(req.user!.tenantId, req.params.id, data.confirmationStatus, data.rejectionReason);
    return sendSuccess(res, trip, `Trip ${data.confirmationStatus}`);
  } catch (err) { next(err); }
}

export async function getDriverSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const q = driverScheduleQuerySchema.parse(req.query);
    const trips = await tripService.getDriverSchedule(req.user!.tenantId, q.driverId, q.startDate, q.endDate);
    return sendPaginated(res, trips, trips.length, q.page, q.pageSize, 'Driver schedule retrieved');
  } catch (err) { next(err); }
}
