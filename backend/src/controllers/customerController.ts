import { Request, Response, NextFunction } from 'express';
import * as customerService from '../services/customerService';
import {
  createCustomerSchema, updateCustomerSchema, listCustomersQuerySchema,
} from '../validators/customers';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function createCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCustomerSchema.parse(req.body);
    const result = await customerService.createCustomer(req.user!.tenantId, input);
    sendSuccess(res, result, 'Customer created', undefined, 201);
  } catch (err) { next(err); }
}

export async function listCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listCustomersQuerySchema.parse(req.query);
    const result = await customerService.listCustomers(req.user!.tenantId, query);
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Customers fetched');
  } catch (err) { next(err); }
}

export async function getCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await customerService.getCustomerById(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Customer fetched');
  } catch (err) { next(err); }
}

export async function getCustomerBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await customerService.getCustomerBookingHistory(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Customer bookings fetched');
  } catch (err) { next(err); }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateCustomerSchema.parse(req.body);
    const result = await customerService.updateCustomer(req.user!.tenantId, req.params.id, input);
    sendSuccess(res, result, 'Customer updated');
  } catch (err) { next(err); }
}

export async function deleteCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await customerService.deleteCustomer(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Customer deleted');
  } catch (err) { next(err); }
}