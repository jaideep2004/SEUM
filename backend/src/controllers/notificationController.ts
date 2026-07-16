import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db';
import { sendSuccess } from '../utils/response';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
  unread: z.coerce.boolean().optional(),
});

export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const queryParams = listQuerySchema.parse(req.query);
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    const conditions = ['n.user_id = $1', 'n.tenant_id = $2'];
    const values: any[] = [userId, tenantId];
    let paramIndex = 3;

    if (queryParams.unread) {
      conditions.push(`n.is_read = $${paramIndex}`);
      values.push(false);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM notifications n ${whereClause}`, values
    );
    const total = parseInt(countResult[0].count, 10);

    const offset = (queryParams.page - 1) * queryParams.pageSize;
    const rows = await query(
      `SELECT n.* FROM notifications n ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, queryParams.pageSize, offset]
    );

    return sendSuccess(res, rows, 'Notifications retrieved', {
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      total,
      totalPages: Math.ceil(total / queryParams.pageSize),
    });
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM notifications
       WHERE user_id = $1 AND tenant_id = $2 AND is_read = false`,
      [userId, tenantId]
    );

    return sendSuccess(res, { unreadCount: parseInt(result?.count || '0', 10) });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    await query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );
    return sendSuccess(res, null, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    await query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
}
