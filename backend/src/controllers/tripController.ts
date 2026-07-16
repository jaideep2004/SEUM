import { Request, Response, NextFunction } from 'express';
import * as tripService from '../services/tripService';
import { createTripSchema, updateTripSchema, delayTripSchema, cancelTripSchema, tripQuerySchema, addPassengerSchema } from '../validators/operations';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function createTrip(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createTripSchema.parse(req.body);
    const trip = await tripService.createTrip(req.user!.tenantId, req.user!.id, data);
    return sendSuccess(res, trip, 'Trip created', undefined, 201);
  } catch (err) { next(err); }
}

export async function listTrips(req: Request, res: Response, next: NextFunction) {
  try {
    const q = tripQuerySchema.parse(req.query);
    const result = await tripService.listTrips(req.user!.tenantId, q);
    return sendPaginated(res, result.data, result.meta.total, q.page, q.pageSize, 'Trips retrieved');
  } catch (err) { next(err); }
}

export async function getTrip(req: Request, res: Response, next: NextFunction) {
  try {
    const trip = await tripService.getTripById(req.user!.tenantId, req.params.id);
    return sendSuccess(res, trip, 'Trip retrieved');
  } catch (err) { next(err); }
}

export async function updateTrip(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateTripSchema.parse(req.body);
    const trip = await tripService.updateTrip(req.user!.tenantId, req.params.id, data);
    return sendSuccess(res, trip, 'Trip updated');
  } catch (err) { next(err); }
}

export async function removeTrip(req: Request, res: Response, next: NextFunction) {
  try {
    const trip = await tripService.cancelTrip(req.user!.tenantId, req.params.id, { rejectionReason: 'Cancelled by operator' });
    return sendSuccess(res, trip, 'Trip cancelled');
  } catch (err) { next(err); }
}

export async function startTrip(req: Request, res: Response, next: NextFunction) {
  try {
    const trip = await tripService.startTrip(req.user!.tenantId, req.params.id);
    return sendSuccess(res, trip, 'Trip started');
  } catch (err) { next(err); }
}

export async function completeTrip(req: Request, res: Response, next: NextFunction) {
  try {
    const trip = await tripService.completeTrip(req.user!.tenantId, req.params.id);
    return sendSuccess(res, trip, 'Trip completed');
  } catch (err) { next(err); }
}

export async function delayTrip(req: Request, res: Response, next: NextFunction) {
  try {
    const data = delayTripSchema.parse(req.body);
    const trip = await tripService.delayTrip(req.user!.tenantId, req.params.id, data);
    return sendSuccess(res, trip, 'Trip delayed');
  } catch (err) { next(err); }
}

export async function cancelTrip(req: Request, res: Response, next: NextFunction) {
  try {
    const data = cancelTripSchema.parse(req.body);
    const trip = await tripService.cancelTrip(req.user!.tenantId, req.params.id, data);
    return sendSuccess(res, trip, 'Trip cancelled');
  } catch (err) { next(err); }
}

export async function addPassenger(req: Request, res: Response, next: NextFunction) {
  try {
    const data = addPassengerSchema.parse(req.body);
    const passenger = await tripService.addPassenger(req.user!.tenantId, req.params.id, data);
    return sendSuccess(res, passenger, 'Passenger added', undefined, 201);
  } catch (err) { next(err); }
}

export async function removePassenger(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await tripService.removePassenger(req.user!.tenantId, req.params.id, req.params.passengerId);
    return sendSuccess(res, result, 'Passenger removed');
  } catch (err) { next(err); }
}

export async function getTripCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    if (!startDate || !endDate) return sendSuccess(res, [], 'Calendar data retrieved');
    const trips = await tripService.getTripCalendar(req.user!.tenantId, startDate, endDate);
    return sendSuccess(res, trips, 'Calendar data retrieved');
  } catch (err) { next(err); }
}
