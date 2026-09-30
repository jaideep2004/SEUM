import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

// `require` is accessed lazily (never statically imported) so this module
// builds and runs even when ../realtime/socket is absent (parallel worker).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

/** Default speed limit (km/h) when neither bus override nor route setting exists. */
export const DEFAULT_SPEED_THRESHOLD_KMH = 100;

/** Ops/fleet roles notified about GPS safety events. */
const GPS_NOTIFY_ROLES = ['super_admin', 'company_admin', 'operations_manager', 'fleet_manager'];

export interface IngestInput {
  busId: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  speedKmh?: number | null;
  heading?: number | null;
  altitude?: number | null;
  recordedAt?: string;
  ignitionStatus?: string | null;
  odometerReading?: number | null;
}

export type LngLat = [number, number]; // [lng, lat]

interface GeofenceRow {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  coordinates: LngLat[] | null;
  center_lat: number | null;
  center_lng: number | null;
  radius_meters: number | null;
  rules: Record<string, any> | null;
  is_active: boolean;
}

// ─── Pure geo helpers (unit-tested) ───

export function isValidLatitude(lat: unknown): lat is number {
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: unknown): lng is number {
  return typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export function validatePositionInput(input: IngestInput): void {
  const errors: { field?: string; message: string }[] = [];
  if (!input.busId) errors.push({ field: 'busId', message: 'busId is required' });
  if (!input.deviceId) errors.push({ field: 'deviceId', message: 'deviceId is required' });
  if (!isValidLatitude(input.latitude)) errors.push({ field: 'latitude', message: 'latitude must be between -90 and 90' });
  if (!isValidLongitude(input.longitude)) errors.push({ field: 'longitude', message: 'longitude must be between -180 and 180' });
  if (input.speedKmh != null && !(typeof input.speedKmh === 'number' && Number.isFinite(input.speedKmh) && input.speedKmh >= 0)) {
    errors.push({ field: 'speedKmh', message: 'speed must be >= 0' });
  }
  if (input.heading != null && !(typeof input.heading === 'number' && input.heading >= 0 && input.heading <= 360)) {
    errors.push({ field: 'heading', message: 'heading must be between 0 and 360' });
  }
  if (errors.length > 0) throw new ValidationError(errors);
}

/** Haversine great-circle distance in meters. */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Ray-casting point-in-polygon. Point = [lng, lat], polygon = [[lng, lat], ...]. */
export function pointInPolygon(lng: number, lat: number, polygon: LngLat[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function toXY(lat: number, lng: number, refLat: number): { x: number; y: number } {
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((refLat * Math.PI) / 180);
  return { x: lng * mPerDegLng, y: lat * mPerDegLat };
}

/** Perpendicular distance (meters) from point P to segment AB (equirectangular approx). */
export function pointToSegmentDistanceMeters(
  lat: number, lng: number,
  latA: number, lngA: number,
  latB: number, lngB: number,
): number {
  const p = toXY(lat, lng, latA);
  const a = toXY(latA, lngA, latA);
  const b = toXY(latB, lngB, latA);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Min distance (meters) from a point to a corridor polyline.
 * Returns null when no usable corridor exists (caller must skip the check).
 */
export function minDistanceToCorridorMeters(lat: number, lng: number, corridor: LngLat[] | null | undefined): number | null {
  if (!corridor || !Array.isArray(corridor) || corridor.length < 2) return null;
  let min = Infinity;
  for (let i = 0; i < corridor.length - 1; i++) {
    const [lngA, latA] = corridor[i];
    const [lngB, latB] = corridor[i + 1];
    if (![lngA, latA, lngB, latB].every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
    const d = pointToSegmentDistanceMeters(lat, lng, latA, lngA, latB, lngB);
    if (d < min) min = d;
  }
  return min === Infinity ? null : min;
}

/** Threshold resolution order: bus override → route setting → default. */
export function resolveSpeedThreshold(
  busOverride: number | null | undefined,
  routeSetting: number | null | undefined,
  defaultKmh = DEFAULT_SPEED_THRESHOLD_KMH,
): number {
  if (busOverride != null && busOverride > 0) return busOverride;
  if (routeSetting != null && routeSetting > 0) return routeSetting;
  return defaultKmh;
}

// ─── Defensive realtime + notification plumbing ───

function emitSafely(tenantId: string, event: string, payload: unknown): void {
  try {
    const mod = require('../realtime/socket');
    const bus = mod && (mod.emitToTenant || mod.default?.emitToTenant);
    if (typeof bus === 'function') bus(tenantId, event, payload);
  } catch {
    // realtime/socket may not exist (parallel worker) — ingest must not fail.
  }
}

async function notifyTenantUsers(
  tenantId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    const mod = require('./notificationService');
    const createNotification = mod && mod.createNotification;
    if (typeof createNotification !== 'function') return;
    const users = await query<{ id: string }>(
      `SELECT DISTINCT u.id FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE u.tenant_id = $1 AND r.name = ANY($2)`,
      [tenantId, GPS_NOTIFY_ROLES],
    );
    for (const u of users) {
      try {
        await createNotification({ tenantId, userId: u.id, type, title, message, data });
      } catch {
        // per-user notify failure must not break ingestion
      }
    }
  } catch {
    // notificationService unavailable — skip silently
  }
}

// ─── In-memory geofence state (per process) ───

const fenceInside = new Map<string, boolean>(); // `${busId}:${fenceId}` -> inside?
const fenceEntryAt = new Map<string, number>(); // key -> entry timestamp ms
const fenceDwellFired = new Set<string>(); // keys already alerted for current stay

/** Test-only: clear in-memory geofence tracking. */
export function _resetGpsMemory(): void {
  fenceInside.clear();
  fenceEntryAt.clear();
  fenceDwellFired.clear();
}

function fenceKey(busId: string, fenceId: string): string {
  return `${busId}:${fenceId}`;
}

function isInsideFence(lat: number, lng: number, fence: GeofenceRow): boolean {
  if (fence.coordinates && Array.isArray(fence.coordinates) && fence.coordinates.length >= 3) {
    return pointInPolygon(lng, lat, fence.coordinates as LngLat[]);
  }
  if (fence.center_lat != null && fence.center_lng != null && fence.radius_meters != null) {
    return haversineMeters(lat, lng, fence.center_lat, fence.center_lng) <= fence.radius_meters;
  }
  return false;
}

function mapPositionRow(r: any) {
  return {
    id: r.id, tenantId: r.tenant_id, busId: r.bus_id, tripId: r.trip_id,
    deviceId: r.device_id, latitude: Number(r.latitude), longitude: Number(r.longitude),
    speedKmh: r.speed_kmh != null ? Number(r.speed_kmh) : null,
    heading: r.heading != null ? Number(r.heading) : null,
    altitude: r.altitude != null ? Number(r.altitude) : null,
    recordedAt: r.recorded_at, ignitionStatus: r.ignition_status ?? null,
    odometerReading: r.odometer_reading != null ? Number(r.odometer_reading) : null,
    createdAt: r.created_at,
  };
}

// ─── 9.3 Ingestion pipeline ───

export async function ingestPosition(tenantId: string, input: IngestInput) {
  validatePositionInput(input);

  const bus = await queryOne<{ id: string }>(
    `SELECT id FROM buses WHERE id = $1 AND tenant_id = $2`,
    [input.busId, tenantId],
  );
  if (!bus) throw new NotFoundError('Bus not found');

  // Associate with the bus's current trip (active trip preferred, latest first).
  const trip = await queryOne<{ id: string; route_id: string | null; driver_id: string | null }>(
    `SELECT id, route_id, driver_id FROM trips
     WHERE tenant_id = $1 AND bus_id = $2 AND deleted_at IS NULL
       AND status IN ('scheduled', 'en_route')
     ORDER BY scheduled_date DESC LIMIT 1`,
    [tenantId, input.busId],
  );
  const tripId: string | null = trip ? trip.id : null;

  const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();
  if (Number.isNaN(recordedAt.getTime())) throw new ValidationError([{ field: 'recordedAt', message: 'Invalid recordedAt timestamp' }]);

  const rows = await query<any>(
    `INSERT INTO gps_positions
       (id, tenant_id, bus_id, trip_id, device_id, latitude, longitude,
        speed_kmh, heading, altitude, recorded_at, ignition_status, odometer_reading)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      uuid(), tenantId, input.busId, tripId, input.deviceId,
      input.latitude, input.longitude,
      input.speedKmh ?? null, input.heading ?? null, input.altitude ?? null,
      recordedAt.toISOString(), input.ignitionStatus ?? null, input.odometerReading ?? null,
    ],
  );
  const position = mapPositionRow(rows[0]);

  // Downstream checks must never fail ingestion.
  try {
    await checkGeofences(tenantId, {
      busId: input.busId, tripId,
      latitude: input.latitude, longitude: input.longitude,
      speedKmh: input.speedKmh ?? null,
    });
  } catch (err) { logger.debug({ err }, 'geofence check failed'); }

  try {
    await checkDeviation(tenantId, {
      busId: input.busId, tripId,
      routeId: trip?.route_id ?? null,
      latitude: input.latitude, longitude: input.longitude,
    });
  } catch (err) { logger.debug({ err }, 'deviation check failed'); }

  try {
    await checkOverspeed(tenantId, {
      busId: input.busId, tripId,
      routeId: trip?.route_id ?? null,
      driverId: trip?.driver_id ?? null,
      latitude: input.latitude, longitude: input.longitude,
      speedKmh: input.speedKmh ?? null,
    });
  } catch (err) { logger.debug({ err }, 'overspeed check failed'); }

  emitSafely(tenantId, 'trip:position_updated', {
    ...position, busId: input.busId, tripId,
  });

  return position;
}

export async function getCurrentPositions(tenantId: string) {
  const rows = await query<any>(
    `SELECT DISTINCT ON (p.bus_id) p.*, b.plate_number, u.name AS driver_name, t.driver_id
     FROM gps_positions p
     JOIN buses b ON b.id = p.bus_id
     LEFT JOIN trips t ON t.id = p.trip_id
     LEFT JOIN users u ON u.id = t.driver_id
     WHERE p.tenant_id = $1
     ORDER BY p.bus_id, p.recorded_at DESC`,
    [tenantId],
  );
  return rows.map((r: any) => ({
    ...mapPositionRow(r),
    plateNumber: r.plate_number ?? null,
    driverName: r.driver_name ?? null,
    driverId: r.driver_id ?? null,
  }));
}

export async function getTripHistory(
  tenantId: string, tripId: string, opts: { from?: string; to?: string; limit?: number } = {},
) {
  const trip = await queryOne<{ id: string }>(
    `SELECT id FROM trips WHERE id = $1 AND tenant_id = $2`,
    [tripId, tenantId],
  );
  if (!trip) throw new NotFoundError('Trip not found');

  const conditions: string[] = [`tenant_id = $1`, `trip_id = $2`];
  const params: any[] = [tenantId, tripId];
  if (opts.from) { params.push(opts.from); conditions.push(`recorded_at >= $${params.length}`); }
  if (opts.to) { params.push(opts.to); conditions.push(`recorded_at <= $${params.length}`); }
  const limit = Math.min(Math.max(opts.limit ?? 1000, 1), 5000);

  const rows = await query<any>(
    `SELECT * FROM gps_positions WHERE ${conditions.join(' AND ')}
     ORDER BY recorded_at ASC LIMIT ${limit}`,
    params,
  );
  return rows.map(mapPositionRow);
}

// ─── 9.4 Geofence checks ───

export async function checkGeofences(
  tenantId: string,
  pos: { busId: string; tripId: string | null; latitude: number; longitude: number; speedKmh: number | null },
) {
  const fences = await query<GeofenceRow>(
    `SELECT * FROM geofences WHERE tenant_id = $1 AND is_active = true`,
    [tenantId],
  );
  const triggered: any[] = [];
  const now = Date.now();

  for (const fence of fences) {
    const inside = isInsideFence(pos.latitude, pos.longitude, fence);
    const key = fenceKey(pos.busId, fence.id);
    const prev = fenceInside.get(key);

    if (prev === undefined) {
      fenceInside.set(key, inside);
      if (inside) fenceEntryAt.set(key, now);
      continue;
    }

    if (!prev && inside) {
      // Entry — restricted zones produce a restricted_entry event.
      const eventType = fence.type === 'restricted' ? 'restricted_entry' : 'entered';
      fenceEntryAt.set(key, now);
      fenceDwellFired.delete(key);
      triggered.push(await recordGeofenceEvent(tenantId, fence, pos, eventType));
    } else if (prev && !inside) {
      fenceEntryAt.delete(key);
      fenceDwellFired.delete(key);
      triggered.push(await recordGeofenceEvent(tenantId, fence, pos, 'exited'));
    } else if (prev && inside) {
      // Dwell: continuously inside beyond rules.max_dwell_minutes.
      const maxDwell = Number(fence.rules?.max_dwell_minutes);
      if (Number.isFinite(maxDwell) && maxDwell > 0 && !fenceDwellFired.has(key)) {
        const enteredAt = fenceEntryAt.get(key) ?? now;
        if (now - enteredAt >= maxDwell * 60 * 1000) {
          fenceDwellFired.add(key);
          triggered.push(await recordGeofenceEvent(tenantId, fence, pos, 'dwell_exceeded', {
            max_dwell_minutes: maxDwell,
            inside_since_ms: enteredAt,
          }));
        }
      }
    }

    fenceInside.set(key, inside);
  }

  return triggered.filter(Boolean);
}

async function recordGeofenceEvent(
  tenantId: string,
  fence: GeofenceRow,
  pos: { busId: string; tripId: string | null; latitude: number; longitude: number; speedKmh: number | null },
  eventType: 'entered' | 'exited' | 'dwell_exceeded' | 'restricted_entry',
  extraDetails: Record<string, unknown> = {},
) {
  const details = {
    geofence_name: fence.name,
    geofence_type: fence.type,
    latitude: pos.latitude,
    longitude: pos.longitude,
    speed_kmh: pos.speedKmh,
    ...extraDetails,
  };
  const rows = await query<any>(
    `INSERT INTO geofence_events (id, tenant_id, bus_id, geofence_id, trip_id, event_type, details)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [uuid(), tenantId, pos.busId, fence.id, pos.tripId, eventType, JSON.stringify(details)],
  );
  const event = rows[0];

  const titles: Record<string, string> = {
    entered: `Bus entered ${fence.name}`,
    exited: `Bus exited ${fence.name}`,
    dwell_exceeded: `Bus dwell time exceeded at ${fence.name}`,
    restricted_entry: `Restricted zone entry: ${fence.name}`,
  };
  await notifyTenantUsers(
    tenantId,
    eventType === 'restricted_entry' ? 'restricted_zone_entry' : `geofence_${eventType}`,
    titles[eventType] || `Geofence event at ${fence.name}`,
    `${titles[eventType] || 'Geofence event'} (bus ${pos.busId})`,
    { geofenceId: fence.id, busId: pos.busId, tripId: pos.tripId, eventType, ...details },
  );
  emitSafely(tenantId, 'geofence:triggered', {
    geofenceId: fence.id, geofenceName: fence.name, busId: pos.busId,
    tripId: pos.tripId, eventType, details,
  });
  return event;
}

// ─── 9.5 Route deviation framework ───

export interface DeviationResult {
  checked: boolean;
  deviated: boolean;
  distanceMeters: number | null;
  toleranceMeters: number | null;
  reason?: string;
}

export async function checkDeviation(
  tenantId: string,
  pos: { busId: string; tripId: string | null; routeId: string | null; latitude: number; longitude: number },
): Promise<DeviationResult> {
  if (!pos.tripId || !pos.routeId) {
    return { checked: false, deviated: false, distanceMeters: null, toleranceMeters: null, reason: 'no-trip' };
  }

  let corridor: LngLat[] | null = null;
  try {
    const route = await queryOne<{ corridor: LngLat[] | null }>(
      `SELECT corridor FROM routes WHERE id = $1 AND tenant_id = $2`,
      [pos.routeId, tenantId],
    );
    corridor = (route?.corridor as LngLat[] | null) ?? null;
  } catch (err) {
    logger.debug({ err }, 'routes.corridor unavailable, skipping deviation check');
    return { checked: false, deviated: false, distanceMeters: null, toleranceMeters: null, reason: 'no-corridor-column' };
  }

  const distance = minDistanceToCorridorMeters(pos.latitude, pos.longitude, corridor);
  if (distance == null) {
    logger.debug({ routeId: pos.routeId }, 'no route corridor set, skipping deviation check');
    return { checked: false, deviated: false, distanceMeters: null, toleranceMeters: null, reason: 'no-corridor' };
  }

  const settings = await queryOne<{ deviation_tolerance_meters: number; deviation_tolerance_minutes: number }>(
    `SELECT deviation_tolerance_meters, deviation_tolerance_minutes FROM route_settings WHERE route_id = $1`,
    [pos.routeId],
  );
  const tolerance = settings?.deviation_tolerance_meters ?? 300;

  const deviated = distance > tolerance;
  if (deviated) {
    await notifyTenantUsers(
      tenantId, 'route_deviation', 'Route deviation detected',
      `Bus ${pos.busId} is ~${Math.round(distance)}m off corridor (tolerance ${tolerance}m)`,
      { busId: pos.busId, tripId: pos.tripId, routeId: pos.routeId, distanceMeters: Math.round(distance), toleranceMeters: tolerance },
    );
    emitSafely(tenantId, 'route:deviation', {
      busId: pos.busId, tripId: pos.tripId, routeId: pos.routeId,
      distanceMeters: Math.round(distance), toleranceMeters: tolerance,
    });
  }

  return { checked: true, deviated, distanceMeters: distance, toleranceMeters: tolerance };
}

// ─── 9.7 Overspeed ───

export async function checkOverspeed(
  tenantId: string,
  pos: {
    busId: string; tripId: string | null; routeId: string | null; driverId: string | null;
    latitude: number; longitude: number; speedKmh: number | null;
  },
) {
  if (pos.speedKmh == null) return null;

  const busRow = await queryOne<{ threshold_kmh: number | null }>(
    `SELECT threshold_kmh FROM bus_speed_thresholds WHERE bus_id = $1`,
    [pos.busId],
  );
  let routeThreshold: number | null = null;
  if (pos.routeId) {
    const routeRow = await queryOne<{ speed_threshold_kmh: number | null }>(
      `SELECT speed_threshold_kmh FROM route_settings WHERE route_id = $1`,
      [pos.routeId],
    );
    routeThreshold = routeRow?.speed_threshold_kmh ?? null;
  }
  const threshold = resolveSpeedThreshold(busRow?.threshold_kmh, routeThreshold);

  if (pos.speedKmh <= threshold) return null;

  const rows = await query<any>(
    `INSERT INTO overspeed_events
       (id, tenant_id, bus_id, trip_id, driver_id, speed_kmh, threshold_kmh, latitude, longitude)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [uuid(), tenantId, pos.busId, pos.tripId, pos.driverId, pos.speedKmh, threshold, pos.latitude, pos.longitude],
  );
  const event = rows[0];

  await notifyTenantUsers(
    tenantId, 'overspeed', 'Overspeed detected',
    `Bus ${pos.busId} at ${pos.speedKmh} km/h (limit ${threshold} km/h)`,
    { busId: pos.busId, tripId: pos.tripId, driverId: pos.driverId, speedKmh: pos.speedKmh, thresholdKmh: threshold },
  );
  emitSafely(tenantId, 'speed:overspeed', {
    busId: pos.busId, tripId: pos.tripId, driverId: pos.driverId,
    speedKmh: pos.speedKmh, thresholdKmh: threshold,
    latitude: pos.latitude, longitude: pos.longitude,
  });

  return event;
}

export async function getOverspeedReport(
  tenantId: string,
  filters: { from?: string; to?: string; busId?: string; driverId?: string } = {},
) {
  const conditions: string[] = [`o.tenant_id = $1`];
  const params: any[] = [tenantId];
  if (filters.from) { params.push(filters.from); conditions.push(`o.created_at >= $${params.length}`); }
  if (filters.to) { params.push(filters.to); conditions.push(`o.created_at <= $${params.length}`); }
  if (filters.busId) { params.push(filters.busId); conditions.push(`o.bus_id = $${params.length}`); }
  if (filters.driverId) { params.push(filters.driverId); conditions.push(`o.driver_id = $${params.length}`); }
  const where = conditions.join(' AND ');

  const [byDriver, byTrip, events] = await Promise.all([
    query<any>(
      `SELECT o.driver_id, u.name AS driver_name,
              COUNT(*)::int AS overspeed_count, MAX(o.speed_kmh) AS max_speed,
              AVG(o.speed_kmh) AS avg_speed,
              MIN(o.created_at) AS first_event, MAX(o.created_at) AS last_event
       FROM overspeed_events o
       LEFT JOIN users u ON u.id = o.driver_id
       WHERE ${where}
       GROUP BY o.driver_id, u.name
       ORDER BY overspeed_count DESC`,
      params,
    ),
    query<any>(
      `SELECT o.trip_id, b.plate_number,
              COUNT(*)::int AS overspeed_count, MAX(o.speed_kmh) AS max_speed,
              MIN(o.created_at) AS first_event, MAX(o.created_at) AS last_event
       FROM overspeed_events o
       LEFT JOIN buses b ON b.id = o.bus_id
       WHERE ${where}
       GROUP BY o.trip_id, b.plate_number
       ORDER BY overspeed_count DESC`,
      params,
    ),
    query<any>(
      `SELECT o.*, b.plate_number, u.name AS driver_name
       FROM overspeed_events o
       LEFT JOIN buses b ON b.id = o.bus_id
       LEFT JOIN users u ON u.id = o.driver_id
       WHERE ${where}
       ORDER BY o.created_at DESC LIMIT 500`,
      params,
    ),
  ]);

  return {
    total: events.length,
    byDriver: byDriver.map((r: any) => ({
      driverId: r.driver_id, driverName: r.driver_name ?? null,
      overspeedCount: Number(r.overspeed_count), maxSpeed: Number(r.max_speed),
      avgSpeed: r.avg_speed != null ? Number(r.avg_speed) : null,
      firstEvent: r.first_event, lastEvent: r.last_event,
    })),
    byTrip: byTrip.map((r: any) => ({
      tripId: r.trip_id, plateNumber: r.plate_number ?? null,
      overspeedCount: Number(r.overspeed_count), maxSpeed: Number(r.max_speed),
      firstEvent: r.first_event, lastEvent: r.last_event,
    })),
    events: events.map((r: any) => ({
      id: r.id, busId: r.bus_id, tripId: r.trip_id, driverId: r.driver_id,
      driverName: r.driver_name ?? null, plateNumber: r.plate_number ?? null,
      speedKmh: Number(r.speed_kmh), thresholdKmh: Number(r.threshold_kmh),
      latitude: Number(r.latitude), longitude: Number(r.longitude),
      createdAt: r.created_at,
    })),
  };
}

// ─── 9.4 Geofence CRUD ───

function mapGeofenceRow(r: any) {
  return {
    id: r.id, tenantId: r.tenant_id, name: r.name, type: r.type,
    coordinates: r.coordinates ?? null,
    centerLat: r.center_lat != null ? Number(r.center_lat) : null,
    centerLng: r.center_lng != null ? Number(r.center_lng) : null,
    radiusMeters: r.radius_meters != null ? Number(r.radius_meters) : null,
    rules: r.rules ?? {},
    isActive: r.is_active,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export async function createGeofence(tenantId: string, input: {
  name: string; type: string; coordinates?: LngLat[] | null;
  centerLat?: number | null; centerLng?: number | null; radiusMeters?: number | null;
  rules?: Record<string, unknown>; isActive?: boolean;
}) {
  const rows = await query<any>(
    `INSERT INTO geofences
       (id, tenant_id, name, type, coordinates, center_lat, center_lng, radius_meters, rules, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      uuid(), tenantId, input.name, input.type,
      input.coordinates ? JSON.stringify(input.coordinates) : null,
      input.centerLat ?? null, input.centerLng ?? null, input.radiusMeters ?? null,
      JSON.stringify(input.rules ?? {}), input.isActive ?? true,
    ],
  );
  return mapGeofenceRow(rows[0]);
}

export async function listGeofences(tenantId: string) {
  const rows = await query<any>(
    `SELECT * FROM geofences WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId],
  );
  return rows.map(mapGeofenceRow);
}

export async function updateGeofence(tenantId: string, id: string, input: {
  name?: string; type?: string; coordinates?: LngLat[] | null;
  centerLat?: number | null; centerLng?: number | null; radiusMeters?: number | null;
  rules?: Record<string, unknown>; isActive?: boolean;
}) {
  const existing = await queryOne<any>(
    `SELECT id FROM geofences WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  if (!existing) throw new NotFoundError('Geofence not found');

  const sets: string[] = [];
  const params: any[] = [];
  const push = (col: string, val: unknown) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (input.name !== undefined) push('name', input.name);
  if (input.type !== undefined) push('type', input.type);
  if (input.coordinates !== undefined) push('coordinates', input.coordinates ? JSON.stringify(input.coordinates) : null);
  if (input.centerLat !== undefined) push('center_lat', input.centerLat);
  if (input.centerLng !== undefined) push('center_lng', input.centerLng);
  if (input.radiusMeters !== undefined) push('radius_meters', input.radiusMeters);
  if (input.rules !== undefined) push('rules', JSON.stringify(input.rules));
  if (input.isActive !== undefined) push('is_active', input.isActive);
  if (sets.length === 0) {
    const row = await queryOne<any>(`SELECT * FROM geofences WHERE id = $1`, [id]);
    return mapGeofenceRow(row);
  }
  params.push(id);
  const rows = await query<any>(
    `UPDATE geofences SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return mapGeofenceRow(rows[0]);
}

export async function deleteGeofence(tenantId: string, id: string) {
  const existing = await queryOne<any>(
    `SELECT id FROM geofences WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  if (!existing) throw new NotFoundError('Geofence not found');
  await query(`DELETE FROM geofences WHERE id = $1`, [id]);
  return { deleted: true };
}

// ─── 9.5 + 9.7 Settings ───

export async function getRouteSettings(tenantId: string, routeId: string) {
  const route = await queryOne<{ id: string }>(
    `SELECT id FROM routes WHERE id = $1 AND tenant_id = $2`,
    [routeId, tenantId],
  );
  if (!route) throw new NotFoundError('Route not found');
  const settings = await queryOne<any>(
    `SELECT * FROM route_settings WHERE route_id = $1`,
    [routeId],
  );
  if (!settings) {
    return { routeId, deviationToleranceMeters: 300, deviationToleranceMinutes: 10, speedThresholdKmh: null };
  }
  return {
    routeId,
    deviationToleranceMeters: settings.deviation_tolerance_meters,
    deviationToleranceMinutes: settings.deviation_tolerance_minutes,
    speedThresholdKmh: settings.speed_threshold_kmh,
  };
}

export async function updateRouteSettings(tenantId: string, routeId: string, input: {
  deviationToleranceMeters?: number; deviationToleranceMinutes?: number; speedThresholdKmh?: number | null;
}) {
  const route = await queryOne<{ id: string }>(
    `SELECT id FROM routes WHERE id = $1 AND tenant_id = $2`,
    [routeId, tenantId],
  );
  if (!route) throw new NotFoundError('Route not found');
  const rows = await query<any>(
    `INSERT INTO route_settings (route_id, deviation_tolerance_meters, deviation_tolerance_minutes, speed_threshold_kmh, updated_at)
     VALUES ($1,
       COALESCE($2, 300),
       COALESCE($3, 10),
       $4, NOW())
     ON CONFLICT (route_id) DO UPDATE SET
       deviation_tolerance_meters = COALESCE($2, route_settings.deviation_tolerance_meters),
       deviation_tolerance_minutes = COALESCE($3, route_settings.deviation_tolerance_minutes),
       speed_threshold_kmh = $4,
       updated_at = NOW()
     RETURNING *`,
    [routeId, input.deviationToleranceMeters ?? null, input.deviationToleranceMinutes ?? null, input.speedThresholdKmh ?? null],
  );
  const s = rows[0];
  return {
    routeId,
    deviationToleranceMeters: s.deviation_tolerance_meters,
    deviationToleranceMinutes: s.deviation_tolerance_minutes,
    speedThresholdKmh: s.speed_threshold_kmh,
  };
}

export async function setRouteCorridor(tenantId: string, routeId: string, corridor: LngLat[]) {
  const route = await queryOne<{ id: string }>(
    `SELECT id FROM routes WHERE id = $1 AND tenant_id = $2`,
    [routeId, tenantId],
  );
  if (!route) throw new NotFoundError('Route not found');
  const rows = await query<any>(
    `UPDATE routes SET corridor = $1, updated_at = NOW() WHERE id = $2 RETURNING id, corridor`,
    [JSON.stringify(corridor), routeId],
  );
  return { routeId, corridor: rows[0]?.corridor ?? corridor };
}

export async function getRouteCorridor(tenantId: string, routeId: string) {
  const route = await queryOne<{ id: string; corridor: LngLat[] | null }>(
    `SELECT id, corridor FROM routes WHERE id = $1 AND tenant_id = $2`,
    [routeId, tenantId],
  );
  if (!route) throw new NotFoundError('Route not found');
  return { routeId, corridor: route.corridor ?? null };
}

export async function setBusSpeedThreshold(tenantId: string, busId: string, thresholdKmh: number) {
  const bus = await queryOne<{ id: string }>(
    `SELECT id FROM buses WHERE id = $1 AND tenant_id = $2`,
    [busId, tenantId],
  );
  if (!bus) throw new NotFoundError('Bus not found');
  const rows = await query<any>(
    `INSERT INTO bus_speed_thresholds (bus_id, threshold_kmh, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (bus_id) DO UPDATE SET threshold_kmh = $2, updated_at = NOW()
     RETURNING *`,
    [busId, thresholdKmh],
  );
  return { busId, thresholdKmh: rows[0].threshold_kmh };
}

export async function listBusSpeedThresholds(tenantId: string) {
  const rows = await query<any>(
    `SELECT t.*, b.plate_number FROM bus_speed_thresholds t
     JOIN buses b ON b.id = t.bus_id
     WHERE b.tenant_id = $1 ORDER BY b.plate_number`,
    [tenantId],
  );
  return rows.map((r: any) => ({
    busId: r.bus_id, plateNumber: r.plate_number, thresholdKmh: r.threshold_kmh,
  }));
}
