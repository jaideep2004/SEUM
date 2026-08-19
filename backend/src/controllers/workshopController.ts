import { Request, Response, NextFunction } from 'express';
import * as workshopService from '../services/workshopService';
import {
  createWorkshopSchema, updateWorkshopSchema, listWorkshopsQuerySchema,
} from '../validators/workshops';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function createWorkshop(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createWorkshopSchema.parse(req.body);
    const result = await workshopService.createWorkshop(req.user!.tenantId, input);
    sendSuccess(res, result, 'Workshop created', undefined, 201);
  } catch (err) { next(err); }
}

export async function listWorkshops(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listWorkshopsQuerySchema.parse(req.query);
    const result = await workshopService.listWorkshops(req.user!.tenantId, query);
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Workshops fetched');
  } catch (err) { next(err); }
}

export async function getWorkshop(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await workshopService.getWorkshopById(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Workshop fetched');
  } catch (err) { next(err); }
}

export async function updateWorkshop(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateWorkshopSchema.parse(req.body);
    const result = await workshopService.updateWorkshop(req.user!.tenantId, req.params.id, input);
    sendSuccess(res, result, 'Workshop updated');
  } catch (err) { next(err); }
}

export async function deleteWorkshop(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await workshopService.deleteWorkshop(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Workshop deleted');
  } catch (err) { next(err); }
}

export async function getWorkshopTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await workshopService.getWorkshopTasks(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Workshop tasks fetched');
  } catch (err) { next(err); }
}

export async function workOrderPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const pdf = await workshopService.generateWorkOrderPdf(req.user!.tenantId, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="work-order-${req.params.id.slice(0, 8)}.pdf"`);
    res.send(pdf);
  } catch (err) { next(err); }
}