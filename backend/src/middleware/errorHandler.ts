import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

function errorCode(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN',
    404: 'NOT_FOUND', 409: 'CONFLICT', 422: 'VALIDATION_ERROR',
    429: 'TOO_MANY_REQUESTS', 500: 'INTERNAL_ERROR',
  };
  return map[status] || 'ERROR';
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: errorCode(err.statusCode),
        message: err.message,
        details: err.errors || undefined,
      },
    });
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    });
  }

  logger.error({ err, message: err.message, stack: err.stack }, 'Unhandled error');

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
  });
}
