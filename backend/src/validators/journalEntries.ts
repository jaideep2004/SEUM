import { z } from 'zod';

export const lineItemSchema = z.object({
  account_id: z.string().uuid(),
  debit_amount: z.number().min(0).default(0),
  credit_amount: z.number().min(0).default(0),
  description: z.string().max(500).optional(),
}).refine(d => d.debit_amount > 0 || d.credit_amount > 0, {
  message: 'Each line must have a debit or credit amount',
});

export const createJournalEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(2000).optional(),
  reference_type: z.string().max(50).optional(),
  reference_id: z.string().uuid().optional(),
  lines: z.array(lineItemSchema).min(2, 'At least 2 lines required'),
}).refine(d => {
  const debit = d.lines.reduce((s, l) => s + l.debit_amount, 0);
  const credit = d.lines.reduce((s, l) => s + l.credit_amount, 0);
  return Math.abs(debit - credit) < 0.01;
}, { message: 'Total debits must equal total credits' });

export const listJournalEntriesSchema = z.object({
  status: z.enum(['draft', 'posted']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type ListJournalEntriesQuery = z.infer<typeof listJournalEntriesSchema>;
