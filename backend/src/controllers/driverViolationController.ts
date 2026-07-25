import { Request, Response, NextFunction } from 'express';
import * as violationService from '../services/driverViolationService';
import { createViolationSchema, updateViolationSchema, listViolationsSchema, disputeViolationSchema } from '../validators/driverViolations';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createViolationSchema.parse(req.body);
    const result = await violationService.createViolation(req.user!.tenantId, {
      driverId: input.driver_id, violationType: input.violation_type,
      severity: input.severity, tripId: input.trip_id,
      description: input.description, actionTaken: input.action_taken,
    }, req.user!.id);
    sendSuccess(res, result, 'Violation recorded', undefined, 201);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listViolationsSchema.parse(req.query);
    const result = await violationService.listViolations(req.user!.tenantId, {
      driverId: query.driver_id, status: query.status, severity: query.severity,
      violationType: query.violation_type,
      startDate: query.start_date, endDate: query.end_date,
      page: query.page, pageSize: query.pageSize,
    });
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Violations fetched');
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateViolationSchema.parse(req.body);
    const result = await violationService.updateViolation(req.user!.tenantId, req.params.id, {
      status: input.status, actionTaken: input.action_taken,
    });
    sendSuccess(res, result, 'Violation updated');
  } catch (err) { next(err); }
}

export async function dispute(req: Request, res: Response, next: NextFunction) {
  try {
    const input = disputeViolationSchema.parse(req.body);
    const result = await violationService.disputeViolation(req.user!.tenantId, req.params.id, {
      reason: input.reason, evidence: input.evidence,
    });
    sendSuccess(res, result, 'Violation disputed');
  } catch (err) { next(err); }
}

export async function safetyScore(req: Request, res: Response, next: NextFunction) {
  try {
    const driverId = req.params.driverId;
    const result = await violationService.getSafetyScore(req.user!.tenantId, driverId);
    sendSuccess(res, result, 'Safety score fetched');
  } catch (err) { next(err); }
}

export async function leaderboard(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await violationService.getSafetyLeaderboard(req.user!.tenantId);
    sendSuccess(res, result, 'Leaderboard fetched');
  } catch (err) { next(err); }
}
