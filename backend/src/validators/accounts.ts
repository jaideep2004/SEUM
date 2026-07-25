import { z } from 'zod';

export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;

export const createAccountSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  type: z.enum(ACCOUNT_TYPES),
  parent_account_id: z.string().uuid().optional(),
  is_active: z.boolean().default(true),
  description: z.string().max(500).optional(),
});

export const updateAccountSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(200).optional(),
  type: z.enum(ACCOUNT_TYPES).optional(),
  parent_account_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
