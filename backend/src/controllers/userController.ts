import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { sendSuccess } from '../utils/response';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  tenantId: z.string().uuid().optional(),
  role: z.string().optional(),
  search: z.string().optional(),
});

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const queryParams = listQuerySchema.parse(req.query);
    const { tenantId, roles } = req.user!;
    const isSuperAdmin = roles.includes('super_admin');

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (queryParams.tenantId && isSuperAdmin) {
      conditions.push(`u.tenant_id = $${paramIndex}`);
      values.push(queryParams.tenantId);
      paramIndex++;
    } else if (!isSuperAdmin) {
      conditions.push(`u.tenant_id = $${paramIndex}`);
      values.push(tenantId);
      paramIndex++;
    }

    if (queryParams.role) {
      conditions.push(`EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = u.id AND r.name = $${paramIndex}
      )`);
      values.push(queryParams.role);
      paramIndex++;
    }

    if (queryParams.search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      values.push(`%${queryParams.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM users u ${whereClause}`, values
    );
    const total = parseInt(countResult[0].count, 10);

    const offset = (queryParams.page - 1) * queryParams.pageSize;
    const rows = await query(
      `SELECT u.id, u.tenant_id, u.email, u.name,
              COALESCE(
                (SELECT array_agg(r.name ORDER BY r.name) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id),
                '{}'
              ) as roles,
              u.is_active, u.created_at,
              t.name as tenant_name
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, queryParams.pageSize, offset]
    );

    return sendSuccess(res, rows, 'Users retrieved', {
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      total,
      totalPages: Math.ceil(total / queryParams.pageSize),
    });
  } catch (err) {
    next(err);
  }
}
