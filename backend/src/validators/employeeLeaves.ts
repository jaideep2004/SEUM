import { z } from 'zod';

export const EMPLOYEE_LEAVE_TYPES = ['annual', 'sick', 'emergency', 'maternity', 'paternity', 'unpaid'] as const;
export const EMPLOYEE_LEAVE_STATUSES = ['pending_manager', 'pending_hr', 'approved', 'rejected'] as const;

export const applyEmployeeLeaveSchema = z.object({
  employee_id: z.string().uuid(),
  leave_type: z.enum(EMPLOYEE_LEAVE_TYPES),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  reason: z.string().max(1000).optional(),
  documents: z.array(z.object({
    name: z.string().min(1),
    url: z.string().min(1),
  })).optional(),
}).refine(d => d.end_date >= d.start_date, { message: 'end_date must be on or after start_date' });

export const listEmployeeLeavesSchema = z.object({
  employee_id: z.string().uuid().optional(),
  status: z.enum(EMPLOYEE_LEAVE_STATUSES).optional(),
  leave_type: z.enum(EMPLOYEE_LEAVE_TYPES).optional(),
  department: z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const approveEmployeeLeaveSchema = z.object({
  approved_by: z.string().uuid(),
});

export const rejectEmployeeLeaveSchema = z.object({
  reason: z.string().min(1).max(500),
});

export type ApplyEmployeeLeaveInput = z.infer<typeof applyEmployeeLeaveSchema>;
export type ListEmployeeLeavesQuery = z.infer<typeof listEmployeeLeavesSchema>;
