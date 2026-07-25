import { z } from 'zod';

export const generatePayrollSchema = z.object({
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  driver_ids: z.array(z.string().uuid()).optional(),
  base_salaries: z.record(z.string(), z.number().positive()).optional(),
  trip_rate: z.number().positive().default(25),
});

export const listPayrollSchema = z.object({
  driver_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'approved', 'paid']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const approvePayrollSchema = z.object({
  id: z.string().uuid(),
});

export const payPayrollSchema = z.object({
  payment_reference: z.string().min(1).max(100),
});

export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;
export type ListPayrollQuery = z.infer<typeof listPayrollSchema>;
