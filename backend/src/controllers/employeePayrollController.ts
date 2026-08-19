import { Request, Response, NextFunction } from 'express';
import * as payrollService from '../services/employeePayrollService';
import {
  upsertSalaryStructureSchema, updateSalaryStructureSchema, listSalaryStructuresSchema,
  generateEmployeePayrollSchema, listEmployeePayrollSchema, payEmployeePayrollSchema,
} from '../validators/employeePayroll';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function upsertStructure(req: Request, res: Response, next: NextFunction) {
  try {
    const input = upsertSalaryStructureSchema.parse(req.body);
    const result = await payrollService.upsertSalaryStructure(req.user!.tenantId, input);
    sendSuccess(res, result, 'Salary structure saved', undefined, 201);
  } catch (err) { next(err); }
}

export async function listStructures(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listSalaryStructuresSchema.parse(req.query);
    const result = await payrollService.listSalaryStructures(req.user!.tenantId, {
      employeeId: query.employee_id, page: query.page, pageSize: query.pageSize,
    });
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Salary structures fetched');
  } catch (err) { next(err); }
}

export async function getStructure(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await payrollService.getSalaryStructure(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Salary structure fetched');
  } catch (err) { next(err); }
}

export async function updateStructure(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateSalaryStructureSchema.parse(req.body);
    const result = await payrollService.updateSalaryStructure(req.user!.tenantId, req.params.id, input);
    sendSuccess(res, result, 'Salary structure updated');
  } catch (err) { next(err); }
}

export async function generate(req: Request, res: Response, next: NextFunction) {
  try {
    const input = generateEmployeePayrollSchema.parse(req.body);
    const result = await payrollService.generatePayroll(req.user!.tenantId, {
      periodStart: input.period_start, periodEnd: input.period_end,
      employeeIds: input.employee_ids,
    });
    sendSuccess(res, result, 'Payroll generated', undefined, 201);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listEmployeePayrollSchema.parse(req.query);
    const result = await payrollService.listPayroll(req.user!.tenantId, {
      employeeId: query.employee_id, status: query.status,
      periodStart: query.period_start, periodEnd: query.period_end,
      page: query.page, pageSize: query.pageSize,
    });
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Payroll records fetched');
  } catch (err) { next(err); }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await payrollService.getPayrollDetail(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Payroll detail fetched');
  } catch (err) { next(err); }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await payrollService.approvePayroll(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Payroll approved');
  } catch (err) { next(err); }
}

export async function pay(req: Request, res: Response, next: NextFunction) {
  try {
    const { payment_reference } = payEmployeePayrollSchema.parse(req.body);
    const result = await payrollService.payPayroll(req.user!.tenantId, req.params.id, payment_reference);
    sendSuccess(res, result, 'Payroll marked as paid');
  } catch (err) { next(err); }
}

export async function summary(req: Request, res: Response, next: NextFunction) {
  try {
    const periodStart = req.query.period_start as string;
    const periodEnd = req.query.period_end as string;
    const result = await payrollService.getPayrollSummary(req.user!.tenantId, periodStart, periodEnd);
    sendSuccess(res, result, 'Payroll summary fetched');
  } catch (err) { next(err); }
}
