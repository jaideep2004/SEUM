import { z } from 'zod';

export const TASK_TYPES = ['oil_change', 'tire_replacement', 'brake_inspection', 'engine_service', 'ac_service', 'electrical', 'body_repair', 'general_service', 'other'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export const TASK_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;

export const createTaskSchema = z.object({
  bus_id: z.string().uuid(),
  task_type: z.enum(TASK_TYPES).default('general_service'),
  description: z.string().max(2000).optional(),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  scheduled_km: z.coerce.number().int().min(0).optional(),
  recurring_interval_days: z.coerce.number().int().min(1).optional(),
  recurring_interval_km: z.coerce.number().int().min(1).optional(),
  assigned_workshop: z.string().max(255).optional(),
  assigned_mechanic: z.string().max(255).optional(),
});

export const updateTaskSchema = z.object({
  task_type: z.enum(TASK_TYPES).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  scheduled_km: z.coerce.number().int().min(0).optional(),
  recurring_interval_days: z.coerce.number().int().min(1).optional(),
  recurring_interval_km: z.coerce.number().int().min(1).optional(),
  assigned_workshop: z.string().max(255).optional(),
  assigned_mechanic: z.string().max(255).optional(),
});

export const listTasksQuerySchema = z.object({
  bus_id: z.string().uuid().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  task_type: z.enum(TASK_TYPES).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const completeTaskSchema = z.object({
  notes: z.string().max(2000).optional(),
  cost: z.coerce.number().min(0).optional(),
});

export const cancelTaskSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  status: z.enum(TASK_STATUSES).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;