import { z } from 'zod';

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'half_day', 'on_leave', 'on_trip'] as const;

export const createAttendanceSchema = z.object({
  driver_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  status: z.enum(['present', 'absent', 'late', 'half_day', 'on_leave']).default('present'),
  late_minutes: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const manualAttendanceSchema = z.object({
  driver_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['present', 'absent', 'late', 'half_day', 'on_leave']),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  late_minutes: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const listAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  driver_id: z.string().uuid().optional(),
  status: z.enum(ATTENDANCE_STATUSES).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
export type ListAttendanceQuery = z.infer<typeof listAttendanceSchema>;
