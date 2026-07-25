import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import { queryOne } from '../db';

export function requireFeature(featureName: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new ForbiddenError('Authentication required'));
      }

      const tenant = await queryOne<{ feature_flags: Record<string, boolean> }>(
        'SELECT feature_flags FROM tenants WHERE id = $1',
        [req.user.tenantId]
      );

      if (!tenant) {
        return next(new ForbiddenError('Tenant not found'));
      }

      const flags = tenant.feature_flags || {};
      if (flags[featureName] === false) {
        return next(new ForbiddenError(`Feature "${featureName}" is not enabled for this tenant`));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
