import { z } from 'zod';

export const createPartSchema = z.object({
  part_code: z.string().min(1).max(100),
  part_name: z.string().min(1).max(255),
  category: z.string().max(100).optional(),
  manufacturer: z.string().max(255).optional(),
  unit_of_measure: z.string().max(50).default('unit'),
  quantity_in_stock: z.coerce.number().int().min(0).default(0),
  reorder_level: z.coerce.number().int().min(0).default(0),
  unit_price: z.coerce.number().min(0).optional(),
  supplier_id: z.string().max(255).optional(),
  storage_location: z.string().max(255).optional(),
});

export const updatePartSchema = z.object({
  part_code: z.string().min(1).max(100).optional(),
  part_name: z.string().min(1).max(255).optional(),
  category: z.string().max(100).optional(),
  manufacturer: z.string().max(255).optional(),
  unit_of_measure: z.string().max(50).optional(),
  reorder_level: z.coerce.number().int().min(0).optional(),
  unit_price: z.coerce.number().min(0).optional(),
  supplier_id: z.string().max(255).optional(),
  storage_location: z.string().max(255).optional(),
});

export const listPartsQuerySchema = z.object({
  category: z.string().optional(),
  manufacturer: z.string().optional(),
  lowStock: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const stockInSchema = z.object({
  quantity: z.coerce.number().int().min(1),
  unit_price: z.coerce.number().min(0).optional(),
  supplier_id: z.string().max(255).optional(),
  reference_type: z.enum(['purchase', 'return', 'adjustment', 'initial']).default('purchase'),
  reference_id: z.string().uuid().optional(),
  date: z.string().optional().refine((d) => !d || !isNaN(Date.parse(d)), 'Date must be valid ISO'),
  notes: z.string().max(500).optional(),
});

export const stockOutSchema = z.object({
  quantity: z.coerce.number().int().min(1),
  maintenance_task_id: z.string().uuid().optional(),
  reference_id: z.string().uuid().optional(),
  date: z.string().optional().refine((d) => !d || !isNaN(Date.parse(d)), 'Date must be valid ISO'),
  notes: z.string().max(500).optional(),
});

export const listTransactionsQuerySchema = z.object({
  part_id: z.string().uuid().optional(),
  transaction_type: z.enum(['in', 'out']).optional(),
  reference_type: z.string().optional(),
  start_date: z.string().optional().refine((d) => !d || !isNaN(Date.parse(d)), 'Date must be valid ISO'),
  end_date: z.string().optional().refine((d) => !d || !isNaN(Date.parse(d)), 'Date must be valid ISO'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreatePartInput = z.infer<typeof createPartSchema>;
export type UpdatePartInput = z.infer<typeof updatePartSchema>;
export type ListPartsQuery = z.infer<typeof listPartsQuerySchema>;
export type StockInInput = z.infer<typeof stockInSchema>;
export type StockOutInput = z.infer<typeof stockOutSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;