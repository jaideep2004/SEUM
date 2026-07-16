import { Request, Response, NextFunction } from 'express';
import * as recurringTripService from '../services/recurringTripService';
import { createRecurringTripPatternSchema, updateRecurringTripPatternSchema, recurringTripPatternQuerySchema, generateTripsSchema } from '../validators/operations';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function createPattern(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createRecurringTripPatternSchema.parse(req.body);
    const pattern = await recurringTripService.createPattern(req.user!.tenantId, req.user!.id, data);
    return sendSuccess(res, pattern, 'Recurring pattern created', undefined, 201);
  } catch (err) { next(err); }
}

export async function listPatterns(req: Request, res: Response, next: NextFunction) {
  try {
    const q = recurringTripPatternQuerySchema.parse(req.query);
    const result = await recurringTripService.listPatterns(req.user!.tenantId, q);
    return sendPaginated(res, result.data, result.meta.total, q.page, q.pageSize, 'Recurring patterns retrieved');
  } catch (err) { next(err); }
}

export async function getPattern(req: Request, res: Response, next: NextFunction) {
  try {
    const pattern = await recurringTripService.getPatternById(req.user!.tenantId, req.params.id);
    return sendSuccess(res, pattern, 'Recurring pattern retrieved');
  } catch (err) { next(err); }
}

export async function updatePattern(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateRecurringTripPatternSchema.parse(req.body);
    const pattern = await recurringTripService.updatePattern(req.user!.tenantId, req.params.id, data);
    return sendSuccess(res, pattern, 'Recurring pattern updated');
  } catch (err) { next(err); }
}

export async function deletePattern(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await recurringTripService.deletePattern(req.user!.tenantId, req.params.id);
    return sendSuccess(res, result, 'Recurring pattern deleted');
  } catch (err) { next(err); }
}

export async function generateTrips(req: Request, res: Response, next: NextFunction) {
  try {
    const data = generateTripsSchema.parse(req.body);
    const result = await recurringTripService.generateTrips(req.user!.tenantId, req.user!.id, req.params.id, data);
    return sendSuccess(res, result, `${result.generatedCount} trip(s) generated`);
  } catch (err) { next(err); }
}

export async function getPatternCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    if (!startDate || !endDate) return sendSuccess(res, [], 'Calendar data retrieved');
    const dates = await recurringTripService.getPatternCalendar(req.user!.tenantId, req.params.id, startDate, endDate);
    return sendSuccess(res, dates, 'Calendar data retrieved');
  } catch (err) { next(err); }
}
