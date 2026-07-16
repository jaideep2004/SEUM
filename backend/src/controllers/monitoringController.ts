import { Request, Response, NextFunction } from 'express';
import * as monitoringService from '../services/monitoringService';
import { overrideStatusSchema, externalUpdateSchema, monitoringQuerySchema, delayQuerySchema } from '../validators/monitoring';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const q = monitoringQuerySchema.parse(req.query);
    const data = await monitoringService.getMonitoringDashboard(req.user!.tenantId, q.date);
    return sendSuccess(res, data, 'Monitoring dashboard data retrieved');
  } catch (err) { next(err); }
}

export async function getDelayedTrips(req: Request, res: Response, next: NextFunction) {
  try {
    const q = delayQuerySchema.parse(req.query);
    const result = await monitoringService.getDelayedTrips(req.user!.tenantId, q);
    return sendPaginated(res, result.data, result.meta.total, q.page, q.pageSize, 'Delayed trips retrieved');
  } catch (err) { next(err); }
}

export async function manualOverride(req: Request, res: Response, next: NextFunction) {
  try {
    const data = overrideStatusSchema.parse(req.body);
    const trip = await monitoringService.manualStatusOverride(req.user!.tenantId, req.params.id, req.user!.id, data);
    return sendSuccess(res, trip, 'Status override applied');
  } catch (err) { next(err); }
}

export async function externalUpdate(req: Request, res: Response, next: NextFunction) {
  try {
    const data = externalUpdateSchema.parse(req.body);
    const result = await monitoringService.logExternalUpdate(req.user!.tenantId, req.params.id, data);
    return sendSuccess(res, result, 'External status update logged');
  } catch (err) { next(err); }
}

export async function getTimelineComparison(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await monitoringService.getTimelineComparison(req.user!.tenantId, req.params.id);
    return sendSuccess(res, data, 'Timeline comparison retrieved');
  } catch (err) { next(err); }
}

export async function getStatusLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const logs = await monitoringService.getTripStatusLogs(req.user!.tenantId, req.params.id);
    return sendSuccess(res, logs, 'Status logs retrieved');
  } catch (err) { next(err); }
}
