import { z } from 'zod';

export const VIOLATION_TYPES = [
  'speeding', 'phone_usage', 'fatigue', 'lane_departure', 'seatbelt',
  'smoking', 'route_deviation', 'customer_complaint', 'accident',
] as const;

export const SEVERITY_LEVELS = ['minor', 'major', 'critical'] as const;
export const VIOLATION_STATUSES = ['open', 'resolved', 'disputed'] as const;

export const SEVERITY_POINTS: Record<string, number> = {
  minor: 2, major: 5, critical: 10,
};
export const SUSPENSION_THRESHOLD = 30;

export const createViolationSchema = z.object({
  driver_id: z.string().uuid(),
  trip_id: z.string().uuid().optional(),
  violation_type: z.enum(VIOLATION_TYPES),
  severity: z.enum(SEVERITY_LEVELS),
  description: z.string().max(2000).optional(),
  action_taken: z.string().max(500).optional(),
});

export const updateViolationSchema = z.object({
  status: z.enum(VIOLATION_STATUSES).optional(),
  action_taken: z.string().max(500).optional(),
});

export const listViolationsSchema = z.object({
  driver_id: z.string().uuid().optional(),
  status: z.enum(VIOLATION_STATUSES).optional(),
  severity: z.enum(SEVERITY_LEVELS).optional(),
  violation_type: z.enum(VIOLATION_TYPES).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const disputeViolationSchema = z.object({
  reason: z.string().min(1).max(2000),
  evidence: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
});

export type CreateViolationInput = z.infer<typeof createViolationSchema>;
export type UpdateViolationInput = z.infer<typeof updateViolationSchema>;
export type ListViolationsQuery = z.infer<typeof listViolationsSchema>;
