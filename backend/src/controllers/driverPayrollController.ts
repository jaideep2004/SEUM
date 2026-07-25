import { Request, Response, NextFunction } from 'express';
import * as payrollService from '../services/driverPayrollService';
import { generatePayrollSchema, listPayrollSchema, payPayrollSchema } from '../validators/driverPayroll';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function generate(req: Request, res: Response, next: NextFunction) {
  try {
    const input = generatePayrollSchema.parse(req.body);
    const result = await payrollService.generatePayroll(req.user!.tenantId, {
      periodStart: input.period_start, periodEnd: input.period_end,
      driverIds: input.driver_ids, baseSalaries: input.base_salaries,
      tripRate: input.trip_rate,
    });
    sendSuccess(res, result, 'Payroll generated', undefined, 201);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listPayrollSchema.parse(req.query);
    const result = await payrollService.listPayroll(req.user!.tenantId, {
      driverId: query.driver_id, status: query.status,
      startDate: query.start_date, endDate: query.end_date,
      page: query.page, pageSize: query.pageSize,
    });
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Payroll records fetched');
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
    const { payment_reference } = payPayrollSchema.parse(req.body);
    const result = await payrollService.payPayroll(req.user!.tenantId, req.params.id, payment_reference);
    sendSuccess(res, result, 'Payroll marked as paid');
  } catch (err) { next(err); }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await payrollService.getPayrollDetail(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Payroll detail fetched');
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
