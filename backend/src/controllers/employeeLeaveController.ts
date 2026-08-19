import { Request, Response, NextFunction } from 'express';
import * as leaveService from '../services/employeeLeaveService';
import {
  applyEmployeeLeaveSchema, listEmployeeLeavesSchema,
  approveEmployeeLeaveSchema, rejectEmployeeLeaveSchema,
} from '../validators/employeeLeaves';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function apply(req: Request, res: Response, next: NextFunction) {
  try {
    const input = applyEmployeeLeaveSchema.parse(req.body);
    const result = await leaveService.applyLeave(req.user!.tenantId, req.user!.id, {
      employeeId: input.employee_id, leaveType: input.leave_type,
      startDate: input.start_date, endDate: input.end_date,
      reason: input.reason, documents: input.documents,
    });
    sendSuccess(res, result, 'Leave applied', undefined, 201);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listEmployeeLeavesSchema.parse(req.query);
    const result = await leaveService.listLeaves(req.user!.tenantId, {
      employeeId: query.employee_id, status: query.status, leaveType: query.leave_type,
      department: query.department,
      startDate: query.start_date, endDate: query.end_date,
      page: query.page, pageSize: query.pageSize,
    });
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Leaves fetched');
  } catch (err) { next(err); }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await leaveService.getLeaveById(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Leave fetched');
  } catch (err) { next(err); }
}

export async function managerApprove(req: Request, res: Response, next: NextFunction) {
  try {
    const { approved_by } = approveEmployeeLeaveSchema.parse(req.body);
    const result = await leaveService.managerApproveLeave(req.user!.tenantId, req.params.id, approved_by);
    sendSuccess(res, result, 'Manager approved');
  } catch (err) { next(err); }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const { approved_by } = approveEmployeeLeaveSchema.parse(req.body);
    const result = await leaveService.approveLeave(req.user!.tenantId, req.params.id, approved_by);
    sendSuccess(res, result, 'Leave approved');
  } catch (err) { next(err); }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = rejectEmployeeLeaveSchema.parse(req.body);
    const result = await leaveService.rejectLeave(req.user!.tenantId, req.params.id, req.user!.id, reason);
    sendSuccess(res, result, 'Leave rejected');
  } catch (err) { next(err); }
}

export async function balance(req: Request, res: Response, next: NextFunction) {
  try {
    const employeeId = req.params.employeeId;
    const result = await leaveService.getLeaveBalance(req.user!.tenantId, employeeId);
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
