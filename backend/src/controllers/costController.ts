import { Request, Response, NextFunction } from 'express';
import * as costService from '../services/costService';
import {
  createCostSchema, updateCostSchema, listCostsQuerySchema,
} from '../validators/costs';
import { sendSuccess } from '../utils/response';

export async function createCost(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCostSchema.parse(req.body);
    const result = await costService.createCost(req.user!.tenantId, req.user!.id, input);
    sendSuccess(res, result, 'Cost recorded', undefined, 201);
  } catch (err) { next(err); }
}

export async function listCosts(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listCostsQuerySchema.parse(req.query);
    const result = await costService.listCosts(req.user!.tenantId, query);
    res.status(200).json({
      success: true,
      message: 'Costs fetched',
      data: result.data,
      meta: {
        page: result.meta.page,
        pageSize: result.meta.pageSize,
        total: result.meta.total,
        totalPages: Math.ceil(result.meta.total / result.meta.pageSize),
        summary: result.summary,
      },
    });
  } catch (err) { next(err); }
}

export async function getCost(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await costService.getCostById(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Cost fetched');
  } catch (err) { next(err); }
}

export async function updateCost(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateCostSchema.parse(req.body);
    const result = await costService.updateCost(req.user!.tenantId, req.params.id, input);
    sendSuccess(res, result, 'Cost updated');
  } catch (err) { next(err); }
}

export async function byBus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await costService.getCostsByBus(req.user!.tenantId);
    sendSuccess(res, result, 'Costs by bus fetched');
  } catch (err) { next(err); }
}

export async function ageAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await costService.getAgeAnalytics(req.user!.tenantId);
    sendSuccess(res, result, 'Age analytics fetched');
  } catch (err) { next(err); }
}