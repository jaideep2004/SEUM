import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message = 'Success', meta?: Record<string, unknown>, status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
    meta,
  });
}

export function sendError(res: Response, message: string, status = 400, details?: { field?: string; message: string }[]) {
  return res.status(status).json({
    success: false,
    error: {
      code: getErrorCode(status),
      message,
      details: details || undefined,
    },
  });
}

function getErrorCode(status: number): string {
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_ERROR',
  };
  return codes[status] || 'ERROR';
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  message = 'Success'
) {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
