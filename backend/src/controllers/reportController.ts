import { Request, Response, NextFunction } from 'express';
import * as reportService from '../services/reportService';
import { tripReportQuerySchema } from '../validators/reports';
import { sendSuccess } from '../utils/response';

export async function getTripReport(req: Request, res: Response, next: NextFunction) {
  try {
    const q = tripReportQuerySchema.parse(req.query);
    const [summary, drivers, routes, buses] = await Promise.all([
      reportService.getTripSummary(req.user!.tenantId, q.startDate, q.endDate),
      reportService.getDriverPerformance(req.user!.tenantId, q.startDate, q.endDate),
      reportService.getRoutePerformance(req.user!.tenantId, q.startDate, q.endDate),
      reportService.getBusUtilization(req.user!.tenantId, q.startDate, q.endDate),
    ]);
    return sendSuccess(res, { summary, drivers, routes, buses }, 'Trip report retrieved');
  } catch (err) { next(err); }
}

export async function getTripSummaryData(req: Request, res: Response, next: NextFunction) {
  try {
    const q = tripReportQuerySchema.parse(req.query);
    const data = await reportService.getTripSummary(req.user!.tenantId, q.startDate, q.endDate);
    return sendSuccess(res, data, 'Trip summary retrieved');
  } catch (err) { next(err); }
}

export async function getDriverReport(req: Request, res: Response, next: NextFunction) {
  try {
    const q = tripReportQuerySchema.parse(req.query);
    const data = await reportService.getDriverPerformance(req.user!.tenantId, q.startDate, q.endDate);
    return sendSuccess(res, data, 'Driver performance report retrieved');
  } catch (err) { next(err); }
}

export async function getRouteReport(req: Request, res: Response, next: NextFunction) {
  try {
    const q = tripReportQuerySchema.parse(req.query);
    const data = await reportService.getRoutePerformance(req.user!.tenantId, q.startDate, q.endDate);
    return sendSuccess(res, data, 'Route performance report retrieved');
  } catch (err) { next(err); }
}

export async function getBusUtilizationReport(req: Request, res: Response, next: NextFunction) {
  try {
    const q = tripReportQuerySchema.parse(req.query);
    const data = await reportService.getBusUtilization(req.user!.tenantId, q.startDate, q.endDate);
    return sendSuccess(res, data, 'Bus utilization report retrieved');
  } catch (err) { next(err); }
}

export async function exportTripReport(req: Request, res: Response, next: NextFunction) {
  try {
    const q = tripReportQuerySchema.parse(req.query);
    const format = (req.query.format as string) || 'csv';
    const section = (req.query.section as string) || 'trips';

    let csv = '';
    let filename = 'trip-report';

    if (section === 'trips') {
      csv = await reportService.exportTripReportCSV(req.user!.tenantId, q.startDate, q.endDate);
      filename = 'trip-report';
    } else if (section === 'drivers') {
      csv = await reportService.exportDriverPerformanceCSV(req.user!.tenantId, q.startDate, q.endDate);
      filename = 'driver-performance';
    } else if (section === 'routes') {
      csv = await reportService.exportRoutePerformanceCSV(req.user!.tenantId, q.startDate, q.endDate);
      filename = 'route-performance';
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }

    return sendSuccess(res, { csv, filename }, 'Report generated');
  } catch (err) { next(err); }
}
