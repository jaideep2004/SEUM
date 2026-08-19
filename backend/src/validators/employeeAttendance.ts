import { z } from 'zod';

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'half_day', 'on_leave'] as const;

export const createAttendanceSchema = z.object({
  employee_id: z.string().uuid(),
  status: z.enum(['present', 'absent', 'late', 'half_day', 'on_leave']).default('present'),
  late_minutes: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const listAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  employee_id: z.string().uuid().optional(),
  status: z.enum(ATTENDANCE_STATUSES).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type ListAttendanceQuery = z.infer<typeof listAttendanceSchema>;
