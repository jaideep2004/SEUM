import { z } from 'zod';

const CATEGORIES = ['fuel','maintenance','salary','tolls','parking','permits','insurance','utilities','office','other'] as const;

export const createExpenseSchema = z.object({
  expense_category: z.enum(CATEGORIES),
  amount: z.number().positive(),
  description: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bus_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
  paid_by: z.string().uuid().optional(),
});

export const listExpensesSchema = z.object({
  expense_category: z.enum(CATEGORIES).optional(),
  status: z.enum(['pending', 'approved', 'reimbursed']).optional(),
  bus_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesSchema>;
