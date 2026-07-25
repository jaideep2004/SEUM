import { z } from 'zod';

export const LEAVE_TYPES = ['annual', 'sick', 'emergency', 'unpaid'] as const;
export const LEAVE_STATUSES = ['pending', 'approved', 'rejected'] as const;

export const applyLeaveSchema = z.object({
  driver_id: z.string().uuid(),
  leave_type: z.enum(LEAVE_TYPES),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  reason: z.string().max(1000).optional(),
  documents: z.array(z.object({
    name: z.string().min(1),
    url: z.string().min(1),
  })).optional(),
}).refine(d => d.end_date >= d.start_date, { message: 'end_date must be on or after start_date' });

export const listLeavesSchema = z.object({
  driver_id: z.string().uuid().optional(),
  status: z.enum(LEAVE_STATUSES).optional(),
  leave_type: z.enum(LEAVE_TYPES).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const approveLeaveSchema = z.object({
  approved_by: z.string().uuid(),
});

export const rejectLeaveSchema = z.object({
  reason: z.string().min(1).max(500),
});

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;
export type ListLeavesQuery = z.infer<typeof listLeavesSchema>;
