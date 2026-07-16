import { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analyticsService';
import { sendSuccess } from '../utils/response';

export async function getFleetAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const analytics = await analyticsService.getFleetAnalytics(req.user!.tenantId);
    return sendSuccess(res, analytics, 'Fleet analytics retrieved');
  } catch (err) {
    next(err);
  }
}

export async function exportFleetReport(req: Request, res: Response, next: NextFunction) {
  try {
    const format = (req.query.format as string) || 'csv';
    const csv = await analyticsService.exportFleetReportCSV(req.user!.tenantId);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="fleet-report.csv"');
      return res.send(csv);
    }

    return sendSuccess(res, { csv }, 'Fleet report generated');
  } catch (err) {
    next(err);
  }
}
