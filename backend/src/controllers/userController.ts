import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db';
import { sendSuccess } from '../utils/response';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  tenantId: z.string().uuid().optional(),
  role: z.string().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  roles: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
});

const ROLE_QUERY = `COALESCE(
  (SELECT array_agg(r.name ORDER BY r.name) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id),
  '{}'
) as roles`;

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

    if (queryParams.isActive !== undefined) {
      conditions.push(`u.is_active = $${paramIndex}`);
      values.push(queryParams.isActive);
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

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, roles } = req.user!;
      const isSuperAdmin = roles.includes('super_admin');
      const row = await queryOne<{ id: string }>(
        `UPDATE users SET is_active = false
         WHERE id = $1${isSuperAdmin ? '' : ' AND tenant_id = $2'}
         RETURNING id`,
        isSuperAdmin ? [req.params.id] : [req.params.id, tenantId]
      );
      if (!row) {
        return next(new NotFoundError('User not found'));
      }
      return sendSuccess(res, null, 'User deactivated');
    } catch (err) {
      next(err);
    }
  }

export async function updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateUserSchema.parse(req.body);
      const { tenantId, roles, userId } = req.user!;
      const isSuperAdmin = roles.includes('super_admin');

      const target = await queryOne<{ id: string; tenant_id: string; roles: string[] }>(
        `SELECT u.id, u.tenant_id, ${ROLE_QUERY}
         FROM users u WHERE u.id = $1 AND u.deleted_at IS NULL`,
        [req.params.id]
      );
      if (!target) {
        return next(new NotFoundError('User not found'));
      }

      if (!isSuperAdmin) {
        if (target.tenant_id !== tenantId) {
          return next(new NotFoundError('User not found'));
        }
        if (target.id === userId) {
          return next(new ForbiddenError('You cannot edit your own account'));
        }
        if (target.roles.includes('super_admin')) {
          return next(new ForbiddenError('Cannot edit a user with the super_admin role'));
        }
        if (data.roles?.includes('super_admin')) {
          return next(new ForbiddenError('Cannot assign the super_admin role'));
        }
      }

      if (data.email && data.email !== target.email) {
        const dup = await queryOne<{ id: string }>(
          'SELECT id FROM users WHERE email = $1 AND id <> $2 AND deleted_at IS NULL',
          [data.email, target.id]
        );
        if (dup) {
          return next(new ConflictError('A user with this email already exists'));
        }
      }

      const nextName = data.name ?? undefined;
      const nextEmail = data.email ?? undefined;
      const nextActive = data.isActive ?? undefined;
      if (nextName !== undefined || nextEmail !== undefined || nextActive !== undefined) {
        const sets: string[] = [];
        const values: any[] = [];
        let p = 1;
        if (nextName !== undefined) { sets.push(`name = $${p++}`); values.push(nextName); }
        if (nextEmail !== undefined) { sets.push(`email = $${p++}`); values.push(nextEmail); }
        if (nextActive !== undefined) { sets.push(`is_active = $${p++}`); values.push(nextActive); }
        sets.push(`updated_at = NOW()`);
        values.push(target.id);
        await query(
          `UPDATE users SET ${sets.join(', ')} WHERE id = $${p} RETURNING id`,
          values
        );
      }

      if (data.roles) {
        await query('DELETE FROM user_roles WHERE user_id = $1', [target.id]);
        for (const roleName of data.roles) {
          await query(
            `INSERT INTO user_roles (user_id, role_id)
             SELECT $1, r.id FROM roles r WHERE r.name = $2
             ON CONFLICT DO NOTHING`,
            [target.id, roleName]
          );
        }
      }

      const updated = await queryOne<any>(
        `SELECT u.id, u.tenant_id, u.email, u.name, u.is_active, u.created_at, ${ROLE_QUERY}
         FROM users u WHERE u.id = $1`,
        [target.id]
      );
      return sendSuccess(res, updated, 'User updated successfully');
    } catch (err) {
      next(err);
    }
  }

export async function hardDeleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await queryOne<{ id: string }>(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!row) {
      return next(new NotFoundError('User not found'));
    }
    return sendSuccess(res, null, 'User permanently deleted');
  } catch (err) {
    next(err);
  }
}
