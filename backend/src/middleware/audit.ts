import { Request, Response, NextFunction } from 'express';
import { query } from '../db';

interface AuditEntry {
  tenantId: string;
  actorId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export async function createAuditLog(entry: AuditEntry) {
  try {
    await query(
      `INSERT INTO audit_logs (tenant_id, actor_id, action, resource, resource_id, old_value, new_value, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.tenantId,
        entry.actorId,
        entry.action,
        entry.resource,
        entry.resourceId,
        entry.oldValue ? JSON.stringify(entry.oldValue) : null,
        entry.newValue ? JSON.stringify(entry.newValue) : null,
        entry.ipAddress,
        entry.userAgent,
      ]
    );
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
}

export function audit(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    const tenantId = req.user?.tenantId;

    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      if (body?.success && req.method !== 'GET' && userId && tenantId) {
        const resourceId = req.params?.id || body?.data?.id || null;

        createAuditLog({
          tenantId,
          actorId: userId,
          action,
          resource,
          resourceId: resourceId || null,
          oldValue: (req as any).__oldValue || null,
          newValue: body?.data || null,
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
        });
      }

      return originalJson(body);
    };

    next();
  };
}
