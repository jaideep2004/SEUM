import { Request, Response, NextFunction } from 'express';
import * as maintenanceService from '../services/maintenanceService';
import {
  createTaskSchema, updateTaskSchema, listTasksQuerySchema,
  completeTaskSchema, cancelTaskSchema, calendarQuerySchema,
} from '../validators/maintenance';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createTaskSchema.parse(req.body);
    const result = await maintenanceService.createTask(req.user!.tenantId, req.user!.id, input);
    sendSuccess(res, result, 'Task scheduled', undefined, 201);
  } catch (err) { next(err); }
}

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listTasksQuerySchema.parse(req.query);
    const result = await maintenanceService.listTasks(req.user!.tenantId, query);
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Tasks fetched');
  } catch (err) { next(err); }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await maintenanceService.getTaskById(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Task fetched');
  } catch (err) { next(err); }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateTaskSchema.parse(req.body);
    const result = await maintenanceService.updateTask(req.user!.tenantId, req.params.id, input);
    sendSuccess(res, result, 'Task updated');
  } catch (err) { next(err); }
}

export async function startTask(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await maintenanceService.startTask(req.user!.tenantId, req.params.id, req.user!.id);
    sendSuccess(res, result, 'Task started');
  } catch (err) { next(err); }
}

export async function completeTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { notes, cost } = completeTaskSchema.parse(req.body);
    const result = await maintenanceService.completeTask(req.user!.tenantId, req.params.id, req.user!.id, notes, cost);
    sendSuccess(res, result, 'Task completed');
  } catch (err) { next(err); }
}

export async function cancelTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = cancelTaskSchema.parse(req.body);
    const result = await maintenanceService.cancelTask(req.user!.tenantId, req.params.id, req.user!.id, reason);
    sendSuccess(res, result, 'Task cancelled');
  } catch (err) { next(err); }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await maintenanceService.deleteTask(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Task deleted');
  } catch (err) { next(err); }
}

export async function calendar(req: Request, res: Response, next: NextFunction) {
  try {
    const { year, month, status } = calendarQuerySchema.parse(req.query);
    const result = await maintenanceService.getCalendar(
      req.user!.tenantId,
      year ?? new Date().getFullYear(),
      month ?? new Date().getMonth() + 1,
      status
    );
    sendSuccess(res, result, 'Calendar fetched');
  } catch (err) { next(err); }
}

export async function autoGenerate(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await maintenanceService.autoGenerateTasks(req.user!.tenantId, req.user!.id);
    sendSuccess(res, result, 'Auto-generation complete');
  } catch (err) { next(err); }
}