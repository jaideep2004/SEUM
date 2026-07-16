import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { sendSuccess } from '../utils/response';
import { ForbiddenError } from '../utils/errors';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  action: z.string().optional(),
  resource: z.string().optional(),
  actorId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function listAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const queryParams = listQuerySchema.parse(req.query);
    const { userId, tenantId, roles } = req.user!;
    const isSuperAdmin = roles.includes('super_admin');

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (!isSuperAdmin) {
      conditions.push(`al.tenant_id = $${paramIndex}`);
      values.push(tenantId);
      paramIndex++;
    } else if (req.query.tenantId) {
      conditions.push(`al.tenant_id = $${paramIndex}`);
      values.push(req.query.tenantId);
      paramIndex++;
    }

    if (queryParams.action) {
      conditions.push(`al.action = $${paramIndex}`);
      values.push(queryParams.action);
      paramIndex++;
    }

    if (queryParams.resource) {
      conditions.push(`al.resource = $${paramIndex}`);
      values.push(queryParams.resource);
      paramIndex++;
    }

    if (queryParams.actorId) {
      conditions.push(`al.actor_id = $${paramIndex}`);
      values.push(queryParams.actorId);
      paramIndex++;
    }

    if (queryParams.from) {
      conditions.push(`al.created_at >= $${paramIndex}`);
      values.push(queryParams.from);
      paramIndex++;
    }

    if (queryParams.to) {
      conditions.push(`al.created_at <= $${paramIndex}`);
      values.push(queryParams.to);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<{ count: string }>(`SELECT COUNT(*) FROM audit_logs al ${whereClause}`, values);
    const total = parseInt(countResult[0].count, 10);

    const offset = (queryParams.page - 1) * queryParams.pageSize;
    const rows = await query(
      `SELECT al.*, u.name as actor_name, u.email as actor_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, queryParams.pageSize, offset]
    );

    return sendSuccess(res, rows, 'Audit logs retrieved', {
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      total,
      totalPages: Math.ceil(total / queryParams.pageSize),
    });
  } catch (err) {
    next(err);
  }
}
