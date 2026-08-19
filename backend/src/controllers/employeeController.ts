import { Request, Response, NextFunction } from 'express';
import * as employeeService from '../services/employeeService';
import { createEmployeeSchema, updateEmployeeSchema, listEmployeesQuerySchema } from '../validators/employees';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function createEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createEmployeeSchema.parse(req.body);
    const employee = await employeeService.createEmployee(req.user!.tenantId, data);
    return sendSuccess(res, employee, 'Employee created successfully', undefined, 201);
  } catch (err) { next(err); }
}

export async function listEmployees(req: Request, res: Response, next: NextFunction) {
  try {
    const queryParams = listEmployeesQuerySchema.parse(req.query);
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const result = await employeeService.listEmployees(req.user!.tenantId, queryParams, isSuperAdmin);
    return sendPaginated(res, result.data, result.meta.total, queryParams.page, queryParams.pageSize, 'Employees retrieved');
  } catch (err) { next(err); }
}

export async function getEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const employee = await employeeService.getEmployeeById(req.user!.tenantId, req.params.id, isSuperAdmin);
    return sendSuccess(res, employee, 'Employee retrieved');
  } catch (err) { next(err); }
}

export async function updateEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateEmployeeSchema.parse(req.body);
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const employee = await employeeService.updateEmployee(req.user!.tenantId, req.params.id, data, isSuperAdmin);
    return sendSuccess(res, employee, 'Employee updated');
  } catch (err) { next(err); }
}

export async function deleteEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const result = await employeeService.softDeleteEmployee(req.user!.tenantId, req.params.id, isSuperAdmin);
    return sendSuccess(res, result, 'Employee deactivated');
  } catch (err) { next(err); }
}
