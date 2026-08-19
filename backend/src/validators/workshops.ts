import { z } from 'zod';

export const createWorkshopSchema = z.object({
  name: z.string().min(1).max(255),
  location: z.string().max(500).optional(),
  contact: z.string().max(255).optional(),
  supervisor: z.string().max(255).optional(),
  is_internal: z.boolean().default(true),
  services: z.array(z.string().min(1).max(100)).max(50).default([]),
});

export const updateWorkshopSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  location: z.string().max(500).optional(),
  contact: z.string().max(255).optional(),
  supervisor: z.string().max(255).optional(),
  is_internal: z.boolean().optional(),
  services: z.array(z.string().min(1).max(100)).max(50).optional(),
});

export const listWorkshopsQuerySchema = z.object({
  is_internal: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateWorkshopInput = z.infer<typeof createWorkshopSchema>;
export type UpdateWorkshopInput = z.infer<typeof updateWorkshopSchema>;
export type ListWorkshopsQuery = z.infer<typeof listWorkshopsQuerySchema>;