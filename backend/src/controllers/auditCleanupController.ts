import { Request, Response, NextFunction } from 'express';
import { cleanupOldAuditLogs } from '../services/auditCleanupService';
import { sendSuccess } from '../utils/response';

export async function triggerCleanup(req: Request, res: Response, next: NextFunction) {
  try {
    const retentionDays = parseInt(req.query.retentionDays as string) || 90;
    const result = await cleanupOldAuditLogs(retentionDays);
    return sendSuccess(res, result, 'Audit log cleanup completed');
  } catch (err) {
    next(err);
  }
}
