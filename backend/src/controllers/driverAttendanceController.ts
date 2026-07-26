import { Request, Response, NextFunction } from 'express';
import * as attendanceService from '../services/driverAttendanceService';
import { createAttendanceSchema, manualAttendanceSchema, listAttendanceSchema } from '../validators/driverAttendance';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function checkIn(req: Request, res: Response, next: NextFunction) {
  try {
    const { driver_id: driverId } = createAttendanceSchema.parse(req.body);
    const result = await attendanceService.checkIn(req.user!.tenantId, driverId);
    sendSuccess(res, result, 'Check-in successful', undefined, 201);
  } catch (err) { next(err); }
}

export async function checkOut(req: Request, res: Response, next: NextFunction) {
  try {
    const { driver_id: driverId } = createAttendanceSchema.parse(req.body);
    const result = await attendanceService.checkOut(req.user!.tenantId, driverId);
    sendSuccess(res, result, 'Check-out successful');
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listAttendanceSchema.parse(req.query);
    const result = await attendanceService.listAttendance(req.user!.tenantId, {
      date: query.date, driverId: query.driver_id, status: query.status,
      startDate: query.start_date, endDate: query.end_date,
      page: query.page, pageSize: query.pageSize,
    });
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Attendance records fetched');
  } catch (err) { next(err); }
}

export async function manualCorrection(req: Request, res: Response, next: NextFunction) {
  try {
    const input = manualAttendanceSchema.parse(req.body);
    const result = await attendanceService.manualCorrection(req.user!.tenantId, {
      driverId: input.driver_id, date: input.date, status: input.status,
      checkInTime: input.check_in_time, checkOutTime: input.check_out_time,
      lateMinutes: input.late_minutes, notes: input.notes,
    });
    sendSuccess(res, result, 'Attendance corrected');
  } catch (err) { next(err); }
}

export async function monthlySummary(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const result = await attendanceService.getMonthlySummary(req.user!.tenantId, year, month);
    sendSuccess(res, result, 'Monthly summary fetched');
  } catch (err) { next(err); }
}

export async function autoDetect(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await attendanceService.autoDetect(req.user!.tenantId);
    sendSuccess(res, result, 'Auto-detection complete');
  } catch (err) { next(err); }
}

export async function todayDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await attendanceService.getTodayDashboard(req.user!.tenantId);
    sendSuccess(res, result, 'Today dashboard fetched');
  } catch (err) { next(err); }
}
