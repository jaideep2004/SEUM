import { z } from 'zod';

// ─── 9.3 GPS ingestion ───

export const ingestPositionSchema = z.object({
  busId: z.string().uuid('busId must be a valid UUID'),
  deviceId: z.string().min(1, 'deviceId is required').max(100),
  latitude: z.number().min(-90, 'latitude must be between -90 and 90').max(90, 'latitude must be between -90 and 90'),
  longitude: z.number().min(-180, 'longitude must be between -180 and 180').max(180, 'longitude must be between -180 and 180'),
  speedKmh: z.number().min(0, 'speed must be >= 0').optional().nullable(),
  heading: z.number().min(0).max(360).optional().nullable(),
  altitude: z.number().optional().nullable(),
  recordedAt: z.string().datetime({ offset: true }).optional(),
  ignitionStatus: z.string().max(20).optional().nullable(),
  odometerReading: z.number().min(0).optional().nullable(),
  // Device-key auth path (no JWT): tenant resolved from here.
  tenantId: z.string().uuid().optional(),
});

export const tripHistoryQuerySchema = z.object({
  tripId: z.string().uuid('tripId must be a valid UUID'),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().positive().max(5000).default(1000),
});

export const overspeedReportQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  busId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
});

// ─── 9.4 Geofences ───

const lngLatPair = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const geofenceRulesSchema = z.object({
  max_dwell_minutes: z.number().positive().optional(),
}).passthrough();

export const createGeofenceSchema = z.object({
  name: z.string().min(1, 'Geofence name is required').max(255),
  type: z.enum(['depot', 'terminal', 'checkpoint', 'restricted', 'holy_site']),
  // Polygon fence: array of [lng, lat] (min 3 points, auto-closed if needed)
  coordinates: z.array(lngLatPair).min(3, 'Polygon requires at least 3 points').max(500).optional().nullable(),
  // Circle fence alternative
  centerLat: z.number().min(-90).max(90).optional().nullable(),
  centerLng: z.number().min(-180).max(180).optional().nullable(),
  radiusMeters: z.number().positive().max(100000).optional().nullable(),
  rules: geofenceRulesSchema.default({}),
  isActive: z.boolean().default(true),
}).superRefine((val, ctx) => {
  const hasPolygon = !!val.coordinates && val.coordinates.length >= 3;
  const hasCircle = val.centerLat != null && val.centerLng != null && val.radiusMeters != null;
  if (!hasPolygon && !hasCircle) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide either polygon coordinates (3+ [lng,lat] points) or circle (centerLat + centerLng + radiusMeters)',
    });
  }
});

export const updateGeofenceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(['depot', 'terminal', 'checkpoint', 'restricted', 'holy_site']).optional(),
  coordinates: z.array(lngLatPair).min(3).max(500).optional().nullable(),
  centerLat: z.number().min(-90).max(90).optional().nullable(),
  centerLng: z.number().min(-180).max(180).optional().nullable(),
  radiusMeters: z.number().positive().max(100000).optional().nullable(),
  rules: geofenceRulesSchema.optional(),
  isActive: z.boolean().optional(),
});

// ─── 9.5 + 9.7 Settings ───

export const routeSettingsSchema = z.object({
  deviationToleranceMeters: z.number().int().positive().max(50000).optional(),
  deviationToleranceMinutes: z.number().int().positive().max(1440).optional(),
  speedThresholdKmh: z.number().int().positive().max(300).optional().nullable(),
});

export const routeCorridorSchema = z.object({
  // Ordered polyline of [lng, lat] points describing the route path
  corridor: z.array(lngLatPair).min(2, 'Corridor requires at least 2 points').max(2000),
});

export const busSpeedThresholdSchema = z.object({
  busId: z.string().uuid('busId must be a valid UUID'),
  thresholdKmh: z.number().int().positive().max(300),
});

export type IngestPositionInput = z.infer<typeof ingestPositionSchema>;
export type CreateGeofenceInput = z.infer<typeof createGeofenceSchema>;
export type UpdateGeofenceInput = z.infer<typeof updateGeofenceSchema>;
export type RouteSettingsInput = z.infer<typeof routeSettingsSchema>;
