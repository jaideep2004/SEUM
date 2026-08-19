import { z } from 'zod';

export const BREAKDOWN_TYPES = [
  'engine_failure', 'transmission', 'electrical', 'tire_blowout',
  'brake_failure', 'suspension', 'fuel_system', 'cooling_system',
  'clutch', 'body_damage', 'accident', 'mechanical', 'other',
] as const;
export const BREAKDOWN_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export const BREAKDOWN_STATUSES = ['reported', 'dispatched', 'in_progress', 'resolved'] as const;

export const createBreakdownSchema = z.object({
  bus_id: z.string().uuid(),
  trip_id: z.string().uuid().optional(),
  breakdown_type: z.enum(BREAKDOWN_TYPES).default('mechanical'),
  description: z.string().max(2000).optional(),
  location: z.string().min(1).max(500),
  location_lat: z.coerce.number().min(-90).max(90).optional(),
  location_lng: z.coerce.number().min(-180).max(180).optional(),
  severity: z.enum(BREAKDOWN_SEVERITIES).default('medium'),
});

export const listBreakdownsQuerySchema = z.object({
  bus_id: z.string().uuid().optional(),
  status: z.enum(BREAKDOWN_STATUSES).optional(),
  severity: z.enum(BREAKDOWN_SEVERITIES).optional(),
  breakdown_type: z.enum(BREAKDOWN_TYPES).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const dispatchBreakdownSchema = z.object({
  mechanic: z.string().min(1).max(255),
});

export const resolveBreakdownSchema = z.object({
  notes: z.string().max(2000).optional(),
  cost: z.coerce.number().min(0).optional(),
});

export type CreateBreakdownInput = z.infer<typeof createBreakdownSchema>;
export type ListBreakdownsQuery = z.infer<typeof listBreakdownsQuerySchema>;