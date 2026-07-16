import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

export function requireTenantAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }

  const requestedTenantId = req.params.tenantId || req.body.tenantId;

  if (requestedTenantId && requestedTenantId !== req.user.tenantId) {
    const isSuperAdmin = req.user.roles.includes('super_admin');
    if (!isSuperAdmin) {
      return next(new ForbiddenError('You do not have access to this tenant'));
    }
  }

  next();
}
