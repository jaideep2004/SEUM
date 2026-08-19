import { Request, Response, NextFunction } from 'express';
import * as breakdownService from '../services/breakdownService';
import {
  createBreakdownSchema, listBreakdownsQuerySchema,
  dispatchBreakdownSchema, resolveBreakdownSchema,
} from '../validators/breakdowns';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function reportBreakdown(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createBreakdownSchema.parse(req.body);
    const result = await breakdownService.reportBreakdown(req.user!.tenantId, req.user!.id, input);
    sendSuccess(res, result, 'Breakdown reported', undefined, 201);
  } catch (err) { next(err); }
}

export async function listBreakdowns(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listBreakdownsQuerySchema.parse(req.query);
    const result = await breakdownService.listBreakdowns(req.user!.tenantId, query);
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Breakdowns fetched');
  } catch (err) { next(err); }
}

export async function getBreakdown(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await breakdownService.getBreakdownById(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Breakdown fetched');
  } catch (err) { next(err); }
}

export async function dispatchBreakdown(req: Request, res: Response, next: NextFunction) {
  try {
    const { mechanic } = dispatchBreakdownSchema.parse(req.body);
    const result = await breakdownService.dispatchBreakdown(req.user!.tenantId, req.params.id, req.user!.id, mechanic);
    sendSuccess(res, result, 'Mechanic dispatched');
  } catch (err) { next(err); }
}

export async function startBreakdown(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await breakdownService.startBreakdown(req.user!.tenantId, req.params.id, req.user!.id);
    sendSuccess(res, result, 'Breakdown work started');
  } catch (err) { next(err); }
}

export async function resolveBreakdown(req: Request, res: Response, next: NextFunction) {
  try {
    const { notes, cost } = resolveBreakdownSchema.parse(req.body);
    const result = await breakdownService.resolveBreakdown(req.user!.tenantId, req.params.id, req.user!.id, notes, cost);
    sendSuccess(res, result, 'Breakdown resolved');
  } catch (err) { next(err); }
}

export async function heatmap(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await breakdownService.getHeatmap(req.user!.tenantId);
    sendSuccess(res, result, 'Breakdown heatmap fetched');
  } catch (err) { next(err); }
}