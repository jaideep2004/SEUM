import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    const hasRole = req.user.roles.some((r) => roles.includes(r));
    if (!hasRole) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

/**
 * Require a specific permission (resource + action) based on the user's roles.
 * super_admin has access to everything.
 * Uses the role_permissions table to resolve role → permission mappings.
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    const { roles } = req.user;

    // super_admin bypass
    if (roles.includes('super_admin')) {
      return next();
    }

    try {
      const result = await query<{ has_permission: boolean }>(
        `SELECT EXISTS (
          SELECT 1 FROM role_permissions rp
          JOIN permissions p ON p.id = rp.permission_id
          WHERE rp.role = ANY($1)
            AND p.resource = $2
            AND p.action = $3
        ) as has_permission`,
        [roles, resource, action]
      );

      if (!result[0]?.has_permission) {
        return next(new ForbiddenError(`Missing permission: ${resource}:${action}`));
      }

      next();
    } catch {
      return next(new ForbiddenError('Permission check failed'));
    }
  };
}
