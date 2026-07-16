import { Request, Response, NextFunction } from 'express';
import * as routeService from '../services/routeService';
import { createRouteSchema, updateRouteSchema, createStopSchema, routeQuerySchema } from '../validators/operations';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function createRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createRouteSchema.parse(req.body);
    const route = await routeService.createRoute(req.user!.tenantId, data);
    return sendSuccess(res, route, 'Route created successfully', undefined, 201);
  } catch (err) { next(err); }
}

export async function listRoutes(req: Request, res: Response, next: NextFunction) {
  try {
    const queryParams = routeQuerySchema.parse(req.query);
    const result = await routeService.listRoutes(req.user!.tenantId, queryParams);
    return sendPaginated(res, result.data, result.meta.total, queryParams.page, queryParams.pageSize, 'Routes retrieved');
  } catch (err) { next(err); }
}

export async function getRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const route = await routeService.getRouteById(req.user!.tenantId, req.params.id);
    return sendSuccess(res, route, 'Route retrieved');
  } catch (err) { next(err); }
}

export async function updateRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateRouteSchema.parse(req.body);
    const route = await routeService.updateRoute(req.user!.tenantId, req.params.id, data);
    return sendSuccess(res, route, 'Route updated');
  } catch (err) { next(err); }
}

export async function deleteRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await routeService.softDeleteRoute(req.user!.tenantId, req.params.id);
    return sendSuccess(res, result, 'Route deleted');
  } catch (err) { next(err); }
}

export async function addStop(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createStopSchema.parse(req.body);
    const stop = await routeService.addStop(req.user!.tenantId, req.params.id, data);
    return sendSuccess(res, stop, 'Stop added', undefined, 201);
  } catch (err) { next(err); }
}

export async function removeStop(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await routeService.removeStop(req.user!.tenantId, req.params.id, req.params.stopId);
    return sendSuccess(res, result, 'Stop removed');
  } catch (err) { next(err); }
}
