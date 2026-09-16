import { Request, Response, NextFunction } from 'express';
import * as agentService from '../services/agentService';
import { z } from 'zod';
import { sendSuccess, sendPaginated } from '../utils/response';

const querySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export async function listAgents(req: Request, res: Response, next: NextFunction) {
  try {
    const q = querySchema.parse(req.query);
    const result = await agentService.listAgents(req.user!.tenantId, q);
    return sendPaginated(res, result.data, result.meta.total, q.page, q.pageSize, 'Agents retrieved');
  } catch (err) {
    next(err);
  }
}
