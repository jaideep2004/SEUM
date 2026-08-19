import { Request, Response, NextFunction } from 'express';
import * as partService from '../services/partService';
import {
  createPartSchema, updatePartSchema, listPartsQuerySchema,
  stockInSchema, stockOutSchema, listTransactionsQuerySchema,
} from '../validators/parts';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function createPart(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createPartSchema.parse(req.body);
    const result = await partService.createPart(req.user!.tenantId, req.user!.id, input);
    sendSuccess(res, result, 'Part created', undefined, 201);
  } catch (err) { next(err); }
}

export async function listParts(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listPartsQuerySchema.parse(req.query);
    const result = await partService.listParts(req.user!.tenantId, query);
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Parts fetched');
  } catch (err) { next(err); }
}

export async function getPart(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await partService.getPartById(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Part fetched');
  } catch (err) { next(err); }
}

export async function updatePart(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updatePartSchema.parse(req.body);
    const result = await partService.updatePart(req.user!.tenantId, req.params.id, input);
    sendSuccess(res, result, 'Part updated');
  } catch (err) { next(err); }
}

export async function stockIn(req: Request, res: Response, next: NextFunction) {
  try {
    const input = stockInSchema.parse(req.body);
    const result = await partService.stockIn(req.user!.tenantId, req.params.id, req.user!.id, input);
    sendSuccess(res, result, 'Stock added');
  } catch (err) { next(err); }
}

export async function stockOut(req: Request, res: Response, next: NextFunction) {
  try {
    const input = stockOutSchema.parse(req.body);
    const result = await partService.stockOut(req.user!.tenantId, req.params.id, req.user!.id, input);
    sendSuccess(res, result, 'Stock removed');
  } catch (err) { next(err); }
}

export async function transactions(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listTransactionsQuerySchema.parse(req.query);
    const result = await partService.listTransactions(req.user!.tenantId, query);
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Transactions fetched');
  } catch (err) { next(err); }
}

export async function usageByBus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await partService.getUsageByBus(req.user!.tenantId, req.params.busId);
    sendSuccess(res, result, 'Part usage fetched');
  } catch (err) { next(err); }
}