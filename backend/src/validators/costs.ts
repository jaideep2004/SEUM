import { z } from 'zod';

export const COST_STATUSES = ['pending', 'invoiced', 'paid', 'cancelled'] as const;

export const createCostSchema = z.object({
  maintenance_task_id: z.string().uuid(),
  labor_hours: z.coerce.number().min(0).default(0),
  labor_rate: z.coerce.number().min(0).default(50),
  paid_to: z.string().max(255).optional(),
  invoice_number: z.string().max(100).optional(),
  status: z.enum(COST_STATUSES).default('pending'),
});

export const updateCostSchema = z.object({
  labor_hours: z.coerce.number().min(0).optional(),
  labor_rate: z.coerce.number().min(0).optional(),
  paid_to: z.string().max(255).optional(),
  invoice_number: z.string().max(100).optional(),
  status: z.enum(COST_STATUSES).optional(),
});

export const listCostsQuerySchema = z.object({
  bus_id: z.string().uuid().optional(),
  task_type: z.enum([
    'oil_change', 'tire_replacement', 'brake_inspection', 'engine_service',
    'ac_service', 'electrical', 'body_repair', 'general_service', 'other',
  ]).optional(),
  status: z.enum(COST_STATUSES).optional(),
  start_date: z.string().optional().refine((d) => !d || /^\d{4}-\d{2}-\d{2}$/.test(d), 'Date must be YYYY-MM-DD'),
  end_date: z.string().optional().refine((d) => !d || /^\d{4}-\d{2}-\d{2}$/.test(d), 'Date must be YYYY-MM-DD'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateCostInput = z.infer<typeof createCostSchema>;
export type UpdateCostInput = z.infer<typeof updateCostSchema>;
export type ListCostsQuery = z.infer<typeof listCostsQuerySchema>;