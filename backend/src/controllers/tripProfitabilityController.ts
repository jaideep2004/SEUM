import { Request, Response, NextFunction } from 'express';
import * as profitService from '../services/tripProfitabilityService';
import { sendSuccess, sendPaginated } from '../utils/response';
import { z } from 'zod';

const listSchema = z.object({
  status: z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  route_id: z.string().uuid().optional(),
  bus_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

const analyticsSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  group_by: z.enum(['route', 'bus']).optional(),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listSchema.parse(req.query);
    const result = await profitService.listTripProfitability(req.user!.tenantId, {
      status: query.status, startDate: query.start_date, endDate: query.end_date,
      routeId: query.route_id, busId: query.bus_id,
      page: query.page, pageSize: query.pageSize,
    });
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Trip profitability fetched');
  } catch (err) { next(err); }
}

export async function analytics(req: Request, res: Response, next: NextFunction) {
  try {
    const query = analyticsSchema.parse(req.query);
    const result = await profitService.getProfitAnalytics(req.user!.tenantId, {
      startDate: query.start_date, endDate: query.end_date,
      groupBy: query.group_by,
    });
    sendSuccess(res, result, 'Profit analytics fetched');
  } catch (err) { next(err); }
}
