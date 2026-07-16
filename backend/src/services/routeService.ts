import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';
import type { CreateRouteInput, UpdateRouteInput, CreateStopInput } from '../validators/operations';

interface RouteRow {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  origin: string;
  destination: string;
  distance_km: string | null;
  estimated_duration_minutes: number | null;
  description: string | null;
  route_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface StopRow {
  id: string;
  route_id: string;
  stop_name: string;
  stop_order: number;
  latitude: string | null;
  longitude: string | null;
  estimated_arrival_minutes: number | null;
  created_at: string;
  updated_at: string;
}

function mapRoute(row: RouteRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    code: row.code,
    origin: row.origin,
    destination: row.destination,
    distanceKm: row.distance_km ? parseFloat(row.distance_km) : null,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    description: row.description,
    routeType: row.route_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStop(row: StopRow) {
  return {
    id: row.id,
    routeId: row.route_id,
    stopName: row.stop_name,
    stopOrder: row.stop_order,
    latitude: row.latitude ? parseFloat(row.latitude) : null,
    longitude: row.longitude ? parseFloat(row.longitude) : null,
    estimatedArrivalMinutes: row.estimated_arrival_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Routes ───

export async function createRoute(tenantId: string, input: CreateRouteInput) {
  const existing = await queryOne<RouteRow>(
    'SELECT id FROM routes WHERE tenant_id = $1 AND code = $2 AND deleted_at IS NULL',
    [tenantId, input.code]
  );
  if (existing) {
    throw new ConflictError(`Route with code "${input.code}" already exists`);
  }

  const id = uuid();
  const row = await queryOne<RouteRow>(
    `INSERT INTO routes (id, tenant_id, name, code, origin, destination, distance_km, estimated_duration_minutes, description, route_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      id, tenantId, input.name, input.code,
      input.origin, input.destination,
      input.distanceKm || null, input.estimatedDurationMinutes || null,
      input.description || null, input.routeType, input.status,
    ]
  );
  if (!row) throw new Error('Failed to create route');
  return mapRoute(row);
}

export async function listRoutes(tenantId: string, queryParams: { page: number; pageSize: number; status?: string; routeType?: string; search?: string }) {
  const conditions = ['r.tenant_id = $1', 'r.deleted_at IS NULL'];
  const params: any[] = [tenantId];
  let paramIdx = 2;

  if (queryParams.status) {
    conditions.push(`r.status = $${paramIdx++}`);
    params.push(queryParams.status);
  }
  if (queryParams.routeType) {
    conditions.push(`r.route_type = $${paramIdx++}`);
    params.push(queryParams.routeType);
  }
  if (queryParams.search) {
    conditions.push(`(r.name ILIKE $${paramIdx} OR r.code ILIKE $${paramIdx} OR r.origin ILIKE $${paramIdx} OR r.destination ILIKE $${paramIdx})`);
    params.push(`%${queryParams.search}%`);
    paramIdx++;
  }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM routes r WHERE ${where}`, params
  );
  const total = countResult?.count ?? 0;

  const offset = (queryParams.page - 1) * queryParams.pageSize;
  params.push(queryParams.pageSize, offset);
  const rows = await query<RouteRow>(
    `SELECT r.* FROM routes r WHERE ${where} ORDER BY r.name ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    params
  );

  return { data: rows.map(mapRoute), meta: { total, page: queryParams.page, pageSize: queryParams.pageSize } };
}

export async function getRouteById(tenantId: string, routeId: string) {
  const row = await queryOne<RouteRow>(
    'SELECT * FROM routes WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [routeId, tenantId]
  );
  if (!row) throw new NotFoundError('Route not found');

  const stops = await query<StopRow>(
    'SELECT * FROM route_stops WHERE route_id = $1 ORDER BY stop_order ASC',
    [routeId]
  );

  return { ...mapRoute(row), stops: stops.map(mapStop) };
}

export async function updateRoute(tenantId: string, routeId: string, input: UpdateRouteInput) {
  const existing = await queryOne<RouteRow>(
    'SELECT id FROM routes WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [routeId, tenantId]
  );
  if (!existing) throw new NotFoundError('Route not found');

  if (input.code) {
    const codeConflict = await queryOne<RouteRow>(
      'SELECT id FROM routes WHERE tenant_id = $1 AND code = $2 AND id != $3 AND deleted_at IS NULL',
      [tenantId, input.code, routeId]
    );
    if (codeConflict) throw new ConflictError(`Route with code "${input.code}" already exists`);
  }

  const fields: string[] = [];
  const params: any[] = [];
  let idx = 1;

  const fieldMap: Record<string, string> = {
    name: 'name', code: 'code', origin: 'origin', destination: 'destination',
    distanceKm: 'distance_km', estimatedDurationMinutes: 'estimated_duration_minutes',
    description: 'description', routeType: 'route_type', status: 'status',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if ((input as any)[key] !== undefined) {
      fields.push(`${col} = $${idx++}`);
      params.push((input as any)[key]);
    }
  }

  if (fields.length === 0) {
    return getRouteById(tenantId, routeId);
  }

  fields.push(`updated_at = NOW()`);
  params.push(routeId, tenantId);

  const row = await queryOne<RouteRow>(
    `UPDATE routes SET ${fields.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} AND deleted_at IS NULL RETURNING *`,
    params
  );
  if (!row) throw new Error('Failed to update route');

  const stops = await query<StopRow>(
    'SELECT * FROM route_stops WHERE route_id = $1 ORDER BY stop_order ASC', [routeId]
  );
  return { ...mapRoute(row), stops: stops.map(mapStop) };
}

export async function softDeleteRoute(tenantId: string, routeId: string) {
  const existing = await queryOne<RouteRow>(
    'SELECT id FROM routes WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [routeId, tenantId]
  );
  if (!existing) throw new NotFoundError('Route not found');

  await query(
    'UPDATE routes SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2',
    [routeId, tenantId]
  );
  return { id: routeId, deleted: true };
}

// ─── Stops ───

export async function addStop(tenantId: string, routeId: string, input: CreateStopInput) {
  const route = await queryOne<RouteRow>(
    'SELECT id FROM routes WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [routeId, tenantId]
  );
  if (!route) throw new NotFoundError('Route not found');

  const id = uuid();
  const row = await queryOne<StopRow>(
    `INSERT INTO route_stops (id, route_id, stop_name, stop_order, latitude, longitude, estimated_arrival_minutes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id, routeId, input.stopName, input.stopOrder, input.latitude ?? null, input.longitude ?? null, input.estimatedArrivalMinutes ?? null]
  );
  if (!row) throw new Error('Failed to add stop');
  return mapStop(row);
}

export async function removeStop(tenantId: string, routeId: string, stopId: string) {
  const route = await queryOne<RouteRow>(
    'SELECT id FROM routes WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [routeId, tenantId]
  );
  if (!route) throw new NotFoundError('Route not found');

  const stop = await queryOne<StopRow>(
    'SELECT id FROM route_stops WHERE id = $1 AND route_id = $2',
    [stopId, routeId]
  );
  if (!stop) throw new NotFoundError('Stop not found');

  await query('DELETE FROM route_stops WHERE id = $1', [stopId]);
  return { id: stopId, deleted: true };
}
