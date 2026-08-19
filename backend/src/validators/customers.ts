import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
  id_number: z.string().max(100).optional(),
  nationality: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  is_company: z.boolean().default(false),
  company_name: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
  id_number: z.string().max(100).optional(),
  nationality: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  is_company: z.boolean().optional(),
  company_name: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

export const listCustomersQuerySchema = z.object({
  search: z.string().optional(),
  is_company: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;