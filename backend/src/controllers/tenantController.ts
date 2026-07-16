import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';

const createTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required'),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  domain: z.string().optional(),
  subscriptionTier: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function createTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createTenantSchema.parse(req.body);
    const tenant = await authService.createTenant(data.name, data.contactEmail, data.contactPhone);
    return sendSuccess(res, tenant, 'Tenant created successfully', undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function listTenants(_req: Request, res: Response, next: NextFunction) {
  try {
    const tenants = await authService.listTenants();
    return sendSuccess(res, tenants, 'Tenants retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await authService.getTenantById(req.params.id);
    if (!tenant) {
      return next(new NotFoundError('Tenant not found'));
    }
    return sendSuccess(res, tenant, 'Tenant retrieved');
  } catch (err) {
    next(err);
  }
}

export async function updateTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateTenantSchema.parse(req.body);
    const tenant = await authService.updateTenant(req.params.id, data);
    if (!tenant) {
      return next(new NotFoundError('Tenant not found'));
    }
    return sendSuccess(res, tenant, 'Tenant updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await authService.softDeleteTenant(req.params.id);
    if (!tenant) {
      return next(new NotFoundError('Tenant not found'));
    }
    return sendSuccess(res, tenant, 'Tenant deactivated');
  } catch (err) {
    next(err);
  }
}
