import { z } from 'zod';

export const overrideStatusSchema = z.object({
  status: z.enum(['scheduled', 'en_route', 'completed', 'delayed', 'cancelled']),
  delayMinutes: z.number().int().positive().optional(),
  delayReason: z.string().max(500).optional(),
  rejectionReason: z.string().max(500).optional(),
  estimatedResolutionTime: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const externalUpdateSchema = z.object({
  method: z.enum(['sms', 'call', 'app']),
  status: z.enum(['scheduled', 'en_route', 'completed', 'delayed', 'cancelled']),
  delayMinutes: z.number().int().positive().optional(),
  delayReason: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  updatedBy: z.string().optional(),
});

export const monitoringQuerySchema = z.object({
  date: z.string().optional(),
});

export const delayQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  severity: z.enum(['minor', 'major', 'critical']).optional(),
  search: z.string().optional(),
});

export type OverrideStatusInput = z.infer<typeof overrideStatusSchema>;
export type ExternalUpdateInput = z.infer<typeof externalUpdateSchema>;
export type MonitoringQuery = z.infer<typeof monitoringQuerySchema>;
export type DelayQuery = z.infer<typeof delayQuerySchema>;
