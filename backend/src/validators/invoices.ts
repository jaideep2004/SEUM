import { z } from 'zod';

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive().default(1),
  unit_price: z.number().min(0).default(0),
  account_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
});

export const createInvoiceSchema = z.object({
  customer_name: z.string().min(1).max(255),
  customer_contact: z.string().max(255).optional(),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tax_amount: z.number().min(0).default(0),
  reference_trip_ids: z.array(z.string().uuid()).optional(),
  notes: z.string().max(2000).optional(),
  line_items: z.array(lineItemSchema).min(1, 'At least 1 line item required'),
}).refine(d => new Date(d.due_date) >= new Date(d.invoice_date), {
  message: 'Due date must be on or after invoice date',
});

export const updateInvoiceSchema = z.object({
  customer_name: z.string().min(1).max(255).optional(),
  customer_contact: z.string().max(255).optional(),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tax_amount: z.number().min(0).optional(),
  reference_trip_ids: z.array(z.string().uuid()).optional(),
  notes: z.string().max(2000).optional(),
  line_items: z.array(lineItemSchema).min(1).optional(),
});

export const listInvoicesSchema = z.object({
  status: z.enum(['draft', 'issued', 'paid', 'overdue', 'cancelled', 'refunded']).optional(),
  customer_name: z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['cash', 'bank_transfer', 'card', 'cheque', 'online', 'other']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reference: z.string().max(255).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
