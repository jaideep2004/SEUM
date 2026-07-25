import { Request, Response, NextFunction } from 'express';
import * as leaveService from '../services/driverLeaveService';
import { applyLeaveSchema, listLeavesSchema, approveLeaveSchema, rejectLeaveSchema } from '../validators/driverLeaves';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function apply(req: Request, res: Response, next: NextFunction) {
  try {
    const input = applyLeaveSchema.parse(req.body);
    const result = await leaveService.applyLeave(req.user!.tenantId, {
      driverId: input.driver_id, leaveType: input.leave_type,
      startDate: input.start_date, endDate: input.end_date,
      reason: input.reason, documents: input.documents,
    });
    sendSuccess(res, result, 'Leave applied', undefined, 201);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listLeavesSchema.parse(req.query);
    const result = await leaveService.listLeaves(req.user!.tenantId, {
      driverId: query.driver_id, status: query.status, leaveType: query.leave_type,
      startDate: query.start_date, endDate: query.end_date,
      page: query.page, pageSize: query.pageSize,
    });
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Leaves fetched');
  } catch (err) { next(err); }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const { approved_by } = approveLeaveSchema.parse(req.body);
    const result = await leaveService.approveLeave(req.user!.tenantId, req.params.id, approved_by);
    sendSuccess(res, result, 'Leave approved');
  } catch (err) { next(err); }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = rejectLeaveSchema.parse(req.body);
    const result = await leaveService.rejectLeave(req.user!.tenantId, req.params.id, reason);
    sendSuccess(res, result, 'Leave rejected');
  } catch (err) { next(err); }
}

export async function balance(req: Request, res: Response, next: NextFunction) {
  try {
    const driverId = req.params.driverId || req.query.driver_id as string;
    const result = await leaveService.getLeaveBalance(req.user!.tenantId, driverId);
    sendSuccess(res, result, 'Leave balance fetched');
  } catch (err) { next(err); }
}

export async function calendar(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const result = await leaveService.getCalendar(req.user!.tenantId, year, month);
    sendSuccess(res, result, 'Calendar fetched');
  } catch (err) { next(err); }
}
