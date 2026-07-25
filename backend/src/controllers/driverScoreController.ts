import { Request, Response, NextFunction } from 'express';
import * as scoreService from '../services/driverScoreService';
import { computeScoreSchema, listScoresSchema, leaderboardSchema } from '../validators/driverScores';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function compute(req: Request, res: Response, next: NextFunction) {
  try {
    const input = computeScoreSchema.parse(req.body);
    const result = await scoreService.computeScore(req.user!.tenantId, req.params.driverId, input.period_start, input.period_end, req.user!.id);
    sendSuccess(res, result, 'Score computed');
  } catch (err) { next(err); }
}

export async function history(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listScoresSchema.parse(req.query);
    const result = await scoreService.getScoreHistory(req.user!.tenantId, req.params.driverId, query.page, query.pageSize);
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Score history fetched');
  } catch (err) { next(err); }
}

export async function leaderboard(req: Request, res: Response, next: NextFunction) {
  try {
    const query = leaderboardSchema.parse(req.query);
    const result = await scoreService.getLeaderboard(req.user!.tenantId, query.period, query.page, query.pageSize);
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Leaderboard fetched');
  } catch (err) { next(err); }
}

export async function latest(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await scoreService.getLatestScore(req.user!.tenantId, req.params.driverId);
    sendSuccess(res, result, 'Latest score fetched');
  } catch (err) { next(err); }
}
